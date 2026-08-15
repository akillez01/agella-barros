import { createHash, randomBytes } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { pool } from '../../db';
import { adminAuth } from '../../middleware/adminAuth';

export const adminAuthRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionTTLSeconds() {
  return Math.max(1, Math.floor(env.ADMIN_SESSION_TTL_HOURS * 60 * 60));
}

function setSessionCookie(res: any, token: string) {
  res.cookie(env.ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionTTLSeconds() * 1000,
  });
}

function clearSessionCookie(res: any) {
  res.clearCookie(env.ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
}

adminAuthRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalido', issues: parsed.error.issues });
  }

  const { username, password } = parsed.data;
  const { rows } = await pool.query(
    `SELECT id, username::text AS username, full_name, role, password_hash,
            is_active, failed_logins, locked_until
     FROM admin_users
     WHERE lower(username::text) = lower($1)
     LIMIT 1`,
    [username]
  );

  const user = rows[0];
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Usuario ou senha incorretos' });
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return res.status(423).json({ error: 'Conta temporariamente bloqueada. Tente novamente em alguns minutos.' });
  }

  const verify = await pool.query('SELECT crypt($1, $2) = $2 AS ok', [password, user.password_hash]);
  const ok = Boolean(verify.rows[0]?.ok);

  if (!ok) {
    await pool.query(
      `UPDATE admin_users
       SET failed_logins = failed_logins + 1,
           locked_until = CASE
             WHEN failed_logins + 1 >= 5 THEN now() + interval '15 minutes'
             ELSE locked_until
           END
       WHERE id = $1`,
      [user.id]
    );
    return res.status(401).json({ error: 'Usuario ou senha incorretos' });
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await pool.query(
    `INSERT INTO admin_sessions (user_id, token_hash, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval)`,
    [
      user.id,
      tokenHash,
      req.ip || null,
      String(req.headers['user-agent'] || '').slice(0, 1000) || null,
      String(sessionTTLSeconds()),
    ]
  );

  await pool.query(
    `UPDATE admin_users
     SET failed_logins = 0,
         locked_until = NULL,
         last_login_at = now()
     WHERE id = $1`,
    [user.id]
  );

  await pool.query('DELETE FROM admin_sessions WHERE expires_at <= now()');

  setSessionCookie(res, rawToken);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    },
  });
});

adminAuthRouter.get('/me', adminAuth, async (_req, res) => {
  const user = res.locals.adminUser;
  return res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    },
  });
});

adminAuthRouter.post('/logout', adminAuth, async (_req, res) => {
  const tokenHash = res.locals.sessionTokenHash as string | undefined;
  if (tokenHash) {
    await pool.query('DELETE FROM admin_sessions WHERE token_hash = $1', [tokenHash]);
  }
  clearSessionCookie(res);
  return res.status(204).end();
});

adminAuthRouter.post('/users', adminAuth, async (req, res) => {
  if (res.locals.adminUser?.role !== 'owner') {
    return res.status(403).json({ error: 'Somente owner pode criar usuarios' });
  }

  const schema = z.object({
    username: z.string().trim().min(3),
    fullName: z.string().trim().min(3),
    password: z.string().min(8),
    email: z.string().email().optional().nullable(),
    role: z.enum(['owner', 'staff']).default('staff'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalido', issues: parsed.error.issues });
  }

  const d = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO admin_users (username, full_name, email, role, password_hash)
     VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 12)))
     RETURNING id, username::text AS username, full_name, role, email::text AS email`,
    [d.username, d.fullName, d.email || null, d.role, d.password]
  );

  return res.status(201).json({ user: rows[0] });
});
