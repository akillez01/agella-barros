-- Cria/atualiza dois usuarios administrativos com senha em bcrypt (pgcrypto)
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/admin-users-bootstrap.sql
-- Troque as senhas abaixo antes de executar.

BEGIN;

WITH users AS (
  SELECT *
  FROM (VALUES
    ('achilles', 'Achilles', 'owner', 'achilles@angellabarros.com', 'TROCAR_ACHILLES_ANTES_DE_EXECUTAR'),
    ('angela', 'Angela Barros', 'owner', 'contato@angellabarros.com.br', 'TROCAR_ANGELA_ANTES_DE_EXECUTAR')
  ) AS t(username, full_name, role, email, password_plain)
)
INSERT INTO admin_users (username, full_name, role, email, password_hash, is_active, failed_logins, locked_until)
SELECT
  u.username::citext,
  u.full_name,
  u.role,
  u.email::citext,
  crypt(u.password_plain, gen_salt('bf', 12)),
  true,
  0,
  NULL
FROM users u
ON CONFLICT (username)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  failed_logins = 0,
  locked_until = NULL,
  updated_at = now();

-- Invalida sessoes antigas dos usuarios atualizados
DELETE FROM admin_sessions
WHERE user_id IN (
  SELECT id
  FROM admin_users
  WHERE lower(username::text) IN ('achilles', 'angela')
);

COMMIT;
