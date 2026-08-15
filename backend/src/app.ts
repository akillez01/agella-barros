import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { adminRouter } from './routes/admin';
import { aiRouter } from './routes/ai.routes';
import { bookingsRouter } from './routes/bookings.routes';
import { catalogRouter } from './routes/catalog.routes';
import { ordersRouter } from './routes/orders.routes';
import { paymentsRouter } from './routes/payments.routes';
import { webhooksRouter } from './routes/webhooks.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  // Mídia enviada pelo painel admin (disco local, sem S3) — servida estática.
  app.use('/uploads', express.static(env.UPLOAD_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/bookings', bookingsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api', ordersRouter);
  app.use('/api', paymentsRouter);
  app.use('/api', webhooksRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', catalogRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Não encontrado' }));

  return app;
}
