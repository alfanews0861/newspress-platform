/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Enterprise API — OpenAPI 3.0.3 Specification & Developer Documentation
 * Phase 15 Implementation
 */

export class OpenApiSpecService {
  public static getSpec() {
    return {
      openapi: '3.0.3',
      info: {
        title: 'NewsPress Enterprise API',
        version: '1.0.0',
        description:
          'Production-grade RESTful API and Webhook Integration Platform for independent publishers, newsrooms, media partners, and enterprise developers. Single source of truth calling authorized NewsPress domain services.',
        contact: {
          name: 'NewsPress Developer Relations',
          email: 'api-support@newspress.platform',
        },
        license: {
          name: 'Apache-2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
        },
      },
      servers: [
        {
          url: '/api/v1',
          description: 'NewsPress Enterprise Gateway (Production & Sandbox)',
        },
      ],
      security: [
        { BearerAuth: [] },
        { ApiKeyAuth: [] },
      ],
      tags: [
        { name: 'Identity & Tenant', description: 'Tenant metadata, membership, and integration context' },
        { name: 'Newsroom', description: 'News dispatches, editorial submissions, originality checks, and assignments' },
        { name: 'Marketplace & Licenses', description: 'Syndicated wire listings, purchases, and acquired usage rights' },
        { name: 'Editions & Production', description: 'Scheduled print/digital editions, readiness, and production jobs' },
        { name: 'Analytics & Reports', description: 'Tenant metrics, turnaround KPIs, and sealed MIS reports' },
        { name: 'Financial Status', description: 'Authorized financial summaries and reporter payout statuses' },
        { name: 'Webhooks', description: 'Outbound event subscription, delivery attempt logs, and manual replays' },
        { name: 'Developer & Keys', description: 'Application registration, credential generation, and usage metering' },
      ],
      paths: {
        '/tenant': {
          get: {
            tags: ['Identity & Tenant'],
            summary: 'Get Tenant Organization Details',
            description: 'Returns profile and subscription metadata for the authenticated tenant.',
            operationId: 'getTenant',
            responses: {
              200: { description: 'Tenant metadata response', content: { 'application/json': { schema: { $ref: '#/components/schemas/TenantResponse' } } } },
              401: { $ref: '#/components/responses/Unauthorized' },
              403: { $ref: '#/components/responses/Forbidden' },
            },
          },
        },
        '/tenant/members': {
          get: {
            tags: ['Identity & Tenant'],
            summary: 'List Tenant Members',
            description: 'Returns list of staff, editors, and reporters authorized within the tenant.',
            operationId: 'listTenantMembers',
            parameters: [
              { name: 'role', in: 'query', schema: { type: 'string' }, description: 'Filter by organization role' },
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            ],
            responses: {
              200: { description: 'List of tenant members', content: { 'application/json': { schema: { $ref: '#/components/schemas/TenantMembersResponse' } } } },
              401: { $ref: '#/components/responses/Unauthorized' },
            },
          },
        },
        '/integration/me': {
          get: {
            tags: ['Identity & Tenant'],
            summary: 'Get Integration Context & Permissions',
            description: 'Returns identity of caller, authenticated application, active environment, and granted scopes.',
            operationId: 'getIntegrationContext',
            responses: {
              200: { description: 'Integration principal response', content: { 'application/json': { schema: { $ref: '#/components/schemas/IntegrationMeResponse' } } } },
              401: { $ref: '#/components/responses/Unauthorized' },
            },
          },
        },
        '/news': {
          get: {
            tags: ['Newsroom'],
            summary: 'List Published & Dispatched News',
            description: 'Retrieve articles dispatched or approved in the tenant newsroom.',
            operationId: 'listNews',
            parameters: [
              { name: 'status', in: 'query', schema: { type: 'string' } },
              { name: 'category', in: 'query', schema: { type: 'string' } },
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            ],
            responses: {
              200: { description: 'List of articles', content: { 'application/json': { schema: { $ref: '#/components/schemas/NewsListResponse' } } } },
            },
          },
        },
        '/news/{newsId}': {
          get: {
            tags: ['Newsroom'],
            summary: 'Get Single News Article',
            description: 'Retrieve full article metadata and verified editorial status.',
            operationId: 'getNewsById',
            parameters: [{ name: 'newsId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Article response' },
              404: { $ref: '#/components/responses/NotFound' },
            },
          },
        },
        '/news/submissions': {
          post: {
            tags: ['Newsroom'],
            summary: 'Submit Field Story for Editorial Review',
            description: 'Files a new reporter dispatch into the Phase 2/8 originality engine and editorial queue. Supports Idempotency-Key header.',
            operationId: 'submitNewsStory',
            parameters: [
              { name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string' }, description: 'Unique idempotency key' },
            ],
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { $ref: '#/components/schemas/NewsSubmissionRequest' } } },
            },
            responses: {
              201: { description: 'Story successfully submitted' },
              409: { $ref: '#/components/responses/Conflict' },
            },
          },
        },
        '/marketplace/listings': {
          get: {
            tags: ['Marketplace & Licenses'],
            summary: 'Browse Syndicated Wire Listings',
            description: 'List active, editorially approved marketplace articles available for purchase.',
            operationId: 'listMarketplaceListings',
            parameters: [
              { name: 'category', in: 'query', schema: { type: 'string' } },
              { name: 'search', in: 'query', schema: { type: 'string' } },
            ],
            responses: { 200: { description: 'Marketplace listings' } },
          },
        },
        '/licenses': {
          get: {
            tags: ['Marketplace & Licenses'],
            summary: 'List Acquired Content Licenses',
            description: 'List active and historical content licenses granted to the authenticated tenant.',
            operationId: 'listLicenses',
            responses: { 200: { description: 'Granted licenses' } },
          },
        },
        '/editions': {
          get: {
            tags: ['Editions & Production'],
            summary: 'List Planned Newspaper Editions',
            description: 'Returns scheduled print/digital editions, deadlines, page budgets, and readiness metrics.',
            operationId: 'listEditions',
            responses: { 200: { description: 'Planned editions' } },
          },
        },
        '/production/jobs': {
          get: {
            tags: ['Editions & Production'],
            summary: 'List Production & Vendor Dispatch Jobs',
            description: 'Returns preflight status, rotary press print jobs, and artifact delivery state.',
            operationId: 'listProductionJobs',
            responses: { 200: { description: 'Production jobs' } },
          },
        },
        '/analytics/summary': {
          get: {
            tags: ['Analytics & Reports'],
            summary: 'Get Tenant Executive Analytics Summary',
            description: 'Aggregates tenant-wide turnaround time, editorial throughput, marketplace metrics, and production volume.',
            operationId: 'getAnalyticsSummary',
            responses: { 200: { description: 'Analytics summary' } },
          },
        },
        '/reports': {
          get: {
            tags: ['Analytics & Reports'],
            summary: 'List MIS Reports & Sealed Snapshots',
            description: 'Returns catalog of auditable MIS reports and tamper-evident snapshots.',
            operationId: 'listMisReports',
            responses: { 200: { description: 'MIS report catalog' } },
          },
        },
        '/finance/summary': {
          get: {
            tags: ['Financial Status'],
            summary: 'Get Authorized Financial Summary',
            description: 'Returns high-level marketplace revenue, platform commission, and payable balances for the tenant.',
            operationId: 'getFinanceSummary',
            responses: { 200: { description: 'Financial summary' } },
          },
        },
        '/payouts': {
          get: {
            tags: ['Financial Status'],
            summary: 'List Payout Disbursements',
            description: 'Returns payout transactions authorized for the tenant without exposing private bank or KYC data.',
            operationId: 'listPayouts',
            responses: { 200: { description: 'Payout records' } },
          },
        },
        '/webhooks/endpoints': {
          get: {
            tags: ['Webhooks'],
            summary: 'List Webhook Endpoints',
            operationId: 'listWebhookEndpoints',
            responses: { 200: { description: 'Webhook endpoints' } },
          },
          post: {
            tags: ['Webhooks'],
            summary: 'Create Webhook Endpoint',
            operationId: 'createWebhookEndpoint',
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateWebhookEndpointRequest' } } },
            },
            responses: { 201: { description: 'Webhook endpoint registered' } },
          },
        },
        '/webhooks/deliveries': {
          get: {
            tags: ['Webhooks'],
            summary: 'List Webhook Delivery Attempts',
            description: 'Returns history of outbound delivery attempts, HTTP status codes, latency, and failure reasons.',
            operationId: 'listWebhookDeliveries',
            responses: { 200: { description: 'Delivery history' } },
          },
        },
        '/webhooks/deliveries/{deliveryId}/replay': {
          post: {
            tags: ['Webhooks'],
            summary: 'Replay Failed Webhook Event',
            description: 'Triggers an authorized redelivery of a failed or dead-letter webhook event.',
            operationId: 'replayWebhookDelivery',
            parameters: [{ name: 'deliveryId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { 200: { description: 'Replay scheduled' } },
          },
        },
        '/developer/apps': {
          get: {
            tags: ['Developer & Keys'],
            summary: 'List API Applications',
            operationId: 'listDeveloperApps',
            responses: { 200: { description: 'API Applications' } },
          },
          post: {
            tags: ['Developer & Keys'],
            summary: 'Create API Application',
            operationId: 'createDeveloperApp',
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAppRequest' } } },
            },
            responses: { 201: { description: 'API Application created' } },
          },
        },
        '/developer/usage': {
          get: {
            tags: ['Developer & Keys'],
            summary: 'Get API Usage & Limit Metering',
            operationId: 'getDeveloperUsage',
            responses: { 200: { description: 'API usage metrics' } },
          },
        },
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API_KEY',
            description: 'Pass the raw API key formatted as np_live_... or np_test_...',
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'Alternative header for passing API key',
          },
        },
        responses: {
          Unauthorized: {
            description: 'Authentication missing or invalid API key credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          Forbidden: {
            description: 'Insufficient API scope or cross-tenant access prohibited',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          NotFound: {
            description: 'Target resource not found within tenant boundary',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          Conflict: {
            description: 'Idempotency conflict or conflicting concurrent state',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  requestId: { type: 'string' },
                  details: { type: 'object' },
                },
                required: ['code', 'message', 'requestId'],
              },
            },
          },
          TenantResponse: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string' },
                  organizationName: { type: 'string' },
                  subscriptionPlan: { type: 'string' },
                  status: { type: 'string' },
                },
              },
              requestId: { type: 'string' },
            },
          },
          TenantMembersResponse: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object' } },
              pagination: { type: 'object' },
              requestId: { type: 'string' },
            },
          },
          IntegrationMeResponse: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  keyId: { type: 'string' },
                  appId: { type: 'string' },
                  tenantId: { type: 'string' },
                  environment: { type: 'string', enum: ['TEST', 'LIVE'] },
                  scopes: { type: 'array', items: { type: 'string' } },
                  rateLimitTier: { type: 'string' },
                },
              },
              requestId: { type: 'string' },
            },
          },
          NewsListResponse: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object' } },
              requestId: { type: 'string' },
            },
          },
          NewsSubmissionRequest: {
            type: 'object',
            properties: {
              headline: { type: 'string', minLength: 5, maxLength: 250 },
              subheadline: { type: 'string', maxLength: 500 },
              body: { type: 'string', minLength: 20 },
              category: { type: 'string' },
              authorId: { type: 'string' },
              assignmentId: { type: 'string' },
              evidence: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['photo', 'audio', 'document'] },
                    title: { type: 'string' },
                  },
                },
              },
            },
            required: ['headline', 'body', 'authorId'],
          },
          CreateWebhookEndpointRequest: {
            type: 'object',
            properties: {
              url: { type: 'string', format: 'uri' },
              description: { type: 'string' },
              subscribedEvents: { type: 'array', items: { type: 'string' } },
            },
            required: ['url', 'subscribedEvents'],
          },
          CreateAppRequest: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              environment: { type: 'string', enum: ['TEST', 'LIVE'] },
              allowedScopes: { type: 'array', items: { type: 'string' } },
              rateLimitTier: { type: 'string', enum: ['STARTER', 'PRO', 'ENTERPRISE'] },
            },
            required: ['name', 'environment', 'allowedScopes'],
          },
        },
      },
    };
  }

  /**
   * Code snippet examples for developer documentation
   */
  public static getCodeExamples(endpointPath: string, method = 'GET') {
    const curl = `curl -X ${method} "https://api.newspress.platform/api/v1${endpointPath}" \\
  -H "Authorization: Bearer np_live_keymetro01_secret999abc1234567890" \\
  -H "Content-Type: application/json"`;

    const typescript = `import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.newspress.platform/api/v1',
  headers: {
    'Authorization': 'Bearer ' + process.env.NEWSPRESS_API_KEY,
    'Content-Type': 'application/json',
  },
});

async function run() {
  const response = await client.${method.toLowerCase()}('${endpointPath}');
  console.log('Result:', response.data);
}
run();`;

    const pythonSignatureVerification = `import hmac
import hashlib
import time

def verify_newspress_webhook(payload_body: str, signature_header: str, timestamp_header: str, secret: str) -> bool:
    # 1. Verify timestamp age (prevent replay attacks within 300 seconds)
    now = int(time.time())
    event_timestamp = int(timestamp_header)
    if abs(now - event_timestamp) > 300:
        return False

    # 2. Recompute expected signature
    sig_payload = f"{timestamp_header}.{payload_body}".encode('utf-8')
    expected = hmac.new(secret.encode('utf-8'), sig_payload, hashlib.sha256).hexdigest()

    # 3. Constant-time comparison
    return hmac.compare_digest(f"v1={expected}", signature_header)`;

    return {
      curl,
      typescript,
      pythonSignatureVerification,
    };
  }
}
