import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';

export const adminPagesRouter = Router();

adminPagesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM pages ORDER BY sort_order');
  res.json({ pages: rows });
});

adminPagesRouter.get('/:slug', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
  if (!rows.length) return res.status(404).json({ error: 'Página não encontrada' });
  res.json({ page: rows[0] });
});

const pagePatchSchema = z.object({
  nav_label: z.string().optional(),
  kicker: z.string().optional(),
  title: z.string().optional(),
  lede: z.string().optional(),
  hero_media_id: z.string().uuid().nullable().optional(),
  specialist_id: z.string().uuid().nullable().optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

adminPagesRouter.patch('/:slug', async (req, res) => {
  const parsed = pagePatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const d = parsed.data;
  const fields: string[] = [];
  const values: any[] = [];
  const push = (col: string, val: any) => { values.push(val); fields.push(`${col} = $${values.length}`); };
  for (const [k, v] of Object.entries(d)) if (v !== undefined) push(k, v);
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
  values.push(req.params.slug);
  const { rowCount } = await pool.query(`UPDATE pages SET ${fields.join(', ')} WHERE slug = $${values.length}`, values);
  if (!rowCount) return res.status(404).json({ error: 'Página não encontrada' });
  const { rows: full } = await pool.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
  res.json({ page: full[0] });
});

// —— Blocos de conteúdo da página (sessions_head/care_head/care_item etc.) ——

adminPagesRouter.get('/:slug/blocks', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.* FROM page_blocks b JOIN pages p ON p.id = b.page_id WHERE p.slug = $1 ORDER BY b.sort_order`,
    [req.params.slug]
  );
  res.json({ blocks: rows });
});

const blockSchema = z.object({
  block_key: z.string().min(1),
  heading: z.string().optional(),
  kicker: z.string().optional(),
  body: z.string().optional(),
  media_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
});

adminPagesRouter.post('/:slug/blocks', async (req, res) => {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const page = await pool.query('SELECT id FROM pages WHERE slug = $1', [req.params.slug]);
  if (!page.rowCount) return res.status(404).json({ error: 'Página não encontrada' });
  const d = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO page_blocks (page_id, block_key, heading, kicker, body, media_id, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [page.rows[0].id, d.block_key, d.heading || null, d.kicker || null, d.body || null, d.media_id || null, d.sort_order]
  );
  res.status(201).json({ block: rows[0] });
});

const blockPatchSchema = blockSchema.partial();

adminPagesRouter.patch('/:slug/blocks/:id', async (req, res) => {
  const parsed = blockPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const d = parsed.data;
  const fields: string[] = [];
  const values: any[] = [];
  const push = (col: string, val: any) => { values.push(val); fields.push(`${col} = $${values.length}`); };
  for (const [k, v] of Object.entries(d)) if (v !== undefined) push(k, v);
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE page_blocks SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows.length) return res.status(404).json({ error: 'Bloco não encontrado' });
  res.json({ block: rows[0] });
});

adminPagesRouter.delete('/:slug/blocks/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM page_blocks WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Bloco não encontrado' });
  res.status(204).end();
});
