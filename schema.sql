-- =====================================================================
--  Angella Barros Studio de Beleza — banco de dados (PostgreSQL 14+)
--  Parintins, Amazonas
--
--  Uso:  psql "$DATABASE_URL" -f schema.sql
--  Tudo em snake_case, IDs em UUID, dinheiro em CENTAVOS (integer) para
--  nunca ter erro de arredondamento. Datas em timestamptz (UTC).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() e crypt()
CREATE EXTENSION IF NOT EXISTS "citext";     -- e-mail sem diferenciar maiúsculas

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =====================================================================
--  1. ACESSO AO PAINEL
-- =====================================================================
CREATE TABLE admin_users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username       citext UNIQUE NOT NULL,
  email          citext UNIQUE,
  password_hash  text NOT NULL,                      -- bcrypt/argon2 — NUNCA senha em texto
  full_name      text NOT NULL,
  role           text NOT NULL DEFAULT 'owner'
                 CHECK (role IN ('owner','staff')),
  avatar_url     text,
  is_active      boolean NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  failed_logins  smallint NOT NULL DEFAULT 0,
  locked_until   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_admin_users_upd BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE admin_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,                  -- hash do cookie de sessão
  ip          inet,
  user_agent  text,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON admin_sessions(user_id);

-- =====================================================================
--  2. MÍDIA (uma tabela só para toda imagem enviada pelo painel)
-- =====================================================================
CREATE TABLE media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url          text NOT NULL,                        -- URL pública (S3/R2/Cloudinary)
  storage_key  text,                                 -- caminho no bucket
  width        int,
  height       int,
  bytes        int,
  mime         text,
  alt          text,
  uploaded_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
--  3. LOJA
-- =====================================================================
CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  category      text,
  description   text,
  price_cents   integer NOT NULL CHECK (price_cents >= 0),
  compare_at_cents integer CHECK (compare_at_cents >= 0),   -- preço "de"
  stock         integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku           text,
  badge         text,                                 -- "Novo", "Best-seller"
  badge_style   text DEFAULT '' CHECK (badge_style IN ('','gold')),
  image_id      uuid REFERENCES media(id) ON DELETE SET NULL,
  fallback_tone text DEFAULT 'wine' CHECK (fallback_tone IN ('wine','amber','cream','rose')),
  fallback_style smallint DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_active ON products(is_active, sort_order);
CREATE TRIGGER trg_products_upd BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Fotos extras do produto (galeria da página do produto)
CREATE TABLE product_images (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position   smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

-- =====================================================================
--  4. CLIENTES E PEDIDOS
-- =====================================================================
CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL,                          -- só dígitos, com DDI: 5592...
  email       citext,
  cpf         text,                                   -- opcional (nota fiscal)
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone)
);
CREATE TRIGGER trg_customers_upd BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,               -- AB-260812-4F2K
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  -- cópia dos dados no momento da compra (histórico não muda se o cadastro mudar)
  customer_name   text NOT NULL,
  customer_phone  text NOT NULL,
  customer_email  citext,
  subtotal_cents  integer NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents  integer NOT NULL DEFAULT 0,
  discount_cents  integer NOT NULL DEFAULT 0,
  total_cents     integer NOT NULL CHECK (total_cents >= 0),
  delivery_method text NOT NULL CHECK (delivery_method IN ('retirada','entrega')),
  address_street  text, address_number text, address_district text,
  address_ref     text, address_city text DEFAULT 'Parintins', address_state text DEFAULT 'AM',
  address_zip     text,
  status          text NOT NULL DEFAULT 'aguardando'
                  CHECK (status IN ('aguardando','pago','enviado','entregue','cancelado','estornado')),
  channel         text NOT NULL DEFAULT 'site' CHECK (channel IN ('site','whatsapp','ia','presencial')),
  notes           text,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE TRIGGER trg_orders_upd BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name   text NOT NULL,                       -- congelado no momento da compra
  unit_cents     integer NOT NULL CHECK (unit_cents >= 0),
  qty            integer NOT NULL CHECK (qty > 0),
  total_cents    integer GENERATED ALWAYS AS (unit_cents * qty) STORED
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Baixa de estoque (e devolução no cancelamento) — regra no próprio banco
CREATE OR REPLACE FUNCTION apply_stock() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.product_id IS NOT NULL THEN
    UPDATE products SET stock = GREATEST(0, stock - NEW.qty) WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' AND OLD.product_id IS NOT NULL THEN
    UPDATE products SET stock = stock + OLD.qty WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_stock AFTER INSERT OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION apply_stock();

-- =====================================================================
--  5. PAGAMENTOS (Pix e cartão) — um pedido pode ter várias tentativas
-- =====================================================================
CREATE TABLE payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid REFERENCES orders(id) ON DELETE CASCADE,
  booking_id        uuid,                             -- FK adicionada após bookings
  method            text NOT NULL CHECK (method IN ('pix','credito','debito','dinheiro')),
  provider          text CHECK (provider IN ('mercadopago','asaas','pagbank','stripe','manual')),
  provider_payment_id text,                           -- id da cobrança no gateway
  amount_cents      integer NOT NULL CHECK (amount_cents > 0),
  installments      smallint NOT NULL DEFAULT 1,
  status            text NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente','aprovado','recusado','estornado','expirado')),
  -- Pix
  pix_payload       text,                             -- BR Code "copia e cola"
  pix_txid          text,
  pix_qr_url        text,
  pix_expires_at    timestamptz,
  -- Cartão (NUNCA guardar número completo, CVV ou dados de tarja)
  card_brand        text,
  card_last4        char(4),
  card_holder       text,
  authorization_code text,
  raw_response      jsonb,                            -- resposta bruta do gateway
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_provider ON payments(provider, provider_payment_id);
CREATE TRIGGER trg_payments_upd BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Log de webhooks do gateway (idempotência: não processar o mesmo evento 2x)
CREATE TABLE payment_webhooks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL,
  event_id      text NOT NULL,
  event_type    text,
  payload       jsonb NOT NULL,
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

-- =====================================================================
--  6. SERVIÇOS E AGENDA
-- =====================================================================
CREATE TABLE specialists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text UNIQUE NOT NULL,                 -- 'angella', 'aline'
  name          text NOT NULL,
  role          text,
  bio           text,
  photo_id      uuid REFERENCES media(id) ON DELETE SET NULL,
  photo_position text DEFAULT 'center 18%',
  stat1         text, stat1_label text,
  stat2         text, stat2_label text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    smallint DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_specialists_upd BEFORE UPDATE ON specialists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  category       text,                                -- 'cabelo', 'massoterapia'
  description    text,
  price_cents    integer NOT NULL CHECK (price_cents >= 0),
  duration_min   smallint NOT NULL DEFAULT 60,
  specialist_id  uuid REFERENCES specialists(id) ON DELETE SET NULL,
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     smallint DEFAULT 0
);

-- Horário de trabalho por especialista (0=domingo … 6=sábado)
CREATE TABLE work_hours (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  weekday       smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  UNIQUE (specialist_id, weekday, start_time)
);

-- Folgas, feriados e bloqueios pontuais
CREATE TABLE blocked_slots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid REFERENCES specialists(id) ON DELETE CASCADE,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  reason        text
);

CREATE TABLE bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text UNIQUE NOT NULL,
  customer_id    uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name  text NOT NULL,
  customer_phone text NOT NULL,
  service_id     uuid REFERENCES services(id) ON DELETE SET NULL,
  service_name   text NOT NULL,
  specialist_id  uuid REFERENCES specialists(id) ON DELETE SET NULL,
  specialist_name text,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  price_cents    integer NOT NULL DEFAULT 0,
  deposit_cents  integer NOT NULL DEFAULT 0,          -- sinal pago por Pix
  status         text NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','confirmado','concluido','cancelado','faltou')),
  channel        text NOT NULL DEFAULT 'site' CHECK (channel IN ('site','ia','whatsapp','presencial')),
  notes          text,
  reminder_sent_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_when ON bookings(starts_at);
CREATE INDEX idx_bookings_status ON bookings(status, starts_at);
CREATE TRIGGER trg_bookings_upd BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Impede dois agendamentos sobrepostos para a mesma especialista
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    specialist_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status IN ('pendente','confirmado'));

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id)
  REFERENCES bookings(id) ON DELETE CASCADE;

-- =====================================================================
--  7. CONTEÚDO DO SITE (o que a Angella edita no painel)
-- =====================================================================
CREATE TABLE gallery (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id   uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  caption    text,
  category   text NOT NULL DEFAULT 'Studio',
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Páginas editáveis do site (home e massoterapia). Cada página tem seus blocos.
CREATE TABLE pages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,                  -- 'home', 'massoterapia'
  nav_label   text,                                  -- rótulo no menu do site
  kicker      text,                                  -- linha fina acima do título
  title       text,                                  -- aceita <br/> e <em>…</em>
  lede        text,                                  -- parágrafo de apresentação
  hero_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  specialist_id uuid REFERENCES specialists(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  sort_order  smallint NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_pages_upd BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Blocos de conteúdo da página: cabeçalhos de seção e itens (antes/durante/depois)
CREATE TABLE page_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id    uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_key  text NOT NULL,                          -- 'sessions_head', 'care_head', 'care_item'
  heading    text,                                   -- 'Antes', 'Durante', 'Depois'
  kicker     text,
  body       text,
  media_id   uuid REFERENCES media(id) ON DELETE SET NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_page_blocks_page ON page_blocks(page_id, block_key, sort_order);
CREATE TRIGGER trg_page_blocks_upd BEFORE UPDATE ON page_blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Vincula o serviço à página onde ele é oferecido (as sessões da massoterapia
-- aparecem tanto no cartão da página quanto no agendamento daquela página)
ALTER TABLE services
  ADD COLUMN page_id  uuid REFERENCES pages(id) ON DELETE SET NULL,
  ADD COLUMN summary  text,                          -- texto do cartão na página
  ADD COLUMN slug     text UNIQUE;
CREATE INDEX idx_services_page ON services(page_id, sort_order);

CREATE TABLE instagram_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id    uuid REFERENCES media(id) ON DELETE SET NULL,
  external_id text,                                   -- id do post na Instagram Graph API
  permalink   text,
  caption     text,
  likes       text, comments text,
  post_type   text DEFAULT 'photo' CHECK (post_type IN ('photo','carousel','reel')),
  tags        text[],
  sort_order  smallint DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Chave/valor para configurações do site e do checkout
CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE newsletter_subscribers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        citext UNIQUE NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  source       text DEFAULT 'site',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
--  8. CONCIERGE IA + AUDITORIA
-- =====================================================================
CREATE TABLE ai_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  visitor_id  text,                                   -- cookie anônimo
  channel     text DEFAULT 'site',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant','system')),
  content         text NOT NULL,
  tokens          int,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_conv ON ai_messages(conversation_id, created_at);

CREATE TABLE audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action     text NOT NULL,                           -- 'product.update', 'order.status'
  entity     text, entity_id uuid,
  before     jsonb, after jsonb,
  ip         inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- =====================================================================
--  9. DADOS INICIAIS
-- =====================================================================
-- Senha abaixo é só um placeholder: gere o hash no servidor (bcrypt custo 12)
INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES
  ('angella', 'contato@angellabarros.com.br', '$2b$12$TROQUE_ESTE_HASH_NO_DEPLOY', 'Angella Barros', 'owner');

INSERT INTO specialists (key, name, role, stat1, stat1_label, stat2, stat2_label) VALUES
  ('angella', 'Angella Barros', 'Sócia · Beleza Capilar', '12+', 'anos de carreira', '3', 'certificações intl.'),
  ('aline',   'Aline Maria',    'Sócia · Massoterapia & Bem-estar', '9+', 'anos de prática', '5', 'técnicas dominadas');

INSERT INTO settings (key, value) VALUES
  ('pix',      '{"enabled":true,"key":"","key_type":"telefone","merchant":"ANGELLA BARROS STUDIO","city":"PARINTINS"}'),
  ('card',     '{"enabled":true,"gateway":"mercadopago","public_key":"","max_installments":6,"min_installment_cents":3000}'),
  ('delivery', '{"pickup":true,"local":true,"local_fee_cents":1500,"free_above_cents":25000,"address":"Centro · Parintins — Amazonas"}'),
  ('contact',  '{"whatsapp":"5592994794991","email":"contato@angellabarros.com.br","instagram":"@angellabarrostudio"}'),
  ('instagram_sync', '{"enabled":false,"limit":9,"every_min":60,"user_id":"me"}'),
  ('cinema',   '{"count":0,"dir":"assets/frames/","prefix":"f-","pad":4,"ext":".jpg","kicker":"Studio de Beleza · Parintins, Amazonas","title":"Onde a beleza encontra o bem-estar.","l1":"Cabelo, corpo e presença — no mesmo lugar.","l2":"Antes da técnica, a escuta. É dela que vem o resultado.","l3":"Um tempo que é só seu."}'),
  ('studio',   '{"name":"Angella Barros Studio de Beleza","city":"Parintins — Amazonas","opened":2018}');

-- Páginas do site
INSERT INTO pages (slug, nav_label, kicker, title, lede, specialist_id, sort_order) VALUES
  ('home', 'Studio', 'Studio de Beleza · Parintins, Amazonas',
   'Onde a beleza encontra o bem-estar.', NULL,
   (SELECT id FROM specialists WHERE key='angella'), 0),
  ('massoterapia', 'Massoterapia', 'Massoterapia & Bem-estar',
   'O corpo também<br/>pede <em>escuta</em>.',
   'Com Aline Maria, dentro do Angella Barros Studio de Beleza. Sessões conduzidas em cabine privada, com técnica, silêncio e tempo — em Parintins.',
   (SELECT id FROM specialists WHERE key='aline'), 1);

-- Cabeçalhos de seção e o bloco antes/durante/depois da página de massoterapia
INSERT INTO page_blocks (page_id, block_key, kicker, heading, body, sort_order)
SELECT p.id, v.block_key, v.kicker, v.heading, v.body, v.pos
FROM pages p, (VALUES
  ('sessions_head', 'Sessões',      'Quatro caminhos para o mesmo descanso.', NULL, 0),
  ('care_head',     'Como funciona','O cuidado começa antes de você deitar na maca.', NULL, 1),
  ('care_item',     NULL, 'Antes',   'Evite refeições pesadas na hora anterior. Chegue 10 minutos antes para respirar e desacelerar.', 2),
  ('care_item',     NULL, 'Durante', 'A pressão é ajustada a qualquer momento. Fale sempre que quiser mais leve ou mais firme.', 3),
  ('care_item',     NULL, 'Depois',  'Beba água, evite esforço no restante do dia. O efeito continua nas horas seguintes.', 4)
) AS v(block_key, kicker, heading, body, pos)
WHERE p.slug = 'massoterapia';

-- Serviços: cabelo (home, Angella) e sessões de massoterapia (Aline)
INSERT INTO services (slug, name, category, summary, price_cents, duration_min, specialist_id, page_id, sort_order)
SELECT v.slug, v.name, v.cat, v.summary, v.cents, v.mins,
       (SELECT id FROM specialists WHERE key = v.spec),
       (SELECT id FROM pages WHERE slug = v.page), v.pos
FROM (VALUES
  ('corte',       'Corte & Finalização', 'cabelo', 'Leitura do rosto, do fio e da rotina antes da tesoura.', 18000,  45, 'angella', 'home', 0),
  ('coloracao',   'Coloração Premium',   'cabelo', 'Cor autoral, do diagnóstico ao acabamento.',            48000, 150, 'angella', 'home', 1),
  ('tratamento',  'Tratamento Capilar',  'cabelo', 'Reconstrução sob medida para o seu fio.',               24000,  75, 'angella', 'home', 2),
  ('relaxante',   'Massagem Relaxante',  'massoterapia', 'Toque envolvente e ritmo lento para soltar a tensão do dia. Pressão ajustada durante toda a sessão.', 22000, 60, 'aline', 'massoterapia', 0),
  ('drenagem',    'Drenagem Linfática',  'massoterapia', 'Método Vodder. Movimentos suaves que estimulam a circulação, reduzem inchaço e sensação de peso.',   28000, 75, 'aline', 'massoterapia', 1),
  ('modeladora',  'Massagem Modeladora', 'massoterapia', 'Manobras firmes e profundas para trabalhar áreas específicas. Indicada em protocolo de sessões.',    26000, 60, 'aline', 'massoterapia', 2),
  ('pedras',      'Pedras Quentes',      'massoterapia', 'Calor das pedras basálticas sobre os pontos de tensão. Silêncio, respiração e temperatura constante.', 32000, 80, 'aline', 'massoterapia', 3)
) AS v(slug, name, cat, summary, cents, mins, spec, page, pos);

-- Segunda a sábado, 09:00–19:00, para as duas especialistas
INSERT INTO work_hours (specialist_id, weekday, start_time, end_time)
SELECT s.id, d, '09:00', '19:00' FROM specialists s, generate_series(1,6) d;

-- =====================================================================
--  10. CONSULTAS ÚTEIS PARA O PAINEL
-- =====================================================================
CREATE VIEW v_orders_full AS
SELECT o.*, 
       (SELECT json_agg(json_build_object('name', i.product_name, 'qty', i.qty, 'unit', i.unit_cents))
          FROM order_items i WHERE i.order_id = o.id) AS items,
       (SELECT p.status FROM payments p WHERE p.order_id = o.id ORDER BY p.created_at DESC LIMIT 1) AS payment_status
FROM orders o;

CREATE VIEW v_sales_by_day AS
SELECT date_trunc('day', created_at) AS dia,
       count(*) AS pedidos,
       sum(total_cents) FILTER (WHERE status <> 'cancelado') AS receita_cents
FROM orders GROUP BY 1 ORDER BY 1 DESC;

-- Página pronta para o site: cabeçalho, blocos e serviços em um só JSON
-- (GET /api/pages/massoterapia devolve exatamente isto)
CREATE VIEW v_page_full AS
SELECT p.slug, p.nav_label, p.kicker, p.title, p.lede, p.is_published,
       (SELECT row_to_json(x) FROM (
          SELECT s.name, s.role, s.bio, m.url AS photo, s.photo_position,
                 s.stat1, s.stat1_label, s.stat2, s.stat2_label
          FROM specialists s LEFT JOIN media m ON m.id = s.photo_id
          WHERE s.id = p.specialist_id) x) AS specialist,
       (SELECT json_agg(json_build_object(
          'key', b.block_key, 'kicker', b.kicker, 'heading', b.heading, 'body', b.body)
          ORDER BY b.sort_order)
        FROM page_blocks b WHERE b.page_id = p.id) AS blocks,
       (SELECT json_agg(json_build_object(
          'slug', sv.slug, 'name', sv.name, 'summary', sv.summary,
          'price_cents', sv.price_cents, 'duration_min', sv.duration_min)
          ORDER BY sv.sort_order)
        FROM services sv WHERE sv.page_id = p.id AND sv.is_active) AS services
FROM pages p;
