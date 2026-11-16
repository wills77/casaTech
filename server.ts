import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { initSchema } from './server/db.ts';
import { apiRouter } from './server/routes.ts';
import { seedDatabase } from './server/seed.ts';

dotenv.config();

// Initialize SQLite database schema and seed initial data
initSchema();
seedDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Mount API routes
app.use('/api', apiRouter);

// Serve static assets or Vite middleware
if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Build introuvable. Exécutez npm run build.');
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CasaTech server listening on http://0.0.0.0:${PORT}`);
});
