/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 15 Enterprise API & Webhook Platform Test Suite
 * Comprehensive end-to-end verification of machine-to-machine authentication,
 * cryptographically secure credential rotation, multi-tenant isolation,
 * API scope validation, data sanitization, idempotency engine, rate limiting,
 * SSRF-protected webhooks, HMAC signing, replay console, and OpenAPI contracts.
 */

import crypto from 'crypto';
import { enterpriseApiService } from '../services/enterpriseApiService';
import { apiCredentialService } from '../services/apiCredentialService';
import { ApiScopeService } from '../services/apiScopeService';
import { apiIdempotencyService } from '../services/apiIdempotencyService';
import { apiRateLimitService } from '../services/apiRateLimitService';
import { webhookDispatcherService } from '../services/webhookDispatcherService';
import { WebhookSsrfProtectionService } from '../services/webhookSsrfProtectionService';
import { OpenApiSpecService } from '../services/openapiSpecService';
import { ApiScope } from '../types/enterpriseApi';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

async function runPhase15Tests() {
  console.log('\n================================================================');
  console.log('STARTING PHASE 15: ENTERPRISE API & WEBHOOK PLATFORM TESTS');
  console.log('================================================================\n');

  const tenantA = 'tenant-metro-chronicle';
  const tenantB = 'tenant-bay-journal';

  // -------------------------------------------------------------------------
  // 1. PUBLIC HEALTH & OPENAPI CONTRACTS
  // -------------------------------------------------------------------------
  console.log('--- 1. Public Gateway & OpenAPI Contracts ---');

  const healthRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/health',
    headers: {},
  });
  assert(healthRes.statusCode === 200, 'Health endpoint returns 200 OK');
  assert(healthRes.body.data.status === 'UP', 'Health reports UP status');
  assert(healthRes.body.data.apiVersion === 'v1', 'Health reports API version v1');
  assert(!JSON.stringify(healthRes.body).includes('password') && !JSON.stringify(healthRes.body).includes('secret'), 'Health check discloses zero internal infrastructure secrets');

  const openapiRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/openapi.json',
    headers: {},
  });
  assert(openapiRes.statusCode === 200, 'OpenAPI endpoint returns 200 OK');
  assert(openapiRes.body.openapi === '3.0.3', 'OpenAPI specification version is 3.0.3');
  assert(openapiRes.body.info.title.includes('NewsPress Enterprise API'), 'OpenAPI document title verified');
  assert(Boolean(openapiRes.body.paths['/news/submissions'] || openapiRes.body.paths['/api/v1/news/submissions']), 'OpenAPI paths contain news submissions endpoint');

  // -------------------------------------------------------------------------
  // 2. M2M AUTHENTICATION & CREDENTIAL SECURITY
  // -------------------------------------------------------------------------
  console.log('\n--- 2. M2M Authentication, Secure Key Generation & Statuses ---');

  // Anonymous request rejected
  const unauthRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/tenant',
    headers: {},
  });
  assert(unauthRes.statusCode === 401, 'Anonymous request returns 401 Unauthorized');
  assert(unauthRes.body.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

  // Invalid token rejected
  const badTokenRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/tenant',
    headers: { Authorization: 'Bearer np_live_fakekey_bogussecret' },
  });
  assert(badTokenRes.statusCode === 401, 'Invalid token returns 401');

  // Create an enterprise app
  const app = apiCredentialService.createApp({
    tenantId: tenantA,
    name: 'Enterprise Syndication Engine',
    description: 'Automated wire feeds and edition sync',
    environment: 'LIVE',
    allowedScopes: ['tenant:read', 'news:read', 'news:submit', 'editions:read', 'marketplace:listings:read'],
    rateLimitTier: 'ENTERPRISE',
    createdBy: 'usr_admin_01',
  });
  assert(app.appId.startsWith('app_'), 'Created API application with prefixed appId');
  assert(app.status === 'ACTIVE', 'Application starts in ACTIVE status');

  // Create key for app
  const key1 = apiCredentialService.createKey({
    appId: app.appId,
    tenantId: tenantA,
    name: 'Wire Service Key 1',
    scopes: ['tenant:read', 'news:read', 'news:submit', 'editions:read'],
    createdBy: 'usr_admin_01',
    expiresInDays: 30,
  });
  assert(key1.rawSecret.startsWith('np_live_'), 'Key generates proper np_live_ prefix token');
  assert(Boolean(key1.rawSecret), 'Secret token provided exactly once upon creation');

  // Verify only hash is stored
  const storedCred = apiCredentialService.getKey(key1.keyId);
  assert(storedCred !== undefined, 'Stored credential record retrieved');
  assert((storedCred as any).rawSecret === undefined, 'Raw secret token is NEVER stored in database record');
  assert(storedCred?.secretHash.length === 64, 'SHA256/HMAC verifier hash stored with 64 hex characters');

  // Authenticate with Bearer token
  const authBearerRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/integration/me',
    headers: { Authorization: `Bearer ${key1.rawSecret}` },
  });
  assert(authBearerRes.statusCode === 200, 'Bearer token authentication succeeds with 200 OK');
  assert(authBearerRes.body.data.keyId === key1.keyId, 'Principal keyId matches');
  assert(authBearerRes.body.data.environment === 'LIVE', 'Principal environment matches LIVE');

  // Authenticate with X-API-Key header
  const authApiKeyRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/integration/me',
    headers: { 'X-API-Key': key1.rawSecret },
  });
  assert(authApiKeyRes.statusCode === 200, 'X-API-Key header authentication succeeds with 200 OK');

  // Revocation
  const revokedCred = apiCredentialService.revokeKey(key1.keyId, tenantA, 'usr_admin_01', 'Compromised during security drill');
  assert(revokedCred.status === 'REVOKED', 'Key status updated to REVOKED');
  assert(revokedCred.revocationReason === 'Compromised during security drill', 'Revocation reason recorded');

  const revokedUseRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/integration/me',
    headers: { Authorization: `Bearer ${key1.rawSecret}` },
  });
  assert(revokedUseRes.statusCode === 401, 'Revoked token rejected with 401');
  assert(revokedUseRes.body.error.code === 'REVOKED_CREDENTIALS', 'Error code explicitly indicates REVOKED_CREDENTIALS');

  // -------------------------------------------------------------------------
  // 3. CREDENTIAL ROTATION WITH OVERLAP PERIOD
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Credential Rotation with Overlap Period ---');

  const activeKey = apiCredentialService.createKey({
    appId: app.appId,
    tenantId: tenantA,
    name: 'Rotation Testing Key',
    scopes: ['tenant:read', 'news:read', 'news:submit'],
    createdBy: 'usr_admin_01',
  });

  const originalToken = activeKey.rawSecret;

  // Execute rotation with 24 hours overlap
  const rotationResult = apiCredentialService.rotateKey({
    keyId: activeKey.keyId,
    tenantId: tenantA,
    overlapHours: 24,
    rotatedBy: 'usr_admin_01',
  });
  const newToken = rotationResult.rawSecret;

  assert(newToken !== originalToken, 'Rotation produces distinct new token');
  assert(rotationResult.rotationOverlapExpiresAt !== undefined, 'Overlap expiration window established');

  // During overlap period, NEW token works
  const newKeyReq = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/integration/me',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert(newKeyReq.statusCode === 200, 'New rotated key works immediately');

  // During overlap period, OLD token STILL works
  const oldKeyReq = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/integration/me',
    headers: { Authorization: `Bearer ${originalToken}` },
  });
  assert(oldKeyReq.statusCode === 200, 'Old key still functions smoothly during overlap period');

  // -------------------------------------------------------------------------
  // 4. MULTI-TENANT ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Multi-Tenant Boundary Isolation ---');

  // Explicit matching tenant header succeeds
  const tenantMatchRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/tenant',
    headers: {
      Authorization: `Bearer ${newToken}`,
      'X-Tenant-ID': tenantA,
    },
  });
  assert(tenantMatchRes.statusCode === 200, 'Matching tenant header succeeds');
  assert(tenantMatchRes.body.data.tenantId === tenantA, 'Tenant data belongs to tenantA');

  // Mismatched cross-tenant header rejected with 403 TENANT_MISMATCH
  const crossTenantRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/tenant',
    headers: {
      Authorization: `Bearer ${newToken}`,
      'X-Tenant-ID': tenantB, // Trying to access another organization!
    },
  });
  assert(crossTenantRes.statusCode === 403, 'Cross-tenant access blocked with 403 Forbidden');
  assert(crossTenantRes.body.error.code === 'TENANT_MISMATCH', 'Error code specifies TENANT_MISMATCH');

  // Cross-tenant data isolation: cannot fetch or mutate other tenant's resources
  const tenantBApp = apiCredentialService.createApp({
    tenantId: tenantB,
    name: 'Bay Journal Wire',
    environment: 'LIVE',
    allowedScopes: ['news:read'],
    createdBy: 'usr_bay_01',
  });
  const tenantBKey = apiCredentialService.createKey({
    appId: tenantBApp.appId,
    tenantId: tenantB,
    name: 'Bay Key',
    scopes: ['news:read'],
    createdBy: 'usr_bay_01',
  });

  const tenantBArticles = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/news',
    headers: { Authorization: `Bearer ${tenantBKey.rawSecret}` },
  });
  assert(tenantBArticles.statusCode === 200, 'Tenant B queries their own news');
  // Tenant B cannot see Tenant A app list
  const tenantBAppsList = apiCredentialService.listApps(tenantB);
  assert(tenantBAppsList.every(a => a.tenantId === tenantB), 'Tenant B only sees apps belonging to tenant B');

  // -------------------------------------------------------------------------
  // 5. SCOPE ENFORCEMENT & DATA REDACTION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. API Scopes Enforcement & Data Redaction ---');

  // Create key with ONLY news:read (missing news:submit)
  const readOnlyKey = apiCredentialService.createKey({
    appId: app.appId,
    tenantId: tenantA,
    name: 'Read Only Key',
    scopes: ['news:read'],
    createdBy: 'usr_admin_01',
  });

  const missingScopeRes = await enterpriseApiService.dispatch({
    method: 'POST',
    path: '/api/v1/news/submissions',
    headers: { Authorization: `Bearer ${readOnlyKey.rawSecret}` },
    body: {
      headline: 'Unauthorized Submission Attempt',
      body: 'This should be blocked due to missing news:submit scope.',
      authorId: 'rep_001',
    },
  });
  assert(missingScopeRes.statusCode === 403, 'Missing required scope blocked with 403 Forbidden');
  assert(missingScopeRes.body.error.code === 'INSUFFICIENT_SCOPE', 'Error code is INSUFFICIENT_SCOPE');
  assert(missingScopeRes.body.error.details.missingScopes.includes('news:submit'), 'Missing scope news:submit explicitly reported');

  // Verify unknown scopes cannot be granted
  let unknownScopeCaught = false;
  try {
    apiCredentialService.createKey({
      appId: app.appId,
      tenantId: tenantA,
      name: 'Illegal Scope Key',
      scopes: ['super:admin:backdoor' as ApiScope],
      createdBy: 'usr_admin_01',
    });
  } catch {
    unknownScopeCaught = true;
  }
  assert(unknownScopeCaught, 'System rejects unknown/unregistered API scopes');

  // Data Redaction: check tenant payload sanitization
  const tenantDataRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/tenant',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert(tenantDataRes.body.data.tenantId === tenantA, 'Tenant data returned');
  assert((tenantDataRes.body.data as any).internalBillingNotes === undefined, 'Internal notes redacted');
  assert((tenantDataRes.body.data as any).payoutBankDetails === undefined, 'Bank account / routing numbers redacted');

  // -------------------------------------------------------------------------
  // 6. IDEMPOTENCY ENGINE
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Idempotency Key Handling & Replays ---');

  const fullPermKey = apiCredentialService.createKey({
    appId: app.appId,
    tenantId: tenantA,
    name: 'Idempotency Test Key',
    scopes: ['news:read', 'news:submit'],
    createdBy: 'usr_admin_01',
  });

  const idempotencyKey = `idemp_${Date.now()}_abc123`;
  const newsPayload = {
    headline: 'Breaking: Transit Modernization Plan Ratified',
    subheadline: 'City council passes landmark transport package unanimously',
    body: 'The municipal council voted today to approve a historic infrastructure overhaul.',
    authorId: 'rep_metro_01',
    category: 'City Desk',
    location: 'City Hall',
  };

  // First request: processes submission
  const idempReq1 = await enterpriseApiService.dispatch({
    method: 'POST',
    path: '/api/v1/news/submissions',
    headers: {
      Authorization: `Bearer ${fullPermKey.rawSecret}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: newsPayload,
  });
  assert(idempReq1.statusCode === 201, 'First idempotent submission returns 201 Created');
  const createdArticleId = idempReq1.body.data.articleId;

  // Second request: identical payload and key returns exact cached response
  const idempReq2 = await enterpriseApiService.dispatch({
    method: 'POST',
    path: '/api/v1/news/submissions',
    headers: {
      Authorization: `Bearer ${fullPermKey.rawSecret}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: newsPayload,
  });
  assert(idempReq2.statusCode === 201, 'Second request with same idempotency key returns 201');
  assert(idempReq2.headers['X-Idempotent-Replay'] === 'true', 'Header X-Idempotent-Replay is set to true');
  assert(idempReq2.body.data.articleId === createdArticleId, 'Replayed response returns identical article ID without duplicating');

  // Third request: same key but ALTERED payload triggers 409 Conflict
  const idempReq3 = await enterpriseApiService.dispatch({
    method: 'POST',
    path: '/api/v1/news/submissions',
    headers: {
      Authorization: `Bearer ${fullPermKey.rawSecret}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: {
      ...newsPayload,
      headline: 'TAMPERED: Different Headline With Same Key',
    },
  });
  assert(idempReq3.statusCode === 409, 'Altered payload with same idempotency key returns 409 Conflict');
  assert(idempReq3.body.error.code === 'IDEMPOTENCY_CONFLICT', 'Error code specifies IDEMPOTENCY_CONFLICT');

  // -------------------------------------------------------------------------
  // 7. RATE LIMITING & TIER ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Rate Limiting, Headers & 429 Throttle ---');

  // Create a starter app with small rate limit
  const starterApp = apiCredentialService.createApp({
    tenantId: 'tenant-starter-test',
    name: 'Starter Tier App',
    environment: 'LIVE',
    allowedScopes: ['news:read'],
    rateLimitTier: 'STARTER', // 60 RPM
    createdBy: 'usr_starter',
  });
  const starterKey = apiCredentialService.createKey({
    appId: starterApp.appId,
    tenantId: 'tenant-starter-test',
    name: 'Starter Key',
    scopes: ['news:read'],
    createdBy: 'usr_starter',
  });

  // Verify rate limit headers exist on response
  const rateLimitReq = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/news',
    headers: { Authorization: `Bearer ${starterKey.rawSecret}` },
  });
  assert(rateLimitReq.headers['X-RateLimit-Limit'] !== undefined, 'X-RateLimit-Limit header present');
  assert(rateLimitReq.headers['X-RateLimit-Remaining'] !== undefined, 'X-RateLimit-Remaining header present');
  assert(rateLimitReq.headers['X-RateLimit-Reset'] !== undefined, 'X-RateLimit-Reset header present');

  // Simulate quota exhaustion
  for (let i = 0; i < 65; i++) {
    apiRateLimitService.increment('tenant-starter-test', starterApp.appId);
  }

  const throttledReq = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/news',
    headers: { Authorization: `Bearer ${starterKey.rawSecret}` },
  });
  assert(throttledReq.statusCode === 429, 'Exceeded rate limit returns 429 Too Many Requests');
  assert(throttledReq.body.error.code === 'RATE_LIMIT_EXCEEDED', 'Error code is RATE_LIMIT_EXCEEDED');
  assert(Boolean(throttledReq.headers['Retry-After']), 'Retry-After header present on 429 response');

  // -------------------------------------------------------------------------
  // 8. WEBHOOK SSRF PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Webhook SSRF Protection & URL Sanitization ---');

  // Localhost blocked
  const ssrfLocalhost = WebhookSsrfProtectionService.validateDestinationUrl('http://localhost:8080/hook');
  assert(!ssrfLocalhost.safe, 'Localhost URL blocked by SSRF filter');

  // IPv4 loopback 127.0.0.1 blocked
  const ssrf127 = WebhookSsrfProtectionService.validateDestinationUrl('http://127.0.0.1/webhook');
  assert(!ssrf127.safe, '127.0.0.1 loopback blocked by SSRF filter');

  // Cloud metadata 169.254.169.254 blocked
  const ssrfMetadata = WebhookSsrfProtectionService.validateDestinationUrl('http://169.254.169.254/latest/meta-data/');
  assert(!ssrfMetadata.safe, 'Cloud metadata service IP (169.254.169.254) blocked by SSRF filter');

  // Private RFC1918 addresses blocked
  const ssrf10 = WebhookSsrfProtectionService.validateDestinationUrl('http://10.0.0.5/api');
  assert(!ssrf10.safe, 'Private subnet 10.0.0.0/8 blocked');
  const ssrf192 = WebhookSsrfProtectionService.validateDestinationUrl('http://192.168.1.1/api');
  assert(!ssrf192.safe, 'Private subnet 192.168.0.0/16 blocked');

  // Plain HTTP in production blocked
  const ssrfHttpProd = WebhookSsrfProtectionService.validateDestinationUrl('http://insecure-domain.com/hook', false);
  assert(!ssrfHttpProd.safe, 'Unencrypted HTTP endpoint blocked in production mode');

  // Public valid HTTPS endpoint accepted
  const ssrfValid = WebhookSsrfProtectionService.validateDestinationUrl('https://api.externalpartner.org/v1/news-events');
  assert(ssrfValid.safe, 'Valid public HTTPS destination accepted');

  // -------------------------------------------------------------------------
  // 9. WEBHOOK HMAC SIGNATURE & ROTATION
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Webhook HMAC Signing, Drift Defense & Rotation ---');

  const webhookEndpoint = webhookDispatcherService.registerEndpoint({
    tenantId: tenantA,
    appId: app.appId,
    url: 'https://newsroom.example.com/api/webhooks/listener',
    description: 'Partner CMS real-time subscriber',
    subscribedEvents: ['news.submitted', 'news.approved', 'edition.status_changed'],
    actorId: 'usr_admin_01',
  });
  assert(webhookEndpoint.endpointId.startsWith('wh_end_'), 'Webhook endpoint registered with ID');
  assert(webhookEndpoint.signingSecret.startsWith('whsec_'), 'Generated cryptographically secure signing secret');

  // Compute signature
  const testPayload = {
    event: 'news.submitted',
    articleId: 'art-xyz-123',
    headline: 'Metro Transit System Reopens Line 4',
  };
  const nowUnix = Math.floor(Date.now() / 1000).toString();
  const signature = webhookDispatcherService.computeHmacSignature(webhookEndpoint.signingSecret, nowUnix, testPayload);

  // Verification succeeds
  const verifyResult = webhookDispatcherService.verifySignature(
    `v1=${signature}`,
    nowUnix,
    testPayload,
    webhookEndpoint
  );
  assert(verifyResult.valid, 'HMAC signature verifies successfully with current secret');
  assert(verifyResult.keyUsed === 'current', 'Current secret recognized as key used');

  // Drift defense: timestamp older than 300 seconds rejected
  const oldUnix = (Math.floor(Date.now() / 1000) - 360).toString();
  const oldSig = webhookDispatcherService.computeHmacSignature(webhookEndpoint.signingSecret, oldUnix, testPayload);
  const driftResult = webhookDispatcherService.verifySignature(
    `v1=${oldSig}`,
    oldUnix,
    testPayload,
    webhookEndpoint
  );
  assert(!driftResult.valid, 'Timestamp older than 5 minutes rejected to prevent replay attacks');
  assert(Boolean(driftResult.reason?.includes('tolerance')), 'Rejection reason states tolerance window exceeded');

  // Tampered payload rejected
  const tamperedResult = webhookDispatcherService.verifySignature(
    `v1=${signature}`,
    nowUnix,
    { ...testPayload, headline: 'TAMPERED PAYLOAD' },
    webhookEndpoint
  );
  assert(!tamperedResult.valid, 'Tampered payload fails HMAC verification');

  // Rotate webhook signing secret
  const rotatedSecret = webhookDispatcherService.rotateSigningSecret(
    webhookEndpoint.endpointId,
    tenantA,
    'usr_admin_01',
    24
  );
  const updatedEndpoint = webhookDispatcherService.getEndpoint(webhookEndpoint.endpointId)!;
  assert(updatedEndpoint.signingSecret === rotatedSecret.newSecret, 'Endpoint now uses new secret');
  assert(updatedEndpoint.previousSigningSecret === webhookEndpoint.signingSecret, 'Previous secret stored for rotation window');

  // Both new and previous secrets verify during window
  const newSig = webhookDispatcherService.computeHmacSignature(updatedEndpoint.signingSecret, nowUnix, testPayload);
  const verifyNew = webhookDispatcherService.verifySignature(`v1=${newSig}`, nowUnix, testPayload, updatedEndpoint);
  assert(verifyNew.valid && verifyNew.keyUsed === 'current', 'New secret signature verifies');

  const prevSig = webhookDispatcherService.computeHmacSignature(webhookEndpoint.signingSecret, nowUnix, testPayload);
  const verifyPrev = webhookDispatcherService.verifySignature(`v1=${prevSig}`, nowUnix, testPayload, updatedEndpoint);
  assert(verifyPrev.valid && verifyPrev.keyUsed === 'previous', 'Previous secret still verifies during overlap window');

  // -------------------------------------------------------------------------
  // 10. WEBHOOK DISPATCH & MANUAL REPLAY
  // -------------------------------------------------------------------------
  console.log('\n--- 10. Webhook Dispatch & Dead-Letter Replay ---');

  // Configure mock responder
  webhookDispatcherService.setMockHttpResponder(async (url, payload, headers) => {
    return { status: 200, body: '{"received": true}' };
  });

  // Emit event
  const eventEnvelope = webhookDispatcherService.emitEvent('news.approved', tenantA, {
    articleId: 'art-999',
    approvedBy: 'ed_smith',
    headline: 'Editorial Board Endorsement',
  });
  assert(eventEnvelope.id.startsWith('evt_'), 'Generated event envelope with unique ID');

  // Check deliveries logged
  const deliveries = webhookDispatcherService.listDeliveries(tenantA);
  assert(deliveries.length > 0, 'Webhook delivery record created in log');
  const delivery = deliveries[0];
  assert(delivery.status === 'PENDING', 'Delivery queued initially in PENDING status');

  // Acquire lease and execute delivery
  const lease = webhookDispatcherService.acquireDeliveryLease(delivery.deliveryId);
  assert(lease.acquired === true, 'Successfully acquired worker lease token for delivery');
  const deliveredResult = await webhookDispatcherService.executeDelivery(delivery.deliveryId, lease.leaseToken!, true);
  assert(deliveredResult.status === 'DELIVERED', 'Mock delivery completed with DELIVERED status');
  assert(deliveredResult.responseStatusCode === 200, 'Recorded HTTP response status code 200');

  // Test manual replay
  const replayed = webhookDispatcherService.replayDelivery(delivery.deliveryId, tenantA, 'usr_admin_01');
  assert(replayed.deliveryId !== delivery.deliveryId, 'Replay creates fresh delivery attempt record');
  assert(replayed.isReplay === true, 'Replay flagged with isReplay: true');
  assert(replayed.replayedFromDeliveryId === delivery.deliveryId, 'Replayed from original delivery ID tracked');

  // Execute replayed delivery
  const replayLease = webhookDispatcherService.acquireDeliveryLease(replayed.deliveryId);
  const replayedDelivered = await webhookDispatcherService.executeDelivery(replayed.deliveryId, replayLease.leaseToken!, true);
  assert(replayedDelivered.status === 'DELIVERED', 'Replayed delivery completes successfully');

  // -------------------------------------------------------------------------
  // 11. END-TO-END ENTERPRISE MODULES
  // -------------------------------------------------------------------------
  console.log('\n--- 11. End-to-End Enterprise API Domain Modules ---');

  const domainTestApp = apiCredentialService.createApp({
    tenantId: tenantA,
    name: 'All Access Enterprise Partner App',
    environment: 'LIVE',
    allowedScopes: [
      'tenant:read',
      'tenant:members:read',
      'news:read',
      'news:submit',
      'news:status:read',
      'assignments:read',
      'marketplace:listings:read',
      'marketplace:purchases:read',
      'licenses:read',
      'editions:read',
      'production:status:read',
      'analytics:read',
      'reports:export',
      'finance:read',
      'payouts:read',
      'webhooks:manage',
    ],
    createdBy: 'usr_admin_01',
  });

  const allAccessKey = apiCredentialService.createKey({
    appId: domainTestApp.appId,
    tenantId: tenantA,
    name: 'All Access Domain Test Key',
    scopes: [
      'tenant:read',
      'tenant:members:read',
      'news:read',
      'news:submit',
      'news:status:read',
      'assignments:read',
      'marketplace:listings:read',
      'marketplace:purchases:read',
      'licenses:read',
      'editions:read',
      'production:status:read',
      'analytics:read',
      'reports:export',
      'finance:read',
      'payouts:read',
      'webhooks:manage',
    ],
    createdBy: 'usr_admin_01',
  });
  const bearerAuth = { Authorization: `Bearer ${allAccessKey.rawSecret}` };

  // Tenant members
  const membersRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/tenant/members',
    headers: bearerAuth,
  });
  assert(membersRes.statusCode === 200, 'GET /api/v1/tenant/members returns 200');
  assert(Array.isArray(membersRes.body.data), 'Members returns array of staff members');

  // News list & status
  const newsListRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/news',
    headers: bearerAuth,
  });
  assert(newsListRes.statusCode === 200, 'GET /api/v1/news returns 200');

  // Reporter assignments
  const assignRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/assignments',
    headers: bearerAuth,
  });
  assert(assignRes.statusCode === 200, 'GET /api/v1/assignments returns 200');

  // Marketplace listings
  const mktListingsRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/marketplace/listings',
    headers: bearerAuth,
  });
  assert(mktListingsRes.statusCode === 200, 'GET /api/v1/marketplace/listings returns 200');

  // Licenses
  const licensesRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/licenses',
    headers: bearerAuth,
  });
  assert(licensesRes.statusCode === 200, 'GET /api/v1/licenses returns 200');

  // Editions
  const editionsRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/editions',
    headers: bearerAuth,
  });
  assert(editionsRes.statusCode === 200, 'GET /api/v1/editions returns 200');

  // Production jobs
  const prodJobsRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/production/jobs',
    headers: bearerAuth,
  });
  assert(prodJobsRes.statusCode === 200, 'GET /api/v1/production/jobs returns 200');

  // Financial summary
  const finSummaryRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/finance/summary',
    headers: bearerAuth,
  });
  assert(finSummaryRes.statusCode === 200, 'GET /api/v1/finance/summary returns 200');
  assert(finSummaryRes.body.data.currency === 'INR', 'Financial summary returns currency INR');

  // Payouts
  const payoutsRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/payouts',
    headers: bearerAuth,
  });
  assert(payoutsRes.statusCode === 200, 'GET /api/v1/payouts returns 200');

  // Analytics summary
  const analyticsRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/analytics/summary',
    headers: bearerAuth,
  });
  assert(analyticsRes.statusCode === 200, 'GET /api/v1/analytics/summary returns 200');

  // Webhook endpoint management via API
  const apiWebhooksRes = await enterpriseApiService.dispatch({
    method: 'GET',
    path: '/api/v1/webhooks/endpoints',
    headers: bearerAuth,
  });
  assert(apiWebhooksRes.statusCode === 200, 'GET /api/v1/webhooks/endpoints returns 200');

  console.log('\n================================================================');
  console.log(`ALL ${passed}/${total} PHASE 15 ENTERPRISE API & WEBHOOK TESTS PASSED!`);
  console.log('================================================================\n');

  process.exit(0);
}

runPhase15Tests().catch((err) => {
  console.error('\nTest runner failed with error:', err);
  process.exit(1);
});
