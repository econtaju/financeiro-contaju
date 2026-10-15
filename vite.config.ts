import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function devApiServerlessPlugin(): Plugin {
  return {
    name: 'dev-api-serverless',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, 'http://localhost:3000');

        // Decorador de resposta compatível com Vercel Serverless
        const decorateRes = (targetRes: any) => {
          if (!targetRes.status) {
            targetRes.status = function(code: number) {
              this.statusCode = code;
              return this;
            };
          }
          if (!targetRes.json) {
            targetRes.json = function(data: any) {
              this.setHeader('Content-Type', 'application/json');
              this.end(JSON.stringify(data));
              return this;
            };
          }
        };

        if (url.pathname === '/api/ai-models') {
          try {
            decorateRes(res);
            const mod = await import('./api/ai-models.js');
            const query: Record<string, string> = {};
            url.searchParams.forEach((v, k) => { query[k] = v; });
            (req as any).query = query;
            return await mod.default(req, res);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        if (url.pathname === '/api/agents') {
          try {
            decorateRes(res);
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const rawBody = Buffer.concat(buffers).toString();
            try {
              (req as any).body = rawBody ? JSON.parse(rawBody) : {};
            } catch {
              (req as any).body = {};
            }
            const mod = await import('./api/agents.js');
            return await mod.default(req, res);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devApiServerlessPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

