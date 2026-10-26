// Erzeugt die Grafiken für den Play-Store-Eintrag aus dem echten Spiel:
//   fastlane/metadata/android/<sprache>/images/icon.png              (512×512, nur en-US)
//   fastlane/metadata/android/<sprache>/images/featureGraphic.png    (1024×500)
//   fastlane/metadata/android/<sprache>/images/phoneScreenshots/N.png (1080×1920)
//
//   python3 tools/build_web.py && node tools/store_assets.js
//
// Braucht Playwright mit Chromium (npm i -g playwright, dann ggf. NODE_PATH=$(npm root -g)).
// Die Texte auf den Bildern stehen unten in CAPTIONS; neue Sprache = neuer Eintrag dort und in LOCALES.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'fastlane', 'metadata', 'android');

// Spielsprache → Play-Store-Sprachen (es-419 bekommt dieselben Bilder wie es-ES)
const LOCALES = { en: ['en-US'], de: ['de-DE'], es: ['es-ES', 'es-419'], pt: ['pt-BR'], fr: ['fr-FR'], id: ['id'], tr: ['tr-TR'] };

// [Überschrift, Unterzeile] je Screenshot; tag = Zeile auf der Titelgrafik
const CAPTIONS = {
  en: { tag: 'Clear the board without a crash.', shots: [
    ['Clear the board', 'Every arrow moves in only one direction.'],
    ['Find the right order', 'A crash costs a heart.'],
    ['Hardcore', '5 hearts for all levels. How far can you get?'],
    ['Blitz', 'Random levels against the clock.'],
    ['Three modes', 'Calm puzzles, endless levels.'],
    ['Light or dark', 'And confetti for perfect rounds.'] ] },
  de: { tag: 'Räum das Feld ab, ohne Zusammenstoß.', shots: [
    ['Räum das Feld ab', 'Jeder Pfeil fährt nur in seine Richtung.'],
    ['Finde die Reihenfolge', 'Ein Zusammenstoß kostet ein Herz.'],
    ['Hardcore', '5 Herzen für alle Level. Wie weit kommst du?'],
    ['Blitz', 'Zufällige Level gegen die Uhr.'],
    ['Drei Modi', 'Ruhige Rätsel, unendlich viele Level.'],
    ['Hell oder dunkel', 'Und Konfetti für perfekte Runden.'] ] },
  es: { tag: 'Despeja el tablero sin chocar.', shots: [
    ['Despeja el tablero', 'Cada flecha va solo en su dirección.'],
    ['Encuentra el orden', 'Un choque cuesta un corazón.'],
    ['Hardcore', '5 corazones para todos los niveles. ¿Hasta dónde llegarás?'],
    ['Relámpago', 'Niveles aleatorios contra el reloj.'],
    ['Tres modos', 'Puzles tranquilos, niveles infinitos.'],
    ['Claro u oscuro', 'Y confeti en las rondas perfectas.'] ] },
  pt: { tag: 'Limpe o tabuleiro sem batidas.', shots: [
    ['Limpe o tabuleiro', 'Cada seta só anda na sua direção.'],
    ['Ache a ordem certa', 'Uma batida custa um coração.'],
    ['Hardcore', '5 corações para todos os níveis. Até onde você chega?'],
    ['Relâmpago', 'Níveis aleatórios contra o relógio.'],
    ['Três modos', 'Quebra-cabeças calmos, níveis infinitos.'],
    ['Claro ou escuro', 'E confete nas rodadas perfeitas.'] ] },
  fr: { tag: 'Libère le plateau sans collision.', shots: [
    ['Libère le plateau', 'Chaque flèche ne va que dans sa direction.'],
    ['Trouve le bon ordre', 'Une collision coûte un cœur.'],
    ['Hardcore', '5 cœurs pour tous les niveaux. Jusqu’où iras-tu ?'],
    ['Éclair', 'Des niveaux aléatoires contre la montre.'],
    ['Trois modes', 'Des puzzles zen, des niveaux à l’infini.'],
    ['Clair ou sombre', 'Et des confettis pour les manches parfaites.'] ] },
  id: { tag: 'Kosongkan papan tanpa tabrakan.', shots: [
    ['Kosongkan papan', 'Setiap panah hanya bergerak ke satu arah.'],
    ['Temukan urutannya', 'Tabrakan membuatmu kehilangan satu nyawa.'],
    ['Hardcore', '5 nyawa untuk semua level. Seberapa jauh kamu bisa?'],
    ['Kilat', 'Level acak melawan waktu.'],
    ['Tiga mode', 'Teka-teki santai, level tanpa batas.'],
    ['Terang atau gelap', 'Plus konfeti untuk ronde sempurna.'] ] },
  tr: { tag: 'Tahtayı çarpışmadan temizle.', shots: [
    ['Tahtayı temizle', 'Her ok yalnızca kendi yönüne gider.'],
    ['Doğru sırayı bul', 'Her çarpışma bir cana mal olur.'],
    ['Hardcore', 'Tüm seviyeler için 5 can. Ne kadar ileri gidebilirsin?'],
    ['Yıldırım', 'Zamana karşı rastgele seviyeler.'],
    ['Üç mod', 'Sakin bulmacalar, sınırsız seviyeler.'],
    ['Açık veya koyu', 'Kusursuz turlara konfeti.'] ] },
};

// Handy-Bildschirm für die Aufnahmen (CSS-Pixel) und Schärfe
const VW = 360, VH = 720, DSF = 3;
const C = { navy: '#16202A', red: '#FF5B4F', blue: '#4597FF', paper: '#E7ECF0' };

// Spiel laden und interne Funktionen für die Aufnahmen freigeben (nur in dieser Kopie)
const built = path.join(ROOT, 'build', 'pfeilfrei-web.html');
if (!fs.existsSync(built)) { console.error('Erst python3 tools/build_web.py ausführen.'); process.exit(1); }
let html = fs.readFileSync(built, 'utf8');
const HOOK = 'if (hot && hot.ready) hot.ready(boot); else boot(hot && hot.data);';
if (!html.includes(HOOK)) { console.error('Startzeile im Spiel nicht gefunden (HOOK anpassen).'); process.exit(1); }
html = html.replace(HOOK, HOOK + '\nwindow.__pf = { G, els, freeArrows, useHint, onBoardTap, LEVEL_GEN };');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-store-'));
const GAME = path.join(TMP, 'game.html');
fs.writeFileSync(GAME, html);
const LEVEL_GEN = +html.match(/const LEVEL_GEN = (\d+)/)[1];
const fontCss = fs.readFileSync(built, 'utf8').match(/@font-face\{[^}]*\}/g).join('\n'); // eingebettete Overpass-Schrift

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Spielstand, der nach „schon eine Weile gespielt“ aussieht
function state(lang, extra){
  return Object.assign({
    lang, level: 87, flawless: 41, hints: 4, sound: false, vib: false, zoomed: true, // zoomed: kein Zoom-Hinweis

    hc: { level: 23, hearts: 3, hints: 2, best: 31, intro: true, newBest: false },
    blitz: { best: 18, intro: true },
    run: { normal: null, hc: null, blitz: null },
  }, extra || {});
}

async function openGame(browser, lang, opts){
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF, colorScheme: opts.dark ? 'dark' : 'light', hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error(`[${lang}] Fehler im Spiel:`, e.message));
  await page.addInitScript(s => { localStorage.setItem('pfeilfrei_progress', s); }, JSON.stringify(state(lang, opts.state)));
  await page.goto('file://' + GAME);
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  return { ctx, page };
}

// Freie Pfeile antippen (wie ein Spieler, schnell hintereinander → Streak)
async function tapFree(page, count, gap){
  for (let i = 0; i < count; i++) {
    const ok = await page.evaluate(() => {
      const { G, freeArrows, onBoardTap } = window.__pf;
      const free = freeArrows(G.board.level, G.board.alive).filter(id => !G.board.anim[id]);
      if (!free.length) return false;
      // bevorzugt Pfeile nahe der Mitte, damit das Streak-Schild gut zu sehen ist
      const W = G.board.W, H = G.board.level.H, L = G.layout;
      const head = id => { const c = G.board.level.arrows[id].cells.slice(-1)[0]; return [c % W, Math.floor(c / W)]; };
      free.sort((a, b) => { const [ax, ay] = head(a), [bx, by] = head(b); return Math.hypot(ax - W / 2, ay - H / 2) - Math.hypot(bx - W / 2, by - H / 2); });
      const [x, y] = head(free[0]);
      onBoardTap(L.ox + (x + 0.5) * L.cell, L.oy + (y + 0.5) * L.cell);
      return true;
    });
    if (!ok) break;
    await sleep(gap);
  }
}

async function shot(page, file){ await page.screenshot({ path: file }); }

// Rohaufnahmen der 6 Szenen für eine Sprache
async function captureRaw(browser, lang, dir){
  const raw = [];
  const take = async (name, opts, act) => {
    const { ctx, page } = await openGame(browser, lang, opts);
    await act(page);
    const f = path.join(dir, `${lang}-${name}.png`);
    await shot(page, f);
    raw.push(f);
    await ctx.close();
  };
  // 1: Klassisch, mittleres Level, Streak beim schnellen Abräumen
  await take('1', { state: { level: 24 } }, async p => {
    await p.click('#btnClassic'); await sleep(500);
    await tapFree(p, 6, 230); await sleep(120);
  });
  // 2: großes, verschlungenes Level mit Tipp
  await take('2', { state: { level: 87 } }, async p => {
    await p.click('#btnClassic'); await sleep(500);
    await tapFree(p, 3, 400); await sleep(900);
    await p.evaluate(() => window.__pf.useHint()); await sleep(500);
  });
  // 3: Hardcore mit 3 von 5 Herzen
  await take('3', {}, async p => {
    await p.click('#btnHc'); await sleep(500);
    await tapFree(p, 4, 380); await sleep(900);
  });
  // 4: Blitz: laufender Durchgang bei Level 12 mit 0:47
  await take('4', { state: { run: { normal: null, hc: null,
      blitz: { n: 12, v: LEVEL_GEN, seed: 424242, removed: [], hearts: 3, crashes: 0, hint: -1, time: 47400 } } } }, async p => {
    await p.click('#btnBlitz'); await sleep(400);
    await tapFree(p, 3, 300); await sleep(700);
  });
  // 5: Menü mit allen drei Modi
  await take('5', {}, async p => { await sleep(1200); });
  // 6: dunkles Design, fehlerfrei gelöst → Konfetti und „Perfekte Runde!“
  await take('6', { dark: true, state: { level: 9 } }, async p => {
    await p.click('#btnClassic'); await sleep(500);
    await tapFree(p, 200, 90); await sleep(700);
  });
  return raw;
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Bühne: dunkler Hintergrund mit Metro-Linien, Text oben, Handy darunter
function stageHtml(img, title, sub, i){
  const lines = [
    `<path d="M-40 ${560 + i * 30} H 300 Q 360 ${560 + i * 30} 360 ${620 + i * 30} V 2000" stroke="${C.red}" />`,
    `<path d="M1120 ${420 - i * 20} H 820 Q 760 ${420 - i * 20} 760 ${480 - i * 20} V 2000" stroke="${C.blue}" />`,
  ].join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:${C.navy};font-family:Overpass,sans-serif}
  svg.bg{position:absolute;inset:0}
  .cap{position:absolute;left:70px;right:70px;top:78px;color:#F8FAFB;text-align:center}
  h1{font-weight:900;font-size:84px;line-height:1.02;margin:0 0 22px;letter-spacing:-.01em}
  p{font-weight:700;font-size:40px;line-height:1.25;margin:0;color:#B9C4CE}
  .phone{position:absolute;left:150px;top:396px;width:780px;height:1560px;border-radius:72px;background:#05090D;padding:16px;
    box-shadow:0 30px 80px rgba(0,0,0,.45), 0 0 0 3px #2A3743}
  .phone img{display:block;width:748px;height:1496px;border-radius:58px}
  </style></head><body>
  <svg class="bg" width="1080" height="1920" fill="none" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" opacity=".9">${lines}</svg>
  <div class="cap"><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
  <div class="phone"><img src="file://${img}"></div>
  </body></html>`;
}

function featureHtml(lang, img){
  const eyebrow = { en: 'Arrow puzzle', de: 'Pfeil-Puzzle', es: 'Puzle de flechas', pt: 'Quebra-cabeça de setas', fr: 'Puzzle de flèches', id: 'Teka-teki panah', tr: 'Ok bulmacası' }[lang];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
  html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:${C.navy};font-family:Overpass,sans-serif;color:#F8FAFB}
  svg.bg{position:absolute;inset:0}
  .txt{position:absolute;left:64px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center}
  .ico{width:96px;height:96px;border-radius:22px;margin-bottom:26px;box-shadow:0 0 0 2px #2A3743}
  .eb{font-weight:800;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:#8FA0AF;margin:0 0 6px}
  h1{font-weight:900;font-size:72px;line-height:.98;margin:0 0 18px}
  h1 b{color:${C.red}}
  p{font-weight:700;font-size:27px;line-height:1.25;margin:0;color:#B9C4CE}
  .card{position:absolute;right:56px;top:40px;width:360px;height:520px;border-radius:44px;overflow:hidden;background:${C.paper};
    box-shadow:0 20px 60px rgba(0,0,0,.45);transform:rotate(-6deg)}
  .card img{width:360px;height:720px;margin-top:-100px;display:block}
  </style></head><body>
  <svg class="bg" width="1024" height="500" fill="none" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".85">
    <path d="M-20 474 H 500 Q 548 474 548 426 V -20" stroke="${C.blue}"/>
  </svg>
  <div class="txt"><img class="ico" src="file://${path.join(ROOT, 'docs', 'icon.svg')}"><p class="eb">${esc(eyebrow)}</p>
    <h1>Arrow<br>Escape<b>.</b></h1><p>${esc(CAPTIONS[lang].tag)}</p></div>
  <div class="card"><img src="file://${img}"></div>
  </body></html>`;
}

async function render(browser, htmlStr, w, h, file){
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const f = path.join(TMP, 'stage.html');
  fs.writeFileSync(f, htmlStr);
  await page.goto('file://' + f);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: file, omitBackground: false });
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const only = process.argv[2]; // optional: nur eine Sprache, z. B. "de"
  for (const lang of Object.keys(LOCALES)) {
    if (only && only !== lang) continue;
    const raw = await captureRaw(browser, lang, TMP);
    for (const loc of LOCALES[lang]) {
      const dir = path.join(OUT, loc, 'images', 'phoneScreenshots');
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i < raw.length; i++) {
        const [title, sub] = CAPTIONS[lang].shots[i];
        await render(browser, stageHtml(raw[i], title, sub, i), 1080, 1920, path.join(dir, `${i + 1}.png`));
      }
      await render(browser, featureHtml(lang, raw[1]), 1024, 500, path.join(OUT, loc, 'images', 'featureGraphic.png'));
    }
    console.log(`${lang}: ${raw.length} Screenshots + Titelgrafik`);
  }
  // App-Symbol 512×512 (für alle Sprachen gleich)
  const iconDir = path.join(OUT, 'en-US', 'images');
  fs.mkdirSync(iconDir, { recursive: true });
  const svg = fs.readFileSync(path.join(ROOT, 'docs', 'icon.svg'), 'utf8');
  await render(browser, `<!doctype html><html><body style="margin:0">${svg}</body></html>`, 512, 512, path.join(iconDir, 'icon.png'));
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('Fertig:', OUT);
})();
