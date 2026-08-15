# Angella Barros Studio de Beleza

Site + loja + agendamento + painel administrativo do studio, em Parintins (AM).
Front-end em HTML, CSS e React (via Babel no navegador), sem etapa de build.

**Site ao vivo:** [angellabarros.com](https://angellabarros.com)

---

## Sobre o projeto

Projeto full-stack desenvolvido do zero para um studio de beleza real: site
institucional, loja com carrinho e Pix/cartão, agendamento de serviços em
5 passos, feed do Instagram sincronizado e um painel administrativo completo
para a dona do negócio gerenciar tudo — produtos, pedidos, agenda, galeria e
conteúdo das páginas — sem depender de programador para o dia a dia.

**Stack:** React (sem build, via Babel no navegador) · Node.js/TypeScript ·
Express · PostgreSQL · Docker · integração com IA (Anthropic/Gemini) para
concierge de atendimento.

**Meu papel:** projeto individual — arquitetura, front-end, backend, schema
de banco de dados e deploy (Docker + Postgres, Plesk).

---

## Como abrir no VS Code

```bash
code .
```

O site **precisa de um servidor local** (os arquivos `.jsx` são carregados por requisição;
abrir o `index.html` com duplo clique não funciona).

Escolha um dos caminhos:

**Extensão Live Server** (mais simples)
Instale "Live Server" no VS Code → clique com o botão direito em `index.html` → *Open with Live Server*.

**Python** (já vem instalado no macOS e Linux)
```bash
python3 -m http.server 5173
# abra http://localhost:5173
```

**Node**
```bash
npx serve .
```

---

## Estrutura

```
index.html            Casca do site: <head>, todo o CSS, loader, cursor, imports
app.jsx               Componente raiz: navegação, home, loja, rodapé, troca de páginas
cinema.jsx            Abertura em canvas (o "filme" do topo)
motion.js             Camada de movimento: Lenis + GSAP ScrollTrigger, parallax, galeria fixada
wellness.jsx          Página Massoterapia (aba da Aline)
booking.jsx           Fluxo de agendamento em 5 passos
checkout.jsx          Carrinho, Pix e cartão
instagram.jsx         Seção do feed + sincronização automática + aba do painel
admin.jsx             Painel administrativo completo
ai.jsx                Concierge "Bela" (IA)
store.jsx             Estado do site e persistência (hoje em localStorage)
icons.jsx             Ícones em SVG
frames-manifest.js    Manifesto da sequência de frames da abertura
schema.sql            Banco de dados PostgreSQL pronto para o servidor
Guia de Producao.html Guia de implantação (endpoints, variáveis, gateways)
assets/               Fotos do studio
assets/frames/        (criar) sequência da abertura: f-0001.jpg, f-0002.jpg…
vendor/               GSAP, ScrollTrigger e Lenis — locais, funciona offline
```

Regra de ouro dos arquivos `.jsx`: cada um é transpilado em escopo próprio.
Componentes compartilhados são exportados no fim do arquivo com
`Object.assign(window, { Componente })`.

---

## Painel administrativo

Rodapé do site → botão **Painel administrativo**.
Usuário e senha iniciais ficam em `store.jsx` → `settings.account`.
**Defina uma senha real antes de publicar** — o valor de exemplo no repositório
é só um placeholder (`TROCAR_ANTES_DE_PUBLICAR`), nunca a senha de produção.

Abas:

| Aba | O que a Angella controla |
|---|---|
| Painel | Resumo de vendas, pedidos e agenda |
| Pedidos | Status, pagamento, itens, contato da cliente |
| Produtos | Cadastro, preço, estoque, foto, selo |
| Pagamentos | Chave Pix, gateway de cartão, parcelas, entrega |
| Galeria | Fotos do site, legenda, categoria, ordem |
| Abertura | Sequência de frames e os textos do filme do topo |
| Instagram | Publicações e atualização automática do feed |
| Perfis | Foto e biografia da Angella e da Aline |
| Massoterapia | Toda a página da Aline: abertura, sessões, orientações |
| Agendamentos | Agenda, status, telefone e observação da cliente |

Tudo o que é editado ali é gravado no navegador (`localStorage`, chave `aa-studio-v2`).
Ao ligar o servidor, troque as funções `loadStore`/`setStore` em `store.jsx`
por chamadas à API — a forma dos dados já é a mesma das tabelas.

---

## Banco de dados

`schema.sql` roda em PostgreSQL 14 ou superior:

```bash
createdb angella
psql "$DATABASE_URL" -f schema.sql
```

Dinheiro sempre em **centavos** (`integer`), datas em `timestamptz`, ids em `uuid`.

Tabelas por assunto:

- **Acesso** — `admin_users`, `admin_sessions`, `audit_log`
- **Mídia** — `media` (toda imagem enviada pelo painel)
- **Loja** — `products`, `product_images`, `orders`, `order_items`, `customers`
- **Pagamentos** — `payments`, `payment_webhooks` (Pix e cartão, com idempotência)
- **Agenda** — `specialists`, `services`, `work_hours`, `blocked_slots`, `bookings`
- **Conteúdo** — `pages`, `page_blocks`, `gallery`, `instagram_posts`, `settings`, `newsletter_subscribers`
- **IA** — `ai_conversations`, `ai_messages`

Duas regras moram no próprio banco: baixa de estoque a cada item vendido e
`EXCLUDE` que impede dois agendamentos sobrepostos para a mesma especialista.

Views prontas para o painel: `v_orders_full`, `v_sales_by_day` e `v_page_full`
(esta devolve uma página inteira — cabeçalho, blocos, especialista e serviços — em um JSON só).

### Como a aba Massoterapia vira banco

| No painel | No banco |
|---|---|
| Abertura da página (linha fina, título, texto) | `pages` onde `slug='massoterapia'` |
| Sessões (nome, duração, preço, descrição) | `services` com `page_id` da página e `category='massoterapia'` |
| Antes / Durante / Depois | `page_blocks` com `block_key='care_item'` |
| Títulos das seções | `page_blocks` com `block_key='sessions_head'` e `'care_head'` |
| Foto e bio da Aline | `specialists` onde `key='aline'` |

Criar uma terceira aba no futuro é inserir uma linha em `pages` — nada de tabela nova.

---

## O que falta para produção

1. **Servidor** com os endpoints listados no `Guia de Producao.html`
   (`/api/products`, `/api/orders`, `/api/bookings`, `/api/instagram`, `/api/ai`, webhooks).
2. **Gateway de pagamento** — Mercado Pago, Asaas ou PagBank. Chave Pix real no painel.
3. **Armazenamento de imagens** — S3, R2 ou Cloudinary; hoje as fotos enviadas pelo
   painel viram base64 no navegador.
4. **Token do Instagram** no servidor, com renovação a cada 60 dias
   (o painel já aceita apontar para `GET /api/instagram`).
5. **Senha do painel** com hash (bcrypt custo 12) e sessão por cookie.
6. **HTTPS e domínio**, backup diário do banco.

Variáveis de ambiente sugeridas:

```
DATABASE_URL=postgres://…
SESSION_SECRET=…
MP_ACCESS_TOKEN=…
IG_ACCESS_TOKEN=…
ANTHROPIC_API_KEY=…
RESEND_API_KEY=…
```

---

## Contatos configurados

- WhatsApp: **55 92 99479-4991**
- Instagram: **@angellabarrostudio**
- Studio: Parintins — Amazonas
