// @ts-nocheck
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function enterpriseApiPlugin() {
  return {
    name: 'enterprise-api-plugin',
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
