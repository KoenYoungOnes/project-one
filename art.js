// art.js - 16-bit (Sega Mega Drive-stijl) pixelart: procedureel getekend, omlijnd, gearceerd en gecachet.
// Wordt vóór game.js geladen; gebruikt globals uit game.js alleen binnen functies.
const R_ = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const ART = { tiles: {}, bg: {}, spr: {}, halo: {}, over: null };
const LW = 512;

function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function rgbOf(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function sh(h, a) { const c = rgbOf(h), f = v => Math.max(0, Math.min(255, Math.round(a >= 0 ? v + (255 - v) * a : v * (1 + a)))); return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`; }
function halo(col, r) {
  const k = col + r; if (ART.halo[k]) return ART.halo[k];
  const [c, g] = mk(r * 2, r * 2), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return ART.halo[k] = c;
}
function glow(x, y, r, col, a = 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(halo(col, r), Math.round(x - r), Math.round(y - r)); ctx.restore(); }
function outline(c, col = '#07070f') {
  const [o, x] = mk(c.width + 2, c.height + 2), [s, sx] = mk(c.width, c.height);
  sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = col; sx.fillRect(0, 0, c.width, c.height);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) x.drawImage(s, dx, dy);
  x.drawImage(c, 1, 1); return o;
}
const pmk = g => (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// =============== TILES ===============
function buildTiles(th) {
  const TH = THEMES[th], out = {};
  const base = (v) => {
    const [c, g] = mk(16, 16), P = pmk(g), gr = g.createLinearGradient(0, 0, 0, 16);
    gr.addColorStop(0, sh(TH.base, .14)); gr.addColorStop(1, sh(TH.base, -.2)); g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
    const R = rng(v * 97 + th * 13 + 5);
    for (let i = 0; i < 26; i++) { P(Math.floor(R() * 16), Math.floor(R() * 16), 1, 1, R() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.14)'); }
    P(0, 0, 16, 1, sh(TH.light, .1)); P(0, 0, 1, 16, sh(TH.light, -.05)); P(15, 0, 1, 16, sh(TH.dark, -.1)); P(0, 15, 16, 1, sh(TH.dark, -.3));
    return [c, g, P];
  };
  const rivet = (P, x, y) => { P(x, y, 2, 2, sh(TH.accent, -.15)); P(x, y, 1, 1, sh(TH.accent, .6)); P(x + 1, y + 1, 1, 1, sh(TH.dark, -.4)); };
  out.int = [0, 1, 2].map(v => {
    const [c, g, P] = base(v);
    if (v === 0) { P(2, 2, 12, 12, sh(TH.dark, -.1)); P(3, 3, 10, 10, sh(TH.base, -.02)); P(3, 3, 10, 1, sh(TH.light, .05)); P(3, 12, 10, 1, sh(TH.dark, -.2)); rivet(P, 3, 3); rivet(P, 11, 3); rivet(P, 3, 11); rivet(P, 11, 11); }
    else if (v === 1) { P(2, 2, 12, 12, sh(TH.dark, -.2)); for (let y = 4; y < 13; y += 3) { P(3, y, 10, 2, '#06080a'); P(3, y + 2, 10, 1, sh(TH.light, -.1)); } rivet(P, 1, 1); rivet(P, 13, 13); }
    else { const gr = g.createLinearGradient(0, 4, 0, 12); gr.addColorStop(0, sh(TH.light, .35)); gr.addColorStop(.5, sh(TH.base, -.05)); gr.addColorStop(1, sh(TH.dark, -.5)); g.fillStyle = gr; g.fillRect(0, 4, 16, 8); P(0, 3, 16, 1, 'rgba(0,0,0,.5)'); P(0, 12, 16, 1, 'rgba(0,0,0,.5)'); P(7, 3, 2, 10, sh(TH.dark, -.2)); P(7, 3, 2, 1, sh(TH.light, .2)); rivet(P, 2, 6); rivet(P, 12, 6); }
    return c;
  });
  const topTile = (floor) => {
    const [c, g, P] = base(floor ? 3 : 4);
    P(0, 0, 16, 4, sh(TH.light, .08)); P(0, 0, 16, 1, sh(TH.light, .6)); P(0, 3, 16, 1, sh(TH.dark, -.2)); P(0, 4, 16, 1, 'rgba(0,0,0,.25)');
    P(2, 1, 1, 1, '#fff'); P(10, 1, 3, 1, sh(TH.light, .8));
    if (floor) { for (let x = 0; x < 16; x++) for (let y = 11; y < 15; y++) P(x, y, 1, 1, ((x + y) >> 2) & 1 ? '#e8b020' : '#16161c'); P(0, 10, 16, 1, 'rgba(0,0,0,.45)'); P(0, 15, 16, 1, '#000'); rivet(P, 3, 6); rivet(P, 11, 6); }
    else { P(2, 7, 12, 6, sh(TH.dark, -.1)); P(3, 8, 10, 4, sh(TH.base, -.02)); rivet(P, 3, 8); rivet(P, 11, 8); }
    return c;
  };
  out.top = topTile(false); out.ftop = topTile(true);
  { const [c, g] = mk(16, 16), P = pmk(g); P(0, 0, 16, 16, sh(TH.base, -.55)); const R = rng(77 + th);
    for (let i = 0; i < 20; i++) P(Math.floor(R() * 16), Math.floor(R() * 16), 1, 1, 'rgba(0,0,0,.25)');
    P(0, 0, 16, 1, '#000'); for (const x of [3, 11]) { P(x, 1, 3, 15, sh(TH.dark, -.3)); P(x, 1, 1, 15, sh(TH.accent, -.4)); P(x + 2, 1, 1, 15, '#000'); P(x - 1, 5, 5, 2, sh(TH.base, -.3)); }
    out.deep = c; }
  { const [c, g] = mk(16, 16), P = pmk(g); P(0, 12, 16, 4, sh(TH.base, -.3)); P(0, 12, 16, 1, sh(TH.light, .1)); P(0, 15, 16, 1, '#000');
    for (let i = 0; i < 4; i++) { const x = i * 4;
      g.fillStyle = '#e6eaee'; g.beginPath(); g.moveTo(x, 12); g.lineTo(x + 2, 2); g.lineTo(x + 2, 12); g.fill();
      g.fillStyle = '#7a8290'; g.beginPath(); g.moveTo(x + 2, 12); g.lineTo(x + 2, 2); g.lineTo(x + 4, 12); g.fill();
      P(x + 2, 3, 1, 2, '#fff'); }
    out.spike = c; }
  return out;
}
function drawTilesProc(th) {
  const old = IMG['tiles' + th], A = ART.tiles[th] || (ART.tiles[th] = buildTiles(th));
  const c0 = Math.floor(camX / T), c1 = c0 + W / T + 1;
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1 && c < COLS; c++) {
    const v = grid[r][c]; if (!v) continue; const x = Math.round(c * T - camX), y = r * T;
    if (old) { ctx.drawImage(old, (v - 1) * T, 0, T, T, x, y, T, T); continue; }
    let s;
    if (v === 2) s = A.spike;
    else if (r >= 13) s = A.deep;
    else if (!solid(c, r - 1) && r > 0) s = r === 12 ? A.ftop : A.top;
    else s = A.int[(c * 7 + r * 3) % 3];
    ctx.drawImage(s, x, y);
  }
  if (locked) {
    const x = Math.round(DOOR * T - camX);
    for (let r = 0; r < 12; r++) {
      R_(x, r * T, T, T, '#262b34'); R_(x, r * T, 2, T, '#4a5262'); R_(x + 14, r * T, 2, T, '#0c0e12'); R_(x + 3, r * T + 1, 10, T - 2, '#1a1e26');
      for (let yy = 0; yy < T - 2; yy++) for (let xx = 0; xx < 10; xx++) if (((xx + yy + r * 16) >> 2) & 1) R_(x + 3 + xx, r * T + 1 + yy, 1, 1, '#c89a18');
    }
    glow(x + 8, 5 * T, 14, 'rgba(255,40,30,.8)', .55 + .3 * Math.sin(t / 6)); R_(x + 6, 5 * T - 2, 4, 4, '#ff3a2a');
  }
}

// =============== ACHTERGRONDEN ===============
function wrap(fn) { for (const ox of [-LW, 0, LW]) fn(ox); }
function pipeH(g, x, y, w, h, col) {
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, sh(col, .5)); gr.addColorStop(.25, sh(col, .1)); gr.addColorStop(.7, sh(col, -.4)); gr.addColorStop(1, sh(col, -.7));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function buildBG(th) {
  const L = [mk(LW, H), mk(LW, H), mk(LW, H)], R = rng(th * 1000 + 3), out = [];
  const [c0, g0] = L[0], [c1, g1] = L[1], [c2, g2] = L[2], P0 = pmk(g0), P1 = pmk(g1), P2 = pmk(g2);
  const rad = (g, x, y, r, col, a = 1) => { g.save(); g.globalAlpha = a; g.drawImage(halo(col, r), x - r, y - r); g.restore(); };
  if (th === 0) {                                                                         // FABRIEK
    const gr = g0.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a120f'); gr.addColorStop(1, '#17261f'); g0.fillStyle = gr; g0.fillRect(0, 0, LW, H);
    for (let i = 0; i < 8; i++) {
      const x = i * 64; P0(x + 2, 4, 60, H - 8, '#0f1914'); P0(x + 2, 4, 60, 1, '#233a31'); P0(x + 2, 4, 1, H - 8, '#1d3028'); P0(x + 61, 4, 1, H - 8, '#050a08');
      for (let y = 14; y < H; y += 28) { P0(x + 6, y, 52, 1, '#08100d'); P0(x + 6, y + 1, 52, 1, '#1c2e26'); }
      if (i % 2 === 0) {
        P0(x + 8, 22, 48, 88, '#46564f'); P0(x + 10, 24, 44, 84, '#01020a');
        for (let s = 0; s < 40; s++) P0(x + 10 + Math.floor(R() * 44), 24 + Math.floor(R() * 84), 1, 1, R() < .2 ? '#fff' : '#6a78a8');
        for (let k = 0; k < 4; k++) { const tx = x + 12 + k * 11, th_ = 20 + Math.floor(R() * 40); P0(tx, 108 - th_, 8, th_, '#0b1228'); for (let w = 0; w < th_ - 4; w += 6) if (R() < .6) P0(tx + 2, 108 - th_ + 3 + w, 2, 2, '#2a3c70'); }
        P0(x + 8, 22, 48, 2, '#6a7c74'); P0(x + 8, 108, 48, 2, '#2a3832'); P0(x + 32, 24, 2, 84, '#2a3832');
      } else {
        P0(x + 10, 60, 44, 56, '#0a1210'); P0(x + 10, 60, 44, 1, '#2a4238'); P0(x + 12, 64, 40, 20, '#031008');
        g0.strokeStyle = '#3aff9a'; g0.lineWidth = 1; g0.beginPath(); g0.moveTo(x + 13, 74); for (let k = 0; k < 18; k++) g0.lineTo(x + 13 + k * 2, 74 + (k % 5 === 2 ? -7 : k % 5 === 3 ? 6 : 0)); g0.stroke();
        for (let k = 0; k < 6; k++) P0(x + 14 + k * 6, 92, 4, 3, ['#e03030', '#30e060', '#e0a020', '#30a0e0'][k % 4]); P0(x + 14, 100, 28, 2, '#1e3028');
      }
    }
    for (const y of [40, 120]) { pipeH(g1, 0, y, LW, 12, '#3c5048'); P1(0, y - 2, LW, 2, 'rgba(0,0,0,.35)'); for (let x = 0; x < LW; x += 64) { pipeH(g1, x, y - 3, 8, 18, '#5a7066'); P1(x + 1, y, 2, 2, '#c8e0d4'); P1(x + 1, y + 10, 2, 2, '#c8e0d4'); } }
    wrap(ox => { pipeH(g1, ox + 200, 52, 9, 68, '#3c5048'); pipeH(g1, ox + 197, 50, 15, 5, '#5a7066'); pipeH(g1, ox + 197, 117, 15, 5, '#5a7066'); });
    g1.strokeStyle = '#05080a'; g1.lineWidth = 2; for (const [a, b] of [[60, 150], [290, 400], [440, 500]]) { g1.beginPath(); g1.moveTo(a, 52); g1.quadraticCurveTo((a + b) / 2, 96, b, 52); g1.stroke(); }
    for (const x of [96, 352]) { P1(x - 2, 20, 4, 8, '#2a3832'); P1(x - 4, 28, 8, 4, '#ffcf6a'); rad(g1, x, 32, 34, 'rgba(255,170,60,.55)'); }
    for (const x of [48, 304]) { P2(x, 0, 18, H, '#16201c'); const gr2 = g2.createLinearGradient(x, 0, x + 18, 0); gr2.addColorStop(0, '#3a4c44'); gr2.addColorStop(.3, '#1e2c26'); gr2.addColorStop(1, '#070c0a'); g2.fillStyle = gr2; g2.fillRect(x, 0, 18, H);
      for (let y = 6; y < H; y += 16) { P2(x + 2, y, 2, 2, '#6a8478'); P2(x + 14, y, 2, 2, '#0a100e'); } for (let k = 0; k < 18; k++) for (let y = 160; y < 190; y++) if (((k + y) >> 2) & 1) P2(x + k, y, 1, 1, '#a07a18'); }
  } else if (th === 1) {                                                                  // RUIMTESTATION
    const gr = g0.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#01020a'); gr.addColorStop(1, '#0c1234'); g0.fillStyle = gr; g0.fillRect(0, 0, LW, H);
    rad(g0, 90, 60, 90, 'rgba(110,50,170,.35)'); rad(g0, 330, 150, 110, 'rgba(40,80,190,.3)'); rad(g0, 470, 50, 70, 'rgba(160,50,120,.22)');
    for (let i = 0; i < 160; i++) { const s = R() < .12 ? 2 : 1; P0(Math.floor(R() * LW), Math.floor(R() * H), s, s, ['#fff', '#aab8ff', '#ffd8b0', '#7a88c0'][Math.floor(R() * 4)]); }
    const pg = g0.createRadialGradient(380, 62, 4, 392, 78, 50); pg.addColorStop(0, '#6a82c8'); pg.addColorStop(.5, '#2a3c80'); pg.addColorStop(1, '#050818'); g0.fillStyle = pg; g0.beginPath(); g0.arc(390, 76, 46, 0, 7); g0.fill();
    g0.strokeStyle = 'rgba(160,190,255,.5)'; g0.lineWidth = 2; g0.beginPath(); g0.ellipse(390, 80, 74, 14, -.35, 0, 7); g0.stroke();
    wrap(ox => { P1(ox, 150, LW, 6, '#0a1030'); P1(ox, 150, LW, 1, '#2a3a78');
      for (const x of [60, 200, 340, 460]) { P1(ox + x, 100, 4, 90, '#0a1030'); P1(ox + x - 30, 112, 64, 20, '#0d2a6a'); for (let k = 0; k < 8; k++) P1(ox + x - 30 + k * 8, 112, 1, 20, '#1a4aa0'); P1(ox + x - 30, 122, 64, 1, '#1a4aa0'); P1(ox + x - 1, 96, 6, 5, '#4ad0ff'); }
      for (let k = 0; k < 14; k++) P1(ox + k * 37 + 8, 144 + (k % 2) * 8, 2, 2, k % 3 ? '#ffd88a' : '#4ad0ff'); });
    for (const x of [70, 340]) { for (let y = 0; y < H; y += 28) { P2(x, y, 3, 28, '#2a3358'); P2(x + 17, y, 3, 28, '#1a2040'); g2.strokeStyle = '#242c50'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(x + 2, y); g2.lineTo(x + 18, y + 28); g2.moveTo(x + 18, y); g2.lineTo(x + 2, y + 28); g2.stroke(); P2(x - 1, y, 22, 2, '#4a5890'); } rad(g2, x + 10, 40, 22, 'rgba(74,208,255,.6)'); P2(x + 8, 38, 4, 4, '#aaf0ff'); }
  } else if (th === 2) {                                                                  // REACTOR
    const gr = g0.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e0506'); gr.addColorStop(.6, '#2a0c08'); gr.addColorStop(1, '#6a2008'); g0.fillStyle = gr; g0.fillRect(0, 0, LW, H);
    rad(g0, 250, 112, 130, 'rgba(255,120,30,.45)'); rad(g0, 250, 112, 70, 'rgba(255,220,120,.5)');
    const cg = g0.createLinearGradient(236, 0, 270, 0); cg.addColorStop(0, '#5a1a08'); cg.addColorStop(.35, '#ffd890'); cg.addColorStop(.5, '#fff6d0'); cg.addColorStop(.65, '#ffd890'); cg.addColorStop(1, '#5a1a08'); g0.fillStyle = cg; g0.fillRect(236, 0, 34, H);
    for (let y = 10; y < H; y += 32) { P0(228, y, 50, 6, '#3a1208'); P0(228, y, 50, 1, '#a04a20'); P0(228, y + 5, 50, 1, '#12040a'); }
    for (let i = 0; i < 8; i++) { const x = i * 64 + 20; P1(x, 30, 22, H, '#1c0c0a'); const pg = g1.createLinearGradient(x, 0, x + 22, 0); pg.addColorStop(0, '#5a342a'); pg.addColorStop(.35, '#2a1612'); pg.addColorStop(1, '#0a0404'); g1.fillStyle = pg; g1.fillRect(x, 30, 22, H);
      for (let y = 46; y < 150; y += 22) { P1(x + 5, y, 12, 4, '#ff8a2a'); P1(x + 5, y, 12, 1, '#ffe0a0'); rad(g1, x + 11, y + 2, 14, 'rgba(255,120,30,.55)'); }
      for (let k = 0; k < 22; k++) for (let y = 170; y < 180; y++) if (((k + y) >> 2) & 1) P1(x + k, y, 1, 1, '#b08a18'); }
    pipeH(g2, 0, 70, LW, 12, '#4a2c24'); for (let x = 0; x < LW; x += 96) { pipeH(g2, x, 66, 8, 20, '#6a4034'); P2(x + 1, 70, 2, 2, '#ffb070'); }
  } else {                                                                                // CYBER CITY
    const gr = g0.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#04061a'); gr.addColorStop(.55, '#1a1040'); gr.addColorStop(1, '#4a2050'); g0.fillStyle = gr; g0.fillRect(0, 0, LW, H);
    for (let i = 0; i < 100; i++) P0(Math.floor(R() * LW), Math.floor(R() * 120), 1, 1, R() < .15 ? '#fff' : '#7a7ab0');
    rad(g0, 140, 48, 50, 'rgba(200,190,255,.35)'); g0.fillStyle = '#e8e4ff'; g0.beginPath(); g0.arc(140, 48, 17, 0, 7); g0.fill(); g0.fillStyle = '#c4c0ee'; g0.beginPath(); g0.arc(135, 44, 5, 0, 7); g0.arc(147, 54, 4, 0, 7); g0.fill();
    for (let x = 0; x < LW; x += 14) { const h = 40 + Math.floor(R() * 60); P0(x, 190 - h, 14, h + 40, '#120e2e'); }
    const fg = g0.createLinearGradient(0, 120, 0, H); fg.addColorStop(0, 'rgba(120,60,140,0)'); fg.addColorStop(1, 'rgba(160,70,140,.5)'); g0.fillStyle = fg; g0.fillRect(0, 120, LW, H - 120);
    let x = 0; while (x < LW) {
      const w = 30 + Math.floor(R() * 20), h = 70 + Math.floor(R() * 90), top = 210 - h, ws = [];
      P1(x, top, w, h, '#16143a'); P1(x, top, w, 1, '#3a3880'); P1(x + w - 2, top, 2, h, '#0a0a24'); P1(x, top, 2, h, '#24215a');
      for (let wy = top + 6; wy < 200; wy += 7) for (let wx = x + 5; wx < x + w - 5; wx += 6) if (R() < .5) P1(wx, wy, 3, 3, ['#ff6aa8', '#6ad0ff', '#ffd04a', '#c8a0ff'][Math.floor(R() * 4)]);
      if (R() < .5) { P1(x + w / 2, top - 14, 2, 14, '#2a2858'); P1(x + w / 2 - 1, top - 16, 4, 3, '#ff3a5a'); rad(g1, x + w / 2 + 1, top - 15, 10, 'rgba(255,50,80,.7)'); }
      if (R() < .25) { P1(x + 4, top + 12, w - 8, 10, '#ff3a9a'); P1(x + 6, top + 14, w - 12, 6, '#ffd0ea'); rad(g1, x + w / 2, top + 17, 26, 'rgba(255,60,160,.45)'); }
      x += w + 2 + Math.floor(R() * 4);
    }
    for (const bx of [60, 300]) { P2(bx, 110, 18, 120, '#0b0a22'); P2(bx + 16, 110, 2, 120, '#2a2860'); P2(bx - 4, 106, 26, 6, '#1a1844'); g2.fillStyle = '#1c1a48'; g2.beginPath(); g2.ellipse(bx + 9, 106, 16, 12, 0, Math.PI, 0); g2.fill(); P2(bx - 8, 104, 34, 2, '#c8a0ff'); P2(bx - 6, 100, 30, 1, '#7a5ab0'); for (let y = 124; y < 190; y += 8) P2(bx + 4, y, 4, 2, '#ffd04a'); }
    P2(78, 150, 222, 5, '#0b0a22'); P2(78, 150, 222, 1, '#3a3880'); for (let k = 0; k < 14; k++) P2(84 + k * 16, 155, 2, 6, '#0b0a22');
  }
  return [{ c: c0, s: .12 }, { c: c1, s: .3 }, { c: c2, s: .55 }];
}
function drawBGProc(th, cam = camX) {
  const old = IMG['bg' + th];
  if (old) { const w = old.width; for (let x = -((cam * .4) % w); x < W; x += w) ctx.drawImage(old, Math.round(x), 0); return; }
  const layers = ART.bg[th] || (ART.bg[th] = buildBG(th));
  ctx.fillStyle = THEMES[th].bg; ctx.fillRect(0, 0, W, H);
  for (const l of layers) { const ox = -Math.floor((cam * l.s) % LW); ctx.drawImage(l.c, ox, 0); ctx.drawImage(l.c, ox + LW, 0); }
  if (th === 2) glow(W / 2, H, 260, 'rgba(255,100,20,.7)', .16 + .08 * Math.sin(t / 20));
}

// =============== PERSONAGES ===============
function buildChar(pal, variant, pose, fr, shoot) {
  const [c, g] = mk(24, 24), P = pmk(g);
  const hoodL = sh(pal.hood, .3), hoodD = sh(pal.hood, -.38), clL = sh(pal.cloak, .24), clD = sh(pal.cloak, -.32), boot = '#10101a', bootL = '#34344c';
  const sway = pose === 'run' ? 4 : pose === 'jump' ? 3 : 1;
  for (let i = 0; i < 9; i++) { const y = 9 + i, x0 = 7 - Math.round(sway * (i + 1) / 9) - (pose === 'run' && fr % 2 ? 1 : 0); P(x0, y, 9 - x0, 1, i % 3 === 0 ? clD : pal.cloak2); }
  P(5 - sway, 17, 4 + sway, 1, pal.trim);
  P(8, 12, 2, 4, pal.cloak2);
  let legs;
  if (pose === 'jump') legs = [[8, 17, 3, 4], [13, 17, 4, 3]];
  else if (pose === 'run') { const Lg = [[8, 14, 0, 2], [10, 12, 0, 0], [14, 8, 2, 0], [12, 10, 0, 2]][fr % 4]; legs = [[Lg[0], 17, 3, 7 - Lg[2]], [Lg[1], 17, 3, 7 - Lg[3]]]; }
  else legs = [[9, 17, 3, 7], [13, 17, 3, 7]];
  legs.forEach(([x, y, w, h], i) => { P(x, y, w, h, i ? pal.cloak : pal.cloak2); P(x, y + h - 3, w + 1, 3, boot); P(x, y + h - 3, w, 1, bootL); });
  P(8, 11, 9, 7, pal.cloak); P(8, 11, 9, 1, clL); P(15, 12, 2, 6, clD); P(8, 17, 9, 2, clD);
  for (const x of [10, 13]) P(x, 16, 1, 3, pal.cloak2);
  P(8, 15, 9, 1, pal.trim); P(12, 15, 2, 1, '#ffd04a');
  if (shoot) { P(14, 12, 6, 3, pal.cloak); P(13, 12, 2, 3, clL); P(19, 11, 4, 4, '#3a4258'); P(19, 11, 4, 1, '#7a86a6'); P(19, 14, 4, 1, '#1a1e2c'); }
  else { P(14, 12, 3, 5, pal.cloak); P(14, 12, 3, 1, clL); P(14, 16, 3, 2, '#2c3248'); }
  const rows = [[10, 15], [9, 16], [8, 17], [7, 17], [7, 18], [7, 18], [7, 18], [7, 18], [7, 17], [8, 17], [8, 16]];
  rows.forEach(([a, b], i) => { P(a, i, b - a + 1, 1, i < 3 ? hoodL : pal.hood); P(b - 1, i, 2, 1, hoodD); });
  P(8, 1, 3, 1, sh(pal.hood, .55)); P(7, 4, 1, 4, hoodL); P(5, 5, 2, 4, pal.hood); P(4, 7, 3, 2, hoodD);
  P(11, 4, 6, 6, '#06060c'); P(12, 3, 5, 1, '#06060c');
  if (variant === 0) { P(11, 6, 6, 2, '#ff2a1a'); P(12, 6, 4, 1, '#ffd0c0'); P(11, 8, 6, 1, 'rgba(255,50,30,.4)'); P(11, 5, 6, 1, 'rgba(255,50,30,.3)'); }
  else { const s = '#ff5a2a'; P(13, 4, 2, 1, s); P(11, 5, 6, 1, s); P(11, 6, 1, 2, s); P(16, 6, 1, 2, s); P(13, 6, 2, 3, s); P(12, 8, 1, 1, s); P(15, 8, 1, 1, s); P(14, 5, 1, 1, '#ffd0a0'); }
  P(12, 9, 4, 1, '#c98f6a');
  P(8, 10, 8, 1, pal.trim); P(8, 11, 8, 1, sh(pal.trim, -.4));
  return outline(c);
}
function charSprite(pal, variant, pose, fr, shoot) {
  const k = pal.hood + variant + pose + fr + shoot; return ART.spr[k] || (ART.spr[k] = buildChar(pal, variant, pose, fr, shoot));
}
function drawChar(e, pal, variant, face, pose, fr, shoot, alpha, gcol) {
  const s = charSprite(pal, variant, pose, fr, shoot), cx = e.x + e.w / 2 - camX, top = e.y + e.h - 25;
  ctx.save(); ctx.translate(Math.round(cx), Math.round(top)); ctx.scale(face, 1); if (alpha < 1) ctx.globalAlpha = alpha; ctx.drawImage(s, -13, 0); ctx.restore();
  glow(cx + face * 2, top + 8, 11, gcol, .55 * alpha);
  if (shoot) glow(cx + face * 11, top + 13, 10, 'rgba(255,220,90,.9)', .8);
}
function drawSprite(name, e, flip) {
  const im = IMG[name]; ctx.save(); ctx.translate(Math.round(e.x + e.w / 2 - camX), Math.round(e.y + e.h));
  if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -im.width / 2, -im.height); ctx.restore();
}
function drawPlayerProc() {
  const p = player; if (p.inv > 0 && Math.floor(p.inv / 3) % 2) return;
  if (IMG['player' + charId]) return drawSprite('player' + charId, p, p.face < 0);
  const pose = !p.ground ? 'jump' : Math.abs(p.vx) > .1 ? 'run' : 'idle';
  if (p.dash > 0) for (let i = 1; i < 5; i++) { ctx.globalAlpha = .35 - i * .06; drawChar({ x: p.x - p.face * i * 7, y: p.y, w: p.w, h: p.h }, PAL[charId], charId, p.face, 'run', 1, false, 1, 'rgba(255,40,30,.4)'); ctx.globalAlpha = 1; }
  drawChar(p, PAL[charId], charId, p.face, pose, Math.floor(p.anim), p.shootT > 0, 1, charId ? 'rgba(255,100,40,.7)' : 'rgba(255,40,30,.7)');
}

// =============== VIJANDEN ===============
function buildDrone(fr) {
  const [c, g] = mk(20, 14), P = pmk(g);
  P(1, 1, 6, 1, fr ? 'rgba(210,230,255,.7)' : 'rgba(210,230,255,.3)'); P(13, 1, 6, 1, fr ? 'rgba(210,230,255,.7)' : 'rgba(210,230,255,.3)'); P(3, 2, 2, 2, '#7a8088'); P(15, 2, 2, 2, '#7a8088');
  P(4, 3, 12, 8, '#cfd6dc'); P(5, 2, 10, 1, '#e8eef2'); P(4, 3, 12, 1, '#f6fafc'); P(4, 10, 12, 1, '#7a828a'); P(15, 3, 1, 8, '#9aa2aa'); P(9, 3, 1, 8, '#aab2ba'); P(4, 6, 2, 1, '#aab2ba');
  P(6, 4, 6, 6, '#1c2024'); P(7, 5, 4, 4, '#06080a'); P(8, 6, 2, 2, '#b8ff2a'); P(8, 6, 1, 1, '#f4ffc0');
  P(16, 6, 3, 2, '#6a727a'); P(18, 6, 2, 2, '#22262a'); P(9, 11, 3, 2, '#3a4048'); P(9, 0, 1, 2, '#7a8088');
  return outline(c);
}
function buildTurretBase() {
  const [c, g] = mk(18, 14), P = pmk(g);
  P(1, 9, 16, 5, '#4a525c'); P(1, 9, 16, 1, '#8a929c'); P(1, 13, 16, 1, '#2a3038'); P(3, 11, 2, 2, '#c8a020'); P(13, 11, 2, 2, '#c8a020');
  g.fillStyle = '#7a8692'; g.beginPath(); g.arc(9, 9, 7, Math.PI, 0); g.fill(); g.fillStyle = '#a8b4c0'; g.beginPath(); g.arc(8, 8, 5, Math.PI * 1.05, Math.PI * 1.7); g.lineTo(8, 8); g.fill();
  P(7, 5, 5, 4, '#14181c'); P(8, 6, 2, 2, '#ff3a20'); P(8, 6, 1, 1, '#ffc0b0');
  return outline(c);
}
function drawEnemyProc(e) {
  if (IMG[e.type]) return drawSprite(e.type, e, e.face > 0);
  const cx = e.x + e.w / 2 - camX;
  if (e.type === 'grunt') drawChar(e, EPAL, 0, e.face, e.vx ? 'run' : 'idle', Math.floor(e.t / 6), !e.vx, 1, 'rgba(255,150,40,.6)');
  else if (e.type === 'drone') {
    const s = ART.spr['drone' + (t >> 1 & 1)] || (ART.spr['drone' + (t >> 1 & 1)] = buildDrone(t >> 1 & 1));
    ctx.save(); ctx.translate(Math.round(cx), Math.round(e.y)); ctx.scale(e.face > 0 ? 1 : -1, 1); ctx.drawImage(s, -11, -2); ctx.restore();
    glow(cx + e.face * -2, e.y + 6, 9, 'rgba(160,255,40,.8)', .7);
  } else {
    const s = ART.spr.tbase || (ART.spr.tbase = buildTurretBase());
    ctx.drawImage(s, Math.round(cx - 10), Math.round(e.y + e.h - 15));
    const a = Math.atan2(player.y + 8 - (e.y + 6), player.x + 6 - (e.x + 7)); ctx.save(); ctx.translate(Math.round(cx), Math.round(e.y + 6)); ctx.rotate(a);
    R_(-1, -2, 12, 5, '#06080a'); R_(0, -1, 10, 3, '#39414a'); R_(0, -1, 10, 1, '#7a8692'); R_(9, -1, 2, 3, '#ff5a30'); ctx.restore();
    glow(cx, e.y + 7, 8, 'rgba(255,50,30,.7)', .6);
  }
}

// =============== BAZEN ===============
function buildBoss(id) {
  const D = BOSSES[id], s = id === 4 ? 1.4 : 1, [c, g] = mk(Math.round(50 * s), Math.round(42 * s)), PP = pmk(g);
  const P = (x, y, w, h, col) => PP(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), col);
  const A = (x, y, w, h, col) => { P(x, y, w, h, col); P(x, y, w, 1, sh(col, .5)); P(x, y, 1, h, sh(col, .3)); P(x + w - 1, y, 1, h, sh(col, -.35)); P(x, y + h - 1, w, 1, sh(col, -.5)); P(x + 1, y + 1, 1, Math.max(1, h - 3), sh(col, .2)); };
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(Math.round(x * s), Math.round(y * s)) : g.moveTo(Math.round(x * s), Math.round(y * s))); g.fill(); };
  poly([[16, 14], [11, 0], [21, 9]], D.acc); poly([[16, 14], [11, 0], [14, 9]], sh(D.acc, .4)); poly([[30, 10], [41, 0], [35, 16]], D.col2); poly([[30, 10], [41, 0], [36, 9]], sh(D.col2, .5)); poly([[30, 10], [41, 0], [38, 8]], D.acc);
  A(11, 27, 9, 7, D.col2); A(10, 33, 10, 5, D.col); A(8, 37, 13, 4, sh(D.col, -.4));
  A(23, 26, 9, 8, D.col2); A(23, 33, 11, 5, D.col); A(22, 37, 15, 4, sh(D.col, -.4)); P(34, 38, 2, 2, D.acc);
  A(10, 19, 6, 9, D.col); A(10, 27, 7, 5, D.col2); P(11, 29, 5, 1, sh(D.col2, -.3));
  A(15, 13, 15, 14, D.col); A(17, 25, 11, 5, D.col2); for (let x = 18; x < 27; x += 3) P(x, 26, 1, 3, sh(D.col2, -.4));
  P(18, 14, 9, 8, sh(D.col, -.25)); P(18, 14, 9, 1, sh(D.col, .4));
  g.fillStyle = D.acc; g.font = `bold ${Math.round((D.letter.length > 1 ? 6 : 8) * s)}px monospace`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(D.letter, Math.round(22.5 * s), Math.round(21 * s));
  A(8, 12, 8, 9, D.col); A(27, 10, 10, 10, D.col); P(32, 14, 3, 3, D.acc); P(32, 14, 1, 1, '#fff');
  A(31, 18, 7, 8, D.col); A(37, 19, 8, 6, D.col2); P(37, 20, 8, 1, sh(D.col2, .4)); P(37, 24, 8, 1, sh(D.col2, -.5)); P(44, 20, 2, 4, '#201008');
  P(20, 12, 6, 3, '#1c2038');
  P(19, 3, 9, 10, '#d9a67f'); P(19, 3, 9, 1, '#f0c8a0'); P(26, 4, 2, 9, '#b98660');
  const eye = () => P(23, 7, 3, 1, '#0c0c14');
  if (id === 1) { P(19, 3, 9, 3, '#3a3a42'); P(19, 10, 8, 3, '#2a2420'); P(20, 9, 4, 1, '#d9a67f'); eye(); P(27, 6, 3, 5, '#8a9ab8'); }
  else if (id === 2) { P(19, 3, 9, 2, '#2a2018'); P(27, 4, 3, 7, '#2a2e3a'); P(19, 6, 9, 3, '#12121a'); P(20, 7, 7, 1, '#ffa030'); P(19, 10, 8, 3, '#2a2420'); }
  else if (id === 3) { P(18, 2, 11, 4, '#5a3a24'); P(18, 2, 11, 1, '#8a5a38'); P(18, 5, 2, 4, '#5a3a24'); eye(); P(27, 6, 3, 5, '#8a9ab8'); P(20, 11, 5, 1, '#8a5a50'); }
  else { P(19, 3, 9, 2, '#c8967a'); P(19, 3, 9, 1, '#e8b898'); P(19, 10, 8, 3, '#b0b0b8'); P(22, 6, 5, 1, '#202028'); eye(); P(27, 6, 3, 5, '#8a9ab8'); }
  return outline(c);
}
function drawBossProc() {
  const b = boss; if (!b) return;
  if (IMG['boss' + b.id]) return drawSprite('boss' + b.id, b, b.face > 0);
  const s = ART.spr['boss' + b.id] || (ART.spr['boss' + b.id] = buildBoss(b.id)), k = b.id === 4 ? 1.4 : 1;
  const cx = b.x + b.w / 2 - camX, bot = b.y + b.h;
  ctx.save(); ctx.translate(Math.round(cx), Math.round(bot - (40 * k + 1))); ctx.scale(b.face > 0 ? 1 : -1, 1); if (b.flash % 2) ctx.globalAlpha = .55;
  ctx.drawImage(s, -Math.round(22.5 * k) - 1, 0);
  ctx.restore();
  const tipX = cx + (b.face > 0 ? 1 : -1) * (22 * k), tipY = bot - 40 * k + 21 * k;
  glow(tipX, tipY, 18 * k, 'rgba(255,200,60,.9)', .55 + .25 * Math.sin(t / 5));
  const R = rng(Math.floor(t / 3) * 31 + b.id); ctx.save(); ctx.strokeStyle = 'rgba(255,230,90,.9)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { let x = cx + (R() - .5) * b.w * 1.5, y = bot - R() * b.h * 1.2; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (R() - .5) * 10; y += (R() - .5) * 10; ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
}

// =============== EFFECTEN ===============
function drawFX() {
  for (const it of items) {
    const x = Math.round(it.x - camX), y = Math.round(it.y + ((t >> 3) & 1)), hp = it.kind === 'hp';
    glow(x + 4, y + 4, 12, hp ? 'rgba(255,170,150,.8)' : 'rgba(255,170,60,.8)', .6);
    R_(x - 1, y - 1, 10, 10, '#0a0a12'); R_(x, y, 8, 8, hp ? '#f08a9a' : '#f0a030'); R_(x, y, 8, 1, '#fff'); R_(x, y + 7, 8, 1, 'rgba(0,0,0,.4)');
    R_(x + 3, y + 1, 2, 6, '#fff'); R_(x + 1, y + 3, 6, 2, '#fff');
  }
  for (const b of bullets) {
    const x = b.x - camX, cy = b.y + b.h / 2;
    if (b.pierce) { glow(x + b.w / 2, cy, 22, 'rgba(255,90,40,.9)', .9); ctx.fillStyle = '#ff5a2a'; ctx.beginPath(); ctx.ellipse(x + b.w / 2, cy, 7, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe8a0'; ctx.beginPath(); ctx.ellipse(x + b.w / 2, cy, 4, 3, 0, 0, 7); ctx.fill(); }
    else { glow(x + b.w / 2, cy, 12, 'rgba(255,200,60,.9)', .8); R_(x - 1, b.y - 1, b.w + 2, b.h + 2, '#ff9a20'); R_(x, b.y, b.w, b.h, '#fff8c0'); R_(x - Math.sign(b.vx) * 4, b.y + 1, 4, 1, 'rgba(255,200,60,.6)'); }
  }
  for (const b of ebullets) {
    const x = b.x - camX + b.w / 2, y = b.y + b.h / 2; glow(x, y, 11, 'rgba(255,60,120,.9)', .8);
    ctx.fillStyle = '#ff3a6a'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe0ea'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 7); ctx.fill();
  }
  for (const q of particles) {
    if (q.ring) { ctx.strokeStyle = `rgba(255,220,150,${Math.max(0, q.life / 14)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x - camX, q.y, q.r, 0, 7); ctx.stroke(); continue; }
    const a = Math.min(1, q.life / 12), z = q.life > 10 ? 3 : 2; glow(q.x - camX + 1, q.y + 1, 7, 'rgba(255,170,60,.8)', a * .6); R_(q.x - camX, q.y, z, z, q.col || '#ffe8b0');
  }
}
function drawOverlay() {
  if (!ART.over) {
    const [c, g] = mk(W, H), vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.1)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1); ART.over = c;
  }
  ctx.drawImage(ART.over, 0, 0);
}
