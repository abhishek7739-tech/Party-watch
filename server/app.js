import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createApp() {
  const app = express();
  const clientBuild = path.join(__dirname, '..', 'dist');
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  app.use(express.static(clientBuild));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
  return app;
}

export { createApp };
