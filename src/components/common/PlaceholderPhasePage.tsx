/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, ShieldCheck, ArrowRight, Database, Code2 } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { BreadcrumbItem } from '../ui/Breadcrumb';

export interface PlannedFeature {
  title: string;
  description: string;
}

export interface PlaceholderPhasePageProps {
  title: string;
  subtitle: string;
  breadcrumbs: BreadcrumbItem[];
  plannedPhase: string;
  requiredPermission?: string;
  firestoreCollection?: string;
  architectureNotes: string;
  plannedFeatures: PlannedFeature[];
}

export const PlaceholderPhasePage: React.FC<PlaceholderPhasePageProps> = ({
  title,
  subtitle,
  breadcrumbs,
  plannedPhase,
  requiredPermission,
  firestoreCollection,
  architectureNotes,
  plannedFeatures,
}) => {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        badge={
          <Badge variant="amber" size="sm">
            {plannedPhase}
          </Badge>
        }
      />

      {/* Architectural Architecture Box */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-serif">
                Phase Integration Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Foundation data models, RBAC rules, and TypeScript contracts established in Phase 1.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {requiredPermission && (
              <Badge variant="purple" size="sm">
                RBAC Gate: {requiredPermission}
              </Badge>
            )}
            {firestoreCollection && (
              <Badge variant="blue" size="sm">
                Collection: {firestoreCollection}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          {architectureNotes}
        </p>
      </div>

      {/* Planned Capabilities Grid */}
      <div>
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Planned Deliverables & Domain Modules for Next Phases
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plannedFeatures.map((feat, idx) => (
            <Card key={idx} variant="bordered" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-amber-400">
                    0{idx + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-200 font-serif">{feat.title}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-850 flex items-center gap-1.5 text-[11px] font-mono text-amber-400/90">
                <Code2 className="w-3.5 h-3.5" />
                <span>Architecture Contract Defined</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
