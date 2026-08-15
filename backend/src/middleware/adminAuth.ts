import { createHash } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { pool } from '../db';

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionTTLSeconds() {
  return Math.max(1, Math.floor(env.ADMIN_SESSION_TTL_HOURS * 60 * 60));
}

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const rawToken = readCookie(req, env.ADMIN_SESSION_COOKIE);
  if (!rawToken) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const tokenHash = hashToken(rawToken);
  const { rows } = await pool.query(
    `SELECT s.token_hash, u.id, u.username::text AS username, u.full_name, u.role
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND u.is_active = true
     LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  await pool.query(
    `UPDATE admin_sessions
     SET expires_at = now() + ($1 || ' seconds')::interval
     WHERE token_hash = $2`,
    [String(sessionTTLSeconds()), tokenHash]
  );

  res.locals.adminUser = row;
  res.locals.sessionTokenHash = tokenHash;
  next();
}
