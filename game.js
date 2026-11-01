// PROJECT ONE - Mega Man-achtige platformer. 384x224 interne resolutie, 16px tiles.
const W = 384, H = 224, T = 16, ROWS = 14, ARENA = 15;
const ZOOM = 1.6, VW = 384 / 1.6, VH = 224 / 1.6;   // camera-zoom (zoals in het referentieplaatje: ~15 x 9 tegels in beeld)
const S = 3;                                   // render-schaal: 1152x672 pixels op het scherm
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
cv.width = W * S; cv.height = H * S; ctx.imageSmoothingEnabled = false;
const FONT = "'Press Start 2P',monospace";
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').catch(() => {});

// ---------- Afbeeldingen (uitgeknipt uit de referentieplaatjes; zie assets/) ----------
const SPRITE_FILES = {
  title: 'assets/title.jpg', floor: 'assets/floor.png', bg0: 'assets/bg0.png', hud_bar: 'assets/hud_bar.png',
  portrait0: 'assets/portrait0.png', portrait1: 'assets/portrait1.png',
  spr_visor: 'assets/spr/visor.png', spr_sigil: 'assets/spr/sigil.png', spr_drone: 'assets/spr/drone.png',
  spr_boss1: 'assets/spr/boss1.png', spr_boss2: 'assets/spr/boss2.png', spr_boss3: 'assets/spr/boss3.png', spr_boss4: 'assets/spr/boss4.png',
  boss1_full: 'assets/boss1_full.jpg', boss2_full: 'assets/boss2_full.jpg', boss3_full: 'assets/boss3_full.jpg', boss4_full: 'assets/boss4_full.jpg',
};
const IMG = {}; let pending = Object.keys(SPRITE_FILES).length; const loadStart = performance.now();
for (const [k, src] of Object.entries(SPRITE_FILES)) { const i = new Image(); i.onload = () => { IMG[k] = i; pending--; }; i.onerror = () => { pending--; }; i.src = src; }

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
  { letter: 'NC', col: '#2a5ac0', col2: '#b8c4d8', acc: '#f0a020', w: 32, h: 46, hp: 24 },
  { letter: 'W',  col: '#c8381a', col2: '#b8c4d8', acc: '#f0a020', w: 32, h: 46, hp: 28 },
  { letter: 'H',  col: '#e87a1a', col2: '#b8c4d8', acc: '#222',    w: 32, h: 46, hp: 32 },
  { letter: 'P',  col: '#5a2a7a', col2: '#3a6a9a', acc: '#f0a020', w: 38, h: 56, hp: 44 }];

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
    if (R() < .6) E('drone', c + ri(2, n), ri(7, 9));
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
      E('drone', c + 4, 8); E('drone', c + 9, 9); c += w;
    } else { // afgrond met zwevend platform (hard)
      for (let i = 0; i < 9; i++) { grid[12][c+i] = 0; grid[13][c+i] = 0; }
      blk(c + 1, 10, 2); blk(c + 5, 9, 2); E('drone', c + 4, 8); c += 9;
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
let camY = 0;
let player, enemies, bullets, ebullets, particles, items, boss, locked, camX, spawnX, t = 0, clearT = 0;

function startLevel(i) {
  buildLevel(LEVELS[i]); stageSel = i; spawnX = 2 * T; locked = false; boss = null; reset(); state = 'play';
}
function reset() {
  for (let r = 0; r < 12; r++) grid[r][DOOR] = 0; locked = false; boss = null;
  const ch = CHARS[charId];
  player = { x: spawnX, y: 10 * T, w: 13, h: 26, vx: 0, vy: 0, ground: false, face: 1, hp: 28, en: 28, inv: 0, shootT: 0, anim: 0, dash: 0, enT: 0 };
  enemies = ENEMY_DEFS.filter(d => d.x > spawnX + 6 * T).map(d => {
    const big = d.type === 'turret', fly = d.type === 'drone';
    const w = 14, h = fly ? 10 : big ? 14 : 24;
    return { type: d.type, x: d.x, y: d.row * T + (fly ? 0 : T - h), baseY: d.row * T, w: fly ? 14 : 14, h, vx: d.type === 'grunt' ? -.5 : 0, vy: 0, hp: big ? 3 : d.type === 'grunt' ? 2 : 1, t: (d.x * 7) % 90, face: -1, dead: false };
  });
  bullets = []; ebullets = []; particles = []; items = [];
  camX = Math.max(0, Math.min((COLS * T - VW), player.x - VW / 2)); camY = Math.max(0, Math.min(ROWS * T - VH, player.y - VH * .6));
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
  player.hp -= dmg; player.inv = 70; shake = 8; player.vy = -2; player.vx = -player.face * 1.2; sfx(120, .15, 'sawtooth', -60);
  if (player.hp <= 0) die();
}
function die() {
  for (let i = 0; i < 16; i++) particles.push({ x: player.x + 6, y: player.y + 10, vx: Math.cos(i) * 2, vy: Math.sin(i) * 2, life: 60 });
  state = 'dead'; t = 0; sfx(300, .5, 'sawtooth', -250);
}
let shake = 0;
function boom(x, y, n = 6, col = '#ffe8b0') { for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, life: 14 + Math.floor(Math.random() * 10), col }); if (n >= 6) particles.push({ x, y, vx: 0, vy: 0, life: 14, ring: true, r: 3 }); }
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
  boss = { id, x: (DOOR + 11) * T, y: 4 * T, w: D.w, h: D.h, hp: D.hp, max: D.hp, vx: 0, vy: 0, t: 0, face: -1, ground: false, flash: 0, intro: 60, air: false, charge: 0 };
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
      ebullets.push({ x: b.x, y: b.y + b.h - 6, w: 8, h: 6, vx: -2, vy: 0 }, { x: b.x + b.w - 8, y: b.y + b.h - 6, w: 8, h: 6, vx: 2, vy: 0 }); }
      if (b.t % 70 === 0) { jumpAt(1.6, -5.2); b.air = true; } }
    walk();
  } else if (b.id === 2) {                // zweeft, vuurt gericht
    b.x += (p.x - 60 * toP - b.x) * .01; b.y = 108 + Math.sin(b.t / 25) * 22; b.face = toP;
    b.x = Math.max((DOOR + 2) * T, Math.min((DOOR + 13) * T - b.w, b.x));
    if (b.t % 50 === 0) for (let i = -1; i <= 1; i++) { const a = Math.atan2(p.y - b.y, p.x - b.x) + i * .3; ebullets.push({ x: b.x + b.w / 2, y: b.y + b.h * .4, w: 5, h: 5, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 }); }
  } else if (b.id === 3) {                // laadt op en stormt
    const ph = b.t % 150;
    if (ph < 50) { b.vx = 0; b.face = toP; if (ph === 30) enemyShot(b.x + b.w / 2, b.y + b.h * .4, p.x, p.y + 8, 2.4); }
    else if (ph < 110) { b.vx = b.face * 3.2; if (b.hitWall) b.face = -b.face; }
    else { b.vx = 0; if (ph === 110) jumpAt(0, -4.5); }
    walk();
  } else {                                // eindbaas: alles samen
    const ph = b.t % 180;
    if (ph < 60) { if (b.ground && ph % 60 === 0) jumpAt(1.8, -5.2); if (ph === 30) for (let i = -2; i <= 2; i++) { const a = Math.atan2(p.y - b.y, p.x - b.x) + i * .25; ebullets.push({ x: b.x + b.w / 2, y: b.y + b.h * .4, w: 5, h: 5, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2 }); } }
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
    const near = Math.abs(e.x - p.x) < 150, dx = p.x < e.x ? -1 : 1;
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
      boss = null; ebullets = []; shake = 30; state = 'clear'; clearT = 0; cleared[LV.boss - 1] = true; try { localStorage.setItem('p1_cleared', JSON.stringify(cleared)); } catch (e) {} return; }
  }
  // kogels vijand
  ebullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
  ebullets = ebullets.filter(b => b.x > camX - 24 && b.x < camX + W + 24 && b.y > -20 && b.y < H + 20 && !solid(Math.floor((b.x + b.w / 2) / T), Math.floor((b.y + b.h / 2) / T)));
  for (const b of ebullets) if (hit(b, p)) { hurt(boss ? 4 : 3); b.x = -999; }
  // items
  for (const it of items) { it.vy = Math.min(it.vy + .2, 3); moveBody(it); it.life--;
    if (hit(it, p)) { it.life = 0; if (it.kind === 'hp') p.hp = Math.min(28, p.hp + 6); else p.en = Math.min(28, p.en + 8); sfx(1000, .1, 'square', 300); } }
  items = items.filter(i => i.life > 0);
  particles.forEach(q => { q.x += q.vx; q.y += q.vy; q.life--; if (q.ring) q.r += 1.6; }); particles = particles.filter(q => q.life > 0);
  if (shake > 0) shake--;
  // checkpoint, deur, camera
  if (p.x > CHECK && spawnX < CHECK) { spawnX = CHECK; sfx(1200, .15); }
  if (!locked && p.x > (DOOR + 3) * T) { locked = true; for (let r = 0; r < 12; r++) grid[r][DOOR] = 1; spawnX = (DOOR - 4) * T; spawnBoss(); sfx(80, .4, 'sawtooth'); }
  const camT = Math.max(0, Math.min(COLS * T - VW, p.x - VW / 2 + 6));
  camX = locked ? camX + ((COLS * T - VW) - camX) * .08 : camT;   // arena: camera schuift naar de baas
  const camTY = Math.max(0, Math.min(ROWS * T - VH, p.y + p.h / 2 - VH * .6)); camY += (camTY - camY) * .12;
}

// ---------- Tekenen: UI ----------
function txt(s, x, y, size = 8, col = '#fff', al = 'center', sh = '#000') {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = al; ctx.textBaseline = 'alphabetic';
  if (sh) { ctx.fillStyle = sh; ctx.fillText(s, x + 1, y + 1); } ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function bar(x, val, col, label, alt) {
  const im = IMG.hud_bar;
  if (im) {
    const y = 8, bw = 12, bh = 62, f = Math.max(0, Math.min(1, val / 28)), src = alt === true ? tinted('hud_alt', im, (r, g, b, a) => [r * .75, g * .85, b * 1.15, a]) : col === 'boss' ? tinted('hud_boss', im, (r, g, b, a) => [r * 1.1, g * .5, b * .5, a]) : im;
    photoDraw(src, x, y, bw, bh); if (f < 1) R_(x + 1, y + 1, bw - 2, Math.round((bh - 2) * (1 - f)), '#000');
    txt(label, x + 6, y + bh + 9, 6, '#aab', 'center'); return;
  }
  R_(x - 3, 5, 16, 80, '#05050c'); R_(x - 3, 5, 16, 1, '#a0a8c8'); R_(x - 3, 5, 1, 80, '#a0a8c8'); R_(x + 12, 5, 1, 80, '#2a2e44'); R_(x - 3, 84, 16, 1, '#2a2e44');
  R_(x, 8, 10, 64, '#10121c');
  for (let i = 0; i < 28; i++) if (i < val) { const y = 70 - i * 2.25; R_(x + 1, y, 8, 1.6, col); R_(x + 1, y, 8, .7, '#fff6'); R_(x + 7, y, 2, 1.6, 'rgba(0,0,0,.25)'); }
  txt(label, x + 5, 81, 6, '#aab', 'center');
}
function drawHUD() {
  bar(8, player.hp, '#f4c8a8', 'HP'); bar(26, player.en, '#f09a50', 'EN', true);
  if (boss) { const v = boss.intro > 0 ? Math.floor((60 - boss.intro) / 60 * 28) : Math.ceil(boss.hp / boss.max * 28); bar(W - 20, v, 'boss', BOSSES[boss.id].letter, false); }
}
function cityBG() { ctx.save(); ctx.scale(ZOOM, ZOOM); drawBG(3, t * .35); ctx.restore(); const g = ctx.createLinearGradient(0, H * .55, 0, H); g.addColorStop(0, 'rgba(5,5,16,0)'); g.addColorStop(1, 'rgba(5,5,16,.85)'); ctx.fillStyle = g; ctx.fillRect(0, H * .55, W, H * .45); }
function bigTitle() {
  glow(W / 2, 100, 150, 'rgba(200,30,30,.5)', .5 + .15 * Math.sin(t / 25));
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  for (const [s, y, sz] of [['PROJECT', 66, 30], ['ONE', 128, 56]]) {
    ctx.font = `${sz}px ${FONT}`;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeText(s, W / 2, y); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(s, W / 2, y);
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
    R_(x - 3, y - 3, 168, 78, active ? (t >> 3) % 2 ? '#fff' : '#ffd84a' : '#667'); R_(x, y, 162, 72, TH.bg);
    drawBGThumb(L.theme, x, y, 162, 72);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y, 162, 72);
    const bx = x + 8, by = y + 8, ok = cleared[i], bf = IMG['boss' + L.boss + '_full'];
    R_(bx - 1, by - 1, 50, 58, '#000'); R_(bx, by, 48, 56, '#0a0a14');
    if (ok && bf) { const sw = bf.width * .62, sh_ = sw * 56 / 48; ctx.drawImage(bf, bf.width * .3, 0, sw, sh_, bx, by, 48, 56); }
    else { txt('?', bx + 24, by + 38, 22, '#445', 'center', null); }
    const words = L.name.split(' ');
    txt('STAGE ' + (i + 1), x + 64, y + 20, 8, '#fff', 'left'); words.forEach((w, k) => txt(w, x + 64, y + 36 + k * 11, 8, TH.accent, 'left'));
    if (ok) txt('CLEAR', x + 64, y + 66, 8, '#4aff7a', 'left'); else txt('BOSS ???', x + 64, y + 66, 8, '#99a', 'left');
  });
  txt('ENTER = START   ESC = TERUG', W / 2, H - 8, 8, '#99a');
}
function drawBGThumb(th, x, y, w, h) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); ctx.scale(.675, .675); drawBG(th, 40 + th * 90); ctx.restore(); }

function render() {
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
  if (pending > 0 && performance.now() - loadStart < 8000) { ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, H); txt('LOADING...', W / 2, H / 2, 10); return; }
  if (state === 'title') {
    if (IMG.title) { ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, H); const th_ = Math.round(W * IMG.title.height / IMG.title.width); photoDraw(IMG.title, 0, Math.round((H - th_) / 2), W, th_);
      if ((t >> 5) % 2) txt('ENTER / TIK OM TE STARTEN', W / 2, 217, 6, '#99a'); }
    else { cityBG(); bigTitle(); if ((t >> 5) % 2) txt('\u25B6 START SPEL \u25C0', W / 2, 196, 10); }
    drawOverlay(); return;
  }
  if (state === 'select') {
    ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, W, H); const vg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 260); vg.addColorStop(0, 'rgba(60,70,90,.25)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    txt('SELECT PLAYER', W / 2, 24, 12, '#fff', 'center', '#4a5a78');
    [0, 1].forEach(i => { const x = i ? 208 : 44, y = 34, w = 132, h = 163, act = sel === i, im = IMG['portrait' + i];
      if (act) { glow(x + w / 2, y + h / 2, 130, 'rgba(255,90,60,.55)', .45 + .15 * Math.sin(t / 10)); }
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); const sc = act ? 1.03 + .008 * Math.sin(t / 10) : .96; ctx.scale(sc, sc); ctx.globalAlpha = act ? 1 : .5;
      if (im) photoDraw(im, -w / 2, -h / 2, w, h); else { R_(-w / 2, -h / 2, w, h, '#222'); } ctx.restore(); });
    txt(CHARS[sel].name + ' - ' + CHARS[sel].desc, W / 2, 215, 8, '#ffb090'); drawOverlay(); return;
  }
  if (state === 'stages') return drawStages();
  if (state === 'end') { cityBG(); txt('PROJECT ONE', W / 2, 90, 20); txt('COMPLEET!', W / 2, 120, 12, '#ffd84a'); txt('BEDANKT VOOR HET SPELEN', W / 2, 150, 8); txt('PRESS ENTER', W / 2, 190, 8); return; }
  ctx.setTransform(S * ZOOM, 0, 0, S * ZOOM, 0, 0); ctx.save(); if (shake > 0) ctx.translate(Math.round((Math.random() - .5) * shake * .6), Math.round((Math.random() - .5) * shake * .6));
  const th = LV.theme; drawBG(th); ctx.translate(0, -Math.round(camY)); drawTiles(th);
  if (CHECK) R_(CHECK - camX + 6, 10 * T, 3, 2 * T, spawnX >= CHECK ? '#ffe14a' : '#888');
  for (const e of enemies) drawEnemy(e);
  drawBoss();
  if (state !== 'dead') drawPlayer();
  drawFX(); ctx.restore(); ctx.setTransform(S, 0, 0, S, 0, 0);
  drawHUD();
  if (state === 'clear') { txt('STAGE CLEAR!', W / 2, 100, 16, '#ffd84a'); if (clearT > 200 && (t >> 5) % 2) txt('PRESS ENTER', W / 2, 140, 8); }
  drawOverlay();
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
