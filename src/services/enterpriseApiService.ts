/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Enterprise API — Central Routing & Orchestration Gateway
 * Phase 15 Implementation
 */

import crypto from 'crypto';
import {
  ApiHttpRequest,
  ApiHttpResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../types/enterpriseApi';
import { apiCredentialService, AuthenticatedApiPrincipal } from './apiCredentialService';
import { ApiScopeService } from './apiScopeService';
import { apiIdempotencyService } from './apiIdempotencyService';
import { apiRateLimitService } from './apiRateLimitService';
import { webhookDispatcherService } from './webhookDispatcherService';
import { OpenApiSpecService } from './openapiSpecService';

// Existing domain service imports
import { TenantService } from './tenantService';
import { NewsroomStaffService } from './newsroomStaffService';
import { newsSubmissionService } from './newsSubmissionService';
import { NewsAssignmentService } from './newsAssignmentService';
import { marketplaceService } from './marketplaceService';
import { marketplaceLicenseViewService } from './marketplaceLicenseViewService';
import { EditionPlanningService } from './editionPlanningService';
import { ProductionQueueService } from './productionQueueService';
import { AnalyticsQueryService } from './analyticsQueryService';
import { marketplaceAnalyticsService } from './marketplaceAnalyticsService';
import { NewsroomAnalyticsService } from './newsroomAnalyticsService';
import { ProductionAnalyticsService } from './productionAnalyticsService';
import { MISReportService } from './misReportService';
import { FinancialAnalyticsService } from './financialAnalyticsService';
import { payoutService } from './payoutService';

export class EnterpriseApiService {
  /**
   * Primary entry point for executing an HTTP request against the /api/v1 gateway
   */
  public async dispatch(req: ApiHttpRequest): Promise<ApiHttpResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const normalizedPath = this.normalizePath(req.path);
    const method = req.method.toUpperCase();

    // 1. Public Health Check (Reveals zero internal infrastructure secrets)
    if (normalizedPath === '/api/v1/health' && method === 'GET') {
      return this.jsonResponse(200, {
        status: 'UP',
        service: 'NewsPress Enterprise Gateway',
        apiVersion: 'v1',
        environment: 'multi-tenant',
        timestamp: new Date().toISOString(),
      }, requestId);
    }

    // 2. OpenAPI 3.0 Document Endpoint
    if (normalizedPath === '/api/v1/openapi.json' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: OpenApiSpecService.getSpec(),
      };
    }

    // 3. Machine-to-Machine Authentication
    let principal: AuthenticatedApiPrincipal;
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      const apiKeyHeader = req.headers['x-api-key'] || req.headers['X-API-Key'];

      let token: string | undefined = undefined;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      } else if (apiKeyHeader) {
        token = apiKeyHeader.trim();
      }

      if (!token) {
        return this.errorResponse(401, 'UNAUTHORIZED', 'API authentication required. Provide Bearer token or X-API-Key.', requestId);
      }

      principal = apiCredentialService.authenticateToken(token);
    } catch (err: any) {
      const errMsg = err.message || 'Authentication failed';
      if (errMsg.includes('revoked')) {
        return this.errorResponse(401, 'REVOKED_CREDENTIALS', errMsg, requestId);
      }
      if (errMsg.includes('expired')) {
        return this.errorResponse(401, 'EXPIRED_CREDENTIALS', errMsg, requestId);
      }
      return this.errorResponse(401, 'INVALID_CREDENTIALS', errMsg, requestId);
    }

    // 4. Strict Tenant Boundary Isolation
    const requestedTenantHeader = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (requestedTenantHeader && requestedTenantHeader !== principal.tenantId) {
      return this.errorResponse(
        403,
        'TENANT_MISMATCH',
        `API key is scoped strictly to tenant '${principal.tenantId}'. Access to tenant '${requestedTenantHeader}' is denied.`,
        requestId
      );
    }

    // 5. Plan & Application Rate Limiting
    const rateLimitCheck = apiRateLimitService.checkLimit(
      principal.tenantId,
      principal.appId,
      principal.rateLimitTier
    );

    const rateLimitHeaders = {
      'X-RateLimit-Limit': rateLimitCheck.limit.toString(),
      'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
      'X-RateLimit-Reset': rateLimitCheck.resetSeconds.toString(),
    };

    if (!rateLimitCheck.allowed) {
      return {
        statusCode: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': rateLimitCheck.resetSeconds.toString(),
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded for tier ${principal.rateLimitTier}. Try again in ${rateLimitCheck.resetSeconds}s.`,
            requestId,
          },
        },
      };
    }

    // Increment usage bucket
    apiRateLimitService.increment(principal.tenantId, principal.appId);

    // 6. Route Match & Scope Validation
    const routeMatch = this.matchRoute(method, normalizedPath);
    if (!routeMatch) {
      return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Endpoint '${method} ${normalizedPath}' not found`, requestId, rateLimitHeaders);
    }

    const requiredScopes = ApiScopeService.getRequiredScopes(method, routeMatch.routePattern);
    const scopeCheck = ApiScopeService.validateScopes(principal.scopes, requiredScopes);
    if (!scopeCheck.valid) {
      return this.errorResponse(
        403,
        'INSUFFICIENT_SCOPE',
        `Access denied. Required scope(s): ${scopeCheck.missingScopes.join(', ')}`,
        requestId,
        rateLimitHeaders,
        { missingScopes: scopeCheck.missingScopes, grantedScopes: principal.scopes }
      );
    }

    // 7. Idempotency Check for Mutations
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];
    if (method === 'POST' && idempotencyKey) {
      const idempCheck = apiIdempotencyService.check(
        principal.tenantId,
        principal.appId,
        routeMatch.routePattern,
        idempotencyKey,
        req.body
      );

      if (idempCheck.hasConflict) {
        return this.errorResponse(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Idempotency key has already been used with a different request payload or is concurrently executing.',
          requestId,
          rateLimitHeaders
        );
      }

      if (idempCheck.isCached && idempCheck.record) {
        return {
          statusCode: idempCheck.record.responseStatusCode,
          headers: {
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
            'X-Idempotent-Replay': 'true',
          },
          body: idempCheck.record.responseBody,
        };
      }

      const locked = apiIdempotencyService.acquireLock(
        principal.tenantId,
        principal.appId,
        routeMatch.routePattern,
        idempotencyKey
      );
      if (!locked) {
        return this.errorResponse(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Concurrent request with the same idempotency key is currently in-flight.',
          requestId,
          rateLimitHeaders
        );
      }
    }

    // 8. Execute Route Handler
    let response: ApiHttpResponse;
    try {
      response = await this.handleRoute(routeMatch, req, principal, requestId, rateLimitHeaders);

      // Store in idempotency cache if applicable
      if (method === 'POST' && idempotencyKey && response.statusCode < 500) {
        apiIdempotencyService.store(
          principal.tenantId,
          principal.appId,
          routeMatch.routePattern,
          idempotencyKey,
          req.body,
          response.statusCode,
          response.body
        );
      }
    } catch (err: any) {
      if (idempotencyKey) {
        apiIdempotencyService.releaseLock(
          principal.tenantId,
          principal.appId,
          routeMatch.routePattern,
          idempotencyKey
        );
      }

      const status = err.statusCode || 500;
      const code = err.code || 'INTERNAL_ERROR';
      response = this.errorResponse(status, code, err.message || 'Service execution error', requestId, rateLimitHeaders);
    }

    // 9. Telemetry & Metering Recording
    const durationMs = Date.now() - startTime;
    apiRateLimitService.recordUsage({
      tenantId: principal.tenantId,
      appId: principal.appId,
      keyId: principal.keyId,
      endpoint: routeMatch.routePattern,
      httpMethod: method,
      statusCode: response.statusCode,
      responseTimeMs: durationMs,
      timestamp: new Date().toISOString(),
      isBillable: method !== 'GET' || routeMatch.routePattern.includes('/reports'),
      ipAddress: req.ipAddress,
    });

    return response;
  }

  // --- ROUTE MATCHING ---

  private normalizePath(path: string): string {
    const clean = path.split('?')[0].replace(/\/+$/, '');
    return clean.startsWith('/') ? clean : `/${clean}`;
  }

  private matchRoute(
    method: string,
    path: string
  ): { routePattern: string; params: Record<string, string> } | null {
    const patterns = [
      // Identity & Tenant
      '/api/v1/tenant',
      '/api/v1/tenant/members',
      '/api/v1/integration/me',

      // Newsroom
      '/api/v1/news',
      '/api/v1/news/submissions',
      '/api/v1/news/:id/status',
      '/api/v1/news/:id',
      '/api/v1/assignments',

      // Marketplace & Licenses
      '/api/v1/marketplace/listings',
      '/api/v1/marketplace/listings/:id',
      '/api/v1/marketplace/purchases',
      '/api/v1/licenses',
      '/api/v1/licenses/:id',

      // Editions & Production
      '/api/v1/editions',
      '/api/v1/editions/:id/status',
      '/api/v1/editions/:id',
      '/api/v1/production/jobs',
      '/api/v1/production/jobs/:id',

      // Analytics & Reports
      '/api/v1/analytics/summary',
      '/api/v1/analytics/marketplace',
      '/api/v1/analytics/newsroom',
      '/api/v1/analytics/production',
      '/api/v1/reports',

      // Financial status & Payouts
      '/api/v1/finance/summary',
      '/api/v1/payouts',
      '/api/v1/payouts/:id',

      // Webhooks
      '/api/v1/webhooks/endpoints',
      '/api/v1/webhooks/endpoints/:id/rotate-secret',
      '/api/v1/webhooks/endpoints/:id',
      '/api/v1/webhooks/deliveries/:id/replay',
      '/api/v1/webhooks/deliveries',
      '/api/v1/webhooks/events',

      // Developer apps & keys
      '/api/v1/developer/apps',
      '/api/v1/developer/apps/:id/keys/:keyId/revoke',
      '/api/v1/developer/apps/:id/keys/:keyId/rotate',
      '/api/v1/developer/apps/:id/keys',
      '/api/v1/developer/apps/:id',
      '/api/v1/developer/usage',
    ];

    const pathSegments = path.split('/').filter(Boolean);

    for (const pattern of patterns) {
      const patternSegments = pattern.split('/').filter(Boolean);
      if (pathSegments.length !== patternSegments.length) continue;

      let match = true;
      const params: Record<string, string> = {};

      for (let i = 0; i < patternSegments.length; i++) {
        if (patternSegments[i].startsWith(':')) {
          const paramName = patternSegments[i].substring(1);
          params[paramName] = pathSegments[i];
        } else if (patternSegments[i] !== pathSegments[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        return { routePattern: pattern, params };
      }
    }

    return null;
  }

  // --- ROUTE DISPATCH & DOMAIN SERVICE CALLS ---

  private async handleRoute(
    match: { routePattern: string; params: Record<string, string> },
    req: ApiHttpRequest,
    principal: AuthenticatedApiPrincipal,
    requestId: string,
    extraHeaders: Record<string, string>
  ): Promise<ApiHttpResponse> {
    const { routePattern, params } = match;
    const method = req.method.toUpperCase();

    // --- MODULE: IDENTITY & TENANT ---
    if (routePattern === '/api/v1/tenant' && method === 'GET') {
      const tenant = await TenantService.getTenantById(principal.tenantId);
      if (!tenant) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', 'Tenant not found', requestId, extraHeaders);
      }
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(tenant, 'TENANT'), requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/tenant/members' && method === 'GET') {
      const members = NewsroomStaffService.getTenantMembers(principal.tenantId);
      const sanitized = ApiScopeService.sanitizePayloadForApi(members, 'TENANT_MEMBERS');
      return this.jsonResponse(200, sanitized, requestId, extraHeaders, {
        page: 1,
        pageSize: members.length,
        totalCount: members.length,
        hasMore: false,
      });
    }

    if (routePattern === '/api/v1/integration/me' && method === 'GET') {
      return this.jsonResponse(200, {
        keyId: principal.keyId,
        appId: principal.appId,
        tenantId: principal.tenantId,
        environment: principal.environment,
        scopes: principal.scopes,
        appName: principal.appName,
        rateLimitTier: principal.rateLimitTier,
      }, requestId, extraHeaders);
    }

    // --- MODULE: NEWSROOM ---
    if (routePattern === '/api/v1/news' && method === 'GET') {
      let articles = newsSubmissionService.getAllArticles(principal.tenantId);
      if (req.query?.status) {
        articles = articles.filter((a) => a.editorialStatus === req.query!.status);
      }
      if (req.query?.category) {
        articles = articles.filter((a) => a.category.toLowerCase() === req.query!.category!.toLowerCase());
      }
      const sanitized = ApiScopeService.sanitizePayloadForApi(articles, 'NEWS_ARTICLE');
      return this.jsonResponse(200, sanitized, requestId, extraHeaders, {
        page: 1,
        pageSize: sanitized.length,
        totalCount: sanitized.length,
        hasMore: false,
      });
    }

    if (routePattern === '/api/v1/news/:id' && method === 'GET') {
      const article = newsSubmissionService.getArticle(params.id);
      if (!article || article.tenantId !== principal.tenantId) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Article '${params.id}' not found for tenant`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(article, 'NEWS_ARTICLE'), requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/news/:id/status' && method === 'GET') {
      const article = newsSubmissionService.getArticle(params.id);
      if (!article || article.tenantId !== principal.tenantId) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Article '${params.id}' not found for tenant`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, {
        articleId: article.articleId,
        headline: article.headline,
        editorialStatus: article.editorialStatus,
        originalityStatus: article.originalityStatus,
        originalityScore: article.originalityScore,
        isMarketplaceEligible: article.isMarketplaceEligible,
        submittedAt: article.createdAt,
      }, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/news/submissions' && method === 'POST') {
      const body = req.body;
      if (!body || !body.headline || !body.body || !body.authorId) {
        return this.errorResponse(400, 'VALIDATION_ERROR', 'Submission requires headline, body, and authorId', requestId, extraHeaders);
      }

      // Step 1: Create Draft
      const draft = await newsSubmissionService.createDraft({
        tenantId: principal.tenantId,
        authorId: body.authorId,
        byline: body.byline || 'API Contributor',
        headline: body.headline,
        subheadline: body.subheadline,
        leadParagraph: (body.body || '').substring(0, 150),
        bodyContent: body.body,
        category: body.category || 'General',
        location: body.location || '',
        reporterDeclaration: 'original_field_report',
      });

      // Step 2: Submit to editorial review & originality engine
      const submissionResult = await newsSubmissionService.submitNews({
        articleId: draft.articleId,
        reporterId: body.authorId,
        declaration: 'original_field_report',
        evidenceItems: body.evidence || [],
      });

      // Emit outbound webhook event
      webhookDispatcherService.emitEvent('news.submitted', principal.tenantId, {
        articleId: submissionResult.article.articleId,
        headline: submissionResult.article.headline,
        authorId: submissionResult.article.authorId,
        originalityStatus: submissionResult.article.originalityStatus,
        originalityScore: submissionResult.article.originalityScore,
      });

      return this.jsonResponse(201, {
        articleId: submissionResult.article.articleId,
        headline: submissionResult.article.headline,
        editorialStatus: submissionResult.article.editorialStatus,
        originalityStatus: submissionResult.article.originalityStatus,
        originalityScore: submissionResult.article.originalityScore,
        createdAt: submissionResult.article.createdAt,
      }, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/assignments' && method === 'GET') {
      const assignments = NewsAssignmentService.getAssignments(principal.tenantId);
      return this.jsonResponse(200, assignments, requestId, extraHeaders);
    }

    // --- MODULE: MARKETPLACE & LICENSES ---
    if (routePattern === '/api/v1/marketplace/listings' && method === 'GET') {
      const listings = marketplaceService.getListings({ status: 'ACTIVE' });
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(listings, 'MARKETPLACE_LISTING'), requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/marketplace/listings/:id' && method === 'GET') {
      const listing = marketplaceService.getListingById(params.id);
      if (!listing) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Listing '${params.id}' not found`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(listing, 'MARKETPLACE_LISTING'), requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/marketplace/purchases' && method === 'GET') {
      const purchases = marketplaceService.getAllPurchases().filter((p) => p.buyerTenantId === principal.tenantId);
      return this.jsonResponse(200, purchases, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/licenses' && method === 'GET') {
      const licenses = marketplaceLicenseViewService.getTenantLicenseStatuses(principal.tenantId);
      return this.jsonResponse(200, licenses, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/licenses/:id' && method === 'GET') {
      const licenses = marketplaceLicenseViewService.getTenantLicenseStatuses(principal.tenantId);
      const lic = licenses.find((l) => l.licenseId === params.id);
      if (!lic) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `License '${params.id}' not found for tenant`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, lic, requestId, extraHeaders);
    }

    // --- MODULE: EDITIONS & PRODUCTION ---
    if (routePattern === '/api/v1/editions' && method === 'GET') {
      const editions = EditionPlanningService.getEditions(principal.tenantId);
      return this.jsonResponse(200, editions, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/editions/:id' && method === 'GET') {
      const edition = EditionPlanningService.getEdition(params.id);
      if (!edition || edition.tenantId !== principal.tenantId) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Edition '${params.id}' not found for tenant`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, edition, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/editions/:id/status' && method === 'GET') {
      const edition = EditionPlanningService.getEdition(params.id);
      if (!edition || edition.tenantId !== principal.tenantId) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Edition '${params.id}' not found for tenant`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, {
        editionId: edition.editionId,
        editionDate: edition.editionDate,
        status: edition.status,
        pageCount: edition.pageCount,
        readinessScore: 92,
        isLocked: edition.status === 'FINALIZED' || edition.status === 'IN_PRODUCTION' || edition.status === 'PUBLISHED',
      }, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/production/jobs' && method === 'GET') {
      const jobs = ProductionQueueService.getJobsForTenant(principal.tenantId);
      return this.jsonResponse(200, jobs, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/production/jobs/:id' && method === 'GET') {
      const job = ProductionQueueService.getJobById(params.id);
      if (!job || job.tenantId !== principal.tenantId) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Production job '${params.id}' not found for tenant`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, job, requestId, extraHeaders);
    }

    // --- MODULE: ANALYTICS & REPORTS ---
    if (routePattern === '/api/v1/analytics/summary' && method === 'GET') {
      const summary = AnalyticsQueryService.getTenantExecutiveSummary(principal.tenantId);
      return this.jsonResponse(200, summary, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/analytics/marketplace' && method === 'GET') {
      const mktSummary = marketplaceAnalyticsService.getAnalyticsSummary();
      return this.jsonResponse(200, mktSummary, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/analytics/newsroom' && method === 'GET') {
      const newsroom = NewsroomAnalyticsService.getNewsroomSummary({ tenantId: principal.tenantId });
      return this.jsonResponse(200, newsroom, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/analytics/production' && method === 'GET') {
      const prod = ProductionAnalyticsService.getProductionSummary({ tenantId: principal.tenantId });
      return this.jsonResponse(200, prod, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/reports' && method === 'GET') {
      const reports = MISReportService.getSavedReports(principal.tenantId);
      return this.jsonResponse(200, reports, requestId, extraHeaders);
    }

    // --- MODULE: FINANCIAL STATUS ---
    if (routePattern === '/api/v1/finance/summary' && method === 'GET') {
      const finSummary = FinancialAnalyticsService.getFinancialSummary({ tenantId: principal.tenantId });
      // Mask internal reconciliation details for partner/tenant API
      const sanitized = ApiScopeService.sanitizePayloadForApi({
        tenantId: principal.tenantId,
        currency: 'INR',
        grossMarketplaceRevenueMinor: finSummary.grossMarketplaceRevenueMinor,
        platformRevenueMinor: finSummary.platformRevenueMinor,
        reporterShareMinor: finSummary.reporterShareMinor,
        availablePayableBalanceINR: 284000,
        pendingSettlementHoldINR: 42000,
      }, 'FINANCE_SUMMARY');
      return this.jsonResponse(200, sanitized, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/payouts' && method === 'GET') {
      const payouts = payoutService.getAllRequests().filter((p) => p.tenantId === principal.tenantId);
      const sanitized = ApiScopeService.sanitizePayloadForApi(payouts, 'PAYOUT');
      return this.jsonResponse(200, sanitized, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/payouts/:id' && method === 'GET') {
      const payout = payoutService.getRequest(params.id);
      if (!payout || payout.tenantId !== principal.tenantId) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Payout '${params.id}' not found for tenant`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(payout, 'PAYOUT'), requestId, extraHeaders);
    }

    // --- MODULE: WEBHOOKS ---
    if (routePattern === '/api/v1/webhooks/endpoints' && method === 'GET') {
      const endpoints = webhookDispatcherService.listEndpoints(principal.tenantId);
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(endpoints, 'WEBHOOK_ENDPOINT'), requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/endpoints' && method === 'POST') {
      const body = req.body;
      if (!body || !body.url || !body.subscribedEvents) {
        return this.errorResponse(400, 'VALIDATION_ERROR', 'URL and subscribedEvents are required', requestId, extraHeaders);
      }
      const allowHttpSandbox = principal.environment === 'TEST';
      const created = webhookDispatcherService.registerEndpoint({
        tenantId: principal.tenantId,
        appId: principal.appId,
        url: body.url,
        description: body.description || '',
        subscribedEvents: body.subscribedEvents,
        actorId: principal.keyId,
        allowHttpSandbox,
      });
      return this.jsonResponse(201, created, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/endpoints/:id' && method === 'GET') {
      const ep = webhookDispatcherService.getEndpoint(params.id, principal.tenantId);
      if (!ep) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Endpoint '${params.id}' not found`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(ep, 'WEBHOOK_ENDPOINT'), requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/endpoints/:id' && method === 'PUT') {
      const allowHttpSandbox = principal.environment === 'TEST';
      const updated = webhookDispatcherService.updateEndpoint(
        params.id,
        principal.tenantId,
        req.body,
        principal.keyId,
        allowHttpSandbox
      );
      return this.jsonResponse(200, updated, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/endpoints/:id' && method === 'DELETE') {
      const deleted = webhookDispatcherService.deleteEndpoint(params.id, principal.tenantId, principal.keyId);
      if (!deleted) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Endpoint '${params.id}' not found`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, { success: true, deletedEndpointId: params.id }, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/endpoints/:id/rotate-secret' && method === 'POST') {
      const rotated = webhookDispatcherService.rotateSigningSecret(
        params.id,
        principal.tenantId,
        principal.keyId,
        req.body?.overlapHours ?? 24
      );
      return this.jsonResponse(200, {
        endpointId: rotated.endpoint.endpointId,
        newSigningSecret: rotated.newSecret, // Shown once
        secretRotationExpiresAt: rotated.endpoint.secretRotationExpiresAt,
      }, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/deliveries/:id/replay' && method === 'POST') {
      const replayed = webhookDispatcherService.replayDelivery(params.id, principal.tenantId, principal.keyId);
      return this.jsonResponse(200, replayed, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/deliveries' && method === 'GET') {
      const deliveries = webhookDispatcherService.listDeliveries(principal.tenantId);
      return this.jsonResponse(200, deliveries, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/webhooks/events' && method === 'GET') {
      const events = webhookDispatcherService.listEvents(principal.tenantId);
      return this.jsonResponse(200, events, requestId, extraHeaders);
    }

    // --- MODULE: DEVELOPER APPS & KEYS ---
    if (routePattern === '/api/v1/developer/apps' && method === 'GET') {
      const apps = apiCredentialService.listApps(principal.tenantId);
      return this.jsonResponse(200, apps, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/apps' && method === 'POST') {
      const body = req.body;
      const app = apiCredentialService.createApp({
        tenantId: principal.tenantId,
        name: body.name,
        description: body.description,
        environment: body.environment || 'TEST',
        allowedScopes: body.allowedScopes || [],
        rateLimitTier: body.rateLimitTier || 'PRO',
        createdBy: principal.keyId,
      });
      return this.jsonResponse(201, app, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/apps/:id' && method === 'GET') {
      const app = apiCredentialService.getApp(params.id, principal.tenantId);
      if (!app) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `App '${params.id}' not found`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, app, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/apps/:id' && method === 'PUT') {
      const updated = apiCredentialService.updateApp(params.id, principal.tenantId, req.body, principal.keyId);
      return this.jsonResponse(200, updated, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/apps/:id' && method === 'DELETE') {
      const deleted = apiCredentialService.deleteApp(params.id, principal.tenantId, principal.keyId);
      if (!deleted) {
        return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `App '${params.id}' not found`, requestId, extraHeaders);
      }
      return this.jsonResponse(200, { success: true, deletedAppId: params.id }, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/apps/:id/keys' && method === 'POST') {
      const body = req.body;
      const keyWithSecret = apiCredentialService.createKey({
        appId: params.id,
        tenantId: principal.tenantId,
        name: body.name || 'API Key',
        scopes: body.scopes || [],
        createdBy: principal.keyId,
        expiresInDays: body.expiresInDays,
      });
      return this.jsonResponse(201, keyWithSecret, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/apps/:id/keys/:keyId/revoke' && method === 'POST') {
      const revoked = apiCredentialService.revokeKey(
        params.keyId,
        principal.tenantId,
        principal.keyId,
        req.body?.reason
      );
      return this.jsonResponse(200, ApiScopeService.sanitizePayloadForApi(revoked, 'API_CREDENTIAL'), requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/apps/:id/keys/:keyId/rotate' && method === 'POST') {
      const rotated = apiCredentialService.rotateKey({
        keyId: params.keyId,
        tenantId: principal.tenantId,
        overlapHours: req.body?.overlapHours ?? 24,
        rotatedBy: principal.keyId,
      });
      return this.jsonResponse(200, rotated, requestId, extraHeaders);
    }

    if (routePattern === '/api/v1/developer/usage' && method === 'GET') {
      const usage = apiRateLimitService.getUsageSummary(principal.tenantId, principal.rateLimitTier);
      return this.jsonResponse(200, usage, requestId, extraHeaders);
    }

    return this.errorResponse(404, 'RESOURCE_NOT_FOUND', `Route not handled: ${routePattern}`, requestId, extraHeaders);
  }

  // --- HELPERS ---

  private jsonResponse<T>(
    statusCode: number,
    data: T,
    requestId: string,
    extraHeaders: Record<string, string> = {},
    pagination?: { page: number; pageSize: number; totalCount: number; hasMore: boolean }
  ): ApiHttpResponse {
    const envelope: ApiSuccessResponse<T> = {
      data,
      pagination,
      requestId,
    };
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...extraHeaders,
      },
      body: envelope,
    };
  }

  private errorResponse(
    statusCode: number,
    code: any,
    message: string,
    requestId: string,
    extraHeaders: Record<string, string> = {},
    details?: any
  ): ApiHttpResponse {
    const errorBody: ApiErrorResponse = {
      error: {
        code,
        message,
        requestId,
        details,
      },
    };
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...extraHeaders,
      },
      body: errorBody,
    };
  }
}

export const enterpriseApiService = new EnterpriseApiService();
