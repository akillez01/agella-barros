import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';

export const adminSpecialistsRouter = Router();

const ROW_SELECT = `
  SELECT s.id, s.key, s.name, s.role, s.bio, s.photo_id,
         s.photo_position AS "objectPosition",
         s.stat1 AS s1, s.stat1_label AS s1l, s.stat2 AS s2, s.stat2_label AS s2l,
         s.is_active, s.sort_order, m.url AS photo
  FROM specialists s LEFT JOIN media m ON m.id = s.photo_id
`;

adminSpecialistsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`${ROW_SELECT} ORDER BY s.sort_order`);
  res.json({ specialists: rows });
});

adminSpecialistsRouter.get('/:key', async (req, res) => {
  const { rows } = await pool.query(`${ROW_SELECT} WHERE s.key = $1`, [req.params.key]);
  if (!rows.length) return res.status(404).json({ error: 'Especialista não encontrada' });
  res.json({ specialist: rows[0] });
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  bio: z.string().optional(),
  photo_id: z.string().uuid().nullable().optional(),
  objectPosition: z.string().optional(),
  s1: z.string().optional(),
  s1l: z.string().optional(),
  s2: z.string().optional(),
  s2l: z.string().optional(),
});

adminSpecialistsRouter.patch('/:key', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const d = parsed.data;
  const fields: string[] = [];
  const values: any[] = [];
  const push = (col: string, val: any) => { values.push(val); fields.push(`${col} = $${values.length}`); };
  if (d.name !== undefined) push('name', d.name);
  if (d.role !== undefined) push('role', d.role);
  if (d.bio !== undefined) push('bio', d.bio);
  if (d.photo_id !== undefined) push('photo_id', d.photo_id);
  if (d.objectPosition !== undefined) push('photo_position', d.objectPosition);
  if (d.s1 !== undefined) push('stat1', d.s1);
  if (d.s1l !== undefined) push('stat1_label', d.s1l);
  if (d.s2 !== undefined) push('stat2', d.s2);
  if (d.s2l !== undefined) push('stat2_label', d.s2l);
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
  values.push(req.params.key);
  const { rowCount } = await pool.query(`UPDATE specialists SET ${fields.join(', ')} WHERE key = $${values.length}`, values);
  if (!rowCount) return res.status(404).json({ error: 'Especialista não encontrada' });
  const { rows: full } = await pool.query(`${ROW_SELECT} WHERE s.key = $1`, [req.params.key]);
  res.json({ specialist: full[0] });
});
