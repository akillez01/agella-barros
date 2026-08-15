import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';

export const adminBookingsRouter = Router();

const ROW_SELECT = `
  SELECT id, code,
         customer_name AS client, customer_phone AS phone, notes AS note,
         service_name AS service, specialist_name AS pro,
         to_char(starts_at AT TIME ZONE 'America/Manaus', 'YYYY-MM-DD') AS date,
         to_char(starts_at AT TIME ZONE 'America/Manaus', 'HH24:MI') AS time,
         price_cents, status, channel AS via, created_at
  FROM bookings
`;

adminBookingsRouter.get('/', async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const { rows } = await pool.query(
    status
      ? `${ROW_SELECT} WHERE status = $1 ORDER BY starts_at DESC LIMIT 300`
      : `${ROW_SELECT} ORDER BY starts_at DESC LIMIT 300`,
    status ? [status] : []
  );
  res.json({ bookings: rows.map((r) => ({ ...r, price: r.price_cents / 100, price_cents: undefined })) });
});

const STATUSES = ['pendente', 'confirmado', 'concluido', 'cancelado', 'faltou'] as const;
const patchSchema = z.object({ status: z.enum(STATUSES) });

adminBookingsRouter.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const { rowCount } = await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [parsed.data.status, req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Agendamento não encontrado' });
  const { rows } = await pool.query(`${ROW_SELECT} WHERE id = $1`, [req.params.id]);
  res.json({ booking: { ...rows[0], price: rows[0].price_cents / 100, price_cents: undefined } });
});
