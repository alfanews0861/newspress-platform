/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Developer Portal — OpenAPI 3.0 Reference & SDK Explorer
 * Phase 15 Implementation
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Code2,
  Copy,
  Check,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { OpenApiSpecService } from '../../services/openapiSpecService';

interface EndpointDoc {
  id: string;
  module: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  requiredScopes: string[];
  parameters?: Array<{ name: string; in: string; required?: boolean; description: string }>;
  requestSample?: any;
  responseSample: any;
}

const DOCUMENTED_ENDPOINTS: EndpointDoc[] = [
  // Tenant
  {
    id: 'get-tenant',
    module: 'Identity & Tenant',
    method: 'GET',
    path: '/tenant',
    summary: 'Get Tenant Organization Details',
    description: 'Retrieves authenticated tenant organization metadata, timezone, and subscription tier.',
    requiredScopes: ['tenant:read'],
    responseSample: {
      data: {
        tenantId: 'tenant-metro-chronicle',
        organizationName: 'Metro Chronicle Media Group',
        subscriptionPlan: 'newsroom_enterprise',
        status: 'active',
        editionTimezone: 'America/New_York',
      },
      requestId: 'req_1728710400_abc1',
    },
  },
  {
    id: 'get-integration-me',
    module: 'Identity & Tenant',
    method: 'GET',
    path: '/integration/me',
    summary: 'Get Integration Context & Scopes',
    description: 'Returns identity of caller, authenticated application, active environment, and granted scopes.',
    requiredScopes: ['tenant:read'],
    responseSample: {
      data: {
        keyId: 'keymetro01',
        appId: 'app_metro_live_01',
        tenantId: 'tenant-metro-chronicle',
        environment: 'LIVE',
        scopes: ['news:read', 'news:submit', 'marketplace:listings:read'],
        rateLimitTier: 'ENTERPRISE',
      },
      requestId: 'req_1728710400_abc2',
    },
  },

  // Newsroom
  {
    id: 'list-news',
    module: 'Newsroom',
    method: 'GET',
    path: '/news',
    summary: 'List Published & Dispatched News',
    description: 'Query articles approved or dispatched within the tenant newsroom.',
    requiredScopes: ['news:read'],
    parameters: [
      { name: 'status', in: 'query', description: 'Filter by editorial status (e.g. approved, submitted)' },
      { name: 'category', in: 'query', description: 'Filter by news category/beat' },
    ],
    responseSample: {
      data: [
        {
          articleId: 'art-001',
          headline: 'City Approves Modernized High-Speed Rail Transit Hub',
          editorialStatus: 'approved',
          category: 'Transit',
          byline: 'Sofia Chen',
          wordCount: 840,
        },
      ],
      pagination: { page: 1, pageSize: 20, totalCount: 1, hasMore: false },
      requestId: 'req_1728710400_abc3',
    },
  },
  {
    id: 'post-news-submissions',
    module: 'Newsroom',
    method: 'POST',
    path: '/news/submissions',
    summary: 'Submit Story for Editorial Review',
    description: 'Enters a field reporter dispatch into the Phase 2/8 originality engine and editorial queue. Supports Idempotency-Key header.',
    requiredScopes: ['news:submit'],
    requestSample: {
      headline: 'State Transit Commission Authorizes Grand Central Upgrades',
      subheadline: 'Signal testing clears final commuter safety inspection.',
      body: 'State transit commissioners voted unanimously this morning to fund the computerized signaling replacement across all express stations.',
      category: 'Transit',
      authorId: 'rep_sofia_chen',
      evidence: [
        { type: 'photo', title: 'Signals Control Room Diagnostic Display' },
      ],
    },
    responseSample: {
      data: {
        articleId: 'art_1728710400_9912',
        headline: 'State Transit Commission Authorizes Grand Central Upgrades',
        editorialStatus: 'submitted',
        originalityStatus: 'ORIGINAL_FIELD_REPORT',
        originalityScore: 98,
        createdAt: '2026-10-12T03:30:00Z',
      },
      requestId: 'req_1728710400_abc4',
    },
  },

  // Marketplace
  {
    id: 'list-marketplace-listings',
    module: 'Marketplace & Licenses',
    method: 'GET',
    path: '/marketplace/listings',
    summary: 'Browse Syndicated Wire Listings',
    description: 'List active, editorially verified wire stories available for publisher syndication purchase.',
    requiredScopes: ['marketplace:listings:read'],
    responseSample: {
      data: [
        {
          listingId: 'mkt-standard-01',
          title: 'Nellore Coastal Desalination Plant Operational Clearance',
          price: 250,
          currency: 'INR',
          status: 'ACTIVE',
          reporterName: 'David K. Okafor',
          originalityStatus: 'ORIGINAL_FIELD_REPORT',
        },
      ],
      requestId: 'req_1728710400_abc5',
    },
  },

  // Editions
  {
    id: 'list-editions',
    module: 'Editions & Production',
    method: 'GET',
    path: '/editions',
    summary: 'List Newspaper Editions',
    description: 'Retrieves scheduled print/digital editions, deadlines, page budgets, and readiness scores.',
    requiredScopes: ['editions:read'],
    responseSample: {
      data: [
        {
          editionId: 'ed_metro_20261012',
          editionDate: '2026-10-12',
          status: 'OPEN',
          pageCount: 16,
          editionType: 'daily',
        },
      ],
      requestId: 'req_1728710400_abc6',
    },
  },

  // Analytics
  {
    id: 'get-analytics-summary',
    module: 'Analytics & Reports',
    method: 'GET',
    path: '/analytics/summary',
    summary: 'Get Tenant Executive Summary',
    description: 'Aggregates tenant-wide editorial turnaround, newsroom velocity, and marketplace figures.',
    requiredScopes: ['analytics:read'],
    responseSample: {
      data: {
        tenantId: 'tenant-metro-chronicle',
        newsroom: { submissionsCount: 48, turnaroundHours: 3.2 },
        marketplace: { purchasesCount: 14, grossVolumeINR: 3500 },
      },
      requestId: 'req_1728710400_abc7',
    },
  },

  // Finance
  {
    id: 'get-finance-summary',
    module: 'Financial Status',
    method: 'GET',
    path: '/finance/summary',
    summary: 'Get Authorized Financial Summary',
    description: 'Surfaces high-level marketplace volume, royalties, and payable balances for the tenant.',
    requiredScopes: ['finance:read'],
    responseSample: {
      data: {
        tenantId: 'tenant-metro-chronicle',
        currency: 'INR',
        grossMarketplaceRevenueMinor: 450000,
        platformRevenueMinor: 90000,
        reporterShareMinor: 360000,
        availablePayableBalanceINR: 284000,
      },
      requestId: 'req_1728710400_abc8',
    },
  },
];

export const ApiDocumentationPage: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(DOCUMENTED_ENDPOINTS[0]);
  const [selectedTab, setSelectedTab] = useState<'response' | 'curl' | 'typescript' | 'python'>('response');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const spec = OpenApiSpecService.getSpec();
  const examples = OpenApiSpecService.getCodeExamples(selectedEndpoint.path, selectedEndpoint.method);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleDownloadSpec = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newspress-openapi-v1.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Enterprise API Reference & Documentation"
        subtitle="Versioned RESTful endpoints (/api/v1), scoped API authorization, and HMAC webhook signature verification."
        actions={
          <Button variant="outline" onClick={handleDownloadSpec}>
            <Download className="w-4 h-4 mr-2" />
            Download OpenAPI 3.0 (JSON)
          </Button>
        }
      />

      {/* Security and Compatibility Callout */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-300 space-y-1">
            <span className="font-bold text-white block">API Versioning & Deprecation Policy</span>
            <span>
              All endpoints reside under <code className="text-indigo-300 font-mono">/api/v1</code>. Breaking changes increment the major version with a minimum 6-month migration notice.
            </span>
          </div>
        </div>
        <Badge variant="blue">v1.0.0 Stable</Badge>
      </div>

      {/* Documentation Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <Card className="p-3 bg-slate-900/80 border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-2 py-1 mb-2">
              Endpoints Catalog
            </span>
            <div className="space-y-1">
              {DOCUMENTED_ENDPOINTS.map((doc) => {
                const isSelected = selectedEndpoint.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedEndpoint(doc);
                      setSelectedTab('response');
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-xs transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 text-white font-medium border border-indigo-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          doc.method === 'GET'
                            ? 'bg-blue-950 text-blue-300'
                            : 'bg-emerald-950 text-emerald-300'
                        }`}
                      >
                        {doc.method}
                      </span>
                      <span className="truncate">{doc.summary}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Endpoint Details & Interactive Code Samples */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-sm font-bold text-white">/api/v1{selectedEndpoint.path}</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-2">{selectedEndpoint.summary}</h2>
              <p className="text-sm text-slate-300 mt-1">{selectedEndpoint.description}</p>
            </div>

            {/* Scope Requirements */}
            <div className="pt-3 border-t border-slate-800/60 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Required Scopes:</span>
              <div className="flex gap-1.5">
                {selectedEndpoint.requiredScopes.map((scope) => (
                  <code key={scope} className="text-xs font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                    {scope}
                  </code>
                ))}
              </div>
            </div>

            {/* Request Sample (if POST) */}
            {selectedEndpoint.requestSample && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase block mb-1.5">
                  Request Payload (JSON)
                </span>
                <pre className="p-4 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto">
                  {JSON.stringify(selectedEndpoint.requestSample, null, 2)}
                </pre>
              </div>
            )}

            {/* Code Examples Tabs */}
            <div className="space-y-2">
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setSelectedTab('response')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    selectedTab === 'response'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Response Schema (200 OK)
                </button>
                <button
                  onClick={() => setSelectedTab('curl')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    selectedTab === 'curl'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setSelectedTab('typescript')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    selectedTab === 'typescript'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TypeScript / Node
                </button>
                <button
                  onClick={() => setSelectedTab('python')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    selectedTab === 'python'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Webhook HMAC (Python)
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    const content =
                      selectedTab === 'response'
                        ? JSON.stringify(selectedEndpoint.responseSample, null, 2)
                        : selectedTab === 'curl'
                        ? examples.curl
                        : selectedTab === 'typescript'
                        ? examples.typescript
                        : examples.pythonSignatureVerification;
                    handleCopy(content);
                  }}
                  className="absolute top-3 right-3 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1 border border-slate-700"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSnippet ? 'Copied' : 'Copy'}
                </button>

                <pre className="p-4 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto min-h-[140px]">
                  {selectedTab === 'response' && JSON.stringify(selectedEndpoint.responseSample, null, 2)}
                  {selectedTab === 'curl' && examples.curl}
                  {selectedTab === 'typescript' && examples.typescript}
                  {selectedTab === 'python' && examples.pythonSignatureVerification}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
