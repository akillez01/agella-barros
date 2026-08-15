import { Router } from 'express';
import { pool } from '../../db';

export const adminSettingsRouter = Router();

adminSettingsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const out: Record<string, any> = {};
  for (const r of rows) out[r.key] = r.value;
  res.json({ settings: out });
});

// Body: objeto parcial {pix:{...}, contact:{...}, ...} — cada chave de topo
// vira uma linha upsert em `settings` (jsonb livre, sem schema fixo — o
// front-end já manda o formato que a UI usa).
adminSettingsRouter.patch('/', async (req, res) => {
  const patch = req.body;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return res.status(400).json({ error: 'Corpo deve ser um objeto {chave: valor}' });
  }
  const keys = Object.keys(patch);
  if (!keys.length) return res.status(400).json({ error: 'Nada para atualizar' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const key of keys) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
        [key, JSON.stringify(patch[key])]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query('SELECT key, value FROM settings');
  const out: Record<string, any> = {};
  for (const r of rows) out[r.key] = r.value;
  res.json({ settings: out });
});
