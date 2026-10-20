// Prüft die Level-Generierung: Lösbarkeit, Füllgrad, Anteil freier Pfeile, Zeit.
//   node tools/test_levels.js [N]   (Level 1–N, dazu hohe Level und N Blitz-Zufallslevel)
const fs = require('fs');
const crypto = require('crypto');
const src = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
const engine = src.split('// ENGINE START')[1].split('// ENGINE END')[0];
const api = new Function(engine + '; return { generateLevel, freeArrows, levelSpec };')();
const N = +(process.argv[2] || 200);
const D = [[0,-1],[1,0],[0,1],[-1,0]];
let fails = 0, worstMs = 0;

// Lösbar (gierig: jeder freie Pfeil darf sofort raus), Pfeile zusammenhängend, Kopf passt zur Richtung
function check(lv, label){
  const alive = lv.arrows.map(() => true);
  const free0 = api.freeArrows(lv, alive).length;
  let steps = 0, left = lv.arrows.length;
  while (left > 0) {
    const f = api.freeArrows(lv, alive);
    if (!f.length) break;
    for (const id of f) { alive[id] = false; left--; }
    steps++;
  }
  if (left > 0 || !lv.arrows.length) { fails++; console.log('UNLÖSBAR', label); }
  const seen = new Set();
  for (const a of lv.arrows) {
    if (a.cells.length < 2) { fails++; console.log('zu kurz', label, a.id); }
    for (let i = 0; i < a.cells.length; i++) {
      const c = a.cells[i];
      if (seen.has(c) || c < 0 || c >= lv.W * lv.H) { fails++; console.log('Zelle doppelt/außerhalb', label, a.id); }
      seen.add(c);
      if (i && Math.abs(c % lv.W - a.cells[i - 1] % lv.W) + Math.abs(Math.floor(c / lv.W) - Math.floor(a.cells[i - 1] / lv.W)) !== 1) { fails++; console.log('Lücke im Pfeil', label, a.id); }
    }
    const h = a.cells[a.cells.length - 1], b = a.cells[a.cells.length - 2];
    if ((h % lv.W) - (b % lv.W) !== D[a.dir][0] || Math.floor(h / lv.W) - Math.floor(b / lv.W) !== D[a.dir][1]) { fails++; console.log('bad dir', label, a.id); }
  }
  const cells = lv.arrows.reduce((s, a) => s + a.cells.length, 0);
  return { size: `${lv.W}x${lv.H}`, arrows: lv.arrows.length, fill: (cells / (lv.W * lv.H)).toFixed(2), free: (free0 / lv.arrows.length).toFixed(2), depth: steps, avgLen: (cells / lv.arrows.length).toFixed(1) };
}
function timed(n, seed){
  const t0 = Date.now();
  const lv = api.generateLevel(n, seed);
  worstMs = Math.max(worstMs, Date.now() - t0);
  return lv;
}

// Level 1–30 (Einstieg) dürfen sich nicht ändern: sonst passen gespeicherte Spielstände nicht mehr
const hash = crypto.createHash('sha1');
for (let n = 1; n <= 30; n++) { const lv = api.generateLevel(n); hash.update(JSON.stringify([lv.W, lv.H, lv.arrows])); }
if (hash.digest('hex') !== '656d6d197f953369d2f9a4ea78b83dab27d9c6d8') { fails++; console.log('Level 1–30 haben sich geändert! (LEVEL_GEN erhöhen und Wiederherstellung prüfen)'); }

const rows = [];
for (let n = 1; n <= N; n++) rows.push({ n, ...check(timed(n), n) });
for (const n of [400, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000, 99999]) rows.push({ n, ...check(timed(n), n) });
for (const r of rows.filter(r => r.n <= 12 || r.n % 25 === 0 || r.n > N)) console.log(JSON.stringify(r));

// Blitzmodus: Zufalls-Level (zufälliger Startwert) müssen genauso lösbar sein
for (let i = 0; i < N; i++) {
  const n = 1 + (i % 60) + (i % 7 === 0 ? i : 0), seed = Math.floor(Math.random() * 0x7fffffff);
  check(timed(n, seed), `Blitz ${n} seed ${seed}`);
}
console.log(`\nLevel geprüft: ${N} + 10 hohe + ${N} Blitz-Zufallslevel, Fehler: ${fails}, langsamste Generierung: ${worstMs} ms`);
if (fails) process.exit(1);
