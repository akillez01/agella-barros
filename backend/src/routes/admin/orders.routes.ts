import { Router } from 'express';
import { pool } from '../../db';

export const adminOrdersRouter = Router();

// Leitura apenas — loja/pagamento continuam stub nesta rodada, não existe
// fluxo de criação de pedido ainda. Usa a view `v_orders_full` que o próprio
// schema.sql já define (itens agregados + status do pagamento mais recente).
adminOrdersRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM v_orders_full ORDER BY created_at DESC LIMIT 200');
  res.json({ orders: rows });
});
