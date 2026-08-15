// Proteção mínima de /api/admin/* nesta rodada: token compartilhado simples
// (header `X-Admin-Token`), comparado com `ADMIN_API_TOKEN` no ambiente.
//
// TODO (próxima rodada): trocar por sessão real usando as tabelas já
// modeladas em schema.sql (`admin_users` com bcrypt, `admin_sessions` com
// cookie httpOnly) — hoje o login do admin.jsx ainda compara usuário/senha
// no próprio navegador (`store.settings.account`), então esse token só
// impede acesso direto às rotas por quem não passou pela UI do painel; não é
// autenticação de verdade por usuário.
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  // Falha fechado: sem token configurado no ambiente, ninguém entra — nunca
  // deixar /api/admin/* aberto por omissão de configuração.
  if (!env.ADMIN_API_TOKEN) {
    return res.status(500).json({ error: 'ADMIN_API_TOKEN não configurada no servidor' });
  }
  const token = req.header('X-Admin-Token');
  if (token !== env.ADMIN_API_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}
