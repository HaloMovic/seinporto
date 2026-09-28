/* ---------- secret: fight him, Undertale: Last Breath style ---------- */
// Three phases. He dodges everything until he's tired; the hit that finally lands doesn't end it,
// he refuses and comes back harder. In phase 3 he throws one last attack, and only then can you
// finish him or spare him.
// Opens with the Konami code (↑ ↑ ↓ ↓ ← → ← → B A), "/fight" in the chat,
// or by tapping "still here" in the footer five times.
//
// Art and music: drop files into assets/boss/ with these names and they're picked up on their own.
// A missing sprite falls back to his photo, pixelated; missing music just means silence.
const BOSS = {
  name: 'SEIN',
  sprites: {
    1: 'assets/boss/phase1.png',
    2: 'assets/boss/phase2.png',
    3: 'assets/boss/phase3.png',
    spared: 'assets/boss/spared.png',
  },
  music: {
    1: 'assets/boss/phase1.mp3',
    2: 'assets/boss/phase2.mp3',
    3: 'assets/boss/phase3.mp3',
  },
  placeholder: 'assets/stand.png',
};

const MAX_HP = 60;
const SPEED = 110;                       // the heart, px/s
const SOUL_GRAVITY = 900, JUMP = 250, MAX_FALL = 420;
const HIT_R = 4.5;                       // the heart's hitbox radius
const TIRED_AFTER = { 1: 3, 2: 4, 3: 4 }; // his turns before a hit can land (phase 3: before his last attack)

const LINES = {
  intro: ["it's a beautiful day on my portfolio.", 'the scroll is locked. the guestbook is open.', 'on days like these, visitors like you...', '...should be signing my guestbook.', 'but you wanted a fight. so.'],
  1: {
    turns: ['ready?', "i'm not gonna make this easy.", 'dodge this.', 'you really came back for this?'],
    tired: 'okay... one more.',
    fall: ['...heh.', "guess that's it, huh?"],
  },
  2: {
    start: ['...nah.', "i'm not done.", 'not while this site is still up.'],
    turns: ['you think one hit was enough?', "i've been up since 7am. i can do this all day.", "let's flip things around.", 'still here.'],
    tired: "heh... can't... keep this up...",
    fall: ['...w-wait.', "that's not..."],
  },
  3: {
    start: ['...', 'something is holding me up.', "and it doesn't want you to win."],
    turns: ['this is my last breath.', 'the screen is mine now.', "i'm not letting you through.", 'just... give up.'],
    final: ['alright.', 'this is it. my special attack.', 'survive this and the site is yours.'],
  },
};
const FLAVOR = {
  1: ['* SEIN is sketching something.', '* SEIN adjusts his glasses.', "* You feel like you're going to have a bad time."],
  2: ['* SEIN is bleeding ink.', '* The screen feels unsteady.', '* SEIN grips his stylus like a sword.'],
  3: ['* Something else is moving him.', '* The pixels are coming apart.', "* SEIN's eyes flicker."],
};
const TIRED_FLAVOR = { 1: '* SEIN is getting tired.', 2: '* SEIN is barely standing.' };
const CHECK = {
  1: '* SEIN - ATK 1 DEF 1\n* The easiest enemy.\n* Can only deal 1 damage.',
  2: '* SEIN - ATK ?? DEF ??\n* He refused.\n* Blocks with his stylus.',
  3: "* SEIN - ATK 99 DEF 99\n* Something is holding him up.\n* It isn't only him anymore.",
};
const TALK = {
  1: ['* You ask why he made this.\n* SEIN: "Mr. Ali Akbar assigned it."', '* You ask if this was made with AI.\n* SEIN looks away.'],
  2: ['* You ask him to stop.\n* SEIN: "you started this."', '* You ask if it hurts.\n* SEIN: "only my pride."'],
  3: ["* You call his name.\n* For a second, he's there.", '* You tell him it\'s okay to rest.\n* His hands shake.'],
};
const ITEMS = [
  { name: 'Noodles', heal: 25, text: '* You ate the instant noodles.\n* Tastes like 2am.' },
  { name: 'Noodles', heal: 25, text: '* You ate the instant noodles.\n* Still tastes like 2am.' },
  { name: 'Es Teh', heal: 15, text: '* You drank the es teh.\n* Sweet enough to hurt.' },
  { name: 'Es Teh', heal: 15, text: '* You drank the es teh.\n* Still sweet.' },
  { name: 'Energy Drk', heal: 99, text: '* You chugged the energy drink.\n* Your hands are shaking.' },
];
const GLYPHS = ['{ }', '</>', ';', '( )', '=>', '[ ]', '&&'];
const TOOL_TAGS = ['JS', 'CSS', 'TS', 'GS'];

/* ---------- elements ---------- */
const bossEl = document.getElementById('boss');
const world = document.getElementById('boss-world');
const stage = document.getElementById('boss-stage');
const fx = document.getElementById('boss-fx');
const fctx = fx.getContext('2d');
const flashEl = document.getElementById('boss-flash');
const spriteEl = document.getElementById('boss-sprite');
const slashEl = document.getElementById('boss-slash');
const dmgEl = document.getElementById('boss-dmg');
const hpEl = document.getElementById('boss-hp');
const hpFill = hpEl.firstElementChild;
const speechEl = document.getElementById('boss-bubble');
const box = document.getElementById('boss-box');
const boxText = document.getElementById('boss-text');
const optionsEl = document.getElementById('boss-options');
const targetEl = document.getElementById('boss-target');
const barEl = document.getElementById('boss-bar');
const phpBar = document.getElementById('boss-php-bar');
const krBar = document.getElementById('boss-kr-bar');
const phpNum = document.getElementById('boss-php-num');
const menuBtns = [...document.querySelectorAll('#boss-menu button')];
const helpEl = document.getElementById('boss-help');
const endEl = document.getElementById('boss-end');
const endHeart = document.getElementById('boss-end-heart');
const endTitle = document.getElementById('boss-end-title');
const endText = document.getElementById('boss-end-text');
const endActions = endEl.querySelector('.boss-end-actions');
const againBtn = document.getElementById('boss-again');

/* ---------- pixel art: the SOUL and the blasters ---------- */
const HEART = [
  '.XX...XX.',
  'XXXX.XXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
];
const HEART_CRACK = [4, 4, 5, 4, 5, 4, 5, 4];
const heartSvg = keep => pixelSvg(HEART, keep).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('fill="#fff"', 'fill="#ff0000"');
bossEl.style.setProperty('--heart', `url("data:image/svg+xml,${encodeURIComponent(heartSvg())}")`);
flashEl.innerHTML = heartSvg();

// a blaster skull, facing down; the jaw drops open as it charges
const SKULL = [
  'X..XXXXX..X',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  'XX..XXX..XX',
  'XX..XXX..XX',
  'XXXXXXXXXXX',
  '.XXXX.XXXX.',
  '..XXXXXXX..',
];
const JAW = [
  '..X.X.X.X..',
  '..XXXXXXX..',
  '...XXXXX...',
];

function drawGrid(c, grid, x0, y0, s, color) {
  c.fillStyle = color;
  grid.forEach((row, r) => [...row].forEach((ch, col) => {
    if (ch === 'X') c.fillRect(x0 + col * s, y0 + r * s, s + 0.3, s + 0.3);
  }));
}
const drawHeart = (c, x, y, color) => drawGrid(c, HEART, Math.round(x - 9), Math.round(y - 8), 2, color);

/* ---------- sound: small synth blips on the page's Web Audio context ---------- */
function tone(freq, dur, { type = 'square', vol = 0.05, to } = {}) {
  const ctx = getAudioCtx();
  if (ctx.state !== 'running') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
const sfx = {
  move: () => tone(660, 0.04, { vol: 0.03 }),
  select: () => tone(880, 0.07, { vol: 0.04 }),
  text: () => tone(420, 0.03, { vol: 0.02 }),
  voice: () => tone(290, 0.035, { vol: 0.03, type: 'triangle' }),
  encounter: () => tone(520, 0.08, { vol: 0.05 }),
  slash: () => tone(1200, 0.18, { type: 'sawtooth', vol: 0.03, to: 200 }),
  hit: () => tone(140, 0.25, { vol: 0.07, to: 50 }),
  miss: () => tone(500, 0.12, { type: 'triangle', vol: 0.04, to: 900 }),
  hurt: () => tone(220, 0.08, { vol: 0.06, to: 110 }),
  heal: () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.1, { vol: 0.04 }), i * 70)),
  dust: () => tone(300, 0.9, { type: 'sawtooth', vol: 0.03, to: 40 }),
  charge: () => tone(180, 0.45, { type: 'sawtooth', vol: 0.025, to: 700 }),
  blast: () => tone(90, 0.5, { type: 'sawtooth', vol: 0.06, to: 30 }),
  slam: () => tone(70, 0.2, { vol: 0.09, to: 35 }),
  rise: () => tone(900, 0.06, { vol: 0.03, to: 1400 }),
  power: () => tone(60, 1.6, { type: 'sawtooth', vol: 0.05, to: 900 }),
  glitch: () => { for (let i = 0; i < 5; i++) setTimeout(() => tone(gsap.utils.random(200, 2000), 0.03, { vol: 0.03 }), i * 40); },
};

let music = null;
function startMusic(stageNo) {
  stopMusic();
  const src = BOSS.music[stageNo];
  if (!src) return;
  music = new Audio(src);
  music.loop = true;
  music.volume = 0.6;
  music.play().catch(() => {});
}
function stopMusic() {
  music?.pause();
  music = null;
}

/* ---------- sprites: the phase art if it's there, otherwise his photo crushed to grey pixels ---------- */
let placeholderUrl = null;
const spriteSrc = {};

async function pixelated(src, h = 88) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = Math.round(img.naturalWidth / img.naturalHeight * h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i + 3] < 128) { d.data[i + 3] = 0; continue; }
    const lum = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2];
    const v = Math.round(Math.min(255, lum * 1.3 + 45) / 85) * 85;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL();
}

const probe = src => new Promise(resolve => {
  const img = new Image();
  img.onload = () => resolve(src);
  img.onerror = () => resolve(null);
  img.src = src;
});

async function loadSprites() {
  placeholderUrl ??= await pixelated(BOSS.placeholder).catch(() => BOSS.placeholder);
  await Promise.all(Object.entries(BOSS.sprites).map(async ([key, src]) => {
    if (!(key in spriteSrc)) spriteSrc[key] = await probe(src);
  }));
}

function showSprite(key) {
  const own = spriteSrc[key];
  spriteEl.src = own || spriteSrc[1] || placeholderUrl;
  spriteEl.dataset.stage = key;
  spriteEl.classList.toggle('fallback', !own);
  spriteEl.classList.toggle('spared', key === 'spared' && !own);
}

/* ---------- state and input ---------- */
const fight = { open: false };
let session = 0;          // bumps on open/close/retry so a stale sequence knows it's been cancelled
let onKey = null;         // the current menu's key handler
let waiter = null;        // resolves when the player presses Z / taps
let typeToken = 0;
const held = new Set();
const KEYMAP = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
  z: 'ok', Enter: 'ok', ' ': 'ok', x: 'back', Shift: 'back', Backspace: 'back',
};
const keyOf = e => KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
const waitOk = () => new Promise(r => { waiter = r; });
function ok() {
  const r = waiter;
  waiter = null;
  r?.();
}
const rand = gsap.utils.random;
const clamp = gsap.utils.clamp;

function setMode(m) { box.className = `boss-box mode-${m}`; }

function updateStats() {
  phpBar.style.width = `${(fight.php - fight.kr) / MAX_HP * 100}%`;
  krBar.style.width = `${fight.kr / MAX_HP * 100}%`;
  phpNum.textContent = `${fight.php} / ${MAX_HP}`;
  phpNum.classList.toggle('kr', fight.kr > 0);
}

// KARMA: what hit you keeps draining after the hit, but never finishes you off on its own
let krClock = 0;
gsap.ticker.add((_, deltaMs) => {
  if (!fight.open || fight.phase === 'end' || fight.kr <= 0) return;
  krClock -= deltaMs / 1000;
  if (krClock > 0) return;
  krClock = fight.kr > 15 ? 0.1 : 0.3;
  fight.kr--;
  if (fight.php > 1) fight.php--;
  else fight.kr = 0;
  updateStats();
});

// types into the box; with wait, Z skips to the end, then Z again continues
async function type(text, wait = true) {
  const token = ++typeToken;
  setMode('text');
  let skip = false;
  if (wait) waiter = () => { skip = true; };
  boxText.textContent = '';
  for (let i = 1; i <= text.length; i++) {
    if (token !== typeToken) return;
    if (skip) { boxText.textContent = text; break; }
    boxText.textContent = text.slice(0, i);
    if (text[i - 1].trim() && i % 2) sfx.text();
    await sleep(text[i - 1] === '\n' ? 140 : 30);
  }
  if (!wait || token !== typeToken) return;
  waiter = null;
  await sleep(100);
  await waitOk();
}

// his speech bubble: moves on after a moment, or on Z
async function speech(text) {
  const run = session;
  speechEl.hidden = false;
  const p = speechEl.firstElementChild;
  for (let i = 1; i <= text.length; i++) {
    if (run !== session) return;
    p.textContent = text.slice(0, i);
    if (i % 2) sfx.voice();
    await sleep(35);
  }
  await Promise.race([sleep(1500), waitOk()]);
  waiter = null;
  speechEl.hidden = true;
}
async function speeches(lines) {
  const run = session;
  for (const line of lines) {
    await speech(line);
    if (run !== session) return false;
  }
  return true;
}

/* ---------- menus ---------- */
function setSel(i) {
  fight.sel = i;
  menuBtns.forEach((b, j) => b.classList.toggle('sel', j === i));
}

function showMenu() {
  if (!fight.open) return;
  fight.phase = 'menu';
  setSel(fight.sel);
  const flavor = fight.exhausted ? "* SEIN can't keep his eyes open."
    : fight.tired ? TIRED_FLAVOR[fight.stage] : pick(FLAVOR[fight.stage]);
  type(flavor, false);
  onKey = k => {
    if (k === 'left' || k === 'right') {
      setSel((fight.sel + (k === 'left' ? 3 : 1)) % 4);
      sfx.move();
    }
    if (k === 'ok') choose(fight.sel);
  };
}

function choose(i) {
  sfx.select();
  if (i === 0) return attack();
  if (i === 1) {
    return options(['* Check', '* Talk'], j => runTurn([j ? pick(TALK[fight.stage]) : CHECK[fight.stage]]));
  }
  if (i === 2) {
    if (!fight.items.length) {
      onKey = null;
      return type('* Your pockets are empty.').then(showMenu);
    }
    return options(fight.items.map(it => `* ${it.name}`), useItem);
  }
  return options(['* Spare', '* Flee'], j => (j ? flee() : spare()), fight.exhausted ? [0] : []);
}

function options(labels, onPick, yellow = []) {
  fight.phase = 'options';
  ++typeToken;
  setMode('options');
  let at = 0;
  const go = () => {
    onKey = null;
    sfx.select();
    onPick(at);
  };
  const render = () => optionsEl.replaceChildren(...labels.map((label, j) => {
    const li = document.createElement('li');
    li.textContent = label;
    li.classList.toggle('sel', j === at);
    li.classList.toggle('yellow', yellow.includes(j));
    li.addEventListener('click', () => { if (fight.phase === 'options') { at = j; go(); } });
    return li;
  }));
  render();
  onKey = k => {
    if (k === 'back') { sfx.move(); return showMenu(); }
    if (k === 'ok') return go();
    const next = at + { left: -1, right: 1, up: -2, down: 2 }[k];
    if (next >= 0 && next < labels.length) {
      at = next;
      sfx.move();
      render();
    }
  };
}

menuBtns.forEach((b, i) => b.addEventListener('click', () => {
  if (fight.phase !== 'menu' && fight.phase !== 'options') return;
  setSel(i);
  choose(i);
}));

async function runTurn(lines) {
  const run = session;
  onKey = null;
  fight.phase = 'text';
  for (const line of lines) {
    await type(line);
    if (run !== session) return;
  }
  enemyTurn();
}

function useItem(j) {
  const it = fight.items.splice(j, 1)[0];
  const before = fight.php;
  fight.php = Math.min(MAX_HP, fight.php + it.heal);
  fight.kr = 0;
  updateStats();
  sfx.heal();
  runTurn([`${it.text}\n* ${fight.php === MAX_HP ? 'Your HP was maxed out.' : `You recovered ${fight.php - before} HP!`}`]);
}

/* ---------- FIGHT: stop the bar in the middle ---------- */
async function attack() {
  const run = session;
  onKey = null;
  ++typeToken;
  fight.phase = 'target';
  setMode('target');
  gsap.set(barEl, { opacity: 1 });
  const p = await new Promise(resolve => {
    const tw = gsap.fromTo(barEl, { x: 0 }, { x: targetEl.clientWidth, duration: 1.15, ease: 'none', onComplete: () => resolve(null) });
    onKey = k => {
      if (k !== 'ok') return;
      tw.pause();
      resolve(tw.progress());
    };
  });
  onKey = null;
  if (run !== session) return;
  fight.phase = 'hit';
  gsap.to(barEl, { opacity: 0.2, duration: 0.08, repeat: 5, yoyo: true });

  if (p === null) {
    await popNumber('MISS', true);
  } else if (fight.exhausted) {
    return finalHit();
  } else if (fight.tired) {
    await landHit(p);
    if (run !== session) return;
    return phaseBreak(fight.stage + 1);
  } else {
    await evade();
  }
  if (run !== session) return;
  enemyTurn();
}

async function popNumber(text, miss) {
  dmgEl.textContent = text;
  dmgEl.classList.toggle('miss', miss);
  await gsap.fromTo(dmgEl, { opacity: 1, y: 0 }, { y: -18, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1 });
  await sleep(600);
  gsap.to(dmgEl, { opacity: 0, duration: 0.2 });
}

// he's not tired yet: he steps out of the way (phase 2: blocks it)
async function evade() {
  sfx.slash();
  gsap.fromTo(slashEl, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.25, ease: 'power2.out', onComplete: () => gsap.to(slashEl, { opacity: 0, duration: 0.2 }) });
  sfx.miss();
  if (fight.stage === 2) {
    gsap.fromTo(spriteEl, { x: 6 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' });
    await popNumber('BLOCKED', true);
  } else {
    gsap.timeline().to(spriteEl, { x: -70, duration: 0.14, ease: 'power2.out' }).to(spriteEl, { x: 0, duration: 0.4, ease: 'power2.inOut' }, 0.6);
    await popNumber('MISS', true);
  }
}

async function landHit(p) {
  const acc = 1 - Math.abs(p - 0.5) * 2;
  sfx.slash();
  await gsap.fromTo(slashEl, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.25, ease: 'power2.out' });
  gsap.to(slashEl, { opacity: 0, duration: 0.2 });
  sfx.hit();
  gsap.fromTo(spriteEl, { filter: 'brightness(3)' }, { filter: 'brightness(1)', duration: 0.4, clearProps: 'filter' });
  gsap.fromTo(spriteEl, { x: -12 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
  hpEl.hidden = false;
  gsap.fromTo(hpFill, { width: '100%' }, { width: '0%', duration: 0.9, ease: 'power2.in' });
  await popNumber(String(9000 + Math.round(999 * acc)), false);
  hpEl.hidden = true;
}

/* ---------- phases ---------- */
async function phaseBreak(next) {
  const run = session;
  onKey = null;
  fight.phase = 'text';
  if (!await speeches(LINES[next - 1].fall)) return;
  stopMusic();
  // a beat of nothing, then he refuses
  await gsap.to(stage, { opacity: 0.15, duration: 0.6 });
  await sleep(900);
  if (run !== session) return;
  sfx.power();
  glitch(next === 3 ? 3 : 1);
  showSprite(next);
  gsap.fromTo(spriteEl, { scale: 1.15, filter: 'brightness(4)' }, { scale: 1, filter: 'brightness(1)', duration: 1.1, ease: 'power2.out', clearProps: 'filter' });
  shake(10);
  await gsap.to(stage, { opacity: 1, duration: 0.3 });
  Object.assign(fight, { stage: next, turnsInStage: 0, tired: false, php: MAX_HP, kr: 0 });
  fight.checkpoint = fight.items.map(it => ({ ...it }));
  updateStats();
  startMusic(next);
  if (!await speeches(LINES[next].start)) return;
  sfx.heal();
  await type(next === 2 ? '* SEIN refuses.\n* Your HP was restored.' : '* SEIN is still here.\n* Something else is too.\n* Your HP was restored.');
  if (run !== session) return;
  showMenu();
}

function glitch(times = 1) {
  for (let i = 0; i < times; i++) {
    setTimeout(() => {
      bossEl.classList.remove('glitching');
      void bossEl.offsetWidth;
      bossEl.classList.add('glitching');
      sfx.glitch();
    }, i * 380);
  }
}
bossEl.addEventListener('animationend', e => { if (e.target === world) bossEl.classList.remove('glitching'); });

function shake(px = 6) {
  gsap.fromTo(world, { x: px }, { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
}

/* ---------- his turn ---------- */
async function enemyTurn() {
  const run = session;
  if (!fight.open) return;
  fight.turn++;
  fight.turnsInStage++;
  fight.phase = 'enemy';
  onKey = null;
  ++typeToken;
  boxText.textContent = '';
  const lines = LINES[fight.stage];
  const final = fight.stage === 3 && fight.turnsInStage > TIRED_AFTER[3];
  if (final) {
    if (!await speeches(lines.final)) return;
  } else {
    await speech(fight.tired ? lines.tired : lines.turns[(fight.turnsInStage - 1) % lines.turns.length]);
  }
  if (run !== session) return;

  const list = STAGE_ATTACKS[fight.stage];
  const name = final ? 'final' : list[(fight.turnsInStage - 1) % list.length];
  const survived = await runAttack(name);
  if (run !== session) return;
  if (!survived) return gameOver();

  if (final) {
    fight.exhausted = true;
    await type('* SEIN is out of breath.');
    if (run !== session) return;
  } else if (fight.stage < 3 && fight.turnsInStage >= TIRED_AFTER[fight.stage]) {
    fight.tired = true;
  }
  showMenu();
}

/* ---------- the bullet board: everything he throws at you ---------- */
// Coordinates are local to the inside of the white box; blasters and their beams can reach past it.
const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const G = { running: false, bullets: [], waits: [] };

function worldOffset(el) {
  let x = 0, y = 0;
  for (let n = el; n && n !== world; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}

function sizeFx() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  fx.width = world.clientWidth * dpr;
  fx.height = world.clientHeight * dpr;
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', () => { if (fight.open) sizeFx(); });

function setBox(w, h, dur = 0.3) {
  const maxW = stage.clientWidth - 8;
  return gsap.to(box, { width: Math.min(w, maxW) + 8, height: h + 8, duration: dur, ease: 'steps(5)' });
}
function restoreBox() {
  return gsap.to(box, { width: stage.clientWidth, height: 150, duration: 0.3, ease: 'steps(5)', onComplete: () => gsap.set(box, { clearProps: 'width,height' }) });
}

const rectHit = (cx, cy, w, h) => {
  const dx = Math.max(Math.abs(G.heart.x - cx) - w / 2, 0);
  const dy = Math.max(Math.abs(G.heart.y - cy) - h / 2, 0);
  return dx * dx + dy * dy < HIT_R * HIT_R;
};
const COLORS = { white: '#fff', blue: '#14b4ff', orange: '#ff9a1f' };

function drawBone(c, b) {
  c.fillStyle = COLORS[b.color];
  const vertical = b.h >= b.w;
  const t = vertical ? b.w : b.h;
  c.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  const r = t * 0.38;
  const ends = vertical
    ? [[b.x - t / 4, b.y - b.h / 2], [b.x + t / 4, b.y - b.h / 2], [b.x - t / 4, b.y + b.h / 2], [b.x + t / 4, b.y + b.h / 2]]
    : [[b.x - b.w / 2, b.y - t / 4], [b.x - b.w / 2, b.y + t / 4], [b.x + b.w / 2, b.y - t / 4], [b.x + b.w / 2, b.y + t / 4]];
  c.beginPath();
  ends.forEach(([x, y]) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); });
  c.fill();
}

// white bones always hurt; blue ones only if you're moving; orange ones only if you're standing still
function bone({ x, y, w, h, vx = 0, vy = 0, color = 'white', life = 14 }) {
  const b = {
    x, y, w, h, vx, vy, color, age: 0,
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.age += dt;
      if (this.age > life || this.x < -90 || this.x > G.box.w + 90 || this.y < -90 || this.y > G.box.h + 90) this.dead = true;
    },
    hurts() {
      if (this.color === 'blue' && !G.moved) return false;
      if (this.color === 'orange' && G.moved) return false;
      return rectHit(this.x, this.y, this.w, this.h);
    },
    draw(c) { drawBone(c, this); },
  };
  G.bullets.push(b);
  return b;
}

// a row of bones shooting up from one wall after a warning flash
function spikes({ side = 'down', height = 22, warn = 0.55, stay = 0.45 }) {
  G.bullets.push({
    age: 0, e: 0, rose: false,
    update(dt) {
      this.age += dt;
      const t = this.age - warn;
      this.e = t < 0 ? 0 : t < 0.08 ? height * t / 0.08 : t < 0.08 + stay ? height : Math.max(0, height * (1 - (t - 0.08 - stay) / 0.15));
      if (t >= 0 && !this.rose) { this.rose = true; sfx.rise(); }
      if (t > 0.08 + stay + 0.15) this.dead = true;
    },
    band() {
      const { w, h } = G.box;
      const e = this.age < warn ? height : this.e;
      return side === 'down' ? [w / 2, h - e / 2, w, e] : side === 'up' ? [w / 2, e / 2, w, e]
        : side === 'left' ? [e / 2, h / 2, e, h] : [w - e / 2, h / 2, e, h];
    },
    hurts() { return this.e > 3 && rectHit(...this.band()); },
    draw(c) {
      const [cx, cy, bw, bh] = this.band();
      if (this.age < warn) {
        c.strokeStyle = Math.floor(this.age * 14) % 2 ? '#ff2020' : '#ffff00';
        c.lineWidth = 2;
        c.strokeRect(cx - bw / 2 + 1, cy - bh / 2 + 1, bw - 2, bh - 2);
        return;
      }
      const horizontalRow = side === 'down' || side === 'up';
      const span = horizontalRow ? bw : bh;
      for (let i = 6; i < span; i += 12) {
        drawBone(c, horizontalRow
          ? { x: cx - bw / 2 + i, y: cy, w: 7, h: bh, color: 'white' }
          : { x: cx, y: cy - bh / 2 + i, w: bw, h: 7, color: 'white' });
      }
    },
  });
}

// a blaster: slides in, charges, fires a beam across the screen, slides back out
function blaster({ x, y, angle, charge = 0.55, size = 1 }) {
  const rad = angle * Math.PI / 180, dx = Math.cos(rad), dy = Math.sin(rad);
  const enter = 0.28, fire = enter + charge, end = fire + 0.5;
  G.bullets.push({
    clip: false, kr: 2, age: 0, beam: 0, mouth: 0, back: 1, charged: false, fired: false,
    update(dt) {
      const t = (this.age += dt);
      this.back = t < enter ? 1 - gsap.parseEase('power2.out')(t / enter) : t > end ? (t - end) * 2.5 : 0;
      this.mouth = t < enter ? 0 : Math.min(1, (t - enter) / charge);
      this.beam = t < fire ? 0 : t < fire + 0.07 ? (t - fire) / 0.07 : Math.max(0, 1 - (t - fire - 0.07) / (end - fire + 0.2));
      if (t >= enter && !this.charged) { this.charged = true; sfx.charge(); }
      if (t >= fire && !this.fired) { this.fired = true; sfx.blast(); shake(3); }
      if (t > end + 0.45) this.dead = true;
    },
    mouthPos() {
      const off = -this.back * 90;
      return [x + dx * (off + 26 * size), y + dy * (off + 26 * size)];
    },
    hurts() {
      if (this.beam < 0.25) return false;
      const [ox, oy] = this.mouthPos();
      const hx = G.heart.x - ox, hy = G.heart.y - oy;
      if (hx * dx + hy * dy < 0) return false;
      return Math.abs(hx * dy - hy * dx) < (26 * size * this.beam) / 2 + HIT_R - 1;
    },
    draw(c) {
      const off = -this.back * 90;
      const cx = x + dx * off, cy = y + dy * off;
      c.save();
      c.globalAlpha = this.age > end ? Math.max(0, 1 - (this.age - end) * 2.2) : 1;
      if (this.beam > 0) {
        const [ox, oy] = this.mouthPos();
        const bw = 26 * size * this.beam;
        c.save();
        c.translate(ox, oy);
        c.rotate(rad);
        c.fillStyle = '#fff';
        c.fillRect(0, -bw / 2, 2400, bw);
        c.restore();
      }
      c.translate(cx, cy);
      c.rotate(rad - Math.PI / 2);
      const s = 4 * size;
      const x0 = -5.5 * s, y0 = -6 * s;
      drawGrid(c, SKULL, x0, y0, s, '#fff');
      // eyes glow as it charges
      if (this.mouth > 0.4) {
        c.fillStyle = Math.floor(this.age * 16) % 2 ? '#6cf' : '#fff';
        [[2, 3], [7, 3]].forEach(([col, row]) => c.fillRect(x0 + col * s, y0 + row * s, 2 * s, 2 * s));
      }
      drawGrid(c, JAW, x0, y0 + (8 + this.mouth * 1.6) * s, s, '#fff');
      c.restore();
    },
  });
}

// the old doodle attacks, now in any box size
function mover({ x, y, vx = 0, vy = 0, w, h, draw }) {
  G.bullets.push({
    x, y, vx, vy, w, h,
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -60 || this.x > G.box.w + 60 || this.y > G.box.h + 40) this.dead = true;
    },
    hurts() { return rectHit(this.x, this.y, this.w, this.h); },
    draw,
  });
}
function pencil() {
  mover({
    x: rand(6, G.box.w - 6), y: -14, vy: rand(90, 130), w: 6, h: 24,
    draw(c) {
      c.fillStyle = '#ff8fb1';
      c.fillRect(this.x - 3, this.y - 12, 6, 4);
      c.fillStyle = '#fff';
      c.fillRect(this.x - 3, this.y - 8, 6, 14);
      c.fillStyle = '#bbb';
      c.beginPath();
      c.moveTo(this.x - 3, this.y + 6);
      c.lineTo(this.x + 3, this.y + 6);
      c.lineTo(this.x, this.y + 12);
      c.fill();
    },
  });
}
function glyph() {
  const left = Math.random() < 0.5;
  const text = pick(GLYPHS);
  mover({
    x: left ? -20 : G.box.w + 20, y: rand(10, G.box.h - 10), vx: (left ? 1 : -1) * rand(80, 115), w: 24, h: 12,
    draw(c) {
      c.fillStyle = '#fff';
      c.font = '20px VT323, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, this.x, this.y);
    },
  });
}
function tile(text, until) {
  G.bullets.push({
    x: rand(15, G.box.w - 15), y: rand(12, 36), vx: pick([-1, 1]) * rand(60, 85), vy: rand(55, 80), w: 22, h: 22,
    update(dt) {
      const { w, h } = G.box;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < 11 || this.x > w - 11) this.vx *= -1;
      if (this.y < 11 || this.y > h - 11) this.vy *= -1;
      this.x = clamp(11, w - 11, this.x);
      this.y = clamp(11, h - 11, this.y);
      if (G.t > until) this.dead = true;
    },
    hurts() { return rectHit(this.x, this.y, this.w, this.h); },
    draw(c) {
      c.fillStyle = '#fff';
      c.fillRect(this.x - 11, this.y - 11, 22, 22);
      c.fillStyle = '#000';
      c.font = '700 9px Silkscreen, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, this.x, this.y + 1);
    },
  });
}
function band() {
  const horiz = Math.random() < 0.6;
  const pos = rand(12, (horiz ? G.box.h : G.box.w) - 12);
  const WARN = 0.6, HOT = 0.35;
  G.bullets.push({
    age: 0,
    update(dt) { if ((this.age += dt) > WARN + HOT) this.dead = true; },
    rect() { return horiz ? [G.box.w / 2, pos, G.box.w, 20] : [pos, G.box.h / 2, 20, G.box.h]; },
    hurts() { return this.age >= WARN && rectHit(...this.rect()); },
    draw(c) {
      const [cx, cy, w, h] = this.rect();
      if (this.age < WARN) {
        c.strokeStyle = Math.floor(this.age * 12) % 2 ? '#ffff00' : '#ff7f27';
        c.setLineDash([4, 3]);
        c.lineWidth = 2;
        c.strokeRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2);
        c.setLineDash([]);
      } else {
        c.fillStyle = '#fff';
        c.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
    },
  });
}

// what an attack script can do
const api = {
  wait: s => new Promise(r => G.waits.push({ at: G.t + s, r })),
  box: (w, h) => setBox(w, h),
  soul(kind, grav = 'down') {
    G.soul = kind;
    G.grav = grav;
    G.heart.v = 0;
  },
  slam(dir) {
    G.soul = 'blue';
    G.grav = dir;
    G.heart.v = 1100;
  },
  // a bone standing on the floor/ceiling (or the full height) sliding across
  floorBone({ from = 'left', edge = 'bottom', height = 30, speed = 150, color = 'white', thick = 10 }) {
    const { w, h } = G.box;
    const len = edge === 'full' ? h : height;
    bone({
      x: from === 'left' ? -thick : w + thick,
      y: edge === 'bottom' ? h - len / 2 : edge === 'top' ? len / 2 : h / 2,
      w: thick, h: len, vx: (from === 'left' ? 1 : -1) * speed, color,
    });
  },
  // a wall of bones with one gap to slip through (gap: 0 = top, 1 = bottom)
  gapWall({ from = 'right', gap = 0.5, size = 40, speed = 150, color = 'white' }) {
    const { w, h } = G.box;
    const x = from === 'left' ? -10 : w + 10, vx = (from === 'left' ? 1 : -1) * speed;
    const c = clamp(size / 2 + 4, h - size / 2 - 4, gap * h);
    const top = c - size / 2, bottom = h - (c + size / 2);
    if (top > 0) bone({ x, y: top / 2, w: 10, h: top, vx, color });
    if (bottom > 0) bone({ x, y: h - bottom / 2, w: 10, h: bottom, vx, color });
  },
  spikes,
  // from a point on a ring around the box, aimed at the heart
  aimedBlaster(size = 1) {
    const { w, h } = G.box;
    const a = rand(0, Math.PI * 2), r = Math.max(w, h) / 2 + 60;
    const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
    blaster({ x, y, angle: Math.atan2(G.heart.y - y, G.heart.x - x) * 180 / Math.PI, size });
  },
  // from the ring at `deg`, firing straight through the middle of the box
  ringBlaster(deg, charge = 0.5, size = 0.8) {
    const { w, h } = G.box;
    const a = deg * Math.PI / 180, r = Math.max(w, h) / 2 + 60;
    blaster({ x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, angle: deg + 180, charge, size });
  },
  // a row of blasters along one side with one lane left open
  blasterRow(side = 'top', lanes = 5, open = 0) {
    const { w, h } = G.box;
    for (let i = 0; i < lanes; i++) {
      if (i === open) continue;
      const f = (i + 0.5) / lanes;
      if (side === 'top') blaster({ x: w * f, y: -55, angle: 90, size: 0.75 });
      else blaster({ x: -55, y: h * f, angle: 0, size: 0.75 });
    }
  },
  cross() {
    const { w, h } = G.box;
    blaster({ x: -60, y: h / 2, angle: 0 });
    blaster({ x: w + 60, y: h / 2, angle: 180 });
    blaster({ x: w / 2, y: -60, angle: 90 });
    blaster({ x: w / 2, y: h + 60, angle: 270 });
  },
  async rain(kind, dur, every) {
    const end = G.t + dur;
    while (G.t < end && G.running) {
      if (kind === 'pencils') pencil();
      else if (kind === 'code') glyph();
      else band();
      await api.wait(every);
    }
  },
  async tools(n, dur) {
    for (let i = 0; i < n; i++) tile(TOOL_TAGS[i % TOOL_TAGS.length], G.t + dur);
    await api.wait(dur);
  },
  flip(on) {
    G.flipped = on;
    sfx.glitch();
    return gsap.to(world, { rotation: on ? 180 : 0, duration: 0.45, ease: 'power2.inOut' });
  },
  shake,
  glitch,
};

/* ---------- his attacks, in order per phase ---------- */
const ATTACKS = {
  // phase 1: the classics, faster
  async slide(s) {
    await s.box(260, 130);
    s.soul('blue', 'down');
    await s.wait(0.3);
    for (let i = 0; i < 7; i++) {
      s.floorBone({ from: i % 2 ? 'right' : 'left', height: rand(18, 40), speed: 160 });
      await s.wait(0.6);
    }
    s.floorBone({ from: 'left', edge: 'full', color: 'blue', speed: 150 });
    await s.wait(1.1);
    s.floorBone({ from: 'right', edge: 'full', color: 'blue', speed: 150 });
    await s.wait(2.3);
  },
  async blasters(s) {
    await s.box(150, 150);
    s.soul('red');
    for (let i = 0; i < 4; i++) {
      s.aimedBlaster();
      if (i) s.aimedBlaster();
      await s.wait(0.95);
    }
    s.cross();
    await s.wait(1.7);
  },
  async gaps(s) {
    await s.box(220, 150);
    s.soul('red');
    for (let i = 0; i < 9; i++) {
      s.gapWall({ from: 'right', gap: 0.5 + Math.sin(i * 0.9) * 0.3, size: 44, speed: 150 });
      await s.wait(0.5);
    }
    await s.wait(1.8);
  },
  async slams(s) {
    await s.box(150, 150);
    for (const dir of ['down', 'left', 'up', 'right']) {
      s.slam(dir);
      await s.wait(0.3);
      s.spikes({ side: dir, height: 20 });
      await s.wait(1.15);
    }
    s.soul('red');
    await s.wait(0.3);
  },

  // phase 2: blue and orange, the screen turns over
  async flipRain(s) {
    await s.box(170, 150);
    s.soul('red');
    const rain = s.rain('code', 6.5, 0.24);
    await s.wait(1.6);
    s.flip(true);
    await s.wait(0.8);
    s.aimedBlaster();
    await s.wait(1.3);
    s.aimedBlaster();
    s.aimedBlaster();
    await s.wait(1.7);
    s.flip(false);
    await rain;
    await s.wait(0.6);
  },
  async colors(s) {
    await s.box(260, 120);
    s.soul('red');
    for (let i = 0; i < 8; i++) {
      s.floorBone({ from: i % 2 ? 'right' : 'left', edge: 'full', color: i % 2 ? 'orange' : 'blue', speed: 170 });
      if (i % 3 === 2) s.floorBone({ from: 'left', height: 24, speed: 220 });
      await s.wait(0.65);
    }
    await s.wait(1.9);
  },
  async ring(s) {
    await s.box(150, 150);
    s.soul('red');
    for (let i = 0; i < 10; i++) {
      s.ringBlaster(i * 36 + 10, 0.5);
      await s.wait(0.34);
    }
    await s.wait(0.5);
    s.blasterRow('top', 5, Math.floor(rand(0, 5)));
    await s.wait(1.8);
  },
  async gravity(s) {
    await s.box(170, 170);
    const tools = s.tools(2, 6.6);
    for (const dir of ['down', 'right', 'up', 'left', 'down']) {
      s.slam(dir);
      await s.wait(0.3);
      s.spikes({ side: dir, height: 20 });
      await s.wait(1.0);
    }
    s.soul('red');
    await tools;
  },

  // phase 3: it isn't only him anymore
  async arrays(s) {
    await s.box(180, 150);
    s.soul('red');
    s.glitch();
    for (let i = 0; i < 5; i++) {
      s.blasterRow(i % 2 ? 'left' : 'top', 5, Math.floor(rand(0, 5)));
      await s.wait(1.05);
    }
    await s.wait(1.2);
  },
  async tunnel(s) {
    await s.box(260, 140);
    s.soul('blue', 'down');
    for (let i = 0; i < 12; i++) {
      s.floorBone({ from: 'right', edge: 'bottom', height: 14 + Math.abs(Math.sin(i * 0.8)) * 28, speed: 170 });
      s.floorBone({ from: 'right', edge: 'top', height: 12 + Math.abs(Math.cos(i * 0.8)) * 22, speed: 170 });
      await s.wait(0.45);
      if (i === 6) s.flip(true);
    }
    await s.wait(1.8);
    s.flip(false);
    s.soul('red');
  },
  async storm(s) {
    await s.box(170, 150);
    s.soul('red');
    s.glitch();
    const all = Promise.all([s.rain('pencils', 7, 0.32), s.rain('code', 7, 0.5), s.rain('bands', 7, 1.2)]);
    for (let i = 0; i < 5; i++) {
      await s.wait(1.25);
      s.aimedBlaster(0.8);
    }
    await all;
  },
  async spiral(s) {
    await s.box(160, 160);
    s.soul('red');
    for (let i = 0; i < 16; i++) {
      s.ringBlaster(i * 47, 0.45);
      await s.wait(0.27);
    }
    await s.wait(1.6);
  },

  // his last attack: no menu in between, until he runs out
  async final(s) {
    s.glitch(2);
    await ATTACKS.arrays(s);
    await ATTACKS.slams(s);
    s.glitch();
    await ATTACKS.spiral(s);
    await ATTACKS.tunnel(s);
    s.glitch(3);
    await s.box(150, 150);
    s.soul('red');
    for (let i = 0; i < 3; i++) {
      s.cross();
      await s.wait(0.5);
      for (let k = 0; k < 4; k++) s.ringBlaster(45 + k * 90 + i * 15, 0.5, 0.7);
      await s.wait(1.2);
    }
    await s.wait(1.2);
  },
};
const STAGE_ATTACKS = {
  1: ['slide', 'blasters', 'gaps', 'slams'],
  2: ['flipRain', 'colors', 'ring', 'gravity'],
  3: ['arrays', 'tunnel', 'storm', 'spiral'],
};

/* ---------- the engine: runs while he attacks ---------- */
function moveHeart(dt) {
  const hr = G.heart, { w, h } = G.box;
  let ix = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
  let iy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
  // when the screen is upside down, keep the keys matching what you see
  if (G.flipped) { ix = -ix; iy = -iy; }

  if (G.soul === 'red') {
    hr.x += ix * SPEED * dt;
    hr.y += iy * SPEED * dt;
  } else {
    // blue: gravity pulls one way; press the opposite way to jump, the other axis to walk
    const [gx, gy] = DIRS[G.grav];
    if (gx) hr.y += iy * SPEED * dt;
    else hr.x += ix * SPEED * dt;
    const jumping = -(ix * gx + iy * gy) > 0 || G.touchJump;
    if (hr.grounded && jumping) {
      hr.v = -JUMP;
      hr.grounded = false;
    }
    const accel = hr.v < 0 && jumping ? SOUL_GRAVITY * 0.45 : SOUL_GRAVITY;
    hr.v = hr.v > MAX_FALL ? hr.v + accel * dt : Math.min(MAX_FALL, hr.v + accel * dt);
    hr.x += gx * hr.v * dt;
    hr.y += gy * hr.v * dt;
  }

  const minX = 9, maxX = w - 9, minY = 8, maxY = h - 8;
  if (G.soul === 'blue') {
    const [gx, gy] = DIRS[G.grav];
    const floorHit = (gx > 0 && hr.x >= maxX) || (gx < 0 && hr.x <= minX) || (gy > 0 && hr.y >= maxY) || (gy < 0 && hr.y <= minY);
    const ceilHit = (gx > 0 && hr.x <= minX) || (gx < 0 && hr.x >= maxX) || (gy > 0 && hr.y <= minY) || (gy < 0 && hr.y >= maxY);
    if (floorHit && hr.v >= 0) {
      if (hr.v > 600) { shake(8); sfx.slam(); }
      hr.v = 0;
      hr.grounded = true;
    } else {
      hr.grounded = false;
      if (ceilHit && hr.v < 0) hr.v = 0;
    }
  }
  hr.x = clamp(minX, maxX, hr.x);
  hr.y = clamp(minY, maxY, hr.y);
}

function tick(now) {
  if (!G.running) return;
  const dt = Math.min(1 / 30, (now - G.last) / 1000);
  G.last = now;
  G.t += dt;

  const o = worldOffset(box);
  G.box = { x: o.x + 4, y: o.y + 4, w: box.clientWidth, h: box.clientHeight };
  moveHeart(dt);
  G.moved = Math.hypot(G.heart.x - G.px, G.heart.y - G.py) > 0.15;
  G.px = G.heart.x;
  G.py = G.heart.y;

  for (const b of G.bullets) b.update(dt);
  G.bullets = G.bullets.filter(b => !b.dead);

  // no mercy frames: every tick you're touching something costs 1 HP, plus KARMA
  G.hurtCd -= dt;
  const hit = G.hurtCd <= 0 && G.bullets.find(b => b.hurts());
  if (hit) {
    fight.php = Math.max(0, fight.php - 1);
    fight.kr = Math.min(Math.max(0, fight.php - 1), fight.kr + (hit.kr || 1));
    G.hurtCd = 0.08;
    if (G.t - G.lastOuch > 0.12) { sfx.hurt(); G.lastOuch = G.t; }
    updateStats();
  }

  G.waits = G.waits.filter(wt => (wt.at <= G.t ? (wt.r(), false) : true));
  render();

  if (fight.php <= 0) {
    G.running = false;
    G.onDeath();
    return;
  }
  G.raf = requestAnimationFrame(tick);
}

function render() {
  const { x, y, w, h } = G.box;
  fctx.clearRect(0, 0, fx.width, fx.height);
  fctx.save();
  fctx.translate(x, y);
  fctx.save();
  fctx.beginPath();
  fctx.rect(0, 0, w, h);
  fctx.clip();
  for (const b of G.bullets) if (b.clip !== false) b.draw(fctx);
  fctx.restore();
  for (const b of G.bullets) if (b.clip === false) b.draw(fctx);
  drawHeart(fctx, G.heart.x, G.heart.y, G.soul === 'blue' ? '#1c6cff' : '#ff0000');
  fctx.restore();
}

async function runAttack(name) {
  const run = session;
  fight.phase = 'dodge';
  setMode('dodge');
  sizeFx();
  const o = worldOffset(box);
  Object.assign(G, {
    running: true, t: 0, last: performance.now(), bullets: [], waits: [],
    soul: 'red', grav: 'down', flipped: false, hurtCd: 0, lastOuch: -1, touchJump: false,
    box: { x: o.x + 4, y: o.y + 4, w: box.clientWidth, h: box.clientHeight },
  });
  G.heart = { x: 75, y: 70, v: 0, grounded: false };
  G.px = G.heart.x;
  G.py = G.heart.y;
  const died = new Promise(r => { G.onDeath = r; });
  G.raf = requestAnimationFrame(tick);
  // centre the heart once the box has its first size
  setTimeout(() => { if (G.running) { G.heart.x = box.clientWidth / 2; G.heart.y = box.clientHeight / 2; } }, 320);

  const outcome = await Promise.race([ATTACKS[name](api).then(() => 'done'), died.then(() => 'dead')]);
  G.running = false;
  cancelAnimationFrame(G.raf);
  fctx.clearRect(0, 0, fx.width, fx.height);
  if (G.flipped) api.flip(false);
  if (run !== session || outcome === 'dead') return false;
  setMode('text');
  boxText.textContent = '';
  await restoreBox();
  return true;
}

// on a phone: drag anywhere to move the heart, hold to jump when it's blue,
// tap to continue or to stop the FIGHT bar
let drag = null;
bossEl.addEventListener('pointerdown', e => {
  if (e.target.closest('button, li')) return;
  if (fight.phase === 'dodge') {
    drag = { x: e.clientX, y: e.clientY };
    G.touchJump = true;
    bossEl.setPointerCapture(e.pointerId);
    return;
  }
  if (fight.phase === 'target') return onKey?.('ok');
  if (!onKey) ok();
});
bossEl.addEventListener('pointermove', e => {
  if (!drag || !G.running) return;
  let dx = (e.clientX - drag.x) * 1.1, dy = (e.clientY - drag.y) * 1.1;
  if (G.flipped) { dx = -dx; dy = -dy; }
  const [gx] = DIRS[G.grav];
  if (G.soul === 'red' || !gx) G.heart.x = clamp(9, G.box.w - 9, G.heart.x + dx);
  if (G.soul === 'red' || gx) G.heart.y = clamp(8, G.box.h - 8, G.heart.y + dy);
  drag = { x: e.clientX, y: e.clientY };
});
['pointerup', 'pointercancel'].forEach(t => bossEl.addEventListener(t, () => {
  drag = null;
  G.touchJump = false;
}));

/* ---------- endings ---------- */
async function finalHit() {
  const run = session;
  fight.phase = 'text';
  await landHit(0.5);
  if (run !== session) return;
  if (!await speeches(['...heh.', 'good fight.', 'go sign the guestbook, ok?'])) return;
  stopMusic();
  sfx.dust();
  await gsap.to(spriteEl, { opacity: 0, y: 12, filter: 'blur(3px)', duration: 1.6, ease: 'steps(12)' });
  if (run !== session) return;
  showEnd({ title: 'YOU WON', text: "* SEIN took his last breath.\n* (he's fine. he's still here.)", again: 'fight again' });
}

async function spare() {
  if (!fight.exhausted) return runTurn([`* You tried to spare ${BOSS.name}.\n* He won't let you. Not yet.`]);
  const run = session;
  onKey = null;
  fight.phase = 'text';
  stopMusic();
  showSprite('spared');
  sfx.dust();
  await type('* YOU WON!\n* You earned 0 EXP and 0 GOLD.');
  if (run !== session) return;
  if (!await speeches(['...', 'thanks.', "you're alright."])) return;
  showEnd({ title: 'SPARED', text: `* You spared ${BOSS.name}.\n* He'll remember that.\n* (sign the guestbook.)`, again: 'fight again' });
}

async function flee() {
  const run = session;
  onKey = null;
  fight.phase = 'text';
  await type("* You fled...\n* He's used to people leaving.");
  if (run === session) closeBoss();
}

function gameOver() {
  stopMusic();
  showEnd({ title: 'GAME OVER', text: `${BOSS.name}: "stay determined.\nor don't. i'm not your mom."`, broken: true, again: `try phase ${fight.stage} again` });
}

async function showEnd({ title, text, broken = false, again }) {
  const run = session;
  fight.phase = 'end';
  fight.retry = broken;
  onKey = null;
  endEl.hidden = false;
  endTitle.textContent = title;
  endText.textContent = '';
  againBtn.textContent = again;
  gsap.set([endTitle, endActions], { opacity: 0 });
  gsap.set(endHeart, { opacity: 1 });
  endHeart.innerHTML = broken
    ? heartSvg((x, y) => x < HEART_CRACK[y]) + heartSvg((x, y) => x >= HEART_CRACK[y])
    : heartSvg();
  if (broken) {
    await sleep(500);
    playAudio(SOUL_SHATTER_AUDIO);
    await sleep(160);
    gsap.to([...endHeart.children], { x: i => (i ? 4 : -4), rotation: i => (i ? 8 : -8), duration: 0.1 });
    await sleep(1300);
    gsap.to(endHeart, { opacity: 0, duration: 0.3 });
  } else {
    gsap.fromTo(endHeart, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  }
  if (run !== session) return;
  await gsap.to(endTitle, { opacity: 1, duration: 0.9 });
  for (let i = 1; i <= text.length; i++) {
    if (run !== session) return;
    endText.textContent = text.slice(0, i);
    if (i % 2) sfx.text();
    await sleep(32);
  }
  gsap.to(endActions, { opacity: 1, duration: 0.4 });
  againBtn.focus({ preventScroll: true });
}

/* ---------- open / close ---------- */
const bossAllowed = () => state === 'chat' || !document.documentElement.classList.contains('locked');

// start (or restart) a phase
function resetStage(stageNo, items) {
  Object.assign(fight, {
    stage: stageNo, php: MAX_HP, kr: 0, turn: 0, turnsInStage: 0, sel: 0,
    tired: false, exhausted: false, phase: 'intro', items: items.map(it => ({ ...it })),
  });
  fight.checkpoint = items.map(it => ({ ...it }));
  onKey = null;
  waiter = null;
  ++typeToken;
  endEl.hidden = true;
  speechEl.hidden = true;
  hpEl.hidden = true;
  gsap.set([spriteEl, box, world], { clearProps: 'all' });
  showSprite(stageNo);
  updateStats();
  setMode('text');
  boxText.textContent = '';
}

async function intro() {
  const run = session;
  gsap.set(stage, { opacity: 0 });
  for (let i = 0; i < 3; i++) {
    gsap.set(flashEl, { opacity: 1 });
    sfx.encounter();
    await sleep(110);
    gsap.set(flashEl, { opacity: 0 });
    await sleep(90);
  }
  if (run !== session) return;
  gsap.set(flashEl, { opacity: 1, x: 0, y: 0 });
  const to = menuBtns[0].querySelector('.boss-heart').getBoundingClientRect();
  const from = flashEl.getBoundingClientRect();
  await gsap.to(flashEl, {
    x: to.left + to.width / 2 - (from.left + from.width / 2),
    y: to.top + to.height / 2 - (from.top + from.height / 2),
    scale: to.width / from.width, duration: 0.45, ease: 'power2.inOut',
  });
  gsap.set(flashEl, { opacity: 0, x: 0, y: 0, scale: 1 });
  await gsap.to(stage, { opacity: 1, duration: 0.25 });
}

async function openBoss() {
  if (fight.open || !bossAllowed()) return;
  const run = ++session;
  document.activeElement?.blur?.();
  fight.open = true;
  document.documentElement.classList.add('boss-open');
  bossEl.hidden = false;
  getAudioCtx().resume().catch(() => {});
  helpEl.textContent = touchOnly
    ? 'tap to choose · drag to move · hold to jump when blue'
    : 'arrows move · up jumps when blue · Z confirm · X back · esc leaves';
  await loadSprites();
  if (run !== session) return;
  resetStage(1, ITEMS);
  await intro();
  if (run !== session) return;
  startMusic(1);
  if (!await speeches(LINES.intro)) return;
  showMenu();
}

function closeBoss() {
  if (!fight.open) return;
  fight.open = false;
  session++;
  G.running = false;
  cancelAnimationFrame(G.raf);
  fctx.clearRect(0, 0, fx.width, fx.height);
  ++typeToken;
  onKey = null;
  waiter = null;
  held.clear();
  drag = null;
  stopMusic();
  gsap.killTweensOf([stage, flashEl, box, barEl, spriteEl, slashEl, dmgEl, hpFill, endTitle, endActions, endHeart, world]);
  bossEl.classList.remove('glitching');
  bossEl.hidden = true;
  document.documentElement.classList.remove('boss-open');
  if (state === 'chat') setBusy(false);
}

againBtn.addEventListener('click', async () => {
  const run = ++session;
  // after a GAME OVER you pick up at the start of the phase you reached; after an ending, from the top
  const stageNo = fight.retry ? fight.stage : 1;
  resetStage(stageNo, fight.retry ? fight.checkpoint : ITEMS);
  await intro();
  if (run !== session) return;
  startMusic(stageNo);
  showMenu();
});
document.getElementById('boss-leave').addEventListener('click', closeBoss);
document.getElementById('boss-x').addEventListener('click', closeBoss);

/* ---------- keys: the fight's controls, and the Konami code to get in ---------- */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiAt = 0;
function konami(e) {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === KONAMI[konamiAt]) konamiAt++;
  else konamiAt = key !== 'ArrowUp' ? 0 : konamiAt === 2 ? 2 : 1;
  if (konamiAt < KONAMI.length) return;
  konamiAt = 0;
  if (document.activeElement === chatInput) chatInput.value = chatInput.value.replace(/ba$/i, '');
  openBoss();
}

addEventListener('keydown', e => {
  if (!fight.open) return konami(e);
  e.stopPropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    return closeBoss();
  }
  if (fight.phase === 'end') return; // the end screen's buttons work with the keyboard as usual
  const k = keyOf(e);
  if (!k) return;
  e.preventDefault();
  held.add(k);
  if (e.repeat || fight.phase === 'dodge') return;
  if (onKey) onKey(k);
  else if (k === 'ok') ok();
}, true);
addEventListener('keyup', e => {
  const k = keyOf(e);
  if (k) held.delete(k);
}, true);
addEventListener('blur', () => held.clear());

// the quiet way in: knock on "still here" in the footer five times
const door = document.getElementById('boss-door');
let knocks = 0, knockTimer = null;
door.addEventListener('click', () => {
  knocks++;
  clearTimeout(knockTimer);
  knockTimer = setTimeout(() => { knocks = 0; }, 1500);
  gsap.fromTo(door, { x: -2 }, { x: 0, duration: 0.2, ease: 'elastic.out(1, 0.3)' });
  if (knocks >= 5) {
    knocks = 0;
    openBoss();
  }
});
