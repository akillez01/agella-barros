// Checkout da loja — dados do cliente, entrega, pagamento via Pix (BR Code real) ou cartão.
const { useState: ckState, useEffect: ckEffect, useRef: ckRef } = React;

const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const maskPhone = (v) => { const d = onlyDigits(v).slice(0, 11); return d.length <= 10 ? d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => [a && `(${a}) `, b, c && `-${c}`].filter(Boolean).join('')) : d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3'); };
const maskCard = (v) => onlyDigits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const maskExp = (v) => { const d = onlyDigits(v).slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
function luhn(num) {
  const d = onlyDigits(num); if (d.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
  return sum % 10 === 0;
}

function Checkout({ open, onClose, items, total, onDone, showToast }) {
  const store = useStore();
  const cfg = store.settings;
  const waLastOrderRef = ckRef('');
  const [step, setStep] = ckState('dados');
  const [c, setC] = ckState({ name: '', phone: '', email: '', cpf: '' });
  const [ship, setShip] = ckState(cfg.delivery.pickup ? 'retirada' : 'entrega');
  const [addr, setAddr] = ckState({ street: '', num: '', bairro: '', ref: '' });
  const [method, setMethod] = ckState(cfg.pix.enabled ? 'pix' : 'cartao');
  const [inst, setInst] = ckState(1);
  const [card, setCard] = ckState({ number: '', holder: '', exp: '', cvv: '' });
  const [order, setOrder] = ckState(null);
  const [busy, setBusy] = ckState(false);
  const [err, setErr] = ckState('');

  ckEffect(() => {
    if (open) {
      setStep('dados');
      setOrder(null);
      setErr('');
      waLastOrderRef.current = '';
    }
  }, [open]);
  if (!open) return null;

  const freeShip = total >= (+cfg.delivery.freeAbove || 0);
  const fee = ship === 'entrega' && !freeShip ? (+cfg.delivery.localFee || 0) : 0;
  const grand = total + fee;
  const maxInst = Math.max(1, Math.min(+cfg.card.maxInstallments || 1, Math.floor(grand / (+cfg.card.minInstallment || 30)) || 1));

  const validDados = c.name.trim().length > 2 && onlyDigits(c.phone).length >= 10 && (ship === 'retirada' || (addr.street.trim() && addr.num.trim() && addr.bairro.trim()));

  const toLocalOrder = (serverOrder, methodName, patch = {}) => ({
    id: serverOrder.id,
    code: serverOrder.code,
    createdAt: serverOrder.createdAt || new Date().toISOString(),
    customer: { ...serverOrder.customer, phone: onlyDigits(serverOrder.customer?.phone || c.phone) },
    items: (serverOrder.items || []).map(i => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      price: (i.unitCents || 0) / 100,
    })),
    subtotal: (serverOrder.subtotalCents || 0) / 100,
    fee: (serverOrder.shippingCents || 0) / 100,
    total: (serverOrder.totalCents || 0) / 100,
    delivery: serverOrder.delivery,
    address: serverOrder.address || null,
    method: methodName,
    installments: patch.installments || 1,
    status: patch.status || serverOrder.status || 'aguardando',
    ...patch,
  });

  const persistLocalOrder = (o) => {
    setStore(s => ({
      orders: [o, ...(s.orders || [])],
      products: s.products.map(p => {
        const it = o.items.find(i => i.id === p.id);
        return it ? { ...p, stock: Math.max(0, (+p.stock || 0) - it.qty) } : p;
      }),
    }));
  };

  const apiCreateOrder = async () => {
    const body = {
      customer: {
        name: c.name,
        phone: onlyDigits(c.phone),
        email: c.email || '',
      },
      delivery: ship,
      address: ship === 'entrega' ? { ...addr } : null,
      items: items.map(({ p, qty }) => ({ id: p.id, qty })),
      shippingCents: Math.round(fee * 100),
      discountCents: 0,
      channel: 'site',
    };
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status} ao criar pedido`);
    return data.order;
  };

  const apiCreatePix = async (orderId) => {
    const res = await fetch('/api/payments/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        pix: {
          key: cfg.pix.key,
          merchant: cfg.pix.merchant,
          city: cfg.pix.city,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status} ao gerar Pix`);
    return data.payment;
  };

  const apiPayCard = async (orderId) => {
    const res = await fetch('/api/payments/card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        installments: inst,
        card: {
          number: card.number,
          holder: card.holder,
          cvv: card.cvv,
          exp: card.exp,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status} ao processar cartao`);
    return data;
  };

  const goPix = async () => {
    setErr('');
    setBusy(true);
    try {
      const created = await apiCreateOrder();
      const payment = await apiCreatePix(created.id);
      const local = toLocalOrder(created, 'pix', {
        status: 'aguardando',
        pixPayload: payment.payload,
        pixTxid: payment.txid,
        pixExpiresAt: payment.expiresAt,
      });
      persistLocalOrder(local);
      setOrder(local);
      setStep('pix');
      if (waLastOrderRef.current !== local.code) {
        waLastOrderRef.current = local.code;
        openWhatsApp(waOrderLink(local, 'pix'));
      }
    } catch (e) {
      setErr(e.message || 'Nao foi possivel gerar o Pix agora.');
    } finally {
      setBusy(false);
    }
  };

  const payCard = async () => {
    setErr('');
    if (!luhn(card.number)) return setErr('Número do cartão inválido.');
    if (onlyDigits(card.exp).length !== 4) return setErr('Validade incompleta.');
    if (onlyDigits(card.cvv).length < 3) return setErr('CVV incompleto.');
    if (card.holder.trim().length < 3) return setErr('Informe o nome impresso no cartão.');
    setBusy(true);
    try {
      const created = await apiCreateOrder();
      const paid = await apiPayCard(created.id);
      const approved = paid.payment?.status === 'aprovado';
      const local = toLocalOrder(created, 'cartao', {
        installments: paid.payment?.installments || inst,
        cardLast4: paid.payment?.cardLast4 || onlyDigits(card.number).slice(-4),
        status: approved ? 'pago' : 'aguardando',
      });
      persistLocalOrder(local);
      setOrder(local);
      setStep('ok');
      onDone();
      if (waLastOrderRef.current !== local.code) {
        waLastOrderRef.current = local.code;
        openWhatsApp(waOrderLink(local, 'cartao'));
      }
      showToast(approved ? 'Pagamento aprovado' : 'Pedido registrado');
    } catch (e) {
      setErr(e.message || 'Nao foi possivel processar o pagamento agora.');
    } finally {
      setBusy(false);
    }
  };

  const confirmPix = () => {
    setStore(s => ({ orders: s.orders.map(o => o.id === order.id ? { ...o, status: 'aguardando' } : o) }));
    setStep('ok');
    onDone();
    showToast('Pedido registrado — envie o comprovante');
  };

  const waLink = () => {
    const num = onlyDigits(cfg.contact.whatsapp);
    const txt = encodeURIComponent(`Olá! Concluí o pedido ${order?.code} pelo site no valor de ${brlc(grand)} e vou enviar o comprovante do Pix por aqui.`);
    return `https://wa.me/${num}?text=${txt}`;
  };

  const waOrderLink = (o, kind) => {
    const num = onlyDigits(cfg.contact.whatsapp);
    const itens = (o.items || []).map(i => `- ${i.qty}x ${i.name}`).join('\n');
    const entrega = o.delivery === 'retirada'
      ? 'Retirada no studio'
      : `Entrega: ${o.address?.street || ''}, ${o.address?.num || ''} - ${o.address?.bairro || ''}`;
    const pagamento = kind === 'pix'
      ? 'Pix (vou enviar o comprovante)'
      : (o.status === 'pago' ? `Cartão aprovado (${o.installments || 1}x)` : `Cartão em análise (${o.installments || 1}x)`);

    const txt = [
      'Olá! Acabei de finalizar um pedido pelo site.',
      `Código do pedido: ${o.code}`,
      '',
      `Cliente: ${o.customer?.name || ''}`,
      `WhatsApp: ${o.customer?.phone || ''}`,
      '',
      'Resumo do pedido:',
      itens,
      '',
      `Total: ${brlc(o.total || 0)}`,
      `Pagamento: ${pagamento}`,
      `${entrega}`,
      '',
      'Pode seguir com meu atendimento por aqui, por favor?',
    ].join('\n');
    return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
  };

  const openWhatsApp = (url) => {
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url;
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="ck" onClick={e => e.stopPropagation()}>
        <div className="ck-head">
          <div>
            <div className="gold-rule">Finalizar compra</div>
            <h3 style={{ marginTop: '.6rem' }}>{step === 'ok' ? 'Pedido confirmado' : step === 'pix' ? 'Pague com Pix' : step === 'pagamento' ? 'Pagamento' : 'Seus dados'}</h3>
          </div>
          <button className="drawer-close" onClick={onClose}><Icon.Close /></button>
        </div>

        <div className="ck-body">
          {step === 'dados' && (
            <>
              <div className="form-grid">
                <Field label="Nome completo" span={2}><input value={c.name} onChange={e => setC({ ...c, name: e.target.value })} placeholder="Como no documento" /></Field>
                <Field label="WhatsApp"><input value={c.phone} onChange={e => setC({ ...c, phone: maskPhone(e.target.value) })} placeholder="(92) 99999-0000" inputMode="tel" /></Field>
                <Field label="E-mail (opcional)"><input value={c.email} onChange={e => setC({ ...c, email: e.target.value })} placeholder="seu@email.com" type="email" /></Field>
              </div>
              <div className="ck-label">Como quer receber</div>
              <div className="ck-opts">
                {cfg.delivery.pickup && (
                  <button className={`ck-opt ${ship === 'retirada' ? 'on' : ''}`} onClick={() => setShip('retirada')}>
                    <strong>Retirar no studio</strong>
                    <span>{cfg.delivery.address}</span>
                    <em>Grátis</em>
                  </button>
                )}
                {cfg.delivery.local && (
                  <button className={`ck-opt ${ship === 'entrega' ? 'on' : ''}`} onClick={() => setShip('entrega')}>
                    <strong>Entrega em Parintins</strong>
                    <span>Até 24h úteis</span>
                    <em>{freeShip ? 'Grátis' : brlc(cfg.delivery.localFee)}</em>
                  </button>
                )}
              </div>
              {ship === 'entrega' && (
                <div className="form-grid" style={{ marginTop: '1rem' }}>
                  <Field label="Rua" span={2}><input value={addr.street} onChange={e => setAddr({ ...addr, street: e.target.value })} /></Field>
                  <Field label="Número"><input value={addr.num} onChange={e => setAddr({ ...addr, num: e.target.value })} /></Field>
                  <Field label="Bairro"><input value={addr.bairro} onChange={e => setAddr({ ...addr, bairro: e.target.value })} /></Field>
                  <Field label="Referência (opcional)" span={2}><input value={addr.ref} onChange={e => setAddr({ ...addr, ref: e.target.value })} placeholder="Perto de…" /></Field>
                </div>
              )}
              <CkTotals items={items} total={total} fee={fee} grand={grand} />
            </>
          )}

          {step === 'pagamento' && (
            <>
              <div className="ck-label">Forma de pagamento</div>
              <div className="ck-opts">
                {cfg.pix.enabled && (
                  <button className={`ck-opt ${method === 'pix' ? 'on' : ''}`} onClick={() => setMethod('pix')}>
                    <strong>Pix</strong>
                    <span>Aprovação imediata · QR Code ou copia e cola</span>
                    <em>{brlc(grand)}</em>
                  </button>
                )}
                {cfg.card.enabled && (
                  <button className={`ck-opt ${method === 'cartao' ? 'on' : ''}`} onClick={() => setMethod('cartao')}>
                    <strong>Cartão de crédito</strong>
                    <span>{cfg.card.feeNote}</span>
                    <em>até {maxInst}x</em>
                  </button>
                )}
              </div>

              {method === 'cartao' && (
                <>
                  <div className="form-grid" style={{ marginTop: '1.2rem' }}>
                    <Field label="Número do cartão" span={2}><input value={card.number} onChange={e => setCard({ ...card, number: maskCard(e.target.value) })} placeholder="0000 0000 0000 0000" inputMode="numeric" /></Field>
                    <Field label="Nome impresso" span={2}><input value={card.holder} onChange={e => setCard({ ...card, holder: e.target.value.toUpperCase() })} placeholder="ANGELLA B SANTOS" /></Field>
                    <Field label="Validade"><input value={card.exp} onChange={e => setCard({ ...card, exp: maskExp(e.target.value) })} placeholder="MM/AA" inputMode="numeric" /></Field>
                    <Field label="CVV"><input value={card.cvv} onChange={e => setCard({ ...card, cvv: onlyDigits(e.target.value).slice(0, 4) })} placeholder="123" inputMode="numeric" /></Field>
                    <Field label="Parcelamento" span={2}>
                      <select value={inst} onChange={e => setInst(+e.target.value)}>
                        {Array.from({ length: maxInst }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x de {brlc(grand / n)}{n === 1 ? ' à vista' : ''}</option>)}
                      </select>
                    </Field>
                  </div>
                  {!cfg.card.publicKey && <div className="ck-note">Modo demonstração: nenhum gateway conectado ainda. Cadastre a chave pública no painel → Pagamentos para cobrar de verdade.</div>}
                  {err && <div className="admin-err">{err}</div>}
                </>
              )}
              {method === 'pix' && !cfg.pix.key && <div className="ck-note">A chave Pix ainda não foi cadastrada. Painel → Pagamentos → chave Pix.</div>}
              <CkTotals items={items} total={total} fee={fee} grand={grand} />
              {err && <div className="admin-err" style={{ marginTop: '.8rem' }}>{err}</div>}
            </>
          )}

          {step === 'pix' && order && (
            <PixPane order={order} cfg={cfg} showToast={showToast} />
          )}

          {step === 'ok' && order && (
            <div className="ck-done">
              <div className="check-circle" style={{ background: 'var(--wine-900)', color: 'var(--gold-soft)' }}><Icon.Check size={28} /></div>
              <h3 style={{ fontSize: '1.9rem', fontWeight: 400 }}>Obrigada, {order.customer.name.split(' ')[0]}!</h3>
              <p style={{ color: 'var(--ink-500)', maxWidth: 380, margin: '.6rem auto 1.4rem' }}>
                Pedido <strong style={{ color: 'var(--wine-900)' }}>{order.code}</strong> registrado.{' '}
                {order.method === 'pix'
                  ? 'Assim que o Pix cair, confirmamos por WhatsApp.'
                  : order.status === 'pago' ? 'Pagamento aprovado no cartão.' : 'Vamos confirmar o pagamento e avisar você.'}
              </p>
              <div className="ck-sum">
                <div className="receipt-row" style={{ color: 'var(--ink-700)' }}><span>Total</span><span>{brlc(order.total)}</span></div>
                <div className="receipt-row" style={{ color: 'var(--ink-700)' }}><span>Pagamento</span><span>{order.method === 'pix' ? 'Pix' : `Cartão ${order.installments}x`}</span></div>
                <div className="receipt-row" style={{ color: 'var(--ink-700)' }}><span>Entrega</span><span>{order.delivery === 'retirada' ? 'Retirada no studio' : 'Entrega em Parintins'}</span></div>
              </div>
              <a className="btn btn-primary" href={waLink()} target="_blank" rel="noopener" style={{ marginTop: '1.4rem' }}>Falar no WhatsApp <Icon.Arrow size={14} /></a>
            </div>
          )}
        </div>

        <div className="ck-foot">
          {step === 'dados' && <>
            <span className="ck-total">{brlc(grand)}</span>
            <button className="btn btn-primary" disabled={!validDados} style={{ opacity: validDados ? 1 : .4 }} onClick={() => validDados && setStep('pagamento')}>Ir para pagamento <Icon.Arrow size={14} /></button>
          </>}
          {step === 'pagamento' && <>
            <button className="link-btn" onClick={() => setStep('dados')}>← Voltar</button>
            <button className="btn btn-primary" disabled={busy} onClick={() => method === 'pix' ? goPix() : payCard()}>
              {busy ? 'Processando…' : method === 'pix' ? 'Gerar Pix' : `Pagar ${brlc(grand)}`}
            </button>
          </>}
          {step === 'pix' && <>
            <button className="link-btn" onClick={() => setStep('pagamento')}>← Voltar</button>
            <button className="btn btn-primary" onClick={confirmPix}>Já paguei <Icon.Check size={14} /></button>
          </>}
          {step === 'ok' && <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Fechar</button>}
        </div>
      </div>
    </div>
  );
}

function CkTotals({ items, total, fee, grand }) {
  return (
    <div className="ck-sum">
      {items.map(({ p, qty }) => (
        <div key={p.id} className="receipt-row" style={{ color: 'var(--ink-700)' }}>
          <span>{qty}× {p.name}</span><span>{brlc(p.priceN * qty)}</span>
        </div>
      ))}
      <div className="receipt-row" style={{ color: 'var(--ink-700)' }}><span>Entrega</span><span>{fee ? brlc(fee) : 'Grátis'}</span></div>
      <div className="receipt-row" style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', color: 'var(--wine-900)' }}><span>Total</span><span>{brlc(grand)}</span></div>
    </div>
  );
}

function PixPane({ order, cfg, showToast }) {
  const canvas = ckRef(null);
  const payload = order.pixPayload || pixPayload({ key: cfg.pix.key, merchant: cfg.pix.merchant, city: cfg.pix.city, amount: order.total, txid: order.code });
  const [copied, setCopied] = ckState(false);

  ckEffect(() => {
    const cv = canvas.current;
    if (!payload || !cv || typeof window.qrcode !== 'function') return;
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(payload);
      qr.make();
      const n = qr.getModuleCount(), quiet = 2, px = 6, size = (n + quiet * 2) * px;
      cv.width = size; cv.height = size;
      cv.style.width = cv.style.height = '208px';
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#F9F5F2'; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#4A0E1C';
      for (let r = 0; r < n; r++) for (let c2 = 0; c2 < n; c2++)
        if (qr.isDark(r, c2)) ctx.fillRect((c2 + quiet) * px, (r + quiet) * px, px, px);
    } catch (e) { console.warn('QR', e); }
  }, [payload]);

  const copy = () => {
    navigator.clipboard?.writeText(payload).then(() => { setCopied(true); showToast('Código Pix copiado'); setTimeout(() => setCopied(false), 2200); });
  };

  if (!payload) return <div className="ck-note">Chave Pix não cadastrada. Peça à Angella para cadastrar em Painel → Pagamentos.</div>;

  return (
    <div className="pix-pane">
      <div className="pix-qr"><canvas ref={canvas} /></div>
      <div>
        <div className="pix-val">{brlc(order.total)}</div>
        <p style={{ color: 'var(--ink-500)', fontSize: '.88rem', margin: '.5rem 0 1rem' }}>
          Aponte a câmera do seu banco para o QR Code ou use o código copia e cola. Pedido <strong style={{ color: 'var(--wine-900)' }}>{order.code}</strong>.
        </p>
        <div className="pix-code">{payload}</div>
        <button className="btn btn-primary" style={{ marginTop: '.9rem' }} onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar código Pix'}</button>
        <p style={{ color: 'var(--ink-500)', fontSize: '.8rem', marginTop: '.9rem' }}>Recebedor: {cfg.pix.merchant} · {cfg.pix.city}</p>
      </div>
    </div>
  );
}

Object.assign(window, { Checkout });
