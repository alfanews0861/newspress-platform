# NewsPress Platform — Multi-Tenant Newspaper SaaS & Wire

A production-grade multi-tenant SaaS newspaper production system and news marketplace platform designed for independent news organizations, editorial desks, syndicates, and accredited reporters.

---

## 1. Architecture Overview

NewsPress Platform decouples the physical person, authenticated user login, news organization tenant, and reporter credentials to provide complete multi-tenant isolation, flexible freelance syndication, and high-security role-based access control (RBAC).

### Modular Directory Structure

```
src/
├── app/                  # Application router, root shell & providers
├── components/
│   ├── common/           # Common components (PlaceholderPhasePage)
│   └── ui/               # Design system & accessible UI components:
│                         # Button, Input, Select, Badge, StatusBadge, Card,
│                         # Modal, Drawer, Tabs, DataTable, EmptyState,
│                         # LoadingState, ErrorState, ConfirmDialog, PageHeader, Breadcrumb
├── config/               # Navigation items, Firebase config, RBAC permission matrix
├── features/             # Domain feature modules & contexts:
│   ├── auth/             # Authentication context, session hydration, persona switcher
│   ├── tenants/          # Multi-tenant workspace management context
│   └── [domain dirs]     # users, organizations, reporters, news, marketplace,
│                         # editorial, newspaper, editions, production, billing, analytics
├── hooks/                # useAuth, useTenant, usePermission
├── layouts/              # DashboardLayout, Sidebar, TopHeader, TenantSwitcherModal, PersonaSwitcherModal
├── pages/
│   ├── DashboardPage.tsx # Newsroom Overview & 7 Core Metrics
│   ├── newsroom/         # News dispatch, Submissions, Reporters, Editorial Queue
│   ├── newspaper/        # Editions desk, Page Designer, Templates, Brands
│   ├── marketplace/      # Marketplace wire, Purchased news, My listings, Licenses
│   ├── production/       # Finalized editions, Night press queue, Print downloads
│   ├── finance/          # Wallet, Transactions, Reporter earnings, Payouts
│   ├── analytics/        # Circulation & Readership intelligence
│   ├── settings/         # Organization profile, Member RBAC roster, Permission matrix, Plan
│   └── auth/             # Sign-in, registration & demo persona gateway
├── services/             # Firebase SDK, AuthService, TenantService, RBACService, MockDataService
├── types/                # Domain TypeScript contracts: Tenant, User, Person, TenantMember,
│                         # ReporterProfile, NewsArticle, Edition, Marketplace, Billing, RBAC
└── utils/                # Centralized AppError handling, formatters, and date utilities
```

---

## 2. Multi-Tenant Model

Every news organization operates as an isolated tenant:

- **`tenantId`**: System-wide unique identifier (e.g., `tenant-metro-chronicle`).
- **`organizationName`**: Display brand name of the publication house.
- **`legalName`**: Registered legal corporation / LLC.
- **`subscriptionPlan`**: Entitlement tier (`free_starter`, `editorial_pro`, `newsroom_enterprise`).
- **`status`**: Operational state (`active`, `suspended`, `provisioning`, `archived`).
- **`primaryTimezone`**: IANA timezone driving local daily press lock times.
- **Data Isolation**: All tenant-scoped documents (articles, editions, templates, reviews, members) must carry `tenantId`. Firestore Security Rules mathematically enforce that users without active membership in `tenantId` cannot read or write tenant documents.

---

## 3. Decoupled Identity Model (Person vs User)

In publishing, a human journalist may write under different bylines, belong to multiple news organizations, or work independently as an accredited freelance war correspondent.

- **`Person` (`/persons/{personId}`)**: The physical real-world individual (legal name, pen names, biography, press accreditation number, contact phone).
- **`User` (`/users/{uid}`)**: The authenticated login account linked to Firebase Auth UID, authentication credentials, and platform-wide role (`super_admin`, `platform_admin`, `support_admin`, `none`).
- **`TenantMember` (`/tenantMembers/{tenantId}_{uid}`)**: Connects a User to a specific organization with explicit organization role, reporter affiliation, and custom permissions.
- **`ReporterProfile` (`/reporterProfiles/{reporterId}`)**: Professional editorial profile holding beat specializations, originality verification score (0-100), articles count, and financial wallet reference.

---

## 4. RBAC (Role-Based Access Control) Matrix

NewsPress uses an extensible permission system evaluated dynamically by `RBACService`:

### Available Permissions
- **Tenant**: `tenant.read`, `tenant.update`, `tenant.manage_settings`
- **Users**: `users.read`, `users.manage`
- **Reporters**: `reporters.read`, `reporters.manage`
- **News**: `news.create`, `news.read`, `news.edit`, `news.approve`, `news.publish`
- **Marketplace**: `marketplace.browse`, `marketplace.buy`, `marketplace.sell`
- **Editions**: `editions.create`, `editions.edit`, `editions.finalize`
- **Production**: `production.view`, `production.download`, `production.manage_queue`
- **Billing**: `billing.view`, `billing.manage`
- **Analytics**: `analytics.view`
- **System**: `system.admin`

### Key Roles
- **`super_admin`**: Global system administrative control across all organizations and transactions.
- **`owner`**: Complete organizational, editorial, and billing authority for the news tenant.
- **`editor_in_chief`**: Supreme newsroom editorial authority. Approves stories, locks editions, and finalizes press runs.
- **`editor`**: Desk review, fact-checking, and layout editing.
- **`reporter_manager`**: Roster assignments and beat management.
- **`accountant`**: Financial reporting, print vendor invoices, and royalty statements.
- **`staff_reporter`**: Staff correspondent drafting and submitting articles.
- **`freelance_reporter`**: Independent journalist pitching stories and listing in the open marketplace wire.

---

## 5. Firestore Collections

| Collection | Schema Entity | Purpose |
|---|---|---|
| `/tenants/{tenantId}` | `Tenant` | Independent news organizations |
| `/persons/{personId}` | `Person` | Decoupled real-world humans |
| `/users/{userId}` | `User` | Login accounts mapped to Firebase Auth |
| `/tenantMembers/{memberId}` | `TenantMember` | User-to-organization membership and assigned roles |
| `/reporterProfiles/{reporterId}` | `ReporterProfile` | Journalist credentials, beats, and originality scores |
| `/subscriptions/{subscriptionId}` | `Subscription` | SaaS tier entitlements and seat licenses |
| `/permissions/{roleKey}` | `Permission` | System role definitions and capability matrix |

---

## 6. Security Rules Architecture

Rules are deployed to Cloud Firestore in `firestore.rules`:
1. **Default-Deny Catch-All**: `match /{document=**} { allow read, write: if false; }`.
2. **Platform Admin Override**: Verified against `alfanewsservice@gmail.com` and `/users/{uid}.platformRole`.
3. **Tenant Membership Gate**: Evaluates `isTenantMember(tenantId)` by verifying existence in `/tenantMembers/$(tenantId + '_' + request.auth.uid)`.
4. **Tenant Admin Gate**: Only `owner`, `administrator`, or `editor_in_chief` can modify tenant settings or manage members.
5. **Originality Score Immutability**: Reporters cannot self-modify `originalityScore` or `verificationStatus`.

---

## 7. Environment Variables

Create `.env` using `.env.example`:

```bash
# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
```

---

## 8. Running the Application

```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev

# Build production bundle
npm run build

# Run linting
npm run lint
```

---

## 9. Phase 1 Boundaries & Scope

In accordance with strict development rules, Phase 1 establishes the complete foundation without mocked fake financial or printing integrations:
- **Established**: Modular architecture, Firestore models, Security rules, Firebase authentication, Multi-tenant switching, RBAC permission evaluation engine, Newspaper editorial design system, Dashboard with 7 core metrics, Newsroom dispatches & review queue.
- **Architected for Future Phases**: Page Designer canvas, Algorithmic Originality engine, Automated layout flow, PDF/X-1a RIP spooler, Marketplace payment escrow, and Banking payouts.
