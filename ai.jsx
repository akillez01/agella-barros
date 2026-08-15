// AI Concierge — recomendações personalizadas + agendamento via backend real
// (POST /api/ai/chat). O catálogo, o system prompt e a execução das tools
// (agendar, verificar_disponibilidade) agora vivem no servidor — batem direto
// no Postgres em vez de localStorage. Ver backend/src/routes/ai.routes.ts.
const { useState: aiUseState, useRef: aiUseRef, useEffect: aiUseEffect } = React;

function AIConcierge({open, onClose, showToast}) {
  const [msgs, setMsgs] = aiUseState([
    {role:'assistant', content:'Oi! Sou a **Bela**, concierge do Angella Barros Studio de Beleza. Me conta o que você procura — posso indicar o ritual ideal, sugerir produtos e já deixar seu horário reservado. ✧'}
  ]);
  const [input, setInput] = aiUseState('');
  const [busy, setBusy] = aiUseState(false);
  const bodyRef = aiUseRef(null);

  aiUseEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history = [...msgs, {role:'user', content:q}];
    setMsgs(history);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ messages: history.map(m => ({role:m.role, content:m.content})) }),
      });
      if (res.status === 501) {
        setMsgs(h => [...h, {role:'assistant', content:'Ainda estou sendo configurada por aqui — fale com o studio pelo WhatsApp enquanto isso. ✧'}]);
        return;
      }
      if (!res.ok) throw new Error('chat failed');
      const data = await res.json();
      setMsgs(h => [...h, {role:'assistant', content: data.reply}]);
      if (/reserva registrada/i.test(data.reply || '')) showToast && showToast('Reserva criada pela Bela');
    } catch (e) {
      setMsgs(h => [...h, {role:'assistant', content:'Desculpe, tive um problema de conexão. Pode repetir? Se preferir, fale conosco pelo WhatsApp.'}]);
    } finally {
      setBusy(false);
    }
  };

  const chips = ['Quero um ritual relaxante', 'Meu cabelo está ressecado', 'Tenho um evento no sábado', 'Indique um produto'];

  return (
    <>
      <div className={`scrim ${open?'open':''}`} onClick={onClose}/>
      <aside className={`ai-drawer ${open?'open':''}`}>
        <div className="ai-head">
          <div className="ai-head-id">
            <div className="ai-avatar"><Icon.Sparkle size={18}/></div>
            <div>
              <div className="ai-name">Bela · Concierge IA</div>
              <div className="ai-status"><span className="dot"/>Atendimento personalizado</div>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}><Icon.Close/></button>
        </div>

        <div className="ai-body" ref={bodyRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              <Rich text={m.content}/>
            </div>
          ))}
          {busy && <div className="bubble assistant typing"><span/><span/><span/></div>}
        </div>

        {msgs.length <= 1 && (
          <div className="ai-chips">
            {chips.map(c => <button key={c} className="ai-chip" onClick={()=>send(c)}>{c}</button>)}
          </div>
        )}

        <form className="ai-input" onSubmit={(e)=>{e.preventDefault(); send();}}>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Escreva sua mensagem…" disabled={busy}/>
          <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar"><Icon.Arrow size={16}/></button>
        </form>
      </aside>
    </>
  );
}

// Minimal markdown: **bold** and line breaks.
function Rich({text}) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <strong key={i}>{p.slice(2,-2)}</strong>
    : <span key={i}>{p.split('\n').map((line, j, arr) => <React.Fragment key={j}>{line}{j<arr.length-1 && <br/>}</React.Fragment>)}</span>)}</>;
}

Object.assign(window, { AIConcierge });
