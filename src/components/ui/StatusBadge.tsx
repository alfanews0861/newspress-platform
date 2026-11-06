/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Badge } from './Badge';

export interface StatusBadgeProps {
  status: string;
  type?: 'editorial' | 'edition' | 'production' | 'verification' | 'subscription' | 'generic';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let variant: 'default' | 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' = 'default';
  let formattedLabel = status.replace(/_/g, ' ');

  const s = status.toLowerCase();

  switch (s) {
    case 'published':
    case 'verified':
    case 'verified_original':
    case 'original_field_report':
    case 'active':
    case 'completed':
    case 'approved':
      variant = 'emerald';
      break;

    case 'first_recorded_submission':
    case 'first_recorded':
    case 'independent_report':
    case 'independently_reported':
    case 'submitted':
    case 'fact_checking':
    case 'queued':
    case 'queued_for_press':
    case 'preflight_check':
      variant = 'blue';
      break;

    case 'in_review':
    case 'planning':
    case 'layout_in_progress':
    case 'rasterizing':
    case 'trialing':
    case 'pending_review':
    case 'pending':
    case 'originality_check':
    case 'possible_duplicate':
      variant = 'amber';
      break;

    case 'editorial_lock':
    case 'finalized':
    case 'secondary_report':
    case 'secondary_source':
    case 'aggregated':
    case 'marketplace_listed':
      variant = 'purple';
      break;

    case 'rejected':
    case 'suspended':
    case 'duplicate_confirmed':
    case 'flagged_plagiarism':
    case 'disputed':
    case 'failed':
    case 'past_due':
      variant = 'rose';
      break;

    default:
      variant = 'default';
      break;
  }

  return (
    <Badge variant={variant} size="sm">
      <span className="capitalize">{formattedLabel}</span>
    </Badge>
  );
};
