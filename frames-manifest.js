/* Manifesto dos frames do filme de abertura.
   Quando as fotos da sequência estiverem prontas, coloque-as em assets/frames/
   nomeadas f-0001.jpg, f-0002.jpg … e troque "count" para o total de arquivos.
   Com count: 0 o site usa a foto única do topo (modo estático) — nada quebra. */
window.__FRAMES_MANIFEST__ = {
  count: 0,        // total de frames — 0 = ainda sem sequência
  prefix: 'f-',
  pad: 4,
  ext: '.jpg',
  dir: 'assets/frames/'
};
