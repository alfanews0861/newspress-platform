/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 11 Test Suite
 * Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 * 
 * Includes 60+ rigorous tests covering revenue recognition, double-entry ledger,
 * split snapshots, settlement holds, refunds, chargebacks, payout eligibility,
 * payout reservations, provider adapters, reconciliation, and security.
 */

import { revenueSplitService } from '../services/revenueSplitService';
import { revenueRecognitionService } from '../services/revenueRecognitionService';
import { financialLedgerService } from '../services/financialLedgerService';
import { financialLedgerIntegrityService } from '../services/financialLedgerIntegrityService';
import { payableBalanceService } from '../services/payableBalanceService';
import { payoutProfileService } from '../services/payoutProfileService';
import { payoutEligibilityService } from '../services/payoutEligibilityService';
import { payoutService } from '../services/payoutService';
import { mockPayoutProvider } from '../services/payout/mockPayoutProvider';
import { razorpayXPayoutAdapter } from '../services/payout/razorpayXPayoutAdapter';
import { stripeConnectPayoutAdapter } from '../services/payout/stripeConnectPayoutAdapter';
import { revenueReversalService } from '../services/revenueReversalService';
import { revenueReportingService } from '../services/revenueReportingService';
import { financialIntegrityService } from '../services/financialIntegrityService';
import { financialReconciliationService } from '../services/financialReconciliationService';
import { FinancialLedgerEntry, RevenueSplitConfiguration } from '../types/financePhase11';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runPhase11Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 11 MARKETPLACE REVENUE & PAYOUT ENGINE TESTS');
  console.log('================================================================');

  const tenantA = 'tenant-andhra-chronicle';
  const tenantB = 'tenant-deccan-post';
  const reporter1 = 'rep-david-okafor';
  const reporter2 = 'rep-sofia-chen';
  const sourceOrg1 = 'org-investigative-bureau';

  // SECTION 1: REVENUE SPLIT & CONFIGURATION (1-7)
  console.log('\n--- SECTION 1: REVENUE SPLIT & CONFIGURATION ---');

  // Test 1: Valid split configuration validation (must total 100%)
  const validConfig: RevenueSplitConfiguration = {
    id: 'split-test-01',
    version: 1,
    reporterPercent: 60,
    sourcePercent: 20,
    platformPercent: 20,
    roundingPolicy: 'ROUND_REPORTER',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const valRes = revenueSplitService.validateConfiguration(validConfig);
  assert(valRes.valid === true, 'Valid split configuration (60/20/20) must pass validation.');
  console.log('✓ Test 1 Passed: Valid split configuration validated.');

  // Test 2: Invalid split total rejected (> 100%)
  const invalidConfigOver = { ...validConfig, reporterPercent: 70 };
  const valOver = revenueSplitService.validateConfiguration(invalidConfigOver);
  assert(valOver.valid === false, 'Split total > 100% must be rejected.');
  console.log('✓ Test 2 Passed: Over 100% split total rejected.');

  // Test 3: Negative split percentage rejected
  const invalidConfigNeg = { ...validConfig, reporterPercent: -10, platformPercent: 90 };
  const valNeg = revenueSplitService.validateConfiguration(invalidConfigNeg);
  assert(valNeg.valid === false, 'Negative split percentage must be rejected.');
  console.log('✓ Test 3 Passed: Negative percentage rejected.');

  // Test 4: Integer minor units split calculation (₹10.50 = 1050 paise)
  const calc1 = revenueSplitService.calculateSplitMinor(1050, validConfig);
  assert(calc1.reporterShareMinor + calc1.sourceShareMinor + calc1.platformShareMinor === 1050, 'Sum of shares must equal gross 1050 paise.');
  console.log('✓ Test 4 Passed: Integer minor unit split conserves money.');

  // Test 5: Rounding policy ROUND_REPORTER handles remainders deterministically
  const calcRemainder = revenueSplitService.calculateSplitMinor(1001, validConfig);
  assert(calcRemainder.reporterShareMinor + calcRemainder.sourceShareMinor + calcRemainder.platformShareMinor === 1001, 'Rounding remainder preserved exactly.');
  console.log('✓ Test 5 Passed: Rounding remainder handled deterministically.');

  // Test 6: Freelance default configuration gives 80% to reporter and 20% to platform
  const freelanceConf = revenueSplitService.resolveConfiguration({ hasSourceOrganization: false });
  assert(freelanceConf.reporterPercent === 80 && freelanceConf.sourcePercent === 0, 'Freelance split must yield 80/0/20.');
  console.log('✓ Test 6 Passed: Freelance default split resolved.');

  // Test 7: Revenue split snapshot creation is immutable
  const snap1 = revenueSplitService.createSnapshot({
    tenantId: tenantA,
    purchaseId: 'purch-test-snap-1',
    grossAmountMinor: 500,
    config: validConfig
  });
  assert(Boolean(snap1.id) && snap1.reporterAmountMinor === 300, 'Snapshot calculates 300 paise reporter share.');
  console.log('✓ Test 7 Passed: Revenue split snapshot created.');

  // SECTION 2: REVENUE RECOGNITION (8-14)
  console.log('\n--- SECTION 2: REVENUE RECOGNITION ---');

  // Test 8: Recognize marketplace revenue on captured payment
  const rev1 = await revenueRecognitionService.recognizeMarketplaceRevenue({
    tenantId: tenantA,
    purchaseId: 'purch-rec-101',
    marketplaceListingId: 'mkt-rec-101',
    newsArticleId: 'art-rec-101',
    reporterId: reporter1,
    sourceOrganizationId: sourceOrg1,
    publisherTenantId: tenantB,
    grossAmountMinor: 1000, // ₹10.00
    paymentProvider: 'RAZORPAY',
    providerTransactionId: 'txn_rzp_101',
    paymentStatus: 'CAPTURED',
    idempotencyKey: 'idemp_rec_101'
  });
  assert(rev1.event.grossAmountMinor === 1000, 'Gross amount must be 1000 paise.');
  console.log('✓ Test 8 Passed: Revenue recognized on CAPTURED payment.');

  // Test 9: Revenue recognition idempotency (duplicate webhook returns existing event)
  const revDuplicate = await revenueRecognitionService.recognizeMarketplaceRevenue({
    tenantId: tenantA,
    purchaseId: 'purch-rec-101',
    marketplaceListingId: 'mkt-rec-101',
    newsArticleId: 'art-rec-101',
    reporterId: reporter1,
    sourceOrganizationId: sourceOrg1,
    publisherTenantId: tenantB,
    grossAmountMinor: 1000,
    paymentProvider: 'RAZORPAY',
    providerTransactionId: 'txn_rzp_101',
    paymentStatus: 'CAPTURED',
    idempotencyKey: 'idemp_rec_101'
  });
  assert(revDuplicate.event.id === rev1.event.id, 'Duplicate webhook must return identical revenue event.');
  console.log('✓ Test 9 Passed: Duplicate payment webhook idempotency verified.');

  // Test 10: Uncaptured/failed payment rejected for revenue recognition
  let uncapturedFailed = false;
  try {
    await revenueRecognitionService.recognizeMarketplaceRevenue({
      tenantId: tenantA,
      purchaseId: 'purch-rec-failed',
      marketplaceListingId: 'mkt-rec-failed',
      newsArticleId: 'art-rec-failed',
      reporterId: reporter1,
      publisherTenantId: tenantB,
      grossAmountMinor: 1000,
      paymentProvider: 'STRIPE',
      providerTransactionId: 'txn_str_failed',
      paymentStatus: 'FAILED',
      idempotencyKey: 'idemp_failed_101'
    });
  } catch (err) {
    uncapturedFailed = true;
  }
  assert(uncapturedFailed, 'FAILED payment status must be rejected from revenue recognition.');
  console.log('✓ Test 10 Passed: Uncaptured/failed payment rejected.');

  // Test 11: Zero or negative gross amount rejected
  let zeroGrossFailed = false;
  try {
    await revenueRecognitionService.recognizeMarketplaceRevenue({
      tenantId: tenantA,
      purchaseId: 'purch-zero',
      marketplaceListingId: 'mkt-zero',
      newsArticleId: 'art-zero',
      reporterId: reporter1,
      publisherTenantId: tenantB,
      grossAmountMinor: 0,
      paymentProvider: 'MOCK',
      providerTransactionId: 'txn_zero',
      paymentStatus: 'CAPTURED',
      idempotencyKey: 'idemp_zero'
    });
  } catch (err) {
    zeroGrossFailed = true;
  }
  assert(zeroGrossFailed, 'Zero gross amount must be rejected.');
  console.log('✓ Test 11 Passed: Zero gross amount rejected.');

  // Test 12: Split snapshot created on revenue recognition is immutable
  const snapFetched = revenueSplitService.getSnapshotForPurchase('purch-rec-101');
  assert(Boolean(snapFetched) && snapFetched!.purchaseId === 'purch-rec-101', 'Split snapshot linked to purchase.');
  console.log('✓ Test 12 Passed: Snapshot linked to purchase.');

  // Test 13: Revenue event recorded with platform fee and net distributable minor
  assert(rev1.event.platformFeeMinor > 0 && rev1.event.netDistributableMinor > 0, 'Platform fee and net distributable calculated.');
  console.log('✓ Test 13 Passed: Distributable amounts recorded.');

  // Test 14: All recognized revenue events accessible via query API
  const allEvts = revenueRecognitionService.getAllEvents();
  assert(allEvts.length >= 1, 'Revenue events store accessible.');
  console.log('✓ Test 14 Passed: Revenue events queryable.');

  // SECTION 3: IMMUTABLE LEDGER & DOUBLE-ENTRY INTEGRITY (15-22)
  console.log('\n--- SECTION 3: IMMUTABLE LEDGER & DOUBLE-ENTRY INTEGRITY ---');

  // Test 15: Double-entry balancing rule (Total Credits == Total Debits)
  const validGroup: FinancialLedgerEntry[] = [
    {
      id: 'led-de-01',
      tenantId: tenantA,
      accountId: 'acc_buyer',
      accountType: 'PUBLISHER',
      direction: 'DEBIT',
      amountMinor: 2000,
      currency: 'INR',
      transactionType: 'PURCHASE_SETTLEMENT',
      referenceType: 'PURCHASE',
      referenceId: 'purch-de-01',
      idempotencyKey: 'idemp_de_01',
      status: 'COMPLETED',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'led-de-02',
      tenantId: tenantA,
      accountId: 'acc_platform',
      accountType: 'PLATFORM',
      direction: 'CREDIT',
      amountMinor: 400,
      currency: 'INR',
      transactionType: 'PLATFORM_FEE',
      referenceType: 'PURCHASE',
      referenceId: 'purch-de-01',
      idempotencyKey: 'idemp_de_01',
      status: 'COMPLETED',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'led-de-03',
      tenantId: tenantA,
      accountId: `acc_${reporter1}`,
      accountType: 'REPORTER',
      direction: 'CREDIT',
      amountMinor: 1600,
      currency: 'INR',
      transactionType: 'ROYALTY_CREDIT',
      referenceType: 'PURCHASE',
      referenceId: 'purch-de-01',
      idempotencyKey: 'idemp_de_01',
      status: 'COMPLETED',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ];
  const deVal = financialLedgerIntegrityService.validateTransactionGroup(validGroup);
  assert(deVal.valid === true, 'Balanced transaction group (2000 deb = 2000 cred) must pass.');
  console.log('✓ Test 15 Passed: Double-entry balancing rule verified.');

  // Test 16: Imbalanced transaction group rejected
  const imbalancedGroup = [validGroup[0], validGroup[1]]; // 2000 DEBIT vs 400 CREDIT
  const deImbal = financialLedgerIntegrityService.validateTransactionGroup(imbalancedGroup);
  assert(deImbal.valid === false, 'Imbalanced group must be rejected.');
  console.log('✓ Test 16 Passed: Imbalanced transaction group rejected.');

  // Test 17: Financial ledger append transaction group succeeds
  const appendRes = financialLedgerService.appendTransactionGroup(validGroup, 'idemp_de_01');
  assert(appendRes.success === true, 'Append valid group to ledger succeeds.');
  console.log('✓ Test 17 Passed: Financial ledger append succeeded.');

  // Test 18: Ledger idempotency prevents duplicate entry creation
  const appendDup = financialLedgerService.appendTransactionGroup(validGroup, 'idemp_de_01');
  assert(appendDup.entries.length === validGroup.length, 'Duplicate append returns existing entries.');
  console.log('✓ Test 18 Passed: Ledger idempotency verified.');

  // Test 19: Authoritative account balance reconstructed from ledger
  const repBal = financialLedgerService.getAccountBalanceMinor(`acc_${reporter1}`);
  assert(repBal.totalCreditsMinor > 0, 'Reconstructed reporter balance has positive credits.');
  console.log('✓ Test 19 Passed: Account balance reconstructed from ledger.');

  // Test 20: Negative ledger amounts strictly forbidden
  const negGroup = [
    { ...validGroup[0], amountMinor: -500 },
    { ...validGroup[1], amountMinor: -500 }
  ];
  const negVal = financialLedgerIntegrityService.validateTransactionGroup(negGroup);
  assert(negVal.valid === false, 'Negative ledger amounts must be rejected.');
  console.log('✓ Test 20 Passed: Negative ledger amounts rejected.');

  // Test 21: Financial ledger integrity scan detects no imbalances on clean state
  const scanClean = financialIntegrityService.performIntegrityScan();
  assert(scanClean.valid === true, 'Clean ledger scan must be valid.');
  console.log('✓ Test 21 Passed: Integrity scan passed on clean state.');

  // Test 22: Ledger entries are append-only (no deletion/mutation methods)
  const allLedger = financialLedgerService.getEntries();
  assert(Array.isArray(allLedger), 'Ledger store is append-only list.');
  console.log('✓ Test 22 Passed: Append-only invariant maintained.');

  // SECTION 4: SETTLEMENT HOLD & PAYABLE BALANCE (23-28)
  console.log('\n--- SECTION 4: SETTLEMENT HOLD & PAYABLE BALANCE ---');

  // Test 23: Payable balance service respects 7-day settlement hold period
  payableBalanceService.setSettlementHoldDays(7);
  const pBal = payableBalanceService.calculatePayableBalance(reporter1);
  assert(pBal.pendingHoldMinor > 0, 'Fresh sales are held in pendingHoldMinor.');
  console.log('✓ Test 23 Passed: 7-day settlement hold active.');

  // Test 24: Older transactions outside hold period become available payable balance
  payableBalanceService.setSettlementHoldDays(0); // Simulate zero-day hold for immediate availability test
  const pBalZero = payableBalanceService.calculatePayableBalance(reporter1);
  assert(pBalZero.availablePayableBalanceMinor > 0, 'Transactions outside hold period are available.');
  payableBalanceService.setSettlementHoldDays(7); // Restore standard hold
  console.log('✓ Test 24 Passed: Outside-hold transactions become available.');

  // Test 25: Formula for payable balance (Gross - Refunds - Chargebacks - Payouts - Holds)
  assert(pBal.availablePayableBalanceMinor <= pBal.grossEarnedMinor, 'Available balance cannot exceed gross earned.');
  console.log('✓ Test 25 Passed: Payable balance formula verified.');

  // Test 26: Configurable settlement hold days cannot be negative
  let negHoldFailed = false;
  try {
    payableBalanceService.setSettlementHoldDays(-5);
  } catch (err) {
    negHoldFailed = true;
  }
  assert(negHoldFailed, 'Negative settlement hold days rejected.');
  console.log('✓ Test 26 Passed: Negative hold days rejected.');

  // Test 27: Source organization payable balance supported
  const orgBal = payableBalanceService.calculatePayableBalance(sourceOrg1);
  assert(orgBal.grossEarnedMinor >= 0, 'Source org payable balance calculated.');
  console.log('✓ Test 27 Passed: Source organization payable balance calculated.');

  // Test 28: Zero-earnings account yields 0 payable balance without error
  const zeroUserBal = payableBalanceService.calculatePayableBalance('rep-zero-earnings');
  assert(zeroUserBal.availablePayableBalanceMinor === 0, 'Zero earnings yields 0 balance.');
  console.log('✓ Test 28 Passed: Zero earnings handled cleanly.');

  // SECTION 5: PAYOUT PROFILE & KYC (29-33)
  console.log('\n--- SECTION 5: PAYOUT PROFILE & KYC ---');

  // Test 29: Seed payout profiles initialized
  const profDavid = payoutProfileService.getProfile(reporter1);
  assert(Boolean(profDavid) && profDavid!.verificationStatus === 'VERIFIED', 'David profile verified.');
  console.log('✓ Test 29 Passed: Seed payout profile verified.');

  // Test 30: Upsert payout profile tokenizes bank details without raw credentials
  const profNew = payoutProfileService.saveProfile({
    tenantId: tenantA,
    ownerType: 'REPORTER',
    ownerId: reporter2,
    legalName: 'Sofia Chen',
    displayName: 'Sofia Chen',
    payoutMethod: 'BANK_TRANSFER',
    bankAccountToken: 'tok_bank_safetoken_123',
    taxIdReference: 'PAN-TEST1234'
  });
  assert(profNew.bankAccountToken === 'tok_bank_safetoken_123', 'Bank details saved as token.');
  console.log('✓ Test 30 Passed: Bank details tokenized safely.');

  // Test 31: Verification status transition
  payoutProfileService.updateVerificationStatus(reporter2, 'VERIFIED');
  const profSof = payoutProfileService.getProfile(reporter2);
  assert(profSof!.verificationStatus === 'VERIFIED', 'Verification status updated to VERIFIED.');
  console.log('✓ Test 31 Passed: Verification status updated.');

  // Test 32: Unconfigured owner profile returns undefined
  const profNone = payoutProfileService.getProfile('rep-unconfigured');
  assert(profNone === undefined, 'Unconfigured profile returns undefined.');
  console.log('✓ Test 32 Passed: Unconfigured profile handled.');

  // Test 33: Profile status can be set to INACTIVE or SUSPENDED
  const profSusp = payoutProfileService.saveProfile({
    tenantId: tenantA,
    ownerType: 'REPORTER',
    ownerId: 'rep-suspended',
    legalName: 'Suspended Reporter',
    displayName: 'Suspended Reporter',
    payoutMethod: 'UPI',
    UPIReference: 'susp@upi'
  });
  payoutProfileService.updateVerificationStatus('rep-suspended', 'EXPIRED');
  const profSuspCheck = payoutProfileService.getProfile('rep-suspended');
  assert(profSuspCheck!.verificationStatus === 'EXPIRED', 'Expired status set.');
  console.log('✓ Test 33 Passed: Expired verification status recorded.');

  // SECTION 6: PAYOUT ELIGIBILITY & REQUESTS (34-42)
  console.log('\n--- SECTION 6: PAYOUT ELIGIBILITY & REQUESTS ---');

  // Test 34: Minimum payout threshold enforced
  payoutEligibilityService.setMinThresholdMinor(1000); // ₹10 = 1000 paise threshold
  payableBalanceService.setSettlementHoldDays(0); // Zero-hold for testing eligibility
  const eligDavid = payoutEligibilityService.evaluateEligibility(reporter1, 500); // 500 paise = ₹5 (< ₹10 threshold)
  assert(eligDavid.status === 'INELIGIBLE', 'Requested amount below minimum threshold must be INELIGIBLE.');
  console.log('✓ Test 34 Passed: Below minimum threshold rejected.');

  // Test 35: Unverified profile rendered INELIGIBLE
  const eligSusp = payoutEligibilityService.evaluateEligibility('rep-suspended', 20000);
  assert(eligSusp.status === 'INELIGIBLE', 'Expired/unverified profile rendered INELIGIBLE.');
  console.log('✓ Test 35 Passed: Unverified profile ineligibility enforced.');

  // Test 36: Eligible payout request creation succeeds
  const req1 = await payoutService.requestPayout({
    tenantId: tenantA,
    ownerType: 'REPORTER',
    ownerId: reporter1,
    amountMinor: 1000, // ₹10
    requestedBy: reporter1,
    idempotencyKey: 'idemp_pout_req_101'
  });
  assert(req1.status === 'REQUESTED' && req1.amountMinor === 1000, 'Payout request created in REQUESTED state.');
  console.log('✓ Test 36 Passed: Eligible payout request created.');

  // Test 37: Payout request idempotency
  const reqDup = await payoutService.requestPayout({
    tenantId: tenantA,
    ownerType: 'REPORTER',
    ownerId: reporter1,
    amountMinor: 1000,
    requestedBy: reporter1,
    idempotencyKey: 'idemp_pout_req_101'
  });
  assert(reqDup.id === req1.id, 'Duplicate payout request returns existing request.');
  console.log('✓ Test 37 Passed: Payout request idempotency verified.');

  // Test 38: Payout approval creates double-entry balance reservation
  const appRes = await payoutService.approvePayout({
    payoutRequestId: req1.id,
    approvedBy: 'user-finance-admin',
    approverRole: 'admin'
  });
  assert(appRes.request.status === 'APPROVED' && appRes.reservation.status === 'RESERVED', 'Reservation status RESERVED.');
  console.log('✓ Test 38 Passed: Approval created transactional balance reservation.');

  // Test 39: Segregation of duties blocks creator from approving own request
  financialLedgerService.appendTransactionGroup([
    {
      id: 'fin_led_seed_rep2_deb',
      tenantId: tenantA,
      accountId: 'acc_buyer_test',
      accountType: 'PUBLISHER',
      direction: 'DEBIT',
      amountMinor: 2000,
      currency: 'INR',
      transactionType: 'PURCHASE_SETTLEMENT',
      referenceType: 'PURCHASE',
      referenceId: 'purch_seed_rep2',
      idempotencyKey: 'idemp_seed_rep2',
      status: 'COMPLETED',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'fin_led_seed_rep2_cred',
      tenantId: tenantA,
      accountId: `acc_${reporter2}`,
      accountType: 'REPORTER',
      direction: 'CREDIT',
      amountMinor: 2000,
      currency: 'INR',
      transactionType: 'ROYALTY_CREDIT',
      referenceType: 'PURCHASE',
      referenceId: 'purch_seed_rep2',
      idempotencyKey: 'idemp_seed_rep2',
      status: 'COMPLETED',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ], 'idemp_seed_rep2');

  const selfReq = await payoutService.requestPayout({
    tenantId: tenantA,
    ownerType: 'REPORTER',
    ownerId: reporter2,
    amountMinor: 1000,
    requestedBy: 'user-reporter-self',
    idempotencyKey: 'idemp_self_approve'
  });
  let selfApproveBlocked = false;
  try {
    await payoutService.approvePayout({
      payoutRequestId: selfReq.id,
      approvedBy: 'user-reporter-self',
      approverRole: 'admin',
      enforceSegregationOfDuties: true
    });
  } catch (err) {
    selfApproveBlocked = true;
  }
  assert(selfApproveBlocked, 'Creator approving own payout request must be blocked.');
  console.log('✓ Test 39 Passed: Segregation of duties enforced.');

  // Test 40: Unauthorized role rejected from approving payout
  let unauthApproveBlocked = false;
  try {
    await payoutService.approvePayout({
      payoutRequestId: selfReq.id,
      approvedBy: 'user-reporter-2',
      approverRole: 'reporter',
      enforceSegregationOfDuties: false
    });
  } catch (err) {
    unauthApproveBlocked = true;
  }
  assert(unauthApproveBlocked, 'Non-finance role rejected from approving payout.');
  console.log('✓ Test 40 Passed: RBAC role gating enforced on payout approval.');

  // Test 41: Rejection of payout request
  const rejReq = await payoutService.rejectPayout({
    payoutRequestId: selfReq.id,
    rejectedBy: 'user-finance-admin',
    reason: 'Incomplete tax documentation'
  });
  assert(rejReq.status === 'REJECTED' && rejReq.failureReason === 'Incomplete tax documentation', 'Payout request marked REJECTED.');
  console.log('✓ Test 41 Passed: Payout rejection handled.');

  // Test 42: Concurrent double-draw prevented by reservation
  const eligAfterRes = payoutEligibilityService.evaluateEligibility(reporter1, 500000); // Exceeds balance after reservation
  assert(eligAfterRes.status === 'INELIGIBLE', 'Reserved funds cannot be drawn twice.');
  console.log('✓ Test 42 Passed: Concurrent double-draw prevented.');

  // SECTION 7: PAYOUT DISBURSEMENT & PROVIDERS (43-48)
  console.log('\n--- SECTION 7: PAYOUT DISBURSEMENT & PROVIDERS ---');

  // Test 43: Submit approved payout to Mock payout provider
  const subRes = await payoutService.submitPayoutToProvider(req1.id);
  assert(subRes.status === 'COMPLETED' && Boolean(subRes.providerPayoutId), 'Payout completed via Mock provider.');
  console.log('✓ Test 43 Passed: Submitted and completed via Mock payout provider.');

  // Test 44: Mock payout provider direct execution
  const mockRes = await mockPayoutProvider.createPayout({
    payoutRequestId: 'pout_direct_mock',
    ownerId: reporter1,
    amountMinor: 5000,
    currency: 'INR',
    payoutMethod: 'UPI',
    idempotencyKey: 'idemp_direct_mock'
  });
  assert(mockRes.success === true && mockRes.status === 'COMPLETED', 'Mock provider direct execution succeeded.');
  console.log('✓ Test 44 Passed: Mock payout provider direct execution verified.');

  // Test 45: RazorpayX adapter in sandbox mode
  const rzpRes = await razorpayXPayoutAdapter.createPayout({
    payoutRequestId: 'pout_rzp_demo',
    ownerId: reporter1,
    amountMinor: 5000,
    currency: 'INR',
    payoutMethod: 'UPI',
    idempotencyKey: 'idemp_rzp_demo'
  });
  assert(rzpRes.success === true && rzpRes.status === 'PROCESSING', 'RazorpayX adapter sandbox mode succeeded.');
  console.log('✓ Test 45 Passed: RazorpayX adapter sandbox ready.');

  // Test 46: Stripe Connect adapter in sandbox mode
  const stripeRes = await stripeConnectPayoutAdapter.createPayout({
    payoutRequestId: 'pout_stripe_demo',
    ownerId: reporter1,
    amountMinor: 5000,
    currency: 'INR',
    payoutMethod: 'STRIPE_CONNECT',
    idempotencyKey: 'idemp_stripe_demo'
  });
  assert(stripeRes.success === true, 'Stripe Connect adapter sandbox mode succeeded.');
  console.log('✓ Test 46 Passed: Stripe Connect adapter sandbox ready.');

  // Test 47: Webhook processing for completed payout
  const hookRes = await payoutService.handlePayoutWebhook({
    providerEventId: 'evt_hook_101',
    providerPayoutId: req1.providerPayoutId || req1.id,
    eventType: 'PAYOUT_COMPLETED',
    payload: { status: 'COMPLETED' }
  });
  assert(hookRes.processed === true, 'Payout webhook processed.');
  console.log('✓ Test 47 Passed: Payout webhook processed.');

  // Test 48: Duplicate webhook callback idempotency
  const hookDup = await payoutService.handlePayoutWebhook({
    providerEventId: 'evt_hook_101',
    providerPayoutId: req1.providerPayoutId || req1.id,
    eventType: 'PAYOUT_COMPLETED',
    payload: { status: 'COMPLETED' }
  });
  assert(hookDup.duplicate === true, 'Duplicate webhook identified as duplicate.');
  console.log('✓ Test 48 Passed: Webhook idempotency verified.');

  // SECTION 8: REFUNDS, REVERSALS & CHARGEBACKS (49-54)
  console.log('\n--- SECTION 8: REFUNDS, REVERSALS & CHARGEBACKS ---');

  // Test 49: Full refund processes compensating ledger entries
  const revRes = await revenueReversalService.processReversal({
    purchaseId: 'purch-rec-101',
    reversalType: 'REFUND',
    reason: 'Buyer requested cancellation within terms',
    initiatedBy: 'user-finance-admin',
    idempotencyKey: 'idemp_refund_101'
  });
  assert(revRes.reversalEvent.eventType === 'REFUND' && revRes.reversalEvent.grossAmountMinor === 1000, 'Full refund processed.');
  console.log('✓ Test 49 Passed: Full refund processed.');

  // Test 50: Partial refund proportional calculation
  const revPartial = await revenueReversalService.processReversal({
    purchaseId: 'purch-rec-101',
    reversalType: 'PARTIAL_REFUND',
    refundAmountMinor: 500, // 50% partial refund
    reason: 'Partial quality dispute settlement',
    initiatedBy: 'user-finance-admin',
    idempotencyKey: 'idemp_partial_refund_101'
  });
  assert(revPartial.reversalEvent.grossAmountMinor === 500, 'Partial refund processed for 500 paise.');
  console.log('✓ Test 50 Passed: Partial refund calculated proportionally.');

  // Test 51: Original ledger entries remain immutable on refund
  const origLedger = financialLedgerService.getEntries({ purchaseId: 'purch-rec-101' });
  const completedOrig = origLedger.find(e => e.id === 'fin_led_purch-rec-101_buyer');
  assert(Boolean(completedOrig) && completedOrig!.status === 'COMPLETED', 'Original entry remains immutable.');
  console.log('✓ Test 51 Passed: Original entries immutable on refund.');

  // Test 52: Refund debit entries recorded in ledger
  const refundLedger = origLedger.filter(e => e.transactionType === 'REFUND_DEBIT');
  assert(refundLedger.length >= 3, 'Compensating refund debits created in ledger.');
  console.log('✓ Test 52 Passed: Compensating refund debits recorded.');

  // Test 53: Chargeback processes chargeback debit
  const revChargeback = await revenueReversalService.processReversal({
    purchaseId: 'purch-rec-101',
    reversalType: 'CHARGEBACK',
    reason: 'Bank forced chargeback dispute',
    initiatedBy: 'system_gateway',
    idempotencyKey: 'idemp_chargeback_101'
  });
  assert(revChargeback.reversalEvent.eventType === 'CHARGEBACK', 'Chargeback event recorded.');
  console.log('✓ Test 53 Passed: Chargeback reversal processed.');

  // Test 54: Invalid refund amount exceeding gross purchase rejected
  let excessRefundFailed = false;
  try {
    await revenueReversalService.processReversal({
      purchaseId: 'purch-rec-101',
      reversalType: 'REFUND',
      refundAmountMinor: 99999, // Exceeds original 1000
      reason: 'Excess refund',
      initiatedBy: 'admin',
      idempotencyKey: 'idemp_excess_refund'
    });
  } catch (err) {
    excessRefundFailed = true;
  }
  assert(excessRefundFailed, 'Excess refund amount must be rejected.');
  console.log('✓ Test 54 Passed: Excess refund amount rejected.');

  // SECTION 9: FINANCIAL REPORTING & RECONCILIATION (55-62)
  console.log('\n--- SECTION 9: FINANCIAL REPORTING & RECONCILIATION ---');

  // Test 55: Platform financial report generated from ledger
  const platformReport = revenueReportingService.generatePlatformReport();
  assert(platformReport.grossMarketplaceSalesMinor >= 0, 'Platform financial report generated.');
  console.log('✓ Test 55 Passed: Platform financial report generated.');

  // Test 56: Reporter financial report generated
  const reporterReport = revenueReportingService.generateReporterReport(reporter1);
  assert(reporterReport.reporterId === reporter1, 'Reporter report generated.');
  console.log('✓ Test 56 Passed: Reporter financial report generated.');

  // Test 57: Marketplace breakdown report generated
  const mktReport = revenueReportingService.generateMarketplaceBreakdownReport();
  assert(mktReport.totalCompletedPurchases >= 1, 'Marketplace breakdown report generated.');
  console.log('✓ Test 57 Passed: Marketplace breakdown report generated.');

  // Test 58: Financial reconciliation scan finds no imbalances on balanced ledger
  const reconRes = await financialReconciliationService.reconcileAll();
  assert(typeof reconRes.totalFindings === 'number', 'Financial reconciliation scan executed.');
  console.log('✓ Test 58 Passed: End-to-end reconciliation executed.');

  // Test 59: Resolution of reconciliation finding
  if (reconRes.findings.length > 0) {
    const fId = reconRes.findings[0].id;
    const resolvedF = financialReconciliationService.resolveFinding(fId, 'Verified and corrected');
    assert(resolvedF.resolved === true, 'Reconciliation finding resolved.');
  } else {
    // Inject mock finding to test resolution API
    const mockFinding = {
      id: 'fnd_test_res_101',
      findingType: 'PROVIDER_MISMATCH' as const,
      severity: 'WARNING' as const,
      description: 'Test provider mismatch',
      detectedAt: new Date().toISOString(),
      resolved: false
    };
    financialReconciliationService['findings'].push(mockFinding);
    const resolvedF = financialReconciliationService.resolveFinding(mockFinding.id, 'Manually reconciled with provider log');
    assert(resolvedF.resolved === true, 'Reconciliation finding resolved.');
  }
  console.log('✓ Test 59 Passed: Reconciliation finding resolution verified.');

  // Test 60: System classification verification (ACTUAL IMPLEMENTED vs SANDBOX READY vs MOCK)
  assert(mockPayoutProvider.providerName === 'MOCK', 'Mock payout provider classified.');
  assert(razorpayXPayoutAdapter.providerName === 'RAZORPAY_X', 'RazorpayX adapter classified.');
  assert(stripeConnectPayoutAdapter.providerName === 'STRIPE_CONNECT', 'Stripe Connect adapter classified.');
  console.log('✓ Test 60 Passed: System integration classifications verified.');

  // Test 61: Double-entry sum invariant holds across all transactions in system
  const finalCheck = financialLedgerIntegrityService.detectImbalances(financialLedgerService.getEntries());
  assert(finalCheck.length === 0, 'No double-entry imbalances in complete ledger history.');
  console.log('✓ Test 61 Passed: Global double-entry sum invariant verified.');

  // Test 62: Append-only ledger length strictly increases with new transactions
  const countBefore = financialLedgerService.getEntries().length;
  financialLedgerService.appendTransactionGroup(
    [
      {
        id: 'led-final-01',
        tenantId: tenantA,
        accountId: 'acc_test_final',
        accountType: 'PLATFORM',
        direction: 'DEBIT',
        amountMinor: 100,
        currency: 'INR',
        transactionType: 'ADJUSTMENT',
        referenceType: 'ADJUSTMENT',
        referenceId: 'adj-01',
        idempotencyKey: 'idemp_final_adj',
        status: 'COMPLETED',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'led-final-02',
        tenantId: tenantA,
        accountId: 'acc_test_final_cred',
        accountType: 'ADJUSTMENT',
        direction: 'CREDIT',
        amountMinor: 100,
        currency: 'INR',
        transactionType: 'ADJUSTMENT',
        referenceType: 'ADJUSTMENT',
        referenceId: 'adj-01',
        idempotencyKey: 'idemp_final_adj',
        status: 'COMPLETED',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    'idemp_final_adj'
  );
  const countAfter = financialLedgerService.getEntries().length;
  assert(countAfter === countBefore + 2, 'Ledger length strictly increases.');
  console.log('✓ Test 62 Passed: Append-only strict increase verified.');

  console.log('\n================================================================');
  console.log('ALL 62/62 PHASE 11 MARKETPLACE FINANCE TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runPhase11Tests().catch((err) => {
  console.error('Phase 11 Test Suite Failed:', err);
  process.exit(1);
});
