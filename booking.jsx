// Booking flow: 4 steps — service, professional, date+time, confirm.
// Disponibilidade e confirmação batem no backend real (Postgres), não mais
// em localStorage — ver backend/src/routes/bookings.routes.ts.
const { useState, useMemo, useEffect, useRef } = React;

const SERVICES = [
  { id: 'corte', name: 'Corte & Finalização', meta: '45 min · Salão de Beleza', price: 'R$ 180' },
  { id: 'coloracao', name: 'Coloração Premium', meta: '2h 30 min · Salão de Beleza', price: 'R$ 480' },
  { id: 'tratamento', name: 'Tratamento Capilar', meta: '1h 15 min · Salão de Beleza', price: 'R$ 240' },
];
const PROS = [
  { id: 'angella', name: 'Angella Barros', meta: 'Beleza Capilar · Colorista' },
  { id: 'aline', name: 'Aline Maria', meta: 'Terapeuta · Bem-estar' },
  { id: 'qualquer', name: 'Qualquer especialista', meta: 'Primeira disponibilidade' },
];
const SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:30', '16:00', '17:30', '19:00'];

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function Booking({ showToast, only, proId }) {
  const store = useStore();
  const waAutoCodeRef = useRef('');
  // sessões de massoterapia vivem no painel (aba Massoterapia) — entram aqui automaticamente
  const MASSAGENS = (store.wellness?.sessions || []).map(s => ({ id: s.id, name: s.name, meta: `${s.time} · Massoterapia`, price: s.price }));
  const ALL = [...SERVICES, ...MASSAGENS];
  const SERVICE_LIST = only ? ALL.filter(s => s.meta.includes(only)) : ALL;
  const PRO_LIST = proId ? PROS.filter(p => p.id === proId) : PROS;
  const [step, setStep] = useState(0);
  const [service, setService] = useState(null);
  const [pro, setPro] = useState(proId ? PROS.find(p => p.id === proId) : null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [client, setClient] = useState({ name: '', phone: '', note: '' });
  const [saved, setSaved] = useState(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = first.getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < start; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(view.y, view.m, d));
    return out;
  }, [view]);

  const canPrev = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m > today.getMonth());
  const fmt = (d) => d ? `${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()}` : null;
  const isPast = (d) => d < today;
  const isSun = (d) => d.getDay() === 0; // closed Sundays

  const reset = () => { setStep(0); setService(null); setPro(proId ? PROS.find(p => p.id === proId) : null); setDate(null); setTime(null); setClient({ name: '', phone: '', note: '' }); setSaved(null); };

  const isoOf = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
  const proName = pro ? (pro.id === 'qualquer' ? 'Angella Barros' : pro.name) : '';

  // horários já ocupados para a data e a especialista escolhidas — consulta real no backend
  const [taken, setTaken] = useState(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  useEffect(() => {
    const iso = isoOf(date);
    if (!iso) { setTaken(new Set()); return; }
    let cancelled = false;
    setLoadingSlots(true);
    const qs = new URLSearchParams({ date: iso, ...(proName ? { pro: proName } : {}) });
    fetch(`/api/bookings/availability?${qs}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setTaken(new Set(data.taken || [])); })
      .catch(() => { if (!cancelled) setTaken(new Set()); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [date, proName]);

  const digits = (s) => (s || '').replace(/\D/g, '');
  const maskFone = (v) => {
    const d = digits(v).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => [a && `(${a}`, a.length === 2 ? ') ' : '', b, c && `-${c}`].join(''));
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };
  const dadosOk = client.name.trim().length > 2 && digits(client.phone).length >= 10;

  const waStudio = () => {
    const isWellnessFlow = only === 'Massoterapia' || proId === 'aline' || pro?.id === 'aline';
    const num = digits(isWellnessFlow ? (store.wellness?.contactWhatsapp || store.settings.contact.whatsapp) : store.settings.contact.whatsapp);
    const txt = [
      'Olá! Acabei de concluir um agendamento pelo site.',
      `• Serviço: ${service?.name}`,
      `• Com: ${proName}`,
      `• Quando: ${fmt(date)} às ${time}`,
      `• Nome: ${client.name}`,
      `• WhatsApp: ${client.phone}`,
      client.note ? `• Observação: ${client.note}` : '',
      saved ? `• Código: ${saved.code}` : '',
      '',
      'Pode confirmar meu horário por aqui, por favor?',
    ].filter(Boolean).join('\n');
    return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
  };

  useEffect(() => {
    if (step !== 4 || !saved?.code) return;
    if (waAutoCodeRef.current === saved.code) return;
    waAutoCodeRef.current = saved.code;
    const url = waStudio();
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url;
  }, [step, saved?.code]);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const confirm = async () => {
    if (!date || !time || !dadosOk || confirming) return;
    setConfirming(true);
    setConfirmError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.name.trim(),
          clientPhone: digits(client.phone),
          service: service.name,
          pro: proName,
          date: isoOf(date),
          time,
          price: Number(String(service.price).replace(/\D/g, '')) || 0,
          channel: 'site',
          notes: client.note.trim() || undefined,
        }),
      });
      if (res.status === 409) {
        const err = await res.json().catch(() => ({}));
        setConfirmError(err.error || 'Esse horário acabou de ficar indisponível. Escolha outro.');
        setTaken(t => new Set([...t, time]));
        setStep(2);
        return;
      }
      if (!res.ok) throw new Error('booking failed');
      const { booking } = await res.json();
      setSaved({ ...booking, client: client.name.trim(), phone: digits(client.phone), note: client.note.trim() });
      showToast && showToast('Reserva registrada — confirmação a caminho');
      setStep(4);
    } catch (e) {
      setConfirmError('Não foi possível registrar a reserva agora. Tente novamente ou fale pelo WhatsApp.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section id="agendar" className="section booking">
      <div className="container">
        <div className="section-head reveal">
          <div className="gold-rule center">Agendamento Online</div>
          <h2>Reserve seu momento</h2>
          <p>Escolha serviço, especialista e horário. A confirmação sai na hora pelo WhatsApp do studio.</p>
        </div>

        <div className="booking-grid reveal">
          <div className="book-info">
            <Step n="1" label="Serviço" value={service?.name} active={step === 0} done={!!service && step > 0} />
            <Step n="2" label="Especialista" value={pro?.name} active={step === 1} done={!!pro && step > 1} />
            <Step n="3" label="Data & hora" value={date && time ? `${fmt(date)} · ${time}` : null} active={step === 2} done={!!date && !!time && step > 2} />
            <Step n="4" label="Seus dados" value={dadosOk ? client.name : null} active={step === 3} done={dadosOk && step > 3} />
            <Step n="5" label="Confirmação" value={step === 4 ? 'Reserva registrada' : null} active={step === 4} done={false} />

            <div style={{ marginTop: '2.4rem', paddingTop: '1.6rem', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: '.8rem', fontSize: '.85rem', color: 'rgba(249,245,242,.6)' }}>
              <Icon.Clock size={16} />
              <span>Seg–Sex 9h–20h · Sáb 9h–17h</span>
            </div>
          </div>

          <div className="book-panel">
            {step !== 4 && (
              <div className="book-panel-head">
                <h3>{['Escolha o serviço', 'Escolha a especialista', 'Escolha data & horário', 'Seus dados'][step]}</h3>
                {step > 0 && <button className="book-back" onClick={() => setStep(step === 2 && PRO_LIST.length === 1 ? 0 : step - 1)}><Icon.ChevL size={12} /> Voltar</button>}
              </div>
            )}

            {step === 0 && (
              <div className="opt-list">
                {SERVICE_LIST.map(s => (
                  <button key={s.id} className={`opt ${service?.id === s.id ? 'selected' : ''}`} onClick={() => { setService(s); setStep(PRO_LIST.length > 1 ? 1 : 2); }}>
                    <div>
                      <div className="opt-name">{s.name}</div>
                      <div className="opt-meta">{s.meta}</div>
                    </div>
                    <div className="opt-price">{s.price}</div>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="opt-list">
                {PRO_LIST.map(p => (
                  <button key={p.id} className={`opt ${pro?.id === p.id ? 'selected' : ''}`} onClick={() => { setPro(p); setStep(2); }}>
                    <div>
                      <div className="opt-name">{p.name}</div>
                      <div className="opt-meta">{p.meta}</div>
                    </div>
                    <Icon.ChevR size={14} />
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="cal">
                <div className="cal-head">
                  <div className="cal-title">{MONTH_NAMES[view.m]} {view.y}</div>
                  <div className="cal-nav">
                    <button disabled={!canPrev} onClick={() => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}><Icon.ChevL size={14} /></button>
                    <button onClick={() => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}><Icon.ChevR size={14} /></button>
                  </div>
                </div>
                <div className="cal-grid">
                  {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} className="cal-day empty" />;
                    const dis = isPast(d) || isSun(d);
                    const sel = date && d.toDateString() === date.toDateString();
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                      <button key={i} className={`cal-day ${sel ? 'selected' : ''} ${isToday ? 'today' : ''}`} disabled={dis} onClick={() => setDate(d)}>{d.getDate()}</button>
                    );
                  })}
                </div>
                <div className="slots">
                  {SLOTS.map((s) => (
                    <button key={s} className={`slot ${time === s ? 'selected' : ''}`} disabled={!date || taken.has(s)} onClick={() => setTime(s)}>{s}</button>
                  ))}
                </div>
                <div style={{ marginTop: '1.6rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-cream" disabled={!date || !time} style={!date || !time ? { opacity: .4, cursor: 'not-allowed' } : {}} onClick={() => setStep(3)}>Continuar <Icon.Arrow size={14} /></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="cal">
                <div className="book-fields">
                  <label className="book-field">
                    <span>Nome completo</span>
                    <input value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} placeholder="Como prefere ser chamada" />
                  </label>
                  <label className="book-field">
                    <span>WhatsApp</span>
                    <input value={client.phone} onChange={e => setClient({ ...client, phone: maskFone(e.target.value) })} placeholder="(92) 99999-0000" inputMode="tel" />
                  </label>
                  <label className="book-field">
                    <span>Observação (opcional)</span>
                    <textarea rows={2} value={client.note} onChange={e => setClient({ ...client, note: e.target.value })} placeholder="Alergias, preferências, primeira vez no studio…" />
                  </label>
                </div>
                <div className="book-resume">
                  <span>{service?.name} · {proName}</span>
                  <span>{fmt(date)} · {time}</span>
                </div>
                {confirmError && <p style={{ color: '#e08a8a', fontSize: '.85rem', marginTop: '.8rem' }}>{confirmError}</p>}
                <div style={{ marginTop: '1.4rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-cream" disabled={!dadosOk || confirming} style={(!dadosOk || confirming) ? { opacity: .4, cursor: 'not-allowed' } : {}} onClick={confirm}>{confirming ? 'Confirmando…' : 'Confirmar Reserva'} <Icon.Arrow size={14} /></button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="book-confirm">
                <div className="check-circle"><Icon.Check size={32} /></div>
                <h3>Tudo certo, até breve.</h3>
                <p>Envie a mensagem no WhatsApp para o studio confirmar seu horário. Reagende ou cancele quando precisar.</p>
                <div className="receipt">
                  <div className="receipt-row"><span>Código</span><span>{saved?.code}</span></div>
                  <div className="receipt-row"><span>Serviço</span><span>{service?.name}</span></div>
                  <div className="receipt-row"><span>Com</span><span>{proName}</span></div>
                  <div className="receipt-row"><span>Data</span><span>{fmt(date)}</span></div>
                  <div className="receipt-row"><span>Horário</span><span>{time}</span></div>
                  <div className="receipt-row"><span>Valor</span><span style={{ color: 'var(--gold-soft)' }}>{service?.price}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <a className="btn btn-cream" href={waStudio()} target="_blank" rel="noopener"><Icon.Whatsapp size={16} /> Confirmar no WhatsApp</a>
                  <button className="btn btn-outline" onClick={reset}>Nova reserva</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ n, label, value, active, done }) {
  return (
    <div className={`step-row ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      <div className="step-num">{done ? <Icon.Check size={14} /> : n}</div>
      <div style={{ flex: 1 }}>
        <div className="step-label">{label}</div>
        <div className={`step-value ${value ? '' : 'placeholder'}`}>{value || 'a definir'}</div>
      </div>
    </div>
  );
}

window.Booking = Booking;
