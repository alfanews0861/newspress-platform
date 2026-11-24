/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Free-Tier Multi-Project API Key Pool & High-Quota Light Model Failover Manager.
 * Distributes requests round-robin across 4+ independent Google AI Studio / GCP
 * project API keys using free-tier high-quota light models:
 *   1. gemini-3.1-flash-lite (primary — highest free-tier quota, minimal thinking)
 *   2. gemini-4-hydrogen     (fallback — fast free-tier flash, low thinking)
 *
 * Automatically handles per-(key, model) RPM/TPM/RPD cooldowns, Retry-Delay
 * headers/messages, and invalid-key isolation without ever logging raw keys.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export const DEFAULT_LIGHT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
];

const DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanKeyValue(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (
    upper.startsWith('YOUR_') ||
    upper.startsWith('REPLACE_') ||
    upper.startsWith('<') ||
    upper === 'NONE' ||
    upper === 'NULL'
  ) {
    return '';
  }
  return trimmed;
}

/**
 * Parses up to 20 numbered project keys (GEMINI_API_KEY_1..N), comma-separated
 * GEMINI_API_KEYS, and legacy GEMINI_API_KEY from environment variables.
 */
export function loadApiKeysFromEnv(env = process.env) {
  const candidates = [];

  // 1. Dedicated numbered project keys (GEMINI_API_KEY_1 .. GEMINI_API_KEY_20)
  for (let i = 1; i <= 20; i++) {
    const val = cleanKeyValue(env[`GEMINI_API_KEY_${i}`]);
    if (val) {
      candidates.push({ label: `Project-${i}`, apiKey: val });
    }
  }

  // 2. Optional comma / semicolon / newline-separated list (GEMINI_API_KEYS)
  if (typeof env.GEMINI_API_KEYS === 'string' && env.GEMINI_API_KEYS.trim()) {
    const parts = env.GEMINI_API_KEYS.split(/[\n,;]+/);
    parts.forEach((raw, idx) => {
      const val = cleanKeyValue(raw);
      if (val) {
        candidates.push({ label: `PoolKey-${idx + 1}`, apiKey: val });
      }
    });
  }

  // 3. Legacy single-key fallback (GEMINI_API_KEY)
  const legacyKey = cleanKeyValue(env.GEMINI_API_KEY);
  if (legacyKey) {
    candidates.push({ label: 'PrimaryKey', apiKey: legacyKey });
  }

  // Deduplicate keys while preserving configured order
  const seen = new Set();
  const unique = [];
  for (const entry of candidates) {
    if (seen.has(entry.apiKey)) continue;
    seen.add(entry.apiKey);
    unique.push(entry);
  }

  return unique;
}

/**
 * Resolves the ordered list of free-tier light models from env or safe defaults.
 */
export function loadModelsFromEnv(env = process.env) {
  const rawList =
    (typeof env.GEMINI_MODELS === 'string' && env.GEMINI_MODELS.trim()) ||
    (typeof env.GEMINI_MODEL === 'string' && env.GEMINI_MODEL.trim()) ||
    '';

  const parsed = rawList
    .split(/[\n,;]+/)
    .map((m) => m.trim())
    .filter(Boolean)
    .filter((m) => {
      if (DEPRECATED_MODELS.has(m.toLowerCase())) {
        console.warn(`[key-pool] Ignoring deprecated model "${m}" from environment.`);
        return false;
      }
      return true;
    });

  // Always ensure default light models are available as fallbacks
  const merged = [...parsed];
  if (parsed.length === 0) {
    merged.push(...DEFAULT_LIGHT_MODELS);
  } else {
    for (const fallback of DEFAULT_LIGHT_MODELS) {
      if (!merged.includes(fallback)) {
        merged.push(fallback);
      }
    }
  }

  return merged;
}

/**
 * Returns the optimal low-quota ThinkingConfig supported by each light model.
 * - gemini-3.1-flash-lite supports ThinkingLevel.MINIMAL (zero thinking overhead)
 * - gemini-4-hydrogen supports ThinkingLevel.LOW (MINIMAL is not supported on Gemini 4)
 */
export function getThinkingConfigForModel(model) {
  const lower = String(model || '').toLowerCase();
  if (lower.includes('flash-lite')) {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  if (lower.startsWith('gemini-4-')) {
    return { thinkingLevel: ThinkingLevel.LOW };
  }
  return undefined;
}

/**
 * Extracts explicit retry delay in milliseconds from Gemini API error payloads when present.
 */
function parseRetryDelayMs(errorMessage) {
  const msg = String(errorMessage || '');
  // Matches: "retryDelay":"42s" or "retryDelay": "42.5s" or "Please retry in 38.2s"
  const secMatch =
    msg.match(/retryDelay["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)s/i) ||
    msg.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i);
  if (secMatch) {
    const seconds = Number(secMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(Math.ceil(seconds * 1000) + 2000, 15 * 60 * 1000);
    }
  }
  return null;
}

/**
 * Classifies Gemini API errors into actionable failover categories.
 */
function classifyError(err) {
  const status = Number(err?.status || err?.code || 0);
  const msg = String(err?.message || err || '');
  const lower = msg.toLowerCase();

  const isInvalidKey =
    status === 401 ||
    status === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('api key expired');

  if (isInvalidKey) {
    return { kind: 'INVALID_KEY', retryDelayMs: null };
  }

  const isModelNotFound =
    status === 404 ||
    lower.includes('not_found') ||
    lower.includes('is not found for api version') ||
    lower.includes('model not found');

  if (isModelNotFound) {
    return { kind: 'MODEL_NOT_FOUND', retryDelayMs: null };
  }

  const isQuotaError =
    status === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('too many requests') ||
    lower.includes('rate limit');

  if (isQuotaError) {
    const isDaily =
      lower.includes('perday') ||
      lower.includes('per_day') ||
      lower.includes('requestsperday') ||
      lower.includes('daily') ||
      lower.includes('rpd');
    return {
      kind: isDaily ? 'DAILY_QUOTA' : 'RATE_LIMIT',
      retryDelayMs: parseRetryDelayMs(msg),
    };
  }

  const isTransient =
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('fetch failed') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('socket hang up');

  if (isTransient) {
    return { kind: 'TRANSIENT', retryDelayMs: null };
  }

  return { kind: 'OTHER', retryDelayMs: null };
}

export class FreeTierKeyPool {
  constructor(env = process.env) {
    const keyEntries = loadApiKeysFromEnv(env);
    if (keyEntries.length === 0) {
      throw new Error(
        'No free-tier API keys configured. Set GEMINI_API_KEY_1..GEMINI_API_KEY_4 (or GEMINI_API_KEYS / GEMINI_API_KEY) in the worker environment.'
      );
    }

    this.models = loadModelsFromEnv(env);
    this.disabledModels = new Set();

    // Tuned for Free Tier RPM/RPD protection across 4 projects
    this.minKeyIntervalMs = Math.max(500, Number(env.GEMINI_MIN_KEY_INTERVAL_MS || 4000));
    this.rpmCooldownMs = Math.max(15000, Number(env.GEMINI_RPM_COOLDOWN_MS || 65000));
    this.dailyCooldownMs = Math.max(300000, Number(env.GEMINI_DAILY_COOLDOWN_MS || 1800000));
    this.transientCooldownMs = 15000;
    this.maxWaitForCooldownMs = Math.max(10000, Number(env.GEMINI_MAX_COOLDOWN_WAIT_MS || 75000));

    this.keys = keyEntries.map((entry, index) => ({
      index,
      label: entry.label,
      client: new GoogleGenAI({
        apiKey: entry.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      }),
      disabled: false,
      disabledReason: '',
      lastUsedAtMs: 0,
      successCount: 0,
      errorCount: 0,
    }));

    // Per-(keyIndex, model) cooldown timestamps and consecutive 429 counters
    this.bucketState = new Map();
    // Round-robin cursor per model so all 4 keys get evenly balanced traffic
    this.roundRobinCursor = new Map();
  }

  _bucketKey(keyIndex, model) {
    return `${keyIndex}::${model}`;
  }

  _getBucket(keyIndex, model) {
    const id = this._bucketKey(keyIndex, model);
    let bucket = this.bucketState.get(id);
    if (!bucket) {
      bucket = { cooldownUntilMs: 0, consecutive429s: 0 };
      this.bucketState.set(id, bucket);
    }
    return bucket;
  }

  getActiveModels() {
    return this.models.filter((m) => !this.disabledModels.has(m));
  }

  getActiveKeys() {
    return this.keys.filter((k) => !k.disabled);
  }

  getSummary() {
    return {
      keyCount: this.keys.length,
      activeKeyCount: this.getActiveKeys().length,
      labels: this.keys.map((k) => k.label),
      models: this.getActiveModels(),
      minKeyIntervalMs: this.minKeyIntervalMs,
    };
  }

  /**
   * Builds an ordered list of currently ready (key, model) slots.
   * Priority: exhaust highest-quota light model across all 4 project keys in
   * round-robin order before stepping down to the fallback light model.
   */
  _getCandidateSlots(nowMs) {
    const ready = [];
    let earliestRecoveryMs = Infinity;

    const activeModels = this.getActiveModels();
    const activeKeys = this.getActiveKeys();

    for (const model of activeModels) {
      const startCursor = this.roundRobinCursor.get(model) || 0;
      const n = activeKeys.length;
      if (n === 0) break;

      for (let offset = 0; offset < n; offset++) {
        const keySlot = activeKeys[(startCursor + offset) % n];
        const bucket = this._getBucket(keySlot.index, model);

        if (bucket.cooldownUntilMs <= nowMs) {
          ready.push({ keySlot, model, bucket });
        } else if (bucket.cooldownUntilMs < earliestRecoveryMs) {
          earliestRecoveryMs = bucket.cooldownUntilMs;
        }
      }
    }

    return { ready, earliestRecoveryMs };
  }

  _advanceCursor(model, usedKeySlot) {
    const activeKeys = this.getActiveKeys();
    if (activeKeys.length === 0) return;
    const pos = activeKeys.findIndex((k) => k.index === usedKeySlot.index);
    if (pos >= 0) {
      this.roundRobinCursor.set(model, (pos + 1) % activeKeys.length);
    }
  }

  async _enforcePerKeyPacing(keySlot) {
    const now = Date.now();
    const elapsed = now - keySlot.lastUsedAtMs;
    const waitMs = elapsed < this.minKeyIntervalMs ? this.minKeyIntervalMs - elapsed : 0;
    // Reserve timestamp synchronously so concurrent source workers never collide on the same key
    keySlot.lastUsedAtMs = now + waitMs;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }

  /**
   * Executes `taskFn({ client, model, keyLabel, thinkingConfig })` with automatic
   * 4-key round-robin rotation, per-key RPM pacing, and light-model failover.
   */
  async executeWithRotation(taskFn) {
    let lastError = null;
    let waitedForCooldownOnce = false;

    for (let pass = 0; pass < 2; pass++) {
      const activeKeys = this.getActiveKeys();
      const activeModels = this.getActiveModels();

      if (activeKeys.length === 0) {
        const err = new Error('All configured free-tier API keys are invalid or disabled.');
        err.code = 'ALL_KEYS_INVALID';
        throw err;
      }
      if (activeModels.length === 0) {
        const err = new Error('No supported light models remain active in the worker pool.');
        err.code = 'NO_ACTIVE_MODELS';
        throw err;
      }

      const nowMs = Date.now();
      const { ready, earliestRecoveryMs } = this._getCandidateSlots(nowMs);

      if (ready.length === 0) {
        const waitMs = Math.max(0, earliestRecoveryMs - nowMs);
        if (!waitedForCooldownOnce && waitMs > 0 && waitMs <= this.maxWaitForCooldownMs) {
          waitedForCooldownOnce = true;
          console.warn(
            `[key-pool] All ${activeKeys.length} project keys are in brief RPM cooldown. Waiting ${Math.ceil(
              waitMs / 1000
            )}s for earliest slot recovery...`
          );
          await sleep(waitMs + 500);
          continue;
        }

        const err = new Error(
          `All ${activeKeys.length} free-tier project keys have temporarily exhausted quota across [${activeModels.join(
            ', '
          )}]. Next recovery in ~${Math.ceil(waitMs / 1000)}s.`
        );
        err.code = 'ALL_QUOTAS_EXHAUSTED';
        err.nextRecoveryMs = waitMs;
        throw err;
      }

      for (const { keySlot, model, bucket } of ready) {
        if (keySlot.disabled || this.disabledModels.has(model)) {
          continue;
        }
        if (bucket.cooldownUntilMs > Date.now()) {
          continue;
        }

        // Advance round-robin cursor immediately so parallel calls pick the next project key
        this._advanceCursor(model, keySlot);
        await this._enforcePerKeyPacing(keySlot);

        try {
          const result = await taskFn({
            client: keySlot.client,
            model,
            keyLabel: keySlot.label,
            thinkingConfig: getThinkingConfigForModel(model),
          });

          keySlot.successCount += 1;
          bucket.consecutive429s = 0;
          bucket.cooldownUntilMs = 0;

          return {
            result,
            keyLabel: keySlot.label,
            model,
          };
        } catch (err) {
          lastError = err;
          keySlot.errorCount += 1;

          const classification = classifyError(err);
          const now = Date.now();

          if (classification.kind === 'INVALID_KEY') {
            keySlot.disabled = true;
            keySlot.disabledReason = String(err?.message || err).slice(0, 200);
            console.error(
              `[key-pool] ${keySlot.label} disabled (invalid/unauthorized key). Rotating to remaining project keys.`
            );
            continue;
          }

          if (classification.kind === 'MODEL_NOT_FOUND') {
            this.disabledModels.add(model);
            console.warn(
              `[key-pool] Model "${model}" unavailable (404). Switching to fallback light model.`
            );
            continue;
          }

          if (classification.kind === 'DAILY_QUOTA') {
            const cooldown = classification.retryDelayMs || this.dailyCooldownMs;
            bucket.cooldownUntilMs = now + cooldown;
            bucket.consecutive429s += 1;
            console.warn(
              `[key-pool] ${keySlot.label} (${model}) daily quota reached; cooling down for ${Math.round(
                cooldown / 60000
              )}m and rotating.`
            );
            continue;
          }

          if (classification.kind === 'RATE_LIMIT') {
            bucket.consecutive429s += 1;
            const escalatedCooldown = Math.min(
              this.rpmCooldownMs * Math.min(bucket.consecutive429s, 3),
              5 * 60 * 1000
            );
            const cooldown = classification.retryDelayMs || escalatedCooldown;
            bucket.cooldownUntilMs = now + cooldown;
            console.warn(
              `[key-pool] ${keySlot.label} (${model}) hit 429 rate limit; cooling down ${Math.ceil(
                cooldown / 1000
              )}s and rotating to next key.`
            );
            continue;
          }

          if (classification.kind === 'TRANSIENT') {
            bucket.cooldownUntilMs = now + this.transientCooldownMs;
            console.warn(
              `[key-pool] ${keySlot.label} (${model}) transient upstream error; rotating to next key.`
            );
            continue;
          }

          // Non-quota error (e.g., malformed JSON response): try next project key once before giving up
          console.warn(
            `[key-pool] ${keySlot.label} (${model}) request error: ${String(err?.message || err).slice(
              0,
              180
            )}. Trying next slot.`
          );
        }
      }
    }

    const finalError = new Error(
      `All free-tier key/model attempts failed: ${lastError?.message || lastError || 'Unknown error'}`
    );
    if (lastError?.code) {
      finalError.code = lastError.code;
    }
    throw finalError;
  }
}

let sharedPool = null;

export function getKeyPool() {
  if (!sharedPool) {
    sharedPool = new FreeTierKeyPool(process.env);
  }
  return sharedPool;
}

export function resetKeyPoolForTesting() {
  sharedPool = null;
}
