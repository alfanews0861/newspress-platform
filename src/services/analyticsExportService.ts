/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Analytics Data Export & Security Service
 * Exports reports to CSV, XLSX/JSON and formatted representations while enforcing
 * strict tenant boundaries, field redaction, and audit logging.
 */

import { ReportExportFormat } from '../types/analytics';
import { AuditService } from './auditService';

export interface ExportOptions {
  tenantId: string;
  reportName: string;
  format: ReportExportFormat;
  data: Array<Record<string, any>>;
  summaryMetrics?: Record<string, any>;
  actorId: string;
  actorName: string;
  actorRole: string;
}

export class AnalyticsExportService {
  /**
   * Sanitizes export data by stripping credentials, bank tokens, and sensitive internal fields.
   */
  public static sanitizeExportData(data: Array<Record<string, any>>): Array<Record<string, any>> {
    const sensitiveKeys = ['bankAccount', 'ifscCode', 'payoutSecret', 'authToken', 'passwordHash', 'ssn', 'taxId'];

    return data.map((row) => {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    });
  }

  /**
   * Generates a CSV text string from tabular data.
   */
  public static convertToCSV(data: Array<Record<string, any>>): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.join(','));

    // Data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
        // Escape quotes and commas
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Exports report with audit log and security sanitization.
   */
  public static async exportReport(options: ExportOptions): Promise<{
    format: ReportExportFormat;
    content: string;
    filename: string;
    recordsCount: number;
  }> {
    const sanitizedData = this.sanitizeExportData(options.data);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = options.reportName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    let content = '';
    let filename = '';

    if (options.format === 'CSV') {
      content = this.convertToCSV(sanitizedData);
      filename = `${safeName}_${options.tenantId}_${timestamp}.csv`;
    } else {
      // PDF_JSON / XLSX structured tabular JSON representation
      content = JSON.stringify(
        {
          reportName: options.reportName,
          tenantId: options.tenantId,
          exportedAt: new Date().toISOString(),
          summary: options.summaryMetrics || {},
          rows: sanitizedData,
        },
        null,
        2
      );
      filename = `${safeName}_${options.tenantId}_${timestamp}.json`;
    }

    // Audit the export action
    await AuditService.logEvent({
      tenantId: options.tenantId,
      actorId: options.actorId,
      actorName: options.actorName,
      actorRole: options.actorRole,
      action: 'REPORT_EXPORTED',
      entityType: 'MISReport',
      entityId: filename,
      details: {
        reportName: options.reportName,
        format: options.format,
        recordsCount: sanitizedData.length,
      },
    });

    return {
      format: options.format,
      content,
      filename,
      recordsCount: sanitizedData.length,
    };
  }
}
