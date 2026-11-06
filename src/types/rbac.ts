/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Platform System-Wide Roles
export type PlatformRole =
  | 'super_admin'
  | 'platform_admin'
  | 'support_admin'
  | 'none';

// Tenant-Scoped Organization Roles
export type OrganizationRole =
  | 'owner'
  | 'administrator'
  | 'editor_in_chief'
  | 'editor'
  | 'reporter_manager'
  | 'accountant'
  | 'member';

// Reporter Affiliation Roles
export type ReporterRole =
  | 'staff_reporter'
  | 'freelance_reporter'
  | 'none';

// Marketplace Roles
export type MarketplaceRole =
  | 'marketplace_buyer'
  | 'marketplace_seller'
  | 'marketplace_both'
  | 'none';

// Granular System Permissions
export type AppPermission =
  | 'tenant.read'
  | 'tenant.update'
  | 'tenant.manage_settings'
  | 'users.read'
  | 'users.manage'
  | 'reporters.read'
  | 'reporters.manage'
  | 'news.create'
  | 'news.read'
  | 'news.edit'
  | 'news.approve'
  | 'news.publish'
  | 'marketplace.browse'
  | 'marketplace.buy'
  | 'marketplace.sell'
  | 'editions.create'
  | 'editions.edit'
  | 'editions.finalize'
  | 'production.view'
  | 'production.download'
  | 'production.manage_queue'
  | 'billing.view'
  | 'billing.manage'
  | 'analytics.view'
  | 'system.admin'
  // Phase 8 Newsroom Operations Permissions
  | 'newsroom.view'
  | 'newsroom.manage'
  | 'staff.view'
  | 'staff.manage'
  | 'reporters.view'
  | 'reporters.manage'
  | 'assignments.view'
  | 'assignments.create'
  | 'assignments.manage'
  | 'editorial.review'
  | 'editorial.comment'
  | 'editorial.revision_request'
  // Phase 9 Publisher Edition Planning & Workflow Permissions
  | 'edition.view'
  | 'edition.create'
  | 'edition.manage'
  | 'edition.content.manage'
  | 'edition.page.manage'
  | 'edition.advertising.manage'
  | 'edition.review'
  | 'edition.approve_finalize'
  | 'edition.breaking_insert'
  | 'edition.withdraw_content'
  // Phase 10 Production Operations & Vendor Dispatch Permissions
  | 'production.manage'
  | 'production.approve'
  | 'production.retry'
  | 'production.cancel'
  | 'production.vendor.view'
  | 'production.vendor.manage'
  | 'production.vendor.assign'
  | 'production.dispatch'
  | 'production.proof.review'
  | 'production.reprint'
  | 'production.delivery.view'
  | 'production.delivery.manage'
  // Phase 12 Public Marketplace & Workspace Permissions
  | 'marketplace.view'
  | 'marketplace.search'
  | 'marketplace.purchase'
  | 'marketplace.license.view'
  | 'marketplace.licensed_content.view'
  | 'marketplace.edition.use'
  | 'marketplace.seller.manage'
  | 'marketplace.listing.manage'
  | 'marketplace.moderate'
  | 'marketplace.analytics.view'
  // Phase 13 Mobile Operations & Offline Field Workflow Permissions
  | 'mobile.view'
  | 'mobile.report'
  | 'mobile.evidence.create'
  | 'mobile.assignment.manage'
  | 'mobile.editorial.review'
  | 'mobile.breaking_news'
  | 'mobile.marketplace.view'
  | 'mobile.edition.view'
  | 'mobile.production.view'
  // Phase 14 Advanced Analytics, MIS & Executive Intelligence Permissions
  | 'analytics.executive.view'
  | 'analytics.tenant.view'
  | 'analytics.reporter.view'
  | 'analytics.financial.view'
  | 'analytics.marketplace.view'
  | 'analytics.production.view'
  | 'analytics.report.create'
  | 'analytics.report.export'
  | 'analytics.report.schedule'
  | 'analytics.admin'
  // Phase 15 Enterprise API, Developer Portal & Webhook Integration Permissions
  | 'developer.view'
  | 'developer.manage_apps'
  | 'developer.manage_keys'
  | 'developer.manage_webhooks'
  | 'developer.webhook_replay'
  | 'developer.usage.view'
  | 'developer.admin'
  // Phase 16 Production Reliability, Security Hardening & DR Permissions
  | 'operations.reliability.view'
  | 'operations.health.view'
  | 'operations.backup.manage'
  | 'operations.dr.execute'
  | 'operations.runbooks.execute'
  | 'operations.integrity.view'
  | 'operations.integrity.repair'
  | 'operations.security.audit'
  // Phase 17 Commercial Launch, Platform Super Admin & Go-Live Permissions
  | 'platform.admin'
  | 'platform.config.view'
  | 'platform.config.manage'
  | 'platform.onboarding.view'
  | 'platform.onboarding.manage'
  | 'platform.support.view'
  | 'platform.support.manage'
  | 'platform.readiness.view'
  | 'platform.readiness.manage'
  | 'platform.legal.view'
  | 'platform.legal.manage';

export interface RoleDefinition {
  roleKey: string;
  category: 'platform' | 'organization' | 'reporter' | 'marketplace';
  displayName: string;
  description: string;
  permissions: AppPermission[];
}
