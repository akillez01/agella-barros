// Abertura cinematográfica — canvas com sequência de frames (ou foto única), sincronizado ao scroll.
function CinemaHero({onBook, onAi}) {
  const store = useStore();
  const c = store.cinema;
  return (
    <header id="hero" className="cine">
      <div className="cine-stage">
        <canvas id="film"></canvas>
        <div className="cine-veil"></div>
        <div className="cine-copy">
          <div className="ho-intro">
            <div className="gold-rule cine-kicker">{c.kicker}</div>
            <h1>{c.title}</h1>
            <div className="hero-ctas">
              <button className="btn btn-cream" onClick={onBook}>Agendar Serviço <Icon.Arrow size={14}/></button>
              <button className="btn btn-outline" onClick={onAi}>Falar com a Bela · IA</button>
            </div>
          </div>
          <div className="ho-beat ho-1"><h2>{c.l1}</h2></div>
          <div className="ho-beat ho-2"><h2>{c.l2}</h2></div>
          <div className="ho-beat ho-3"><h2>{c.l3}</h2></div>
        </div>
        <div className="hero-hud">
          <div className="hud-l"><span className="hud-k">Ato</span> <span id="hudAto">I</span></div>
          <div className="hud-scroll"><span>role para revelar</span><i/></div>
          <div className="hud-r"><span className="hud-k">Sequência</span> <span id="hudPct">00</span></div>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { CinemaHero });
