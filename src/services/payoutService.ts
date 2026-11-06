/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Payout Workflow, Reservation & Settlement Service
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import {
  PayoutRequestPhase11,
  PayoutReservation,
  PayoutOwnerType
} from '../types/financePhase11';
import { payoutProfileService } from './payoutProfileService';
import { payoutEligibilityService } from './payoutEligibilityService';
import { financialLedgerService } from './financialLedgerService';
import { auditService } from './auditService';
import { IPayoutProvider } from './payout/payoutProvider';
import { mockPayoutProvider } from './payout/mockPayoutProvider';
import { razorpayXPayoutAdapter } from './payout/razorpayXPayoutAdapter';
import { stripeConnectPayoutAdapter } from './payout/stripeConnectPayoutAdapter';

export class PayoutService {
  private requests: Map<string, PayoutRequestPhase11> = new Map();
  private reservations: Map<string, PayoutReservation> = new Map();
  private idempotencyKeys: Map<string, PayoutRequestPhase11> = new Map();
  private webhookEventIds: Set<string> = new Set();
  private providers: Map<string, IPayoutProvider> = new Map();

  constructor() {
    this.providers.set('MOCK', mockPayoutProvider);
    this.providers.set('RAZORPAY_X', razorpayXPayoutAdapter);
    this.providers.set('STRIPE_CONNECT', stripeConnectPayoutAdapter);
  }

  /**
   * Submits a payout request.
   */
  async requestPayout(params: {
    tenantId: string;
    ownerType: PayoutOwnerType;
    ownerId: string;
    amountMinor: number;
    currency?: string;
    requestedBy: string;
    idempotencyKey: string;
  }): Promise<PayoutRequestPhase11> {
    const {
      tenantId,
      ownerType,
      ownerId,
      amountMinor,
      currency = 'INR',
      requestedBy,
      idempotencyKey
    } = params;

    // 1. Idempotency Check
    if (this.idempotencyKeys.has(idempotencyKey)) {
      return this.idempotencyKeys.get(idempotencyKey)!;
    }

    // 2. Validate Profile
    const profile = payoutProfileService.getProfile(ownerId);
    if (!profile) {
      throw new Error(`Payout profile not found for owner ${ownerId}. Please configure bank or UPI details.`);
    }

    // 3. Validate Eligibility
    const eligibility = payoutEligibilityService.evaluateEligibility(ownerId, amountMinor, currency);
    if (eligibility.status !== 'ELIGIBLE') {
      throw new Error(`Payout Request Ineligible: ${eligibility.reasons.join('; ')}`);
    }

    const requestId = `pout_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const request: PayoutRequestPhase11 = {
      id: requestId,
      tenantId,
      ownerType,
      ownerId,
      amountMinor,
      currency,
      payoutProfileId: profile.id,
      requestedAt: now,
      requestedBy,
      status: 'REQUESTED',
      eligibilitySnapshotId: `elig_snap_${requestId}`,
      provider: profile.payoutMethod === 'RAZORPAY_X' ? 'RAZORPAY_X' : profile.payoutMethod === 'STRIPE_CONNECT' ? 'STRIPE_CONNECT' : 'MOCK',
      createdAt: now,
      updatedAt: now
    };

    this.requests.set(requestId, request);
    this.idempotencyKeys.set(idempotencyKey, request);

    await auditService.log({
      tenantId,
      actorId: requestedBy,
      actorName: profile.displayName,
      actorRole: 'requester',
      action: 'PAYOUT_REQUESTED',
      entityType: 'PayoutRequestPhase11',
      entityId: requestId,
      newState: request,
      reason: `Payout requested for ${currency} ${(amountMinor / 100).toFixed(2)}`
    });

    return request;
  }

  /**
   * Approves a payout request and creates a transactional reservation.
   */
  async approvePayout(params: {
    payoutRequestId: string;
    approvedBy: string;
    approverRole: string;
    enforceSegregationOfDuties?: boolean;
  }): Promise<{ request: PayoutRequestPhase11; reservation: PayoutReservation }> {
    const { payoutRequestId, approvedBy, approverRole, enforceSegregationOfDuties = true } = params;

    const request = this.requests.get(payoutRequestId);
    if (!request) throw new Error(`Payout request ${payoutRequestId} not found.`);

    if (request.status !== 'REQUESTED' && request.status !== 'UNDER_REVIEW') {
      throw new Error(`Payout request cannot be approved in current status: ${request.status}`);
    }

    // Role check
    if (approverRole !== 'admin' && approverRole !== 'finance_manager' && approverRole !== 'super_admin' && approverRole !== 'editor_in_chief') {
      throw new Error(`Unauthorized role (${approverRole}): User lacks finance approval permissions.`);
    }

    // Segregation of Duties: Creator cannot approve own request
    if (enforceSegregationOfDuties && request.requestedBy === approvedBy) {
      throw new Error('Segregation of duties violation: Creator cannot approve their own payout request.');
    }

    // Re-verify eligibility before reservation
    const eligibility = payoutEligibilityService.evaluateEligibility(request.ownerId, request.amountMinor, request.currency);
    if (eligibility.status !== 'ELIGIBLE') {
      throw new Error(`Approval blocked: Balance no longer eligible (${eligibility.reasons.join('; ')})`);
    }

    const now = new Date().toISOString();
    const reservationId = `res_pout_${payoutRequestId}`;

    // Create transactional balance reservation in ledger
    financialLedgerService.appendTransactionGroup(
      [
        {
          id: `fin_led_res_${payoutRequestId}_owner`,
          tenantId: request.tenantId,
          accountId: `acc_${request.ownerId}`,
          accountType: request.ownerType === 'REPORTER' ? 'REPORTER' : 'SOURCE_ORGANIZATION',
          direction: 'DEBIT',
          amountMinor: request.amountMinor,
          currency: request.currency,
          transactionType: 'PAYOUT_RESERVATION',
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payoutRequestId,
          idempotencyKey: `idemp_res_${payoutRequestId}`,
          status: 'COMPLETED',
          occurredAt: now,
          createdAt: now
        },
        {
          id: `fin_led_res_${payoutRequestId}_reserve`,
          tenantId: request.tenantId,
          accountId: 'acc_payout_reserve',
          accountType: 'REFUND_RESERVE',
          direction: 'CREDIT',
          amountMinor: request.amountMinor,
          currency: request.currency,
          transactionType: 'PAYOUT_RESERVATION',
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payoutRequestId,
          idempotencyKey: `idemp_res_${payoutRequestId}`,
          status: 'COMPLETED',
          occurredAt: now,
          createdAt: now
        }
      ],
      `idemp_res_${payoutRequestId}`
    );

    const reservation: PayoutReservation = {
      id: reservationId,
      tenantId: request.tenantId,
      payoutRequestId,
      ownerId: request.ownerId,
      reservedAmountMinor: request.amountMinor,
      currency: request.currency,
      status: 'RESERVED',
      reservedAt: now,
      updatedAt: now
    };

    this.reservations.set(reservationId, reservation);

    request.status = 'APPROVED';
    request.approvedBy = approvedBy;
    request.approvedAt = now;
    request.ledgerReservationId = reservationId;
    request.updatedAt = now;

    await auditService.log({
      tenantId: request.tenantId,
      actorId: approvedBy,
      actorName: approvedBy,
      actorRole: approverRole,
      action: 'PAYOUT_APPROVED',
      entityType: 'PayoutRequestPhase11',
      entityId: payoutRequestId,
      reason: `Payout #${payoutRequestId} approved and reserved by ${approvedBy}`
    });

    return { request, reservation };
  }

  /**
   * Rejects a payout request.
   */
  async rejectPayout(params: {
    payoutRequestId: string;
    rejectedBy: string;
    reason: string;
  }): Promise<PayoutRequestPhase11> {
    const { payoutRequestId, rejectedBy, reason } = params;

    const request = this.requests.get(payoutRequestId);
    if (!request) throw new Error(`Payout request ${payoutRequestId} not found.`);

    if (request.status !== 'REQUESTED' && request.status !== 'UNDER_REVIEW') {
      throw new Error(`Payout request cannot be rejected in current status: ${request.status}`);
    }

    const now = new Date().toISOString();
    request.status = 'REJECTED';
    request.failureReason = reason;
    request.updatedAt = now;

    await auditService.log({
      tenantId: request.tenantId,
      actorId: rejectedBy,
      actorName: rejectedBy,
      actorRole: 'admin',
      action: 'PAYOUT_REJECTED',
      entityType: 'PayoutRequestPhase11',
      entityId: payoutRequestId,
      reason: `Payout rejected: ${reason}`
    });

    return request;
  }

  /**
   * Submits an approved payout to the designated payout provider.
   */
  async submitPayoutToProvider(payoutRequestId: string): Promise<PayoutRequestPhase11> {
    const request = this.requests.get(payoutRequestId);
    if (!request) throw new Error(`Payout request ${payoutRequestId} not found.`);

    if (request.status !== 'APPROVED' && request.status !== 'FAILED') {
      throw new Error(`Payout request cannot be submitted in status ${request.status}`);
    }

    const providerKey = request.provider;
    const provider = this.providers.get(providerKey) || mockPayoutProvider;

    const profile = payoutProfileService.getProfile(request.ownerId);
    const now = new Date().toISOString();

    request.status = 'PROCESSING';
    request.submittedAt = now;
    request.updatedAt = now;

    const providerResult = await provider.createPayout({
      payoutRequestId: request.id,
      ownerId: request.ownerId,
      amountMinor: request.amountMinor,
      currency: request.currency,
      payoutMethod: profile?.payoutMethod || 'BANK_TRANSFER',
      idempotencyKey: `payout_${request.tenantId}_${request.id}`,
      payoutProfileRef: profile?.id,
      narration: `NewsPress Marketplace Royalty Settlement #${request.id}`
    });

    if (providerResult.success) {
      request.providerPayoutId = providerResult.providerPayoutId;
      if (providerResult.status === 'COMPLETED') {
        return this.completePayout(request.id);
      }
    } else {
      return this.handlePayoutFailure(request.id, providerResult.failureReason || 'Provider submission rejected.');
    }

    return request;
  }

  /**
   * Completes a payout after successful provider disbursement.
   */
  async completePayout(payoutRequestId: string): Promise<PayoutRequestPhase11> {
    const request = this.requests.get(payoutRequestId);
    if (!request) throw new Error(`Payout request ${payoutRequestId} not found.`);

    const reservation = request.ledgerReservationId ? this.reservations.get(request.ledgerReservationId) : undefined;
    const now = new Date().toISOString();

    // Move reservation from REFUND_RESERVE -> PLATFORM_DISBURSEMENT
    financialLedgerService.appendTransactionGroup(
      [
        {
          id: `fin_led_disb_${payoutRequestId}_reserve`,
          tenantId: request.tenantId,
          accountId: 'acc_payout_reserve',
          accountType: 'REFUND_RESERVE',
          direction: 'DEBIT',
          amountMinor: request.amountMinor,
          currency: request.currency,
          transactionType: 'PAYOUT_DISBURSEMENT',
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payoutRequestId,
          idempotencyKey: `idemp_disb_${payoutRequestId}`,
          status: 'COMPLETED',
          occurredAt: now,
          createdAt: now
        },
        {
          id: `fin_led_disb_${payoutRequestId}_bank`,
          tenantId: request.tenantId,
          accountId: 'acc_bank_disbursement',
          accountType: 'PLATFORM',
          direction: 'CREDIT',
          amountMinor: request.amountMinor,
          currency: request.currency,
          transactionType: 'PAYOUT_DISBURSEMENT',
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payoutRequestId,
          idempotencyKey: `idemp_disb_${payoutRequestId}`,
          status: 'COMPLETED',
          occurredAt: now,
          createdAt: now
        }
      ],
      `idemp_disb_${payoutRequestId}`
    );

    if (reservation) {
      reservation.status = 'DISBURSED';
      reservation.updatedAt = now;
    }

    request.status = 'COMPLETED';
    request.completedAt = now;
    request.updatedAt = now;

    await auditService.log({
      tenantId: request.tenantId,
      actorId: 'system',
      actorName: 'Payout Engine',
      actorRole: 'system',
      action: 'PAYOUT_COMPLETED',
      entityType: 'PayoutRequestPhase11',
      entityId: payoutRequestId,
      reason: `Payout #${payoutRequestId} settled via provider ${request.provider}`
    });

    return request;
  }

  /**
   * Handles payout failure and releases reserved balance cleanly.
   */
  async handlePayoutFailure(payoutRequestId: string, failureReason: string): Promise<PayoutRequestPhase11> {
    const request = this.requests.get(payoutRequestId);
    if (!request) throw new Error(`Payout request ${payoutRequestId} not found.`);

    const now = new Date().toISOString();

    // Release reservation back to owner account
    financialLedgerService.appendTransactionGroup(
      [
        {
          id: `fin_led_rel_${payoutRequestId}_reserve`,
          tenantId: request.tenantId,
          accountId: 'acc_payout_reserve',
          accountType: 'REFUND_RESERVE',
          direction: 'DEBIT',
          amountMinor: request.amountMinor,
          currency: request.currency,
          transactionType: 'HOLD_RELEASE',
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payoutRequestId,
          idempotencyKey: `idemp_rel_${payoutRequestId}`,
          status: 'COMPLETED',
          occurredAt: now,
          createdAt: now
        },
        {
          id: `fin_led_rel_${payoutRequestId}_owner`,
          tenantId: request.tenantId,
          accountId: `acc_${request.ownerId}`,
          accountType: request.ownerType === 'REPORTER' ? 'REPORTER' : 'SOURCE_ORGANIZATION',
          direction: 'CREDIT',
          amountMinor: request.amountMinor,
          currency: request.currency,
          transactionType: 'HOLD_RELEASE',
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payoutRequestId,
          idempotencyKey: `idemp_rel_${payoutRequestId}`,
          status: 'COMPLETED',
          occurredAt: now,
          createdAt: now
        }
      ],
      `idemp_rel_${payoutRequestId}`
    );

    if (request.ledgerReservationId) {
      const res = this.reservations.get(request.ledgerReservationId);
      if (res) {
        res.status = 'RELEASED';
        res.updatedAt = now;
      }
    }

    request.status = 'FAILED';
    request.failureReason = failureReason;
    request.updatedAt = now;

    await auditService.log({
      tenantId: request.tenantId,
      actorId: 'system',
      actorName: 'Payout Engine',
      actorRole: 'system',
      action: 'PAYOUT_FAILED',
      entityType: 'PayoutRequestPhase11',
      entityId: payoutRequestId,
      reason: `Payout #${payoutRequestId} failed: ${failureReason}`
    });

    return request;
  }

  /**
   * Process webhook / callback from payout provider with idempotency.
   */
  async handlePayoutWebhook(params: {
    providerEventId: string;
    providerPayoutId: string;
    eventType: string;
    payload: any;
  }): Promise<{ processed: boolean; duplicate: boolean }> {
    const { providerEventId, providerPayoutId, eventType } = params;

    if (this.webhookEventIds.has(providerEventId)) {
      return { processed: true, duplicate: true };
    }

    this.webhookEventIds.add(providerEventId);

    const request = Array.from(this.requests.values()).find(
      r => r.providerPayoutId === providerPayoutId || r.id === providerPayoutId
    );

    if (request) {
      if (eventType === 'PAYOUT_COMPLETED' || eventType === 'transfer.reversed') {
        await this.completePayout(request.id);
      } else if (eventType === 'PAYOUT_FAILED') {
        await this.handlePayoutFailure(request.id, params.payload?.reason || 'Provider webhook reported failure.');
      }
    }

    return { processed: true, duplicate: false };
  }

  getRequest(id: string): PayoutRequestPhase11 | undefined {
    return this.requests.get(id);
  }

  getRequestsForOwner(ownerId: string): PayoutRequestPhase11[] {
    return Array.from(this.requests.values()).filter(r => r.ownerId === ownerId);
  }

  getAllRequests(): PayoutRequestPhase11[] {
    return Array.from(this.requests.values()).reverse();
  }
}

export const payoutService = new PayoutService();
