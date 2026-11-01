// PROJECT ONE - Mega Man-achtige platformer. 384x224 interne resolutie, 16px tiles.
const W = 384, H = 224, T = 16, ROWS = 14, ARENA = 24;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const FONT = "'Press Start 2P',monospace";
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').catch(() => {});

// ---------- Sprites (optioneel): zet PNG's in assets/ en haal de regels hieronder uit commentaar ----------
// Spelers/vijanden: één afbeelding, kijkt naar rechts, wordt automatisch gespiegeld. Voeten onderaan.
const SPRITE_FILES = {
  boss1_full:'assets/boss1_full.jpg', boss2_full:'assets/boss2_full.jpg', boss3_full:'assets/boss3_full.jpg', boss4_full:'assets/boss4_full.jpg',
  // title:'assets/title.png',            // volledig titelscherm (384x224)
  // player0:'assets/player_visor.png', player1:'assets/player_sigil.png',
  // portrait0:'assets/portrait_visor.png', portrait1:'assets/portrait_sigil.png',
  // grunt:'assets/grunt.png', drone:'assets/drone.png', turret:'assets/turret.png',
  // boss1:'assets/boss1.png', boss2:'assets/boss2.png', boss3:'assets/boss3.png', boss4:'assets/boss4.png',
  // boss1_portrait:'assets/boss1_portrait.png', /* idem boss2..4 */
  // tiles0:'assets/tiles_factory.png', bg0:'assets/bg_factory.png', /* idem 1..3 */
};
const IMG = {};
for (const [k, src] of Object.entries(SPRITE_FILES)) { const i = new Image(); i.onload = () => IMG[k] = i; i.src = src; }

// ---------- Geluid (kleine 8-bit bleeps) ----------
let actx = null;
function sfx(f, d = .08, type = 'square', slide = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f; if (slide) o.frequency.linearRampToValueAtTime(f + slide, actx.currentTime + d);
    g.gain.value = .05; g.gain.linearRampToValueAtTime(0, actx.currentTime + d);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
  } catch (e) {}
}

// ---------- Input ----------
const keys = {}, pressed = {};
const MAP = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down',
  KeyZ:'jump', Space:'jump', KeyX:'shoot', KeyJ:'shoot', KeyC:'special', KeyK:'special', Enter:'start', Escape:'back' };
addEventListener('keydown', e => { const k = MAP[e.code]; if (!k) return; e.preventDefault(); if (!keys[k]) pressed[k] = true; keys[k] = true; });
addEventListener('keyup', e => { const k = MAP[e.code]; if (k) { e.preventDefault(); keys[k] = false; } });

// ---------- Touch-bediening (schermknoppen + tikken) ----------
(function touchSetup() {
  try {
    if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) return;
    document.body.classList.add('touch');
    const press = k => { if (!keys[k]) pressed[k] = true; keys[k] = true; }, release = k => { keys[k] = false; };
    document.querySelectorAll('#pad button').forEach(btn => {
      const k = btn.dataset.k;
      btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(k); btn.classList.add('on'); if (navigator.vibrate) navigator.vibrate(8); });
      const up = e => { e.preventDefault(); release(k); btn.classList.remove('on'); };
      btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('contextmenu', e => e.preventDefault());
    });
    cv.addEventListener('pointerdown', e => { e.preventDefault(); if (state !== 'play') { pressed.start = true; } });
    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  } catch (e) {}
})();

// ---------- Personages ----------
const CHARS = [
  { name: 'VISOR', desc: 'SNEL - RAPIDFIRE',  speed: 1.7, jump: -4.6, dmg: 1, maxB: 4, bw: 5, bh: 3, special: 'dash',  cost: 7 },
  { name: 'SIGIL', desc: 'KRACHT - ZWAAR',    speed: 1.4, jump: -4.9, dmg: 2, maxB: 2, bw: 7, bh: 5, special: 'blast', cost: 10 },
];
const PAL = [
  { hood: '#2b3150', cloak: '#232846', cloak2: '#1a1e36', trim: '#e03a3a' },
  { hood: '#2a2a33', cloak: '#202028', cloak2: '#16161c', trim: '#ff6a3a' },
];
const EPAL = { hood: '#3b4260', cloak: '#4a5170', cloak2: '#323852', trim: '#c23030' };

const BOSSES = [null,
  { letter: 'NC', col: '#2a5ac0', col2: '#b8c4d8', acc: '#f0a020', w: 28, h: 32, hp: 24 },
  { letter: 'W',  col: '#c8381a', col2: '#b8c4d8', acc: '#f0a020', w: 28, h: 32, hp: 28 },
  { letter: 'H',  col: '#e87a1a', col2: '#b8c4d8', acc: '#222',    w: 28, h: 32, hp: 32 },
  { letter: 'P',  col: '#5a2a7a', col2: '#3a6a9a', acc: '#f0a020', w: 40, h: 48, hp: 44 }];

// ---------- Levels ----------
const LEVELS = [
  { name: 'FACTORY',        boss: 1, seed: 11, len: 140, diff: 1, theme: 0 },
  { name: 'ORBITAL STATION',boss: 2, seed: 29, len: 150, diff: 2, theme: 1 },
  { name: 'REACTOR CORE',   boss: 3, seed: 47, len: 160, diff: 3, theme: 2 },
  { name: 'CYBER CITY',     boss: 4, seed: 83, len: 170, diff: 4, theme: 3 },
];
const THEMES = [
  { base: '#5d6e66', light: '#8ea396', dark: '#37433d', accent: '#e0902a', bg: '#18221e' },
  { base: '#4d5670', light: '#8793b8', dark: '#2b3148', accent: '#4ad0ff', bg: '#05060f' },
  { base: '#6e4a40', light: '#a8705e', dark: '#3d2822', accent: '#ff7a1a', bg: '#1a0c0a' },
  { base: '#4a4470', light: '#8a7fc0', dark: '#29254a', accent: '#ff4aa8', bg: '#0c0a24' },
];
let grid = [], COLS = 0, LV, ENEMY_DEFS = [], CHECK = 0, DOOR = 0;
const solid = (c, r) => c < 0 || c >= COLS ? true : r < 0 || r >= ROWS ? false : grid[r][c] === 1;
const spike = (c, r) => r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === 2;
function rng(s) { return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

function buildLevel(L) {
  LV = L; const R = rng(L.seed), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  COLS = L.len + ARENA + 1; DOOR = L.len;
  grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  for (let c = 0; c < COLS; c++) { grid[12][c] = 1; grid[13][c] = 1; }
  for (let r = 0; r < 12; r++) { grid[r][0] = 1; grid[r][COLS - 1] = 1; }
  ENEMY_DEFS = []; CHECK = 0;
  const blk = (c, r, n = 1, h = 1) => { for (let i = 0; i < n; i++) for (let j = 0; j < h; j++) grid[r + j][c + i] = 1; };
  const E = (type, c, r) => ENEMY_DEFS.push({ type, x: c * T, row: r });
  let c = 8;
  while (c < L.len - 6) {
    // vlak stuk met vijanden
    const n = ri(5, 8);
    if (!CHECK && c > L.len / 2) CHECK = c * T;
    if (R() < .8) E('grunt', c + n - 2, 12);
    if (L.diff > 1 && R() < .5) E('turret', c + ri(1, n - 2), 12);
    if (R() < .6) E('drone', c + ri(2, n), ri(5, 8));
    c += n;
    if (c >= L.len - 8) break;
    // hindernis
    const k = ri(0, 5 + (L.diff > 2 ? 1 : 0));
    if (k === 0 || k === 1) { const w = ri(2, 3); for (let i = 0; i < w; i++) { grid[12][c+i] = 0; grid[13][c+i] = 0; } c += w; }
    else if (k === 2) { const w = ri(2, 3); for (let i = 0; i < w; i++) grid[11][c+i] = 2; c += w; }
    else if (k === 3) { blk(c, 10, 1, 2); c += 2; }
    else if (k === 4) { blk(c, 11); blk(c+1, 10, 1, 2); blk(c+2, 9, 2, 3); blk(c+4, 11, 1); c += 6; E('turret', c - 3, 9); }
    else if (k === 5) { // hoge route over spikes
      const w = 12; for (let i = 0; i < w; i++) grid[11][c+i] = 2;
      blk(c + 1, 10, 3); blk(c + 6, 10, 3); blk(c + 11, 10, 1);
      E('drone', c + 4, 6); E('drone', c + 9, 7); c += w;
    } else { // afgrond met zwevend platform (hard)
      for (let i = 0; i < 9; i++) { grid[12][c+i] = 0; grid[13][c+i] = 0; }
      blk(c + 1, 10, 2); blk(c + 5, 9, 2); E('drone', c + 4, 6); c += 9;
    }
    // altijd een landingsstrook
    c += 3;
  }
  // trap naar arena + deur
  for (let r = 0; r < 12; r++) grid[r][DOOR] = 0;
  for (let cc = L.len - 6; cc <= DOOR + 2; cc++) { grid[12][cc] = 1; grid[13][cc] = 1; grid[11][cc] = 0; grid[10][cc] = 0; }
  if (!CHECK) CHECK = (L.len >> 1) * T;
}

// ---------- State ----------
let state = 'title', sel = 0, stageSel = 0, charId = 0, cleared = [false, false, false, false];
try { cleared = JSON.parse(localStorage.getItem('p1_cleared')) || cleared; } catch (e) {}
let player, enemies, bullets, ebullets, particles, items, boss, locked, camX, spawnX, t = 0, clearT = 0;

function startLevel(i) {
  buildLevel(LEVELS[i]); stageSel = i; spawnX = 2 * T; locked = false; boss = null; reset(); state = 'play';
}
function reset() {
  for (let r = 0; r < 12; r++) grid[r][DOOR] = 0; locked = false; boss = null;
  const ch = CHARS[charId];
  player = { x: spawnX, y: 10 * T, w: 12, h: 20, vx: 0, vy: 0, ground: false, face: 1, hp: 28, en: 28, inv: 0, shootT: 0, anim: 0, dash: 0, enT: 0 };
  enemies = ENEMY_DEFS.filter(d => d.x > spawnX + 6 * T).map(d => {
    const big = d.type === 'turret', fly = d.type === 'drone';
    const w = fly ? 14 : 14, h = fly ? 10 : big ? 14 : 20;
    return { type: d.type, x: d.x, y: d.row * T + (fly ? 0 : T - h), baseY: d.row * T, w: fly ? 14 : 14, h, vx: d.type === 'grunt' ? -.5 : 0, vy: 0, hp: big ? 3 : d.type === 'grunt' ? 2 : 1, t: (d.x * 7) % 90, face: -1, dead: false };
  });
  bullets = []; ebullets = []; particles = []; items = [];
  camX = Math.max(0, Math.min((COLS * T - W), player.x - W / 2));
}
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- Physics ----------
function moveBody(b) {
  b.hitWall = false; b.x += b.vx;
  let c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - .01) / T), r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - .01) / T);
  outer: for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solid(c, r)) {
    if (b.vx > 0) b.x = c * T - b.w; else if (b.vx < 0) b.x = (c + 1) * T; b.hitWall = true; break outer; }
  b.y += b.vy; b.ground = false;
  c0 = Math.floor(b.x / T); c1 = Math.floor((b.x + b.w - .01) / T); r0 = Math.floor(b.y / T); r1 = Math.floor((b.y + b.h - .01) / T);
  outer2: for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solid(c, r)) {
    if (b.vy > 0) { b.y = r * T - b.h; b.ground = true; } else if (b.vy < 0) b.y = (r + 1) * T; b.vy = 0; break outer2; }
}
function hurt(dmg) {
  if (player.inv > 0 || player.dash > 0) return;
  player.hp -= dmg; player.inv = 70; player.vy = -2; player.vx = -player.face * 1.2; sfx(120, .15, 'sawtooth', -60);
  if (player.hp <= 0) die();
}
function die() {
  for (let i = 0; i < 16; i++) particles.push({ x: player.x + 6, y: player.y + 10, vx: Math.cos(i) * 2, vy: Math.sin(i) * 2, life: 60 });
  state = 'dead'; t = 0; sfx(300, .5, 'sawtooth', -250);
}
function boom(x, y, n = 6, col = '#fff') { for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, life: 20, col }); }
function enemyShot(x, y, tx, ty, sp) { const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1; ebullets.push({ x, y, w: 5, h: 5, vx: dx / d * sp, vy: dy / d * sp }); }
function drop(x, y) {
  const r = Math.random();
  if (r < .22) items.push({ kind: 'hp', x, y, w: 8, h: 8, vx: 0, vy: 0, life: 600 });
  else if (r < .36) items.push({ kind: 'en', x, y, w: 8, h: 8, vx: 0, vy: 0, life: 600 });
}

// ---------- Boss ----------
function spawnBoss() {
  const id = LV.boss;
  const D = BOSSES[id];
  boss = { id, x: (DOOR + 17) * T, y: 6 * T, w: D.w, h: D.h, hp: D.hp, max: D.hp, vx: 0, vy: 0, t: 0, face: -1, ground: false, flash: 0, intro: 60, air: false, charge: 0 };
}
function updateBoss() {
  const b = boss, p = player; if (!b) return;
  if (b.intro > 0) { b.intro--; b.vy = Math.min(b.vy + .22, 5); moveBody(b); return; }
  b.t++; if (b.flash > 0) b.flash--;
  const toP = p.x < b.x ? -1 : 1;
  const walk = () => { b.vy = Math.min(b.vy + .22, 5); moveBody(b); };
  const jumpAt = (sp, vy) => { if (b.ground) { b.vy = vy; b.vx = toP * sp; b.face = toP; } };
  if (b.id === 1) {                       // springt, schokgolf bij landing
    if (b.ground) { b.vx = 0; if (b.air) { b.air = false; sfx(90, .2, 'sawtooth');
      ebullets.push({ x: b.x + 4, y: b.y + b.h - 6, w: 8, h: 6, vx: -2, vy: 0 }, { x: b.x + 16, y: b.y + b.h - 6, w: 8, h: 6, vx: 2, vy: 0 }); }
      if (b.t % 70 === 0) { jumpAt(1.6, -5.2); b.air = true; } }
    walk();
  } else if (b.id === 2) {                // zweeft, vuurt gericht
    b.x += (p.x - 60 * toP - b.x) * .01; b.y = 70 + Math.sin(b.t / 25) * 35; b.face = toP;
    b.x = Math.max((DOOR + 2) * T, Math.min((DOOR + 22) * T - b.w, b.x));
    if (b.t % 50 === 0) for (let i = -1; i <= 1; i++) { const a = Math.atan2(p.y - b.y, p.x - b.x) + i * .3; ebullets.push({ x: b.x + 12, y: b.y + 12, w: 5, h: 5, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 }); }
  } else if (b.id === 3) {                // laadt op en stormt
    const ph = b.t % 150;
    if (ph < 50) { b.vx = 0; b.face = toP; if (ph === 30) enemyShot(b.x + 14, b.y + 10, p.x, p.y + 8, 2.4); }
    else if (ph < 110) { b.vx = b.face * 3.2; if (b.hitWall) b.face = -b.face; }
    else { b.vx = 0; if (ph === 110) jumpAt(0, -4.5); }
    walk();
  } else {                                // eindbaas: alles samen
    const ph = b.t % 180;
    if (ph < 60) { if (b.ground && ph % 60 === 0) jumpAt(1.8, -5.2); if (ph === 30) for (let i = -2; i <= 2; i++) { const a = Math.atan2(p.y - b.y, p.x - b.x) + i * .25; ebullets.push({ x: b.x + 12, y: b.y + 8, w: 5, h: 5, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2 }); } }
    else if (ph < 130) { if (ph === 60) b.face = toP; b.vx = b.face * 3.4; if (b.hitWall) b.face = -b.face; }
    else { b.vx = 0; if (ph % 15 === 0) enemyShot(b.x + 14, b.y + 10, p.x, p.y + 8, 2.6); }
    if (b.ground && b.vx !== 0 && ph < 60 && b.t % 70 > 50) b.vx = 0;
    walk();
  }
  b.face = b.vx ? Math.sign(b.vx) : b.face;
  if (hit(p, b)) hurt(6);
}

// ---------- Update ----------
function update() {
  t++;
  if (state === 'title') { if (pressed.start || pressed.jump) { state = 'select'; sel = charId; sfx(660, .1); } return; }
  if (state === 'select') {
    if (pressed.left || pressed.right) { sel = 1 - sel; sfx(440, .05); }
    if (pressed.start || pressed.jump) { charId = sel; state = 'stages'; sfx(660, .1); }
    if (pressed.back) state = 'title'; return;
  }
  if (state === 'stages') {
    if (pressed.left) stageSel = stageSel & 2 | (stageSel & 1 ? 0 : 1) , sfx(440, .05);
    if (pressed.right) stageSel = stageSel & 2 | (stageSel & 1 ? 0 : 1), sfx(440, .05);
    if (pressed.up || pressed.down) { stageSel ^= 2; sfx(440, .05); }
    if (pressed.start || pressed.jump) { startLevel(stageSel); sfx(880, .15); }
    if (pressed.back) state = 'select'; return;
  }
  if (state === 'dead') {
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    if (t > 120) { state = 'play'; reset(); } return;
  }
  if (state === 'clear') {
    clearT++; particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    if (clearT > 200 && (pressed.start || pressed.jump)) { state = cleared.every(x => x) ? 'end' : 'stages'; t = 0; } return;
  }
  if (state === 'end') { if (pressed.start) { state = 'title'; } return; }
  if (pressed.back) { state = 'stages'; return; }

  const p = player, ch = CHARS[charId];
  // beweging
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (p.dash > 0) { p.dash--; p.vx = p.face * 4.2; p.vy = 0; }
  else {
    if (p.inv < 55) { p.vx = dir * ch.speed; if (dir) p.face = dir; }
    if (pressed.jump && p.ground) { p.vy = ch.jump; sfx(300, .1, 'square', 200); }
    if (!keys.jump && p.vy < -1.5) p.vy = -1.5;
    p.vy = Math.min(p.vy + .22, 5);
  }
  if (!(boss && boss.intro > 0)) moveBody(p);
  p.anim += p.ground && Math.abs(p.vx) > 0 ? .2 : 0;
  if (p.inv > 0) p.inv--;
  if (p.y > ROWS * T + 20) { p.hp = 0; die(); return; }
  if ((p.enT = (p.enT || 0) + 1) % 40 === 0 && p.en < 28) p.en++;
  const sc0 = Math.floor((p.x + 2) / T), sc1 = Math.floor((p.x + p.w - 2) / T), sr = Math.floor((p.y + p.h - 1) / T);
  if (spike(sc0, sr) || spike(sc1, sr)) hurt(28);
  // schieten & special
  if (p.shootT > 0) p.shootT--;
  if (pressed.shoot && bullets.filter(b => !b.pierce).length < ch.maxB) {
    bullets.push({ x: p.x + (p.face > 0 ? p.w : -ch.bw), y: p.y + 8, w: ch.bw, h: ch.bh, vx: p.face * 4.5, dmg: ch.dmg }); p.shootT = 12; sfx(900, .06, 'square', -400);
  }
  if (pressed.special && p.en >= ch.cost) {
    p.en -= ch.cost;
    if (ch.special === 'dash') { p.dash = 14; p.vy = 0; sfx(200, .2, 'sawtooth', 300); }
    else { bullets.push({ x: p.x + (p.face > 0 ? p.w : -12), y: p.y + 4, w: 12, h: 10, vx: p.face * 3.5, dmg: 4, pierce: true }); p.shootT = 16; sfx(150, .3, 'sawtooth', 200); }
  }
  if (p.dash > 0) for (const e of enemies) if (hit(p, e)) { e.hp -= 2; boom(e.x + 7, e.y + 7); e.dead = e.hp <= 0; }
  bullets.forEach(b => b.x += b.vx);
  bullets = bullets.filter(b => b.x > camX - 16 && b.x < camX + W + 16 && !solid(Math.floor((b.x + (b.vx > 0 ? b.w : 0)) / T), Math.floor(b.y / T)));
  // vijanden
  for (const e of enemies) {
    e.t++;
    const near = Math.abs(e.x - p.x) < 170, dx = p.x < e.x ? -1 : 1;
    if (e.type === 'grunt') {
      e.vy = Math.min(e.vy + .22, 4);
      if (near && Math.abs(p.y - e.y) < 36) { e.vx = 0; e.face = dx; if (e.t % 90 === 0) { enemyShot(e.x + 7 + dx * 7, e.y + 9, p.x + 6, p.y + 10, 1.8); sfx(500, .05); } }
      else { if (!e.vx) e.vx = e.face * .5; const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        if (e.ground && !solid(Math.floor(ahead / T), Math.floor((e.y + e.h + 2) / T))) e.vx = -e.vx; }
      moveBody(e); if (e.hitWall) e.vx = -e.vx; if (e.vx) e.face = Math.sign(e.vx);
    } else if (e.type === 'drone') {
      if (near) { e.x += dx * .5; e.face = dx; }
      e.y = e.baseY + Math.sin(e.t / 14) * 14;
      if (near && e.t % 100 === 0) enemyShot(e.x + 7, e.y + 5, p.x + 6, p.y + 10, 1.7);
    } else if (e.type === 'turret') {
      e.face = dx; if (near && e.t % 80 === 0) { enemyShot(e.x + 7, e.y + 4, p.x + 6, p.y + 6, 2); sfx(400, .05); }
    }
    for (const b of bullets) if (!b.used && hit(b, e)) { if (!b.pierce) b.used = true; e.hp -= b.dmg; boom(b.x, b.y, 4); sfx(200, .05);
      if (e.hp <= 0) { e.dead = true; boom(e.x + 7, e.y + 7, 10, '#ffb04a'); drop(e.x + 3, e.y); sfx(160, .2, 'sawtooth', -100); } }
    if (!e.dead && hit(p, e)) hurt(3);
  }
  bullets = bullets.filter(b => !b.used); enemies = enemies.filter(e => !e.dead && e.y < ROWS * T + 40);
  // boss
  if (boss) {
    for (const b of bullets) if (!b.used && boss.intro <= 0 && hit(b, boss)) { if (!b.pierce) b.used = true; boss.hp -= b.dmg; boss.flash = 4; boom(b.x, b.y, 3, '#ff8a4a'); sfx(180, .05); }
    updateBoss();
    if (boss.hp <= 0) { for (let i = 0; i < 40; i++) boom(boss.x + Math.random() * boss.w, boss.y + Math.random() * boss.h, 1, '#ffd84a'); sfx(100, .8, 'sawtooth', -60);
      boss = null; ebullets = []; state = 'clear'; clearT = 0; cleared[LV.boss - 1] = true; try { localStorage.setItem('p1_cleared', JSON.stringify(cleared)); } catch (e) {} return; }
  }
  // kogels vijand
  ebullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
  ebullets = ebullets.filter(b => b.x > camX - 24 && b.x < camX + W + 24 && b.y > -20 && b.y < H + 20 && !solid(Math.floor((b.x + b.w / 2) / T), Math.floor((b.y + b.h / 2) / T)));
  for (const b of ebullets) if (hit(b, p)) { hurt(boss ? 4 : 3); b.x = -999; }
  // items
  for (const it of items) { it.vy = Math.min(it.vy + .2, 3); moveBody(it); it.life--;
    if (hit(it, p)) { it.life = 0; if (it.kind === 'hp') p.hp = Math.min(28, p.hp + 6); else p.en = Math.min(28, p.en + 8); sfx(1000, .1, 'square', 300); } }
  items = items.filter(i => i.life > 0);
  particles.forEach(q => { q.x += q.vx; q.y += q.vy; q.life--; }); particles = particles.filter(q => q.life > 0);
  // checkpoint, deur, camera
  if (p.x > CHECK && spawnX < CHECK) { spawnX = CHECK; sfx(1200, .15); }
  if (!locked && p.x > (DOOR + 3) * T) { locked = true; for (let r = 0; r < 12; r++) grid[r][DOOR] = 1; spawnX = (DOOR - 4) * T; spawnBoss(); sfx(80, .4, 'sawtooth'); }
  camX = Math.max(0, Math.min(COLS * T - W, p.x - W / 2 + 6));
}

// ---------- Tekenen: personages ----------
const R_ = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
function drawHooded(p, pal, face, anim, air, shooting, variant, flash) {
  ctx.save(); ctx.translate(Math.round(p.x + p.w / 2 - camX), Math.round(p.y)); ctx.scale(face, 1);
  if (flash) ctx.globalAlpha = .6;
  const f = Math.floor(anim) % 4;
  R_(-8, 8, 5, 9, pal.cloak2); R_(-9, 10, 3, 6, pal.cloak2);                                  // mantelstaart
  if (air) { R_(-4, 15, 4, 5, pal.cloak2); R_(1, 14, 5, 4, pal.cloak2); }
  else if (anim) { const o = [0, 2, 0, -2][f]; R_(-4 + o, 15, 4, 5, pal.cloak2); R_(1 - o, 15, 4, 5, pal.cloak2); }
  else { R_(-4, 15, 4, 5, pal.cloak2); R_(1, 15, 4, 5, pal.cloak2); }
  R_(-5, 9, 10, 7, pal.cloak); R_(-5, 14, 10, 1, pal.trim);                                   // romp + rode zoom
  R_(-5, 1, 11, 9, pal.hood); R_(-4, 0, 9, 1, pal.hood); R_(-6, 4, 1, 6, pal.hood);          // kap
  R_(0, 3, 6, 6, '#0a0a12');                                                                  // gezicht
  if (variant === 0) { R_(1, 5, 5, 2, '#ff3030'); R_(2, 5, 3, 1, '#ff9a80'); } else { R_(2, 4, 3, 1, '#ff5a2a'); R_(3, 5, 1, 3, '#ff5a2a'); R_(1, 6, 1, 1, '#ff5a2a'); R_(5, 6, 1, 1, '#ff5a2a'); }
  R_(2, 8, 3, 1, '#e8b090');                                                                  // mond
  if (shooting) { R_(4, 10, 8, 3, pal.cloak); R_(12, 10, 2, 3, '#ffe14a'); } else R_(3, 10, 3, 4, pal.cloak2);
  ctx.restore();
}
function drawSprite(name, e, flip) {
  const im = IMG[name]; ctx.save(); ctx.translate(Math.round(e.x + e.w / 2 - camX), Math.round(e.y + e.h));
  if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -im.width / 2, -im.height); ctx.restore();
}
function drawPlayer() {
  const p = player; if (p.inv > 0 && Math.floor(p.inv / 3) % 2) return;
  if (IMG['player' + charId]) return drawSprite('player' + charId, p, p.face < 0);
  drawHooded(p, PAL[charId], p.face, Math.abs(p.vx) > 0 ? p.anim : 0, !p.ground, p.shootT > 0, charId, p.dash > 0);
  if (p.dash > 0) for (let i = 1; i < 4; i++) R_(Math.round(p.x - camX - p.face * i * 7), p.y + 4, 8, 14, `rgba(255,60,60,${.25 - i * .06})`);
}
function drawEnemy(e) {
  if (IMG[e.type]) return drawSprite(e.type, e, e.face > 0);
  const x = Math.round(e.x - camX), y = Math.round(e.y);
  if (e.type === 'grunt') { drawHooded(e, EPAL, e.face, e.vx ? e.t / 6 : 0, false, !e.vx, 0); }
  else if (e.type === 'drone') {
    R_(x + 2, y + 2, 10, 7, '#d8dde0'); R_(x + 2, y + 8, 10, 1, '#8a9096'); R_(x + 5, y + 3, 4, 4, '#2a2e30'); R_(x + 6, y + 4, 2, 2, '#b8ff2a');
    R_(x + (e.face > 0 ? 12 : -2), y + 4, 4, 2, '#aeb4b8'); R_(x + 6, y - 1, 2, 3, '#aeb4b8'); R_(x + 6, y - 2, 2, 1, '#ff3030');
  } else { R_(x, y + 6, 14, 8, '#6b7580'); R_(x + 2, y + 2, 10, 6, '#8a96a2'); R_(x + 5, y + 3, 4, 3, '#2a2e30'); R_(x + 6, y + 4, 2, 1, '#ff3030');
    R_(x + (e.face > 0 ? 10 : -2), y + 4, 6, 2, '#4a525a'); }
}
function drawBoss() {
  const b = boss; if (!b) return;
  if (IMG['boss' + b.id]) return drawSprite('boss' + b.id, b, b.face > 0);
  const D = BOSSES[b.id], k = b.w / 28, x = Math.round(b.x - camX), y = Math.round(b.y);
  ctx.save(); ctx.translate(x + b.w / 2, y); ctx.scale(b.face > 0 ? k : -k, k);
  if (b.flash % 2) ctx.globalAlpha = .5;
  R_(-13, 12, 5, 14, D.col); R_(-14, 24, 6, 4, D.col2);                            // arm (kanon) voor
  R_(-13, 16, 4, 4, '#ffd84a');
  R_(-9, 10, 18, 14, D.col); R_(-9, 10, 18, 2, D.col2); R_(-5, 14, 10, 8, '#0c1220'); // borst
  txt(D.letter, 0, 21, D.letter.length > 1 ? 5 : 7, D.acc, 'center', null);
  R_(-9, 24, 8, 8, D.col2); R_(1, 24, 8, 8, D.col2); R_(-10, 29, 9, 3, D.col); R_(1, 29, 10, 3, D.col); // benen
  R_(9, 11, 5, 11, D.col); R_(9, 20, 5, 4, D.col2);                                // arm achter
  R_(-5, 0, 11, 10, '#d8a07a'); R_(-6, -1, 13, 4, '#3a2a20'); R_(1, 4, 5, 2, b.id === 2 ? '#111' : '#3a6ad0'); // hoofd
  R_(7, 2, 4, 6, '#aab4c8'); R_(9, -4, 3, 8, D.acc);                                // koptelefoon + vin
  ctx.restore(); ctx.globalAlpha = 1;
}

// ---------- Tekenen: wereld ----------
function drawBG(th) {
  const TH = THEMES[th], cx = camX;
  if (IMG['bg' + th]) { const w = IMG['bg' + th].width; for (let x = -((cx * .4) % w); x < W; x += w) ctx.drawImage(IMG['bg' + th], Math.round(x), 0); return; }
  ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);
  if (th === 0) {                                                                // fabriek: pijpen en panelen
    for (let i = -1; i < 9; i++) { const x = i * 56 - (cx * .3) % 56; R_(x, 0, 40, H, '#1f2c27'); R_(x + 4, 20, 32, 40, '#162019'); R_(x + 8, 24, 4, 32, '#3a5a50'); }
    R_(0, 70, W, 8, '#2b3732'); R_(0, 72, W, 2, '#4a5a52'); R_(0, 130, W, 10, '#2b3732'); R_(0, 132, W, 2, '#4a5a52');
    for (let i = 0; i < 12; i++) R_(((i * 41 - cx * .5) % W + W) % W, 130, 6, 10, '#3a4540');
  } else if (th === 1) {                                                         // ruimtestation: sterren en steigers
    for (let i = 0; i < 70; i++) { const x = ((i * 53 - cx * (.05 + (i % 3) * .05)) % W + W) % W, y = (i * 37) % 180; R_(x, y, 1 + (i % 4 === 0), 1, (i + (t >> 5)) % 7 ? '#8890b0' : '#fff'); }
    for (let i = -1; i < 6; i++) { const x = i * 90 - (cx * .25) % 90; R_(x, 60, 6, 170, '#131830'); R_(x - 20, 100, 46, 4, '#131830'); R_(x - 20, 140, 46, 4, '#131830'); R_(x + 8, 92, 4, 4, '#4ad0ff'); }
  } else if (th === 2) {                                                         // reactor: gloeiende ventilatie
    const g = ctx.createLinearGradient(0, 100, 0, H); g.addColorStop(0, '#1a0c0a'); g.addColorStop(1, '#5a1c0a'); ctx.fillStyle = g; ctx.fillRect(0, 100, W, H - 100);
    for (let i = -1; i < 7; i++) { const x = i * 70 - (cx * .3) % 70; R_(x, 0, 26, H, '#2a1612'); R_(x + 4, 40, 18, 6, `rgba(255,${100 + Math.sin(t / 15 + i) * 40},20,.9)`); R_(x + 4, 90, 18, 6, '#ff7a1a'); }
  } else {                                                                       // cyber city: skyline
    for (let i = 0; i < 60; i++) R_(((i * 61 - cx * .05) % W + W) % W, (i * 29) % 100, 1, 1, '#aab');
    for (let layer = 0; layer < 2; layer++) for (let i = -1; i < 12; i++) {
      const sp = layer ? .35 : .15, x = i * 44 - (cx * sp) % 44, h = 50 + ((i * 37 + layer * 19) % 70);
      R_(x, 200 - h, 30, h, layer ? '#14122e' : '#1c1a3e');
      for (let wy = 0; wy < h - 8; wy += 8) if ((wy + i * 3) % 3) R_(x + 4 + (wy % 16), 200 - h + wy + 4, 3, 2, layer ? '#6a4a8a' : '#4a3a6a');
      if (i % 4 === 0) R_(x + 14, 200 - h - 14, 2, 14, '#2a2858'), R_(x + 13, 200 - h - 16, 4, 3, '#e03a5a');
    }
  }
}
function drawTiles(th) {
  const TH = THEMES[th], c0 = Math.floor(camX / T), c1 = c0 + W / T + 1;
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1 && c < COLS; c++) {
    const v = grid[r][c]; if (!v) continue; const x = Math.round(c * T - camX), y = r * T;
    if (IMG['tiles' + th]) { ctx.drawImage(IMG['tiles' + th], (v - 1) * T, 0, T, T, x, y, T, T); continue; }
    if (v === 1) {
      const top = !solid(c, r - 1) && r > 0;
      if (r === 13) { R_(x, y, T, T, TH.dark); R_(x, y, T, 1, '#000'); R_(x + 3 + (c % 3) * 4, y + 4, 2, 8, TH.base); continue; }
      R_(x, y, T, T, TH.base); R_(x, y, T, 1, TH.light); R_(x, y, 1, T, TH.light); R_(x + T - 1, y, 1, T, TH.dark); R_(x, y + T - 1, T, 1, TH.dark);
      R_(x + 2, y + 2, 2, 2, TH.accent); R_(x + T - 4, y + 2, 2, 2, TH.accent); R_(x + 2, y + T - 4, 2, 2, TH.dark); R_(x + T - 4, y + T - 4, 2, 2, TH.dark);
      if (top && r === 12) { R_(x, y, T, 3, TH.light); for (let s = 0; s < T; s += 8) { R_(x + s, y + 11, 4, 3, '#e0b020'); R_(x + s + 4, y + 11, 4, 3, '#1a1a1a'); } }
      else if (r === 12 || (!top && (c + r) % 3 === 0)) R_(x + 5, y + 6, 6, 4, TH.dark);
    } else { R_(x, y + 12, T, 4, '#555'); ctx.fillStyle = '#e0e4e8'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4, y + T); ctx.lineTo(x + i * 4 + 2, y + 4); ctx.lineTo(x + i * 4 + 4, y + T); ctx.fill(); } }
  }
  if (locked) for (let r = 0; r < 12; r++) { const x = Math.round(DOOR * T - camX); R_(x, r * T, T, T, '#3a2a2a'); R_(x + 2, r * T + 2, T - 4, T - 4, '#6a2a2a'); }
}

// ---------- Tekenen: UI ----------
function txt(s, x, y, size = 8, col = '#fff', al = 'center', sh = '#000') {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = al; ctx.textBaseline = 'alphabetic';
  if (sh) { ctx.fillStyle = sh; ctx.fillText(s, x + 1, y + 1); } ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function bar(x, val, col) {
  R_(x, 8, 10, 66, '#000'); R_(x + 1, 9, 8, 64, '#111');
  for (let i = 0; i < 28; i++) if (i < val) R_(x + 2, 71 - (i + 1) * 2.2, 6, 1.6, col);
}
function drawHUD() {
  bar(8, player.hp, '#f0c8a0'); bar(22, player.en, '#e08a5a');
  if (boss && boss.intro <= 0 || boss && boss.intro > 0) { const v = boss.intro > 0 ? Math.floor((60 - boss.intro) / 60 * 28) : Math.ceil(boss.hp / boss.max * 28); bar(W - 22, v, '#ff4a4a'); }
}
function cityBG() {
  ctx.fillStyle = '#0a0a1c'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) R_((i * 67) % W, (i * 31) % 120, 1, 1, (i + (t >> 4)) % 5 ? '#667' : '#fff');
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 14; i++) {
    const x = i * 30 - layer * 12, h = 60 + ((i * 47 + layer * 23) % 80) + layer * 20;
    R_(x, H - h, 26, h, layer ? '#07071a' : '#16163a'); for (let wy = 8; wy < h - 6; wy += 9) if ((wy + i) % 3) R_(x + 4 + (wy % 14), H - h + wy, 3, 2, '#7a5a9a');
    if (i % 5 === 2) R_(x + 12, H - h - 12, 2, 12, '#222258'), R_(x + 11, H - h - 14, 4, 3, '#e03a3a');
  }
}
function bigTitle() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  for (const [s, y, sz] of [['PROJECT', 78, 38], ['ONE', 128, 54]]) {
    ctx.font = `${sz}px ${FONT}`;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.strokeText(s, W / 2, y); ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.strokeText(s, W / 2, y);
    ctx.fillStyle = '#b01c1c'; ctx.fillText(s, W / 2, y + 4); ctx.fillStyle = '#fff'; ctx.fillText(s, W / 2, y);
  }
}
function portrait(x, y, w, h, v, active, name) {
  R_(x - 4, y - 4, w + 8, h + 8, active ? '#fff' : '#7a808a'); R_(x - 2, y - 2, w + 4, h + 4, '#2a2e36');
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (IMG['portrait' + v]) ctx.drawImage(IMG['portrait' + v], x, y, w, h);
  else {
    R_(x, y, w, h, '#c4452a'); for (let i = 0; i < h; i += 6) R_(x, y + i, w, 2, '#9a2e1c');
    ctx.fillStyle = '#242832'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + w * .08, y + h * .55, x + w * .25, y + h * .48);
    ctx.lineTo(x + w * .75, y + h * .48); ctx.quadraticCurveTo(x + w * .92, y + h * .55, x + w, y + h); ctx.fill();
    ctx.fillStyle = '#2e333f'; ctx.beginPath(); ctx.moveTo(x + w * .2, y + h * .6); ctx.quadraticCurveTo(x + w * .15, y + h * .3, x + w * .3, y + h * .2);
    ctx.quadraticCurveTo(x + w * .5, y + h * .02, x + w * .7, y + h * .2); ctx.quadraticCurveTo(x + w * .85, y + h * .3, x + w * .8, y + h * .6); ctx.fill();
    ctx.fillStyle = '#05050a'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * .42, w * .21, h * .26, 0, 0, 7); ctx.fill();
    if (v === 0) { R_(x + w * .33, y + h * .4, w * .34, 3, '#ff3a20'); R_(x + w * .38, y + h * .4, w * .24, 1, '#ffb090'); }
    else { const cx = x + w / 2, cy = y + h * .38, c = '#ff4a2a'; R_(cx - 2, cy - 8, 4, 4, c); R_(cx - 10, cy - 4, 20, 3, c); R_(cx - 8, cy - 4, 3, 8, c); R_(cx + 5, cy - 4, 3, 8, c); R_(cx - 1, cy, 2, 14, c); R_(cx - 5, cy + 2, 2, 10, c); R_(cx + 3, cy + 2, 2, 10, c); }
  }
  ctx.restore(); txt(name, x + w / 2, y + h + 16, 8, active ? '#fff' : '#889');
}
function drawStages() {
  cityBG(); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
  txt('SELECT STAGE', W / 2, 26, 10);
  LEVELS.forEach((L, i) => {
    const x = 28 + (i & 1) * 180, y = 40 + (i >> 1) * 88, active = i === stageSel, TH = THEMES[L.theme];
    R_(x - 3, y - 3, 168, 78, active ? (t >> 3) % 2 ? '#fff' : '#ffd84a' : '#667'); R_(x, y, 162, 72, TH.bg); R_(x, y + 40, 162, 32, TH.base); R_(x, y + 40, 162, 2, TH.light);
    const bx = x + 108, by = y + 8;
    const bf = IMG['boss' + L.boss + '_full'];
    if (bf) { const sw = bf.width * .62, sh = sw * 56 / 46; ctx.drawImage(bf, bf.width * .3, 0, sw, sh, bx, by, 46, 56); }
    else { R_(bx, by, 46, 56, '#111'); txt('?', bx + 23, by + 36, 18, '#556'); }
    txt('STAGE ' + (i + 1), x + 8, y + 16, 8, '#fff', 'left'); txt(L.name.length > 10 ? L.name.slice(0, 10) : L.name, x + 8, y + 32, 8, TH.accent, 'left');
    txt('BOSS ' + BOSSES[L.boss].letter, x + 8, y + 62, 8, '#ccd', 'left');
    if (cleared[i]) txt('CLEAR', x + 8, y + 50, 8, '#4aff7a', 'left');
  });
  txt('ENTER = START   ESC = TERUG', W / 2, H - 8, 8, '#99a');
}

function render() {
  if (state === 'title') {
    if (IMG.title) ctx.drawImage(IMG.title, 0, 0, W, H); else { cityBG(); bigTitle(); }
    if ((t >> 5) % 2) txt('▶ START SPEL ◀', W / 2, 196, 10); return;
  }
  if (state === 'select') {
    cityBG(); ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, H); txt('SELECT PLAYER', W / 2, 28, 12);
    portrait(34, 44, 140, 120, 0, sel === 0, CHARS[0].name); portrait(210, 44, 140, 120, 1, sel === 1, CHARS[1].name);
    txt(CHARS[sel].desc, W / 2, 206, 8, '#ffb090'); return;
  }
  if (state === 'stages') return drawStages();
  if (state === 'end') { cityBG(); txt('PROJECT ONE', W / 2, 90, 20); txt('COMPLEET!', W / 2, 120, 12, '#ffd84a'); txt('BEDANKT VOOR HET SPELEN', W / 2, 150, 8); txt('PRESS ENTER', W / 2, 190, 8); return; }
  const th = LV.theme; drawBG(th); drawTiles(th);
  if (CHECK) R_(CHECK - camX + 6, 10 * T, 3, 2 * T, spawnX >= CHECK ? '#ffe14a' : '#888');
  for (const it of items) R_(it.x - camX, it.y + (t >> 3) % 2, 8, 8, it.kind === 'hp' ? '#f0c8a0' : '#e08a5a'), R_(it.x - camX + 2, it.y + 2 + (t >> 3) % 2, 4, 4, '#fff');
  for (const e of enemies) drawEnemy(e);
  drawBoss();
  for (const b of bullets) R_(b.x - camX, b.y, b.w, b.h, b.pierce ? '#ff5a3a' : '#ffe14a');
  for (const b of ebullets) R_(b.x - camX, b.y, b.w, b.h, '#ff5a7a');
  if (state !== 'dead') drawPlayer();
  for (const q of particles) R_(q.x - camX, q.y, 3, 3, q.col || '#fff');
  drawHUD();
  if (state === 'clear') { txt('STAGE CLEAR!', W / 2, 100, 16, '#ffd84a'); if (clearT > 200 && (t >> 5) % 2) txt('PRESS ENTER', W / 2, 140, 8); }
}

// ---------- Loop (vaste 60 fps stap) ----------
camX = 0; buildLevel(LEVELS[0]); reset(); state = 'title';
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); for (const k in pressed) pressed[k] = false; acc -= 1000 / 60; }
  render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
