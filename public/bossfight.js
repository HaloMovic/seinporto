/* ---------- secret: fight him, Undertale style ---------- */
// Opens with the Konami code (↑ ↑ ↓ ↓ ← → ← → B A), "/fight" in the chat,
// or by tapping "still here" in the footer five times.
// Swap in your own art and music here; null keeps the placeholder.
const BOSS = {
  name: 'SEIN',
  maxHp: 70,
  atk: 4,
  sprites: {
    idle: null,   // e.g. 'assets/boss/idle.png' (white/grey pixel art on a transparent background)
    hurt: null,   // flashes for a moment when you hit him
    spared: null, // after you spare him
    down: null,   // when his HP hits 0, just before he refuses
  },
  placeholder: 'assets/stand.png', // pixelated on the fly until the sprites exist
  music: null,    // e.g. 'assets/boss/theme.mp3', loops during the fight
};

const PLAYER_MAX_HP = 20;
const BOARD = 150;   // the dodge box, in css px
const SPARE_AT = 100;
const HIT_R = 5;     // the heart's hitbox radius
const WARN = 0.6;    // a glitch band flashes this long before it hurts
const HOT = 0.35;    // ...and hurts for this long

const ENEMY_LINES = {
  opening: 'you really came back for this?',
  normal: ['hold still.', 'this is my portfolio. my rules.', "you can't scroll out of this one.", 'i draw for fun. this is also fun.', 'did you sign the guestbook at least?'],
  soft: ['...stop being nice.', "okay you're alright. still gotta dodge though.", 'fine. one more.'],
  angry: ['okay. no more holding back.', "i'm still here.", "you're not getting my HP that easy."],
};
const FLAVOR = ['* SEIN is sketching something.', '* SEIN adjusts his glasses.', '* Smells like fresh paint.', '* SEIN is thinking about GSAP.', '* The scroll is still locked.'];
const ACTS = [
  { label: 'Check', run: f => [`* ${BOSS.name} - ATK ${f.atk} DEF 2\n* Artist. Animator. Refuses to die.`] },
  {
    label: 'Compliment',
    run: f => {
      f.mercy += 40;
      f.atk = Math.max(2, f.atk - 1);
      return [pick(["* You tell SEIN his drawings are cool.\n* He pretends he didn't hear.\n* His attacks got softer.", '* You say the website is nice.\n* SEIN: "i know."\n* He\'s blushing a little.'])];
    },
  },
  {
    label: 'Talk',
    run: f => {
      f.mercy += 20;
      return [pick(['* You ask why he made this.\n* SEIN: "Mr. Ali Akbar assigned it."', '* You ask if this was made with AI.\n* SEIN looks away.', '* You ask how he\'s doing.\n* SEIN: "still here."'])];
    },
  },
  { label: 'Scroll', run: () => ["* You try to scroll past him.\n* It's locked. Obviously."] },
];
const ITEMS = [
  { name: 'Noodles', heal: 12, text: '* You ate the instant noodles.\n* Tastes like 2am.' },
  { name: 'Es Teh', heal: 8, text: '* You drank the es teh.\n* Sweet enough to hurt.' },
  { name: 'Noodles', heal: 12, text: '* You ate the instant noodles.\n* Still tastes like 2am.' },
  { name: 'Energy Drk', heal: 99, text: '* You chugged the energy drink.\n* Your hands are shaking.' },
];
const GLYPHS = ['{ }', '</>', ';', '( )', '=>', '[ ]', '&&'];
const TOOL_TAGS = ['JS', 'CSS', 'TS', 'GS'];
// his attacks, in order for the first four turns, then shuffled
const PATTERNS = ['pencils', 'code', 'tools', 'bands'];

/* ---------- elements ---------- */
const bossEl = document.getElementById('boss');
const stage = document.getElementById('boss-stage');
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
const board = document.getElementById('boss-board');
const phpBar = document.getElementById('boss-php-bar');
const phpNum = document.getElementById('boss-php-num');
const menuBtns = [...document.querySelectorAll('#boss-menu button')];
const helpEl = document.getElementById('boss-help');
const endEl = document.getElementById('boss-end');
const endHeart = document.getElementById('boss-end-heart');
const endTitle = document.getElementById('boss-end-title');
const endText = document.getElementById('boss-end-text');
const endActions = endEl.querySelector('.boss-end-actions');

/* ---------- the red SOUL ---------- */
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

function drawHeart(ctx, x, y) {
  ctx.fillStyle = '#ff0000';
  HEART.forEach((row, r) => [...row].forEach((c, col) => {
    if (c === 'X') ctx.fillRect(Math.round(x - 9) + col * 2, Math.round(y - 8) + r * 2, 2, 2);
  }));
}

/* ---------- sound: tiny synth blips on the page's Web Audio context ---------- */
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
  hurt: () => tone(220, 0.16, { vol: 0.07, to: 90 }),
  heal: () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.1, { vol: 0.04 }), i * 70)),
  dust: () => tone(300, 0.9, { type: 'sawtooth', vol: 0.03, to: 40 }),
};

let music = null;
function startMusic() {
  if (!BOSS.music) return;
  music ??= new Audio(BOSS.music);
  music.loop = true;
  music.volume = 0.6;
  music.currentTime = 0;
  music.play().catch(() => {});
}
const stopMusic = () => music?.pause();

/* ---------- placeholder sprite: his photo, crushed down to grey pixels ---------- */
let placeholderUrl = null;
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

function setSprite(kind) {
  const src = BOSS.sprites[kind];
  spriteEl.classList.remove('spared');
  spriteEl.src = src || BOSS.sprites.idle || placeholderUrl || BOSS.placeholder;
  if (!src && kind === 'hurt') gsap.fromTo(spriteEl, { filter: 'brightness(3)' }, { filter: 'brightness(1)', duration: 0.35 });
  if (!src && kind === 'spared') spriteEl.classList.add('spared');
}

/* ---------- state and input ---------- */
const fight = { open: false };
let session = 0;          // bumps on open/close so a stale sequence can tell it's been cancelled
let onKey = null;         // the current phase's key handler
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

function setMode(m) { box.className = `boss-box mode-${m}`; }

function updateStats() {
  phpBar.style.width = `${fight.php / PLAYER_MAX_HP * 100}%`;
  phpNum.textContent = `${String(fight.php).padStart(2, ' ')} / ${PLAYER_MAX_HP}`;
}

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

// his speech bubble: waits a moment, or for Z
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

/* ---------- menus ---------- */
function setSel(i) {
  fight.sel = i;
  menuBtns.forEach((b, j) => b.classList.toggle('sel', j === i));
}

function showMenu() {
  if (!fight.open) return;
  fight.phase = 'menu';
  setSel(fight.sel);
  type(fight.mercy >= SPARE_AT ? `* ${BOSS.name} doesn't want to fight anymore.` : pick(FLAVOR), false);
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
  if (i === 1) return options(ACTS.map(a => `* ${a.label}`), j => runTurn(ACTS[j].run(fight)));
  if (i === 2) {
    if (!fight.items.length) {
      onKey = null;
      return type('* Your pockets are empty.').then(showMenu);
    }
    return options(fight.items.map(it => `* ${it.name}`), useItem);
  }
  return options(['* Spare', '* Flee'], j => (j ? flee() : spare()), fight.mercy >= SPARE_AT ? [0] : []);
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
  fight.php = Math.min(PLAYER_MAX_HP, fight.php + it.heal);
  updateStats();
  sfx.heal();
  runTurn([`${it.text}\n* ${fight.php === PLAYER_MAX_HP ? 'Your HP was maxed out.' : `You recovered ${fight.php - before} HP!`}`]);
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
  const acc = p == null ? 0 : 1 - Math.abs(p - 0.5) * 2;
  const dmg = p == null ? 0 : acc > 0.94 ? 22 : Math.max(1, Math.round(3 + 15 * acc ** 1.4));
  await hitBoss(dmg);
  if (run !== session) return;
  if (fight.hp <= 0) return bossDown();
  enemyTurn();
}

async function hitBoss(dmg) {
  if (dmg) {
    sfx.slash();
    await gsap.fromTo(slashEl, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.25, ease: 'power2.out' });
    gsap.to(slashEl, { opacity: 0, duration: 0.2 });
    sfx.hit();
    setSprite('hurt');
    gsap.fromTo(spriteEl, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  }
  const before = fight.hp;
  fight.hp = Math.max(0, fight.hp - dmg);
  dmgEl.textContent = dmg || 'MISS';
  dmgEl.classList.toggle('miss', !dmg);
  hpEl.hidden = false;
  gsap.fromTo(hpFill, { width: `${before / BOSS.maxHp * 100}%` }, { width: `${fight.hp / BOSS.maxHp * 100}%`, duration: 0.6, ease: 'power2.out' });
  await gsap.fromTo(dmgEl, { opacity: 1, y: 0 }, { y: -18, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1 });
  await sleep(700);
  gsap.to(dmgEl, { opacity: 0, duration: 0.2 });
  hpEl.hidden = true;
  if (fight.hp > 0) setSprite('idle');
}

/* ---------- his turn: say something, then you dodge ---------- */
async function enemyTurn() {
  const run = session;
  if (!fight.open) return;
  fight.turn++;
  fight.phase = 'enemy';
  onKey = null;
  ++typeToken;
  boxText.textContent = '';
  const angry = fight.hp < BOSS.maxHp * 0.4;
  const pool = fight.mercy >= 40 ? ENEMY_LINES.soft : angry ? ENEMY_LINES.angry : ENEMY_LINES.normal;
  await speech(fight.turn === 1 ? ENEMY_LINES.opening : pick(pool));
  if (run !== session) return;
  const pattern = fight.turn <= PATTERNS.length ? PATTERNS[fight.turn - 1] : pick(angry ? ['pencils+code', 'bands', 'tools', 'code'] : PATTERNS);
  await dodge(pattern);
  if (run !== session) return;
  if (fight.php <= 0) return gameOver();
  showMenu();
}

const rand = gsap.utils.random;
const clamp = gsap.utils.clamp;
const SPAWN = {
  pencils: g => g.every('pencil', 0.36, () => g.add({ kind: 'pencil', x: rand(6, BOARD - 6), y: -14, w: 6, h: 24, vy: rand(80, 120) })),
  code: g => g.every('code', 0.55, () => {
    const left = Math.random() < 0.5;
    g.add({ kind: 'code', text: pick(GLYPHS), x: left ? -20 : BOARD + 20, y: rand(10, BOARD - 10), w: 24, h: 12, vx: (left ? 1 : -1) * rand(70, 105) });
  }),
  tools: g => {
    if (g.started) return;
    g.started = true;
    const n = g.rage > 1 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      g.add({ kind: 'tool', text: TOOL_TAGS[i], x: rand(15, BOARD - 15), y: rand(12, 36), w: 22, h: 22, vx: pick([-1, 1]) * rand(55, 80), vy: rand(50, 80), bounce: true });
    }
  },
  bands: g => g.every('band', 0.85, () => g.add({ kind: 'band', horiz: Math.random() < 0.6, pos: rand(12, BOARD - 12), size: 20, age: 0 })),
  'pencils+code': g => { SPAWN.pencils(g); SPAWN.code(g); },
};

function bulletHits(b, heart) {
  let x = b.x, y = b.y, w = b.w, h = b.h;
  if (b.kind === 'band') {
    if (b.age < WARN) return false;
    [x, y, w, h] = b.horiz ? [BOARD / 2, b.pos, BOARD, b.size] : [b.pos, BOARD / 2, b.size, BOARD];
  }
  const dx = Math.max(Math.abs(heart.x - x) - w / 2, 0);
  const dy = Math.max(Math.abs(heart.y - y) - h / 2, 0);
  return dx * dx + dy * dy < HIT_R * HIT_R;
}

function drawBoard(ctx, bullets, heart, blink) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, BOARD, BOARD);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of bullets) {
    if (b.kind === 'pencil') {
      ctx.fillStyle = '#ff8fb1';
      ctx.fillRect(b.x - 3, b.y - 12, 6, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - 3, b.y - 8, 6, 14);
      ctx.fillStyle = '#bbb';
      ctx.beginPath();
      ctx.moveTo(b.x - 3, b.y + 6);
      ctx.lineTo(b.x + 3, b.y + 6);
      ctx.lineTo(b.x, b.y + 12);
      ctx.fill();
    } else if (b.kind === 'code') {
      ctx.fillStyle = '#fff';
      ctx.font = '20px VT323, monospace';
      ctx.fillText(b.text, b.x, b.y);
    } else if (b.kind === 'tool') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - 11, b.y - 11, 22, 22);
      ctx.fillStyle = '#000';
      ctx.font = '700 9px Silkscreen, monospace';
      ctx.fillText(b.text, b.x, b.y + 1);
    } else if (b.kind === 'band') {
      const [x, y, w, h] = b.horiz ? [0, b.pos - b.size / 2, BOARD, b.size] : [b.pos - b.size / 2, 0, b.size, BOARD];
      if (b.age < WARN) {
        ctx.strokeStyle = Math.floor(b.age * 12) % 2 ? '#ffff00' : '#ff7f27';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, w, h);
      }
    }
  }
  if (!blink) drawHeart(ctx, heart.x, heart.y);
}

function resizeBox(dodging) {
  return gsap.to(box, dodging
    ? { width: BOARD + 8, height: BOARD + 8, duration: 0.3, ease: 'steps(5)' }
    : { width: stage.clientWidth, height: 150, duration: 0.3, ease: 'steps(5)', onComplete: () => gsap.set(box, { clearProps: 'width,height' }) });
}

async function dodge(name) {
  const run = session;
  fight.phase = 'dodge';
  setMode('dodge');
  await resizeBox(true);
  if (run !== session) return;

  const dpr = Math.min(2, devicePixelRatio || 1);
  board.width = board.height = BOARD * dpr;
  const ctx = board.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const heart = { x: BOARD / 2, y: BOARD / 2 };
  fight.heart = heart;
  const angry = fight.hp < BOSS.maxHp * 0.4;
  const rage = Math.max(0.7, (angry ? 1.3 : 1) - Math.min(0.3, fight.mercy / 400));
  const g = {
    t: 0, dt: 0, rage, bullets: [], timers: {},
    add(b) {
      b.vx = (b.vx || 0) * rage;
      b.vy = (b.vy || 0) * rage;
      this.bullets.push(b);
    },
    every(key, sec, fn) {
      this.timers[key] = (this.timers[key] ?? sec * 0.6) + this.dt;
      while (this.timers[key] >= sec / rage) {
        this.timers[key] -= sec / rage;
        fn();
      }
    },
  };
  const duration = angry ? 7 : 6;
  let inv = 0;

  await new Promise(resolve => {
    let last = performance.now();
    const frame = now => {
      if (run !== session) return resolve();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.dt = dt;
      g.t += dt;

      const speed = 95;
      heart.x = clamp(9, BOARD - 9, heart.x + ((held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0)) * speed * dt);
      heart.y = clamp(8, BOARD - 8, heart.y + ((held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0)) * speed * dt);

      if (g.t > 0.35 && g.t < duration - 0.6) SPAWN[name](g);
      for (const b of g.bullets) {
        if (b.kind === 'band') { b.age += dt; continue; }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.bounce) {
          if (b.x < b.w / 2 || b.x > BOARD - b.w / 2) b.vx *= -1;
          if (b.y < b.h / 2 || b.y > BOARD - b.h / 2) b.vy *= -1;
          b.x = clamp(b.w / 2, BOARD - b.w / 2, b.x);
          b.y = clamp(b.h / 2, BOARD - b.h / 2, b.y);
        }
      }
      g.bullets = g.bullets.filter(b => (b.kind === 'band' ? b.age < WARN + HOT
        : b.bounce ? g.t < duration - 0.3
          : b.x > -40 && b.x < BOARD + 40 && b.y < BOARD + 30));

      inv -= dt;
      if (inv <= 0 && g.bullets.some(b => bulletHits(b, heart))) {
        fight.php = Math.max(0, fight.php - fight.atk);
        updateStats();
        sfx.hurt();
        gsap.fromTo(box, { x: -5 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' });
        inv = 1;
      }
      drawBoard(ctx, g.bullets, heart, inv > 0 && Math.floor(inv * 12) % 2 === 0);

      if (fight.php <= 0 || g.t >= duration) return resolve();
      fight.raf = requestAnimationFrame(frame);
    };
    fight.raf = requestAnimationFrame(frame);
  });
  fight.heart = null;
  if (run !== session || fight.php <= 0) return;
  setMode('text');
  boxText.textContent = '';
  await resizeBox(false);
}

// on a phone: drag anywhere to move the heart; tap to continue or to stop the FIGHT bar
let drag = null;
bossEl.addEventListener('pointerdown', e => {
  if (e.target.closest('button, li')) return;
  if (fight.phase === 'dodge') {
    drag = { x: e.clientX, y: e.clientY };
    bossEl.setPointerCapture(e.pointerId);
    return;
  }
  if (fight.phase === 'target') return onKey?.('ok');
  if (!onKey) ok();
});
bossEl.addEventListener('pointermove', e => {
  if (!drag || !fight.heart) return;
  fight.heart.x = clamp(9, BOARD - 9, fight.heart.x + (e.clientX - drag.x) * 1.1);
  fight.heart.y = clamp(8, BOARD - 8, fight.heart.y + (e.clientY - drag.y) * 1.1);
  drag = { x: e.clientX, y: e.clientY };
});
['pointerup', 'pointercancel'].forEach(t => bossEl.addEventListener(t, () => { drag = null; }));

/* ---------- endings ---------- */
async function bossDown() {
  const run = session;
  onKey = null;
  fight.phase = 'text';
  await speech('...huh. you actually did it.');
  if (run !== session) return;
  setSprite('down');
  sfx.dust();
  await gsap.to(spriteEl, { opacity: 0, y: 12, filter: 'blur(3px)', duration: 1.4, ease: 'steps(10)' });
  await sleep(700);
  if (run !== session) return;
  await type('* But it refused.');
  if (run !== session) return;
  fight.hp = 1;
  setSprite('idle');
  gsap.set(spriteEl, { y: 0, filter: 'none' });
  await gsap.fromTo(spriteEl, { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' });
  await speech('still here.');
  if (run !== session) return;
  showEnd({ title: 'YOU WON?', text: `* ${BOSS.name} is still here.\n* You earned 0 EXP and a follow on instagram.` });
}

async function spare() {
  if (fight.mercy < SPARE_AT) return runTurn([`* You tried to spare ${BOSS.name}.\n* He's not done yet.`]);
  const run = session;
  onKey = null;
  fight.phase = 'text';
  setSprite('spared');
  sfx.dust();
  await type('* YOU WON!\n* You earned 0 EXP and 0 GOLD.');
  if (run !== session) return;
  await speech("...fine. you're alright.");
  if (run !== session) return;
  showEnd({ title: 'SPARED', text: `* You spared ${BOSS.name}.\n* He'll remember that.\n* (sign the guestbook.)` });
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
  showEnd({ title: 'GAME OVER', text: `${BOSS.name}: "stay determined.\nor don't. i'm not your mom."`, broken: true });
}

async function showEnd({ title, text, broken = false }) {
  const run = session;
  fight.phase = 'end';
  onKey = null;
  endEl.hidden = false;
  endTitle.textContent = title;
  endText.textContent = '';
  gsap.set([endTitle, endActions], { opacity: 0 });
  gsap.set(endHeart, { opacity: 1 });
  endHeart.innerHTML = broken
    ? heartSvg((x, y) => x < HEART_CRACK[y]) + heartSvg((x, y) => x >= HEART_CRACK[y])
    : heartSvg();
  const halves = [...endHeart.children];
  if (broken) {
    await sleep(500);
    playAudio(SOUL_SHATTER_AUDIO);
    await sleep(160);
    gsap.to(halves, { x: i => (i ? 4 : -4), rotation: i => (i ? 8 : -8), duration: 0.1 });
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
  document.getElementById('boss-again').focus({ preventScroll: true });
}

/* ---------- open / close ---------- */
const bossAllowed = () => state === 'chat' || !document.documentElement.classList.contains('locked');

function resetFight() {
  Object.assign(fight, {
    hp: BOSS.maxHp, php: PLAYER_MAX_HP, mercy: 0, atk: BOSS.atk, turn: 0, sel: 0,
    items: ITEMS.map(it => ({ ...it })), phase: 'intro', heart: null,
  });
  onKey = null;
  waiter = null;
  ++typeToken;
  endEl.hidden = true;
  speechEl.hidden = true;
  hpEl.hidden = true;
  gsap.set(spriteEl, { clearProps: 'all' });
  gsap.set(box, { clearProps: 'all' });
  setSprite('idle');
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
    ? 'tap to choose · drag to move the heart · tap to continue'
    : 'arrows move · Z confirm · X back · esc leaves';
  if (!BOSS.sprites.idle && !placeholderUrl) placeholderUrl = await pixelated(BOSS.placeholder).catch(() => null);
  if (run !== session) return;
  resetFight();
  await intro();
  if (run !== session) return;
  startMusic();
  showMenu();
}

function closeBoss() {
  if (!fight.open) return;
  fight.open = false;
  session++;
  cancelAnimationFrame(fight.raf);
  ++typeToken;
  onKey = null;
  waiter = null;
  held.clear();
  drag = null;
  stopMusic();
  gsap.killTweensOf([stage, flashEl, box, barEl, spriteEl, slashEl, dmgEl, hpFill, endTitle, endActions, endHeart]);
  bossEl.hidden = true;
  document.documentElement.classList.remove('boss-open');
  if (state === 'chat') setBusy(false);
}

document.getElementById('boss-again').addEventListener('click', async () => {
  const run = ++session;
  resetFight();
  await intro();
  if (run !== session) return;
  startMusic();
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
  if (e.repeat) return;
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
