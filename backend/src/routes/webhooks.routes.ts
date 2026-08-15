import { Router } from 'express';
import { env } from '../config/env';
import { pool } from '../db';

export const webhooksRouter = Router();

webhooksRouter.post('/webhooks/:provider', async (req, res) => {
  const provider = String(req.params.provider || '').trim().toLowerCase();
  if (!provider) return res.status(400).json({ error: 'Provider obrigatorio' });

  if (env.WEBHOOK_SECRET) {
    const incoming = req.header('x-webhook-secret');
    if (incoming !== env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Webhook nao autorizado' });
    }
  }

  const payload = req.body ?? {};
  const eventId = String(payload.id || payload.event_id || payload.data?.id || `${provider}-${Date.now()}`);
  const eventType = String(payload.type || payload.action || 'unknown');

  try {
    await pool.query(
      `INSERT INTO payment_webhooks (provider, event_id, event_type, payload, processed_at)
       VALUES ($1, $2, $3, $4::jsonb, now())
       ON CONFLICT (provider, event_id) DO NOTHING`,
      [provider, eventId, eventType, JSON.stringify(payload)]
    );

    // Sprint 1: log e idempotencia. A conciliacao automatica com provider
    // sera ligada no proximo passo quando o gateway estiver configurado.
    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao registrar webhook:', err);
    return res.status(500).json({ error: 'Falha ao processar webhook' });
  }
});
