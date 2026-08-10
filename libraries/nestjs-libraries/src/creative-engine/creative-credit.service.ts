import { Injectable } from '@nestjs/common';
import { CreditAccountingService } from '@gitroom/nestjs-libraries/services/credit-accounting.service';

/**
 * Compatibility facade for the creative engine. The engine keeps its existing
 * reservation API while the financial source of truth is now the v2 lot/ledger
 * implementation.
 */
@Injectable()
export class CreativeCreditService {
  constructor(private readonly accounting: CreditAccountingService) {}

  ensureInitialGrant(organizationId: string) {
    return this.accounting.ensureAccount(organizationId);
  }

  getBalance(organizationId: string) {
    return this.accounting.getBalance(organizationId);
  }

  reserve(organizationId: string, credits: number, details: {
    projectId?: string;
    jobId?: string;
    workflowRunId?: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.accounting.reserve(organizationId, credits, {
      jobId: details.jobId,
      workflowRunId: details.workflowRunId,
      idempotencyKey: details.idempotencyKey,
      operation: String(details.metadata?.operation || details.metadata?.tool || 'creative'),
      provider: details.metadata?.provider ? String(details.metadata.provider) : undefined,
      model: details.metadata?.model ? String(details.metadata.model) : undefined,
      metadata: { projectId: details.projectId, ...(details.metadata || {}) },
    });
  }

  assertConcurrencyQuota(organizationId: string) {
    return this.accounting.assertConcurrencyQuota(organizationId);
  }

  settle(reservationId: string, actualCredits?: number) {
    return this.accounting.settle(reservationId, actualCredits);
  }

  refund(reservationId: string, reason: string) {
    return this.accounting.refund(reservationId, reason);
  }

  list(organizationId: string, limit = 100) {
    return this.accounting.list(organizationId, limit);
  }

  reconcile(organizationId: string) {
    return this.accounting.reconcile(organizationId);
  }
}
