# NewsPress Security Specification & Red Team Audit
## Phase 2 & Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine

### 1. Data Invariants

1. **Authoritative Submission Timestamp**: An authoritative submission timestamp (`serverSubmittedAt`) must strictly be generated server-side. Clients cannot inject arbitrary past or future timestamps.
2. **Reporter Privilege Boundary**: A reporter can create drafts, edit drafts, and submit their own stories. A reporter is strictly forbidden from approving their own stories, marking stories as `VERIFIED_ORIGINAL`, or modifying originality scores.
3. **Tenant Isolation**: Non-admin users can never read, list, create, or update articles or purchased licenses belonging to a different tenant.
4. **Marketplace Barrier**: A story in status `draft`, `submitted`, `possible_duplicate`, `duplicate_confirmed`, or `disputed` can never be transitioned directly to `marketplace_listed` or bypass editorial approval.
5. **No Free Marketplace News**: Marketplace listings and purchases must always require a positive price (> ₹0) or an active subscription pack unit. No ₹0 purchases or free downloads are permitted.
6. **Immutable Financial Ledger**: All ledger entries in `/ledgerTransactions` are strictly append-only (`allow update, delete: if false`). Historical financial records cannot be mutated.
7. **License Rights Tamper Resistance**: Acquired rights in `/newsLicenses` cannot be altered by buyers post-purchase.
8. **Wallet Balance Authority**: Reporter available balance, gross sales, and fees in `/reporterWallets` are authoritative server calculations. Client modifications to balances are rejected by rules.
9. **Exclusive Territorial Integrity**: Conflicting exclusive territorial licenses for the same story within overlapping timeframes are blocked by the domain collision engine.
10. **Confidential Evidence Protection**: Private reporter evidence (GPS coordinates, private source contacts, confidential notes) is strictly redacted from marketplace buyers.

---

### 2. The "Dirty Dozen" Adversarial Payloads & Red Team Tests

1. **Payload 1: Self-Approval Attack**  
   Reporter `user-sofia-chen` sends `PATCH /news/art-003` with `{ editorialStatus: 'approved' }`.  
   *Expected Result*: `PERMISSION_DENIED`.

2. **Payload 2: Free News Insertion Attack**  
   User attempts `POST /marketplaceListings/mkt-free` with `{ price: 0 }`.  
   *Expected Result*: `PERMISSION_DENIED` (Price must be strictly > 0).

3. **Payload 3: Post-Purchase Price Tampering**  
   Buyer attempts `PATCH /marketplacePurchases/purch-123` with `{ grossAmount: 1 }`.  
   *Expected Result*: `PERMISSION_DENIED` (Purchases are immutable receipts).

4. **Payload 4: Cross-Tenant License Snooping**  
   User from `tenant-pacific-tribune` attempts `GET /newsLicenses/lic-metro` owned by `tenant-metro-chronicle`.  
   *Expected Result*: `PERMISSION_DENIED`.

5. **Payload 5: Wallet Balance Injection**  
   Reporter attempts `PATCH /reporterWallets/wallet-rep-1` with `{ availableBalance: 999999 }`.  
   *Expected Result*: `PERMISSION_DENIED`.

6. **Payload 6: Plagiarism Confirmation By Unauthorized Reporter**  
   Reporter attempts to confirm duplicate status on a rival's story via `PATCH /news/art-rival` with `{ originalityStatus: 'DUPLICATE_CONFIRMED' }`.  
   *Expected Result*: `PERMISSION_DENIED`.

7. **Payload 7: Entitlement Quota Forgery**  
   Buyer tenant attempts `PATCH /marketplaceEntitlements/ent-123` with `{ remainingUnits: 500 }`.  
   *Expected Result*: `PERMISSION_DENIED` (Entitlements require administrative authority).

8. **Payload 8: Ledger History Deletion**  
   User attempts `DELETE /ledgerTransactions/led-123`.  
   *Expected Result*: `PERMISSION_DENIED` (Ledger is append-only).

9. **Payload 9: License Rights Extension Attack**  
   Buyer attempts `PATCH /newsLicenses/lic-123` with `{ resaleAllowed: true, durationDays: 9999 }`.  
   *Expected Result*: `PERMISSION_DENIED`.

10. **Payload 10: Exclusive Lock Overwrite**  
    Second buyer attempts to acquire `EXCLUSIVE` rights on an already locked territory.  
    *Expected Result*: Rejected by Exclusivity Collision Engine with conflict error.

11. **Payload 11: Self-Approved Payout Attack**  
    Reporter attempts `PATCH /payoutRequests/pay-123` with `{ status: 'approved' }`.  
    *Expected Result*: `PERMISSION_DENIED` (Only admins can review payouts).

12. **Payload 12: Premature Ineligible Listing**  
    Reporter attempts to list an unapproved or disputed story on the marketplace wire.  
    *Expected Result*: Blocked by `MarketplaceEligibilityService`.
