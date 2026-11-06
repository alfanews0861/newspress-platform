/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 15 Enterprise API & Webhook Integration Types
 */

// Supported environments
export type ApiEnvironment = 'TEST' | 'LIVE';

// Application and credential lifecycle states
export type ApiApplicationStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED';
export type ApiCredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

// Rate limit tier
export type RateLimitTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

// Validated API Scopes
export type ApiScope =
  | 'tenant:read'
  | 'tenant:members:read'
  | 'news:read'
  | 'news:submit'
  | 'news:status:read'
  | 'assignments:read'
  | 'marketplace:listings:read'
  | 'marketplace:purchases:read'
  | 'licenses:read'
  | 'editions:read'
  | 'production:status:read'
  | 'analytics:read'
  | 'reports:export'
  | 'finance:read'
  | 'payouts:read'
  | 'webhooks:manage'
  | 'developer:manage';

export const ALL_API_SCOPES: ApiScope[] = [
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
  'developer:manage',
];

// API Application record
export interface ApiApplication {
  appId: string;
  tenantId: string;
  name: string;
  description?: string;
  environment: ApiEnvironment;
  status: ApiApplicationStatus;
  allowedScopes: ApiScope[];
  rateLimitTier: RateLimitTier;
  ipAllowlist?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// API Credential record (secrets are never stored in raw form)
export interface ApiCredential {
  keyId: string;
  appId: string;
  tenantId: string;
  environment: ApiEnvironment;
  name: string;
  keyPrefix: string; // e.g. np_live_... or np_test_...
  secretHash: string; // HMAC-SHA256 verifier
  previousSecretHash?: string; // For overlap rotation window
  rotationOverlapExpiresAt?: string;
  status: ApiCredentialStatus;
  scopes: ApiScope[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  totalRequests: number;
  createdBy: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

// Returned only upon initial generation or key rotation
export interface ApiCredentialWithSecret extends ApiCredential {
  rawSecret: string; // Displayed ONCE, never saved to database
}

// Idempotency Record
export interface ApiIdempotencyRecord {
  idempotencyKey: string;
  tenantId: string;
  appId: string;
  endpoint: string;
  requestFingerprint: string; // SHA-256 of canonical JSON payload
  responseStatusCode: number;
  responseBody: any;
  createdAt: string;
  expiresAt: string;
}

// Supported Outbound Webhook Event Types
export type WebhookEventType =
  | 'news.submitted'
  | 'news.editorial_status_changed'
  | 'news.approved'
  | 'marketplace.listing_published'
  | 'marketplace.purchase_completed'
  | 'license.issued'
  | 'edition.status_changed'
  | 'production.job_status_changed'
  | 'production.artifact_ready'
  | 'payout.status_changed'
  | 'subscription.status_changed'
  | 'analytics.report_ready';

export const ALL_WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'news.submitted',
  'news.editorial_status_changed',
  'news.approved',
  'marketplace.listing_published',
  'marketplace.purchase_completed',
  'license.issued',
  'edition.status_changed',
  'production.job_status_changed',
  'production.artifact_ready',
  'payout.status_changed',
  'subscription.status_changed',
  'analytics.report_ready',
];

// Webhook Endpoint Registration
export interface WebhookEndpoint {
  endpointId: string;
  tenantId: string;
  appId?: string;
  url: string;
  description: string;
  subscribedEvents: WebhookEventType[];
  signingSecret: string; // whsec_...
  previousSigningSecret?: string; // During secret rotation
  secretRotationExpiresAt?: string;
  status: 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
  failureCount: number;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Standard Webhook Event Envelope
export interface WebhookEventEnvelope<T = any> {
  id: string; // evt_...
  type: WebhookEventType;
  apiVersion: string; // '2026-10-12'
  tenantId: string;
  occurredAt: string;
  data: T;
  metadata?: {
    correlationId?: string;
    triggeredBy?: string;
    [key: string]: any;
  };
}

// Delivery State Lifecycle
export type WebhookDeliveryStatus =
  | 'PENDING'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'RETRY_SCHEDULED'
  | 'FAILED'
  | 'DEAD_LETTER'
  | 'DISABLED';

// Webhook Delivery Execution Record
export interface WebhookDelivery {
  deliveryId: string;
  eventId: string;
  endpointId: string;
  tenantId: string;
  eventType: WebhookEventType;
  destinationUrl: string;
  attemptNumber: number;
  maxAttempts: number;
  status: WebhookDeliveryStatus;
  leaseToken?: string;
  leaseExpiresAt?: string;
  requestTimestamp: string;
  responseStatusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  errorDetails?: string;
  nextRetryAt?: string;
  deliveredAt?: string;
  isReplay: boolean;
  replayedFromDeliveryId?: string;
  replayedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// API Usage and Metering
export interface ApiUsageRecord {
  recordId: string;
  tenantId: string;
  appId: string;
  keyId?: string;
  endpoint: string;
  httpMethod: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
  dateKey: string; // YYYY-MM-DD
  minuteKey: string; // YYYY-MM-DDTHH:MM
  isBillable: boolean;
  ipAddress?: string;
}

export interface ApiUsageSummary {
  tenantId: string;
  totalRequests: number;
  successfulRequests: number; // 2xx
  clientErrors: number; // 4xx
  rateLimitedRequests: number; // 429
  serverErrors: number; // 5xx
  averageLatencyMs: number;
  billableRequestsCount: number;
  webhookDeliveriesTotal: number;
  webhookDeliveriesFailed: number;
  deadLetterEventsCount: number;
  limitUtilizationPercentage: number;
  tier: RateLimitTier;
  rpmLimit: number;
  rpdLimit: number;
}

// Standard HTTP API Error Codes
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'REVOKED_CREDENTIALS'
  | 'EXPIRED_CREDENTIALS'
  | 'FORBIDDEN'
  | 'INSUFFICIENT_SCOPE'
  | 'TENANT_MISMATCH'
  | 'INVALID_REQUEST'
  | 'VALIDATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'WEBHOOK_SSRF_PROHIBITED'
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED';

// Uniform Error Envelope
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    details?: any;
  };
}

// Uniform Success Envelope with optional pagination
export interface ApiSuccessResponse<T = any> {
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    hasMore: boolean;
  };
  requestId: string;
}

// Request and Response abstraction for the Enterprise API
export interface ApiHttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  body?: any;
  ipAddress?: string;
}

export interface ApiHttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}
