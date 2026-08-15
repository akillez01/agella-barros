import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';

export const adminGalleryRouter = Router();

const ROW_SELECT = `
  SELECT g.id, g.caption, g.category AS cat, g.is_visible, g.sort_order, g.media_id, m.url AS src
  FROM gallery g JOIN media m ON m.id = g.media_id
`;

adminGalleryRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`${ROW_SELECT} ORDER BY g.sort_order, g.created_at DESC`);
  res.json({ gallery: rows });
});

const createSchema = z.object({
  media_id: z.string().uuid(),
  caption: z.string().optional(),
  cat: z.string().default('Studio'),
  sort_order: z.number().int().optional(),
});

adminGalleryRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const d = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO gallery (media_id, caption, category, sort_order) VALUES ($1,$2,$3,$4) RETURNING id`,
    [d.media_id, d.caption || null, d.cat, d.sort_order || 0]
  );
  const { rows: full } = await pool.query(`${ROW_SELECT} WHERE g.id = $1`, [rows[0].id]);
  res.status(201).json({ item: full[0] });
});

const patchSchema = z.object({
  caption: z.string().optional(),
  cat: z.string().optional(),
  is_visible: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

adminGalleryRouter.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const d = parsed.data;
  const fields: string[] = [];
  const values: any[] = [];
  const push = (col: string, val: any) => { values.push(val); fields.push(`${col} = $${values.length}`); };
  if (d.caption !== undefined) push('caption', d.caption);
  if (d.cat !== undefined) push('category', d.cat);
  if (d.is_visible !== undefined) push('is_visible', d.is_visible);
  if (d.sort_order !== undefined) push('sort_order', d.sort_order);
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
  values.push(req.params.id);
  const { rowCount } = await pool.query(`UPDATE gallery SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  if (!rowCount) return res.status(404).json({ error: 'Item não encontrado' });
  const { rows: full } = await pool.query(`${ROW_SELECT} WHERE g.id = $1`, [req.params.id]);
  res.json({ item: full[0] });
});

adminGalleryRouter.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Item não encontrado' });
  res.status(204).end();
});
