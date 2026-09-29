/* ---------- secret: fight him, Undertale: Last Breath style ---------- */
// Three phases. He dodges everything until he's tired; the hit that finally lands doesn't end it,
// he refuses and comes back harder. Using an item makes him attack too, but that turn doesn't
// tire him out. Phase 3 gives you no turns: one long attack that flows from pattern to pattern
// while the box reshapes and he talks over it, a heal every three, then his last attack, and
// only then can you finish him or spare him.
// Phase 3 opens by smashing your buttons; they only come back once he's out of breath.
// With chaos mode on the fight is harder: the track runs faster (and every attack with it),
// the attacks throw more at once, and phase 3 has one more attack and a longer ending.
// Opens with the Konami code (↑ ↑ ↓ ↓ ← → ← → B A), "/fight" in the chat,
// or by tapping "still here" in the footer five times.
// Admin: "/fight 2" or "/fight 3" in the chat opens straight at that phase, and in the fight
// ` (backtick) then 1, 2 or 3 jumps to it. Phase 3 always starts from its opening, buttons whole.
//
// Art: drop sprites into assets/boss/ with these names and they're picked up on their own.
// A missing sprite falls back to his photo, pixelated; missing music just means silence.
// Each phase plays its own track, and his attacks are timed to its beat: the tempo is read
// from the file itself, so swapping a track keeps everything in time.
const BOSS = {
  name: 'SEIN',
  sprites: {
    1: 'assets/boss/phase1.png',
    2: 'assets/boss/phase2.png',
    3: 'assets/boss/phase3.png',
    spared: 'assets/boss/spared.png',
  },
  music: {
    1: 'assets/phase 1.mp3',
    2: 'assets/phase 2.mp3',
    3: 'assets/phase 3.mp3',
  },
  placeholder: 'assets/stand.png',
};

const MAX_HP = 90;
const SPEED = 110;                       // the heart, px/s
const SOUL_GRAVITY = 900, JUMP = 250, MAX_FALL = 420;
const HIT_R = 4.5;                       // the heart's hitbox radius
const TIRED_AFTER = { 1: 8, 2: 10 };      // his turns before a hit can land
const BREATHER_EVERY = 3;                // phase 3: attacks between heals (the same heal in chaos mode)
const BREATHER_HEAL = Math.round(MAX_HP * 0.45);
const FALLBACK_BPM = 120;                // the beat attacks keep when a track is missing or still loading
const HARD_RATE = 1.15;                  // chaos mode: how much faster the track (and so everything) runs
const FLIP_ANGLES = [45, 95, 135, 167, 180, 213, 250, 290, 315]; // where the screen turns to

const LINES = {
  intro: ["it's a beautiful day on my portfolio.", 'the scroll is locked. the guestbook is open.', 'on days like these, visitors like you...', '...should be signing my guestbook.', 'but you wanted a fight. so.'],
  hardIntro: ['oh, and chaos mode is on?', "then i'm not holding back."],
  1: {
    // one before each turn, in the order of STAGE_ATTACKS
    turns: ['ready?', "i'm not gonna make this easy.", 'dodge this.', 'you really came back for this?', 'watch the floor. and the ceiling.', 'okay. two at once.', 'my pencil never runs out.', "heh. you're not bad."],
    tired: 'okay... one more.',
    item: ['snack break? sure. dodge while you chew.', "that won't save you.", 'eat fast.'],
    fall: ['...heh.', "guess that's it, huh?"],
  },
  2: {
    start: ['...nah.', "i'm not done.", 'not while this site is still up.'],
    turns: ['you think one hit was enough?', "i've been up since 7am. i can do this all day.", "let's flip things around.", 'two of you? then two of everything.', "hear that? that's my song.", 'still here.', 'try outrunning a laser.', 'blink and you miss it.', 'they know where you are.', 'left. right. both.'],
    tired: "heh... can't... keep this up...",
    item: ["healing won't change anything.", 'go ahead. i can wait. kidding.', 'save some for me.'],
    fall: ['...w-wait.', "that's not..."],
  },
  3: {
    start: ['...', 'something is holding me up.', "and it doesn't want you to win."],
    // one before each attack, in the order of STAGE_ATTACKS[3]
    turns: ['this is my last breath.', 'the screen is mine now.', "the floor won't hold still.", 'round and round.', 'keep up with the beat.', "look. there's two of you now.", "there's only one way out.", "i'm not letting you through.", "i-it's not... me...", 'which way is down?', 'just... give up.', 'no more room.'],
    smash: ["and you won't be needing these."],
    frenzy: 'you wanted chaos? here.', // chaos mode's extra attack
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
const cutEl = document.getElementById('boss-cut');
const cutText = document.getElementById('boss-cut-text');
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
const enemyEl = document.getElementById('boss-enemy');
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
// effects go through a compressor so a screen full of blasters roars instead of clipping
let sfxBus = null;
function bus(ctx) {
  if (!sfxBus) {
    sfxBus = ctx.createDynamicsCompressor();
    sfxBus.threshold.value = -16;
    sfxBus.ratio.value = 8;
    sfxBus.connect(ctx.destination);
  }
  return sfxBus;
}
// swell: fades in over the note instead of starting at full volume
function envelope(g, t, dur, vol, swell) {
  if (swell) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
  } else {
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
}
function tone(freq, dur, { type = 'square', vol = 0.05, to, swell = false } = {}) {
  const ctx = getAudioCtx();
  if (ctx.state !== 'running') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  envelope(g, t, dur, vol, swell);
  o.connect(g).connect(bus(ctx));
  o.start(t);
  o.stop(t + dur + 0.06);
}
// filtered white noise: the hiss and roar the blasters need
let noiseBuf = null;
function hiss(dur, { vol = 0.05, filter = 'lowpass', freq = 2000, to, q = 1, swell = false } = {}) {
  const ctx = getAudioCtx();
  if (ctx.state !== 'running') return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
  src.buffer = noiseBuf;
  src.loop = true;
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  envelope(g, t, dur, vol, swell);
  src.connect(f).connect(g).connect(bus(ctx));
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.06);
}
// several blasters landing on the same beat make one sound, not six stacked copies
const lastSfx = {};
function once(key, gapMs = 45) {
  const now = performance.now();
  if (now - (lastSfx[key] ?? -1e9) < gapMs) return false;
  lastSfx[key] = now;
  return true;
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
  // a Gaster Blaster: the jaw opens with a rising whine, then the beam roars out
  charge(dur = 0.5) {
    if (!once('charge')) return;
    dur = Math.max(0.2, dur);
    tone(160, dur, { type: 'sawtooth', vol: 0.035, to: 1100, swell: true });
    tone(320, dur, { type: 'square', vol: 0.012, to: 2300, swell: true });
    hiss(dur, { vol: 0.03, filter: 'bandpass', freq: 900, to: 5200, q: 4, swell: true });
  },
  blast() {
    if (!once('blast')) return;
    hiss(0.08, { vol: 0.22, filter: 'highpass', freq: 3000 });
    hiss(0.85, { vol: 0.2, filter: 'lowpass', freq: 7000, to: 220, q: 0.8 });
    hiss(0.6, { vol: 0.08, filter: 'bandpass', freq: 1400, to: 500, q: 2 });
    tone(120, 0.7, { type: 'sawtooth', vol: 0.07, to: 34 });
    tone(62, 0.8, { type: 'square', vol: 0.05, to: 28 });
  },
  bone: () => once('bone', 80) && tone(1500, 0.05, { type: 'triangle', vol: 0.025, to: 700 }),
  slam: () => tone(70, 0.2, { vol: 0.09, to: 35 }),
  rise: () => tone(900, 0.06, { vol: 0.03, to: 1400 }),
  power: () => tone(60, 1.6, { type: 'sawtooth', vol: 0.05, to: 900 }),
  // the screen snapping to black
  cut() {
    tone(2200, 0.025, { vol: 0.04 });
    hiss(0.06, { vol: 0.08, filter: 'highpass', freq: 4000 });
  },
  // your SOUL beating in the dark
  thump() {
    tone(58, 0.16, { type: 'sine', vol: 0.14, to: 40 });
    setTimeout(() => tone(52, 0.13, { type: 'sine', vol: 0.09, to: 38 }), 160);
  },
  // a button coming apart
  shatter() {
    hiss(0.05, { vol: 0.2, filter: 'highpass', freq: 5000 });
    hiss(0.4, { vol: 0.08, filter: 'bandpass', freq: 3200, to: 500, q: 3 });
    tone(880, 0.3, { type: 'square', vol: 0.03, to: 110 });
  },
  glitch: () => { for (let i = 0; i < 5; i++) setTimeout(() => tone(gsap.utils.random(200, 2000), 0.03, { vol: 0.03 }), i * 40); },
};

/* ---------- music: one track per phase, and the beat everything is timed to ---------- */
// The mp3s are fetched once and kept; the decoded audio (tens of MB each) only for the phase
// that's playing and the one after it.
const rawTracks = {}, decoded = {}, beatInfo = {};
const music = { src: null, gain: null, analyser: null, bins: null, start: 0, spb: 60 / FALLBACK_BPM, offset: 0, rate: 1, token: 0, stage: 0 };

function loadTrack(stageNo) {
  const url = BOSS.music[stageNo];
  if (!url) return Promise.resolve(null);
  rawTracks[stageNo] ??= fetch(url).then(r => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  return (decoded[stageNo] ??= rawTracks[stageNo].then(async raw => {
    if (!raw) return null;
    const buf = await getAudioCtx().decodeAudioData(raw.slice(0));
    beatInfo[stageNo] ??= await findBeat(buf);
    return buf;
  }).catch(() => null));
}

// A small beat tracker: how hard the track hits (mostly the low end) over time, then the tempo
// and starting point whose grid of beats lands on the most hits. The tempo is folded into
// 72-144 BPM, which also keeps his attacks at a playable pace.
async function findBeat(buf) {
  const rate = buf.sampleRate, hop = Math.round(rate / 200), fps = rate / hop;
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const n = Math.floor(Math.min(buf.length, rate * 120) / hop);
  const low = new Float32Array(n), full = new Float32Array(n);
  const a = 1 - Math.exp(-2 * Math.PI * 160 / rate);
  let lp = 0;
  for (let f = 0; f < n; f++) {
    let el = 0, ef = 0;
    for (let i = f * hop, end = i + hop; i < end; i++) {
      const s = L[i] + R[i];
      lp += a * (s - lp);
      el += lp * lp;
      ef += s * s;
    }
    low[f] = Math.log1p(100 * el / hop);
    full[f] = Math.log1p(100 * ef / hop);
    if (f % 4000 === 3999) await sleep(0); // stay out of the way of the intro's animation
  }
  const onset = new Float32Array(n);
  for (let f = 1; f < n; f++) onset[f] = Math.max(0, low[f] - low[f - 1]) + 0.5 * Math.max(0, full[f] - full[f - 1]);

  // how well a tempo lines up, and where its first beat is
  const score = bpm => {
    const P = fps * 60 / bpm;
    let best = 0, bestPhase = 0;
    for (let ph = 0; ph < P; ph += 1) {
      let sum = 0, count = 0;
      for (let x = ph; x < n - 2; x += P, count++) {
        const i = Math.round(x);
        sum += Math.max(onset[i], onset[i + 1], onset[i - 1] || 0);
      }
      if (sum / count > best) { best = sum / count; bestPhase = ph; }
    }
    return { bpm, value: best, offset: bestPhase / fps };
  };
  let top = { value: -1 };
  for (let bpm = 72; bpm < 144; bpm += 0.5) {
    const s = score(bpm);
    if (s.value > top.value) top = s;
    if (bpm % 8 === 0) await sleep(0);
  }
  const around = top.bpm;
  for (let k = -25; k <= 25; k++) {
    const s = score(around + k * 0.02);
    if (s.value > top.value) top = s;
    if (k % 10 === 0) await sleep(0);
  }
  return top.value > 0 ? { bpm: top.bpm, offset: top.offset } : null;
}

async function startMusic(stageNo) {
  stopMusic();
  const token = music.token;
  // keep the decoded audio for this phase and the next one only
  Object.keys(decoded).forEach(k => { if (+k !== stageNo && +k !== stageNo + 1) delete decoded[k]; });
  const buf = await loadTrack(stageNo);
  if (token !== music.token || !buf || !fight.open) return;
  const ctx = getAudioCtx();
  const beat = beatInfo[stageNo] || { bpm: FALLBACK_BPM, offset: 0 };
  const src = ctx.createBufferSource(), gain = ctx.createGain(), analyser = ctx.createAnalyser();
  src.buffer = buf;
  src.loop = true;
  // chaos mode plays it faster; song time runs faster with it, so the attacks keep up
  const rate = fight.hard ? HARD_RATE : 1;
  src.playbackRate.value = rate;
  // loop on a whole number of beats, so the beat grid carries straight on into the next pass
  const spb = 60 / beat.bpm;
  src.loopStart = beat.offset;
  src.loopEnd = beat.offset + Math.max(1, Math.floor((buf.duration - beat.offset) / spb)) * spb;
  gain.gain.value = 0.6;
  analyser.fftSize = 256;
  src.connect(gain).connect(ctx.destination);
  gain.connect(analyser);
  const at = ctx.currentTime + 0.05;
  src.start(at);
  Object.assign(music, { src, gain, analyser, bins: new Uint8Array(analyser.frequencyBinCount), start: at, spb, offset: beat.offset, rate, stage: stageNo });
  loadTrack(stageNo + 1); // get the next phase ready while this one plays
}
// slow: the track winds down like a tape running out
function stopMusic(slow = false) {
  music.token++;
  if (!music.src) return;
  const { src, gain } = music, t = getAudioCtx().currentTime;
  if (slow) {
    src.playbackRate.setValueAtTime(src.playbackRate.value, t);
    src.playbackRate.linearRampToValueAtTime(0.15, t + 1.3);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.3);
    src.stop(t + 1.35);
  } else {
    gain.gain.setTargetAtTime(0, t, 0.05);
    src.stop(t + 0.3);
  }
  music.src = null;
}

// seconds into the track as you hear it, or null when there's no music to follow
function songTime() {
  if (!music.src || audioCtx?.state !== 'running') return null;
  return (audioCtx.currentTime - music.start - (audioCtx.outputLatency || audioCtx.baseLatency || 0)) * music.rate;
}
// real seconds until the track's next beat (none when there's no music)
function toNextBeat() {
  const t = songTime();
  if (t === null) return 0;
  const b = (t - music.offset) / music.spb;
  return (Math.ceil(b) - b) * music.spb / music.rate;
}

// the music, felt: a glow that pulses on the beat, louder when the track is, and a bob on every beat
let lastBeat = -1, loudness = 0;
gsap.ticker.add(() => {
  if (!fight.open) return;
  const t = songTime();
  if (t === null || fight.phase === 'end') {
    bossEl.style.setProperty('--pulse', 0);
    return;
  }
  music.analyser.getByteFrequencyData(music.bins);
  const bass = (music.bins[0] + music.bins[1] + music.bins[2] + music.bins[3]) / 1020;
  loudness += (bass - loudness) * 0.2;
  const b = (t - music.offset) / music.spb, frac = b - Math.floor(b);
  bossEl.style.setProperty('--pulse', (Math.exp(-frac * 5) * (0.35 + 0.65 * loudness)).toFixed(3));
  const beat = Math.floor(b);
  if (beat === lastBeat) return;
  lastBeat = beat;
  if (reduceMotion || fight.phase === 'intro') return;
  const big = beat % 4 === 0;
  gsap.fromTo(enemyEl, { y: big ? 4 : 2, scaleY: big ? 0.97 : 0.985 }, { y: 0, scaleY: 1, duration: music.spb / music.rate * 0.9, ease: 'power2.out', overwrite: 'auto' });
});

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

// his speech bubble: moves on after a moment, or on Z. A newer line takes the bubble over,
// so he can talk over an attack without waiting for it
let sayToken = 0;
async function speech(text) {
  const run = session, say = ++sayToken;
  speechEl.hidden = false;
  const p = speechEl.firstElementChild;
  for (let i = 1; i <= text.length; i++) {
    if (run !== session || say !== sayToken) return;
    p.textContent = text.slice(0, i);
    if (i % 2) sfx.voice();
    await sleep(35);
  }
  await Promise.race([sleep(1500), waitOk()]);
  if (say !== sayToken) return;
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

async function runTurn(lines, free = false) {
  const run = session;
  onKey = null;
  fight.phase = 'text';
  for (const line of lines) {
    await type(line);
    if (run !== session) return;
  }
  enemyTurn(free);
}

function useItem(j) {
  const it = fight.items.splice(j, 1)[0];
  const before = fight.php;
  fight.php = Math.min(MAX_HP, fight.php + it.heal);
  fight.kr = 0;
  updateStats();
  sfx.heal();
  runTurn([`${it.text}\n* ${fight.php === MAX_HP ? 'Your HP was maxed out.' : `You recovered ${fight.php - before} HP!`}`], true);
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
    const tw = gsap.fromTo(barEl, { x: 0 }, { x: targetEl.clientWidth, duration: fight.hard ? 0.85 : 1.15, ease: 'none', onComplete: () => resolve(null) });
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

async function popNumber(text, miss, heal = false) {
  dmgEl.textContent = text;
  dmgEl.classList.toggle('miss', miss);
  dmgEl.classList.toggle('heal', heal);
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
  // the song winds down, he sinks, and the screen snaps to black
  stopMusic(true);
  await gsap.to(spriteEl, { y: 10, scaleY: 0.94, duration: 1.3, ease: 'power2.in' });
  if (run !== session) return;
  gsap.set(cutEl, { opacity: 1 });
  sfx.cut();
  await sleep(900);
  if (run !== session) return;

  // in the dark: only your SOUL, beating
  gsap.set(flashEl, { opacity: 1, scale: 1.6 });
  for (let i = 0; i < 3; i++) {
    sfx.thump();
    await gsap.fromTo(flashEl, { scale: 1.9 }, { scale: 1.6, duration: 0.55, ease: 'power2.out' });
    if (run !== session) return;
  }
  // every phase starts with a full bag
  Object.assign(fight, { stage: next, turnsInStage: 0, tired: false, php: MAX_HP, kr: 0, items: ITEMS.map(it => ({ ...it })) });
  bossEl.dataset.stage = next;
  updateStats();
  showSprite(next);
  gsap.set(spriteEl, { y: 0, scaleY: 1 });
  if (!await darkLine(next === 2 ? '* But it refused.' : '* But something else\nrefused for him.')) return;

  // it all comes back at once, in a white flash
  sfx.power();
  await gsap.fromTo(flashEl, { x: -2 }, { x: 2, duration: 0.05, repeat: 23, yoyo: true, ease: 'none' });
  if (run !== session) return;
  gsap.set(flashEl, { opacity: 0, x: 0, scale: 1 });
  cutText.textContent = '';
  gsap.set(cutEl, { backgroundColor: '#fff' });
  gsap.to(cutEl, { opacity: 0, duration: 0.8, ease: 'power2.in', clearProps: 'backgroundColor' });
  glitch(next === 3 ? 3 : 1);
  gsap.fromTo(spriteEl, { scale: 1.15, filter: 'brightness(4)' }, { scale: 1, filter: 'brightness(1)', duration: 1.1, ease: 'power2.out', clearProps: 'filter' });
  shake(10);
  rise(next);
}

// he's back on his feet: his lines, in phase 3 your buttons smashed, then the fight goes on.
// A retry (or a jump) to phase 3 starts here too, with the buttons still whole
async function rise(next) {
  const run = session;
  onKey = null;
  fight.phase = 'text';
  startMusic(next);
  await sleep(900);
  if (run !== session) return;
  if (!await speeches(LINES[next].start)) return;
  if (next === 3) {
    if (!await speeches(LINES[3].smash)) return;
    if (!await smashButtons()) return;
  }
  sfx.heal();
  await type(next === 2 ? '* SEIN is back on his feet.\n* Your HP was restored.' : "* Your buttons are gone.\n* It won't give you a turn.\n* Your HP was restored.");
  if (run !== session) return;
  if (next === 3) gauntlet();
  else showMenu();
}

// a line typed out in the dark between phases; moves on after a moment, or on Z
async function darkLine(text) {
  const run = session;
  for (let i = 1; i <= text.length; i++) {
    if (run !== session) return false;
    cutText.textContent = text.slice(0, i);
    if (text[i - 1].trim() && i % 2) sfx.text();
    await sleep(text[i - 1] === '\n' ? 200 : 60);
  }
  await Promise.race([sleep(1600), waitOk()]);
  waiter = null;
  return run === session;
}

// phase 3's intro: one by one, on the beat, the buttons shudder and burst into pixels
async function smashButtons() {
  const run = session;
  for (const b of menuBtns) {
    sfx.glitch();
    await gsap.fromTo(b, { x: -3 }, { x: 3, duration: 0.04, repeat: 7, yoyo: true, ease: 'none', clearProps: 'x' });
    if (run !== session) return false;
    await sleep(toNextBeat() * 1000);
    if (run !== session) return false;
    shatter(b);
    b.classList.add('broken');
    b.disabled = true;
    sfx.shatter();
    shake(6);
    glitch();
  }
  await sleep(700);
  return run === session;
}

function shatter(el) {
  const r = el.getBoundingClientRect(), o = bossEl.getBoundingClientRect();
  const color = getComputedStyle(el).color;
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('i'), size = pick([3, 4, 4, 6]);
    s.className = 'boss-shard';
    Object.assign(s.style, {
      left: `${r.left - o.left + rand(0, r.width)}px`, top: `${r.top - o.top + rand(0, r.height)}px`,
      width: `${size}px`, height: `${size}px`, background: color,
    });
    bossEl.append(s);
    // a burst up and out, then they fall off the bottom of the screen
    const up = rand(20, 60), fall = rand(0.9, 1.5);
    gsap.to(s, { x: rand(-110, 110), rotation: rand(-360, 360), duration: fall + 0.25, ease: 'none' });
    gsap.timeline({ onComplete: () => s.remove() })
      .to(s, { y: -up, duration: 0.25, ease: 'power2.out' })
      .to(s, { y: innerHeight - r.top + 20, duration: fall, ease: 'power2.in' });
  }
}

// once he's out of breath, the buttons flicker back together
async function mendButtons() {
  const run = session;
  for (const b of menuBtns) {
    b.classList.remove('broken');
    b.disabled = false;
    gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'steps(3)', clearProps: 'opacity' });
    sfx.rise();
    await sleep(160);
    if (run !== session) return;
  }
}

// straight to broken (or whole), for a restart
function setBroken(on) {
  bossEl.querySelectorAll('.boss-shard').forEach(s => s.remove());
  menuBtns.forEach(b => {
    gsap.killTweensOf(b);
    gsap.set(b, { clearProps: 'all' });
    b.classList.toggle('broken', on);
    b.disabled = on;
  });
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
// free: he's answering an item. He still attacks, one of this phase's at random,
// but it doesn't count towards wearing him out
async function enemyTurn(free = false) {
  const run = session;
  if (!fight.open) return;
  free = free && !!LINES[fight.stage].item;
  fight.turn++;
  if (!free) fight.turnsInStage++;
  fight.phase = 'enemy';
  onKey = null;
  ++typeToken;
  boxText.textContent = '';
  // after phase 3 he has nothing left to throw
  if (fight.exhausted) {
    await type('* SEIN is too tired to attack.');
    if (run === session) showMenu();
    return;
  }
  const lines = LINES[fight.stage];
  await speech(free ? pick(lines.item) : fight.tired ? lines.tired : lines.turns[(fight.turnsInStage - 1) % lines.turns.length]);
  if (run !== session) return;

  const list = STAGE_ATTACKS[fight.stage];
  const survived = await runAttack(free ? pick(list.filter(a => typeof a === 'string')) : list[(fight.turnsInStage - 1) % list.length]);
  if (run !== session) return;
  if (!survived) return gameOver();
  if (fight.turnsInStage >= TIRED_AFTER[fight.stage]) fight.tired = true;
  showMenu();
}

// phase 3: no menu between attacks. It's all one attack: each pattern flows straight into the
// next while the box reshapes around you, he talks over it, and every few you're healed.
// Then his last attack, still without letting up
async function gauntlet() {
  const run = session;
  onKey = null;
  const lines = LINES[3], list = [...STAGE_ATTACKS[3]], turns = [...lines.turns];
  // chaos mode: one more, after 'noose'
  if (fight.hard) {
    const at = list.indexOf('noose') + 1;
    list.splice(at, 0, 'frenzy');
    turns.splice(at, 0, lines.frenzy);
  }
  fight.phase = 'enemy';
  ++typeToken;
  boxText.textContent = '';
  const survived = await runAttack(null, async s => {
    G.flow = true;
    for (let i = 0; i < list.length; i++) {
      fight.turn++;
      fight.turnsInStage++;
      speech(turns[i % turns.length]);
      s.tear(0.25);
      await ATTACKS[list[i]](s);
      if (!G.running) return;
      if ((i + 1) % BREATHER_EVERY === 0) breather();
    }
    // the last attack cuts to black between its parts, so it keeps its full pauses
    G.flow = false;
    speeches(lines.final);
    await ATTACKS.final(s);
  });
  if (run !== session) return;
  if (!survived) return gameOver();
  fight.exhausted = true;
  await mendButtons();
  if (run !== session) return;
  await type('* SEIN is out of breath.\n* Your buttons flicker back.');
  if (run !== session) return;
  showMenu();
}

// a heal in the middle of the attack; nothing stops for it
function breather() {
  const before = fight.php;
  fight.php = Math.min(MAX_HP, fight.php + BREATHER_HEAL);
  fight.kr = 0;
  updateStats();
  sfx.heal();
  popNumber(before === MAX_HP ? 'HP MAX' : `+${fight.php - before} HP`, false, true);
}

/* ---------- the bullet board: everything he throws at you ---------- */
// Coordinates are local to the inside of the white box; blasters and their beams can reach past it.
const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const G = { running: false, bullets: [], waits: [], t: 0, spb: 60 / FALLBACK_BPM, offset: 0, cursor: 0 };

// The attack clock: the song's own time while it plays, so every wait and every blaster lands on
// its beats; otherwise the wall clock with a steady stand-in beat.
function startClock() {
  if (songTime() !== null) Object.assign(G, { clock: () => songTime() ?? G.t, spb: music.spb, offset: music.offset });
  else Object.assign(G, { clock: () => performance.now() / 1000, spb: 60 / FALLBACK_BPM / (fight.hard ? HARD_RATE : 1), offset: 0 });
  G.t = G.cursor = G.clock();
}
// the first beat (or 1/sub of a beat) at or after t
function gridAfter(t, sub = 1) {
  const step = G.spb / sub;
  return G.offset + Math.ceil((t - G.offset) / step - 1e-3) * step;
}

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

function setBox(w, h, dur = 0.3, ease = 'steps(5)') {
  const maxW = stage.clientWidth - 8;
  return gsap.to(box, { width: Math.min(w, maxW) + 8, height: h + 8, duration: dur, ease });
}
function restoreBox() {
  return gsap.to(box, { width: stage.clientWidth, height: 150, x: 0, y: 0, duration: 0.3, ease: 'steps(5)', onComplete: () => gsap.set(box, { clearProps: 'width,height,transform' }) });
}
// how far the box can wander sideways from its spot and still be on the stage
const boxRoom = () => Math.min(110, Math.max(0, (stage.clientWidth - box.offsetWidth) / 2));

const rectHit = (cx, cy, w, h) => {
  const dx = Math.max(Math.abs(G.heart.x - cx) - w / 2, 0);
  const dy = Math.max(Math.abs(G.heart.y - cy) - h / 2, 0);
  return dx * dx + dy * dy < HIT_R * HIT_R;
};
const COLORS = { white: '#fff', blue: '#14b4ff', orange: '#ff9a1f', yellow: '#ffff00', ghost: '#ff2a55' };

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

// a row of bones shooting up from one wall after a warning flash; they rise on a beat
function spikes({ side = 'down', height = 22, rise = gridAfter(G.t + 0.5), stay = 0.45 }) {
  const born = G.t, warn = rise - born;
  G.bullets.push({
    age: 0, e: 0, rose: false,
    update() {
      this.age = G.t - born;
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

// a blaster: slides in, charges, fires a beam across the screen at `fireAt` (on a beat), slides back out.
// turn: the beam swings round that many degrees while it fires, over `hold` seconds, and a faint fan
// shows where it'll sweep while it charges. Blue and orange beams work like the bones
function blaster({ x, y, angle, fireAt = G.t + 0.83, size = 1, turn = 0, hold = 0.5, color = 'white' }) {
  let rad, dx, dy;
  const aim = a => { rad = a * Math.PI / 180; dx = Math.cos(rad); dy = Math.sin(rad); };
  aim(angle);
  const swing = gsap.parseEase('sine.inOut');
  const born = G.t, fire = Math.max(0.3, fireAt - born);
  const enter = Math.min(0.28, fire * 0.4), charge = fire - enter, end = fire + hold;
  G.bullets.push({
    clip: false, kr: 2, age: 0, beam: 0, mouth: 0, back: 1, charged: false, fired: false,
    update() {
      const t = (this.age = G.t - born);
      this.back = t < enter ? 1 - gsap.parseEase('power2.out')(t / enter) : t > end ? (t - end) * 2.5 : 0;
      this.mouth = t < enter ? 0 : Math.min(1, (t - enter) / charge);
      // full strength for as long as it sweeps, then it fades
      const k = t - fire - 0.07 - (hold - 0.5);
      this.beam = t < fire ? 0 : t < fire + 0.07 ? (t - fire) / 0.07 : k <= 0 ? 1 : Math.max(0, 1 - k / 0.7);
      if (turn) aim(angle + turn * swing(clamp(0, 1, (t - fire) / hold)));
      if (t >= enter && !this.charged) { this.charged = true; sfx.charge(charge); }
      if (t >= fire && !this.fired) { this.fired = true; sfx.blast(); shake(3 + size * 2); }
      if (t > end + 0.45) this.dead = true;
    },
    mouthPos() {
      const off = -this.back * 90 * Math.max(1, size);
      return [x + dx * (off + 26 * size), y + dy * (off + 26 * size)];
    },
    hurts() {
      if (this.beam < 0.25) return false;
      if (color === 'blue' && !G.moved) return false;
      if (color === 'orange' && G.moved) return false;
      const [ox, oy] = this.mouthPos();
      const hx = G.heart.x - ox, hy = G.heart.y - oy;
      if (hx * dx + hy * dy < 0) return false;
      return Math.abs(hx * dy - hy * dx) < (26 * size * this.beam) / 2 + HIT_R - 1;
    },
    draw(c) {
      const off = -this.back * 90 * Math.max(1, size);
      const cx = x + dx * off, cy = y + dy * off;
      if (turn && this.age < fire) {
        const [ox, oy] = this.mouthPos();
        c.save();
        c.beginPath();
        c.rect(0, 0, G.box.w, G.box.h);
        c.clip();
        c.globalAlpha = Math.floor(this.age * 10) % 2 ? 0.24 : 0.12;
        c.fillStyle = COLORS[color];
        c.beginPath();
        c.moveTo(ox, oy);
        c.arc(ox, oy, 2400, rad, (angle + turn) * Math.PI / 180, turn < 0);
        c.closePath();
        c.fill();
        c.restore();
      }
      c.save();
      c.globalAlpha = this.age > end ? Math.max(0, 1 - (this.age - end) * 2.2) : 1;
      if (this.beam > 0) {
        const [ox, oy] = this.mouthPos();
        const bw = 26 * size * this.beam;
        c.save();
        c.translate(ox, oy);
        c.rotate(rad);
        c.fillStyle = COLORS[color];
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

// a hit test for a rectangle turned by `a` radians
function rotHit(cx, cy, w, h, a) {
  const dx = G.heart.x - cx, dy = G.heart.y - cy, cos = Math.cos(a), sin = Math.sin(a);
  const lx = Math.max(Math.abs(dx * cos + dy * sin) - w / 2, 0);
  const ly = Math.max(Math.abs(dy * cos - dx * sin) - h / 2, 0);
  return lx * lx + ly * ly < HIT_R * HIT_R;
}
function drawTurned(c, x, y, a, b) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  drawBone(c, b);
  c.restore();
}

// a bone at any angle, flying along
function rotBone({ x, y, len, thick = 8, vx = 0, vy = 0, angle = Math.atan2(vy, vx), color = 'white' }) {
  G.bullets.push({
    x, y, color,
    update(dt) {
      this.x += vx * dt;
      this.y += vy * dt;
      if (this.x < -140 || this.x > G.box.w + 140 || this.y < -140 || this.y > G.box.h + 140) this.dead = true;
    },
    hurts() {
      if (color === 'blue' && !G.moved) return false;
      if (color === 'orange' && G.moved) return false;
      return rotHit(this.x, this.y, len, thick, angle);
    },
    draw(c) { drawTurned(c, this.x, this.y, angle, { x: 0, y: 0, w: len, h: thick, color }); },
  });
}

// n bones on a ring around the box, all thrown at where the heart (or `at`) is now, landing `beats` later
function boneRing(n, beats, turn = 0, at = G.heart) {
  const { w, h } = G.box, r = Math.max(w, h) / 2 + 24, T = beats * G.spb;
  const tx = at.x, ty = at.y;
  for (let k = 0; k < n; k++) {
    const a = turn + k * Math.PI * 2 / n, x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
    rotBone({ x, y, len: 18, thick: 7, vx: (tx - x) / T, vy: (ty - y) / T });
  }
  sfx.bone();
}

// long bones crossed in the middle of the box that snap round `step` degrees on every beat;
// they flash yellow the beat before they change direction
function spinner({ arms = 2, step = 30, beats = 16, warn = 2, dir = () => 1 }) {
  const born = G.t, ease = gsap.parseEase('power3.out');
  let angle = rand(0, 90), from = angle, to = angle, stepAt = born, lastB = 0;
  G.bullets.push({
    update() {
      const b = Math.floor((G.t - born) / G.spb + 0.02);
      if (b !== lastB && b > warn) {
        lastB = b;
        from = angle;
        to = angle + dir(b) * step;
        stepAt = G.t;
        sfx.bone();
      }
      angle = from + (to - from) * ease(Math.min(1, (G.t - stepAt) / (G.spb * 0.35)));
      this.armed = b >= warn;
      this.turning = b >= warn && dir(b + 1) !== dir(b);
      if (b >= warn + beats) this.dead = true;
    },
    arm(i) { return (angle + i * 180 / arms) * Math.PI / 180; },
    hurts() {
      if (!this.armed) return false;
      const { w, h } = G.box, len = Math.hypot(w, h) + 20;
      for (let i = 0; i < arms; i++) if (rotHit(w / 2, h / 2, len, 10, this.arm(i))) return true;
      return false;
    },
    draw(c) {
      const { w, h } = G.box, len = Math.hypot(w, h) + 20;
      c.save();
      c.globalAlpha = this.armed ? 1 : 0.25 + (Math.floor(G.t * 8) % 2) * 0.25;
      const color = this.turning && Math.floor(G.t * 10) % 2 ? 'yellow' : 'white';
      for (let i = 0; i < arms; i++) drawTurned(c, w / 2, h / 2, this.arm(i), { x: 0, y: 0, w: len, h: 10, color });
      c.restore();
    },
  });
}

// a ring of bones closing in on where the heart is, collapsing `beats` after it appears.
// There's one way out, on the side with the most room, and it slowly turns.
function closingRing({ n = 16, gap = 3, r0 = 80, beats = 3, spin = 1 }) {
  const { w, h } = G.box, cx = G.heart.x, cy = G.heart.y, born = G.t, T = beats * G.spb;
  const toMiddle = Math.hypot(w / 2 - cx, h / 2 - cy) > 10 ? Math.atan2(h / 2 - cy, w / 2 - cx) : rand(0, Math.PI * 2);
  const step = Math.PI * 2 / n;
  // the gap's first bone slot, so the gap is centred on the way to the middle
  const turn0 = toMiddle + rand(-0.5, 0.5) - (gap - 1) * step / 2;
  let r = r0, turn = turn0;
  sfx.bone();
  G.bullets.push({
    update() {
      const p = (G.t - born) / T;
      r = r0 * (1 - p);
      turn = turn0 + spin * p * Math.PI * 0.35;
      if (p >= 1) this.dead = true;
    },
    // each bone lies along the ring and is as long as the space it has, so only the gap is open
    each(fn) {
      const len = Math.max(8, r * step * 1.08);
      for (let k = gap; k < n; k++) {
        const a = turn + k * step;
        if (fn(cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI / 2, len)) return true;
      }
      return false;
    },
    hurts() { return this.each((x, y, a, len) => rotHit(x, y, len, 7, a)); },
    draw(c) { this.each((x, y, a, len) => { drawTurned(c, x, y, a, { x: 0, y: 0, w: len, h: 7, color: 'white' }); }); },
  });
}

// a glitching bone: it doesn't slide, it skips a step every `every` seconds,
// and a red ghost shows where it lands next
function stutter({ x, y, w, h, dx = 0, dy = 0, every }) {
  const born = G.t;
  G.bullets.push({
    x, y, w, h, color: 'white', k: 0,
    update() {
      const k = Math.floor((G.t - born) / every);
      if (k !== this.k) {
        this.k = k;
        this.x = x + dx * k;
        this.y = y + dy * k;
        sfx.bone();
      }
      if (this.x < -90 || this.x > G.box.w + 90 || this.y < -90 || this.y > G.box.h + 90) this.dead = true;
    },
    hurts() { return rectHit(this.x, this.y, this.w, this.h); },
    draw(c) {
      c.save();
      c.globalAlpha = 0.4;
      drawBone(c, { x: this.x + dx, y: this.y + dy, w, h, color: 'ghost' });
      c.restore();
      drawBone(c, this);
    },
  });
}

// a bone that steers after the heart for a moment (yellow while it does), then flies straight on
function homing({ x, y, speed = 85, seek = 1.3, len = 16 }) {
  const born = G.t;
  let a = Math.atan2(G.heart.y - y, G.heart.x - x);
  G.bullets.push({
    x, y,
    update(dt) {
      if (G.t - born < seek) {
        const d = Math.atan2(G.heart.y - this.y, G.heart.x - this.x) - a;
        a += clamp(-2.2 * dt, 2.2 * dt, Math.atan2(Math.sin(d), Math.cos(d)));
      }
      this.x += Math.cos(a) * speed * dt;
      this.y += Math.sin(a) * speed * dt;
      if (G.t - born > 8 || this.x < -140 || this.x > G.box.w + 140 || this.y < -140 || this.y > G.box.h + 140) this.dead = true;
    },
    hurts() { return rotHit(this.x, this.y, len, 7, a); },
    draw(c) { drawTurned(c, this.x, this.y, a, { x: 0, y: 0, w: len, h: 7, color: G.t - born < seek ? 'yellow' : 'white' }); },
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
  const born = G.t, WARN = gridAfter(born + 0.5) - born, HOT = 0.35; // it goes off on a beat
  G.bullets.push({
    age: 0,
    update() { if ((this.age = G.t - born) > WARN + HOT) this.dead = true; },
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
// Time in a script is counted in beats of the phase's track: sync() lines up with the next beat,
// beat(n) waits n beats on from there, and at(n) is the moment n beats on, for things that
// have to land on it (a blaster fires at at(2), two beats after it appears).
const api = {
  get spb() { return G.spb; },
  // chaos mode: the attacks below throw more at you
  get hard() { return fight.hard; },
  until: t => new Promise(r => G.waits.push({ at: t, r })),
  wait: s => api.until(G.t + s),
  // after a cut, the screen comes back on this beat, with the next attack already set up
  async sync(sub = 1) {
    const lifting = G.cutting;
    G.cursor = gridAfter(G.t + (lifting ? 0.3 : 0), sub);
    await api.until(G.cursor);
    if (lifting) uncut();
  },
  beat(n = 1) {
    G.cursor += n * G.spb;
    // fell behind (a slow frame, a tab switch)? catch up on the next half beat
    if (G.cursor < G.t - 0.05) G.cursor = gridAfter(G.t, 2);
    return api.until(G.cursor);
  },
  at: n => G.cursor + n * G.spb,
  // the wait at the end of an attack, for its last bullets to clear; when attacks flow
  // into each other (phase 3) the next one starts over them instead
  tail: n => api.beat(G.flow ? Math.min(n, 1) : n),
  // in the dark the box just snaps to its new size, and the heart to its middle;
  // when attacks flow into each other it glides to it
  box(w, h) {
    if (!G.cutting) return G.flow ? setBox(w, h, 0.5, 'power2.inOut') : setBox(w, h);
    gsap.killTweensOf(box, 'width,height');
    gsap.set(box, { width: Math.min(w, stage.clientWidth - 8) + 8, height: h + 8 });
    G.box.w = box.clientWidth;
    G.box.h = box.clientHeight;
    Object.assign(G.heart, { x: G.box.w / 2, y: G.box.h / 2, v: 0, grounded: false });
    return Promise.resolve();
  },
  // Sans-style: the screen snaps to black and everything on it is gone; the next attack's
  // box() and sync() set it up in the dark and bring it back
  cut() {
    G.cutting = true;
    gsap.set(cutEl, { opacity: 1 });
    sfx.cut();
    G.bullets = [];
    G.mirror = null;
    gsap.killTweensOf(box, 'x,y');
    gsap.set(box, { x: 0, y: 0 });
    G.bx = G.by = 0;
    if (G.flipped) {
      G.flipped = false;
      G.angle = 0;
      gsap.killTweensOf(world, 'rotation');
      gsap.set(world, { rotation: 0 });
    }
    api.soul('red');
  },
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
  // a bone standing on the floor/ceiling (or the full height) sliding across,
  // reaching the middle of the box `beats` after it appears
  floorBone({ from = 'left', edge = 'bottom', height = 30, beats = 2, color = 'white', thick = 10 }) {
    const { w, h } = G.box;
    const len = edge === 'full' ? h : height, speed = (w / 2 + thick) / (beats * G.spb);
    bone({
      x: from === 'left' ? -thick : w + thick,
      y: edge === 'bottom' ? h - len / 2 : edge === 'top' ? len / 2 : h / 2,
      w: thick, h: len, vx: (from === 'left' ? 1 : -1) * speed, color,
    });
  },
  // a wall of bones with one gap to slip through (gap: 0 = top, 1 = bottom)
  gapWall({ from = 'right', gap = 0.5, size = 40, beats = 2, color = 'white', thick = 10 }) {
    const { w, h } = G.box;
    const x = from === 'left' ? -thick : w + thick, vx = (from === 'left' ? 1 : -1) * (w / 2 + thick) / (beats * G.spb);
    const c = clamp(size / 2 + 4, h - size / 2 - 4, gap * h);
    const top = c - size / 2, bottom = h - (c + size / 2);
    if (top > 0) bone({ x, y: top / 2, w: thick, h: top, vx, color });
    if (bottom > 0) bone({ x, y: h - bottom / 2, w: thick, h: bottom, vx, color });
  },
  spikes,
  boneRing,
  spinner,
  closingRing,
  // from a point on a ring around the box, aimed at the heart (or `at`, like the other soul)
  aimedBlaster(size = 1, fireAt, at = G.heart) {
    const { w, h } = G.box;
    const a = rand(0, Math.PI * 2), r = Math.max(w, h) / 2 + 60;
    const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
    blaster({ x, y, angle: Math.atan2(at.y - y, at.x - x) * 180 / Math.PI, size, fireAt });
  },
  // a blaster over a top corner whose beam swings down across the box from `from` to `to`
  // degrees (0 runs along the top, 90 straight down its own wall) over `beats`
  wiper(side, fireAt, beats = 2, { from = 5, to = 45, color = 'white', size = 0.7 } = {}) {
    const { w } = G.box, left = side === 'left';
    blaster({
      x: left ? -30 : w + 30, y: -30, angle: left ? from : 180 - from,
      turn: left ? to - from : from - to, hold: beats * G.spb, fireAt, size, color,
    });
  },
  // a homing bone from a random point on the edge of the box
  homing(opts) {
    const { w, h } = G.box, side = Math.floor(rand(0, 4));
    const [x, y] = side === 0 ? [rand(0, w), -10] : side === 1 ? [w + 10, rand(0, h)] : side === 2 ? [rand(0, w), h + 10] : [-10, rand(0, h)];
    homing({ x, y, ...opts });
  },
  // a wall of stuttering bones with one gap, from the left, the right or the top,
  // crossing the box in `beats` a half beat's step at a time
  stutterWall({ from = 'right', gap = 0.5, size = 44, beats = 3, thick = 10 }) {
    const { w, h } = G.box, drops = from === 'top';
    const span = drops ? w : h, steps = beats * 2;
    const c = clamp(size / 2 + 4, span - size / 2 - 4, gap * span);
    const lo = c - size / 2, hi = span - (c + size / 2);
    const start = from === 'right' ? w + thick : -thick;
    const step = ((drops ? h : w) + 2 * thick) / steps * (from === 'right' ? -1 : 1);
    const piece = (at, len) => (drops
      ? stutter({ x: at, y: start, w: len, h: thick, dy: step, every: G.spb / 2 })
      : stutter({ x: start, y: at, w: thick, h: len, dx: step, every: G.spb / 2 }));
    if (lo > 0) piece(lo / 2, lo);
    if (hi > 0) piece(span - hi / 2, hi);
  },
  // two souls: a second heart mirrors yours across the middle of the box ('x'), or mirrors it
  // upside down too ('xy'). Both have to get through; null goes back to one
  mirror(kind) {
    G.mirror = kind || null;
    if (kind && G.heart.x > G.box.w / 2 - 12) G.heart.x = G.box.w / 4;
    sfx.glitch();
    api.tear(0.25);
  },
  twin: () => twinOf(G.heart),
  // a row of bones falling down each half of a mirrored box, each with a gap. The right gap is
  // the left one's mirror image nudged by `shift`, so only part of it is safe for both souls
  mirrorRow({ at = 0.5, size = 46, shift = 0, beats = 2.5 }) {
    const { w, h } = G.box, half = w / 2 - 3, vy = (h + 16) / (beats * G.spb);
    const row = (a, b) => { if (b - a > 1) bone({ x: (a + b) / 2, y: -8, w: b - a, h: 8, vy }); };
    const fit = c => clamp(size / 2 + 2, half - size / 2 - 2, c);
    const cl = fit(at * half), cr = w - fit(cl + shift);
    row(0, cl - size / 2);
    row(cl + size / 2, half);
    row(w - half, cr - size / 2);
    row(cr + size / 2, w);
    sfx.bone();
  },
  // from the ring at `deg`, firing straight through the middle of the box
  ringBlaster(deg, fireAt, size = 0.8) {
    const { w, h } = G.box;
    const a = deg * Math.PI / 180, r = Math.max(w, h) / 2 + 60;
    blaster({ x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, angle: deg + 180, fireAt, size });
  },
  // a row of blasters along one side with one lane left open
  blasterRow(side = 'top', lanes = 5, open = 0, fireAt) {
    const { w, h } = G.box;
    for (let i = 0; i < lanes; i++) {
      if (i === open) continue;
      const f = (i + 0.5) / lanes;
      if (side === 'top') blaster({ x: w * f, y: -55, angle: 90, size: 0.75, fireAt });
      else blaster({ x: -55, y: h * f, angle: 0, size: 0.75, fireAt });
    }
  },
  cross(fireAt, size = 1) {
    const { w, h } = G.box;
    blaster({ x: -60, y: h / 2, angle: 0, fireAt, size });
    blaster({ x: w + 60, y: h / 2, angle: 180, fireAt, size });
    blaster({ x: w / 2, y: -60, angle: 90, fireAt, size });
    blaster({ x: w / 2, y: h + 60, angle: 270, fireAt, size });
  },
  // one huge blaster over the top of the box whose beam covers a whole half of it
  half(side, fireAt) {
    const { w } = G.box, size = w / 2 / 26 + 0.08;
    blaster({ x: side === 'left' ? w / 4 : w * 3 / 4, y: -20 - 26 * size, angle: 90, fireAt, size });
  },
  // something new every `every` beats, for `beats` beats, starting on the current beat
  async rain(kind, beats, every) {
    const end = G.cursor + beats * G.spb;
    for (let t = G.cursor; t < end - 1e-3; t += every * G.spb) {
      await api.until(t);
      if (!G.running) return;
      if (kind === 'pencils') pencil();
      else if (kind === 'code') glyph();
      else band();
    }
  },
  async tools(n, beats) {
    for (let i = 0; i < n; i++) tile(TOOL_TAGS[i % TOOL_TAGS.length], G.t + beats * G.spb);
    await api.wait(beats * G.spb);
  },
  // the screen turns round the box to some new angle (or back upright); snap: it jumps there,
  // glitching. Only the view turns: the keys still move the heart the way they did
  flip(on, snap = false) {
    if (on && !G.flipped) {
      const o = worldOffset(box);
      gsap.set(world, { transformOrigin: `${o.x + G.bx + box.offsetWidth / 2}px ${o.y + G.by + box.offsetHeight / 2}px` });
    }
    G.flipped = on;
    G.angle = on ? pick(FLIP_ANGLES.filter(a => a !== G.angle)) : 0;
    sfx.glitch();
    if (snap) {
      gsap.killTweensOf(world, 'rotation');
      gsap.set(world, { rotation: G.angle });
      api.tear(0.2);
      return Promise.resolve();
    }
    return gsap.to(world, { rotation: G.angle, duration: 0.45, ease: 'power2.inOut' });
  },
  // the box itself moves. The heart stays where it is on screen, so the walls shove it along
  moveBox(x, y, dur = 0.4) {
    const room = boxRoom();
    return gsap.to(box, { x: clamp(-room, room, x), y: clamp(-40, 12, y), duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
  },
  // the box glides somewhere new every `every` beats, for `beats` beats
  async wander(beats, every = 2) {
    const end = G.cursor + beats * G.spb;
    for (let t = G.cursor + every * G.spb; t < end - 1e-3; t += every * G.spb) {
      await api.until(t);
      if (!G.running) return;
      const room = boxRoom();
      api.moveBox(rand(-room, room), rand(-40, 12), Math.min(0.6, every * G.spb * 0.5));
    }
  },
  // the box blinks out and turns up somewhere close by, torn
  jump() {
    const room = Math.min(60, boxRoom());
    gsap.killTweensOf(box, 'x,y');
    gsap.set(box, { x: rand(-room, room), y: rand(-24, 10) });
    api.tear(0.2);
    sfx.glitch();
  },
  // the bullet board tears for a moment
  tear(sec) { G.tearUntil = Math.max(G.tearUntil, performance.now() + sec * 1000); },
  shake,
  glitch(times = 1) {
    glitch(times);
    api.tear(0.3 * times);
  },
};

/* ---------- his attacks, in order per phase, all on the beat of the phase's track ---------- */
const ATTACKS = {
  // phase 1: the classics
  async slide(s) {
    await s.box(260, 130);
    s.soul('blue', 'down');
    await s.sync();
    for (let i = 0; i < 8; i++) {
      s.floorBone({ from: i % 2 ? 'right' : 'left', height: rand(18, 40), beats: 2 });
      if (s.hard && i % 4 === 3) s.aimedBlaster(0.6, s.at(2));
      await s.beat(1);
    }
    const last = s.hard ? ['blue', 'orange', 'blue'] : ['blue', 'blue'];
    for (let i = 0; i < last.length; i++) {
      s.floorBone({ from: i % 2 ? 'right' : 'left', edge: 'full', color: last[i], beats: 2 });
      await s.beat(s.hard ? 1.5 : 2);
    }
    await s.beat(3);
  },
  async blasters(s) {
    await s.box(150, 150);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 4; i++) {
      s.aimedBlaster(1, s.at(2));
      if (i) s.aimedBlaster(1, s.at(2));
      if (s.hard && i > 1) s.aimedBlaster(0.8, s.at(2));
      await s.beat(2);
    }
    s.cross(s.at(2));
    if (s.hard) {
      await s.beat(2);
      for (let k = 0; k < 4; k++) s.ringBlaster(45 + k * 90, s.at(2), 0.8);
    }
    await s.beat(4);
  },
  // bones thrown in from every side at once, all landing where you were, on the beat
  async burst(s) {
    await s.box(170, 150);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 12; i++) {
      s.boneRing((i % 2 ? 5 : 4) + (s.hard ? 2 : 0), 2, i * 0.4);
      if (s.hard ? i % 2 : i % 4 === 3) s.aimedBlaster(0.8, s.at(2));
      await s.beat(1);
    }
    await s.beat(3);
  },
  async gaps(s) {
    await s.box(220, 150);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 10; i++) {
      s.gapWall({ from: 'right', gap: 0.5 + Math.sin(i * 0.9) * 0.3, size: s.hard ? 40 : 44, beats: 2 });
      if (s.hard && i % 3 === 2) s.floorBone({ from: 'left', edge: 'full', color: 'blue', beats: 2 });
      await s.beat(1);
    }
    await s.beat(4);
  },
  async slams(s) {
    await s.box(150, 150);
    await s.sync();
    const dirs = s.hard ? ['down', 'left', 'up', 'right', 'down', 'up'] : ['down', 'left', 'up', 'right'];
    for (const dir of dirs) {
      s.slam(dir);
      s.spikes({ side: dir, height: 20, rise: s.at(s.hard ? 1.5 : 2), stay: s.spb * 0.8 });
      await s.beat(s.hard ? 2.5 : 3);
    }
    s.soul('red');
    await s.beat(1);
  },
  // bones from both walls, along the floor, and now and then one hanging from the ceiling
  async pincer(s) {
    await s.box(240, 140);
    s.soul('blue', 'down');
    await s.sync();
    for (let i = 0; i < 10; i++) {
      s.floorBone({ from: i % 2 ? 'left' : 'right', height: 22 + (i % 3) * 8, beats: 2 });
      if (s.hard ? i % 2 : i % 4 === 1) s.floorBone({ from: 'left', edge: 'top', height: 44, beats: 2 });
      await s.beat(1);
    }
    s.soul('red');
    await s.beat(4);
  },
  // the old doodles: pencils falling and code flying across, all on the beat
  async doodles(s) {
    await s.box(200, 150);
    s.soul('red');
    await s.sync();
    const rain = Promise.all([s.rain('pencils', 16, 0.5), s.rain('code', 16, s.hard ? 0.5 : 1)]);
    for (let i = 0; i < 3; i++) {
      await s.beat(4);
      s.aimedBlaster(0.7, s.at(2));
      if (s.hard) s.aimedBlaster(0.7, s.at(2));
    }
    await rain;
    await s.wait(1);
  },

  // phase 2: blue and orange, the screen turns over
  async flipRain(s) {
    await s.box(170, 150);
    s.soul('red');
    await s.sync();
    const rain = Promise.all([s.rain('code', 14, 0.5), s.hard && s.rain('pencils', 14, 0.5)]);
    await s.beat(3);
    s.flip(true);
    await s.beat(1);
    s.aimedBlaster(1, s.at(2));
    await s.beat(3);
    s.aimedBlaster(1, s.at(2));
    s.aimedBlaster(1, s.at(2));
    s.flip(true);
    await s.beat(4);
    s.flip(false);
    await rain;
    await s.beat(2);
  },
  // a cross of bones that snaps round on every beat: stay a step ahead of it
  async spinner(s) {
    await s.box(170, 170);
    s.soul('red');
    await s.sync();
    if (s.hard) s.spinner({ arms: 3, step: 24, beats: 16, dir: b => (Math.floor(b / 5) % 2 ? -1 : 1) });
    else s.spinner({ arms: 2, step: 30, beats: 16, dir: b => (b < 11 ? 1 : -1) });
    await s.beat(6);
    for (let i = 0; i < 4; i++) {
      s.aimedBlaster(0.6, s.at(2));
      await s.beat(3);
    }
    await s.beat(1);
  },
  async colors(s) {
    await s.box(260, 120);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 10; i++) {
      s.floorBone({ from: i % 2 ? 'right' : 'left', edge: 'full', color: i % 2 ? 'orange' : 'blue', beats: 2.5 });
      if (i % 3 === 2) s.floorBone({ from: 'left', height: 24, beats: 1.5 });
      if (s.hard && i % 3 === 0) s.floorBone({ from: 'right', edge: 'top', height: 24, beats: 1.5 });
      await s.beat(1);
    }
    await s.beat(5);
  },
  // a winding tunnel of bones, a wall every half beat
  async snake(s) {
    await s.box(240, 150);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 24; i++) {
      s.gapWall({ from: 'right', gap: 0.5 + Math.sin(i * (s.hard ? 0.55 : 0.45)) * 0.32, size: s.hard ? 46 : 52, beats: 3, thick: 8 });
      await s.beat(0.5);
    }
    await s.beat(6);
  },
  async ring(s) {
    await s.box(150, 150);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < (s.hard ? 14 : 10); i++) {
      s.ringBlaster(i * 36 + 10, s.at(1.5));
      await s.beat(0.5);
    }
    await s.beat(1);
    s.blasterRow('top', 5, Math.floor(rand(0, 5)), s.at(2));
    if (s.hard) s.blasterRow('left', 5, Math.floor(rand(0, 5)), s.at(2));
    await s.beat(4);
  },
  async gravity(s) {
    await s.box(170, 170);
    await s.sync();
    const dirs = s.hard ? ['down', 'right', 'up', 'left', 'down', 'up'] : ['down', 'right', 'up', 'left', 'down'];
    const tools = s.tools(s.hard ? 3 : 2, dirs.length * 3);
    for (const dir of dirs) {
      s.slam(dir);
      s.spikes({ side: dir, height: 20, rise: s.at(2), stay: s.spb * 0.7 });
      await s.beat(3);
    }
    s.soul('red');
    await tools;
  },
  // walls from both sides at once with their gaps out of line, every third one blue or orange,
  // and a row of blasters over the top every bar
  async crossfire(s) {
    await s.box(240, 150);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 12; i++) {
      const from = i % 2 ? 'left' : 'right';
      if (i % 3 === 2) s.floorBone({ from, edge: 'full', color: i % 2 ? 'blue' : 'orange', beats: 2 });
      else s.gapWall({ from, gap: 0.5 + Math.sin(i * 1.7) * 0.32, size: 46, beats: 2 });
      if (i % 4 === 3) s.blasterRow('top', 5, Math.floor(rand(0, 5)), s.at(2));
      if (s.hard && i % 4 === 1) s.aimedBlaster(0.5, s.at(2));
      await s.beat(1);
    }
    await s.beat(4);
  },

  // two souls, one the mirror image of the other: falling rows whose gaps don't quite line up,
  // and blue bones sweeping through both halves
  async mirror(s) {
    await s.box(280, 150);
    s.soul('red');
    s.mirror('x');
    await s.sync();
    for (let i = 0; i < (s.hard ? 14 : 12); i++) {
      s.mirrorRow({ at: 0.5 + Math.sin(i * 0.8) * 0.3, shift: Math.sin(i * 1.9) * (s.hard ? 16 : 12), size: s.hard ? 42 : 48 });
      if (i % 4 === 3) s.floorBone({ from: i % 8 === 3 ? 'left' : 'right', edge: 'full', color: 'blue', beats: 2 });
      if (s.hard && i % 4 === 1) s.aimedBlaster(0.5, s.at(2), s.twin());
      await s.beat(1);
    }
    await s.beat(3);
    s.mirror(null);
    await s.tail(1);
  },
  // blasters over the top corners whose beams swing down across the box; a faint fan shows
  // where each will go. The last one covers everything, but it's blue
  async sweep(s) {
    await s.box(220, 150);
    s.soul('red');
    await s.sync();
    const n = s.hard ? 5 : 4;
    const rain = s.rain('code', n * 4, s.hard ? 1 : 2);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 'right' : 'left';
      if (i === n - 1) s.wiper(side, s.at(2), 2.5, { to: 88, color: 'blue' });
      else s.wiper(side, s.at(2), 2, { to: rand(32, 48) });
      if (s.hard && i % 2 && i < n - 1) s.wiper(side === 'left' ? 'right' : 'left', s.at(2.5), 1, { to: 24, color: 'orange' });
      await s.beat(4);
    }
    await rain;
    await s.tail(2);
  },
  // bones that chase you for a moment before flying straight on, and a cross of blasters every bar
  async hunt(s) {
    await s.box(190, 170);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 14; i++) {
      s.homing();
      if (s.hard || i % 2) s.homing();
      if (i % 4 === 3) s.cross(s.at(2), 0.6);
      await s.beat(1);
    }
    await s.tail(4);
  },

  // phase 3: it isn't only him anymore
  async arrays(s) {
    await s.box(180, 150);
    s.soul('red');
    s.glitch();
    await s.sync();
    for (let i = 0; i < (s.hard ? 8 : 6); i++) {
      s.blasterRow(i % 2 ? 'left' : 'top', 5, Math.floor(rand(0, 5)), s.at(2));
      await s.beat(s.hard ? 1.5 : 2);
    }
    await s.tail(3);
  },
  // a blaster on every beat, aimed where you are, and a cross on every bar
  async chase(s) {
    await s.box(160, 160);
    s.soul('red');
    s.glitch();
    await s.sync();
    s.wander(16, 4);
    for (let i = 0; i < 16; i++) {
      s.aimedBlaster(0.7, s.at(1.5));
      if (s.hard && i % 2) s.aimedBlaster(0.5, s.at(1.5));
      if (i % 4 === 3) s.cross(s.at(2), 0.6);
      if (i === 7 || i === 12) s.flip(true);
      await s.beat(1);
    }
    s.flip(false);
    s.moveBox(0, 0);
    await s.tail(3);
  },
  async tunnel(s) {
    await s.box(260, 140);
    s.soul('blue', 'down');
    await s.sync();
    const extra = s.hard ? 6 : 0;
    for (let i = 0; i < 14; i++) {
      s.floorBone({ from: 'right', edge: 'bottom', height: 14 + extra + Math.abs(Math.sin(i * 0.8)) * 28, beats: 2 });
      s.floorBone({ from: 'right', edge: 'top', height: 12 + extra + Math.abs(Math.cos(i * 0.8)) * 22, beats: 2 });
      await s.beat(1);
      if (s.hard ? i % 4 === 3 : i % 5 === 4) s.flip(true);
    }
    await s.tail(4);
    s.flip(false);
    s.soul('red');
  },
  // rows and columns fire together; one square is left, and it moves
  async grid(s) {
    await s.box(180, 180);
    s.soul('red');
    await s.sync();
    let col = 2, row = 2;
    const gap = s.hard ? 2.5 : 3;
    for (let i = 0; i < (s.hard ? 7 : 5); i++) {
      col = clamp(0, 4, col + pick([-2, -1, 1, 2]));
      row = clamp(0, 4, row + pick([-2, -1, 1, 2]));
      s.blasterRow('top', 5, col, s.at(gap));
      s.blasterRow('left', 5, row, s.at(gap));
      await s.beat(gap);
    }
    await s.tail(3);
  },
  async storm(s) {
    await s.box(170, 150);
    s.soul('red');
    s.glitch();
    await s.sync();
    const all = Promise.all([s.rain('pencils', 14, 0.5), s.rain('code', 14, 1), s.rain('bands', 14, s.hard ? 1.5 : 2)]);
    s.wander(14, 4);
    for (let i = 0; i < (s.hard ? 6 : 4); i++) {
      await s.beat(s.hard ? 2 : 3);
      s.aimedBlaster(0.8, s.at(2));
      if (i % 2) s.flip(true);
    }
    await all;
    s.flip(false);
    s.moveBox(0, 0);
    await s.wait(0.6);
  },
  async spiral(s) {
    await s.box(160, 160);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < (s.hard ? 24 : 16); i++) {
      s.ringBlaster(i * 47, s.at(1.5));
      if (s.hard && i % 4 === 3) s.ringBlaster(i * 47 + 90, s.at(1.5));
      await s.beat(0.5);
    }
    await s.tail(3);
  },
  // three long bones turning round the middle, reversing every four beats,
  // while bones are thrown at wherever you're standing
  async vortex(s) {
    await s.box(180, 180);
    s.soul('red');
    s.glitch();
    await s.sync();
    s.spinner({ arms: 3, step: 24, beats: 18, dir: b => (Math.floor(b / 4) % 2 ? -1 : 1) });
    await s.beat(3);
    for (let i = 0; i < 16; i++) {
      if (s.hard || i % 2 === 0) s.boneRing(3, 2, i * 0.5);
      if (i % 4 === 3) s.aimedBlaster(0.5, s.at(2));
      if (i === 8) s.flip(true);
      await s.beat(1);
    }
    s.flip(false);
    await s.tail(2);
  },
  // rings of bones close in on you, each with one way out; they come faster, and the floor lights up
  async noose(s) {
    await s.box(200, 170);
    s.soul('red');
    await s.sync();
    const rings = s.hard ? 8 : 6;
    const bands = s.rain('bands', s.hard ? 18 : 17, s.hard ? 2 : 4);
    for (let i = 0; i < rings; i++) {
      const beats = i < 3 ? (s.hard ? 2.5 : 3) : (s.hard ? 2 : 2.5);
      s.closingRing({ beats, spin: i % 2 ? 1 : -1 });
      await s.beat(beats);
    }
    await bands;
    await s.tail(2);
  },
  // gravity yanks a new way every bar, the wall it throws you at grows spikes,
  // and something is thrown at where you landed
  async quake(s) {
    await s.box(160, 160);
    await s.sync();
    let dir = 'down';
    for (let i = 0; i < (s.hard ? 9 : 7); i++) {
      dir = pick(Object.keys(DIRS).filter(d => d !== dir));
      s.slam(dir);
      s.spikes({ side: dir, height: 22, rise: s.at(1.5), stay: s.spb * 0.6 });
      await s.beat(1);
      if (s.hard || i % 2) s.aimedBlaster(0.6, s.at(1.5));
      if (s.hard || !(i % 2)) s.boneRing(4, 1.5, i);
      await s.beat(2);
    }
    s.soul('red');
    await s.tail(2);
  },
  // the box closes in a bar at a time while walls, blue and orange bones and blasters keep coming
  async squeeze(s) {
    const sizes = [[240, 170], [210, 150], [180, 135], [150, 120], [125, 110]];
    await s.box(...sizes[0]);
    s.soul('red');
    await s.sync();
    for (let i = 0; i < 20; i++) {
      if (i && i % 4 === 0) {
        s.box(...sizes[i / 4]);
        s.shake(4);
      }
      if (i % 3 === 2) s.floorBone({ from: i % 2 ? 'left' : 'right', edge: 'full', color: i % 6 === 2 ? 'blue' : 'orange', beats: 2 });
      else s.gapWall({ from: 'right', gap: 0.5 + Math.sin(i * 1.3) * 0.3, size: 42, beats: 2 });
      if (s.hard ? i % 2 === 0 : i % 4 === 2) s.aimedBlaster(0.5, s.at(2));
      await s.beat(1);
    }
    await s.tail(4);
  },
  // the box won't stay put: it glides somewhere new every other beat and its walls shove you,
  // bones are thrown at you from all round, and the screen keeps turning
  async drift(s) {
    await s.box(150, 150);
    s.soul('red');
    s.glitch();
    await s.sync();
    s.wander(16, 2);
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) s.boneRing(s.hard ? 6 : 5, 2, i * 0.3);
      if (i % 4 === 1) s.aimedBlaster(0.6, s.at(2));
      if (i % 4 === 3) s.flip(true);
      await s.beat(1);
    }
    s.flip(false);
    s.moveBox(0, 0);
    await s.tail(2);
  },
  // two souls again, the second one upside down on the other side, in a box that drifts;
  // bones and blasters come for one soul, then the other
  async echo(s) {
    await s.box(280, 150);
    s.soul('red');
    s.mirror('xy');
    s.glitch(2);
    await s.sync();
    s.wander(16, 4);
    for (let i = 0; i < 16; i++) {
      const target = i % 2 ? s.twin() : undefined;
      s.boneRing(s.hard ? 4 : 3, 2, i * 0.4, target);
      if (i % 4 === 2) s.aimedBlaster(0.6, s.at(2), i % 8 === 2 ? s.twin() : undefined);
      if (i === 7 || (s.hard && i === 12)) s.flip(true);
      await s.beat(1);
    }
    s.flip(false);
    s.moveBox(0, 0);
    await s.beat(2);
    s.mirror(null);
    await s.tail(1);
  },
  // it's glitching apart: walls that skip instead of slide, a box that blinks to somewhere else,
  // and a screen that snaps to a new angle
  async static(s) {
    await s.box(200, 160);
    s.soul('red');
    s.glitch(2);
    await s.sync();
    const sides = ['right', 'left', 'top'];
    for (let i = 0; i < (s.hard ? 16 : 14); i++) {
      if (i % 2 === 0) s.stutterWall({ from: sides[(i / 2) % 3], gap: rand(0.2, 0.8), size: s.hard ? 40 : 46, beats: 3 });
      else s.jump();
      if (i % 4 === 3) s.flip(true, true);
      if (s.hard && i % 4 === 1) s.aimedBlaster(0.5, s.at(2));
      await s.beat(1);
    }
    s.flip(false);
    s.moveBox(0, 0);
    await s.tail(3);
  },
  // chaos mode only: a cross that snaps round, code flying through it, and blasters on top
  async frenzy(s) {
    await s.box(190, 170);
    s.soul('red');
    s.glitch(2);
    await s.sync();
    s.spinner({ arms: 2, step: 30, beats: 16, dir: b => (Math.floor(b / 3) % 2 ? -1 : 1) });
    const rain = s.rain('code', 18, 1);
    await s.beat(4);
    for (let i = 0; i < 7; i++) {
      s.aimedBlaster(0.5, s.at(2));
      await s.beat(2);
    }
    await rain;
    await s.beat(1);
  },

  // his last attack: one thing after another with a cut to black between each, until he runs out
  async final(s) {
    const parts = s.hard ? ['arrays', 'slams', 'vortex', 'noose', 'static', 'spiral', 'quake', 'tunnel'] : ['arrays', 'slams', 'vortex', 'spiral', 'tunnel'];
    for (const part of parts) {
      s.cut();
      await ATTACKS[part](s);
    }
    s.cut();
    await s.box(150, 150);
    await s.sync();
    s.glitch(3);
    for (let i = 0; i < (s.hard ? 4 : 3); i++) {
      s.cross(s.at(2));
      await s.beat(1);
      for (let k = 0; k < 4; k++) s.ringBlaster(45 + k * 90 + i * 15, s.at(2), 0.7);
      await s.beat(3);
    }
    // everything he has left: half the screen at a time
    s.cut();
    await s.box(170, 150);
    await s.sync();
    s.glitch(2);
    const every = s.hard ? 2.5 : 3;
    for (let i = 0; i < (s.hard ? 8 : 6); i++) {
      s.half(i % 2 ? 'right' : 'left', s.at(every));
      await s.beat(every);
    }
    await s.beat(3);
  },
};
// one entry per turn; a list is several attacks in one turn, with a cut to black between them
const STAGE_ATTACKS = {
  1: ['slide', 'blasters', 'burst', 'gaps', 'pincer', ['slide', 'slams'], 'doodles', ['burst', 'blasters']],
  2: ['flipRain', 'spinner', 'colors', 'mirror', 'snake', 'ring', 'sweep', ['gravity', 'colors'], 'hunt', 'crossfire'],
  // back to back, a breather after every BREATHER_EVERY; then 'final' (chaos mode adds 'frenzy')
  3: ['arrays', 'chase', 'drift', 'vortex', 'tunnel', 'echo', 'noose', 'grid', 'static', 'quake', 'storm', 'squeeze'],
};

/* ---------- the engine: runs while he attacks ---------- */
// where the heart can go: with two souls, only the left half (the other one mirrors it on the right)
function limits() {
  const { w, h } = G.box;
  return { minX: 9, maxX: G.mirror ? w / 2 - 12 : w - 9, minY: 8, maxY: h - 8 };
}
function twinOf(hr) {
  return { x: G.box.w - hr.x, y: G.mirror === 'xy' ? G.box.h - hr.y : hr.y };
}
// hit tests are written against G.heart, so the second soul stands in for it
function asTwin(fn) {
  const real = G.heart;
  G.heart = twinOf(real);
  try { return fn(); } finally { G.heart = real; }
}

function moveHeart(dt) {
  const hr = G.heart;
  // the keys don't turn with the screen: when it's flipped, only the view is
  const ix = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
  const iy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);

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

  const { minX, maxX, minY, maxY } = limits();
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
  // movement runs on frame time; the attack's timeline runs on the song
  const dt = Math.min(1 / 30, (now - G.last) / 1000);
  G.last = now;
  G.t = Math.max(G.t, G.clock());

  const o = worldOffset(box), bx = gsap.getProperty(box, 'x'), by = gsap.getProperty(box, 'y');
  // when the box moves, the heart stays where it is on screen and the walls shove it along
  G.heart.x -= bx - G.bx;
  G.heart.y -= by - G.by;
  G.px -= bx - G.bx;
  G.py -= by - G.by;
  G.bx = bx;
  G.by = by;
  G.box = { x: o.x + 4 + bx, y: o.y + 4 + by, w: box.clientWidth, h: box.clientHeight };
  moveHeart(dt);
  G.moved = Math.hypot(G.heart.x - G.px, G.heart.y - G.py) > 0.15;
  G.px = G.heart.x;
  G.py = G.heart.y;

  for (const b of G.bullets) b.update(dt);
  G.bullets = G.bullets.filter(b => !b.dead);

  // no mercy frames: every tick you're touching something costs 1 HP, plus KARMA
  G.hurtCd -= dt;
  const hit = G.hurtCd <= 0 && (G.bullets.find(b => b.hurts()) || (G.mirror && asTwin(() => G.bullets.find(b => b.hurts()))));
  if (hit) {
    fight.php = Math.max(0, fight.php - 1);
    fight.kr = Math.min(Math.max(0, fight.php - 1), fight.kr + (hit.kr || 1));
    G.hurtCd = 0.08;
    if (G.t - G.lastOuch > 0.12) { sfx.hurt(); G.lastOuch = G.t; }
    updateStats();
  }

  G.waits = G.waits.filter(wt => (wt.at <= G.t ? (wt.r(), false) : true));
  // phase 3 is coming apart: now and then the board tears on its own
  if (fight.stage === 3 && !reduceMotion && Math.random() < dt * 0.3) api.tear(rand(0.06, 0.16));
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
  // two souls: the wall down the middle that keeps them apart
  if (G.mirror) {
    fctx.fillStyle = '#444';
    fctx.fillRect(w / 2 - 3, 0, 6, h);
  }
  for (const b of G.bullets) if (b.clip !== false) b.draw(fctx);
  fctx.restore();
  for (const b of G.bullets) if (b.clip === false) b.draw(fctx);
  const color = G.soul === 'blue' ? '#1c6cff' : '#ff0000';
  drawHeart(fctx, G.heart.x, G.heart.y, color);
  if (G.mirror) {
    const t = twinOf(G.heart);
    drawHeart(fctx, t.x, t.y, color);
  }
  fctx.restore();
  if (performance.now() < G.tearUntil) tearFx();
}

// the glitch, on the bullet board: strips of it torn sideways, and flecks of colour
function tearFx() {
  const k = fx.width / Math.max(1, world.clientWidth), W = fx.width, H = fx.height;
  const { x, y, w, h } = G.box;
  fctx.save();
  fctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 6; i++) {
    const sy = Math.floor(clamp(0, H - 1, (y + rand(-30, h + 30)) * k));
    const sh = Math.min(H - sy, Math.ceil(rand(2, 14) * k));
    if (sh > 0) fctx.drawImage(fx, 0, sy, W, sh, Math.round(rand(-14, 14) * k), sy, W, sh);
  }
  for (let i = 0; i < 5; i++) {
    fctx.globalAlpha = rand(0.3, 0.8);
    fctx.fillStyle = pick(['#ff2a55', '#00d5ff', '#fff']);
    fctx.fillRect((x + rand(0, w)) * k, (y + rand(0, h)) * k, rand(6, 50) * k, rand(1, 4) * k);
  }
  fctx.restore();
}

function uncut() {
  G.cutting = false;
  gsap.set(cutEl, { opacity: 0 });
}

// name: an attack, or a list of them with a cut to black between; script: run this instead
async function runAttack(name, script) {
  const run = session;
  fight.phase = 'dodge';
  setMode('dodge');
  sizeFx();
  const o = worldOffset(box);
  Object.assign(G, {
    running: true, last: performance.now(), bullets: [], waits: [],
    soul: 'red', grav: 'down', flipped: false, angle: 0, flow: false, mirror: null, tearUntil: 0,
    bx: gsap.getProperty(box, 'x'), by: gsap.getProperty(box, 'y'), cutting: false, hurtCd: 0, lastOuch: -Infinity, touchJump: false,
    box: { x: o.x + 4, y: o.y + 4, w: box.clientWidth, h: box.clientHeight },
  });
  startClock();
  G.heart = { x: 75, y: 70, v: 0, grounded: false };
  G.px = G.heart.x;
  G.py = G.heart.y;
  const died = new Promise(r => { G.onDeath = r; });
  G.raf = requestAnimationFrame(tick);
  // centre the heart once the box has its first size
  setTimeout(() => { if (G.running) { G.heart.x = box.clientWidth / 2; G.heart.y = box.clientHeight / 2; } }, 320);

  // a turn can be several attacks back to back, with a cut to black between them
  const parts = [].concat(name);
  const play = script ? () => script(api) : async () => {
    for (let i = 0; i < parts.length && G.running; i++) {
      if (i) api.cut();
      await ATTACKS[parts[i]](api);
    }
  };
  const outcome = await Promise.race([play().then(() => 'done'), died.then(() => 'dead')]);
  G.running = false;
  cancelAnimationFrame(G.raf);
  fctx.clearRect(0, 0, fx.width, fx.height);
  uncut();
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
  const dx = (e.clientX - drag.x) * 1.1, dy = (e.clientY - drag.y) * 1.1;
  const [gx] = DIRS[G.grav], { minX, maxX, minY, maxY } = limits();
  if (G.soul === 'red' || !gx) G.heart.x = clamp(minX, maxX, G.heart.x + dx);
  if (G.soul === 'red' || gx) G.heart.y = clamp(minY, maxY, G.heart.y + dy);
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
  ++sayToken;
  speechEl.hidden = true;
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

// start (or restart) a phase, always with a full bag
function resetStage(stageNo) {
  Object.assign(fight, {
    stage: stageNo, php: MAX_HP, kr: 0, turn: 0, turnsInStage: 0, sel: 0,
    tired: false, exhausted: false, phase: 'intro', items: ITEMS.map(it => ({ ...it })),
  });
  bossEl.dataset.stage = stageNo;
  onKey = null;
  waiter = null;
  ++typeToken;
  endEl.hidden = true;
  speechEl.hidden = true;
  hpEl.hidden = true;
  gsap.set([spriteEl, box, world, cutEl, flashEl], { clearProps: 'all' });
  cutText.textContent = '';
  showSprite(stageNo);
  // phase 3 smashes them again on its way in
  setBroken(false);
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

// stageNo: the admin way in, straight to a later phase
async function openBoss(stageNo = 1) {
  if (fight.open || !bossAllowed()) return;
  const run = ++session;
  document.activeElement?.blur?.();
  fight.open = true;
  document.documentElement.classList.add('boss-open');
  bossEl.hidden = false;
  getAudioCtx().resume().catch(() => {});
  fight.hard = document.documentElement.classList.contains('chaos');
  loadTrack(1); // decode and find the beat while the intro plays
  const controls = touchOnly
    ? 'tap to choose · drag to move · hold to jump when blue'
    : 'arrows move · up jumps when blue · Z confirm · X back · esc leaves';
  helpEl.replaceChildren(...(fight.hard ? [Object.assign(document.createElement('b'), { textContent: 'HARD MODE · ' })] : []), controls);
  await loadSprites();
  if (run !== session) return;
  if (stageNo > 1) return startAt(stageNo);
  resetStage(1);
  await intro();
  if (run !== session) return;
  startMusic(1);
  if (!await speeches(fight.hard ? [...LINES.intro, ...LINES.hardIntro] : LINES.intro)) return;
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
  gsap.killTweensOf([stage, flashEl, box, barEl, spriteEl, enemyEl, slashEl, dmgEl, hpFill, endTitle, endActions, endHeart, world, cutEl]);
  setBroken(false);
  gsap.set(enemyEl, { clearProps: 'all' });
  bossEl.classList.remove('glitching');
  bossEl.hidden = true;
  document.documentElement.classList.remove('boss-open');
  if (state === 'chat') setBusy(false);
}

// (re)start at the top of a phase, dropping whatever was going on; phase 3 from its opening
async function startAt(stageNo) {
  const run = ++session;
  G.running = false;
  cancelAnimationFrame(G.raf);
  fctx.clearRect(0, 0, fx.width, fx.height);
  stopMusic();
  gsap.killTweensOf([box, world, spriteEl, cutEl, flashEl, barEl, slashEl, dmgEl, hpFill]);
  await loadSprites();
  if (run !== session) return;
  resetStage(stageNo);
  await intro();
  if (run !== session) return;
  if (stageNo === 3) return rise(3);
  startMusic(stageNo);
  showMenu();
}

// after a GAME OVER you pick up at the start of the phase you reached; after an ending, from the top
againBtn.addEventListener('click', () => startAt(fight.retry ? fight.stage : 1));
document.getElementById('boss-leave').addEventListener('click', closeBoss);
document.getElementById('boss-x').addEventListener('click', closeBoss);

/* ---------- keys: the fight's controls, and the Konami code to get in ---------- */
let adminAt = 0;
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
  // admin: ` then 1, 2 or 3 jumps to the top of that phase
  if (e.code === 'Backquote') {
    e.preventDefault();
    adminAt = performance.now();
    return;
  }
  if (/^Digit[123]$/.test(e.code) && performance.now() - adminAt < 1500) {
    e.preventDefault();
    adminAt = 0;
    return startAt(+e.code.slice(-1));
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
