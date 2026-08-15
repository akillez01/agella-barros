import { Router } from 'express';
import { pool } from '../db';

// Rotas públicas de leitura (sem adminAuth) — alimentam o site público a
// partir dos mesmos dados que o painel admin edita em /api/admin/*.
export const catalogRouter = Router();

catalogRouter.get('/products', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT p.id, p.slug, p.name, p.category AS cat, p.description AS "desc",
           p.price_cents, p.stock, p.badge AS tag, p.badge_style AS "tagClass",
           p.fallback_tone AS tone, p.fallback_style AS style, p.sort_order,
           m.url AS img
    FROM products p
    LEFT JOIN media m ON m.id = p.image_id
    WHERE p.is_active
    ORDER BY p.sort_order, p.created_at
  `);
  res.json({ products: rows.map(r => ({ ...r, priceN: r.price_cents / 100, price_cents: undefined })) });
});

catalogRouter.get('/gallery', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT g.id, g.caption, g.category AS cat, g.sort_order, m.url AS src
    FROM gallery g
    JOIN media m ON m.id = g.media_id
    WHERE g.is_visible
    ORDER BY g.sort_order, g.created_at DESC
  `);
  res.json({ gallery: rows });
});

catalogRouter.get('/specialists', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT s.key, s.name, s.role, s.bio, s.photo_position AS "objectPosition",
           s.stat1 AS s1, s.stat1_label AS s1l, s.stat2 AS s2, s.stat2_label AS s2l,
           m.url AS photo
    FROM specialists s
    LEFT JOIN media m ON m.id = s.photo_id
    WHERE s.is_active
    ORDER BY s.sort_order
  `);
  res.json({ specialists: rows });
});
