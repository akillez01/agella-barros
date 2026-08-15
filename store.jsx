// Shared store — powers both the public site and the admin panel. Most state
// is localStorage-backed; products/gallery/profiles are overlaid from the
// real Postgres backend on load (see fetchCatalog below).
const STORE_KEY = 'aa-studio-v2';

const DEFAULT_STATE = {
  products: [
    {id:'p1', cat:'Tratamento Capilar', name:'Shampoo Restaurador Vinho', priceN:168, tone:'wine',  style:0, tag:'Best-seller', tagClass:'', img:null, stock:24, desc:'Limpeza suave com reconstrução de queratina. Para cabelos coloridos.'},
    {id:'p2', cat:'Óleo Essencial',     name:'Óleo Relaxante Bem-Estar',   priceN:142, tone:'amber', style:0, tag:'Novo', tagClass:'gold', img:null, stock:18, desc:'Blend de lavanda, gerânio e bergamota para massagem corporal.'},
    {id:'p3', cat:'Máscara Hidratação', name:'Máscara Reconstrução Couture', priceN:198, tone:'cream', style:1, tag:null, tagClass:'', img:null, stock:12, desc:'Tratamento intensivo semanal. Resultado de salão em casa.'},
    {id:'p4', cat:'Aromaterapia',       name:'Sérum Aromático Noite',      priceN:224, tone:'rose',  style:1, tag:'Edição', tagClass:'gold', img:null, stock:8, desc:'Ritual noturno de relaxamento. Aplicar nos pulsos e nuca.'},
  ],
  gallery: [
    {id:'g1', src:'assets/angella-studio.png', caption:'Bastidores do studio', cat:'Studio'},
    {id:'g2', src:'assets/angella-portrait.png', caption:'Angella no atendimento', cat:'Equipe'},
    {id:'g3', src:'assets/aline-portrait.png', caption:'Aline Maria', cat:'Equipe'},
  ],
  profiles: {
    angella: {
      name:'Angella Barros', role:'Sócia · Beleza Capilar', photo:'assets/angella-portrait.png',
      bio:"Especialista em coloração avançada e cortes autorais. Formada pela L'Oréal Professionnel, com passagens por Madrid e São Paulo. Acredita que cada fio carrega uma história — o cuidado começa pela escuta.",
      s1:'12+', s1l:'anos de carreira', s2:'3', s2l:'certificações intl.', objectPosition:'center 18%',
    },
    aline: {
      name:'Aline Maria', role:'Sócia · Massoterapia & Bem-estar', photo:'assets/aline-portrait.png',
      bio:'Terapeuta corporal com formação em drenagem linfática método Vodder e massagem ayurvédica. Conduz cada sessão como um ritual — silêncio, respiração e toque firme.',
      s1:'9+', s1l:'anos de prática', s2:'5', s2l:'técnicas dominadas', objectPosition:'center 20%',
    },
  },
  hero: { photo:'assets/angella-portrait.png' },
  wellness: {
    kicker:'Massoterapia & Bem-estar',
    title:'O corpo também<br/>pede <em>escuta</em>.',
    lede:'Com Aline Maria, dentro do Angella Barros Studio de Beleza. Sessões conduzidas em cabine privada, com técnica, silêncio e tempo — em Parintins.',
    listKicker:'Sessões',
    listTitle:'Quatro caminhos para o mesmo descanso.',
    sessions: [
      {id:'relaxante',  name:'Massagem Relaxante',  time:'60 min', price:'R$ 220', body:'Toque envolvente e ritmo lento para soltar a tensão do dia. Pressão ajustada durante toda a sessão.'},
      {id:'drenagem',   name:'Drenagem Linfática',  time:'75 min', price:'R$ 280', body:'Método Vodder. Movimentos suaves que estimulam a circulação, reduzem inchaço e sensação de peso.'},
      {id:'modeladora', name:'Massagem Modeladora', time:'60 min', price:'R$ 260', body:'Manobras firmes e profundas para trabalhar áreas específicas. Indicada em protocolo de sessões.'},
      {id:'pedras',     name:'Pedras Quentes',      time:'80 min', price:'R$ 320', body:'Calor das pedras basálticas sobre os pontos de tensão. Silêncio, respiração e temperatura constante.'},
    ],
    careKicker:'Como funciona',
    careTitle:'O cuidado começa antes de você deitar na maca.',
    care: [
      {k:'Antes',   v:'Evite refeições pesadas na hora anterior. Chegue 10 minutos antes para respirar e desacelerar.'},
      {k:'Durante', v:'A pressão é ajustada a qualquer momento. Fale sempre que quiser mais leve ou mais firme.'},
      {k:'Depois',  v:'Beba água, evite esforço no restante do dia. O efeito continua nas horas seguintes.'},
    ],
  },
  cinema: {
    copyV: 3,
    count: 0, prefix:'f-', pad:4, ext:'.jpg', dir:'assets/frames/',
    kicker:'Studio de Beleza · Parintins, Amazonas',
    title:'Onde a beleza encontra o bem-estar.',
    l1:'Cabelo, corpo e presença — no mesmo lugar.',
    l2:'Antes da técnica, a escuta. É dela que vem o resultado.',
    l3:'Um tempo que é só seu.',
  },
  instagram: {
    handle:'@angellabarrostudio',
    url:'https://www.instagram.com/angellabarrostudio',
    avatar:'assets/angella-portrait.png',
    posts:'428', followers:'12,4 mil', following:'891',
    bio:'Studio de Beleza & Bem-estar ✧ Parintins–AM\nColoração autoral · Massoterapia · Loja exclusiva\nAgende pelo site ou WhatsApp.',
    sync: {
      enabled:false,          // liga a atualização automática
      token:'',               // token da Instagram Graph API
      userId:'me',
      proxy:'',               // endpoint do seu servidor (recomendado em produção)
      limit:9, everyMin:60,
      lastSync:null, lastError:'',
    },
    feed: [
      {id:'i1', src:'assets/angella-studio.png',   caption:'Dia de bastidores no studio — luz boa, música baixa e café.', likes:'842', comments:'37', type:'carousel', tags:['#angellabarrosstudio','#parintins','#bastidores']},
      {id:'i2', src:'assets/angella-portrait.png', caption:'Loira iluminada com fundo quente. Trabalho de 3 horas em uma só sessão.', likes:'1.204', comments:'96', type:'photo', tags:['#coloracao','#loiroiluminado']},
      {id:'i3', src:'assets/aline-portrait.png',   caption:'Aline conduzindo a drenagem — o toque que refaz a semana.', likes:'611', comments:'24', type:'reel', tags:['#massoterapia','#bemestar']},
      {id:'i4', src:'assets/angella-studio.png',   caption:'Chegou a nova linha de óleos essenciais. Estoque limitado.', likes:'389', comments:'18', type:'photo', tags:['#lojaexclusiva']},
      {id:'i5', src:'assets/angella-portrait.png', caption:'Antes e depois de reconstrução capilar. Deslize para ver →', likes:'957', comments:'71', type:'carousel', tags:['#reconstrucao','#antesedepois']},
      {id:'i6', src:'assets/aline-portrait.png',   caption:'Ritual de pedras quentes: 80 minutos de silêncio absoluto.', likes:'523', comments:'29', type:'reel', tags:['#pedrasquentes','#ritual']},
    ],
  },
  settings: {
    account: {user:'angella', pass:'TROCAR_ANTES_DE_PUBLICAR', name:'Angella Barros', email:'contato@angellabarros.com.br'},
    pix: {enabled:true, key:'', keyType:'telefone', merchant:'ANGELLA BARROS STUDIO', city:'PARINTINS'},
    card: {enabled:true, gateway:'mercadopago', publicKey:'', maxInstallments:6, minInstallment:30, feeNote:'Parcelamento sem juros até 3x'},
    delivery: {pickup:true, local:true, localFee:15, freeAbove:250, address:'Centro · Parintins — Amazonas'},
    contact: {whatsapp:'5592994794991', email:'contato@angellabarros.com.br'},
  },
  orders: [],
  bookings: [
    {id:'b0', client:'Marina Duarte', service:'Coloração Premium', pro:'Angella Barros', date:'2026-08-04', time:'14:30', price:480, status:'confirmado', via:'site'},
    {id:'b1', client:'Júlia Ferraz',  service:'Drenagem Linfática', pro:'Aline Maria',   date:'2026-08-05', time:'10:00', price:280, status:'pendente',  via:'ia'},
  ],
};

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const igSaved = parsed.instagram || {};
      const cinemaSaved = parsed.cinema || {};
      const cinema = cinemaSaved.copyV === DEFAULT_STATE.cinema.copyV
        ? {...DEFAULT_STATE.cinema, ...cinemaSaved}
        : {...DEFAULT_STATE.cinema, count:cinemaSaved.count ?? 0, prefix:cinemaSaved.prefix ?? 'f-', pad:cinemaSaved.pad ?? 4, ext:cinemaSaved.ext ?? '.jpg', dir:cinemaSaved.dir ?? 'assets/frames/'};
      const st = parsed.settings || {};
      const merged = {...DEFAULT_STATE, ...parsed,
        profiles:{...DEFAULT_STATE.profiles, ...(parsed.profiles||{})},
        instagram:{...DEFAULT_STATE.instagram, ...igSaved, sync:{...DEFAULT_STATE.instagram.sync, ...(igSaved.sync||{})}},
        cinema,
        wellness:{...DEFAULT_STATE.wellness, ...(parsed.wellness||{})},
        settings:{
          account:{...DEFAULT_STATE.settings.account, ...(st.account||{})},
          pix:{...DEFAULT_STATE.settings.pix, ...(st.pix||{})},
          card:{...DEFAULT_STATE.settings.card, ...(st.card||{})},
          delivery:{...DEFAULT_STATE.settings.delivery, ...(st.delivery||{})},
          contact:{...DEFAULT_STATE.settings.contact, ...(st.contact||{})},
        }};
      // migrações de dados de exemplo para os dados reais do studio
      if (!merged.settings.contact.whatsapp || merged.settings.contact.whatsapp === '5592000000000')
        merged.settings.contact.whatsapp = DEFAULT_STATE.settings.contact.whatsapp;
      if (merged.instagram.handle === '@angellabarros.studio') {
        merged.instagram.handle = DEFAULT_STATE.instagram.handle;
        merged.instagram.url = DEFAULT_STATE.instagram.url;
      }
      return merged;
    }
  } catch (e) { console.warn('store load failed', e); }
  return DEFAULT_STATE;
}

let _state = loadStore();
const _subs = new Set();

// Produtos/Galeria/Perfis vêm do Postgres real (mesmos dados que o painel
// admin edita em /api/admin/*) — busca pública, sem token, só leitura.
// Se a rota falhar ou vier vazia (ex.: backend fora do ar), mantém os
// defaults estáticos em vez de esvaziar a vitrine.
async function fetchCatalog() {
  try {
    const [pRes, gRes, sRes] = await Promise.all([
      fetch('/api/products').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/gallery').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/specialists').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const patch = {};
    if (pRes?.products?.length) patch.products = pRes.products;
    if (gRes?.gallery?.length) patch.gallery = gRes.gallery;
    if (sRes?.specialists?.length) {
      const profiles = {..._state.profiles};
      for (const sp of sRes.specialists) {
        if (!profiles[sp.key]) continue;
        const base = profiles[sp.key];
        profiles[sp.key] = {
          ...base,
          name: sp.name || base.name,
          role: sp.role || base.role,
          bio: sp.bio || base.bio,
          photo: sp.photo || base.photo,
          objectPosition: sp.objectPosition || base.objectPosition,
          s1: sp.s1 || base.s1, s1l: sp.s1l || base.s1l,
          s2: sp.s2 || base.s2, s2l: sp.s2l || base.s2l,
        };
      }
      patch.profiles = profiles;
    }
    if (Object.keys(patch).length) {
      _state = {..._state, ...patch};
      _subs.forEach(fn => fn(_state));
    }
  } catch (e) { console.warn('catalog fetch failed', e); }
}
fetchCatalog();

function setStore(patch) {
  const next = typeof patch === 'function' ? patch(_state) : patch;
  _state = {..._state, ...next};
  try { localStorage.setItem(STORE_KEY, JSON.stringify(_state)); }
  catch (e) { console.warn('store save failed (quota?)', e); }
  _subs.forEach(fn => fn(_state));
}

function resetStore() {
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  _state = DEFAULT_STATE;
  _subs.forEach(fn => fn(_state));
}

function useStore() {
  const [s, set] = React.useState(_state);
  React.useEffect(() => {
    const fn = (x) => set(x);
    _subs.add(fn);
    set(_state);
    return () => { _subs.delete(fn); };
  }, []);
  return s;
}

// Downscale + compress an uploaded image so localStorage doesn't blow its quota.
function fileToDataURL(file, max = 1100, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let {width:w, height:h} = img;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#F2ECE5'; ctx.fillRect(0,0,w,h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const uid = (p='x') => p + Math.random().toString(36).slice(2,8);
const brl = (n) => 'R$ ' + Number(n||0).toLocaleString('pt-BR', {maximumFractionDigits:0});
const brlc = (n) => 'R$ ' + Number(n||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

/* ——— Pix “copia e cola” (BR Code EMV, padrão Banco Central) ———
   Gera um payload estático real: basta a Angella cadastrar a chave Pix dela no painel. */
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
const emv = (id, v) => id + String(v.length).padStart(2, '0') + v;
const sanitize = (s, max) => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 .\-]/g,'').trim().toUpperCase().slice(0, max);

function pixPayload({key, merchant, city, amount, txid}) {
  if (!key) return '';
  const account = emv('00','BR.GOV.BCB.PIX') + emv('01', key.trim());
  let p = emv('00','01') + emv('01','11') + emv('26', account) + emv('52','0000') + emv('53','986');
  if (amount > 0) p += emv('54', Number(amount).toFixed(2));
  p += emv('58','BR') + emv('59', sanitize(merchant,25) || 'STUDIO') + emv('60', sanitize(city,15) || 'PARINTINS');
  p += emv('62', emv('05', (txid||'***').replace(/[^A-Za-z0-9]/g,'').slice(0,25) || '***'));
  p += '6304';
  return p + crc16(p);
}

// Número do pedido legível: AB-260812-4F2K
function orderCode() {
  const d = new Date();
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'AB-' + ymd + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

// ——— Cliente do backend real (/api/admin/*) usado pelo painel administrativo ———
// TODO: token compartilhado simples (mesma decisão do backend, ver
// backend/src/middleware/adminAuth.ts) — só protege contra chamada direta às
// rotas sem passar pela UI do painel; login em si (usuário/senha) continua
// verificado no navegador (store.settings.account), sem sessão real ainda.
// Como o front-end é 100% estático/sem build, este valor fica visível no
// código-fonte enviado ao navegador — mesma exposição que a senha do admin
// já tinha antes. Não é segurança de verdade, é só um portão contra acesso
// casual às rotas /api/admin/* enquanto a Fase 2 (login com sessão real,
// admin_users/admin_sessions já modeladas no schema.sql) não é implementada.
const ADMIN_API_TOKEN = 'a90097d2458938473b1eb785c2c5a2caad40ef45081b883b';

async function adminFetch(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(`/api/admin${path}`, {
    ...opts,
    headers: {
      'X-Admin-Token': ADMIN_API_TOKEN,
      ...(isForm ? {} : {'Content-Type': 'application/json'}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function uploadMedia(file) {
  const fd = new FormData();
  fd.append('file', file);
  const data = await adminFetch('/media', {method: 'POST', body: fd});
  return data.media; // {id, url}
}

Object.assign(window, { useStore, setStore, resetStore, fileToDataURL, uid, brl, brlc, pixPayload, orderCode, DEFAULT_STATE, adminFetch, uploadMedia });
