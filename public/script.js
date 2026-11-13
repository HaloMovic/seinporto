/* ---------- screens ---------- */
gsap.registerPlugin(ScrollTrigger);

const screens = {
  intro: document.getElementById('intro'),
  tragic: document.getElementById('tragic'),
  stillhere: document.getElementById('stillhere'),
};

function showScreen(el) {
  el.classList.remove('hidden');
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.8 });
}
function hideScreen(el, cb) {
  gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => { el.classList.add('hidden'); cb && cb(); } });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// phones and tablets: no hover, and the on-screen keyboard covers half the page
const touchOnly = matchMedia('(hover: none)').matches;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// 'hero' -> 'glitching' -> 'chat' -> 'confirm' -> 'aiming' -> 'shot' (act 1)
// -> 'act3' -> 'enter' -> 'done'   (act 2 goes between 'shot' and 'act3'; it's being rebuilt)
let state = 'hero';

/* ---------- repeat visitors ---------- */
// someone who's been here before and mashes through the cutscenes gets roasted in act 3
const hasVisited = (() => { try { return localStorage.getItem('sein_visited') === 'true'; } catch { return false; } })();
function markVisited() { try { localStorage.setItem('sein_visited', 'true'); } catch {} }
const SPAM_STATES = new Set(['shot']);
let spam = 0;
const countSpam = () => { if (SPAM_STATES.has(state)) spam++; };
addEventListener('pointerdown', countSpam, true);
addEventListener('keydown', countSpam, true);

/* ---------- scroll lock ---------- */
history.scrollRestoration = 'manual';
scrollTo(0, 0);
function unlockScroll() {
  document.documentElement.classList.remove('locked');
}

/* ---------- floating video windows ---------- */
document.querySelectorAll('.float-win').forEach(win => {
  const video = win.querySelector('video');
  video.addEventListener('loadeddata', () => video.classList.add('ready'));

  gsap.set(win, { rotation: parseFloat(getComputedStyle(win).getPropertyValue('--r')) || 0 });
  gsap.to(win, { y: '+=12', duration: gsap.utils.random(2.4, 3.6), repeat: -1, yoyo: true, ease: 'sine.inOut' });

  // the buttons only work while chatting; with a gun out, clicking them is a shot at the window
  win.querySelector('.dot.red').addEventListener('click', () => {
    if (state !== 'chat') return;
    gsap.to(win, { opacity: 0, scale: 0.85, duration: 0.25, onComplete: () => { win.hidden = true; } });
  });
  win.querySelector('.dot.yellow').addEventListener('click', () => { if (state === 'chat') win.classList.toggle('minimized'); });
  win.querySelector('.dot.green').addEventListener('click', () => openVideo(win));

  // drag by the window; a press that doesn't move is a click (opens the video full screen)
  let startX, startY, originLeft, originTop, dragging = false, moved = false, pressedVideo = false;
  win.addEventListener('pointerdown', e => {
    if (state !== 'chat' || e.target.closest('.dot')) return;
    pressedVideo = !!e.target.closest('.win-body');
    win.setPointerCapture(e.pointerId);
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = win.offsetLeft;
    originTop = win.offsetTop;
  });
  win.addEventListener('pointermove', e => {
    if (!dragging) return;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
    if (!moved) {
      moved = true;
      win.classList.add('dragging');
      win.style.zIndex = 4;
      win.style.right = 'auto';
    }
    win.style.left = originLeft + e.clientX - startX + 'px';
    win.style.top = originTop + e.clientY - startY + 'px';
  });
  win.addEventListener('pointerup', e => {
    if (dragging && !moved && pressedVideo) openVideo(win);
    dragging = false;
    win.classList.remove('dragging');
    win.style.zIndex = '';
  });
  win.addEventListener('pointercancel', () => {
    dragging = false;
    win.classList.remove('dragging');
    win.style.zIndex = '';
  });
});

/* ---------- full-screen video (green button) ---------- */
const overlay = document.getElementById('video-overlay');
const overlayWin = overlay.querySelector('.overlay-win');
const overlayVideo = document.getElementById('overlay-video');
const overlayPh = document.getElementById('overlay-ph');
const overlayTitle = document.getElementById('overlay-title');
let overlaySource = null;

function openVideo(win) {
  if (state !== 'chat') return;
  const video = win.querySelector('video');
  overlaySource = win;
  overlayTitle.textContent = win.querySelector('.win-title').textContent;

  if (video.classList.contains('ready')) {
    overlayVideo.src = video.currentSrc;
    overlayVideo.currentTime = video.currentTime;
    overlayVideo.muted = false;
    overlayVideo.play().catch(() => { overlayVideo.muted = true; overlayVideo.play().catch(() => {}); });
    video.pause();
    overlayPh.replaceChildren();
  } else {
    overlayVideo.removeAttribute('src');
    const note = document.createElement('small');
    note.textContent = 'video not added yet ( ˘･_･˘)';
    overlayPh.replaceChildren(overlayTitle.textContent, note);
  }

  overlay.hidden = false;
  state = 'video';
  const from = win.getBoundingClientRect();
  const to = overlayWin.getBoundingClientRect();
  gsap.fromTo(overlay, { backgroundColor: 'rgba(251,250,247,0)' }, { backgroundColor: 'rgba(251,250,247,.6)', duration: 0.35 });
  gsap.fromTo(overlayWin,
    {
      x: from.left - to.left, y: from.top - to.top,
      scaleX: from.width / to.width, scaleY: from.height / to.height,
      transformOrigin: '0 0', opacity: 0.6,
    },
    { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.45, ease: 'power3.out' });
  overlay.querySelector('.dot.green').focus({ preventScroll: true });
}

function closeVideo() {
  if (state !== 'video') return;
  const win = overlaySource;
  const video = win.querySelector('video');
  if (overlayVideo.getAttribute('src')) {
    video.currentTime = overlayVideo.currentTime;
    video.play().catch(() => {});
  }
  overlayVideo.pause();
  const from = win.getBoundingClientRect();
  const to = overlayWin.getBoundingClientRect();
  gsap.to(overlay, { backgroundColor: 'rgba(251,250,247,0)', duration: 0.3 });
  gsap.to(overlayWin, {
    x: from.left - to.left, y: from.top - to.top,
    scaleX: from.width / to.width, scaleY: from.height / to.height,
    transformOrigin: '0 0', opacity: 0, duration: 0.35, ease: 'power3.in',
    onComplete: () => {
      overlay.hidden = true;
      overlayVideo.removeAttribute('src');
      overlayVideo.load();
      state = 'chat';
    },
  });
}

overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeVideo));
overlay.addEventListener('click', e => { if (e.target === overlay) closeVideo(); });

/* ---------- talking figure ---------- */
const sit = document.getElementById('sit');
const bubble = document.getElementById('bubble');
const bubbleText = document.getElementById('bubble-text');
const idle = gsap.to(sit, { scaleY: 1.012, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
let talkTween = null;

function startTalking() {
  if (talkTween) talkTween.kill();
  idle.pause();
  talkTween = gsap.to(sit, {
    keyframes: { rotation: [0, 2.5, -2, 1.5, -2.5, 0], x: [0, 5, -4, 3, -5, 0] },
    duration: 0.7, ease: 'none', repeat: -1,
  });
}
function stopTalking() {
  if (talkTween) talkTween.kill();
  talkTween = null;
  gsap.to(sit, { rotation: 0, x: 0, duration: 0.25, overwrite: 'auto', onComplete: () => { if (!talkTween) idle.resume(); } });
}

// one preloaded element per file, so effects start without a download delay
const sounds = {};
function sound(src) {
  if (!sounds[src]) {
    sounds[src] = new Audio(src);
    sounds[src].preload = 'auto';
  }
  return sounds[src];
}
[GLITCH_AUDIO, GUNSHOT_AUDIO, HEARTBEAT_AUDIO, SOUL_SHATTER_AUDIO].forEach(src => src && sound(src));

function playAudio(src) {
  if (!src) return Promise.resolve();
  return new Promise(resolve => {
    const audio = sound(src);
    audio.currentTime = 0;
    audio.addEventListener('ended', resolve, { once: true });
    audio.addEventListener('error', resolve, { once: true });
    audio.play().catch(resolve);
  });
}

// Plays a timeline locked to a sound file: every frame the timeline jumps to the audio's own
// position, so a stutter can never pull them apart. If the sound is slow to start, the visuals
// don't wait more than half a second: they go ahead, and the sound skips forward to catch up.
// If the browser blocks it (no click on the page yet) or it ends early, the timeline carries on alone.
function playSynced(tl, src) {
  tl.pause(0);
  if (!src) return tl.play();
  const audio = sound(src);
  audio.currentTime = 0;
  let following = false;
  const giveUp = setTimeout(() => { if (!following) tl.play(); }, 500);
  const follow = () => {
    if (audio.paused || audio.ended) {
      gsap.ticker.remove(follow);
      if (tl.progress() < 1) tl.play();
      return;
    }
    tl.time(Math.min(audio.currentTime, tl.duration()));
    if (tl.progress() === 1) gsap.ticker.remove(follow);
  };
  audio.play().then(() => {
    clearTimeout(giveUp);
    if (tl.progress() === 1) return;
    if (tl.time() > 0.05) audio.currentTime = tl.time();
    tl.pause();
    following = true;
    gsap.ticker.add(follow);
  }, () => {
    clearTimeout(giveUp);
    tl.play();
  });
}

async function typeInto(el, text) {
  el.textContent = '';
  for (const ch of text) {
    if (state === 'aiming' || state === 'shot') return;
    el.textContent += ch;
    await sleep(ch === '.' || ch === '?' ? 160 : 28);
  }
}

let speechQueue = Promise.resolve();
function say(text, audio) {
  const run = speechQueue.then(() => speak(text, audio));
  speechQueue = run.catch(() => {});
  return run;
}

async function speak(text, audio) {
  if (state === 'aiming' || state === 'shot') return;
  bubble.hidden = false;
  gsap.fromTo(bubble, { opacity: 0, y: 6, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.25 });
  startTalking();
  await Promise.all([typeInto(bubbleText, text), playAudio(audio)]);
  stopTalking();
  addMessage(text, 'bot');
}

async function sayAll(variant, audio) {
  const lines = Array.isArray(variant) ? variant : [variant];
  for (let i = 0; i < lines.length; i++) {
    await say(lines[i], i === 0 ? audio : null);
    if (i < lines.length - 1) await sleep(500);
  }
}

/* ---------- chat ---------- */
const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSend = chatForm.querySelector('button');

function addMessage(text, who) {
  const el = document.createElement('div');
  el.className = `msg ${who}`;
  if (who === 'bot') {
    // turn @handles into instagram links
    text.split(/(@[\w.]*\w)/).forEach((part, i) => {
      if (i % 2 === 0) return el.append(part);
      const a = document.createElement('a');
      a.href = `https://instagram.com/${part.slice(1)}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = part;
      el.append(a);
    });
  } else {
    el.textContent = text;
  }
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}

// on a phone, only bring the keyboard back if they were typing; otherwise it pops up over him
let keepKeyboard = false;
function setBusy(busy) {
  chatInput.disabled = busy;
  chatSend.disabled = busy;
  if (!busy && state === 'chat' && (!touchOnly || keepKeyboard)) chatInput.focus();
}

const KEYWORD_RULES = [
  ['why_did_you_make_this', /(why\s*(did|do|would)?\s*(you|u)\s*(make|made|build|create)|kenapa\s*(bikin|buat|membuat)|buat\s*apa|what('?s|\s*is)\s*this\s*for)/i],
  ['AI', /\b(ai|a\.i\.?|chat\s*gpt|gpt|claude|gemini|copilot|vibe\s*cod\w*|pake\s*ai|pakai\s*ai|ai\s*generated)\b/i],
  ['love', /\b(i\s*(love|luv)\s*(you|u)|ily|love\s*(you|u)|aku\s*(cinta|sayang)|sayang\s*kamu|naksir)\b/i],
  ['leave', /\b(bye|goodbye|see\s*ya|leave|exit|skip|dadah|pergi)\b/i],
  ['work', /\b(portfolio|projects?|works?|skills?|draw(ing)?s?|animations?|web(sites?)?|art|karya)\b/i],
  ['who', /\b(who|siapa|your\s*name|nama)\b/i],
  ['how_are_you', /(how\s*are\s*(you|u)|how\s*r\s*u|apa\s*kabar|how'?s\s*it\s*going)/i],
  ['insult', /\b(stupid|ugly|dumb|hate|bodoh|goblok|jelek|trash|cringe|anjing|alay)\b/i],
  ['compliment', /\b(cool|nice|cute|great|amazing|awesome|keren|bagus|lucu)\b/i],
  ['joke', /\b(joke|funny|lol|lmao|haha\w*|wkwk\w*)\b/i],
  ['greeting', /\b(hi|hello|hey|yo|halo|hai|sup|hii+)\b/i],
];

function keywordClassify(text) {
  const hit = KEYWORD_RULES.find(([, re]) => re.test(text));
  return hit ? hit[0] : 'unknown';
}

async function classify(text) {
  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(res.status);
    const { category } = await res.json();
    return REPLIES[category] ? category : 'unknown';
  } catch {
    return keywordClassify(text);
  }
}

chatForm.addEventListener('submit', async e => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || state !== 'chat') return;
  keepKeyboard = document.activeElement === chatInput;
  chatInput.value = '';
  setBusy(true);
  addMessage(text, 'user');

  const secret = SECRET_COMMANDS.find(c => c.match.test(text));
  if (secret) {
    await sleep(400);
    await sayAll(secret.text);
    setBusy(false);
    if (secret.then === 'chaos') setChaos(!document.documentElement.classList.contains('chaos'), true);
    if (secret.then === 'boss') openBoss(Number(text.match(/ ([123])$/)?.[1]) || 1);
    return;
  }

  const typing = addMessage('typing...', 'bot typing');
  gsap.to(sit, { rotation: -1.5, duration: 0.4 });
  const category = await classify(text);
  typing.remove();

  const reply = REPLIES[category];
  await sayAll(pick(reply.text), reply.audio);
  setBusy(false);

  if (reply.next === 'confirm') {
    await sleep(600);
    openConfirm();
  }
});

setBusy(true);
async function startChat() {
  state = 'chat';
  getSketchGun(); // the gun loads while they chat
  ignoreScrollUntil = performance.now() + 1500; // trackpad momentum from the glitch scroll
  await sleep(700);
  await say(OPENING_LINE);
  setBusy(false);
}

/* ---------- hero: scrolling past the "normal" portfolio glitches into him ---------- */
const hero = document.getElementById('hero');

// times (s) in glicth_sound_effect.mp3: a click, the main crackle, silence, then a last burst
const GLITCH_SFX = { click: 0.24, burst: [0.40, 0.90], last: [1.68, 2.06] };

function glitchToChat() {
  if (state !== 'hero') return;
  state = 'glitching';

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    playAudio(GLITCH_AUDIO);
    gsap.to(hero, { opacity: 0, duration: 0.4, onComplete: () => { hero.remove(); startChat(); } });
    return;
  }

  // cut the hero into uneven horizontal bands, each a clone clipped to its strip
  const cuts = [0];
  while (cuts.at(-1) < 100) cuts.push(Math.min(100, cuts.at(-1) + gsap.utils.random(3, 14)));
  const bands = cuts.slice(1).map((end, i) => {
    const band = hero.cloneNode(true);
    band.removeAttribute('id');
    band.setAttribute('aria-hidden', 'true');
    band.classList.add('hero-band');
    band.style.clipPath = `inset(${cuts[i]}% 0 ${100 - end}% 0)`;
    hero.after(band);
    // a cloned canvas comes out blank: paint the ID card's last frame into it
    const badge = band.querySelector('.badge-canvas');
    if (badge && window.heroBadge) window.heroBadge.snapshot(badge);
    return band;
  });
  hero.hidden = true;

  const noise = document.createElement('div');
  noise.className = 'glitch-noise';
  document.body.append(noise);

  const jolt = (strength = 1) => bands.forEach(b => {
    b.classList.toggle('rgb', Math.random() < 0.5 * strength);
    b.classList.toggle('invert', Math.random() < 0.06 * strength);
    gsap.set(b, { x: Math.random() < 0.4 * strength ? gsap.utils.random(-60, 60) * strength : gsap.utils.random(-6, 6) });
  });
  const settle = () => bands.forEach(b => {
    b.classList.remove('invert');
    // leave the page slightly broken during the silence
    b.classList.toggle('rgb', Math.random() < 0.2);
    gsap.set(b, { x: Math.random() < 0.15 ? gsap.utils.random(-14, 14) : 0 });
  });

  const tl = gsap.timeline({
    onComplete: () => {
      bands.forEach(b => b.remove());
      noise.remove();
      hero.remove();
      startChat();
    },
  });

  const { click, burst, last } = GLITCH_SFX;
  // the click: one small tear
  tl.add(() => jolt(0.4), click).add(settle, click + 0.06);
  // the crackle: the page stutters for exactly as long as the sound does
  tl.set(noise, { opacity: 1 }, burst[0]);
  for (let t = burst[0]; t < burst[1]; t += 0.05) tl.add(() => jolt(1), t);
  tl.add(settle, burst[1]).set(noise, { opacity: 0 }, burst[1]);

  // the last burst: strips drop out one by one, revealing him underneath
  const order = gsap.utils.shuffle([...bands]);
  const span = last[1] - last[0];
  tl.set(noise, { opacity: 1 }, last[0]);
  order.forEach((b, i) => {
    const at = last[0] + i * (span / order.length);
    tl.set(b, { x: gsap.utils.random(-120, 120), filter: 'invert(1)' }, at)
      .set(b, { autoAlpha: 0 }, at + 0.03);
  });
  tl.fromTo(screens.intro, { x: -10, skewX: 4 }, { x: 0, skewX: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }, last[1] - 0.1)
    .set(noise, { opacity: 0 }, last[1]);
  playSynced(tl, GLITCH_AUDIO);
}

// menu-bar clock in the visitor's own time
const heroClock = document.getElementById('hero-clock');
(function tick() {
  if (!heroClock.isConnected) return;
  heroClock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  setTimeout(tick, 15000);
})();

document.querySelectorAll('[data-glitch]').forEach(b => b.addEventListener('click', glitchToChat));

// entrance, idle motion, mouse parallax, the wandering cursor and the occasional flicker
(() => {
  const title = hero.querySelector('.hero-title');
  const stickers = [...hero.querySelectorAll('.sticker')];
  const cursor = document.getElementById('fake-cursor');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from(hero.querySelector('.hero-menubar'), { yPercent: -100, duration: 0.5, ease: 'steps(4)' }, 0.1)
    .from(hero.querySelector('.hero-eyebrow'), { y: 12, opacity: 0, duration: 0.6 }, 0.2)
    .from(hero.querySelectorAll('.hero-line'), { yPercent: 70, opacity: 0, filter: 'blur(12px)', duration: 1, stagger: 0.12 }, 0.25)
    .from(hero.querySelector('.hero-figure'), { scale: 0.2, opacity: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.5)
    .from(hero.querySelectorAll('.hero-statement, .hero-tags li, .hero-actions > *'), { y: 16, opacity: 0, duration: 0.6, stagger: 0.06 }, 0.75)
    .from(stickers.map(s => s.firstElementChild), { scale: 0, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'back.out(2.2)' }, 0.9)
    .from(cursor, { opacity: 0, x: 60, y: 40, duration: 0.8 }, 1.4)
    .from(hero.querySelector('.hero-marquee'), { opacity: 0, duration: 0.8 }, 1.2);

  // he breathes, like he does in the chat
  gsap.to(hero.querySelector('.hero-figure img'), { scaleY: 1.012, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.6 });

  stickers.forEach(s => {
    gsap.to(s.firstElementChild, { y: -10, duration: gsap.utils.random(2.2, 3.4), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: gsap.utils.random(0, 1.5) });
  });

  const movers = stickers.map(s => ({
    depth: +s.dataset.depth,
    x: gsap.quickTo(s, 'x', { duration: 0.9, ease: 'power3' }),
    y: gsap.quickTo(s, 'y', { duration: 0.9, ease: 'power3' }),
  }));
  const onMove = e => {
    if (state !== 'hero') return removeEventListener('pointermove', onMove);
    const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
    movers.forEach(m => { m.x(dx * -40 * m.depth); m.y(dy * -30 * m.depth); });
  };
  addEventListener('pointermove', onMove);

  // "sein" drifts around the name like someone else is in the file
  gsap.timeline({ repeat: -1, delay: 2.2, defaults: { duration: 1.6, ease: 'power2.inOut' } })
    .to(cursor, { left: '60%', top: '44%' })
    .to(cursor, { left: '60%', top: '44%', duration: 0.9 })
    .to(cursor, { left: '38%', top: '60%', duration: 2 })
    .to(cursor, { left: '38%', top: '60%', duration: 1 })
    .to(cursor, { left: '24%', top: '14%' })
    .to(cursor, { left: '24%', top: '14%', duration: 0.8 })
    .to(cursor, { left: '74%', top: '14%', duration: 1.8 });

  (function blip() {
    if (state !== 'hero') return;
    title.classList.remove('blip');
    void title.offsetWidth;
    title.classList.add('blip');
    setTimeout(blip, gsap.utils.random(3500, 7000));
  })();
})();

/* ---------- scroll attempt -> are you sure? ---------- */
const confirmEl = document.getElementById('confirm');
const btnNo = document.getElementById('btn-no');
const btnYes = document.getElementById('btn-yes');
const hint = document.getElementById('hint');
if (touchOnly) hint.textContent = 'swipe up to see the portfolio ↑';

let ignoreScrollUntil = 0;

function openConfirm() {
  if (state !== 'chat' || performance.now() < ignoreScrollUntil) return;
  state = 'confirm';
  confirmEl.hidden = false;
  gsap.fromTo(confirmEl, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  gsap.fromTo(confirmEl.querySelector('.dialog'), { y: 16, scale: 0.96 }, { y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' });
  btnNo.focus();
}

function closeConfirm(cb) {
  gsap.to(confirmEl, { opacity: 0, duration: 0.2, onComplete: () => { confirmEl.hidden = true; cb(); } });
}

// scrolling inside the chat window just scrolls the chat
const chatWin = document.querySelector('.chat-win');
const inChat = target => chatWin.contains(target);

const bossIsOpen = () => document.documentElement.classList.contains('boss-open');

function scrollAttempt() {
  if (bossIsOpen()) return;
  if (state === 'enter') return enterPortfolio();
  // holding up the ID card: scrolling just puts it back first
  if (state === 'hero' && window.heroBadge?.isOpen()) {
    window.heroBadge.close();
    ignoreScrollUntil = performance.now() + 900; // and the trackpad's momentum doesn't count
    return;
  }
  if (state === 'hero' && performance.now() < ignoreScrollUntil) return;
  if (state === 'hero') glitchToChat();
  else openConfirm();
}

addEventListener('wheel', e => { if (e.deltaY > 0 && !inChat(e.target)) scrollAttempt(); }, { passive: true });

let touchStartY = null;
// dragging a video window or tapping a popup isn't a scroll
const notAScroll = target => inChat(target) || target.closest('.float-win, .dialog-backdrop, .video-overlay') || hero.classList.contains('badge-grab');
addEventListener('touchstart', e => { touchStartY = notAScroll(e.target) ? null : e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  if (touchStartY !== null && touchStartY - e.touches[0].clientY > 40) {
    touchStartY = null;
    scrollAttempt();
  }
}, { passive: true });

addEventListener('keydown', e => {
  if (bossIsOpen()) return;
  if (state === 'confirm' && e.key === 'Escape') return btnNo.click();
  if (state === 'video' && e.key === 'Escape') return closeVideo();
  if (inChat(document.activeElement)) return;
  if (['PageDown', 'End', 'ArrowDown', ' '].includes(e.key) && !e.target.closest('button')) scrollAttempt();
});

btnNo.addEventListener('click', () => {
  closeConfirm(async () => {
    state = 'chat';
    ignoreScrollUntil = performance.now() + 1200; // trackpad momentum would reopen it instantly
    setBusy(true);
    await say(STAY_LINE);
    setBusy(false);
  });
});

btnYes.addEventListener('click', () => closeConfirm(startAiming));

/* ---------- gun ---------- */
const gun = document.getElementById('gun');
const flash = document.getElementById('flash');
const holes = document.getElementById('holes');
// Point in gun.png (fraction of width/height) that should sit under the crosshair: the tip of the
// front sight, where the barrel ends (pixel 162, 2 of 679 × 486).
const SIGHT = { x: 162 / 679, y: 2 / 486 };
gsap.set(gun, { transformOrigin: `${SIGHT.x * 100}% ${SIGHT.y * 100}%` });

function gunPose(cx, cy) {
  const w = gun.offsetWidth, h = gun.offsetHeight;
  // grow the gun if needed so the hands always reach past the bottom edge
  const scale = Math.max(1, (innerHeight - cy + 30) / (h * (1 - SIGHT.y)));
  return {
    x: cx - w * SIGHT.x,
    y: cy - h * SIGHT.y,
    scale,
    rotation: (cx - innerWidth / 2) / innerWidth * 14,
  };
}

/* ---------- the paper-sketch gun (sketch-gun.js) ----------
   One weapon per visit, picked at random and kept for both shots: a pistol, an SMG or a sniper.
   If WebGL or the module isn't there, the gun.png above is used instead. */
const WEAPONS = ['pistol', 'smg', 'sniper'];
// ?gun=sniper forces one, for checking each of them; otherwise it's luck
const WEAPON = WEAPONS.includes(new URLSearchParams(location.search).get('gun'))
  ? new URLSearchParams(location.search).get('gun')
  : pick(WEAPONS);
let sketchGunLoad = null;
let activeGun = null; // the sketch gun, once it's actually in his hands

function getSketchGun() {
  sketchGunLoad ??= import('./sketch-gun.js')
    .then(m => m.createSketchGun({ weapon: WEAPON }))
    .catch(err => { console.warn('[gun]', err); return null; });
  return sketchGunLoad;
}

function aim(e) {
  if (activeGun) return activeGun.aimAt(e.clientX, e.clientY);
  gsap.to(gun, { ...gunPose(e.clientX, e.clientY), duration: 0.25, ease: 'power3', overwrite: 'auto' });
}

// the bang: deeper for the sniper, three of them for the SMG's burst
async function gunshotSound() {
  const bang = sound(GUNSHOT_AUDIO);
  bang.preservesPitch = false;
  bang.playbackRate = activeGun?.weapon === 'sniper' ? 0.72 : 1;
  bang.currentTime = 0;
  await Promise.race([bang.play().catch(() => {}), sleep(300)]);
  for (let i = 1; i < (activeGun?.rounds || 1); i++) {
    setTimeout(() => bang.cloneNode().play().catch(() => {}), i * activeGun.interval * 1000);
  }
  await sleep(GUNSHOT_PEAK * 1000);
}

/* ---------- aiming down the sight: hold right-click, or the aim button on a phone ---------- */
const ARMED = new Set(['aiming']);
const adsBtn = document.createElement('button');
adsBtn.type = 'button';
adsBtn.className = 'ads-toggle';
adsBtn.textContent = '◎ aim';
adsBtn.hidden = true;
document.body.append(adsBtn);

function armedHint() {
  if (touchOnly) return 'tap to shoot';
  return activeGun ? 'click to shoot · hold right-click to aim' : 'click to shoot';
}
function showAimButton(on) {
  adsBtn.hidden = !(on && touchOnly && activeGun);
  adsBtn.classList.remove('on');
}
adsBtn.addEventListener('click', e => {
  e.stopPropagation(); // aiming isn't a shot
  const on = !adsBtn.classList.contains('on');
  adsBtn.classList.toggle('on', on);
  activeGun?.setAim(on);
});
addEventListener('pointerdown', e => {
  if (e.button === 2 && activeGun && ARMED.has(state)) activeGun.setAim(true, e.clientX, e.clientY);
});
addEventListener('pointerup', e => { if (e.button === 2) activeGun?.setAim(false); });
addEventListener('contextmenu', e => {
  if (activeGun && (ARMED.has(state) || state === 'shot')) e.preventDefault();
});

// bullet holes where they clicked: a tight spread for a burst, a bigger one for the sniper.
// `into` puts them inside something that moves (a window that's about to fall)
function makeHoles(x, y, into = null) {
  const n = activeGun?.rounds || 1;
  const box = into ? into.getBoundingClientRect() : { left: 0, top: 0 };
  return Array.from({ length: n }, (_, i) => {
    const hole = document.createElement('div');
    hole.className = 'hole';
    hole.style.left = x - box.left + (i ? gsap.utils.random(-28, 28) : 0) + 'px';
    hole.style.top = y - box.top + (i ? gsap.utils.random(-34, 10) : 0) + 'px';
    if (activeGun?.weapon === 'sniper') hole.style.scale = '1.4';
    (into || holes).appendChild(hole);
    gsap.fromTo(hole, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15, delay: i * (activeGun?.interval || 0) });
    return hole;
  });
}

function swapFigure(src) {
  gsap.to(sit, {
    opacity: 0, duration: 0.15,
    onComplete: () => { sit.src = src; gsap.to(sit, { opacity: 1, duration: 0.25 }); },
  });
}

const shotImg = new Image();
let shotImgReady = false;
shotImg.onload = () => { shotImgReady = true; };

/* ---------- the aiming scene: shoot him, shoot his stuff, or miss ----------
   Only a shot that lands on him (his actual pixels, not his box) ends it. The floating windows
   crack and fall, misses leave holes, and he talks the whole time. Lines live in replies.js. */
const COOLDOWN = { pistol: 300, smg: 450, sniper: 1150 }; // ms between shots
let lastShot = 0, misses = 0, windowsDown = 0, idleLines = [];
let quipTimer = 0, quipToken = 0, quipBusy = false;

// a line in his bubble while aiming (the chat is hidden, so nothing goes in the log)
async function quip(text) {
  const token = ++quipToken;
  clearTimeout(quipTimer);
  quipBusy = true;
  bubble.hidden = false;
  gsap.fromTo(bubble, { opacity: 0, y: 6, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.2 });
  bubbleText.textContent = '';
  startTalking();
  for (const ch of text) {
    if (token !== quipToken) return false;
    bubbleText.textContent += ch;
    await sleep(/[.?!]/.test(ch) ? 120 : 24);
  }
  if (token !== quipToken) return false;
  quipBusy = false;
  stopTalking();
  // and if a while goes by with nothing said (and no story beat coming), he fills the silence
  quipTimer = setTimeout(() => {
    if (state !== 'aiming') return;
    const next = AIM_STORY[storyIdx];
    if (next && next.t - heldFor < 5) return;
    if (!idleLines.length) idleLines = gsap.utils.shuffle([...AIM_LINES.idle]);
    quip(idleLines.pop());
  }, gsap.utils.random(7500, 9500));
  return true;
}
function stopQuips() {
  quipToken++;
  quipBusy = false;
  clearTimeout(quipTimer);
  stopTalking();
  bubble.hidden = true;
}

/* ---------- the long way round: hold the gun on him for 5 minutes and he lets you in ----------
   The clock only runs while the tab is visible. Shooting his windows or the wall doesn't stop
   it; only shooting him does. The story and the ending lines live in replies.js. */
const introStatus = screens.intro.querySelector('.status');
let heldFor = 0, heldTimer = 0, storyIdx = 0;

function startHoldClock() {
  heldFor = 0;
  storyIdx = 0;
  let last = performance.now(), nudged = false;
  clearInterval(heldTimer);
  heldTimer = setInterval(() => {
    const now = performance.now();
    if (!document.hidden) heldFor += (now - last) / 1000;
    last = now;
    if (state !== 'aiming') { clearInterval(heldTimer); return; }
    const s = Math.floor(heldFor);
    introStatus.classList.add('hostage');
    introStatus.innerHTML = `<i class="pulse"></i>held at gunpoint · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    // a nudge, for anyone who hasn't realised waiting is a choice
    if (!nudged && heldFor > 45) { nudged = true; hint.textContent = `${armedHint()} · or don't`; }
    if (heldFor >= SPARE_AFTER && !quipBusy) { spareHim(); return; }
    const beat = AIM_STORY[storyIdx];
    if (beat && heldFor >= beat.t && !quipBusy) {
      const i = storyIdx++;
      if (beat.image) swapFigure(beat.image);
      // if a shot cuts him off mid-story, he picks the line up again afterwards
      quip(windowsDown && beat.ifShot ? beat.ifShot : beat.line).then(done => {
        if (!done && storyIdx === i + 1 && state === 'aiming') storyIdx = i;
      });
    }
  }, 250);
}

// five minutes and no shot: the gun goes down, he says his piece, and you're through
async function spareHim() {
  state = 'spared';
  clearInterval(heldTimer);
  removeEventListener('click', onAimClick);
  removeEventListener('pointermove', aim);
  showAimButton(false);
  hint.textContent = '';
  introStatus.classList.remove('hostage');
  introStatus.innerHTML = '<i class="pulse"></i>released';
  screens.intro.classList.remove('aiming');
  if (activeGun) activeGun.hide();
  else gsap.to(gun, { y: innerHeight + 80, duration: 0.6, ease: 'power3.in' });
  stopQuips();
  await sleep(700);
  for (const line of SPARED_LINES) {
    await quip(line);
    await sleep(readTime(line));
  }
  stopQuips();
  gsap.set(cover, { backgroundColor: '#fbfaf7' });
  await gsap.to(cover, { opacity: 1, duration: 0.7, ease: 'power2.in' });
  screens.intro.classList.add('hidden');
  activeGun?.hide(true);
  playAct3({ spared: true });
}

// is this point on him? checks the cutout's own pixels, with a few pixels of slack
const hitCanvas = document.createElement('canvas');
let hitCtx = null, hitSrc = '';
function hitsSein(x, y) {
  const iw = sit.naturalWidth, ih = sit.naturalHeight;
  if (!iw) return false;
  const r = sit.getBoundingClientRect();
  // the image is object-fit: contain, sitting on the bottom edge, centred
  const s = Math.min(r.width / iw, r.height / ih);
  const left = r.left + (r.width - iw * s) / 2, top = r.bottom - ih * s;
  if (hitSrc !== sit.currentSrc) {
    hitCanvas.width = iw;
    hitCanvas.height = ih;
    hitCtx = hitCanvas.getContext('2d', { willReadFrequently: true });
    hitCtx.clearRect(0, 0, iw, ih);
    hitCtx.drawImage(sit, 0, 0);
    hitSrc = sit.currentSrc;
  }
  return [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]].some(([dx, dy]) => {
    const px = Math.floor((x + dx - left) / s), py = Math.floor((y + dy - top) / s);
    return px >= 0 && py >= 0 && px < iw && py < ih && hitCtx.getImageData(px, py, 1, 1).data[3] > 40;
  });
}
const nearSein = (x, y) => {
  const r = sit.getBoundingClientRect();
  const dx = Math.max(r.left + r.width * 0.2 - x, 0, x - (r.right - r.width * 0.2));
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy) < 70;
};

// the bang, the kick and the flash, for shots that don't end the scene
async function fireAt(e, flashOpacity) {
  await gunshotSound();
  if (activeGun) {
    activeGun.fire(e.clientX, e.clientY);
  } else {
    const pose = gunPose(e.clientX, e.clientY);
    gsap.killTweensOf(gun);
    gsap.timeline()
      .set(gun, pose)
      .to(gun, { y: pose.y + 30, rotation: pose.rotation - 7, duration: 0.06, ease: 'power4.out' })
      .to(gun, { y: pose.y, rotation: pose.rotation, duration: 0.4, ease: 'power2.out' });
  }
  gsap.fromTo(flash, { opacity: flashOpacity }, { opacity: 0, duration: 0.25 });
  gsap.fromTo(screens.intro, { x: -4 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' });
}

// one bullet hole, on the page or inside something that moves (a falling window)
function addHole(x, y, into = null) {
  const box = into ? into.getBoundingClientRect() : { left: 0, top: 0 };
  const hole = document.createElement('div');
  hole.className = 'hole';
  hole.style.left = `${x - box.left}px`;
  hole.style.top = `${y - box.top}px`;
  if (activeGun?.weapon === 'sniper') hole.style.scale = '1.4';
  (into || holes).appendChild(hole);
  gsap.fromTo(hole, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15 });
}

// a window takes the hit: a spider-web crack, a jolt, then it falls off the screen
function breakWindow(win, x, y) {
  win.classList.add('shot-down');
  const box = win.getBoundingClientRect();
  addHole(x, y, win);
  const crack = document.createElement('div');
  crack.className = 'glass-crack';
  crack.style.left = `${x - box.left}px`;
  crack.style.top = `${y - box.top}px`;
  let rays = '';
  for (let i = 0; i < 9; i++) {
    let a = (i / 9) * Math.PI * 2 + Math.random() * 0.4, r = 4, d = 'M0 0';
    while (r < 46) { r += gsap.utils.random(7, 14); a += gsap.utils.random(-0.25, 0.25); d += ` L${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; }
    rays += `<path d="${d}"/>`;
  }
  crack.innerHTML = `<svg viewBox="-50 -50 100 100">${rays}<circle r="14" /><circle r="27" /></svg>`;
  win.appendChild(crack);
  win.querySelector('video')?.pause();
  gsap.killTweensOf(win); // stop its idle bob
  gsap.timeline()
    .to(win, { x: `+=${gsap.utils.random(-16, 16)}`, rotation: `+=${gsap.utils.random(-9, 9)}`, duration: 0.08, ease: 'power3.out' })
    .to(win, { y: innerHeight + 260, rotation: gsap.utils.random(-60, 60), duration: 1.1, ease: 'power2.in' }, 0.45)
    .set(win, { display: 'none' });

  windowsDown++;
  const key = win.querySelector('.win-title').textContent.replace('.mov', '').trim();
  quip(pickFresh(AIM_LINES.window[key] || AIM_LINES.miss)).then(async () => {
    const left = [...document.querySelectorAll('.float-win')].filter(w => !w.hidden && !w.classList.contains('shot-down') && w.offsetParent);
    if (!left.length && state === 'aiming') { await sleep(500); if (state === 'aiming') quip(AIM_LINES.allWindows); }
  });
}

/* ---------- the bits of the page you can shoot ---------- */
const SHOOTABLE_UI = '#bubble, .logo, .lock-pill, .chaos-toggle, .status, .hint';
function shootUI(el, x, y) {
  addHole(x, y);
  const L = AIM_LINES.ui;
  if (el.matches('#bubble')) {
    // whatever he was saying falls out of the bubble, letter by letter
    const box = el.getBoundingClientRect();
    const debris = document.createElement('div');
    debris.className = 'bubble-debris';
    Object.assign(debris.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px` });
    debris.innerHTML = [...bubbleText.textContent].map(ch => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    document.body.append(debris);
    stopQuips();
    gsap.to(debris.children, {
      y: () => gsap.utils.random(120, 300), x: () => gsap.utils.random(-30, 30), rotation: () => gsap.utils.random(-160, 160),
      opacity: 0, duration: 1, ease: 'power2.in', stagger: { each: 0.012, from: 'random' }, onComplete: () => debris.remove(),
    });
    setTimeout(() => { if (state === 'aiming') quip(pickFresh(L.bubble)); }, 650);
  } else if (el.matches('.logo')) {
    // the name falls apart, letter by letter
    el.classList.add('shot');
    const letters = [...el.textContent].map((ch, i) => `<span class="${i >= 4 ? 'dim' : ''}" style="display:inline-block">${ch}</span>`).join('');
    el.innerHTML = letters;
    gsap.to(el.children, {
      y: () => gsap.utils.random(140, 320), x: () => gsap.utils.random(-40, 40), rotation: () => gsap.utils.random(-140, 140),
      opacity: 0, duration: 1.1, ease: 'power2.in', stagger: { each: 0.035, from: 'random' },
    });
    quip(pickFresh(L.logo));
  } else if (el.matches('.lock-pill')) {
    // it nearly breaks, then pulls itself together
    gsap.timeline()
      .add(() => { el.textContent = 'scroll unl—'; })
      .fromTo(el, { x: -6, rotation: -4 }, { x: 0, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
      .add(() => { el.textContent = 'scroll locked'; }, 0.7);
    quip(pickFresh(L.lock));
  } else if (el.matches('.chaos-toggle')) {
    if (el.classList.contains('shot')) { quip(pickFresh(L.chaosAgain)); return; }
    el.classList.add('shot');
    unleashMass(el);
  } else if (el.matches('.status')) {
    gsap.fromTo(el, { x: 8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    quip(pickFresh(L.clock));
  } else if (el.matches('.hint')) {
    // the instructions drop off the bottom, and come back sulking
    el.classList.add('shot');
    gsap.timeline()
      .to(el, { y: 90, rotation: gsap.utils.random(-25, 25), opacity: 0, duration: 0.6, ease: 'power2.in' })
      .add(() => { el.textContent = L.hintAfter; })
      .to(el, { y: 0, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, '+=1.2');
    quip(pickFresh(L.hint));
  }
}

/* ---------- shoot the chaos switch and something gets out ----------
   a boiling black mass full of mismatched eyes creeps out of the switch, looks at you, then
   pulls back in and leaves chaos mode on */
function unleashMass(from) {
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const el = document.createElement('div');
  el.className = 'eye-mass';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<svg><path class="m-red"/><path class="m-cyan"/><path class="m-body"/><g class="m-eyes"></g></svg>';
  document.body.append(el);
  const [red, cyan, body] = el.querySelectorAll('path');
  const eyesG = el.querySelector('.m-eyes');
  const NS = 'http://www.w3.org/2000/svg';
  const R = Math.hypot(innerWidth, innerHeight) * 0.42;
  // it spreads towards the middle of the screen
  const dir = Math.atan2(innerHeight * 0.55 - cy, innerWidth * 0.5 - cx);
  const COLORS = ['#ff8fd1', '#ffe066', '#c6a4ff', '#ffb0e6', '#fff2a0', '#9ff0d5'];
  const eyes = Array.from({ length: 16 }, () => {
    const g = document.createElementNS(NS, 'g');
    const s = gsap.utils.random(9, 24);
    g.innerHTML = `<g class="m-lid"><ellipse rx="${s}" ry="${s * gsap.utils.random(0.55, 0.85)}" fill="${pick(COLORS)}" stroke="#0b0b0b" stroke-width="2"/>`
      + `<circle class="m-pupil" r="${s * 0.42}" fill="#0b0b0b"/><circle r="${s * 0.13}" cx="${-s * 0.25}" cy="${-s * 0.25}" fill="#fff"/></g>`;
    eyesG.appendChild(g);
    return { g, s, a: dir + gsap.utils.random(-1.2, 1.2), d: Math.sqrt(Math.random()) * 0.8, tilt: gsap.utils.random(-30, 30), pupil: g.querySelector('.m-pupil'), lid: g.querySelector('.m-lid') };
  });
  // blinking, out of sync
  eyes.forEach(e => {
    gsap.set(e.lid, { transformOrigin: '50% 50%' });
    gsap.timeline({ repeat: -1, repeatDelay: gsap.utils.random(1.4, 3.6), delay: Math.random() * 2 })
      .to(e.lid, { scaleY: 0.08, duration: 0.07, ease: 'power2.in' })
      .to(e.lid, { scaleY: 1, duration: 0.1, ease: 'power2.out' });
  });

  const grow = { k: 0 };
  let t = 0, step = -1, raf = 0;
  const shape = (k, jitter) => {
    let d = '';
    for (let i = 0; i <= 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      const toward = Math.cos(a - dir) * 0.5 + 0.5; // it reaches further towards the middle
      const rr = R * k * (0.18 + 0.62 * toward ** 1.6) * (1 + 0.22 * Math.sin(a * 5 + t * 2.4) + 0.12 * Math.sin(a * 11 - t * 3.1) + jitter * (Math.random() - 0.5));
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
    }
    return `${d}Z`;
  };
  const tick = () => {
    raf = requestAnimationFrame(tick);
    t += 1 / 60;
    // the outline redraws on twos, like it's flickering
    const s = Math.floor(t * 12);
    if (s !== step) {
      step = s;
      body.setAttribute('d', shape(grow.k, 0.18));
      red.setAttribute('d', shape(grow.k, 0.3));
      cyan.setAttribute('d', shape(grow.k, 0.3));
    }
    eyes.forEach(e => {
      const reach = R * grow.k * (0.18 + 0.62 * (Math.cos(e.a - dir) * 0.5 + 0.5) ** 1.6) * e.d;
      const x = cx + Math.cos(e.a) * reach, y = cy + Math.sin(e.a) * reach;
      const show = grow.k > 0.15 ? Math.min(1, (grow.k - 0.15) * 3) : 0;
      e.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${e.tilt}) scale(${show.toFixed(2)})`);
      // every eye looks at you
      const dx = pointer.x - x, dy = pointer.y - y, l = Math.hypot(dx, dy) || 1;
      e.pupil.setAttribute('cx', (dx / l * e.s * 0.32).toFixed(1));
      e.pupil.setAttribute('cy', (dy / l * e.s * 0.22).toFixed(1));
    });
  };
  tick();
  gsap.fromTo(screens.intro, { x: -10 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.25)' });
  quip(AIM_LINES.ui.chaos[0]);
  gsap.timeline()
    .to(grow, { k: 1, duration: 1.5, ease: 'power2.out' })
    .add(() => { if (state === 'aiming') quip(AIM_LINES.ui.chaos[1]); }, 2.2)
    .to(grow, { k: 0, duration: 0.8, ease: 'power3.in' }, 3.8)
    .add(() => {
      cancelAnimationFrame(raf);
      el.remove();
      setChaos(true);
      if (state === 'aiming') quip(AIM_LINES.ui.chaos[2]);
    });
}

// a miss: the hole stays, he flinches away from it
function missAt(x, y) {
  addHole(x, y);
  const r = sit.getBoundingClientRect();
  gsap.fromTo(sit, { x: x < r.left + r.width / 2 ? 10 : -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
}

// a random line, but never the one he just said
let lastLine = '';
function pickFresh(lines) {
  const options = lines.filter(l => l !== lastLine);
  lastLine = pick(options.length ? options : lines);
  return lastLine;
}

// where one round lands: a window, something on the page, or the wall. Returns what it hit.
function landRound(x, y, target) {
  const win = target?.closest?.('.float-win');
  if (win && !win.classList.contains('shot-down')) { breakWindow(win, x, y); return 'window'; }
  if (win) { addHole(x, y, win); return 'window'; }
  const ui = target?.closest?.(SHOOTABLE_UI);
  if (ui && screens.intro.contains(ui)) { shootUI(ui, x, y); return 'ui'; }
  missAt(x, y);
  return nearSein(x, y) ? 'near' : 'miss';
}

// the shot that hits him ends the scene
function killShot(x, y) {
  removeEventListener('click', onAimClick);
  clearInterval(heldTimer);
  introStatus.classList.remove('hostage');
  stopQuips();
  shoot({ clientX: x, clientY: y });
}

// where the mouse is right now (an SMG burst follows it, round by round)
const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

async function onAimClick(e) {
  if (state !== 'aiming') return;
  const now = performance.now();
  if (now - lastShot < (COOLDOWN[activeGun?.weapon] || 300)) return;
  lastShot = now;
  if (hitsSein(e.clientX, e.clientY)) return killShot(e.clientX, e.clientY);
  const rounds = activeGun?.rounds || 1, gap = (activeGun?.interval || 0) * 1000;
  await fireAt(e, 0.3);
  if (state !== 'aiming') return;
  // every round lands where the cursor is at that moment: the first where you clicked
  const hits = [landRound(e.clientX, e.clientY, e.target)];
  for (let i = 1; i < rounds; i++) {
    await sleep(gap);
    if (state !== 'aiming') return;
    const { x, y } = pointer;
    if (hitsSein(x, y)) return killShot(x, y);
    hits.push(landRound(x, y, document.elementFromPoint(x, y)));
  }
  // windows and page bits already said their piece; plain misses get one line per trigger pull
  if (hits.includes('window') || hits.includes('ui')) return;
  misses++;
  const m = AIM_LINES.miss;
  let line;
  if (hits.includes('near')) line = pickFresh(AIM_LINES.near);
  else if (misses <= m.length) line = m[misses - 1];
  else line = pickFresh(m.slice(-3));
  quip(line);
}

function beginAimScene() {
  misses = 0;
  windowsDown = 0;
  lastShot = performance.now();
  addEventListener('click', onAimClick);
  quip(AIM_LINES.first);
  startHoldClock();
}

async function startAiming() {
  state = 'aiming';
  setBusy(true);
  screens.intro.classList.add('aiming');
  hint.textContent = touchOnly ? 'tap to shoot' : 'click to shoot';
  stopTalking();
  bubble.hidden = true;
  gsap.set(bubble, { xPercent: -50 }); // centred over his head while aiming (see #intro.aiming .bubble)
  swapFigure(AIMED_AT_IMAGE);
  if (SHOT_IMAGE) shotImg.src = SHOT_IMAGE;

  // the page is locked, but a focus or a tap can still nudge it: put it back before aiming
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  const r = sit.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
  activeGun = await Promise.race([getSketchGun(), sleep(1500).then(() => null)]);
  hint.textContent = armedHint();
  if (activeGun) {
    await activeGun.show(cx, cy);
    showAimButton(true);
    addEventListener('pointermove', aim);
    beginAimScene();
    return;
  }

  const start = gunPose(cx, cy);
  gsap.fromTo(gun,
    { ...start, y: innerHeight + 40, visibility: 'visible' },
    {
      ...start, duration: 0.8, ease: 'power3.out',
      onComplete: () => {
        addEventListener('pointermove', aim);
        beginAimScene();
      },
    });
}

// the bang in gunshot.mp3 peaks this far in
const GUNSHOT_PEAK = 0.08;

async function shoot(e) {
  state = 'shot';
  removeEventListener('pointermove', aim);
  hint.textContent = '';
  showAimButton(false);
  prepareGameOverAudio();
  await gunshotSound();

  makeHoles(e.clientX, e.clientY);
  const tl = gsap.timeline()
    .set(flash, { opacity: 0.9 })
    .to(flash, { opacity: 0, duration: 0.35 })
    .fromTo(screens.intro, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }, 0);
  if (activeGun) {
    activeGun.fire(e.clientX, e.clientY);
  } else {
    const pose = gunPose(e.clientX, e.clientY);
    gsap.killTweensOf(gun);
    gsap.set(gun, pose);
    tl.to(gun, { y: pose.y + 30, rotation: pose.rotation - 7, duration: 0.06, ease: 'power4.out' }, 0)
      .to(gun, { y: pose.y, rotation: pose.rotation, duration: 0.4, ease: 'power2.out' }, 0.06);
  }

  if (shotImgReady) {
    tl.add(() => swapFigure(SHOT_IMAGE), 0.1);
  } else {
    tl.to(sit, { rotation: 8, y: 20, opacity: 0.4, duration: 0.8, ease: 'power2.in' }, 0.3);
  }

  // hard cut to black, a beat of nothing, then the tragic scene
  tl.add(() => {
    gsap.set(cover, { backgroundColor: '#000', opacity: 1 });
    screens.intro.classList.add('hidden');
    activeGun?.hide(true);
  }, 1.0)
    .add(playTragic, 1.9);
}

/* ---------- tragic ---------- */
const cover = document.getElementById('cover');
const tragicPhoto = document.getElementById('tragic-photo');
const tragicLetters = document.querySelectorAll('#tragic-word span');
const vitalsWin = document.getElementById('vitals-win');
const bpmEl = document.getElementById('bpm');
const vitalStatus = document.getElementById('vital-status');
const vitalsLog = document.getElementById('vitals-log');
const ecg = document.getElementById('ecg');
const ecgCtx = ecg.getContext('2d');

// seconds into the scene = seconds into "dying heart beep.mp3": a beep every 1.0s from 0.04s,
// then the flatline tone from 8.04s to about 11.1s
const BEATS = [
  { t: 0.04, bpm: 72, status: 'stable' },
  { t: 1.04, bpm: 68, status: 'stable' },
  { t: 2.04, bpm: 63, status: 'stable' },
  { t: 3.04, bpm: 55, status: 'weak' },
  { t: 4.04, bpm: 47, status: 'weak' },
  { t: 5.04, bpm: 38, status: 'critical' },
  { t: 6.04, bpm: 29, status: 'critical' },
  { t: 7.04, bpm: 19, status: 'critical' },
];
const FLATLINE_AT = 8.04;
// the flat tone in the heartbeat file stops here: hard cut to black
const TONE_END = 11.1;

// one heartbeat (P, Q, R, S, T), d seconds from its peak; k < 1 squeezes it for fast heart rates
function heartbeat(d, k = 1) {
  const g = (mu, sigma, amp) => amp * Math.exp(-((d - mu) ** 2) / (2 * sigma ** 2));
  return g(-0.16 * k, 0.03 * k, 0.12) + g(-0.03 * k, 0.008, -0.15) + g(0, 0.012, 1) + g(0.03 * k, 0.01, -0.3) + g(0.24 * k, 0.05 * k, 0.2);
}

function ecgSignal(t) {
  let v = 0;
  for (const b of BEATS) v += heartbeat(t - b.t);
  return t < FLATLINE_AT ? v + (Math.random() - 0.5) * 0.02 : v;
}

// hospital-monitor sweep: draws left to right, wraps, erasing just ahead of the pen.
// signal(t) is the trace; from redFrom seconds on it's drawn in red.
function runEcg(clock, signal = ecgSignal, redFrom = BEATS.at(-2).t) {
  const W = ecg.width, H = ecg.height, SPEED = 190, STEP = 2 / SPEED, mid = H * 0.62;
  const yAt = t => mid - signal(t) * H * 0.5;
  let drawnT = 0, stopped = false;
  ecgCtx.clearRect(0, 0, W, H);
  ecgCtx.lineWidth = 2;
  ecgCtx.lineJoin = 'round';

  requestAnimationFrame(function frame(now) {
    if (stopped) return;
    const t = clock();
    ecgCtx.strokeStyle = t >= redFrom ? '#ff5f57' : '#111';
    ecgCtx.beginPath();
    ecgCtx.moveTo((drawnT * SPEED) % W, yAt(drawnT));
    for (let tt = drawnT + STEP; tt <= t; tt += STEP) {
      const x = (tt * SPEED) % W;
      if (x < STEP * SPEED) ecgCtx.moveTo(x, yAt(tt));
      else ecgCtx.lineTo(x, yAt(tt));
      ecgCtx.clearRect(x + 1, 0, 16, H);
      drawnT = tt;
    }
    ecgCtx.stroke();
    requestAnimationFrame(frame);
  });

  return () => { stopped = true; };
}

function typeLog(text) {
  vitalsLog.textContent = '';
  let i = 0;
  const id = setInterval(() => {
    vitalsLog.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(id);
  }, 22);
}

function playTragic() {
  screens.tragic.classList.remove('hidden');
  gsap.set(screens.tragic, { opacity: 1, x: 0 });
  gsap.set(tragicLetters, { opacity: 0 });
  gsap.set(vitalsWin, { opacity: 0, y: 20 });
  vitalsWin.classList.remove('critical');
  bpmEl.textContent = '--';
  vitalStatus.textContent = 'connecting';
  const tl = gsap.timeline();
  // the ECG draws from the same clock as the scene, which follows the heartbeat audio
  const stopEcg = runEcg(() => tl.time());
  tl.to(cover, { opacity: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
    // falling: sharp → soft, slow drift down and a slight turn
    .fromTo(tragicPhoto,
      { scale: 1.35, rotation: -8, y: -60, filter: 'blur(14px)' },
      { scale: 1.02, rotation: 4, y: 40, filter: 'blur(0px)', duration: FLATLINE_AT, ease: 'power1.out' }, 0)
    .to(vitalsWin, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0)
    .add(() => typeLog('> impact detected'), 0.3);

  BEATS.forEach((b, i) => {
    const intensity = 1 + i * 0.6;
    tl.add(() => {
      bpmEl.textContent = b.bpm;
      vitalStatus.textContent = b.status;
      if (b.status === 'critical') vitalsWin.classList.add('critical');
    }, b.t)
      // each beat thumps the whole scene, harder as it fails
      .to(tragicPhoto, { scale: `+=${0.018 * intensity}`, duration: 0.07, ease: 'power2.out' }, b.t)
      .to(tragicPhoto, { scale: `-=${0.018 * intensity}`, duration: 0.35, ease: 'power2.inOut' }, b.t + 0.07)
      .fromTo(screens.tragic, { x: -3 * intensity }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' }, b.t);
  });

  tl.add(() => typeLog('> pulse weakening'), BEATS[3].t)
    .add(() => typeLog('> blood pressure dropping'), BEATS[5].t)
    .add(() => typeLog('> ...'), BEATS[7].t)
    .add(() => {
      bpmEl.textContent = '0';
      vitalStatus.textContent = 'no signal';
      typeLog('> signal lost');
    }, FLATLINE_AT)
    // the flat tone, then the word slams in
    .fromTo(tragicLetters,
      { opacity: 0, y: -120, scale: 1.8, filter: 'blur(10px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.35, ease: 'power4.out', stagger: 0.07 },
      FLATLINE_AT + 0.7)
    .fromTo(screens.tragic, { x: -14 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.25)' }, FLATLINE_AT + 1.2)
    .to(vitalsWin, { opacity: 0.35, duration: 1 }, FLATLINE_AT + 1.2)

    // the tone stops: black. only his SOUL is left
    .add(() => {
      stopEcg();
      screens.tragic.classList.add('hidden');
      playGameOver(() => {
        gsap.timeline()
          .set(cover, { backgroundColor: '#fbfaf7', opacity: 0 })
          .to(cover, { opacity: 1, duration: 0.6, ease: 'power2.in' })
          .add(() => {
            gameover.classList.add('hidden');
            playAct3();
          });
      });
    }, TONE_END);
  playSynced(tl, HEARTBEAT_AUDIO);
}

/* ---------- game over: his SOUL breaks... but it refused ---------- */
const gameover = document.getElementById('gameover');
const soulEl = document.getElementById('soul');
const goTitle = document.getElementById('go-title');
const goRefused = document.getElementById('go-refused');

// a monster's SOUL: a white, upside-down heart
const SOUL = [
  '.....X.....',
  '....XXX....',
  '...XXXXX...',
  '..XXXXXXX..',
  '.XXXXXXXXX.',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  'XXXXX.XXXXX',
  '.XXX...XXX.',
];
// the jagged line it cracks along: the first column of the right half, row by row
const CRACK = [6, 5, 6, 5, 4, 5, 6, 5, 5, 5];
const SHARD_SHAPES = [['XX', 'X.'], ['.X', 'XX'], ['XXX', '.X.'], ['X.', 'XX', 'X.'], ['XX', 'XX'], ['X', 'X'], ['XX.', '.XX']];

// times (s) in undertale-soul-shatter.mp3: the crack, then the shatter ringing out until ~1.9s
const SOUL_SFX = { crack: 0.16, shatter: 1.46, ringOut: 1.9, length: 2.92 };
// played backwards, the same file swells into the shatter's peak, then ends on the crack
const FUSE = {
  gather: SOUL_SFX.length - SOUL_SFX.ringOut,
  whole: SOUL_SFX.length - SOUL_SFX.shatter,
  snap: SOUL_SFX.length - SOUL_SFX.crack - 0.06,
};
const SHARD_FLIGHT = 1.4;
const GRAVITY = 900;

function pixelSvg(grid, keep = () => true) {
  let rects = '';
  grid.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === 'X' && keep(x, y)) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
  }));
  return `<svg viewBox="0 0 ${grid[0].length} ${grid.length}" fill="#fff" shape-rendering="crispEdges">${rects}</svg>`;
}

soulEl.innerHTML =
  `<div class="soul-half">${pixelSvg(SOUL, (x, y) => x < CRACK[y])}</div>` +
  `<div class="soul-half">${pixelSvg(SOUL, (x, y) => x >= CRACK[y])}</div>` +
  SHARD_SHAPES.map(g => `<div class="soul-shard" style="width:calc(var(--px) * ${g[0].length});height:calc(var(--px) * ${g.length})">${pixelSvg(g)}</div>`).join('') +
  '<div class="soul-flash"></div>';
const soulHalves = [...soulEl.querySelectorAll('.soul-half')];
const soulFlash = soulEl.querySelector('.soul-flash');
const shards = [...soulEl.querySelectorAll('.soul-shard')].map(el => ({ el }));
const flight = { t: 0 };
const placeShards = () => shards.forEach(s => gsap.set(s.el, {
  x: s.sx + s.vx * flight.t,
  y: s.sy + s.vy * flight.t + 0.5 * GRAVITY * flight.t ** 2,
  rotation: s.spin * flight.t,
}));

// the reversed shatter needs Web Audio; the context is made on the gunshot click so it's allowed to play
let audioCtx = null;
let reversedShatter = null;
const getAudioCtx = () => (audioCtx ??= new (window.AudioContext || window.webkitAudioContext)());

async function loadReversed(src) {
  const buf = await getAudioCtx().decodeAudioData(await (await fetch(src)).arrayBuffer());
  for (let c = 0; c < buf.numberOfChannels; c++) buf.getChannelData(c).reverse();
  return buf;
}

function prepareGameOverAudio() {
  getAudioCtx().resume().catch(() => {});
  if (SOUL_SHATTER_AUDIO && !reversedShatter) reversedShatter = loadReversed(SOUL_SHATTER_AUDIO).catch(() => null);
}

// Undertale-style text blip
function blip() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), t = audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.value = 520;
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

// like playSynced, but for a decoded buffer (the reversed shatter) on the Web Audio clock
async function playSyncedBuffer(tl, bufferPromise) {
  tl.pause(0);
  const buf = await Promise.race([bufferPromise, sleep(400).then(() => null)]);
  if (!buf) return tl.play();
  const ctx = getAudioCtx();
  const node = ctx.createBufferSource();
  node.buffer = buf;
  node.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.05;
  node.start(t0);
  const follow = () => {
    const t = ctx.currentTime - t0;
    if (t >= buf.duration) {
      gsap.ticker.remove(follow);
      if (tl.progress() < 1) tl.play();
      return;
    }
    tl.time(Math.max(0, Math.min(t, tl.duration())));
  };
  gsap.ticker.add(follow);
}

function playGameOver(done) {
  const px = parseFloat(getComputedStyle(soulEl).getPropertyValue('--px'));
  gameover.classList.remove('hidden');
  gsap.set(gameover, { opacity: 1 });
  gsap.set(soulHalves, { x: 0, rotation: 0, autoAlpha: 1 });
  gsap.set(soulEl, { x: 0, scale: 1 });
  gsap.set(goTitle, { opacity: 0 });
  goRefused.textContent = '';
  gsap.set(goRefused, { opacity: 1 });
  shards.forEach(s => {
    s.sx = gsap.utils.random(-3, 3) * px;
    s.sy = gsap.utils.random(-3, 2) * px;
    s.vx = gsap.utils.random(-260, 260);
    s.vy = gsap.utils.random(-440, -160);
    s.spin = gsap.utils.random(-540, 540);
  });
  flight.t = 0;
  placeShards();
  gsap.set(shards.map(s => s.el), { autoAlpha: 0, xPercent: -50, yPercent: -50 });

  const { crack, shatter } = SOUL_SFX;
  const tl = gsap.timeline();
  // crack: it splits along the jagged line
  tl.to(soulHalves, { x: i => (i ? 0.5 : -0.5) * px, rotation: i => (i ? 4 : -4), duration: 0.08 }, crack)
    .fromTo(soulEl, { x: -4 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' }, crack)
    // shatter: the halves burst into shards that fly out and fall
    .set(soulHalves, { autoAlpha: 0 }, shatter)
    .set(shards.map(s => s.el), { autoAlpha: 1 }, shatter)
    .fromTo(flight, { t: 0 }, { t: SHARD_FLIGHT, duration: SHARD_FLIGHT, ease: 'none', onUpdate: placeShards, immediateRender: false }, shatter)
    .to(goTitle, { opacity: 1, duration: 1.2, ease: 'power1.in' }, 2.3)
    .to(goTitle, { opacity: 0, duration: 0.5 }, 4.1);

  const line = 'But it refused.';
  const typeAt = 4.7;
  [...line].forEach((ch, i) => tl.add(() => {
    goRefused.textContent = line.slice(0, i + 1);
    if (ch.trim()) blip();
  }, typeAt + i * 0.075));
  tl.add(() => playFuse(px, done), typeAt + line.length * 0.075 + 0.7);

  // a beat of just the SOUL on black before it cracks
  tl.pause(0);
  gsap.delayedCall(0.6, () => playSynced(tl, SOUL_SHATTER_AUDIO));
}

// ...and it pulls itself back together, to the break played in reverse
function playFuse(px, done) {
  const { gather, whole, snap } = FUSE;
  const tl = gsap.timeline({ onComplete: done });
  tl.to(flight, { t: SHARD_FLIGHT * 0.8, duration: gather, ease: 'sine.inOut', onUpdate: placeShards })
    .to(flight, { t: 0, duration: whole - gather, ease: 'power3.in', onUpdate: placeShards })
    .set(shards.map(s => s.el), { autoAlpha: 0 }, whole)
    .set(soulHalves, { autoAlpha: 1, x: i => (i ? 1.4 : -1.4) * px, rotation: i => (i ? 6 : -6) }, whole)
    .to(soulHalves, { x: i => (i ? 0.6 : -0.6) * px, rotation: i => (i ? 3 : -3), duration: snap - whole, ease: 'sine.in' }, whole)
    .fromTo(soulEl, { x: -1.5 }, { x: 1.5, duration: 0.05, ease: 'none', repeat: Math.floor((snap - whole) / 0.05) - 1, yoyo: true }, whole)
    // SNAP
    .to(soulHalves, { x: 0, rotation: 0, duration: 0.06, ease: 'power4.in' }, snap)
    .set(soulEl, { x: 0 }, snap + 0.06)
    .fromTo(soulFlash, { opacity: 1, scale: 0.3 }, { opacity: 0, scale: 1.4, duration: 0.9, ease: 'power2.out' }, snap + 0.06)
    .fromTo(soulEl, { scale: 1.4 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, snap + 0.06)
    .to(goRefused, { opacity: 0, duration: 0.6 }, snap + 0.7)
    // and it beats again
    .to(soulEl, { scale: 1.18, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out' }, snap + 1.3)
    .to(soulEl, { scale: 1.18, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out' }, snap + 1.6)
    .to({}, { duration: 0.5 });
  playSyncedBuffer(tl, reversedShatter);
}

/* ---------- speech bubbles outside the chat (act 3) ---------- */
// types the line into a bubble; nothing goes in the chat log
async function typeLine(bub, text) {
  const p = bub.querySelector('p');
  if (bub.hidden) {
    bub.hidden = false;
    gsap.fromTo(bub, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' });
  }
  p.textContent = '';
  for (const ch of text) {
    p.textContent += ch;
    await sleep(/[.?!,]/.test(ch) ? 130 : 24);
  }
}

// how long a finished line stays up before the next thing happens: longer lines get longer
const readTime = text => 450 + text.length * 14;

/* ---------- act 3: the deadpan reset (and the roast, for returning skippers) ---------- */
const stillLock = document.getElementById('still-lock');
const stillBubble = document.getElementById('still-bubble');
const ROAST = [
  'huh you wanted to skip this intro????',
  'Are you a new visitor looking at the device? no 🙂‍↔️',
  'Hey I specifically put a shortcut to skip the intro at the end of my Porto......',
  "You didn't read that did you",
];

// above his head if there's room under the nav, otherwise beside it
function placeStillBubble() {
  if (stillBubble.hidden) return;
  const r = screens.stillhere.querySelector('.still-fig').getBoundingClientRect();
  const bw = stillBubble.offsetWidth, bh = stillBubble.offsetHeight, top = r.top + r.height * 0.02;
  const above = top - bh - 14 >= 64;
  stillBubble.classList.toggle('side', !above);
  const x = above ? r.left + r.width * 0.55 - bw * 0.3 : r.left + r.width * 0.78;
  gsap.set(stillBubble, {
    left: Math.min(Math.max(x, 12), innerWidth - bw - 12),
    top: above ? top - bh - 14 : Math.max(64, r.top + r.height * 0.04),
  });
}

async function playAct3({ spared = false } = {}) {
  state = 'act3';
  const scene = screens.stillhere;
  const fig = scene.querySelector('.still-fig');
  const pulseSvg = scene.querySelector('.still-pulse');
  const pulse = pulseSvg.querySelector('path');
  const len = pulse.getTotalLength();
  const rest = scene.querySelectorAll('.still-title, .still-sub, #btn-enter');
  scene.classList.remove('hidden');
  gsap.set(scene, { opacity: 1 });
  gsap.set([pulseSvg, ...rest], { opacity: 0, y: 12 });
  gsap.set(pulse, { strokeDasharray: len, strokeDashoffset: len });
  stillBubble.hidden = true;
  gsap.ticker.add(placeStillBubble);

  // he fades back in, completely fine
  gsap.fromTo(fig, { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out' });
  await gsap.to(cover, { opacity: 0, duration: 1.4, ease: 'power2.out' });

  // if you spared him, the line under "still here." says so
  if (spared) scene.querySelector('.still-sub').textContent = SPARED_SUB;
  // someone who's been here before and mashed through the cutscenes gets told off first
  if (!spared && hasVisited && spam >= 4) {
    await sleep(300);
    for (const line of ROAST) {
      await typeLine(stillBubble, line);
      await sleep(readTime(line) + 250);
    }
  }

  markVisited();
  stillLock.classList.add('unlocked');
  stillLock.innerHTML = '<i class="pulse"></i>scroll unlocked';
  state = 'enter';
  gsap.timeline()
    .to(pulseSvg, { opacity: 1, y: 0, duration: 0.4 })
    .to(pulse, { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' }, 0)
    .to(rest, { opacity: 1, y: 0, stagger: 0.15, duration: 0.5, ease: 'power3.out' }, 0.3);
}

// "come in", or just scrolling once it's unlocked
function enterPortfolio() {
  if (state !== 'enter') return;
  state = 'done';
  // the gun's done its job: give its GPU memory back
  activeGun?.dispose();
  activeGun = null;
  hideScreen(screens.stillhere, () => {
    gsap.ticker.remove(placeStillBubble);
    unlockScroll();
    ScrollTrigger.refresh();
    document.getElementById('journey').scrollIntoView({ behavior: 'smooth' });
  });
}
document.getElementById('btn-enter').addEventListener('click', enterPortfolio);

/* ---------- built with: live line counts ---------- */
document.querySelectorAll('.built-lines').forEach(async el => {
  try {
    // server.js isn't served to the browser, so the server reports its own count
    const res = await fetch(el.dataset.lines || el.dataset.file);
    if (!res.ok) return;
    const lines = el.dataset.lines ? (await res.json()).lines : (await res.text()).split('\n').length;
    el.textContent = `${lines} lines`;
  } catch {}
});

/* ---------- portfolio panel reveals ---------- */
document.querySelectorAll('.panel').forEach(panel => {
  gsap.to(panel, {
    opacity: 1, y: 0, duration: 1,
    scrollTrigger: { trigger: panel, start: 'top 80%' },
  });
});

/* ---------- journey: the sitting figure breathes and leans toward the year you look at ---------- */
const journeyMe = document.querySelector('.journey-me img');
gsap.to(journeyMe, { scaleY: 1.015, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
gsap.fromTo(journeyMe, { rotation: -0.6 }, { rotation: 0.6, duration: 5.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
gsap.from('.journey-me', {
  x: 60, opacity: 0, duration: 1.1, ease: 'power3.out',
  scrollTrigger: { trigger: '#journey', start: 'top 70%' },
});
const lean = gsap.quickTo('.journey-me', 'rotation', { duration: 0.8, ease: 'power3' });
const leanX = gsap.quickTo('.journey-me', 'x', { duration: 0.8, ease: 'power3' });
gsap.set('.journey-me', { transformOrigin: '70% 100%' });
document.querySelectorAll('.m-drag').forEach(card => {
  card.addEventListener('pointerenter', () => { lean(-2.5); leanX(-6); });
  card.addEventListener('pointerleave', () => { lean(0); leanX(0); });
});

/* ---------- journey: the murder board. red string between the pins, papers you can move ---------- */
(() => {
  const items = document.querySelector('.mading-items');
  const svg = document.querySelector('.m-strings');
  if (!items || !svg) return;
  const papers = [...items.querySelectorAll('.m-drag')];
  const anchors = papers.map(p => p.querySelector('.m-anchor'));
  const index = Object.fromEntries(papers.map((p, i) => [p.dataset.id, i]));
  // [from, to] pairs, by paper index, from each paper's data-links
  const links = papers.flatMap((p, i) => (p.dataset.links || '').split(/\s+/)
    .filter(id => id in index).map(id => [i, index[id]]));

  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs, parent = svg) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return parent.appendChild(el);
  };
  // the string's shadow on the cork, then the string
  const shadows = links.map(() => make('path', { class: 'm-string-shadow' }));
  const strings = links.map(() => make('path', { class: 'm-string' }));

  // pin to pin (the centre of each paper's pin), with a little sag in the middle
  function draw() {
    const box = items.getBoundingClientRect();
    const pts = anchors.map(a => {
      const r = a.getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    });
    links.forEach(([a, b], i) => {
      const [x1, y1] = pts[a], [x2, y2] = pts[b];
      const sag = Math.hypot(x2 - x1, y2 - y1) * 0.06;
      const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2 + sag).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      strings[i].setAttribute('d', d);
      shadows[i].setAttribute('d', d);
    });
  }
  // redraw every frame while the board is on screen: papers move, pop in, lift on hover
  let raf = 0;
  const loop = () => { draw(); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(raf);
    if (entry.isIntersecting) loop();
  }).observe(items);

  // dragging. With a mouse it starts straight away; on a touch screen it takes a short hold,
  // so a swipe across the board still scrolls the page
  let top = 20, drag = null;
  papers.forEach(p => p.addEventListener('pointerdown', e => {
    if (e.button !== 0 || drag) return;
    const d = { id: e.pointerId, el: p, x: e.clientX, y: e.clientY, left: p.offsetLeft, top: p.offsetTop, on: false, timer: 0, vx: 0, lastX: e.clientX };
    const begin = () => {
      d.on = true;
      p.classList.add('is-dragging');
      p.style.zIndex = ++top;
      try { p.setPointerCapture(d.id); } catch {}
    };
    if (e.pointerType === 'touch') d.timer = setTimeout(begin, 230);
    else { e.preventDefault(); begin(); }
    drag = d;
  }));
  addEventListener('pointermove', e => {
    const d = drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.hypot(dx, dy) > 8) { clearTimeout(d.timer); drag = null; } // that was a scroll
      return;
    }
    const W = items.clientWidth, H = items.clientHeight, w = d.el.offsetWidth, h = d.el.offsetHeight;
    // it can hang off the edge a little, never off the board
    const left = Math.min(Math.max(d.left + dx, -w * 0.25), W - w * 0.75);
    const topPx = Math.min(Math.max(d.top + dy, -h * 0.1), H - h * 0.5);
    d.el.style.left = `${(left / W) * 100}%`;
    d.el.style.top = `${(topPx / H) * 100}%`;
    d.vx = e.clientX - d.lastX;
    d.lastX = e.clientX;
  });
  const drop = e => {
    const d = drag;
    if (!d || e.pointerId !== d.id) return;
    clearTimeout(d.timer);
    drag = null;
    if (!d.on) return;
    d.el.classList.remove('is-dragging');
    // it swings on its pin when you let go
    gsap.fromTo(d.el, { rotation: gsap.utils.clamp(-9, 9, d.vx * 0.9) },
      { rotation: 0, duration: 1, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' });
  };
  addEventListener('pointerup', drop);
  addEventListener('pointercancel', drop);
  // once a touch drag has started, the finger moves the paper, not the page
  document.addEventListener('touchmove', e => { if (drag && drag.on) e.preventDefault(); }, { passive: false });

  // the papers get pinned up one after another as the board scrolls in
  gsap.from(papers, {
    y: 46, opacity: 0, rotation: i => (i % 2 ? 7 : -7), duration: 0.7, stagger: 0.09, ease: 'back.out(1.7)',
    clearProps: 'transform,opacity',
    scrollTrigger: { trigger: '.mading', start: 'top 72%' },
  });
})();

/* ---------- toolkit: cards rise into his hand and fan out, merge, then flip to the next deck ---------- */
(() => {
  const section = document.getElementById('tools');
  const deck = section.querySelector('.tk-deck');
  const web = [...section.querySelectorAll('.tk-card[data-deck="web"]')];
  const art = [...section.querySelectorAll('.tk-card[data-deck="art"]')];
  const subWeb = section.querySelector('.tk-sub-web');
  const subArt = section.querySelector('.tk-sub-art');

  // where card i sits when k cards are out: centred fan, outer cards tilt and dip
  const slot = (i, k) => {
    const w = web[0].offsetWidth;
    const o = i - (k - 1) / 2;
    return { x: o * w * (innerWidth < 760 ? 0.52 : 0.72), y: o * o * w * 0.05, rotation: o * 5 };
  };

  gsap.set([...web, ...art], { yPercent: 260, rotation: i => (i % 2 ? 10 : -10) });
  gsap.set(art, { autoAlpha: 0 });
  gsap.set(subArt, { yPercent: 100, autoAlpha: 0 });

  const tl = gsap.timeline({
    defaults: { duration: 1, ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + innerHeight * 5,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });

  // each new card pops up from the bottom into the middle; the ones already out shuffle left
  const fan = (cards, from) => {
    for (let k = from; k <= cards.length; k++) {
      const at = tl.duration();
      cards.slice(0, k).forEach((card, i) => {
        tl.to(card, {
          x: () => slot(i, k).x, y: () => slot(i, k).y, rotation: () => slot(i, k).rotation, yPercent: 0,
          ease: i === k - 1 ? 'back.out(1.3)' : 'power2.inOut',
        }, at);
      });
    }
  };

  fan(web, 1);
  tl.to({}, { duration: 0.5 })
    // gather into one stack...
    .to(web, { x: 0, y: 0, rotation: i => (i - (web.length - 1) / 2) * 1.5, duration: 0.8 })
    // ...and flip it over to the art deck
    .to(deck, { rotationY: 90, duration: 0.4, ease: 'power1.in' })
    .to(subWeb, { yPercent: -100, autoAlpha: 0, duration: 0.4 }, '<')
    .set(web, { autoAlpha: 0 })
    .set(art[0], { autoAlpha: 1, x: 0, y: 0, yPercent: 0, rotation: 0 })
    .fromTo(deck, { rotationY: -90 }, { rotationY: 0, duration: 0.4, ease: 'power1.out', immediateRender: false })
    .to(subArt, { yPercent: 0, autoAlpha: 1, duration: 0.4 }, '<')
    .set(art.slice(1), { autoAlpha: 1 });
  fan(art, 2);
  tl.to({}, { duration: 0.6 });
})();

/* ---------- projects: split letters, spring physics on scroll, images pop out on hover ---------- */
// Add image paths per project; hovering a letter cycles through them. Empty = placeholder tiles.
const PROJECT_IMAGES = {
  drawing: [],
  animations: [],
  background: [],
  web: ['assets/image1_WEB.PNG', 'assets/image2_WEB.PNG', 'assets/image3_WEB.PNG'],
};
const PLACEHOLDER_TINTS = ['#f1efea', '#e9eef5', '#f5ebe9', '#eaf2ea', '#f3eef7'];

const projectRows = [...document.querySelectorAll('.project')].map(row => {
  const title = row.querySelector('.project-title');
  const text = title.textContent.trim();
  title.setAttribute('aria-label', text);
  title.replaceChildren(...[...text].map(ch => {
    const letter = document.createElement('span');
    letter.className = 'project-letter';
    letter.setAttribute('aria-hidden', 'true');
    const content = document.createElement('span');
    content.className = 'project-letter__content';
    content.textContent = ch === ' ' ? ' ' : ch;
    letter.append(content);
    return letter;
  }));
  const letters = [...title.querySelectorAll('.project-letter')];
  return {
    row,
    letters,
    contents: letters.map(l => l.firstChild),
    // each letter hangs a little differently, so they fall out of line when you scroll
    bodies: letters.map(() => ({ y: 0, vy: 0, weight: gsap.utils.random(0.55, 1.45) })),
  };
});

// rise in, one title after another, tied to scroll position
projectRows.forEach(({ letters }, i) => {
  gsap.from(letters, {
    yPercent: 60, autoAlpha: 0, stagger: 0.03, ease: 'power2.out',
    scrollTrigger: { trigger: '.project-list', start: `top ${88 - i * 6}%`, end: `top ${58 - i * 6}%`, scrub: true },
  });
});

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  let scrollVelocity = 0;
  let running = false;
  ScrollTrigger.create({
    trigger: '#projects',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: self => { running = self.isActive; },
    onUpdate: self => { scrollVelocity = gsap.utils.clamp(-4000, 4000, self.getVelocity()); },
  });

  // fixed 60fps sub-steps keep the springs stable even when frames are slow
  const step = bodies => {
    const ys = bodies.map(b => b.y);
    bodies.forEach((b, i) => {
      const prev = ys[i - 1] ?? ys[i];
      const next = ys[i + 1] ?? ys[i];
      const target = scrollVelocity * 0.012 * b.weight;
      const accel = (target - b.y) * 0.08 + (prev + next - 2 * b.y) * 0.12 - b.vy * 0.14;
      b.vy += accel;
      b.y += b.vy;
    });
  };

  gsap.ticker.add((_, deltaMs) => {
    if (!running) return;
    const steps = Math.min(4, Math.max(1, Math.round(deltaMs / 16.67)));
    projectRows.forEach(({ letters, bodies }) => {
      const n = bodies.length;
      for (let s = 0; s < steps; s++) step(bodies);
      letters.forEach((el, i) => {
        const slope = (bodies[Math.min(i + 1, n - 1)].y - bodies[Math.max(i - 1, 0)].y);
        gsap.set(el, { y: bodies[i].y, rotation: gsap.utils.clamp(-28, 28, slope * 0.9) });
      });
    });
    scrollVelocity *= Math.pow(0.86, steps);
  });
}

// hover a letter (tap it on a phone): an image pops out of it and the neighbours make room
const popOn = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'mouseenter' : 'click';
document.getElementById('projects-hint').textContent = popOn === 'click' ? 'tap a letter to peek' : 'hover a letter to peek';
{
  projectRows.forEach(({ row, contents }) => {
    const images = PROJECT_IMAGES[row.dataset.project] || [];
    const gaps = contents.map(() => 0);
    let shown = 0;

    const spread = () => {
      const offsets = gaps.map((_, i) => gaps.slice(0, i).reduce((a, b) => a + b, 0) - gaps.slice(i + 1).reduce((a, b) => a + b, 0));
      gsap.to(contents, { x: i => offsets[i], duration: 0.3, ease: 'back.out(3)', overwrite: 'auto' });
    };

    contents.forEach((content, i) => {
      if (!content.textContent.trim()) return;
      content.addEventListener(popOn, () => {
        if (content.querySelector('.project-letter__image')) return;
        let pop;
        if (images.length) {
          pop = document.createElement('img');
          pop.src = images[shown % images.length];
          pop.alt = '';
          pop.className = 'project-letter__image' + (/portrait/.test(pop.src) ? ' is-portrait' : '');
        } else {
          pop = document.createElement('span');
          pop.className = 'project-letter__image placeholder';
          pop.style.setProperty('--tile', PLACEHOLDER_TINTS[shown % PLACEHOLDER_TINTS.length]);
          pop.textContent = 'image coming soon';
        }
        shown++;
        content.append(pop);
        gsap.set(pop, { xPercent: -50, yPercent: -50 });
        const want = pop.offsetWidth * 0.92;
        gaps[i] = Math.max(0, (want - content.offsetWidth) / 2);
        spread();
        gsap.from(pop, { rotation: gsap.utils.random(-10, 10), scale: 0.6, duration: 0.3, ease: 'back.out(2)' });

        gsap.delayedCall(1.2, () => {
          pop.remove();
          gaps[i] = 0;
          spread();
          gsap.from(content, { rotation: gsap.utils.random(-10, 10), scale: 1.05, duration: 0.3, ease: 'back.out(2)' });
        });
      });
    });
  });
}

/* ---------- contact form: hands the message to the visitor's email app ---------- */
const EMAIL = 'seinhilamoviramadhan@gmail.com';
document.getElementById('contact-form').addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const body = e.target.querySelector('textarea').value.trim();
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('hi sein')}&body=${encodeURIComponent(body)}`;
  const original = btn.textContent;
  btn.textContent = 'opening mail...';
  setTimeout(() => (btn.textContent = original), 2500);
});

/* ---------- guestbook ---------- */
const gbForm = document.getElementById('gb-form');
const gbList = document.getElementById('gb-list');
const gbStatus = document.getElementById('gb-status');
const gbLeft = document.getElementById('gb-left');
const gbMessage = gbForm.elements.message;

function gbSay(text, isError = false) {
  gbStatus.textContent = text;
  gbStatus.classList.toggle('err', isError);
}

function gbEntry({ name, message, at }) {
  const li = document.createElement('li');
  li.className = 'gb-entry';
  const head = document.createElement('p');
  head.className = 'gb-head';
  const who = document.createElement('b');
  who.textContent = name;
  const when = document.createElement('time');
  when.dateTime = new Date(at).toISOString();
  when.textContent = new Date(at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  head.append('★ ', who, when);
  const msg = document.createElement('p');
  msg.className = 'gb-msg';
  msg.textContent = message;
  li.append(head, msg);
  return li;
}

function gbEmpty(text) {
  const li = document.createElement('li');
  li.className = 'gb-empty';
  li.textContent = text;
  gbList.replaceChildren(li);
}

(async () => {
  try {
    const res = await fetch('/api/guestbook');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.entries.length) gbList.replaceChildren(...data.entries.map(gbEntry));
    else gbEmpty('no signatures yet. be the first.');
  } catch (err) {
    gbEmpty(err.message || "couldn't open the guestbook");
  }
})();

gbMessage.addEventListener('input', () => { gbLeft.textContent = `${140 - gbMessage.value.length} left`; });

gbForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = gbForm.querySelector('button');
  btn.disabled = true;
  gbSay('signing...');
  try {
    const res = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(gbForm))),
    });
    if (res.status === 204) return gbSay('thanks for signing ( ˘ ³˘)');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (!gbList.querySelector('.gb-entry')) gbList.replaceChildren();
    const li = gbEntry(data.entry);
    gbList.prepend(li);
    gsap.from(li, { opacity: 0, y: -10, duration: 0.4 });
    gbForm.reset();
    gbLeft.textContent = '140 left';
    gbSay('thanks for signing ( ˘ ³˘)');
  } catch (err) {
    gbSay(err.message || "couldn't sign, try again", true);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- chaos mode: the whole site glitches harder ---------- */
const chaosToggles = document.querySelectorAll('.chaos-toggle');
const CHAOS_TARGETS = 'h2, .win, .float-win, .m-item, .m-mast, .project, .logo, .eyebrow, .bubble, #sit, .tk-card, .tk-me, .gb, .now-line, .now-slot, .journey-me, .still-fig, .hero-figure, .hero-title, .sticker, .site-footer, .repo-link';
let chaosTimer = null;

function setChaos(on, loud = false) {
  document.documentElement.classList.toggle('chaos', on);
  chaosToggles.forEach(b => b.setAttribute('aria-pressed', on));
  try { localStorage.setItem('chaos', on ? '1' : ''); } catch {}
  clearTimeout(chaosTimer);
  if (on && loud) playAudio(GLITCH_AUDIO);
  if (on && !reduceMotion) chaosTick();
}

function onScreen(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}

function chaosTick() {
  if (!bossIsOpen() && !document.hidden) {
    const visible = [...document.querySelectorAll(CHAOS_TARGETS)].filter(onScreen);
    gsap.utils.shuffle(visible).slice(0, gsap.utils.random(1, 3, 1)).forEach(el => {
      el.style.setProperty('--jx', `${gsap.utils.random(-18, 18, 1)}px`);
      el.classList.remove('jolt');
      void el.offsetWidth;
      el.classList.add('jolt');
      el.addEventListener('animationend', () => el.classList.remove('jolt'), { once: true });
    });
    // now and then the whole screen tears
    if (Math.random() < 0.18) {
      const tear = document.createElement('div');
      tear.className = 'chaos-tear';
      const bands = [];
      for (let i = 0; i < 4; i++) {
        const y = gsap.utils.random(0, 95), h = gsap.utils.random(1, 5);
        const c = pick(['#ff2a55', '#00d5ff', '#ffffff', '#ffc93c']);
        bands.push(`linear-gradient(${c},${c}) 0 ${y}%/100% ${h}% no-repeat`);
      }
      tear.style.background = bands.join(',');
      document.body.append(tear);
      setTimeout(() => tear.remove(), gsap.utils.random(60, 140));
    }
  }
  chaosTimer = setTimeout(chaosTick, gsap.utils.random(220, 900));
}

// with a gun out, clicking the switch is a shot at it (see shootUI), not a toggle
chaosToggles.forEach(b => b.addEventListener('click', () => { if (state !== 'aiming') setChaos(!document.documentElement.classList.contains('chaos'), true); }));
try { if (localStorage.getItem('chaos')) setChaos(true); } catch {}

/* ---------- ?skip=1: the shortcut in the footer, straight to the portfolio ---------- */
if (new URLSearchParams(location.search).get('skip') === '1') {
  state = 'done';
  markVisited();
  hero.remove();
  screens.intro.classList.add('hidden');
  unlockScroll();
  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    document.getElementById('journey').scrollIntoView();
  });
}
