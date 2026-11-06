/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Reporter & Newsroom Wallet Page
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ReporterWalletUI } from '../../components/finance/ReporterWalletUI';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_REPORTER_PROFILES } from '../../services/mockDataService';

export const WalletPage: React.FC = () => {
  const { user } = useAuth();

  const reporterProfile =
    MOCK_REPORTER_PROFILES.find((r) => r.userId === user?.uid) ||
    MOCK_REPORTER_PROFILES.find((r) => r.reporterId === 'rep-david-okafor') ||
    MOCK_REPORTER_PROFILES[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporter Royalty Ledger & Settlement Wallet"
        subtitle={`Server-authoritative financial ledger, available payable balance, 7-day settlement hold, and payout eligibility for ${reporterProfile.byline}.`}
        breadcrumbs={[
          { label: 'Finance', href: '#' },
          { label: 'Wallet' },
        ]}
      />

      <ReporterWalletUI
        reporterId={reporterProfile.reporterId}
        reporterName={reporterProfile.byline}
        tenantId={reporterProfile.tenantId}
      />
    </div>
  );
};
