/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppErrorOptions {
  code: string;
  message: string;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  originalError?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly context?: Record<string, unknown>;
  readonly originalError?: unknown;
  readonly timestamp: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.severity = options.severity || 'error';
    this.context = options.context;
    this.originalError = options.originalError;
    this.timestamp = new Date().toISOString();

    // Maintain prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code = 'AUTH_FAILED', context?: Record<string, unknown>, originalError?: unknown) {
    super({
      code,
      message,
      severity: 'error',
      context,
      originalError,
    });
    this.name = 'AuthError';
  }
}

export class PermissionDeniedError extends AppError {
  constructor(
    requiredPermission: string,
    actionDesc = 'perform this operation',
    context?: Record<string, unknown>
  ) {
    super({
      code: 'PERMISSION_DENIED',
      message: `Access Denied: Missing '${requiredPermission}' permission to ${actionDesc}.`,
      severity: 'warning',
      context: { requiredPermission, actionDesc, ...context },
    });
    this.name = 'PermissionDeniedError';
  }
}

export class TenantNotFoundError extends AppError {
  constructor(tenantId: string) {
    super({
      code: 'TENANT_NOT_FOUND',
      message: `Tenant organization '${tenantId}' was not found or is currently inaccessible.`,
      severity: 'error',
      context: { tenantId },
    });
    this.name = 'TenantNotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super({
      code: 'VALIDATION_FAILED',
      message,
      severity: 'warning',
      context: { fieldErrors },
    });
    this.name = 'ValidationError';
  }
}

export class FirestoreOperationError extends AppError {
  constructor(operation: string, collection: string, originalError?: unknown) {
    super({
      code: 'FIRESTORE_ERROR',
      message: `Failed to execute ${operation} on collection '${collection}'.`,
      severity: 'error',
      context: { operation, collection },
      originalError,
    });
    this.name = 'FirestoreOperationError';
  }
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected system error occurred. Please verify your connection or contact platform support.';
}
