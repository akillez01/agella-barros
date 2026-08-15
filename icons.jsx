// Tiny inline icon set — pure SVG, no libraries.
const Icon = {
  Arrow: ({size=18}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
    </svg>
  ),
  ArrowUR: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7"/><path d="M8 7h9v9"/>
    </svg>
  ),
  Plus: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Minus: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 12h14"/></svg>
  ),
  Close: ({size=18}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
  ),
  Check: ({size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  Heart: ({size=16, filled=false}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.357a5 5 0 1 1 7.5 6.215"/>
    </svg>
  ),
  Bag: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  Menu: ({size=22}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M4 8h16M4 16h16"/></svg>
  ),
  Scissors: ({size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M8.12 8.12 20 20"/><path d="M14.8 14.8 20 9"/><path d="M8.12 15.88 13 11"/>
    </svg>
  ),
  Leaf: ({size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1.4 9.3-3.4 15.66-8.2 17.04Z"/>
      <path d="M2 22c1.5-3 3-5 7-7"/>
    </svg>
  ),
  Sparkle: ({size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.94 14.06 2 17l7.94 2.94L12 28l2.06-8.06L22 17l-7.94-2.94L12 6Z" transform="translate(0,-3)"/>
      <path d="M19 4v4M17 6h4"/>
    </svg>
  ),
  Instagram: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r=".7" fill="currentColor"/>
    </svg>
  ),
  Tiktok: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 2h-3v13.4a3.1 3.1 0 1 1-3.1-3.1c.34 0 .67.06.99.16V9.4a6.1 6.1 0 1 0 5.11 6V8.5a7 7 0 0 0 4 1.27V6.77A4 4 0 0 1 16.5 2Z"/>
    </svg>
  ),
  Whatsapp: ({size=18}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.15-1.8-.9-2.07-1s-.48-.15-.68.15-.78 1-.96 1.2-.36.23-.66.08a8.3 8.3 0 0 1-2.43-1.5 9.2 9.2 0 0 1-1.68-2.1c-.18-.3 0-.46.13-.6s.3-.36.45-.54.2-.3.3-.5a.55.55 0 0 0 0-.53c-.08-.15-.68-1.62-.92-2.22s-.5-.5-.68-.5l-.58-.01a1.1 1.1 0 0 0-.8.38 3.34 3.34 0 0 0-1.05 2.48c0 1.46 1.07 2.88 1.22 3.08s2.1 3.22 5.1 4.5a17 17 0 0 0 1.7.63 4.1 4.1 0 0 0 1.88.12 3.07 3.07 0 0 0 2-1.42 2.48 2.48 0 0 0 .17-1.42c-.07-.13-.27-.2-.57-.35Zm-5.5 7.6h-.01A9.94 9.94 0 0 1 6.97 20.6L2 22l1.43-4.92A9.95 9.95 0 1 1 22 12a9.93 9.93 0 0 1-10 10Zm0-18.16A8.16 8.16 0 0 0 4.93 16l.2.32-.85 2.93 3-.83.3.18A8.16 8.16 0 1 0 12 3.84Z"/>
    </svg>
  ),
  Facebook: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.4A26 26 0 0 0 14.4 2c-2.8 0-4.7 1.7-4.7 4.9V9.5H6.6V13h3.1v9Z"/></svg>
  ),
  Pin: ({size=18}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  ChevL: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m15 6-6 6 6 6"/></svg>,  ChevR: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m9 6 6 6-6 6"/></svg>,
  Clock: ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  Search: ({size=18}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  Play: ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5Z"/></svg>,
  Layers: ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="8" y="3" width="13" height="13" rx="2"/><path d="M16 20H5a2 2 0 0 1-2-2V7"/></svg>,
  Comment: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.6-4.7A8.3 8.3 0 0 1 3.6 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.4 8.4Z"/></svg>,
};

// Stylized product bottle — drawn as SVG so all 4 products are visually consistent.
const Bottle = ({tone="wine", style=0}) => {
  const palettes = {
    wine:    {body:"#4A0E1C", glow:"#6e1f31", cap:"#1a1411", label:"#F9F5F2", text:"#4A0E1C"},
    cream:   {body:"#F2ECE5", glow:"#FFFFFF", cap:"#4A0E1C", label:"#4A0E1C", text:"#F9F5F2"},
    amber:   {body:"#B8935A", glow:"#d6bf99", cap:"#1a1411", label:"#1a1411", text:"#B8935A"},
    rose:    {body:"#e9d3cf", glow:"#f6e6e2", cap:"#4A0E1C", label:"#4A0E1C", text:"#e9d3cf"},
  };
  const c = palettes[tone] || palettes.wine;
  // Two silhouettes: 0 = tall tapered, 1 = short rounded
  if (style === 1) {
    return (
      <svg className="bottle-svg" viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`g-${tone}-1`} x1="0" x2="1">
            <stop offset="0" stopColor={c.body}/>
            <stop offset=".55" stopColor={c.glow} stopOpacity=".55"/>
            <stop offset="1" stopColor={c.body}/>
          </linearGradient>
        </defs>
        <rect x="48" y="6" width="24" height="22" rx="2" fill={c.cap}/>
        <rect x="44" y="26" width="32" height="6" rx="1.5" fill={c.cap} opacity=".8"/>
        <path d="M30 50 Q60 30 90 50 L94 180 Q60 196 26 180 Z" fill={`url(#g-${tone}-1)`}/>
        <rect x="36" y="78" width="48" height="74" rx="2" fill={c.label}/>
        <text x="60" y="106" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="11" letterSpacing="2" fill={c.text}>ANGELLA</text>
        <text x="60" y="120" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="9" fill={c.text} opacity=".75">&amp; Aline</text>
        <line x1="44" y1="130" x2="76" y2="130" stroke={c.text} strokeWidth=".5" opacity=".5"/>
        <text x="60" y="142" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="5.5" letterSpacing="2" fill={c.text} opacity=".7">200ML · BRASIL</text>
      </svg>
    );
  }
  return (
    <svg className="bottle-svg" viewBox="0 0 120 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`g-${tone}-0`} x1="0" x2="1">
          <stop offset="0" stopColor={c.body}/>
          <stop offset=".5" stopColor={c.glow} stopOpacity=".6"/>
          <stop offset="1" stopColor={c.body}/>
        </linearGradient>
      </defs>
      <rect x="52" y="4" width="16" height="32" rx="2" fill={c.cap}/>
      <rect x="48" y="34" width="24" height="4" rx="1" fill={c.cap} opacity=".75"/>
      <path d="M40 50 Q60 38 80 50 L86 200 Q60 214 34 200 Z" fill={`url(#g-${tone}-0)`}/>
      <rect x="42" y="90" width="36" height="86" rx="1" fill={c.label}/>
      <text x="60" y="116" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="10" letterSpacing="2" fill={c.text}>ANGELLA</text>
      <text x="60" y="128" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="8" fill={c.text} opacity=".75">&amp; Aline</text>
      <line x1="48" y1="138" x2="72" y2="138" stroke={c.text} strokeWidth=".5" opacity=".5"/>
      <text x="60" y="152" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="5" letterSpacing="2" fill={c.text} opacity=".7">EDITION</text>
      <text x="60" y="166" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="5" letterSpacing="2" fill={c.text} opacity=".55">NO. 01</text>
    </svg>
  );
};

window.Icon = Icon;
window.Bottle = Bottle;
