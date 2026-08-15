import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';

export const ordersRouter = Router();

const itemSchema = z.object({
  id: z.string().uuid(),
  qty: z.number().int().positive(),
});

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(3),
    phone: z.string().trim().min(10),
    email: z.string().trim().email().optional().or(z.literal('')),
    cpf: z.string().trim().optional(),
  }),
  delivery: z.enum(['retirada', 'entrega']),
  address: z
    .object({
      street: z.string().trim().min(2),
      num: z.string().trim().min(1),
      bairro: z.string().trim().min(2),
      ref: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      zip: z.string().trim().optional(),
    })
    .optional()
    .nullable(),
  items: z.array(itemSchema).min(1),
  shippingCents: z.number().int().nonnegative().default(0),
  discountCents: z.number().int().nonnegative().default(0),
  notes: z.string().trim().optional(),
  channel: z.enum(['site', 'whatsapp', 'ia', 'presencial']).default('site'),
});

function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}

function orderCode() {
  const d = new Date();
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AB-${ymd}-${rand}`;
}

ordersRouter.post('/orders', async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalido', issues: parsed.error.issues });
  }
  const d = parsed.data;

  if (d.delivery === 'entrega' && !d.address) {
    return res.status(400).json({ error: 'Endereco obrigatorio para entrega' });
  }

  const ids = d.items.map((i) => i.id);
  const { rows: products } = await pool.query(
    `SELECT id, name, price_cents, stock, is_active
     FROM products
     WHERE id = ANY($1::uuid[])`,
    [ids]
  );

  if (products.length !== ids.length) {
    return res.status(400).json({ error: 'Um ou mais produtos nao foram encontrados' });
  }

  const byId = new Map<string, { id: string; name: string; price_cents: number; stock: number; is_active: boolean }>();
  for (const p of products) byId.set(p.id, p);

  for (const item of d.items) {
    const p = byId.get(item.id);
    if (!p || !p.is_active) return res.status(400).json({ error: `Produto indisponivel: ${item.id}` });
    if (item.qty > p.stock) return res.status(409).json({ error: `Estoque insuficiente para ${p.name}` });
  }

  const subtotalCents = d.items.reduce((acc, item) => {
    const p = byId.get(item.id)!;
    return acc + p.price_cents * item.qty;
  }, 0);
  const shippingCents = d.shippingCents;
  const discountCents = d.discountCents;
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerPhone = onlyDigits(d.customer.phone);
    const { rows: cRows } = await client.query(
      `INSERT INTO customers (name, phone, email, cpf)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone)
       DO UPDATE SET
         name = EXCLUDED.name,
         email = COALESCE(EXCLUDED.email, customers.email),
         cpf = COALESCE(EXCLUDED.cpf, customers.cpf),
         updated_at = now()
       RETURNING id`,
      [d.customer.name.trim(), customerPhone, d.customer.email || null, d.customer.cpf || null]
    );
    const customerId = cRows[0].id;

    let created: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = orderCode();
      try {
        const { rows } = await client.query(
          `INSERT INTO orders (
             code, customer_id, customer_name, customer_phone, customer_email,
             subtotal_cents, shipping_cents, discount_cents, total_cents,
             delivery_method, address_street, address_number, address_district,
             address_ref, address_city, address_state, address_zip,
             status, channel, notes
           ) VALUES (
             $1,$2,$3,$4,$5,
             $6,$7,$8,$9,
             $10,$11,$12,$13,
             $14,$15,$16,$17,
             'aguardando',$18,$19
           )
           RETURNING id, code, total_cents, subtotal_cents, shipping_cents, discount_cents, status, created_at`,
          [
            code,
            customerId,
            d.customer.name.trim(),
            customerPhone,
            d.customer.email || null,
            subtotalCents,
            shippingCents,
            discountCents,
            totalCents,
            d.delivery,
            d.address?.street || null,
            d.address?.num || null,
            d.address?.bairro || null,
            d.address?.ref || null,
            d.address?.city || 'Parintins',
            d.address?.state || 'AM',
            d.address?.zip || null,
            d.channel,
            d.notes || null,
          ]
        );
        created = rows[0];
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
      }
    }

    if (!created) throw new Error('Falha ao gerar codigo de pedido');

    for (const item of d.items) {
      const p = byId.get(item.id)!;
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_cents, qty)
         VALUES ($1,$2,$3,$4,$5)`,
        [created.id, p.id, p.name, p.price_cents, item.qty]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      order: {
        id: created.id,
        code: created.code,
        status: created.status,
        subtotalCents,
        shippingCents,
        discountCents,
        totalCents,
        createdAt: created.created_at,
        customer: {
          name: d.customer.name.trim(),
          phone: customerPhone,
          email: d.customer.email || null,
        },
        delivery: d.delivery,
        address: d.address || null,
        items: d.items.map((item) => {
          const p = byId.get(item.id)!;
          return {
            id: p.id,
            name: p.name,
            qty: item.qty,
            unitCents: p.price_cents,
            totalCents: p.price_cents * item.qty,
          };
        }),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido:', err);
    return res.status(500).json({ error: 'Falha ao criar pedido' });
  } finally {
    client.release();
  }
});
