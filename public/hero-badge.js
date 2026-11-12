/* ---------- hero: the committee ID on a lanyard (three.js) ----------
   It hangs where the sein.png window was. Drag it around; click it and he holds it up so you can
   read the back. If WebGL or the CDN isn't there, the sein.png window just stays. */
import * as THREE from 'three';

const hero = document.getElementById('hero');
const slot = hero && hero.querySelector('.hero-figure');
const gsap = window.gsap;

const INK = '#1b1a17', PAPER = '#fffdf6', CREAM = '#f3ecdc', MUSTARD = '#ffc93c';
const LILAC = '#9b8cff', TEAL = '#2bb3a3', TOMATO = '#ff6b4a', MUTED = '#8a877f', CHECK = '#ebe4d2';

// the card art is drawn at 600 × 952 px (an ID card standing up). In 3D, 1 unit = the card's height.
const TW = 600, TH = 952, U = 1 / TH;
const CARD_W = TW * U;
const DEPTH = 0.012;
const RADIUS = 34 * U;
const HOLE = { y: 0.5 - 43 * U, w: 120 * U, h: 26 * U };
const CLIP = { w: 128 * U, h: 150 * U };
const ATTACH = 0.5 + 58 * U;         // where the strap meets the clip, just above the top edge
const SPAN = ATTACH + 0.5;           // clip to bottom edge
const ID = 'SEIN-2026-001';

if (hero && slot && gsap && hasWebGL()) start().catch(err => console.warn('[badge]', err));

async function start() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const [photo] = await Promise.all([
    loadImage('assets/stand.png'),
    Promise.all(['800 40px Inter', '600 40px Inter', 'italic 40px "Instrument Serif"', '40px VT323']
      .map(f => document.fonts.load(f))).catch(() => {}),
  ]);
  if (!hero.isConnected || hero.hidden) return; // they already scrolled past the hero

  /* ----- dom ----- */
  const canvas = el('canvas', 'badge-canvas');
  const hint = el('p', 'badge-hint', touch ? '↖ drag · tap' : '↖ drag me · click to show');
  const dim = el('div', 'badge-dim');
  dim.append(el('p', '', touch ? 'tap anywhere to put it back' : 'click anywhere to put it back · esc'));
  [canvas, hint, dim].forEach(n => n.setAttribute('aria-hidden', 'true'));
  const a11y = el('button', 'badge-a11y', "show Sein's ID card");
  a11y.type = 'button';
  hero.querySelector('.hero-inner').before(canvas, hint, dim);
  slot.after(a11y);

  /* ----- three ----- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const disposables = [];
  const tex = c => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    disposables.push(t);
    return t;
  };
  const mat = opts => { const m = new THREE.MeshBasicMaterial(opts); disposables.push(m); return m; };
  const geo = g => { disposables.push(g); return g; };

  // the card: a thin ink slab (it reads as the 2px borders everywhere else) with art on both faces
  const shape = roundRectPath(new THREE.Shape(), 0, 0, CARD_W, 1, RADIUS);
  shape.holes.push(roundRectPath(new THREE.Path(), 0, HOLE.y, HOLE.w, HOLE.h, HOLE.h / 2));
  const slabGeo = geo(new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false, curveSegments: 10 }));
  slabGeo.translate(0, 0, -DEPTH / 2);
  const faceGeo = geo(new THREE.PlaneGeometry(CARD_W, 1));

  // only the slab's edges are drawn: its flat caps would fight the art faces for depth
  const slab = new THREE.Mesh(slabGeo, [mat({ visible: false }), mat({ color: INK })]);
  const front = new THREE.Mesh(faceGeo, mat({ map: tex(drawFront(photo)), alphaTest: 0.5 }));
  front.position.z = DEPTH / 2 + 0.0004;
  const back = new THREE.Mesh(faceGeo, mat({ map: tex(drawBack(photo)), alphaTest: 0.5 }));
  back.rotation.y = Math.PI;
  back.position.z = -DEPTH / 2 - 0.0004;
  const clip = new THREE.Mesh(geo(new THREE.PlaneGeometry(CLIP.w, CLIP.h)),
    mat({ map: tex(drawClip()), alphaTest: 0.5, side: THREE.DoubleSide }));
  clip.position.set(0, ATTACH - CLIP.h / 2, DEPTH / 2 + 0.002);

  // a hard offset shadow, like every box-shadow in the hero. It lives on the card's back plane so
  // it can never poke through the front when the card twists.
  // Drawn first and without depth, so the card always covers it.
  const shadow = new THREE.Mesh(geo(new THREE.ShapeGeometry(shape, 10)), mat({ color: INK, depthTest: false, depthWrite: false }));
  shadow.renderOrder = -1;
  shadow.position.z = -DEPTH / 2 - 0.006;

  const card = new THREE.Group();
  card.rotation.order = 'ZYX'; // z last, in screen space: it's what turns the card sideways when shown
  card.add(shadow, slab, front, back, clip);

  // the strap: a ribbon rebuilt every frame along the rope
  const strapCanvas = drawStrap();
  const strapTex = tex(strapCanvas);
  strapTex.wrapS = THREE.RepeatWrapping;
  const SEG = 64;
  const rPos = new Float32Array((SEG + 1) * 6), rUv = new Float32Array((SEG + 1) * 4);
  const ribbonGeo = geo(new THREE.BufferGeometry());
  const index = [];
  for (let i = 0; i < SEG; i++) { const a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  ribbonGeo.setIndex(index);
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(rUv, 2).setUsage(THREE.DynamicDrawUsage));
  const ribbon = new THREE.Mesh(ribbonGeo, mat({ map: strapTex, side: THREE.DoubleSide }));
  ribbon.frustumCulled = false;

  scene.add(ribbon, card);

  /* ----- rope physics (verlet), in css pixels: x right, y up, origin at the hero's centre ----- */
  const N = 16, DT = 1 / 120, G = 2600, ITER = 14;
  let W = 0, H = 0, size = 0, seg = 0, span = 0, strapW = 0;
  const anchor = { x: 0, y: 0 };
  let pts = [], B = null;          // pts[N] is the clip; B is the card's bottom edge
  let yaw = 0, yawV = 0;           // the card twisting on the strap
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const view = { open: 0 };        // 0 hanging -> 1 held up, showing the back
  let mode = 'hang', drag = null, down = null, touched = false, time = 0;

  function layout(fresh) {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // at z = 0, one unit is one css pixel
    camera.position.z = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // a tight near/far keeps depth precise around z = 0, where everything lives
    camera.near = camera.position.z * 0.4;
    camera.far = camera.position.z * 1.6;
    camera.updateProjectionMatrix();

    const s = slot.getBoundingClientRect();
    const wide = innerWidth > 900;
    const prev = size;
    size = wide ? clamp(H * 0.5, 240, 430) : clamp(s.height * 1.08, 150, 340);
    strapW = clamp(size * 0.085, 16, 34);
    span = SPAN * size;
    const cx = s.left - r.left + s.width / 2 - W / 2;
    const cy = H / 2 - (s.top - r.top + s.height / 2);
    anchor.x = cx;
    anchor.y = H / 2 + 24;                       // just above the top edge, under the menu bar
    const restY = cy + ATTACH * size;            // the clip, with the card centred on the slot
    seg = Math.max(anchor.y - restY, 40) / N;

    if (fresh || Math.abs(prev - size) > 1 || !pts.length) {
      pts = [];
      // a fresh start drops it in from above the screen; a resize just re-hangs it
      const lift = fresh && !reduced ? N * seg + span + 80 : 0;
      for (let i = 0; i <= N; i++) {
        const y = anchor.y - i * seg + (i ? lift : 0);
        pts.push({ x: anchor.x, y, ox: anchor.x, oy: y });
      }
      const t = pts[N];
      B = { x: t.x + (lift ? 26 : 0), y: t.y - span, ox: t.x, oy: t.y - span };
    }
  }

  function step() {
    time += DT;
    const damp = 0.991;
    for (let i = 1; i <= N + 1; i++) {
      const p = i <= N ? pts[i] : B;
      let vx = (p.x - p.ox) * damp, vy = (p.y - p.oy) * damp;
      const sp = Math.hypot(vx, vy);
      if (sp > 70) { vx *= 70 / sp; vy *= 70 / sp; }
      p.ox = p.x; p.oy = p.y;
      p.x += vx;
      p.y += vy - G * DT * DT;
    }
    // a little air in the room
    if (!reduced && !drag) B.x += Math.sin(time * 0.9) * 0.012 + Math.sin(time * 2.3) * 0.004;

    const t = pts[N];
    for (let k = 0; k < ITER; k++) {
      pts[0].x = anchor.x; pts[0].y = anchor.y;
      // the strap can go slack but never stretch
      for (let i = 0; i < N; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
        if (d <= seg) continue;
        const diff = (d - seg) / d, wa = i ? 0.5 : 0, wb = i ? 0.5 : 1;
        a.x += dx * diff * wa; a.y += dy * diff * wa;
        b.x -= dx * diff * wb; b.y -= dy * diff * wb;
      }
      // the card is rigid, and heavier than the strap
      {
        const dx = B.x - t.x, dy = B.y - t.y, d = Math.hypot(dx, dy) || 1e-6, diff = (d - span) / d;
        t.x += dx * diff * 0.3; t.y += dy * diff * 0.3;
        B.x -= dx * diff * 0.7; B.y -= dy * diff * 0.7;
      }
      // held: the grabbed point goes where the pointer is
      if (drag) {
        const ex = drag.x - (t.x + (B.x - t.x) * drag.s), ey = drag.y - (t.y + (B.y - t.y) * drag.s);
        t.x += ex; t.y += ey; B.x += ex; B.y += ey;
      }
    }

    // sideways speed twists the card on its strap, a spring brings it back
    const vx = B.x - B.ox;
    yawV += (-34 * yaw - 2.2 * yawV + vx * 5) * DT;
    yaw = clamp(yaw + yawV * DT, -1.3, 1.3);
  }

  /* ----- drawing ----- */
  const tmp = new THREE.Vector3();
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: N + 1 }, () => new THREE.Vector3()), false, 'centripetal');
  const shown = () => Math.min(W * 0.86, 680, (H * 0.7) / CARD_W); // card height when held up (it's sideways)

  function place() {
    const t = pts[N];
    let dx = B.x - t.x, dy = B.y - t.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const k = view.open;
    const theta = Math.atan2(dx, -dy);
    tilt.x += (tilt.tx - tilt.x) * 0.12;
    tilt.y += (tilt.ty - tilt.y) * 0.12;

    card.position.set(lerp(t.x + dx * ATTACH * size, 0, k), lerp(t.y + dy * ATTACH * size, 6, k), 0);
    card.rotation.set(tilt.x, lerp(yaw, Math.PI, k) + tilt.y, lerp(theta, -Math.PI / 2, k));
    card.scale.setScalar(lerp(size, shown(), k));
    card.updateMatrixWorld();

    // ~7px down-right on screen, whichever way the card has turned
    const off = 7 / card.scale.x;
    const cz = Math.cos(card.rotation.z), sz = Math.sin(card.rotation.z);
    const flipped = Math.cos(card.rotation.y) < 0 ? -1 : 1; // showing its back: behind is the other side
    shadow.position.set((off * cz - off * sz) * flipped, -off * sz - off * cz, -(DEPTH / 2 + 0.006) * flipped);

    // the strap follows the clip wherever the card is shown
    const clipAt = card.localToWorld(tmp.set(0, ATTACH, 0));
    const ox = clipAt.x - t.x, oy = clipAt.y - t.y;
    curve.points.forEach((p, i) => {
      const f = i / N, w = f * f * (3 - 2 * f);
      p.set(pts[i].x + ox * w, pts[i].y + oy * w, -1 + (clipAt.z - 1) * w * k);
    });
    const sm = curve.getSpacedPoints(SEG);
    const texLen = strapW * (strapCanvas.width / strapCanvas.height);
    let along = 0;
    for (let j = 0; j <= SEG; j++) {
      const a = sm[Math.max(j - 1, 0)], b = sm[Math.min(j + 1, SEG)], p = sm[j];
      const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      const nx = -ty / l * strapW / 2, ny = tx / l * strapW / 2;
      if (j) along += p.distanceTo(sm[j - 1]);
      rPos.set([p.x + nx, p.y + ny, p.z, p.x - nx, p.y - ny, p.z], j * 6);
      rUv.set([along / texLen, 1, along / texLen, 0], j * 4);
    }
    ribbonGeo.attributes.position.needsUpdate = true;
    ribbonGeo.attributes.uv.needsUpdate = true;

    // the hint sits off the card's bottom-right corner until they've played with it
    if (!touched) {
      const c = card.localToWorld(tmp.set(CARD_W / 2, -0.42, 0));
      const hx = Math.min(c.x + W / 2 + 12, W - hint.offsetWidth - 8);
      hint.style.transform = `translate(${hx}px, ${H / 2 - c.y}px)`;
    }
  }

  const render = () => renderer.render(scene, camera);

  /* ----- pointer ----- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const toWorld = e => {
    const r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left - W / 2, y: H / 2 - (e.clientY - r.top), nx: ((e.clientX - r.left) / W) * 2 - 1, ny: -((e.clientY - r.top) / H) * 2 + 1 };
  };
  function pick(e) {
    const p = toWorld(e);
    ndc.set(p.nx, p.ny);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([slab, front, back, clip], false)[0];
    if (!hit) return null;
    const local = card.worldToLocal(hit.point.clone());
    return { s: clamp((ATTACH - local.y) / SPAN, 0, 1), lx: local.x, ly: local.y };
  }

  function retire() {
    if (touched) return;
    touched = true;
    hint.classList.remove('show');
  }

  function open() {
    if (mode !== 'hang') return;
    mode = 'open';
    retire();
    drag = null;
    hero.classList.add('badge-open');
    a11y.setAttribute('aria-expanded', 'true');
    gsap.to(view, { open: 1, duration: reduced ? 0.2 : 0.95, ease: 'power3.inOut', overwrite: true });
  }
  function close() {
    if (mode !== 'open') return;
    mode = 'hang';
    hero.classList.remove('badge-open');
    a11y.setAttribute('aria-expanded', 'false');
    tilt.tx = tilt.ty = 0;
    gsap.to(view, { open: 0, duration: reduced ? 0.2 : 0.8, ease: 'power3.inOut', overwrite: true });
  }

  const onDown = e => {
    if (e.button !== 0 || hero.hidden) return;
    if (mode === 'open') { e.preventDefault(); close(); return; }
    if (view.open > 0.01 || e.target.closest('a, button, input, textarea')) return;
    const hit = pick(e);
    if (!hit) return;
    e.preventDefault();
    hero.setPointerCapture(e.pointerId);
    hero.classList.add('badge-grab');
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, s: hit.s, moved: false };
  };
  const onMove = e => {
    if (down && e.pointerId === down.id) {
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
        down.moved = true;
        retire();
        hero.classList.add('badge-dragging');
      }
      if (down.moved) {
        const p = toWorld(e);
        // it's on a strap: you can only pull it so far
        const reach = N * seg + span * down.s + 30;
        const dx = p.x - anchor.x, dy = p.y - anchor.y, d = Math.hypot(dx, dy);
        const f = d > reach ? reach / d : 1;
        drag = { s: down.s, x: anchor.x + dx * f, y: anchor.y + dy * f };
      }
      return;
    }
    if (touch) return;
    if (mode === 'open') {
      const p = toWorld(e);
      tilt.tx = -p.ny * 0.18;
      tilt.ty = p.nx * 0.22;
      return;
    }
    const hit = view.open < 0.01 && !e.target.closest('a, button') ? pick(e) : null;
    hero.classList.toggle('badge-hover', !!hit);
    tilt.tx = hit ? -hit.ly * 0.35 : 0;
    tilt.ty = hit ? (hit.lx / CARD_W) * 0.6 : 0;
  };
  const onUp = e => {
    if (!down || e.pointerId !== down.id) return;
    const clicked = !down.moved && e.type === 'pointerup';
    down = null;
    drag = null;
    hero.classList.remove('badge-grab', 'badge-dragging');
    if (hero.hasPointerCapture(e.pointerId)) hero.releasePointerCapture(e.pointerId);
    if (clicked) open();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const onResize = () => layout(false);

  hero.addEventListener('pointerdown', onDown);
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerup', onUp);
  hero.addEventListener('pointercancel', onUp);
  hero.addEventListener('pointerleave', () => { if (!down) { tilt.tx = tilt.ty = 0; hero.classList.remove('badge-hover'); } });
  a11y.addEventListener('click', () => (mode === 'open' ? close() : open()));
  addEventListener('keydown', onKey);
  addEventListener('resize', onResize);

  /* ----- loop ----- */
  layout(true);
  hero.classList.add('has-badge');
  setTimeout(() => { if (!touched) hint.classList.add('show'); }, reduced ? 300 : 2400);

  let raf = 0, last = performance.now(), acc = 0;
  function frame(now) {
    if (!hero.isConnected) return dispose();
    raf = requestAnimationFrame(frame);
    acc += Math.min((now - last) / 1000, 1 / 20);
    last = now;
    if (hero.hidden) return;
    while (acc >= DT) { step(); acc -= DT; }
    place();
    render();
  }
  raf = requestAnimationFrame(frame);

  function dispose() {
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    removeEventListener('resize', onResize);
    disposables.forEach(d => d.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    delete window.heroBadge;
  }

  // script.js uses these: copy the frame into the glitch clones, and put the card back on scroll
  window.heroBadge = {
    isOpen: () => mode === 'open',
    close,
    snapshot(into) { place(); render(); into.getContext('2d').drawImage(canvas, 0, 0); },
  };
}

/* ---------- card art (2d canvas, then used as textures) ---------- */
function drawFront(photo) {
  const c = makeCanvas(TW, TH), x = c.getContext('2d');
  x.save();
  rr(x, 0, 0, TW, TH, 34); x.clip();
  graphPaper(x, TW, TH);

  // header
  x.fillStyle = MUSTARD; x.fillRect(0, 0, TW, 200);
  x.fillStyle = INK; x.fillRect(0, 200, TW, 6);
  label(x, '★ portfolio vol. 2026 ★', TW / 2, 122, '36px VT323', INK);
  x.letterSpacing = '6px';
  label(x, 'COMMITTEE', TW / 2 + 3, 180, '800 54px Inter', INK);
  x.letterSpacing = '0px';

  retroWindow(x, 70, 236, 452, 386, 'sein.png', photo);

  // name
  label(x, 'Sein', TW / 2, 740, 'italic 108px "Instrument Serif"', INK, 'center', [LILAC, 4]);
  label(x, 'Hilamovi Ramadhan', TW / 2, 796, '800 46px Inter', INK, 'center', [MUSTARD, 3]);
  chips(x, [['artist', TOMATO], ['animator', LILAC], ['web dev', TEAL]], TW / 2, 846);

  // id strip
  x.fillStyle = INK; x.fillRect(0, 880, TW, TH - 880);
  x.fillStyle = CREAM; barcode(x, 44, 898, 250, 38, 7);
  label(x, `ID ${ID}`, TW - 44, 928, '32px VT323', MUSTARD, 'right');
  x.restore();

  punchAndBorder(x);
  return c;
}

// the back is a landscape card: when it's held up, the card turns sideways, so it's drawn turned
function drawBack(photo) {
  const LW = TH, LH = TW;
  const c = makeCanvas(TW, TH), x = c.getContext('2d');
  x.save();
  rr(x, 0, 0, TW, TH, 34); x.clip();
  x.translate(0, TH);
  x.rotate(-Math.PI / 2);
  graphPaper(x, LW, LH);

  x.fillStyle = INK; x.fillRect(0, 0, LW, 72);
  label(x, '★ COMMITTEE ID · KARTU PANITIA ★', 36, 47, '34px VT323', CREAM, 'left');
  label(x, `№ ${ID.slice(-3)}`, 820, 47, '34px VT323', MUSTARD, 'right');

  retroWindow(x, 36, 102, 240, 304, 'sein.png', photo);

  // fields (the right edge, past 846, is where the clip sits)
  const fx = 306, fw = 820 - fx;
  const field = (name, value, y, dot) => {
    label(x, name, fx, y, '26px VT323', MUTED, 'left');
    let vx = fx;
    if (dot) {
      x.fillStyle = dot; x.fillRect(fx, y + 18, 16, 16);
      x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(fx, y + 18, 16, 16);
      vx += 28;
    }
    const s = fitFont(x, value, n => `600 ${n}px Inter`, 34, fw - (vx - fx));
    label(x, value, vx, y + 38, `600 ${s}px Inter`, INK, 'left');
  };
  field('NAME', 'Sein Hilamovi Ramadhan', 112);
  field('ROLE', 'artist · animator · web developer', 196);
  field('TOOLS', 'ibisPaint X · Alight Motion · CapCut · JS', 280);
  field('STATUS', 'still here.', 364, '#3bd16f');

  // signature, barcode, handles
  label(x, 'sein', 60, 488, 'italic 72px "Instrument Serif"', INK, 'left');
  x.fillStyle = INK; x.fillRect(36, 504, 240, 3);
  label(x, 'signature', 36, 532, '24px VT323', MUTED, 'left');
  x.fillStyle = INK; barcode(x, fx, 452, 220, 56, 13);
  label(x, ID, fx, 540, '26px VT323', INK, 'left');
  label(x, '@sein.ramadhan', 820, 482, '28px VT323', INK, 'right');
  label(x, 'valid until: ∞ (probably)', 820, 512, '24px VT323', MUTED, 'right');

  x.fillStyle = MUSTARD; x.fillRect(0, LH - 34, LW, 34);
  x.fillStyle = INK; x.fillRect(0, LH - 37, LW, 3);
  label(x, 'if found, please return to sein · do not bend · do not shoot', 36, LH - 10, '24px VT323', INK, 'left');
  x.restore();

  punchAndBorder(x);
  return c;
}

function drawClip() {
  const c = makeCanvas(128, 150), x = c.getContext('2d');
  x.lineJoin = 'round';
  x.lineWidth = 6;
  x.strokeStyle = INK;
  // the tab the strap loops through
  x.fillStyle = '#d9d4c7';
  rr(x, 8, 4, 112, 64, 14); x.fill(); x.stroke();
  x.fillStyle = INK; rr(x, 26, 22, 76, 18, 6); x.fill();
  // the jaw that bites the card
  x.fillStyle = '#c8c2b3';
  rr(x, 34, 64, 60, 82, 8); x.fill(); x.stroke();
  x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(44, 76, 6, 56);
  x.fillStyle = INK; x.fillRect(40, 118, 48, 5);
  return c;
}

function drawStrap() {
  const text = 'SEIN.PORTFOLIO  ★  COMMITTEE  ★  ';
  const m = makeCanvas(1, 1).getContext('2d');
  m.font = '62px VT323';
  const w = Math.ceil(m.measureText(text).width), h = 96;
  const c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = INK; x.fillRect(0, 0, w, h);
  x.fillStyle = MUSTARD; x.fillRect(0, 7, w, 4); x.fillRect(0, h - 11, w, 4);
  x.font = '62px VT323'; x.fillStyle = CREAM; x.textBaseline = 'middle'; x.textAlign = 'left';
  x.fillText(text, 0, h / 2 + 3);
  return c;
}

/* ---------- 2d helpers ---------- */
function retroWindow(x, X, Y, w, h, title, photo) {
  const bar = 40;
  x.fillStyle = INK; x.fillRect(X + 9, Y + 9, w, h);
  x.fillStyle = PAPER; x.fillRect(X, Y, w, h);
  x.save();
  x.beginPath(); x.rect(X, Y + bar, w, h - bar); x.clip();
  for (let j = 0; j * 16 < h - bar; j++) {
    for (let i = 0; i * 16 < w; i++) {
      x.fillStyle = (i + j) % 2 ? CHECK : '#fff';
      x.fillRect(X + i * 16, Y + bar + j * 16, 16, 16);
    }
  }
  // head to hips of the standing cutout
  const sw = photo.naturalWidth, sh = photo.naturalHeight * 0.52;
  const s = (h - bar - 10) / sh;
  x.drawImage(photo, 0, 0, sw, sh, X + (w - sw * s) / 2, Y + bar + 10, sw * s, sh * s);
  x.restore();

  x.fillStyle = INK;
  for (let yy = Y + 10; yy < Y + bar - 8; yy += 5) x.fillRect(X + 6, yy, w - 12, 2);
  x.fillStyle = PAPER; x.fillRect(X + 8, Y + 7, 30, 26);
  x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(X + 13, Y + 11, 19, 18);
  x.font = '30px VT323';
  const tw = x.measureText(title).width;
  x.fillStyle = PAPER; x.fillRect(X + w / 2 - tw / 2 - 12, Y + 5, tw + 24, bar - 10);
  label(x, title, X + w / 2, Y + 29, '30px VT323', INK);
  x.lineWidth = 5; x.strokeRect(X, Y, w, h);
  x.fillStyle = INK; x.fillRect(X, Y + bar - 2, w, 5);
}

function chips(x, items, cx, y) {
  x.font = '30px VT323';
  const gap = 18, box = 16, pad = 9;
  const widths = items.map(([t]) => box + pad + x.measureText(t).width);
  let px = cx - (widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1)) / 2;
  items.forEach(([t, color], i) => {
    x.fillStyle = color; x.fillRect(px, y - 18, box, box);
    x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(px, y - 18, box, box);
    label(x, t, px + box + pad, y - 2, '30px VT323', INK, 'left');
    px += widths[i] + gap;
  });
}

function punchAndBorder(x) {
  // the slot the clip goes through is a real hole (the 3D slab has one too)
  const hx = TW / 2 - 60, hy = 30;
  x.globalCompositeOperation = 'destination-out';
  rr(x, hx, hy, 120, 26, 13); x.fill();
  x.globalCompositeOperation = 'source-over';
  x.strokeStyle = INK; x.lineWidth = 5;
  rr(x, hx - 2, hy - 2, 124, 30, 15); x.stroke();
  x.lineWidth = 10;
  rr(x, 5, 5, TW - 10, TH - 10, 30); x.stroke();
}

function graphPaper(x, w, h) {
  x.fillStyle = PAPER; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(27,26,23,.06)';
  for (let i = 0; i < w; i += 24) x.fillRect(i, 0, 2, h);
  for (let j = 0; j < h; j += 24) x.fillRect(0, j, w, 2);
}

function barcode(x, X, Y, w, h, seed) {
  let s = seed, cx = X;
  while (true) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 2 + (s % 3) * 2, gap = 2 + ((s >> 4) % 3) * 2;
    if (cx + bw > X + w) break;
    x.fillRect(cx, Y, bw, h);
    cx += bw + gap;
  }
}

function label(x, text, X, Y, font, color, align = 'center', shadow) {
  x.font = font;
  x.textAlign = align;
  x.textBaseline = 'alphabetic';
  if (shadow) { x.fillStyle = shadow[0]; x.fillText(text, X + shadow[1], Y + shadow[1]); }
  x.fillStyle = color;
  x.fillText(text, X, Y);
}

function fitFont(x, text, font, size, maxW) {
  let s = size;
  x.font = font(s);
  while (s > 12 && x.measureText(text).width > maxW) x.font = font(--s);
  return s;
}

function rr(x, X, Y, w, h, r) {
  x.beginPath();
  x.roundRect(X, Y, w, h, r);
}

/* ---------- misc ---------- */
// a rounded rectangle centred on (cx, cy), for three's Shape / Path
function roundRectPath(p, cx, cy, w, h, r) {
  const x = cx - w / 2, y = cy - h / 2;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
