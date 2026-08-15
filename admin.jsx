// Admin panel — pedidos, produtos, pagamentos, galeria, perfis, agenda.
// Produtos, Galeria, Perfis e Agenda já batem no backend real (Postgres) via
// /api/admin/* — ver store.jsx (adminFetch/uploadMedia) e backend/src/routes/admin/.
// Pedidos, Pagamentos, Abertura, Instagram e Massoterapia continuam em
// localStorage nesta rodada (loja/pagamento seguem stub, decisão do Achilles).
const { useState: adUseState, useRef: adUseRef, useEffect: adUseEffect } = React;

// Debounce simples pra campos com edição "ao vivo" (sem botão Salvar) — evita
// disparar um PATCH por tecla digitada.
function useDebouncedCallback(fn, delay) {
  const timer = adUseRef(null);
  return (...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  };
}

function Admin({ open, onClose, showToast }) {
  const store = useStore();
  const [authed, setAuthed] = adUseState(false);
  const [sessionUser, setSessionUser] = adUseState(null);
  const [authBusy, setAuthBusy] = adUseState(true);
  const [user, setUser] = adUseState('');
  const [pass, setPass] = adUseState('');
  const [err, setErr] = adUseState('');
  const [tab, setTab] = adUseState('painel');

  // Dados reais do backend (Postgres) — carregados ao autenticar.
  const [products, setProducts] = adUseState([]);
  const [gallery, setGallery] = adUseState([]);
  const [specialists, setSpecialists] = adUseState([]);
  const [bookings, setBookings] = adUseState([]);
  const [adminLoadError, setAdminLoadError] = adUseState('');

  adUseEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/auth/me', { credentials: 'include' });
        if (!alive) return;
        if (!res.ok) {
          setAuthed(false);
          setSessionUser(null);
          return;
        }
        const data = await res.json();
        if (!alive) return;
        setAuthed(true);
        setSessionUser(data.user || null);
      } catch (_e) {
        if (!alive) return;
        setAuthed(false);
        setSessionUser(null);
      } finally {
        if (alive) setAuthBusy(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  adUseEffect(() => {
    if (!authed) return;
    Promise.all([
      adminFetch('/products').then(d => setProducts(d.products)),
      adminFetch('/gallery').then(d => setGallery(d.gallery)),
      adminFetch('/specialists').then(d => setSpecialists(d.specialists)),
      adminFetch('/bookings').then(d => setBookings(d.bookings)),
    ]).catch(e => setAdminLoadError(e.message || 'Falha ao carregar dados do servidor'));
  }, [authed]);

  if (!open) return null;

  const login = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || 'Usuario ou senha incorretos.');
        setPass('');
        return;
      }
      setAuthed(true);
      setSessionUser(data.user || null);
      setErr('');
      setPass('');
    } catch (_e) {
      setErr('Nao foi possivel autenticar agora. Tente novamente.');
    } finally {
      setAuthBusy(false);
    }
  };
  const logout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (_e) { }
    setAuthed(false);
    setSessionUser(null);
    onClose();
  };

  if (authBusy) {
    return (
      <div className="admin-root">
        <div className="admin-login">
          <button className="admin-login-x" onClick={onClose}><Icon.Close /></button>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 300, marginBottom: '.6rem' }}>Verificando acesso...</h2>
          <p style={{ color: 'var(--ink-500)', fontSize: '.95rem' }}>So um instante.</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-root">
        <div className="admin-login">
          <button className="admin-login-x" onClick={onClose}><Icon.Close /></button>
          <div className="gold-rule center" style={{ marginBottom: '1.4rem' }}>Área restrita</div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 300, marginBottom: '.6rem' }}>Painel do Studio</h2>
          <p style={{ color: 'var(--ink-500)', marginBottom: '1.8rem', fontSize: '.95rem' }}>Entre com seu usuario e senha.</p>
          <form onSubmit={login} style={{ display: 'grid', gap: '.9rem', textAlign: 'left' }}>
            <Field label="Usuario"><input value={user} onChange={e => { setUser(e.target.value); setErr('') }} autoComplete="username" placeholder="angella" autoFocus /></Field>
            <Field label="Senha"><input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr('') }} autoComplete="current-password" placeholder="********" /></Field>
            {!!err && <div className="admin-err">{err}</div>}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '.4rem' }} type="submit" disabled={authBusy}>Entrar <Icon.Arrow size={14} /></button>
          </form>
          <div className="admin-hint">Acesso protegido por sessao segura no servidor.</div>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'painel', label: 'Painel' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'produtos', label: 'Produtos' },
    { id: 'pagamentos', label: 'Pagamentos' },
    { id: 'galeria', label: 'Galeria' },
    { id: 'cinema', label: 'Abertura' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'perfis', label: 'Perfis' },
    { id: 'wellness', label: 'Massoterapia' },
    { id: 'agenda', label: 'Agendamentos' },
  ];

  return (
    <div className="admin-root">
      <aside className="admin-side">
        <div className="admin-brand">
          <img src="assets/logo-icon.png" alt="" style={{ height: 34, display: 'block', marginBottom: '.6rem' }} />
          Angella Barros
          <small>Painel administrativo</small>
        </div>
        <nav className="admin-nav">
          {TABS.map(t => (
            <button key={t.id} className={`admin-navbtn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === 'agenda' && <span className="admin-count">{bookings.length}</span>}
              {t.id === 'pedidos' && !!(store.orders || []).length && <span className="admin-count">{store.orders.length}</span>}
              {t.id === 'produtos' && <span className="admin-count">{products.length}</span>}
              {t.id === 'galeria' && <span className="admin-count">{gallery.length}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-side-foot">
          {sessionUser?.username && <div className="mini-meta" style={{ marginBottom: '.7rem' }}>Conectado como {sessionUser.username}</div>}
          <button className="admin-reset" onClick={() => { if (confirm('Restaurar todo o conteúdo original? Suas alterações serão perdidas.')) { resetStore(); showToast('Conteúdo restaurado'); } }}>Restaurar padrão</button>
          <button className="btn btn-ghost" style={{ width: '100%', padding: '.75rem 1rem', fontSize: '.72rem' }} onClick={onClose}>Voltar ao site</button>
          <button className="admin-reset" onClick={logout}>Sair da conta</button>
        </div>
      </aside>
      <main className="admin-main">
        {adminLoadError && <div className="admin-err" style={{ marginBottom: '1rem' }}>Não consegui carregar dados do servidor: {adminLoadError}</div>}
        {tab === 'painel' && <Painel store={store} go={setTab} bookings={bookings} products={products} />}
        {tab === 'pedidos' && <Pedidos store={store} showToast={showToast} />}
        {tab === 'produtos' && <Produtos products={products} setProducts={setProducts} showToast={showToast} />}
        {tab === 'pagamentos' && <Pagamentos store={store} showToast={showToast} />}
        {tab === 'galeria' && <Galeria gallery={gallery} setGallery={setGallery} showToast={showToast} />}
        {tab === 'cinema' && <Cinema store={store} showToast={showToast} />}
        {tab === 'instagram' && <InstagramAdmin store={store} showToast={showToast} />}
        {tab === 'perfis' && <Perfis store={store} specialists={specialists} setSpecialists={setSpecialists} showToast={showToast} />}
        {tab === 'wellness' && <WellnessAdmin store={store} showToast={showToast} />}
        {tab === 'agenda' && <Agenda bookings={bookings} setBookings={setBookings} showToast={showToast} />}
      </main>
    </div>
  );
}

/* ——————————————————————— Painel ——————————————————————— */
function Painel({ store, go, bookings, products }) {
  const receita = bookings.filter(b => b.status !== 'cancelado').reduce((a, b) => a + (b.price || 0), 0);
  const orders = store.orders || [];
  const vendas = orders.filter(o => o.status !== 'cancelado').reduce((a, o) => a + (o.total || 0), 0);
  const cards = [
    { k: 'Agendamentos ativos', v: bookings.filter(b => b.status !== 'cancelado').length, s: 'esta semana' },
    { k: 'Receita prevista', v: brl(receita), s: 'serviços reservados' },
    { k: 'Vendas na loja', v: brl(vendas), s: `${orders.length} pedido${orders.length === 1 ? '' : 's'}` },
    { k: 'Produtos na loja', v: products.length, s: `${products.reduce((a, p) => a + (+p.stock || 0), 0)} itens em estoque` },
  ];
  const viaIA = bookings.filter(b => b.via === 'ia').length;
  return (
    <>
      <AdminHead title="Bom te ver por aqui." sub="Resumo do studio hoje." />
      <div className="kpi-grid">
        {cards.map(c => (
          <div key={c.k} className="kpi">
            <div className="kpi-k">{c.k}</div>
            <div className="kpi-v">{c.v}</div>
            <div className="kpi-s">{c.s}</div>
          </div>
        ))}
      </div>
      <div className="admin-panel" style={{ marginTop: '1.5rem' }}>
        <div className="admin-panel-head">
          <h3>Próximos atendimentos</h3>
          <button className="link-btn" onClick={() => go('agenda')}>Ver todos <Icon.Arrow size={13} /></button>
        </div>
        {bookings.slice(0, 4).map(b => (
          <div key={b.id} className="mini-row">
            <div>
              <div className="mini-name">{b.client}</div>
              <div className="mini-meta">{b.service} · {b.pro}</div>
            </div>
            <div className="mini-meta">{fmtDate(b.date)} · {b.time}</div>
            <span className={`pill ${b.status}`}>{b.status}</span>
          </div>
        ))}
      </div>
      <div className="ai-insight">
        <div className="ai-avatar"><Icon.Sparkle size={16} /></div>
        <div>
          <strong>Concierge IA</strong>
          <p>{viaIA} de {bookings.length} reservas chegaram pela Bela. Ela recomenda serviços, sugere produtos e agenda sozinha — 24h por dia.</p>
        </div>
      </div>
    </>
  );
}

/* ——————————————————————— Pedidos ——————————————————————— */
const ORDER_STATUS = ['aguardando', 'pago', 'enviado', 'entregue', 'cancelado'];

function Pedidos({ store, showToast }) {
  const orders = store.orders || [];
  const [f, setF] = adUseState('todos');
  const rows = orders.filter(o => f === 'todos' || o.status === f);
  const setStatus = (id, status) => {
    setStore(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status } : o) }));
    showToast('Pedido atualizado');
  };
  const wa = (o) => `https://wa.me/55${o.customer.phone.replace(/^55/, '')}?text=${encodeURIComponent(`Olá ${o.customer.name.split(' ')[0]}! Sobre seu pedido ${o.code} no Angella Barros Studio:`)}`;

  return (
    <>
      <AdminHead title="Pedidos" sub="Compras da loja — Pix e cartão, com status de pagamento e entrega.">
        <div className="seg">
          {['todos', ...ORDER_STATUS].map(s => <button key={s} className={f === s ? 'on' : ''} onClick={() => setF(s)}>{s}</button>)}
        </div>
      </AdminHead>
      <div className="admin-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="adm-table" style={{ minWidth: 860 }}>
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Valor</th><th>Pagamento</th><th>Entrega</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(o => (
              <tr key={o.id}>
                <td><strong>{o.code}</strong><div className="order-items">{fmtDate(o.createdAt.slice(0, 10))}</div></td>
                <td>{o.customer.name}<div className="order-items">{o.customer.phone}</div></td>
                <td className="order-items">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</td>
                <td>{brlc(o.total)}</td>
                <td><span className={`via ${o.method === 'pix' ? 'ia' : ''}`}>{o.method === 'pix' ? 'Pix' : `Cartão ${o.installments}x`}</span></td>
                <td className="order-items">{o.delivery === 'retirada' ? 'Retirada' : `${o.address?.street || ''}, ${o.address?.num || ''} · ${o.address?.bairro || ''}`}</td>
                <td>
                  <select className={`status-sel ${o.status === 'pago' || o.status === 'entregue' ? 'confirmado' : o.status === 'cancelado' ? 'cancelado' : 'pendente'}`} value={o.status} onChange={e => setStatus(o.id, e.target.value)}>
                    {ORDER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ marginTop: '.4rem' }}><a className="link-btn" href={wa(o)} target="_blank" rel="noopener">WhatsApp</a></div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-500)' }}>Nenhum pedido {f === 'todos' ? 'ainda' : `com status "${f}"`}.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ——————————————————————— Pagamentos ——————————————————————— */
function Pagamentos({ store, showToast }) {
  const cfg = store.settings;
  const upd = (group, patch) => setStore(s => ({ settings: { ...s.settings, [group]: { ...s.settings[group], ...patch } } }));
  const pixOk = !!cfg.pix.key;

  return (
    <>
      <AdminHead title="Pagamentos" sub="Chave Pix, cartão e entrega — o que a cliente vê no checkout." />
      <div className="pay-grid">
        <div className="admin-panel">
          <div className="admin-panel-head"><h3>Pix</h3><span className={`pill ${pixOk ? 'confirmado' : 'pendente'}`}>{pixOk ? 'ativo' : 'sem chave'}</span></div>
          <p style={{ color: 'var(--ink-500)', fontSize: '.86rem', margin: '.4rem 0 1.2rem' }}>O QR Code do checkout é gerado a partir desta chave — o dinheiro cai direto na sua conta.</p>
          <div className="form-grid">
            <Field label="Tipo de chave">
              <select value={cfg.pix.keyType} onChange={e => upd('pix', { keyType: e.target.value })}>
                {['telefone', 'cpf', 'cnpj', 'email', 'aleatoria'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Chave Pix"><input value={cfg.pix.key} onChange={e => upd('pix', { key: e.target.value })} placeholder="+5592999990000" /></Field>
            <Field label="Nome do recebedor (máx. 25)"><input value={cfg.pix.merchant} onChange={e => upd('pix', { merchant: e.target.value })} /></Field>
            <Field label="Cidade (máx. 15)"><input value={cfg.pix.city} onChange={e => upd('pix', { city: e.target.value })} /></Field>
          </div>
          <div className="toggle-row" style={{ marginTop: '1rem' }}>
            <span>Aceitar Pix no checkout</span>
            <button className={`switch ${cfg.pix.enabled ? 'on' : ''}`} onClick={() => upd('pix', { enabled: !cfg.pix.enabled })} aria-label="Pix" />
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head"><h3>Cartão de crédito</h3><span className={`pill ${cfg.card.publicKey ? 'confirmado' : 'pendente'}`}>{cfg.card.publicKey ? 'conectado' : 'demonstração'}</span></div>
          <p style={{ color: 'var(--ink-500)', fontSize: '.86rem', margin: '.4rem 0 1.2rem' }}>Escolha a maquininha digital e cole a chave pública. A chave secreta fica só no servidor, nunca aqui.</p>
          <div className="form-grid">
            <Field label="Gateway">
              <select value={cfg.card.gateway} onChange={e => upd('card', { gateway: e.target.value })}>
                <option value="mercadopago">Mercado Pago</option>
                <option value="asaas">Asaas</option>
                <option value="pagbank">PagBank</option>
                <option value="stripe">Stripe</option>
              </select>
            </Field>
            <Field label="Chave pública (public key)"><input value={cfg.card.publicKey} onChange={e => upd('card', { publicKey: e.target.value })} placeholder="APP_USR-…" /></Field>
            <Field label="Máximo de parcelas"><input type="number" value={cfg.card.maxInstallments} onChange={e => upd('card', { maxInstallments: e.target.value })} /></Field>
            <Field label="Parcela mínima (R$)"><input type="number" value={cfg.card.minInstallment} onChange={e => upd('card', { minInstallment: e.target.value })} /></Field>
            <Field label="Aviso de parcelamento" span={2}><input value={cfg.card.feeNote} onChange={e => upd('card', { feeNote: e.target.value })} /></Field>
          </div>
          <div className="toggle-row" style={{ marginTop: '1rem' }}>
            <span>Aceitar cartão no checkout</span>
            <button className={`switch ${cfg.card.enabled ? 'on' : ''}`} onClick={() => upd('card', { enabled: !cfg.card.enabled })} aria-label="Cartão" />
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head"><h3>Entrega e contato</h3></div>
          <div className="form-grid" style={{ marginTop: '.8rem' }}>
            <Field label="Taxa de entrega (R$)"><input type="number" value={cfg.delivery.localFee} onChange={e => upd('delivery', { localFee: e.target.value })} /></Field>
            <Field label="Frete grátis acima de (R$)"><input type="number" value={cfg.delivery.freeAbove} onChange={e => upd('delivery', { freeAbove: e.target.value })} /></Field>
            <Field label="Endereço para retirada" span={2}><input value={cfg.delivery.address} onChange={e => upd('delivery', { address: e.target.value })} /></Field>
            <Field label="WhatsApp do studio (com DDI)" span={2}><input value={cfg.contact.whatsapp} onChange={e => upd('contact', { whatsapp: e.target.value })} placeholder="5592999990000" /></Field>
            <Field label="E-mail de contato" span={2}><input value={cfg.contact.email} onChange={e => upd('contact', { email: e.target.value })} /></Field>
          </div>
          <div className="toggle-row"><span>Permitir retirada no studio</span><button className={`switch ${cfg.delivery.pickup ? 'on' : ''}`} onClick={() => upd('delivery', { pickup: !cfg.delivery.pickup })} /></div>
          <div className="toggle-row"><span>Entregar em Parintins</span><button className={`switch ${cfg.delivery.local ? 'on' : ''}`} onClick={() => upd('delivery', { local: !cfg.delivery.local })} /></div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head"><h3>Acesso ao painel</h3></div>
          <p style={{ color: 'var(--ink-500)', fontSize: '.86rem', margin: '.4rem 0 1.2rem' }}>As contas do painel agora ficam no banco de dados (`admin_users`) com senha em hash bcrypt e sessao por cookie httpOnly. Crie/edite usuarios pelo backend.</p>
        </div>
      </div>
    </>
  );
}

/* ——————————————————————— Produtos ——————————————————————— */
const EMPTY_PRODUCT = { name: '', cat: '', priceN: '', tag: '', tagClass: '', tone: 'wine', style: 0, img: null, stock: '', desc: '' };

function Produtos({ products, setProducts, showToast }) {
  const [editing, setEditing] = adUseState(null);
  const [saving, setSaving] = adUseState(false);
  const [uploadingImg, setUploadingImg] = adUseState(false);
  const fileRef = adUseRef(null);

  const save = async () => {
    if (!editing.name.trim()) { showToast('Dê um nome ao produto'); return; }
    setSaving(true);
    const body = {
      name: editing.name, cat: editing.cat || '', desc: editing.desc || '',
      priceN: Number(editing.priceN) || 0, stock: Number(editing.stock) || 0,
      tag: editing.tag || '', tagClass: editing.tagClass || '',
      tone: editing.tone || 'wine', style: editing.style || 0,
      image_id: editing.image_id ?? null,
    };
    try {
      const data = editing.id
        ? await adminFetch(`/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await adminFetch('/products', { method: 'POST', body: JSON.stringify(body) });
      setProducts(ps => editing.id ? ps.map(x => x.id === editing.id ? data.product : x) : [...ps, data.product]);
      showToast(editing.id ? 'Produto atualizado' : 'Produto adicionado à loja');
      setEditing(null);
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id) => {
    if (!confirm('Remover este produto da loja?')) return;
    try {
      await adminFetch(`/products/${id}`, { method: 'DELETE' });
      setProducts(ps => ps.filter(p => p.id !== id));
      showToast('Produto removido');
    } catch (e) {
      showToast('Erro ao remover: ' + e.message);
    }
  };
  const pickImage = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingImg(true);
    try {
      const media = await uploadMedia(f);
      setEditing(x => ({ ...x, img: media.url, image_id: media.id }));
    } catch (err) {
      showToast('Erro ao enviar imagem: ' + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  return (
    <>
      <AdminHead title="Produtos" sub="Adicione, edite e publique itens da loja exclusiva.">
        <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY_PRODUCT })}><Icon.Plus size={14} /> Novo produto</button>
      </AdminHead>

      <div className="adm-prod-grid">
        {products.map(p => (
          <div key={p.id} className="adm-prod">
            <div className="adm-prod-img">
              {p.img ? <img src={p.img} alt={p.name} /> : <div style={{ height: '86%', display: 'grid', placeItems: 'center' }}><Bottle tone={p.tone} style={p.style} /></div>}
            </div>
            <div className="adm-prod-body">
              <div className="adm-prod-cat">{p.cat || '—'}</div>
              <div className="adm-prod-name">{p.name}</div>
              <div className="adm-prod-foot">
                <span className="adm-price">{brl(p.priceN)}</span>
                <span className={`stock ${(+p.stock || 0) < 10 ? 'low' : ''}`}>{p.stock || 0} un.</span>
              </div>
              <div className="adm-actions">
                <button onClick={() => setEditing({ ...p })}>Editar</button>
                <button className="danger" onClick={() => remove(p.id)}>Remover</button>
              </div>
            </div>
          </div>
        ))}
        <button className="adm-add" onClick={() => setEditing({ ...EMPTY_PRODUCT })}>
          <Icon.Plus size={26} />
          <span>Novo produto</span>
        </button>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Editar produto' : 'Novo produto'} onClose={() => setEditing(null)} onSave={save} saving={saving}>
          <div className="form-grid">
            <Field label="Nome do produto" span={2}>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ex.: Máscara Reconstrução" />
            </Field>
            <Field label="Categoria">
              <input value={editing.cat} onChange={e => setEditing({ ...editing, cat: e.target.value })} placeholder="Tratamento Capilar" />
            </Field>
            <Field label="Preço (R$)">
              <input type="number" value={editing.priceN} onChange={e => setEditing({ ...editing, priceN: e.target.value })} placeholder="198" />
            </Field>
            <Field label="Estoque">
              <input type="number" value={editing.stock} onChange={e => setEditing({ ...editing, stock: e.target.value })} placeholder="12" />
            </Field>
            <Field label="Selo (opcional)">
              <input value={editing.tag || ''} onChange={e => setEditing({ ...editing, tag: e.target.value })} placeholder="Novo, Best-seller…" />
            </Field>
            <Field label="Descrição" span={2}>
              <textarea rows={2} value={editing.desc || ''} onChange={e => setEditing({ ...editing, desc: e.target.value })} placeholder="Uma frase sobre o produto — a IA usa isso para recomendar." />
            </Field>
            <Field label="Imagem do produto" span={2}>
              <div className="img-picker">
                <div className="img-preview">
                  {editing.img ? <img src={editing.img} alt="" /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: '.5rem' }}><Bottle tone={editing.tone} style={editing.style} /></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
                  <button className="btn btn-ghost" disabled={uploadingImg} style={{ padding: '.7rem 1.1rem', fontSize: '.72rem' }} onClick={() => fileRef.current?.click()}>{uploadingImg ? 'Enviando…' : 'Enviar foto'}</button>
                  {editing.img && <button className="link-btn danger" style={{ marginLeft: '.8rem' }} onClick={() => setEditing({ ...editing, img: null, image_id: null })}>Remover</button>}
                  <p style={{ fontSize: '.8rem', color: 'var(--ink-500)', marginTop: '.8rem' }}>Sem foto, usamos o frasco da marca. Escolha a cor:</p>
                  <div className="tone-row">
                    {['wine', 'amber', 'cream', 'rose'].map(t => (
                      <button key={t} className={`tone ${t} ${editing.tone === t ? 'sel' : ''}`} onClick={() => setEditing({ ...editing, tone: t })} aria-label={t} />
                    ))}
                    <button className="link-btn" style={{ marginLeft: '.6rem' }} onClick={() => setEditing({ ...editing, style: editing.style === 0 ? 1 : 0 })}>Trocar formato</button>
                  </div>
                </div>
              </div>
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ——————————————————————— Galeria ——————————————————————— */
function Galeria({ gallery, setGallery, showToast }) {
  const fileRef = adUseRef(null);
  const [drag, setDrag] = adUseState(false);
  const [uploading, setUploading] = adUseState(false);
  const patchItem = useDebouncedCallback((id, patch) => {
    adminFetch(`/gallery/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      .catch(e => showToast('Erro ao salvar: ' + e.message));
  }, 600);

  const addFiles = async (files) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    setUploading(true);
    try {
      const items = [];
      for (const f of list) {
        const media = await uploadMedia(f);
        const data = await adminFetch('/gallery', {
          method: 'POST', body: JSON.stringify({
            media_id: media.id, caption: f.name.replace(/\.[^.]+$/, ''), cat: 'Studio',
          })
        });
        items.push(data.item);
      }
      setGallery(g => [...items, ...g]);
      showToast(`${items.length} foto${items.length > 1 ? 's' : ''} adicionada${items.length > 1 ? 's' : ''} à galeria`);
    } catch (e) {
      showToast('Erro ao enviar fotos: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    try {
      await adminFetch(`/gallery/${id}`, { method: 'DELETE' });
      setGallery(g => g.filter(x => x.id !== id));
      showToast('Foto removida');
    } catch (e) {
      showToast('Erro ao remover: ' + e.message);
    }
  };

  return (
    <>
      <AdminHead title="Galeria" sub="Fotos de trabalhos, bastidores e ambiente — publicadas direto no site.">
        <button className="btn btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}><Icon.Plus size={14} /> {uploading ? 'Enviando…' : 'Enviar fotos'}</button>
      </AdminHead>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => addFiles(e.target.files)} />

      <div className={`dropzone ${drag ? 'over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}>
        <Icon.Plus size={22} />
        <div>
          <strong>Arraste fotos aqui</strong>
          <span>ou clique para escolher · JPG, PNG · várias de uma vez</span>
        </div>
      </div>

      <div className="gal-grid">
        {gallery.map(g => (
          <div key={g.id} className="gal-item">
            <img src={g.src} alt={g.caption} />
            <div className="gal-overlay">
              <input className="gal-cap" defaultValue={g.caption} onChange={e => { const caption = e.target.value; setGallery(gs => gs.map(x => x.id === g.id ? { ...x, caption } : x)); patchItem(g.id, { caption }); }} />
              <select className="gal-cat" defaultValue={g.cat} onChange={e => { const cat = e.target.value; setGallery(gs => gs.map(x => x.id === g.id ? { ...x, cat } : x)); patchItem(g.id, { cat }); }}>
                {['Studio', 'Equipe', 'Cabelo', 'Bem-estar', 'Produtos'].map(c => <option key={c}>{c}</option>)}
              </select>
              <button className="gal-del" onClick={() => remove(g.id)}><Icon.Close size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ——————————————————————— Abertura (frames) ——————————————————————— */
function Cinema({ store, showToast }) {
  const c = store.cinema;
  const upd = (patch) => setStore(s => ({ cinema: { ...s.cinema, ...patch } }));
  const ativo = (+c.count || 0) > 0;
  return (
    <>
      <AdminHead title="Abertura" sub="O filme do topo do site — sequência de fotos que avança conforme a pessoa rola a página." />
      <div className="pay-grid">
        <div className="admin-panel">
          <div className="admin-panel-head"><h3>Sequência de frames</h3><span className={`pill ${ativo ? 'confirmado' : 'pendente'}`}>{ativo ? `${c.count} frames` : 'modo foto única'}</span></div>
          <p style={{ color: 'var(--ink-500)', fontSize: '.86rem', margin: '.4rem 0 1.2rem', lineHeight: 1.6 }}>
            Coloque as fotos da sequência na pasta <code style={{ background: 'var(--cream-100)', padding: '1px 5px', borderRadius: 3 }}>assets/frames/</code> nomeadas
            f-0001.jpg, f-0002.jpg, e assim por diante. Depois informe abaixo quantas são. Enquanto o total for 0, o site
            usa a foto principal com aproximação suave — nada quebra.
          </p>
          <div className="form-grid">
            <Field label="Total de frames"><input type="number" value={c.count} onChange={e => upd({ count: +e.target.value || 0 })} placeholder="0" /></Field>
            <Field label="Pasta"><input value={c.dir} onChange={e => upd({ dir: e.target.value })} /></Field>
            <Field label="Prefixo do arquivo"><input value={c.prefix} onChange={e => upd({ prefix: e.target.value })} /></Field>
            <Field label="Dígitos do número"><input type="number" value={c.pad} onChange={e => upd({ pad: +e.target.value || 4 })} /></Field>
            <Field label="Extensão">
              <select value={c.ext} onChange={e => upd({ ext: e.target.value })}>
                {['.jpg', '.webp', '.png'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
          </div>
          <div className="ck-note" style={{ marginTop: '1.2rem' }}>Recomendado: 90 a 180 frames em 1600px de largura, exportados de um vídeo curto do studio. Depois de trocar o total, recarregue a página para ver.</div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head"><h3>Textos da abertura</h3></div>
          <p style={{ color: 'var(--ink-500)', fontSize: '.86rem', margin: '.4rem 0 1.2rem' }}>Aparecem um de cada vez enquanto a pessoa rola o filme.</p>
          <div className="form-grid">
            <Field label="Linha fina" span={2}><input value={c.kicker} onChange={e => upd({ kicker: e.target.value })} /></Field>
            <Field label="Título" span={2}><textarea rows={2} value={c.title} onChange={e => upd({ title: e.target.value })} /></Field>
            <Field label="Ato I" span={2}><input value={c.l1} onChange={e => upd({ l1: e.target.value })} /></Field>
            <Field label="Ato II" span={2}><input value={c.l2} onChange={e => upd({ l2: e.target.value })} /></Field>
            <Field label="Ato III" span={2}><input value={c.l3} onChange={e => upd({ l3: e.target.value })} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => showToast('Abertura atualizada')}>Salvar textos <Icon.Check size={14} /></button>
        </div>
      </div>
    </>
  );
}

/* ——————————————————————— Perfis ——————————————————————— */
function Perfis({ store, specialists, setSpecialists, showToast }) {
  const [uploadingKey, setUploadingKey] = adUseState(null);
  const patchSpecialist = useDebouncedCallback((key, patch) => {
    adminFetch(`/specialists/${key}`, { method: 'PATCH', body: JSON.stringify(patch) })
      .catch(e => showToast('Erro ao salvar: ' + e.message));
  }, 700);
  const upd = (key, patch) => {
    setSpecialists(list => list.map(s => s.key === key ? { ...s, ...patch } : s));
    patchSpecialist(key, patch);
  };
  const pickPhoto = async (key, file) => {
    setUploadingKey(key);
    try {
      const media = await uploadMedia(file);
      upd(key, { photo_id: media.id });
      setSpecialists(list => list.map(s => s.key === key ? { ...s, photo: media.url } : s));
      showToast('Foto atualizada');
    } catch (e) {
      showToast('Erro ao enviar foto: ' + e.message);
    } finally {
      setUploadingKey(null);
    }
  };

  if (!specialists.length) return <AdminHead title="Perfis" sub="Carregando dados do servidor…" />;

  return (
    <>
      <AdminHead title="Perfis" sub="Foto, bio e números de cada especialista." />
      <div className="perfil-grid">
        {['angella', 'aline'].map(key => {
          const p = specialists.find(s => s.key === key);
          if (!p) return null;
          return (
            <div key={key} className="admin-panel">
              <PhotoField label="Foto do perfil" src={p.photo} uploading={uploadingKey === key} onPickFile={(f) => pickPhoto(key, f)} ratio="1/1" />
              <div className="form-grid" style={{ marginTop: '1.2rem' }}>
                <Field label="Nome" span={2}><input defaultValue={p.name} onChange={e => upd(key, { name: e.target.value })} /></Field>
                <Field label="Função" span={2}><input defaultValue={p.role} onChange={e => upd(key, { role: e.target.value })} /></Field>
                <Field label="Bio" span={2}><textarea rows={4} defaultValue={p.bio} onChange={e => upd(key, { bio: e.target.value })} /></Field>
                <Field label="Número 1"><input defaultValue={p.s1} onChange={e => upd(key, { s1: e.target.value })} /></Field>
                <Field label="Legenda 1"><input defaultValue={p.s1l} onChange={e => upd(key, { s1l: e.target.value })} /></Field>
                <Field label="Número 2"><input defaultValue={p.s2} onChange={e => upd(key, { s2: e.target.value })} /></Field>
                <Field label="Legenda 2"><input defaultValue={p.s2l} onChange={e => upd(key, { s2l: e.target.value })} /></Field>
              </div>
            </div>
          );
        })}
      </div>
      <div className="admin-panel" style={{ marginTop: '1.5rem', maxWidth: 520 }}>
        <PhotoField label="Foto principal (topo do site)" src={store.hero.photo} onPick={(src) => { setStore({ hero: { photo: src } }); showToast('Imagem do topo atualizada (local — ver nota abaixo)') }} ratio="4/5" />
        <p style={{ fontSize: '.78rem', color: 'var(--ink-500)', marginTop: '.8rem' }}>Essa foto ainda é local ao navegador (não ligada ao Postgres nesta rodada) — os perfis de Angella e Aline acima já são.</p>
      </div>
    </>
  );
}

function PhotoField({ label, src, onPick, onPickFile, uploading, ratio }) {
  const ref = adUseRef(null);
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="img-picker">
        <div className="img-preview" style={{ aspectRatio: ratio, width: ratio === '1/1' ? 96 : 88 }}>
          <img src={src} alt="" />
        </div>
        <div>
          <input ref={ref} type="file" accept="image/*" hidden onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            if (onPickFile) return onPickFile(f);
            onPick(await fileToDataURL(f, 1200));
          }} />
          <button className="btn btn-ghost" disabled={uploading} style={{ padding: '.7rem 1.1rem', fontSize: '.72rem' }} onClick={() => ref.current?.click()}>{uploading ? 'Enviando…' : 'Trocar imagem'}</button>
          <p style={{ fontSize: '.8rem', color: 'var(--ink-500)', marginTop: '.7rem', maxWidth: 280 }}>Recomendado: foto vertical, rosto centralizado, boa luz.</p>
        </div>
      </div>
    </div>
  );
}

/* ——————————————————————— Agenda ——————————————————————— */
// 'concluido' sem acento — precisa bater exatamente com o CHECK constraint
// de `bookings.status` no schema.sql.
const STATUSES = ['pendente', 'confirmado', 'concluido', 'cancelado', 'faltou'];

function Agenda({ bookings, setBookings, showToast }) {
  const [f, setF] = adUseState('todos');
  const rows = bookings.filter(b => f === 'todos' || b.status === f);

  const setStatus = async (id, status) => {
    const prev = bookings;
    setBookings(bs => bs.map(x => x.id === id ? { ...x, status } : x));
    try {
      await adminFetch(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast('Status atualizado');
    } catch (e) {
      setBookings(prev);
      showToast('Erro ao atualizar: ' + e.message);
    }
  };

  return (
    <>
      <AdminHead title="Agendamentos" sub="Reservas feitas no site e pela concierge IA.">
        <div className="seg">
          {['todos', ...STATUSES].map(s => <button key={s} className={f === s ? 'on' : ''} onClick={() => setF(s)}>{s}</button>)}
        </div>
      </AdminHead>
      <div className="admin-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="adm-table" style={{ minWidth: 760 }}>
          <thead><tr><th>Cliente</th><th>Serviço</th><th>Especialista</th><th>Data</th><th>Valor</th><th>Origem</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id}>
                <td><strong>{b.client}</strong>{b.phone && <div className="order-items"><a className="link-btn" href={`https://wa.me/55${String(b.phone).replace(/^55/, '')}`} target="_blank" rel="noopener">{b.phone}</a></div>}{b.note && <div className="order-items">{b.note}</div>}</td>
                <td>{b.service}</td>
                <td>{b.pro}</td>
                <td>{fmtDate(b.date)} · {b.time}</td>
                <td>{brl(b.price)}</td>
                <td><span className={`via ${b.via}`}>{b.via === 'ia' ? 'IA' : 'Site'}</span></td>
                <td>
                  <select className={`status-sel ${b.status}`} value={b.status}
                    onChange={e => setStatus(b.id, e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-500)' }}>Nenhum agendamento com esse status.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* —————————————————— Massoterapia (aba da Aline) —————————————————— */
function WellnessAdmin({ store, showToast }) {
  const w = store.wellness;
  const upd = (patch) => setStore(s => ({ wellness: { ...s.wellness, ...patch } }));
  const setSession = (i, patch) => upd({ sessions: w.sessions.map((s, j) => j === i ? { ...s, ...patch } : s) });
  const addSession = () => upd({ sessions: [...w.sessions, { id: uid('ws'), name: 'Nova sessão', time: '60 min', price: 'R$ 200', body: 'Descreva a técnica, o ritmo e para quem é indicada.' }] });
  const delSession = (i) => upd({ sessions: w.sessions.filter((_, j) => j !== i) });
  const setCare = (i, patch) => upd({ care: w.care.map((c, j) => j === i ? { ...c, ...patch } : c) });

  return (
    <>
      <AdminHead title="Massoterapia" sub="A página da Aline Maria. Tudo aqui aparece na aba Massoterapia do site — inclusive as sessões que podem ser agendadas." />

      <div className="admin-panel">
        <div className="admin-panel-head"><h3>Abertura da página</h3></div>
        <div className="form-grid">
          <Field label="Linha fina" span={2}><input value={w.kicker} onChange={e => upd({ kicker: e.target.value })} /></Field>
          <Field label="Título" span={2}><textarea rows={2} value={w.title} onChange={e => upd({ title: e.target.value })} /></Field>
          <Field label="Texto de apresentação" span={2}><textarea rows={3} value={w.lede} onChange={e => upd({ lede: e.target.value })} /></Field>
        </div>
        <div className="ck-note" style={{ marginTop: '1rem' }}>No título, use <code>&lt;br/&gt;</code> para quebrar a linha e <code>&lt;em&gt;palavra&lt;/em&gt;</code> para deixar em itálico vinho.</div>
      </div>

      <div className="admin-panel" style={{ marginTop: '1.5rem' }}>
        <div className="admin-panel-head">
          <h3>Sessões</h3>
          <button className="btn btn-primary btn-sm" onClick={addSession}>Nova sessão</button>
        </div>
        <div className="form-grid" style={{ marginBottom: '1.4rem' }}>
          <Field label="Linha fina da seção"><input value={w.listKicker} onChange={e => upd({ listKicker: e.target.value })} /></Field>
          <Field label="Título da seção"><input value={w.listTitle} onChange={e => upd({ listTitle: e.target.value })} /></Field>
        </div>
        {w.sessions.map((s, i) => (
          <div key={s.id} className="ws-admin-row">
            <div className="form-grid">
              <Field label="Nome" span={2}><input value={s.name} onChange={e => setSession(i, { name: e.target.value })} /></Field>
              <Field label="Duração"><input value={s.time} onChange={e => setSession(i, { time: e.target.value })} placeholder="60 min" /></Field>
              <Field label="Preço"><input value={s.price} onChange={e => setSession(i, { price: e.target.value })} placeholder="R$ 220" /></Field>
              <Field label="Descrição" span={2}><textarea rows={2} value={s.body} onChange={e => setSession(i, { body: e.target.value })} /></Field>
            </div>
            <button className="link-btn danger" onClick={() => delSession(i)}>Remover sessão</button>
          </div>
        ))}
      </div>

      <div className="admin-panel" style={{ marginTop: '1.5rem' }}>
        <div className="admin-panel-head"><h3>Antes, durante e depois</h3></div>
        <div className="form-grid" style={{ marginBottom: '1.4rem' }}>
          <Field label="Linha fina da seção"><input value={w.careKicker} onChange={e => upd({ careKicker: e.target.value })} /></Field>
          <Field label="Título da seção"><input value={w.careTitle} onChange={e => upd({ careTitle: e.target.value })} /></Field>
        </div>
        <div className="form-grid">
          {w.care.map((c, i) => (
            <React.Fragment key={i}>
              <Field label="Etapa"><input value={c.k} onChange={e => setCare(i, { k: e.target.value })} /></Field>
              <Field label="Orientação"><textarea rows={2} value={c.v} onChange={e => setCare(i, { v: e.target.value })} /></Field>
            </React.Fragment>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1.2rem' }} onClick={() => showToast('Página de massoterapia atualizada')}>Salvar <Icon.Check size={14} /></button>
      </div>

      <div className="ck-note" style={{ marginTop: '1.5rem' }}>A foto e a biografia da Aline ficam na aba <strong>Perfis</strong>. As sessões listadas aqui alimentam o agendamento da página de massoterapia.</div>
    </>
  );
}

/* ——————————————————————— Shared bits ——————————————————————— */
function AdminHead({ title, sub, children }) {
  return (
    <div className="admin-head">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function Field({ label, children, span = 1 }) {
  return (
    <label className="field" style={{ gridColumn: `span ${span}` }}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose, onSave, saving }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="drawer-close" onClick={onClose}><Icon.Close /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'} <Icon.Check size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

Object.assign(window, { Admin, AdminHead, Field, Modal, fmtDate });
