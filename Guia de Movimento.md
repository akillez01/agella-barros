# Guia de Movimento

Este documento centraliza toda a camada de animacao e scroll do projeto.

Se voce "nao acha onde esta o movimento", o arquivo principal e:
- `motion.js`

Arquivos que participam diretamente:
- `index.html` (CSS de reveal/cinema/galeria horizontal + imports de libs)
- `app.jsx` (chama a API `window.Motion` no ciclo da aplicacao)
- `cinema.jsx` (markup da abertura cinematografica)
- `frames-manifest.js` (config da sequencia de frames)
- `vendor/gsap.min.js`
- `vendor/ScrollTrigger.min.js`
- `vendor/lenis.min.js`

---

## 1) Como a arquitetura funciona

A camada de movimento foi desenhada como uma API global:
- `window.Motion.init(cfg)`
- `window.Motion.start(hasFrames)`
- `window.Motion.reset()`
- `window.Motion.build()`
- `window.Motion.lock(on)`
- `window.Motion.scrollTo(el)`
- `window.Motion.refresh()`
- `window.Motion.frames()`

Essa API fica em `motion.js` e e chamada por `app.jsx`.

Fluxo de boot:
1. `app.jsx` chama `Motion.init(...)` no primeiro carregamento.
2. `motion.js` registra `ScrollTrigger`, prepara `Lenis`, preload de frames e loader.
3. Em seguida monta:
   - abertura cinematografica
   - reveals
   - parallax
   - galeria horizontal pinada
   - cursor custom
4. Quando troca de pagina (`studio` <-> `massoterapia`), o app chama `Motion.reset()` e depois `Motion.build()`.

---

## 2) Onde cada movimento esta

## 2.1 Scroll suave
- Arquivo: `motion.js`
- Bloco: criacao do `Lenis`
- Config atual:
  - `lerp: .09`
  - `smoothWheel: true`
  - `syncTouch: false`

Como ajustar:
- Mais "macio" (mais inercia): reduzir `lerp` (ex.: `0.06`).
- Mais "direto": aumentar `lerp` (ex.: `0.14`).

## 2.2 Abertura cinematografica (canvas + scroll)
- Markup: `cinema.jsx`
- Engine: `motion.js` (`buildHero` + `preload` + `drawFrame`)
- Config de conteudo: `store.jsx` (`store.cinema`)
- Config da sequencia: `frames-manifest.js`

Comportamento:
- Se `count > 0`: usa sequencia de frames.
- Se `count = 0`: usa imagem unica com zoom leve (Ken Burns).

Parametros importantes:
- Altura do trecho cinematografico (scroll length):
  - com frames: `--cine-h = 620vh`
  - sem frames: `--cine-h = 300vh`
- HUD de progresso: `#hudAto`, `#hudPct`

## 2.3 Reveals de entrada
- CSS base: `index.html`
  - `.reveal`
  - `.mask-in`
  - `.zoom-in`
- Aplicacao automatica: `motion.js` (`buildReveals`)

Seletores que recebem classe automaticamente:
- `.section-head, .products-head, .booking-grid, .ig-profile` -> `reveal`
- `.ig-post, .h-media` -> `mask-in`
- `.spec-photo` -> `zoom-in`

Gatilho:
- `ScrollTrigger.batch(..., { start: 'top 90%' })`

Observacao:
- Existe "rede de seguranca" de 6s para nada ficar invisivel para sempre.

## 2.4 Parallax de imagens
- Arquivo: `motion.js`
- Seletores:
  - `.ig-avatar-ring img`
  - `.product-img img`
- Movimento atual: `yPercent: -6` ate `yPercent: 6`

## 2.5 Galeria horizontal pinada
- CSS: `index.html` (`.gal-h`, `.h-track`, `.h-panel`)
- JS: `motion.js` (`buildHorizontal`)

Regras:
- Desktop: anima horizontal com `pin: true`.
- Touch/reduced motion: fallback para rolagem nativa (`.h-track.is-native`).

Distancia usada:
- `track.scrollWidth - innerWidth + 80`

## 2.6 Cursor custom
- CSS: `index.html` (`.cursor`, `.cursor.is-link`, `.cursor.is-view`)
- JS: `motion.js` (`buildCursor`)
- Desliga automaticamente em touch ou reduced motion.

## 2.7 Navbar solida no scroll
- JS: `motion.js` (`buildChrome`)
- Regra atual: adiciona `.scrolled` quando scroll > 12.

---

## 3) Onde voce configura conteudo da abertura

Texto e botoes da abertura:
- `store.jsx` em `cinema`:
  - `kicker`
  - `title`
  - `l1`, `l2`, `l3`

Sequencia de imagens:
- `frames-manifest.js`
  - `count`
  - `prefix`
  - `pad`
  - `ext`
  - `dir`

Pasta dos frames:
- `assets/frames/`

Padrao de nome esperado:
- `f-0001.jpg`, `f-0002.jpg`, ...

---

## 4) Ordem dos scripts (critico)

No final do `index.html`, manter esta ordem:
1. `vendor/gsap.min.js`
2. `vendor/ScrollTrigger.min.js`
3. `vendor/lenis.min.js`
4. `frames-manifest.js`
5. `motion.js`
6. arquivos React/Babel (`*.jsx`)

Se inverter ordem, parte das animacoes pode nao iniciar.

---

## 5) Como ajustar rapido (receitas)

## 5.1 Deixar tudo mais suave
1. Em `motion.js`, reduzir `lerp` do Lenis para `0.06`.
2. Aumentar duracoes CSS de reveal em `index.html`:
   - `.reveal` de `1s` para `1.2s`
   - `.mask-in` de `1.25s` para `1.45s`

## 5.2 Deixar mais rapido/dinamico
1. Em `motion.js`, aumentar `lerp` para `0.12`.
2. Diminuir delay de lote em `buildReveals`:
   - `i * 70` -> `i * 40`

## 5.3 Reduzir peso no mobile
1. Manter `count=0` em `frames-manifest.js` (modo estatico).
2. Opcional: remover parallax dos produtos no `buildReveals`.

---

## 6) Troubleshooting

## Sintoma: "Nada anima"
Checklist:
1. Confirmar scripts no `index.html` na ordem certa.
2. Ver console para erro de JS antes de `motion.js`.
3. Ver se `window.Motion` existe no console.
4. Confirmar que `gsap` e `ScrollTrigger` carregaram.

## Sintoma: galeria horizontal nao fixa
1. Ver se esta em touch device (fallback nativo e esperado).
2. Ver se `dist() > 0` (se nao, nao ha deslocamento para animar).
3. Chamar `window.Motion.refresh()` apos mudanca de layout.

## Sintoma: abertura usa foto unica em vez de frames
1. Ver `frames-manifest.js` com `count > 0`.
2. Confirmar nomes dos arquivos em `assets/frames/`.
3. Ver se as imagens realmente carregam (404 no network).

## Sintoma: elementos ficam invisiveis
- Existe fallback de 6 segundos que aplica `.visible`.
- Se persistir, verificar conflito de classe no HTML/JSX.

---

## 7) Acessibilidade e fallback

A camada respeita:
- `prefers-reduced-motion: reduce`

Com isso:
- reduz/transiciona menos
- desliga animacoes mais pesadas
- usa fallback nativo em pontos especificos

Tambem ha fallback para touch na galeria horizontal.

---

## 8) API util para debug manual

No console do navegador:

```js
window.Motion.refresh();
window.Motion.frames();
window.Motion.reset();
window.Motion.build();
```

Uso comum apos alterar DOM dinamicamente:

```js
window.Motion.reset();
window.Motion.build();
window.Motion.refresh();
```

---

## 9) Resumo pratico

Se for mexer em movimento, comece por:
1. `motion.js` (logica de animacao)
2. `index.html` (tempos/easing/classes CSS de entrada)
3. `cinema.jsx` + `store.jsx` + `frames-manifest.js` (abertura)

Esse e o trio principal para ajustar a experiencia sem quebrar navegacao.
