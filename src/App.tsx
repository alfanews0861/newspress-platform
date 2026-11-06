/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TenantProvider } from './features/tenants/TenantContext';
import { AuthProvider } from './features/auth/AuthContext';
import { AppContent } from './app/AppContent';

export default function App() {
  return (
    <TenantProvider>
      {(activeTenantId) => (
        <AuthProvider activeTenantId={activeTenantId}>
          <AppContent />
        </AuthProvider>
      )}
    </TenantProvider>
  );
}

