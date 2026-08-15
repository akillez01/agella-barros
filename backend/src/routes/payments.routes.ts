import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { pool } from '../db';

export const paymentsRouter = Router();

const pixSchema = z.object({
  orderId: z.string().uuid(),
  pix: z
    .object({
      key: z.string().trim().optional(),
      merchant: z.string().trim().optional(),
      city: z.string().trim().optional(),
    })
    .optional(),
});

const cardSchema = z.object({
  orderId: z.string().uuid(),
  installments: z.number().int().min(1).max(24).default(1),
  card: z.object({
    number: z.string().min(13),
    holder: z.string().trim().min(3),
    cvv: z.string().min(3).max(4),
    exp: z.string().min(4),
  }),
});

function sanitize(s: string, max: number) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max);
}

function emv(id: string, v: string) {
  return id + String(v.length).padStart(2, '0') + v;
}

function crc16(str: string) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? (((crc << 1) ^ 0x1021) & 0xffff) : ((crc << 1) & 0xffff);
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function pixPayload(opts: { key: string; merchant: string; city: string; amount: number; txid: string }) {
  const account = emv('00', 'BR.GOV.BCB.PIX') + emv('01', opts.key.trim());
  let p = emv('00', '01') + emv('01', '11') + emv('26', account) + emv('52', '0000') + emv('53', '986');
  if (opts.amount > 0) p += emv('54', opts.amount.toFixed(2));
  p += emv('58', 'BR') + emv('59', sanitize(opts.merchant, 25) || 'STUDIO') + emv('60', sanitize(opts.city, 15) || 'PARINTINS');
  p += emv('62', emv('05', (opts.txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'));
  p += '6304';
  return p + crc16(p);
}

function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}

function luhn(num: string) {
  const d = onlyDigits(num);
  if (d.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

paymentsRouter.post('/payments/pix', async (req, res) => {
  const parsed = pixSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalido', issues: parsed.error.issues });
  }

  const { orderId, pix } = parsed.data;
  const { rows } = await pool.query('SELECT id, code, total_cents, status FROM orders WHERE id = $1 LIMIT 1', [orderId]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Pedido nao encontrado' });
  if (order.status !== 'aguardando') return res.status(409).json({ error: `Pedido esta em status ${order.status}` });

  const key = pix?.key || env.PIX_KEY;
  const merchant = pix?.merchant || env.PIX_MERCHANT;
  const city = pix?.city || env.PIX_CITY;
  if (!key) return res.status(400).json({ error: 'Chave Pix nao configurada' });

  const payload = pixPayload({
    key,
    merchant,
    city,
    amount: Number(order.total_cents) / 100,
    txid: String(order.code),
  });

  const { rows: payRows } = await pool.query(
    `INSERT INTO payments (order_id, method, provider, amount_cents, installments, status, pix_payload, pix_txid, pix_expires_at)
     VALUES ($1, 'pix', 'manual', $2, 1, 'pendente', $3, $4, now() + ($5 || ' minutes')::interval)
     RETURNING id, status, pix_payload, pix_txid, pix_expires_at`,
    [order.id, order.total_cents, payload, order.code, String(Math.max(1, env.PIX_EXPIRES_MINUTES))]
  );

  return res.status(201).json({
    payment: {
      id: payRows[0].id,
      method: 'pix',
      status: payRows[0].status,
      payload: payRows[0].pix_payload,
      txid: payRows[0].pix_txid,
      expiresAt: payRows[0].pix_expires_at,
      amountCents: order.total_cents,
    },
  });
});

paymentsRouter.post('/payments/card', async (req, res) => {
  const parsed = cardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalido', issues: parsed.error.issues });
  }

  const d = parsed.data;
  const { rows } = await pool.query('SELECT id, total_cents, status FROM orders WHERE id = $1 LIMIT 1', [d.orderId]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Pedido nao encontrado' });
  if (order.status !== 'aguardando') return res.status(409).json({ error: `Pedido esta em status ${order.status}` });

  if (!luhn(d.card.number)) return res.status(400).json({ error: 'Numero do cartao invalido' });

  const approved = env.CARD_MANUAL_AUTO_APPROVE;
  const status = approved ? 'aprovado' : 'pendente';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: payRows } = await client.query(
      `INSERT INTO payments (
         order_id, method, provider, amount_cents, installments, status,
         card_last4, card_holder, raw_response, paid_at
       ) VALUES (
         $1, 'credito', 'manual', $2, $3, $4,
         $5, $6, $7::jsonb, $8
       ) RETURNING id, status, installments, card_last4, created_at`,
      [
        order.id,
        order.total_cents,
        d.installments,
        status,
        onlyDigits(d.card.number).slice(-4),
        d.card.holder,
        JSON.stringify({ mode: 'manual', note: approved ? 'auto-approved' : 'pending-manual-review' }),
        approved ? new Date().toISOString() : null,
      ]
    );

    if (approved) {
      await client.query(
        `UPDATE orders
         SET status = 'pago', paid_at = now(), updated_at = now()
         WHERE id = $1`,
        [order.id]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      payment: {
        id: payRows[0].id,
        method: 'cartao',
        status: payRows[0].status,
        installments: payRows[0].installments,
        cardLast4: payRows[0].card_last4,
        amountCents: order.total_cents,
      },
      order: {
        id: order.id,
        status: approved ? 'pago' : 'aguardando',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao processar pagamento cartao:', err);
    return res.status(500).json({ error: 'Falha ao processar pagamento' });
  } finally {
    client.release();
  }
});
