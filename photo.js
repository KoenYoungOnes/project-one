// photo.js - echte afbeeldingen (uitgeknipt uit de referentieplaatjes), met procedurele terugval uit art.js.
// Alle sprites kijken in het bronbeeld: spelers/vijanden naar RECHTS, drone en bazen naar LINKS.
const PH = { tint: {}, warp: new WeakMap() };
const have = (...k) => k.every(x => IMG[x]);
function photoDraw(im, ...a) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, ...a); ctx.imageSmoothingEnabled = false; }
function tinted(key, src, fn) {
  if (PH.tint[key]) return PH.tint[key];
  const [c, g] = mk(src.width, src.height); g.drawImage(src, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const o = fn(d[i], d[i + 1], d[i + 2], d[i + 3]); d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; if (o[3] !== undefined) d[i + 3] = o[3]; }
  g.putImageData(id, 0, 0); return PH.tint[key] = c;
}
// kleurgrading per level (level 0 = origineel)
const GRADE = [null, (r, g, b) => [r * .55, g * .82, b * 1.3], (r, g, b) => [r * 1.4, g * .8, b * .55], (r, g, b) => [r * 1.05, g * .62, b * 1.28]];
const GRADE_CUT = th => (r, g, b, a) => { const o = GRADE[th] ? GRADE[th](r, g, b) : [r, g, b], v = Math.max(r, g, b) / 255; return [o[0], o[1], o[2], v < .1 ? 0 : v < .17 ? Math.round((v - .1) / .07 * a) : a]; };

// ---------- vloer en tiles ----------
const FK = 32 / 166, FP = 840 * FK;          // strook is 166px hoog = 2 tiles; FP = breedte van één herhaling in spel-eenheden
function floorImg(th) {                       // één keer vooraf naar schermresolutie geschaald (snel op telefoons)
  const k = 'fl' + th; if (PH.tint[k]) return PH.tint[k];
  const src = GRADE[th] ? tinted('floor' + th, IMG.floor, GRADE[th]) : IMG.floor, sc = S * ZOOM * FK, [c, g] = mk(Math.round(840 * sc), Math.round(166 * sc));
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); c.fs = c.width / 840; return PH.tint[k] = c;
}
function drawFloorTile(src, c, r, upper) {
  const f = src.fs, sx = ((c * T) % FP) / FK, sw = T / FK, sy = upper ? 0 : 83, sh = 83, dx = Math.round(c * T - camX), dy = r * T;
  if (sx + sw <= 840) ctx.drawImage(src, sx * f, sy * f, sw * f, sh * f, dx, dy, T, T);
  else { const w1 = 840 - sx, d1 = Math.floor(w1 * FK); ctx.drawImage(src, sx * f, sy * f, w1 * f, sh * f, dx, dy, d1, T); ctx.drawImage(src, 0, sy * f, (sw - w1) * f, sh * f, dx + d1, dy, T - d1, T); }
}
function drawDoor() {
  const x = Math.round(DOOR * T - camX);
  for (let r = 0; r < 12; r++) {
    R_(x, r * T, T, T, '#262b34'); R_(x, r * T, 2, T, '#4a5262'); R_(x + 14, r * T, 2, T, '#0c0e12'); R_(x + 3, r * T + 1, 10, T - 2, '#1a1e26');
    for (let yy = 0; yy < T - 2; yy++) for (let xx = 0; xx < 10; xx++) if (((xx + yy + r * 16) >> 2) & 1) R_(x + 3 + xx, r * T + 1 + yy, 1, 1, '#c89a18');
  }
  glow(x + 8, 5 * T, 14, 'rgba(255,40,30,.8)', .55 + .3 * Math.sin(t / 6)); R_(x + 6, 5 * T - 2, 4, 4, '#ff3a2a');
}
function drawTiles(th) {
  if (!have('floor')) return drawTilesProc(th);
  const src = floorImg(th), A = ART.tiles[th] || (ART.tiles[th] = buildTiles(th)), c0 = Math.floor(camX / T), c1 = c0 + W / T + 1;
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1 && c < COLS; c++) {
    const v = grid[r][c]; if (!v) continue;
    if (v === 2) { ctx.drawImage(A.spike, Math.round(c * T - camX), r * T); continue; }
    const top = r > 0 && !solid(c, r - 1) && r < 13; drawFloorTile(src, c, r, top);
  }
  if (locked) drawDoor();
}

// ---------- achtergrond ----------
function wallImg(th) { return th === 0 ? IMG.bg0 : tinted('wall' + th, IMG.bg0, GRADE_CUT(th)); }
function drawBG(th, cam = camX) {
  if (!have('bg0')) return drawBGProc(th, cam);
  if (th !== 0) { ctx.save(); ctx.translate(0, -70); drawBGProc(th, cam); ctx.restore(); }   // ver-laag (sterren / stad / reactor) zichtbaar door de ramen
  else { ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, VW, VH); }
  const im = wallImg(th), k = VH / im.height, per = im.width * k, ox = -((cam * .5) % per);
  for (let x = ox; x < VW; x += per) photoDraw(im, Math.round(x), 0, Math.ceil(per) + 1, Math.ceil(VH));
  if (th === 2) glow(VW / 2, VH, 200, 'rgba(255,100,20,.7)', .14 + .08 * Math.sin(t / 20));
}

// ---------- personages ----------
function star(x, y, s, face) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(0, -s * .55); ctx.lineTo(s * .22, -s * .15); ctx.lineTo(s, 0); ctx.lineTo(s * .22, s * .15); ctx.lineTo(0, s * .55); ctx.lineTo(-s * .18, 0); ctx.fill();
  ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.moveTo(0, -s * .25); ctx.lineTo(s * .6, 0); ctx.lineTo(0, s * .25); ctx.lineTo(-s * .1, 0); ctx.fill(); ctx.restore();
}
// ---------- wapperende cape: de achterkant van de sprite wordt in 8 frames vervormd (golf + terugtrekken) ----------
const WN = 8, WP = { run: { amp: 7.5, pull: 12, ph: 5.5 }, jump: { amp: 5, pull: 9, ph: 4, lift: 4 }, idle: { amp: 1.6, pull: 1.5, ph: 4 } };
const smooth = (a, b, v) => { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
function warpSet(im, mode) {
  let m = PH.warp.get(im); if (!m) PH.warp.set(im, m = {}); if (m[mode]) return m[mode];
  const P = WP[mode], w = im.width, h = im.height, pad = Math.ceil(P.pull + P.amp + (P.lift || 0)) + 3, cell = 4, frames = [];
  for (let i = 0; i < WN; i++) {
    const [c, g] = mk(w + pad * 2, h + pad * 2), phi = Math.PI * 2 * i / WN; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
    for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
      const cw = Math.min(cell, w - x), ch = Math.min(cell, h - y), xn = (x + cw / 2) / w, yn = (y + ch / 2) / h;
      const wt = smooth(.26, .56, yn) * Math.pow(1 - xn, 1.25);                       // alleen onderrug/achterkant (cape, sjaal)
      const dy = P.amp * wt * Math.sin(phi - xn * P.ph + yn * 2) - (P.lift || 0) * wt;
      const dx = -P.pull * wt * (.78 + .22 * Math.sin(phi - yn * 3));
      g.drawImage(im, x, y, cw, ch, x + pad + dx, y + pad + dy, cw + .7, ch + .7);
    }
    frames.push(c);
  }
  return m[mode] = { frames, pad };
}
function photoChar(im, e, face, pose, anim, shoot, hgt, alpha, handY, glowCol, seed = 0) {
  const sw = im.width * hgt / im.height, cx = e.x + e.w / 2 - camX, base = e.y + e.h;
  let bob = 0, sx = 1, sy = 1, rot = 0;
  if (pose === 'run') { const ph = Math.sin(anim * Math.PI); bob = -Math.abs(ph) * 1.4; rot = .06; sy = 1 + .028 * ph; }
  else if (pose === 'jump') { sy = 1.07; sx = .95; rot = .09; }
  else sy = 1 + .012 * Math.sin(t / 18);
  const recoil = shoot ? -.8 * face : 0;
  ctx.save(); ctx.translate(Math.round(cx * 2) / 2 + recoil, Math.round((base + bob) * 2) / 2); ctx.scale(face * sx, sy); ctx.rotate(rot); if (alpha < 1) ctx.globalAlpha = alpha;
  const ws = warpSet(im, pose), fr = ws.frames[Math.floor(t * (pose === 'run' ? .42 : pose === 'jump' ? .25 : .08) + seed) % WN], k = hgt / im.height;
  photoDraw(fr, -sw / 2 - ws.pad * k, -hgt - ws.pad * k, fr.width * k, fr.height * k); ctx.restore();
  const hx = cx + face * sw * .5, hy = base - hgt + hgt * handY;
  glow(cx + face * sw * .1, base - hgt * .74, 8, glowCol, .35 * alpha);
  if (shoot) { glow(hx + face * 3, hy, 14, 'rgba(255,220,90,.9)', .85); star(hx + face * 1, hy, 11, face); }
}
function drawPlayer() {
  const p = player, im = IMG[charId ? 'spr_sigil' : 'spr_visor']; if (!im) return drawPlayerProc();
  if (p.inv > 0 && Math.floor(p.inv / 3) % 2) return;
  const pose = !p.ground ? 'jump' : Math.abs(p.vx) > .1 ? 'run' : 'idle', hand = charId ? .53 : .36;
  if (p.dash > 0) for (let i = 1; i < 5; i++) photoChar(im, { x: p.x - p.face * i * 7, y: p.y, w: p.w, h: p.h }, p.face, 'run', 1, false, 36, .3 - i * .05, hand, 'rgba(255,40,30,.0)');
  photoChar(im, p, p.face, pose, p.anim, p.shootT > 0, 36, 1, hand, charId ? 'rgba(255,100,40,.7)' : 'rgba(255,40,30,.7)');
}
function drawEnemy(e) {
  if (e.type === 'turret' || !have('spr_drone', 'spr_sigil')) return drawEnemyProc(e);
  if (e.type === 'grunt') {
    const im = tinted('grunt', IMG.spr_sigil, (r, g, b, a) => (b > r + 6 && r < g + 40) ? [r * 1.5 + 10, g * .85, b * .6, a] : [r, g, b, a]);
    return photoChar(im, e, e.face, e.vx ? 'run' : 'idle', e.t / 6, !e.vx, 33, 1, .53, 'rgba(255,150,40,.6)', (e.x | 0) % WN);
  }
  const im = IMG.spr_drone, w = 20, h = im.height * w / im.width, cx = e.x + e.w / 2 - camX, bob = Math.sin(t / 8) * .6;
  ctx.save(); ctx.translate(Math.round(cx), Math.round(e.y + 5 + bob)); ctx.scale(e.face > 0 ? -1 : 1, 1); photoDraw(im, -w / 2, -h / 2, w, h); ctx.restore();
  glow(cx + (e.face > 0 ? 1 : -1) * -.5, e.y + 5 + bob, 9, 'rgba(180,255,50,.8)', .6 + .15 * Math.sin(t / 5));
}
function drawBoss() {
  const b = boss; if (!b) return; const im = IMG['spr_boss' + b.id]; if (!im) return drawBossProc();
  const hs = b.h * 1.2, ws = im.width * hs / im.height, cx = b.x + b.w / 2 - camX, bot = b.y + b.h, dir = b.face > 0 ? -1 : 1;   // bron kijkt naar links
  ctx.save(); ctx.translate(Math.round(cx), Math.round(bot)); ctx.scale(b.face > 0 ? -1 : 1, 1); if (b.flash % 2) ctx.globalAlpha = .55;
  photoDraw(im, -ws / 2, -hs, ws, hs); ctx.restore();
  const mx = cx - dir * ws * .47, my = bot - hs * .5; glow(mx, my, 20, 'rgba(255,200,60,.9)', .5 + .25 * Math.sin(t / 5));
  const R = rng(Math.floor(t / 3) * 31 + b.id); ctx.save(); ctx.strokeStyle = 'rgba(255,230,90,.9)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { let x = cx + (R() - .5) * ws * 1.1, y = bot - R() * hs * 1.1; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (R() - .5) * 10; y += (R() - .5) * 10; ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
}
