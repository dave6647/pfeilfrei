// Prüft, dass jeder Text in ALLEN Sprachen vorhanden ist.
// Läuft bei jedem GitHub-Build; fehlt eine Übersetzung, schlägt der Build fehl.
//
//   node tools/test_i18n.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
const block = src.split('// I18N START')[1].split('// I18N END')[0];
const { LANGS, I18N } = new Function(block + '; return { LANGS, I18N };')();

const errors = [];
const base = I18N.en;
const baseKeys = Object.keys(base).sort();
const samples = [0, 1, 2, 5, 12];

// 1. Jede Sprache im Menü hat Texte, und jeder Textblock steht im Menü
for (const l of LANGS) if (!I18N[l.code]) errors.push(`Sprache "${l.code}" steht im Menü, hat aber keine Texte`);
for (const code of Object.keys(I18N)) if (!LANGS.some(l => l.code === code)) errors.push(`Sprache "${code}" hat Texte, fehlt aber im Menü (LANGS)`);

// 2. Gleiche Schlüssel und gleiche Art (Text oder Funktion) wie Englisch
for (const [code, dict] of Object.entries(I18N)) {
  const keys = Object.keys(dict);
  for (const k of baseKeys) {
    if (!(k in dict)) { errors.push(`[${code}] fehlt: ${k}`); continue; }
    if (typeof dict[k] !== typeof base[k]) errors.push(`[${code}] ${k}: muss ${typeof base[k] === 'function' ? 'eine Funktion' : 'ein Text'} sein`);
  }
  for (const k of keys) if (!(k in base)) errors.push(`[${code}] ${k}: gibt es im Englischen nicht`);
  // 3. Keine leeren Texte, Funktionen liefern Text für typische Zahlen
  for (const k of keys) {
    const v = dict[k];
    const outs = typeof v === 'function' ? samples.map(n => v(n)) : [v];
    for (const o of outs) {
      if (typeof o !== 'string' || !o.trim()) errors.push(`[${code}] ${k}: leer oder kein Text`);
      else if (/undefined|NaN|\$\{/.test(o)) errors.push(`[${code}] ${k}: kaputter Text "${o}"`);
    }
    // Zahlen müssen im Text auftauchen, wenn das Englische sie zeigt
    if (typeof v === 'function') for (const n of [5, 12]) {
      if (String(base[k](n)).includes(String(n)) && !String(v(n)).includes(String(n))) errors.push(`[${code}] ${k}: Zahl ${n} fehlt im Text`);
    }
  }
}

// 4. Alle im HTML und JS benutzten Schlüssel existieren
const used = new Set();
for (const m of src.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) used.add(m[1]);
for (const m of src.matchAll(/\bt\('([A-Za-z0-9]+)'\s*[,)]/g)) used.add(m[1]);
if (/\bt\('coach' \+ G\.n\)/.test(src)) for (const n of [1, 2, 3]) used.add('coach' + n);
for (const k of used) if (!(k in base)) errors.push(`Schlüssel "${k}" wird benutzt, steht aber nicht in I18N`);

// 5. Hinweis auf unbenutzte Schlüssel (kein Fehler)
const unused = baseKeys.filter(k => !used.has(k));

if (errors.length) {
  console.error(`Übersetzungen unvollständig (${errors.length} Fehler):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`Übersetzungen OK: ${Object.keys(I18N).length} Sprachen × ${baseKeys.length} Texte` + (unused.length ? ` (unbenutzt: ${unused.join(', ')})` : ''));
