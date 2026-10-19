// Prüft die Level-Generierung: Lösbarkeit, Füllgrad, Anteil freier Pfeile, Zeit.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
const engine = src.split('// ENGINE START')[1].split('// ENGINE END')[0];
const api = new Function(engine + '; return { generateLevel, freeArrows, levelSpec };')();
const N = +(process.argv[2] || 200);
let fails = 0, worstMs = 0;
const rows = [];
for (let n = 1; n <= N; n++) {
  const t0 = Date.now();
  const lv = api.generateLevel(n);
  const ms = Date.now() - t0; worstMs = Math.max(worstMs, ms);
  const alive = lv.arrows.map(() => true);
  const free0 = api.freeArrows(lv, alive).length;
  let steps = 0, left = lv.arrows.length;
  // Gierig lösen: jeder freie Pfeil darf sofort raus
  while (left > 0) {
    const f = api.freeArrows(lv, alive);
    if (!f.length) break;
    for (const id of f) { alive[id] = false; left--; }
    steps++;
  }
  const cells = lv.arrows.reduce((s, a) => s + a.cells.length, 0);
  const avgLen = cells / lv.arrows.length;
  // Kopf-Richtung muss zum letzten Segment passen
  for (const a of lv.arrows) {
    const h = a.cells[a.cells.length - 1], b = a.cells[a.cells.length - 2];
    const D = [[0,-1],[1,0],[0,1],[-1,0]][a.dir];
    if ((h % lv.W) - (b % lv.W) !== D[0] || Math.floor(h / lv.W) - Math.floor(b / lv.W) !== D[1]) { console.log('bad dir', n, a.id); fails++; }
  }
  if (left > 0) { fails++; console.log('UNLÖSBAR', n); }
  rows.push({ n, size: `${lv.W}x${lv.H}`, arrows: lv.arrows.length, fill: (cells / (lv.W * lv.H)).toFixed(2), free: (free0 / lv.arrows.length).toFixed(2), depth: steps, avgLen: avgLen.toFixed(1), ms });
}
for (const r of rows.filter(r => r.n <= 12 || r.n % 10 === 0)) console.log(JSON.stringify(r));
console.log(`\nLevel geprüft: ${N}, Fehler: ${fails}, langsamste Generierung: ${worstMs} ms`);
