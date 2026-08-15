// Página Massoterapia — o espaço da Aline Maria, dentro do studio. Conteúdo editável no painel.
function Wellness({ showToast, onBook }) {
  const store = useStore();
  const L = store.profiles.aline;
  const w = store.wellness;
  const waWellness = (w.contactWhatsapp || store.settings.contact.whatsapp || '').replace(/\D/g, '');
  const fallbackPromo = {
    src: w.promoImage || 'assets/imgs/Captura de tela de 2026-08-15 14-44-32.png',
    alt: w.promoAlt || 'Arte promocional da Massoterapia'
  };
  const promoImages = Array.isArray(w.promoImages) && w.promoImages.length
    ? w.promoImages
    : [
      fallbackPromo,
      { src: 'assets/imgs/Captura de tela de 2026-08-15 14-45-29.png', alt: 'Arte de estética corporal da Massoterapia' },
      { src: 'assets/imgs/Captura de tela de 2026-08-15 14-46-15.png', alt: 'Arte de epilação com cera da Massoterapia' },
    ];
  return (
    <>
      <header className="ws-hero">
        <div className="container ws-hero-grid">
          <div className="reveal visible">
            <div className="gold-rule">{w.kicker}</div>
            <h1 dangerouslySetInnerHTML={{ __html: w.title }} />
            <p className="ws-lede">{w.lede}</p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={onBook}>Agendar sessão <Icon.Arrow size={14} /></button>
              <a className="btn btn-ghost" href={`https://wa.me/${waWellness}`} target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a>
            </div>
          </div>
          <div className="ws-hero-photo zoom-in visible">
            <img src={L.photo} alt={L.name} style={{ objectPosition: L.objectPosition }} />
          </div>
        </div>
      </header>

      <section className="section ws-promo">
        <div className="container">
          <div className="ws-promo-grid">
            {promoImages.map((item, idx) => (
              <div key={item.src || idx} className="ws-promo-card reveal">
                <img src={item.src} alt={item.alt || 'Arte promocional da Massoterapia'} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section ws-list">
        <div className="container">
          <div className="section-head">
            <div className="gold-rule center">{w.listKicker}</div>
            <h2>{w.listTitle}</h2>
          </div>
          <div className="ws-grid">
            {(w.sessions || []).map((m, i) => (
              <article key={m.id} className="ws-card reveal">
                <div className="service-num">— {String(i + 1).padStart(2, '0')}</div>
                <h3>{m.name}</h3>
                <p>{m.body}</p>
                <div className="ws-card-foot">
                  <span><Icon.Clock size={14} /> {m.time}</span>
                  <span className="ws-price">{m.price}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section ws-about">
        <div className="container ws-about-grid">
          <div className="ws-about-photo mask-in">
            <img src={L.photo} alt={L.name} />
          </div>
          <div className="reveal">
            <div className="gold-rule">A terapeuta</div>
            <h2 className="ws-about-name">{L.name}</h2>
            <div className="spec-role">{L.role}</div>
            <p className="spec-bio">{L.bio}</p>
            <div className="spec-meta">
              <div><strong>{L.s1}</strong><span>{L.s1l}</span></div>
              <div><strong>{L.s2}</strong><span>{L.s2l}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section ws-care">
        <div className="container">
          <div className="section-head">
            <div className="gold-rule center">{w.careKicker}</div>
            <h2>{w.careTitle}</h2>
          </div>
          <div className="ws-care-grid">
            {(w.care || []).map(c => (
              <div key={c.k} className="ws-care-item reveal">
                <div className="ws-care-k">{c.k}</div>
                <p>{c.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Booking showToast={showToast} only="Massoterapia" proId="aline" />
    </>
  );
}

Object.assign(window, { Wellness });
