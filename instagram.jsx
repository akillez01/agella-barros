// Instagram integration — profile header + live-style feed grid, all editable from the admin panel.
const { useState: igUseState, useEffect: igUseEffect } = React;

/* ——— Atualização automática das publicações ———
   Dois caminhos, na ordem de preferência:
   1) proxy: um endpoint do seu servidor que devolve {data:[…]} — o token fica seguro lá.
   2) token direto na Instagram Graph API (bom para testar; o token vence a cada 60 dias).
   Sem nenhum dos dois, o site usa as publicações escolhidas à mão no painel. */
async function fetchInstagramFeed(sync) {
  const limit = +sync.limit || 9;
  let url;
  if (sync.proxy) {
    url = sync.proxy + (sync.proxy.includes('?') ? '&' : '?') + 'limit=' + limit;
  } else {
    if (!sync.token) throw new Error('Sem token nem endpoint configurado');
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    url = `https://graph.instagram.com/${sync.userId || 'me'}/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(sync.token)}`;
  }
  const r = await fetch(url, {cache:'no-store'});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || ('HTTP ' + r.status));
  const raw = j.data || j.feed || [];
  if (!raw.length) throw new Error('Nenhuma publicação retornada');
  return raw.slice(0, limit).map(m => ({
    id: 'ig_' + m.id,
    src: m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url,
    caption: (m.caption || '').split('\n')[0].slice(0, 220),
    permalink: m.permalink,
    date: m.timestamp,
    type: m.media_type === 'VIDEO' ? 'reel' : m.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'photo',
    likes: m.like_count != null ? String(m.like_count) : '',
    comments: m.comments_count != null ? String(m.comments_count) : '',
    tags: ((m.caption || '').match(/#[\wÀ-ÿ]+/g) || []).slice(0, 3),
  }));
}

async function syncInstagram(cfg = {}, {silent = true} = {}) {
  try {
    const feed = await fetchInstagramFeed(cfg);
    setStore(s => ({instagram: {...s.instagram, feed, sync: {...s.instagram.sync, lastSync: new Date().toISOString(), lastError: ''}}}));
    return {ok: true, count: feed.length};
  } catch (e) {
    setStore(s => ({instagram: {...s.instagram, sync: {...s.instagram.sync, lastError: String(e.message || e), lastSync: s.instagram.sync.lastSync}}}));
    if (!silent) console.warn('Instagram sync', e);
    return {ok: false, error: String(e.message || e)};
  }
}

function InstagramSection({showToast}) {
  const store = useStore();
  const ig = store.instagram;
  const [lb, setLb] = igUseState(null);
  const sync = ig?.sync || {};

  // atualiza sozinho: ao abrir o site e a cada "everyMin" minutos
  igUseEffect(() => {
    if (!sync.enabled || (!sync.token && !sync.proxy)) return;
    const every = Math.max(5, +sync.everyMin || 60) * 60000;
    const age = sync.lastSync ? Date.now() - new Date(sync.lastSync).getTime() : Infinity;
    if (age > every) syncInstagram(sync);
    const t = setInterval(() => syncInstagram(sync), every);
    return () => clearInterval(t);
  }, [sync.enabled, sync.token, sync.proxy, sync.everyMin]);

  if (!ig) return null;
  const url = ig.url || `https://instagram.com/${(ig.handle||'').replace('@','')}`;

  return (
    <section id="instagram" className="section ig">
      <div className="container">
        <div className="ig-profile reveal">
          <div className="ig-avatar-ring">
            <img src={ig.avatar} alt={ig.handle}/>
          </div>
          <div className="ig-profile-main">
            <div className="ig-handle-row">
              <a href={url} target="_blank" rel="noopener" className="ig-handle">{ig.handle}</a>
              <a href={url} target="_blank" rel="noopener" className="btn btn-primary ig-follow"><Icon.Instagram size={15}/> Seguir</a>
            </div>
            <div className="ig-stats">
              <div><strong>{ig.posts}</strong> publicações</div>
              <div><strong>{ig.followers}</strong> seguidores</div>
              <div><strong>{ig.following}</strong> seguindo</div>
            </div>
            <p className="ig-bio">{ig.bio}</p>
          </div>
        </div>

        <div className="ig-grid">
          {(ig.feed||[]).map((post, i) => (
            <button key={post.id} className="ig-post reveal" style={{transitionDelay:`${(i%6)*60}ms`}} onClick={()=>setLb(post)}>
              <img src={post.src} alt={post.caption} loading="lazy"/>
              {post.type === 'reel' && <span className="ig-type"><Icon.Play size={13}/></span>}
              {post.type === 'carousel' && <span className="ig-type"><Icon.Layers size={13}/></span>}
              <div className="ig-hover">
                {post.likes ? <span><Icon.Heart size={16} filled/> {post.likes}</span> : null}
                {post.comments ? <span><Icon.Comment size={16}/> {post.comments}</span> : null}
                {!post.likes && !post.comments ? <span><Icon.Instagram size={16}/> ver no Instagram</span> : null}
              </div>
            </button>
          ))}
        </div>

        <div className="ig-foot reveal">
          <a href={url} target="_blank" rel="noopener" className="btn btn-ghost">Ver perfil completo no Instagram <Icon.ArrowUR size={13}/></a>
        </div>
      </div>

      {lb && (
        <div className="lightbox ig-lightbox" onClick={()=>setLb(null)}>
          <div className="ig-modal" onClick={e=>e.stopPropagation()}>
            <div className="ig-modal-img"><img src={lb.src} alt={lb.caption}/></div>
            <div className="ig-modal-side">
              <div className="ig-modal-head">
                <img src={ig.avatar} alt=""/>
                <div>
                  <div className="ig-modal-handle">{ig.handle}</div>
                  <div className="ig-modal-loc">Parintins · Amazonas</div>
                </div>
                <button className="drawer-close" onClick={()=>setLb(null)}><Icon.Close/></button>
              </div>
              <div className="ig-modal-body">
                <p><strong>{ig.handle}</strong> {lb.caption}</p>
                <div className="ig-modal-tags">{(lb.tags||['#angellabarrosstudio','#parintins']).map(t => <span key={t}>{t}</span>)}</div>
              </div>
              <div className="ig-modal-foot">
                <div className="ig-modal-acts"><Icon.Heart size={20}/><Icon.Comment size={20}/></div>
                <div className="ig-modal-likes">{lb.likes ? `${lb.likes} curtidas` : (lb.date ? new Date(lb.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'long'}) : '')}</div>
                <a href={lb.permalink || url} target="_blank" rel="noopener" className="btn btn-primary" style={{width:'100%',marginTop:'1rem'}}>Abrir no Instagram <Icon.ArrowUR size={13}/></a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* Admin tab for the Instagram integration */
function InstagramAdmin({store, showToast}) {
  const ig = store.instagram;
  const fileRef = React.useRef(null);
  const avaRef = React.useRef(null);
  const upd = (patch) => setStore(s => ({instagram: {...s.instagram, ...patch}}));

  const addPosts = async (files) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    const items = [];
    for (const f of list) {
      const src = await fileToDataURL(f, 1100);
      items.push({id: uid('ig'), src, caption: f.name.replace(/\.[^.]+$/,''), likes: 0, comments: 0, type:'photo'});
    }
    upd({feed: [...items, ...(ig.feed||[])]});
    showToast(`${items.length} publicação${items.length>1?'ões':''} adicionada${items.length>1?'s':''}`);
  };

  return (
    <>
      <AdminHead title="Instagram" sub="Conecte o perfil e escolha as publicações que aparecem no site.">
        <button className="btn btn-primary" onClick={()=>fileRef.current?.click()}><Icon.Plus size={14}/> Nova publicação</button>
      </AdminHead>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>addPosts(e.target.files)}/>

      <IgSync ig={ig} upd={upd} showToast={showToast}/>

      <div className="admin-panel">
        <div className="ig-conn">
          <div className="ig-conn-badge"><Icon.Instagram size={20}/></div>
          <div style={{flex:1}}>
            <strong>Perfil conectado</strong>
            <p>As informações abaixo alimentam a seção Instagram do site.</p>
          </div>
          <span className="pill confirmado">ativo</span>
        </div>
        <div className="form-grid" style={{marginTop:'1.4rem'}}>
          <Field label="@ do perfil"><input value={ig.handle} onChange={e=>upd({handle:e.target.value})} placeholder="@seuperfil"/></Field>
          <Field label="Link do perfil"><input value={ig.url} onChange={e=>upd({url:e.target.value})} placeholder="https://instagram.com/…"/></Field>
          <Field label="Publicações"><input value={ig.posts} onChange={e=>upd({posts:e.target.value})}/></Field>
          <Field label="Seguidores"><input value={ig.followers} onChange={e=>upd({followers:e.target.value})}/></Field>
          <Field label="Seguindo"><input value={ig.following} onChange={e=>upd({following:e.target.value})}/></Field>
          <Field label="Bio do perfil" span={2}><textarea rows={3} value={ig.bio} onChange={e=>upd({bio:e.target.value})}/></Field>
          <Field label="Foto do perfil" span={2}>
            <div className="img-picker">
              <div className="img-preview" style={{width:76,aspectRatio:'1/1',borderRadius:'999px'}}><img src={ig.avatar} alt=""/></div>
              <div>
                <input ref={avaRef} type="file" accept="image/*" hidden onChange={async e=>{const f=e.target.files?.[0]; if(f){upd({avatar: await fileToDataURL(f, 500)}); showToast('Foto do perfil atualizada');}}}/>
                <button className="btn btn-ghost" style={{padding:'.7rem 1.1rem',fontSize:'.72rem'}} onClick={()=>avaRef.current?.click()}>Trocar foto</button>
              </div>
            </div>
          </Field>
        </div>
      </div>

      <div className="admin-panel" style={{marginTop:'1.5rem'}}>
        <div className="admin-panel-head"><h3>Publicações no site ({(ig.feed||[]).length})</h3></div>
        <div className="gal-grid" style={{marginTop:'1rem'}}>
          {(ig.feed||[]).map(p => (
            <div key={p.id} className="gal-item">
              <img src={p.src} alt={p.caption}/>
              <div className="gal-overlay">
                <input className="gal-cap" value={p.caption} onChange={e=>upd({feed: ig.feed.map(x=>x.id===p.id?{...x,caption:e.target.value}:x)})}/>
                <div style={{display:'flex',gap:'.35rem'}}>
                  <input className="gal-cap" style={{width:'50%'}} value={p.likes} onChange={e=>upd({feed: ig.feed.map(x=>x.id===p.id?{...x,likes:e.target.value}:x)})} placeholder="curtidas"/>
                  <select className="gal-cat" style={{width:'50%'}} value={p.type} onChange={e=>upd({feed: ig.feed.map(x=>x.id===p.id?{...x,type:e.target.value}:x)})}>
                    <option value="photo">Foto</option><option value="reel">Reel</option><option value="carousel">Carrossel</option>
                  </select>
                </div>
                <button className="gal-del" onClick={()=>{upd({feed: ig.feed.filter(x=>x.id!==p.id)}); showToast('Publicação removida')}}><Icon.Close size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* Painel: atualização automática */
function IgSync({ig, upd, showToast}) {
  const s = ig.sync || {};
  const [busy, setBusy] = igUseState(false);
  const set = (patch) => upd({sync: {...s, ...patch}});
  const ligado = s.enabled && (s.token || s.proxy);
  const quando = s.lastSync ? new Date(s.lastSync).toLocaleString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'nunca';

  const agora = async () => {
    setBusy(true);
    const r = await syncInstagram({...s}, {silent:false});
    setBusy(false);
    showToast(r.ok ? `${r.count} publicações atualizadas` : 'Não consegui atualizar — veja o aviso');
  };

  return (
    <div className="admin-panel" style={{marginTop:'1.5rem'}}>
      <div className="admin-panel-head">
        <h3>Atualização automática</h3>
        <span className={`pill ${ligado?'confirmado':'pendente'}`}>{ligado ? 'ligada' : 'manual'}</span>
      </div>
      <p style={{color:'var(--ink-500)',fontSize:'.86rem',margin:'.4rem 0 1.2rem',lineHeight:1.6}}>
        Com a atualização ligada, as últimas publicações do perfil entram sozinhas no site — sem precisar subir foto por foto.
        Em produção, use o endereço do seu servidor: o token fica guardado lá e se renova sozinho.
      </p>
      <div className="toggle-row" style={{borderTop:'none',paddingTop:0}}>
        <span>Buscar publicações automaticamente</span>
        <button className={`switch ${s.enabled?'on':''}`} onClick={()=>set({enabled:!s.enabled})} aria-label="Atualização automática"/>
      </div>
      <div className="form-grid" style={{marginTop:'1rem'}}>
        <Field label="Endereço no seu servidor (recomendado)" span={2}>
          <input value={s.proxy} onChange={e=>set({proxy:e.target.value})} placeholder="https://seusite.com.br/api/instagram"/>
        </Field>
        <Field label="Token da Instagram Graph API" span={2}>
          <input type="password" value={s.token} onChange={e=>set({token:e.target.value})} placeholder="IGQVJ…"/>
        </Field>
        <Field label="Quantas publicações"><input type="number" value={s.limit} onChange={e=>set({limit:+e.target.value||9})}/></Field>
        <Field label="Atualizar a cada (minutos)"><input type="number" value={s.everyMin} onChange={e=>set({everyMin:+e.target.value||60})}/></Field>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'1rem',marginTop:'1.2rem',flexWrap:'wrap'}}>
        <button className="btn btn-primary" disabled={busy} onClick={agora}>{busy ? 'Buscando…' : 'Atualizar agora'}</button>
        <span style={{fontSize:'.82rem',color:'var(--ink-500)'}}>Última atualização: {quando}</span>
      </div>
      {s.lastError && <div className="ck-note" style={{marginTop:'1rem'}}>Último erro: {s.lastError}</div>}
    </div>
  );
}

Object.assign(window, { InstagramSection, InstagramAdmin, syncInstagram });
