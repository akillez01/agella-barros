import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';
import { slugify } from '../../lib/slug';

export const adminProductsRouter = Router();

const ROW_SELECT = `
  SELECT p.id, p.slug, p.name, p.category AS cat, p.description AS "desc",
         p.price_cents, p.stock, p.badge AS tag, p.badge_style AS "tagClass",
         p.fallback_tone AS tone, p.fallback_style AS style, p.is_active,
         p.sort_order, p.image_id, m.url AS img
  FROM products p
  LEFT JOIN media m ON m.id = p.image_id
`;

function toApi(row: any) {
  return { ...row, priceN: row.price_cents / 100, price_cents: undefined };
}

adminProductsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`${ROW_SELECT} ORDER BY p.sort_order, p.created_at`);
  res.json({ products: rows.map(toApi) });
});

const productSchema = z.object({
  name: z.string().min(1),
  cat: z.string().optional(),
  desc: z.string().optional(),
  priceN: z.number().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  tag: z.string().optional(),
  tagClass: z.enum(['', 'gold']).default(''),
  tone: z.enum(['wine', 'amber', 'cream', 'rose']).default('wine'),
  style: z.number().int().default(0),
  image_id: z.string().uuid().nullable().optional(),
});

adminProductsRouter.post('/', async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const d = parsed.data;

  let slug = slugify(d.name) || 'produto';
  for (let attempt = 0; attempt < 5; attempt++) {
    const trySlug = attempt === 0 ? slug : `${slug}-${attempt}`;
    const exists = await pool.query('SELECT 1 FROM products WHERE slug = $1', [trySlug]);
    if (exists.rowCount === 0) { slug = trySlug; break; }
  }

  const { rows } = await pool.query(
    `INSERT INTO products (slug, name, category, description, price_cents, stock, badge, badge_style, fallback_tone, fallback_style, image_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [slug, d.name, d.cat || null, d.desc || null, Math.round(d.priceN * 100), d.stock, d.tag || null, d.tagClass, d.tone, d.style, d.image_id || null]
  );
  const { rows: full } = await pool.query(`${ROW_SELECT} WHERE p.id = $1`, [rows[0].id]);
  res.status(201).json({ product: toApi(full[0]) });
});

const productPatchSchema = productSchema.partial();

adminProductsRouter.patch('/:id', async (req, res) => {
  const parsed = productPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  const d = parsed.data;

  const fields: string[] = [];
  const values: any[] = [];
  const push = (col: string, val: any) => { values.push(val); fields.push(`${col} = $${values.length}`); };

  if (d.name !== undefined) push('name', d.name);
  if (d.cat !== undefined) push('category', d.cat || null);
  if (d.desc !== undefined) push('description', d.desc || null);
  if (d.priceN !== undefined) push('price_cents', Math.round(d.priceN * 100));
  if (d.stock !== undefined) push('stock', d.stock);
  if (d.tag !== undefined) push('badge', d.tag || null);
  if (d.tagClass !== undefined) push('badge_style', d.tagClass);
  if (d.tone !== undefined) push('fallback_tone', d.tone);
  if (d.style !== undefined) push('fallback_style', d.style);
  if (d.image_id !== undefined) push('image_id', d.image_id);

  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
  values.push(req.params.id);
  const { rowCount } = await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  if (!rowCount) return res.status(404).json({ error: 'Produto não encontrado' });

  const { rows: full } = await pool.query(`${ROW_SELECT} WHERE p.id = $1`, [req.params.id]);
  res.json({ product: toApi(full[0]) });
});

adminProductsRouter.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
  res.status(204).end();
});

// Fotos extras da galeria do produto (não usado pela UI ainda — pronto para
// quando a página de produto ganhar múltiplas fotos).
adminProductsRouter.post('/:id/images', async (req, res) => {
  const mediaId = req.body?.media_id;
  if (!mediaId) return res.status(400).json({ error: 'media_id obrigatório' });
  await pool.query(
    `INSERT INTO product_images (product_id, media_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [req.params.id, mediaId, req.body.position || 0]
  );
  res.status(201).json({ ok: true });
});

adminProductsRouter.delete('/:id/images/:mediaId', async (req, res) => {
  await pool.query('DELETE FROM product_images WHERE product_id = $1 AND media_id = $2', [req.params.id, req.params.mediaId]);
  res.status(204).end();
});
