// @ts-nocheck
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

const SPA_STATIC_ROUTES = [
  'login',
  'landing',
  'legal',
  'privacy',
  'terms',
  'editorial-policy',
  'grievance',
  'cookies',
  'marketplace-terms',
  'dashboard',
  'overview',
  'invite',
  'settings',
  'mobile',
  'analytics',
  'analytics/executive',
  'analytics/reports',
  'newsroom/news',
  'newsroom/youtube-studio',
  'newsroom/submissions',
  'newsroom/reporters',
  'newsroom/editorial-queue',
  'newsroom/desk',
  'newsroom/assignments',
  'newsroom/reporter-dashboard',
  'newsroom/staff',
  'newsroom/reporter-profile',
  'newsroom/desks',
  'newsroom/beats',
  'newspaper/calendar',
  'newspaper/edition-planning',
  'newspaper/front-page',
  'newspaper/readiness',
  'newspaper/review',
  'newspaper/editions',
  'newspaper/page-designer',
  'newspaper/templates',
  'newspaper/brands',
  'marketplace',
  'marketplace/wire',
  'marketplace/search',
  'marketplace/licensed',
  'marketplace/purchased',
  'marketplace/purchases',
  'marketplace/licenses',
  'marketplace/listings',
  'marketplace/admin',
  'marketplace/analytics',
  'production/operations',
  'production/detail',
  'production/vendors',
  'production/regions',
  'production/finalized',
  'production/queue',
  'production/downloads',
  'finance/billing',
  'finance/wallet',
  'finance/transactions',
  'finance/earnings',
  'finance/payouts',
  'admin/billing',
  'admin/analytics/executive',
  'admin/platform',
  'admin/support',
  'admin/readiness',
  'admin/docs',
  'developer',
  'developer/apps',
  'developer/api-keys',
  'developer/webhooks',
  'developer/webhook-deliveries',
  'developer/api-usage',
  'developer/docs',
  'operations',
  'operations/reliability',
  'operations/threats',
  'operations/dr',
  'operations/runbooks',
  'operations/integrity',
];

function enterpriseApiPlugin() {
  return {
    name: 'enterprise-api-plugin',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        const indexHtmlPath = path.join(distDir, 'index.html');
        if (!fs.existsSync(indexHtmlPath)) return;
        const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
        fs.writeFileSync(path.join(distDir, '404.html'), htmlContent, 'utf-8');
        for (const route of SPA_STATIC_ROUTES) {
          const routeDir = path.join(distDir, route);
          fs.mkdirSync(routeDir, { recursive: true });
          fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent, 'utf-8');
        }
      } catch (e) {
        console.warn('Could not generate static SPA route copies:', e);
      }
    },
    configureServer(server) {
      server.middlewares.use('/api/v1', async (req, res, next) => {
        try {
          let bodyData = undefined;
          if (['POST', 'PUT', 'PATCH'].includes(req.method?.toUpperCase() || '')) {
            const chunks = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            if (rawBody) {
              try {
                bodyData = JSON.parse(rawBody);
              } catch {
                bodyData = rawBody;
              }
            }
          }

          const parsedUrl = new URL(req.url || '/', 'http://localhost');
          const queryParams = {};
          parsedUrl.searchParams.forEach((val, key) => {
            queryParams[key] = val;
          });

          const { enterpriseApiService } = await import('./src/services/enterpriseApiService');
          const response = await enterpriseApiService.dispatch({
            method: (req.method || 'GET').toUpperCase(),
            path: `/api/v1${parsedUrl.pathname}`,
            headers: req.headers,
            query: queryParams,
            body: bodyData,
            ipAddress: req.socket?.remoteAddress,
          });

          res.statusCode = response.statusCode;
          for (const [k, v] of Object.entries(response.headers)) {
            res.setHeader(k, v);
          }
          res.end(typeof response.body === 'string' ? response.body : JSON.stringify(response.body));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), enterpriseApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'crypto': path.resolve(__dirname, 'src/utils/cryptoShim.ts'),
      },
    },
    define: {
      'process.env': {},
      global: 'globalThis',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
