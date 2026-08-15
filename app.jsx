// Main app — nav, hero, services, specialists, gallery, shop, booking, footer, cart, AI concierge, admin.
const { useState, useEffect, useRef } = React;

const SERVICES_DATA = [
  {
    n: '01', title: 'Salão de Beleza', icon: 'Scissors', tags: ['Corte', 'Coloração', 'Tratamentos', 'Penteados'],
    body: 'Cortes autorais, coloração premium e tratamentos profundos. Cada fio recebe atenção personalizada — da consulta de cor à finalização.'
  },
  {
    n: '02', title: 'Massoterapia', icon: 'Leaf', tags: ['Relaxante', 'Drenagem', 'Modeladora', 'Pedras Quentes'],
    body: 'Toque terapêutico para corpo e mente. Drenagem linfática, massagem relaxante, depilação e protocolos de bem-estar em ambiente acolhedor.'
  },
  {
    n: '03', title: 'Loja Exclusiva', icon: 'Sparkle', tags: ['Capilares', 'Óleos', 'Aromaterapia', 'Skincare'],
    body: 'Curadoria exclusiva de produtos premium — os mesmos que usamos no atendimento, agora para continuar o ritual em casa.'
  },
];

function App() {
  const store = useStore();
  const pendingScrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [favs, setFavs] = useState({});
  const [toast, setToast] = useState(null);
  const [added, setAdded] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [galFilter, setGalFilter] = useState('Todas');
  const [page, setPage] = useState(() => (location.hash === '#massoterapia' ? 'massoterapia' : 'studio'));
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => window.Motion && window.Motion.init({ ...(store.cinema || {}), poster: store.hero.photo }), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => window.Motion && window.Motion.refresh(), 240);
    return () => clearTimeout(t);
  }, [galFilter, store.gallery, store.products, store.instagram]);

  useEffect(() => {
    const locked = cartOpen || aiOpen || adminOpen || checkoutOpen || menuOpen || !!lightbox;
    window.Motion && window.Motion.lock(locked);
  }, [cartOpen, aiOpen, adminOpen, checkoutOpen, menuOpen, lightbox]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', !!menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  useEffect(() => {
    const on = () => {
      const next = location.hash === '#massoterapia' ? 'massoterapia' : 'studio';
      setPage(prev => {
        if (prev !== next) window.Motion && window.Motion.reset();
        return next;
      });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => window.Motion && window.Motion.build(), 140);
    return () => clearTimeout(t);
  }, [page]);

  useEffect(() => {
    if (page !== 'studio' || !pendingScrollRef.current) return;
    const id = pendingScrollRef.current;
    let tries = 0;
    let cancelled = false;

    const jump = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (!el) {
        tries += 1;
        if (tries < 14) setTimeout(jump, 120);
        return;
      }

      pendingScrollRef.current = null;
      if (window.Motion) {
        window.Motion.refresh && window.Motion.refresh();
        window.Motion.scrollTo(el);
      } else {
        window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
      }

      // Reforço para dispositivos lentos: se não saiu do topo, corrige com scroll nativo.
      setTimeout(() => {
        if (cancelled) return;
        const top = Math.max(0, el.offsetTop - 70);
        if (window.scrollY < top - 120) {
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 480);
    };

    const t = setTimeout(jump, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page]);

  const goPage = (p, opts = {}) => {
    setMenuOpen(false);
    if (p === page) return;
    window.Motion && window.Motion.reset();
    history.replaceState(null, '', p === 'massoterapia' ? '#massoterapia' : location.pathname);
    setPage(p);
    if (!opts.skipTop) window.scrollTo(0, 0);
  };

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2200);
  };

  const addToCart = (p) => {
    setCart(prev => ({ ...prev, [p.id]: { p, qty: (prev[p.id]?.qty || 0) + 1 } }));
    setAdded(p.id);
    setTimeout(() => setAdded(null), 700);
    showToast(`${p.name} adicionado à sacola`);
  };
  const setQty = (id, q) => setCart(prev => {
    const next = { ...prev };
    if (q <= 0) delete next[id]; else next[id] = { ...next[id], qty: q };
    return next;
  });
  const toggleFav = (id) => setFavs(prev => ({ ...prev, [id]: !prev[id] }));

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((a, b) => a + b.qty, 0);
  const cartTotal = cartItems.reduce((a, b) => a + b.p.priceN * b.qty, 0);

  const scrollTo = (id) => {
    setMenuOpen(false);
    if (page !== 'studio') {
      pendingScrollRef.current = id;
      goPage('studio', { skipTop: true });
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    if (window.Motion) setTimeout(() => window.Motion.scrollTo(el), 60);
    else window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  };

  const goSection = (e, id) => {
    e && e.preventDefault && e.preventDefault();
    scrollTo(id);
  };

  const goMassoterapia = (e) => {
    e && e.preventDefault && e.preventDefault();
    setMenuOpen(false);
    goPage('massoterapia');
  };

  const openMenu = (e) => {
    e && e.preventDefault && e.preventDefault();
    setMenuOpen(true);
  };

  const closeMenu = (e) => {
    e && e.preventDefault && e.preventDefault();
    setMenuOpen(false);
  };

  const cats = ['Todas', ...Array.from(new Set(store.gallery.map(g => g.cat)))];
  const shots = galFilter === 'Todas' ? store.gallery : store.gallery.filter(g => g.cat === galFilter);
  const A = store.profiles.angella, L = store.profiles.aline;

  return (
    <>
      <nav className={`nav ${page === 'studio' ? 'over-hero' : ''} ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <a href="#" className="brand" onClick={(e) => { e.preventDefault(); goPage('studio'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <img className="brand-mark" src="assets/logo-icon.png" alt="" />
            <span className="brand-text">
              Angella Barros
              <small>Studio de Beleza · Parintins AM</small>
            </span>
          </a>
          <div className="nav-links">
            <a href="#servicos" onClick={(e) => goSection(e, 'servicos')}>Serviços</a>
            <a href="#galeria" onClick={(e) => goSection(e, 'galeria')}>Galeria</a>
            <a href="#instagram" onClick={(e) => goSection(e, 'instagram')}>Instagram</a>
            <a href="#loja" onClick={(e) => goSection(e, 'loja')}>Loja</a>
            <a href="#massoterapia" className={page === 'massoterapia' ? 'on' : ''} onClick={goMassoterapia}>Massoterapia</a>
            <a href="#agendar" onClick={(e) => goSection(e, 'agendar')}>Agendar</a>
          </div>
          <div className="nav-cart">
            <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label="Sacola">
              <Icon.Bag size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            <button className="menu-toggle" onClick={openMenu} onPointerDown={openMenu} aria-label="Menu"><Icon.Menu /></button>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="brand"><img className="brand-mark" src="assets/logo-icon.png" alt="" />Angella Barros</div>
          <button onClick={closeMenu} onPointerDown={closeMenu} style={{ width: 42, height: 42 }}><Icon.Close /></button>
        </div>
        <a href="#servicos" onClick={(e) => goSection(e, 'servicos')}>Serviços</a>
        <a href="#galeria" onClick={(e) => goSection(e, 'galeria')}>Galeria</a>
        <a href="#instagram" onClick={(e) => goSection(e, 'instagram')}>Instagram</a>
        <a href="#loja" onClick={(e) => goSection(e, 'loja')}>Loja</a>
        <a href="#massoterapia" onClick={goMassoterapia}>Massoterapia</a>
        <a href="#agendar" onClick={(e) => goSection(e, 'agendar')}>Agendar</a>
      </div>

      {page === 'studio' ? (<>
        <CinemaHero onBook={() => scrollTo('agendar')} onAi={() => setAiOpen(true)} />

        <section id="servicos" className="section services">
          <div className="container">
            <div className="section-head reveal">
              <div className="gold-rule center">Tríade de Serviços</div>
              <h2>Três caminhos.<br />Um mesmo cuidado.</h2>
            </div>
            <div className="services-grid">
              {SERVICES_DATA.map((s, i) => {
                const IconEl = Icon[s.icon];
                return (
                  <div key={s.n} className="service-card reveal" style={{ transitionDelay: `${i * 80}ms` }} onClick={() => scrollTo(i === 2 ? 'loja' : 'agendar')}>
                    <div className="service-arrow"><Icon.ArrowUR /></div>
                    <div className="service-num">— {s.n}</div>
                    <div className="service-icon"><IconEl size={28} /></div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                    <div className="service-tags">{s.tags.map(t => <span key={t} className="service-tag">{t}</span>)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="especialistas" className="section spec">
          <div className="container">
            <div className="section-head reveal">
              <div className="gold-rule center">A especialista</div>
              <h2>Angella Barros</h2>
              <p>Coloração autoral, cortes e tratamentos conduzidos por quem abriu o studio em 2018 e atende cada cliente pessoalmente.</p>
            </div>
            <div className="spec-solo">
              <div className="spec-solo-photo zoom-in"><img src={A.photo} alt={A.name} style={{ objectPosition: A.objectPosition }} /></div>
              <div className="spec-solo-body reveal">
                <div className="spec-role">{A.role}</div>
                <p className="spec-bio">{A.bio}</p>
                <div className="spec-meta">
                  <div><strong>{A.s1}</strong><span>{A.s1l}</span></div>
                  <div><strong>{A.s2}</strong><span>{A.s2l}</span></div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => scrollTo('agendar')}>Agendar com Angella <Icon.Arrow size={14} /></button>
              </div>
            </div>
            <button className="spec-cross reveal" onClick={() => goPage('massoterapia')}>
              <div className="spec-cross-img"><img src={L.photo} alt={L.name} /></div>
              <div>
                <div className="gold-rule">Também no studio</div>
                <h3>Massoterapia com {L.name}</h3>
                <p>Drenagem linfática, massagem relaxante, modeladora e pedras quentes — em cabine privada.</p>
              </div>
              <span className="spec-cross-go"><Icon.ArrowUR size={16} /></span>
            </button>
          </div>
        </section>

        <section id="galeria" className="gal-h">
          <div className="gal-h-head">
            <div>
              <div className="gold-rule">Galeria</div>
              <h2>Nosso trabalho, em imagens.</h2>
            </div>
            <div className="gal-filters">
              {cats.map(c => <button key={c} className={`gal-filter ${galFilter === c ? 'on' : ''}`} onClick={() => setGalFilter(c)}>{c}</button>)}
            </div>
          </div>
          <div className="h-track">
            {shots.map((g, i) => (
              <figure key={g.id} className="h-panel" onClick={() => setLightbox(g)}>
                <div className="h-media"><img src={g.src} alt={g.caption} loading="lazy" /></div>
                <figcaption className="h-cap">
                  <span>{g.caption}<br /><em>{g.cat}</em></span>
                  <span className="h-num">{String(i + 1).padStart(2, '0')}</span>
                </figcaption>
              </figure>
            ))}
            {!shots.length && <p style={{ color: 'var(--ink-500)' }}>Nenhuma foto nesta categoria ainda.</p>}
          </div>
        </section>

        {lightbox && (
          <div className="lightbox" onClick={() => setLightbox(null)}>
            <img src={lightbox.src} alt={lightbox.caption} />
            <div className="cap">{lightbox.caption}</div>
          </div>
        )}

        <InstagramSection showToast={showToast} />

        <section id="loja" className="section products">        <div className="container">
          <div className="products-head reveal">
            <div>
              <div className="gold-rule">Loja Exclusiva</div>
              <h2 style={{ marginTop: '1rem' }}>Continue o ritual em casa.</h2>
            </div>
            <button className="btn btn-ghost" onClick={() => setAiOpen(true)}>Pedir indicação à IA <Icon.Arrow size={14} /></button>
          </div>
          <div className="products-grid">
            {store.products.map((p, i) => (
              <article key={p.id} className="product reveal" style={{ transitionDelay: `${(i % 4) * 70}ms` }}>
                <div className="product-img" style={{ background: i % 2 === 0 ? 'var(--cream-100)' : '#fff' }}>
                  {p.tag && <div className={`product-tag ${p.tagClass || ''}`}>{p.tag}</div>}
                  <button className={`product-fav ${favs[p.id] ? 'active' : ''}`} onClick={() => toggleFav(p.id)} aria-label="Favoritar">
                    <Icon.Heart filled={!!favs[p.id]} />
                  </button>
                  {p.img
                    ? <img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                    : <Bottle tone={p.tone} style={p.style} />}
                </div>
                <div className="product-body">
                  <div className="product-cat">{p.cat}</div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-foot">
                    <div className="product-price">{brl(p.priceN)}</div>
                    <button className={`product-add ${added === p.id ? 'added' : ''}`} onClick={() => addToCart(p)} aria-label="Adicionar">
                      {added === p.id ? <Icon.Check size={14} /> : <Icon.Plus size={16} />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        </section>

        <Booking showToast={showToast} />
      </>) : (
        <Wellness showToast={showToast} onBook={() => { const el = document.getElementById('agendar'); if (!el) return; window.Motion ? window.Motion.scrollTo(el) : window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' }); }} />
      )}

      <footer className="foot">
        <div className="container">
          <div className="foot-grid">
            <div>
              <div className="brand"><img className="brand-mark" src="assets/logo-icon.png" alt="" />Angella Barros</div>
              <p>Studio de beleza e bem-estar em Parintins, Amazonas. Por agendamento — atendimento exclusivo.</p>
              <div className="socials">
                <a href={store.instagram?.url} target="_blank" rel="noopener" aria-label="Instagram"><Icon.Instagram /></a>
                <a href="#" aria-label="TikTok"><Icon.Tiktok /></a>
                <a href="#" aria-label="Facebook"><Icon.Facebook /></a>
              </div>
            </div>
            <div>
              <h4>Studio</h4>
              <ul>
                <li><a href="#massoterapia" onClick={goMassoterapia}>Massoterapia</a></li>
                <li><a href="#servicos" onClick={(e) => goSection(e, 'servicos')}>Serviços</a></li>
                <li><a href="#galeria" onClick={(e) => goSection(e, 'galeria')}>Galeria</a></li>
                <li><a href={store.instagram?.url} target="_blank" rel="noopener">Instagram</a></li>
                <li><a href="#loja" onClick={(e) => goSection(e, 'loja')}>Loja</a></li>
              </ul>
            </div>
            <div>
              <h4>Cliente</h4>
              <ul>
                <li><a href="#agendar" onClick={(e) => goSection(e, 'agendar')}>Agendar</a></li>
                <li><a onClick={() => setAiOpen(true)}>Atendimento IA</a></li>
                <li><a>Política de privacidade</a></li>
                <li><a>Trocas e devoluções</a></li>
              </ul>
            </div>
            <div>
              <h4>Dicas de Beleza</h4>
              <p style={{ marginBottom: '1.2rem' }}>Rituais, novidades e bastidores — uma vez por mês, no seu e-mail.</p>
              <form className="news" onSubmit={(e) => { e.preventDefault(); e.target.reset(); showToast('Inscrição confirmada — obrigada!') }}>
                <input type="email" placeholder="seu@email.com" required />
                <button type="submit" aria-label="Assinar"><Icon.Arrow size={14} /></button>
              </form>
              <div style={{ marginTop: '1.4rem', display: 'flex', alignItems: 'center', gap: '.6rem', color: 'rgba(249,245,242,.55)', fontSize: '.85rem' }}>
                <Icon.Pin size={16} />
                <span>Centro · Parintins — Amazonas</span>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Angella Barros Studio de Beleza. Todos os direitos reservados.</span>
            <button className="foot-admin" onClick={() => setAdminOpen(true)}>Painel administrativo →</button>
          </div>
        </div>
      </footer>

      <a href={`https://wa.me/${(store.settings.contact.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener" className="wa">
        <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <Icon.Whatsapp size={20} />
          <span className="wa-pulse" />
        </span>
        WhatsApp
      </a>

      <button className="ai-fab" onClick={() => setAiOpen(true)}>
        <span className="spark"><Icon.Sparkle size={18} /></span>
        <span className="lbl">Atendimento IA</span>
      </button>

      <div className={`scrim ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`drawer ${cartOpen ? 'open' : ''}`}>
        <div className="drawer-head">
          <h3>Sua Sacola{cartCount > 0 ? ` · ${cartCount}` : ''}</h3>
          <button className="drawer-close" onClick={() => setCartOpen(false)}><Icon.Close /></button>
        </div>
        <div className="drawer-body">
          {cartItems.length === 0 ? (
            <div className="drawer-empty">
              <Icon.Bag size={42} />
              <p style={{ marginTop: '.4rem' }}>Sua sacola está vazia.</p>
              <p style={{ fontSize: '.82rem', marginTop: '.4rem' }}>Explore a loja exclusiva para começar.</p>
            </div>
          ) : cartItems.map(({ p, qty }) => (
            <div key={p.id} className="cart-item">
              <div className="cart-item-img">
                {p.img ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: 34, height: '100%' }}><Bottle tone={p.tone} style={p.style} /></div>}
              </div>
              <div>
                <div className="cart-item-name">{p.name}</div>
                <div className="cart-item-meta">{p.cat}</div>
                <div className="qty">
                  <button onClick={() => setQty(p.id, qty - 1)} aria-label="Diminuir"><Icon.Minus size={12} /></button>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', minWidth: 18, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(p.id, qty + 1)} aria-label="Aumentar"><Icon.Plus size={12} /></button>
                </div>
              </div>
              <div className="cart-item-price">{brl(p.priceN * qty)}</div>
            </div>
          ))}
        </div>
        {cartItems.length > 0 && (
          <div className="drawer-foot">
            <div className="totals"><span>Subtotal</span><span>{brl(cartTotal)}</span></div>
            <small>{cartTotal >= (+store.settings.delivery.freeAbove || 0) ? 'Frete grátis em Parintins · pague com Pix ou cartão.' : `Entrega em Parintins ${brlc(store.settings.delivery.localFee)} · grátis acima de ${brl(store.settings.delivery.freeAbove)}.`}</small>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>Finalizar Compra <Icon.Arrow size={14} /></button>
          </div>
        )}
      </aside>

      <AIConcierge open={aiOpen} onClose={() => setAiOpen(false)} showToast={showToast} />
      <Checkout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} items={cartItems} total={cartTotal} onDone={() => setCart({})} showToast={showToast} />
      <Admin open={adminOpen} onClose={() => setAdminOpen(false)} showToast={showToast} />

      <div className={`toast ${toast ? 'show' : ''}`}>
        <Icon.Check size={16} />
        <span>{toast}</span>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
