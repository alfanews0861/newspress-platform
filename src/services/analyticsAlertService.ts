/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Executive Alerts & Deterministic Anomaly Service
 * Generates transparent alerts and flags statistical anomalies using
 * deterministic thresholds without black-box ML scoring.
 */

import {
  AnalyticsAlert,
  AlertSeverity,
  DeterministicAnomaly,
} from '../types/analytics';

export class AnalyticsAlertService {
  private static alerts: Map<string, AnalyticsAlert> = new Map();

  static {
    this.seedDefaultAlerts();
  }

  public static reset(): void {
    this.alerts.clear();
    this.seedDefaultAlerts();
  }

  private static seedDefaultAlerts(): void {
    const now = new Date().toISOString();
    const defaults: AnalyticsAlert[] = [
      {
        alertId: 'alt-vendor-delay-01',
        tenantId: 'tenant-metro-chronicle',
        metric: 'prd_vendor_ack_time_minutes',
        severity: 'WARNING',
        threshold: 20.0,
        currentValue: 24.5,
        previousValue: 8.0,
        percentageChange: 206.2,
        reason: 'Vendor acknowledgement exceeded SLA threshold of 20.0 minutes (current: 24.5 min).',
        timestamp: now,
        resolved: false,
      },
      {
        alertId: 'alt-plan-limit-02',
        tenantId: 'tenant-metro-chronicle',
        metric: 'edt_edition_quota_utilization',
        severity: 'INFO',
        threshold: 85.0,
        currentValue: 88.0,
        previousValue: 75.0,
        percentageChange: 17.3,
        reason: 'Monthly newspaper edition quota approaching plan ceiling (88% used).',
        timestamp: now,
        resolved: false,
      },
    ];

    for (const a of defaults) {
      this.alerts.set(a.alertId, a);
    }
  }

  /**
   * Registers a deterministic alert with full causality parameters.
   */
  public static createAlert(params: {
    tenantId?: string;
    metric: string;
    severity: AlertSeverity;
    threshold: number;
    currentValue: number;
    previousValue: number;
    reason: string;
  }): AnalyticsAlert {
    const alertId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const percentageChange = params.previousValue > 0
      ? Math.round(((params.currentValue - params.previousValue) / params.previousValue) * 100 * 10) / 10
      : 0;

    const alert: AnalyticsAlert = {
      alertId,
      tenantId: params.tenantId,
      metric: params.metric,
      severity: params.severity,
      threshold: params.threshold,
      currentValue: params.currentValue,
      previousValue: params.previousValue,
      percentageChange,
      reason: params.reason,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Scans system operational metrics for deterministic anomalies.
   */
  public static scanAnomalies(tenantId?: string): DeterministicAnomaly[] {
    const anomalies: DeterministicAnomaly[] = [];
    const now = new Date().toISOString();

    // Check existing alerts to surface active anomalies
    const activeAlerts = this.getAlerts(tenantId, true);
    for (const a of activeAlerts) {
      anomalies.push({
        anomalyId: `ano-${a.alertId}`,
        tenantId: a.tenantId,
        metric: a.metric,
        baselineValue: a.previousValue,
        observedValue: a.currentValue,
        deviationPercent: a.percentageChange || 0,
        ruleTriggered: a.reason,
        severity: a.severity,
        detectedAt: a.timestamp || now,
      });
    }

    return anomalies;
  }

  /**
   * Retrieves alerts filtered by tenant and resolution status.
   */
  public static getAlerts(tenantId?: string, unresolvedOnly: boolean = false): AnalyticsAlert[] {
    let list = Array.from(this.alerts.values());
    if (tenantId) {
      list = list.filter((a) => !a.tenantId || a.tenantId === tenantId);
    }
    if (unresolvedOnly) {
      list = list.filter((a) => !a.resolved);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Resolves an alert.
   */
  public static resolveAlert(alertId: string, resolvedBy: string): AnalyticsAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert #${alertId} not found.`);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = resolvedBy;
    this.alerts.set(alertId, alert);
    return alert;
  }
}
