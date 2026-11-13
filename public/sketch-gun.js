/* ---------- the gun, drawn on paper (three.js) ----------
   After the flipbook in "Guns animation practice 2": thin ink lines on paper, redrawn on twos so
   they boil. A cube appears in his hand with a yellow flash and unfolds into the weapon, which
   gets racked, aimed at the cursor and fired.
   Three weapons: a pistol (slide blowback), an SMG (three-round burst, charging handle) and a
   sniper (scope, big kick, bolt cycle). script.js picks one at random per visit.
   Hard parts (the guns) are drawn as broken, overshooting construction lines along their edges.
   Soft parts (hands, fingers) are drawn as a wobbly silhouette: an inverted hull pushed out a
   pixel or two on screen. */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const WEAPONS = ['pistol', 'smg', 'sniper'];

const gsap = window.gsap;
const INK = 0x1b1a17, PAPER = 0xfffdf6, KNIT = 0xf1ede4, MUSTARD = 0xffc93c, SMOKE = '#8f8a80';
const BOIL_FPS = 12;   // lines redraw on twos, like the flipbook
const LINE_PX = 1.8;

const HULL_VS = /* glsl */`
  uniform vec2 uRes;
  uniform float uPx;
  uniform float uStep;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec2 dir = (projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0)).xy;
    float l = length(dir);
    dir = l > 1e-5 ? dir / l : vec2(0.0);
    // thicker and thinner along its length, different every redraw
    float w = 0.65 + 0.7 * hash(floor(position * 260.0) + uStep);
    clip.xy += dir * uPx * w * 2.0 / uRes * clip.w;
    gl_Position = clip;
  }`;
const HULL_FS = /* glsl */`
  uniform vec3 uColor;
  void main() { gl_FragColor = vec4(uColor, 1.0); }`;

export function createSketchGun({ weapon = 'pistol' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'sketch-gun';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const scope = makeScopeOverlay();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  // thin ink lines don't need retina resolution; keeping this low matters on integrated graphics
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 30);

  /* ----- materials: paper fill, ink lines, ink silhouettes ----- */
  const disposables = [];
  const keep = x => { disposables.push(x); return x; };
  const lineMat = keep(new LineMaterial({ color: INK, linewidth: LINE_PX, worldUnits: false }));
  const lineMatTop = keep(new LineMaterial({ color: INK, linewidth: LINE_PX, worldUnits: false, depthTest: false }));
  const hullUniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uPx: { value: LINE_PX * 0.8 },
    uStep: { value: 0 },
    uColor: { value: new THREE.Color(INK) },
  };
  const hullMat = keep(new THREE.ShaderMaterial({ uniforms: hullUniforms, vertexShader: HULL_VS, fragmentShader: HULL_FS, side: THREE.BackSide }));
  const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  const fillMat = keep(new THREE.MeshBasicMaterial({ color: PAPER, ...offset }));
  const knitMat = keep(new THREE.MeshBasicMaterial({ color: KNIT, side: THREE.DoubleSide, ...offset }));
  const yellowMat = keep(new THREE.MeshBasicMaterial({ color: MUSTARD, ...offset }));
  const flashMat = keep(new THREE.MeshBasicMaterial({ color: MUSTARD, depthTest: false }));
  const lensMat = keep(new THREE.MeshBasicMaterial({ color: INK, ...offset }));

  /* ----- building blocks ----- */
  const boilers = []; // every sketched line set, with three hand-drawn takes to flip between
  function sketchLines(src, { top = false, rough = 1 } = {}) {
    const takes = [0, 1, 2].map(() => {
      const g = keep(new LineSegmentsGeometry());
      g.setPositions(roughen(src, rough));
      return g;
    });
    const obj = new LineSegments2(takes[0], top ? lineMatTop : lineMat);
    obj.userData.takes = takes;
    obj.userData.offset = Math.floor(Math.random() * 3);
    obj.renderOrder = top ? 12 : 0;
    boilers.push(obj);
    return obj;
  }
  // a hard part: paper fill + its edges as sketchy lines
  function hard(geo, threshold = 28, material = fillMat) {
    keep(geo);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, material));
    // round parts (barrels, scope tubes, rings) have no hard edges along their length, so they
    // also get a silhouette, or they'd be two floating circles with nothing between them
    if (threshold >= 40) g.add(new THREE.Mesh(geo, hullMat));
    const edges = new THREE.EdgesGeometry(geo, threshold);
    g.add(sketchLines(edges.attributes.position.array));
    edges.dispose();
    return g;
  }
  // a soft part: paper fill + a wobbly silhouette
  function soft(geo, material = fillMat) {
    keep(geo);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, material), new THREE.Mesh(geo, hullMat));
    return g;
  }
  const at = (obj, x, y, z, rx = 0, ry = 0, rz = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.set(rx, ry, rz);
    return obj;
  };
  const group = (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const blob = (rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 16, 12); g.scale(rx, ry, rz); return g; };
  // a tube along z, wider at the front (rFront) or the same both ends
  const tube = (rBack, rFront, len, seg = 14, open = false) => { const g = new THREE.CylinderGeometry(rFront, rBack, len, seg, 1, open); g.rotateX(Math.PI / 2); return g; };
  // lines drawn straight onto a surface: serrations, ports, slots
  const marks = (arr, rough = 0.5) => sketchLines(new Float32Array(arr), { rough });
  const rect = (x, y0, y1, z0, z1) => [x, y0, z0, x, y0, z1, x, y1, z0, x, y1, z1, x, y0, z0, x, y1, z0, x, y0, z1, x, y1, z1];

  // a reflex sight: a base, an open window frame and a pane of glass. eye: the middle of the
  // window, which lines up with the cursor when he aims down it
  const glassMat = keep(new THREE.MeshBasicMaterial({ color: 0xcfe6ef, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  function reflexSight({ w, h, d, baseD, baseH = 0.006 }) {
    const g = new THREE.Group();
    const post = 0.003;
    g.add(at(hard(box(w, baseH, baseD)), 0, baseH / 2, 0));
    g.add(at(hard(box(post, h, d)), -(w / 2 - post / 2), baseH + h / 2, 0));
    g.add(at(hard(box(post, h, d)), w / 2 - post / 2, baseH + h / 2, 0));
    g.add(at(hard(box(w, post, d)), 0, baseH + h - post / 2, 0));
    const pane = new THREE.Mesh(keep(new THREE.PlaneGeometry(w - post * 2, h - post)), glassMat);
    pane.position.set(0, baseH + (h - post) / 2, 0);
    g.add(pane);
    return { g, eye: anchor(g, 0, baseH + (h - post) / 2, 0) };
  }

  // a forearm leaving the wrist, with a ribbed sweater cuff on it
  function forearm(from, dir, len, r) {
    const g = new THREE.Group();
    const arm = new THREE.CapsuleGeometry(r, len, 4, 12);
    arm.translate(0, len / 2, 0);
    g.add(soft(arm));
    const cuff = keep(new THREE.CylinderGeometry(r * 1.32, r * 1.38, len * 0.55, 14, 1, true));
    cuff.translate(0, len * 0.62, 0);
    const rings = [];
    for (let k = 0; k < 3; k++) {
      const y = len * 0.36 + k * 0.012, rr = r * 1.36;
      for (let i = 0; i < 14; i++) {
        const a0 = (i / 14) * Math.PI * 2, a1 = ((i + 1) / 14) * Math.PI * 2;
        rings.push(Math.cos(a0) * rr, y, Math.sin(a0) * rr, Math.cos(a1) * rr, y, Math.sin(a1) * rr);
      }
    }
    g.add(group(new THREE.Mesh(cuff, knitMat), new THREE.Mesh(cuff, hullMat), marks(rings, 0.6)));
    g.position.copy(from);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return g;
  }

  /* ----- hands: real anatomy, drawn as sketch ----- */
  const DEG = Math.PI / 180;
  // a finger (or thumb): three jointed segments from the knuckle out, tapering, with a knuckle
  // bump at each joint. It starts pointing down its root's +z; each joint bends about its own y
  // (a positive bend curls from +z towards +x).
  function digit(base, orient, lens, r, bends) {
    const root = new THREE.Group();
    root.position.set(...base);
    root.quaternion.copy(orient);
    let parent = root;
    lens.forEach((len, i) => {
      const joint = new THREE.Group();
      if (i) joint.position.z = lens[i - 1];
      joint.rotation.y = bends[i] * DEG;
      parent.add(joint);
      const ri = r * (1 - i * 0.12);
      const seg = new THREE.CapsuleGeometry(ri, Math.max(len - ri, 0.002), 3, 9);
      seg.rotateX(Math.PI / 2);
      seg.translate(0, 0, len / 2);
      joint.add(soft(seg));
      if (i) joint.add(soft(new THREE.SphereGeometry(ri * 1.12, 10, 8)));  // the knuckle
      parent = joint;
    });
    return root;
  }
  // an orientation whose +z points along `fwd` and whose +x points along `side`
  function facing(fwd, side) {
    const z = new THREE.Vector3(...fwd).normalize();
    const x = new THREE.Vector3(...side).normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    x.crossVectors(y, z).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }
  const FWD = [0, 0, 1], TO_LEFT = [1, 0, 0], TO_RIGHT = [-1, 0, 0];

  // his right hand round a pistol grip (origin: top of the grip, grip running down -y, front +z,
  // his right side -x). Fingers start at the knuckles on the right, cross the front of the grip
  // and their tips curl round the left edge; the thumb lies along the left; the index finger
  // rests straight along the frame, off the trigger.
  function gripHand() {
    const h = new THREE.Group();
    // back of the hand and palm wrapped round the back strap, and the meat of the thumb
    h.add(at(soft(blob(0.013, 0.043, 0.031)), -0.024, -0.05, -0.016, 0, 0.15));
    h.add(at(soft(blob(0.011, 0.02, 0.016)), 0.01, -0.04, -0.027));
    // tendons on the back of the hand
    h.add(marks([-0.033, -0.04, -0.012, -0.031, -0.046, -0.044, -0.0375, -0.03, -0.026, -0.036, -0.034, -0.002, -0.0375, -0.05, -0.028, -0.036, -0.052, -0.004, -0.0372, -0.068, -0.026, -0.0355, -0.068, -0.004], 0.4));
    // middle, ring, little: knuckle, then round the front, then the tips round the corner
    [[-0.031, 1], [-0.052, 0.94], [-0.072, 0.8]].forEach(([y, s]) => {
      h.add(digit([-0.024, y, 0.0], facing(FWD, TO_LEFT), [0.034 * s, 0.022 * s, 0.018 * s], 0.0084 * s, [8, 85, 40]));
    });
    // index: straight along the frame, tipped up to the barrel's line
    h.add(digit([-0.021, -0.006, -0.002], facing([0, 0.27, 1], TO_LEFT), [0.038, 0.025, 0.02], 0.0082, [-3, 6, 6]));
    // thumb: from the base of the palm, forward along the left side
    h.add(digit([0.014, -0.03, -0.03], facing([0.15, 0.45, 1], TO_LEFT), [0.03, 0.027, 0.021], 0.0092, [4, 6, 10]));
    h.add(forearm(new THREE.Vector3(-0.018, -0.088, -0.036), new THREE.Vector3(-0.12, -0.78, -1), 0.44, 0.022));
    return h;
  }

  // his left hand cupping the right one on a pistol: fingers wrap the front over the right
  // hand's fingers, the thumb points forward along the frame
  function supportHand() {
    const h = new THREE.Group();
    h.add(at(soft(blob(0.013, 0.042, 0.03)), 0.034, -0.054, -0.006, 0, -0.15));
    [[-0.03, 1], [-0.05, 0.98], [-0.069, 0.92], [-0.086, 0.78]].forEach(([y, s]) => {
      h.add(digit([0.034, y, 0.016], facing(FWD, TO_RIGHT), [0.034 * s, 0.022 * s, 0.018 * s], 0.0084 * s, [8, 85, 40]));
    });
    h.add(digit([0.024, -0.03, -0.012], facing([0, 0.33, 1], TO_RIGHT), [0.031, 0.027, 0.021], 0.009, [-4, 4, 6]));
    h.add(marks([0.047, -0.034, -0.02, 0.046, -0.036, 0.008, 0.0475, -0.052, -0.022, 0.0465, -0.054, 0.006, 0.0472, -0.07, -0.02, 0.0462, -0.07, 0.004], 0.4));
    h.add(forearm(new THREE.Vector3(0.04, -0.09, -0.024), new THREE.Vector3(0.3, -0.78, -1), 0.44, 0.022));
    return h;
  }

  // his left hand under a forend (origin: bottom middle of the forend). Fingers go up the left
  // side and over the top; the thumb lies forward along the right side.
  function forendHand(width = 0.04) {
    const h = new THREE.Group();
    const w = width / 2;
    h.add(at(soft(blob(0.025, 0.012, 0.038)), 0.004, -0.016, -0.006));
    // each finger's +z points outward (left) and curls towards +y: up the side, over the top
    [[-0.024, 0.86], [-0.006, 1], [0.012, 0.97], [0.029, 0.84]].forEach(([z, s]) => {
      h.add(digit([w * 0.55, -0.012, z], facing(TO_LEFT, [0, 1, 0]), [0.03 * s, 0.022 * s, 0.018 * s], 0.0082 * s, [70, 25, 45]));
    });
    h.add(digit([-w * 0.4, -0.014, -0.03], facing([-0.35, 0.35, 1], [0, 1, 0]), [0.03, 0.026, 0.02], 0.009, [0, 6, 8]));
    h.add(forearm(new THREE.Vector3(0.012, -0.03, -0.04), new THREE.Vector3(0.4, -0.85, -1), 0.46, 0.022));
    return h;
  }

  /* ----- the viewmodel ----- */
  // view: aimed at the cursor. rig: summon and sway. The barrel points down +z.
  const view = new THREE.Group();
  const rig = new THREE.Group();
  view.add(rig);
  scene.add(view);

  const BUILD = { pistol: buildPistol, smg: buildSmg, sniper: buildSniper };
  const W = (BUILD[weapon] || buildPistol)();
  rig.add(W.gun, W.hands);

  function buildPistol() {
    const gun = new THREE.Group();
    const slide = new THREE.Group();
    gun.add(slide);
    slide.add(at(hard(box(0.03, 0.034, 0.19)), 0, 0.017, 0.035));
    slide.add(at(hard(box(0.004, 0.006, 0.007)), 0, 0.037, 0.122));
    slide.add(at(hard(box(0.008, 0.007, 0.006)), 0.0085, 0.0375, -0.052));
    slide.add(at(hard(box(0.008, 0.007, 0.006)), -0.0085, 0.0375, -0.052));
    const ser = [];
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const z = -0.055 + i * 0.006; ser.push(s * 0.0152, 0.007, z, s * 0.0152, 0.029, z); }
    slide.add(marks([...ser, ...rect(-0.0152, 0.018, 0.031, 0, 0.042)]));
    slide.add(at(hard(tube(0.0062, 0.0062, 0.012), 40), 0, 0.017, 0.127));
    const dot = reflexSight({ w: 0.025, h: 0.021, d: 0.007, baseD: 0.028 });   // red dot on the slide
    slide.add(at(dot.g, 0, 0.034, -0.006));
    gun.add(at(hard(box(0.028, 0.016, 0.15)), 0, -0.008, 0.05));
    gun.add(at(hard(box(0.008, 0.03, 0.006)), 0, -0.031, 0.046));
    gun.add(at(hard(box(0.008, 0.006, 0.062)), 0, -0.044, 0.018));
    gun.add(at(hard(box(0.005, 0.019, 0.005)), 0, -0.026, 0.012, 0.3));
    const grip = at(new THREE.Group(), 0, -0.016, -0.035, 0.28);
    grip.add(at(hard(box(0.031, 0.116, 0.047)), 0, -0.058, 0));
    grip.add(at(hard(box(0.035, 0.012, 0.052)), 0, -0.121, 0));
    gun.add(grip);

    const hands = at(new THREE.Group(), 0, -0.016, -0.035, 0.28);
    const right = gripHand();
    const left = supportHand();
    hands.add(right, left);

    return {
      gun, hands, right, left,
      muzzle: anchor(gun, 0, 0.017, 0.142), port: anchor(slide, -0.018, 0.026, 0.02),
      base: [0.16, -0.105, -0.62], kick: [0.34, 0.04], rounds: 1, interval: 0,
      sight: dot.eye, adsDist: 0.21, reticle: 'dot',
      // the other hand comes up and racks the slide
      rack(tl, t, q) {
        tl.to(left.position, { x: 0.005, y: 0.075, z: -0.06, duration: 0.24 * q, ease: 'power2.out' }, t)
          .to(slide.position, { z: -0.042, duration: 0.1 * q, ease: 'power2.in' }, t + 0.24 * q)
          .to(left.position, { z: -0.105, duration: 0.1 * q, ease: 'power2.in' }, t + 0.24 * q)
          .to(slide.position, { z: 0, duration: 0.06 * q, ease: 'power4.in' }, t + 0.38 * q)
          .to(left.position, { x: 0, y: 0, z: 0, duration: 0.3 * q, ease: 'power2.inOut' }, t + 0.42 * q);
        return t + 0.72 * q;
      },
      fireRound() {
        gsap.timeline()
          .to(slide.position, { z: -0.046, duration: 0.035, ease: 'power4.out' })
          .to(slide.position, { z: 0, duration: 0.09, ease: 'power2.in' });
        ejectCasing();
      },
      reset() { slide.position.set(0, 0, 0); left.position.set(0.14, -0.28, -0.12); },
      grow: slide,
    };
  }

  function buildSmg() {
    const gun = new THREE.Group();
    gun.add(at(hard(box(0.034, 0.05, 0.25)), 0, 0, 0.02));                     // receiver
    gun.add(at(hard(box(0.014, 0.008, 0.2)), 0, 0.029, 0.03));                 // top rail
    // front sight post in its hood, on the same line as the holo sight's window
    gun.add(at(hard(box(0.004, 0.02, 0.004)), 0, 0.038, 0.13));
    gun.add(at(hard(new THREE.TorusGeometry(0.0095, 0.0026, 6, 14), 40), 0, 0.051, 0.13));
    const holo = reflexSight({ w: 0.03, h: 0.027, d: 0.03, baseD: 0.042 });    // holographic sight on the rail
    gun.add(at(holo.g, 0, 0.033, -0.03));
    gun.add(at(hard(tube(0.008, 0.008, 0.07), 40), 0, 0.005, 0.18));             // barrel
    gun.add(at(hard(box(0.04, 0.034, 0.1)), 0, -0.01, 0.1));                   // handguard
    const slots = [];
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const z = 0.065 + i * 0.022; slots.push(s * 0.0202, -0.012, z, s * 0.0202, -0.012, z + 0.012); }
    gun.add(marks([...slots, ...rect(-0.0172, 0.004, 0.018, 0.0, 0.045)]));     // handguard slots, ejection port
    const mag = at(new THREE.Group(), 0, -0.024, 0.035, -0.12);
    mag.add(at(hard(box(0.026, 0.13, 0.038)), 0, -0.065, 0));
    gun.add(mag);
    const grip = at(new THREE.Group(), 0, -0.025, -0.05, 0.28);
    grip.add(at(hard(box(0.03, 0.1, 0.045)), 0, -0.05, 0));
    gun.add(grip);
    gun.add(at(hard(box(0.008, 0.006, 0.052)), 0, -0.05, -0.014));             // trigger guard
    gun.add(at(hard(box(0.005, 0.017, 0.005)), 0, -0.038, -0.018, 0.3));
    gun.add(at(hard(box(0.02, 0.03, 0.12)), 0, -0.004, -0.17));                // folding stock
    gun.add(at(hard(box(0.026, 0.065, 0.012)), 0, -0.012, -0.235));
    const handle = at(hard(box(0.012, 0.011, 0.022)), 0.022, 0.016, 0.09);      // charging handle, left side
    gun.add(handle);

    const hands = new THREE.Group();
    const right = at(gripHand(), 0, -0.025, -0.05, 0.28);
    const leftHold = at(new THREE.Group(), 0, -0.028, 0.11);
    const left = forendHand(0.04);
    leftHold.add(left);
    hands.add(right, leftHold);

    return {
      gun, hands, right, left,
      muzzle: anchor(gun, 0, 0.005, 0.218), port: anchor(gun, -0.02, 0.012, 0.02),
      base: [0.16, -0.11, -0.72], kick: [0.2, 0.025], rounds: 3, interval: 0.085,
      sight: holo.eye, adsDist: 0.26, reticle: 'holo',
      // the left hand slaps the charging handle back and lets it fly
      rack(tl, t, q) {
        tl.to(left.position, { x: 0.026, y: 0.052, z: -0.01, duration: 0.22 * q, ease: 'power2.out' }, t)
          .to(handle.position, { z: 0.045, duration: 0.1 * q, ease: 'power2.in' }, t + 0.22 * q)
          .to(left.position, { z: -0.055, duration: 0.1 * q, ease: 'power2.in' }, t + 0.22 * q)
          .to(handle.position, { z: 0.09, duration: 0.05 * q, ease: 'power4.in' }, t + 0.36 * q)
          .to(left.position, { x: 0, y: 0, z: 0, duration: 0.3 * q, ease: 'power2.inOut' }, t + 0.4 * q);
        return t + 0.7 * q;
      },
      fireRound() {
        gsap.timeline()
          .to(handle.position, { z: 0.07, duration: 0.025, ease: 'power4.out' })
          .to(handle.position, { z: 0.09, duration: 0.05 });
        ejectCasing();
      },
      reset() { handle.position.z = 0.09; left.position.set(0.12, -0.22, -0.1); },
      grow: mag,
    };
  }

  function buildSniper() {
    const gun = new THREE.Group();
    gun.add(at(hard(box(0.032, 0.042, 0.2)), 0, 0, 0));                        // receiver
    gun.add(at(hard(tube(0.0078, 0.0072, 0.34), 40), 0, 0.004, 0.27));          // barrel
    gun.add(at(hard(tube(0.011, 0.011, 0.04), 40), 0, 0.004, 0.455));           // muzzle brake
    gun.add(marks([0.0112, 0.004, 0.445, 0.0112, 0.004, 0.465, -0.0112, 0.004, 0.445, -0.0112, 0.004, 0.465]));
    gun.add(at(hard(box(0.04, 0.036, 0.24)), 0, -0.024, 0.12));                // forend
    gun.add(at(hard(box(0.036, 0.052, 0.19)), 0, -0.022, -0.185));             // stock
    gun.add(at(hard(box(0.03, 0.018, 0.1)), 0, 0.012, -0.18));                 // cheek rest
    gun.add(at(hard(box(0.038, 0.07, 0.014)), 0, -0.03, -0.285));              // butt pad
    const grip = at(new THREE.Group(), 0, -0.032, -0.075, 0.35);
    grip.add(at(hard(box(0.03, 0.09, 0.043)), 0, -0.045, 0));
    gun.add(grip);
    gun.add(at(hard(box(0.008, 0.006, 0.05)), 0, -0.05, -0.036));
    gun.add(at(hard(box(0.026, 0.04, 0.058)), 0, -0.04, 0.02));                // magazine
    // the scope: tube, two bells, two turrets, two mounts, and glass you can see
    const sc = at(new THREE.Group(), 0, 0.054, 0.0);
    sc.add(at(hard(tube(0.021, 0.021, 0.2, 18, true), 40), 0, 0, 0));
    sc.add(at(hard(tube(0.021, 0.031, 0.065, 18, true), 40), 0, 0, 0.1325));
    sc.add(at(hard(tube(0.025, 0.021, 0.045, 18, true), 40), 0, 0, -0.1225));
    // the eyepiece: a thick dark ring round the lens. From the hip the lens is dark glass; aimed,
    // it becomes a window (it hides the tube and barrel behind it, so the picture fills the ring
    // like a real scope's does)
    const LENS_R = 0.0225;
    const lensDark = at(hard(new THREE.CircleGeometry(LENS_R, 18), 40, lensMat), 0, 0, -0.1452, 0, Math.PI);
    const portal = new THREE.Mesh(keep(new THREE.CircleGeometry(LENS_R, 28)), keep(new THREE.MeshBasicMaterial({ colorWrite: false })));
    at(portal, 0, 0, -0.1452, 0, Math.PI);
    portal.renderOrder = -5;
    portal.visible = false;
    const eyepiece = at(new THREE.Mesh(keep(new THREE.RingGeometry(LENS_R, 0.032, 28)), lensMat), 0, 0, -0.1454, 0, Math.PI);
    sc.add(lensDark, portal, eyepiece);
    const turret = new THREE.CylinderGeometry(0.009, 0.009, 0.022, 12);
    sc.add(at(hard(turret.clone(), 40), 0, 0.033, 0));
    sc.add(at(hard(turret, 40), 0.033, 0, 0, 0, 0, Math.PI / 2));
    gun.add(sc);
    gun.add(at(hard(box(0.012, 0.012, 0.016)), 0, 0.0265, 0.06));
    gun.add(at(hard(box(0.012, 0.012, 0.016)), 0, 0.0265, -0.06));
    // the bolt on his right: a short rod with a knob, which lifts and slides back
    const bolt = at(new THREE.Group(), -0.016, 0.008, -0.045);
    const rod = new THREE.CylinderGeometry(0.0032, 0.0032, 0.03, 8);
    rod.rotateZ(Math.PI / 2);
    rod.translate(-0.015, 0, 0);
    bolt.add(hard(rod, 40));
    bolt.add(at(soft(blob(0.0075, 0.0075, 0.0075)), -0.032, 0, 0));
    gun.add(bolt);

    const hands = new THREE.Group();
    const right = at(gripHand(), 0, -0.032, -0.075, 0.35);
    const leftHold = at(new THREE.Group(), 0, -0.042, 0.17);
    const left = forendHand(0.04);
    leftHold.add(left);
    hands.add(right, leftHold);

    // lift, back (the casing flies), forward, down; his hand goes with it
    function cycle(tl, t, q) {
      tl.to(right.position, { x: -0.03, y: 0.03, z: 0.02, duration: 0.14 * q, ease: 'power2.out' }, t)
        .to(bolt.rotation, { z: -1.1, duration: 0.09 * q, ease: 'power2.out' }, t + 0.12 * q)
        .to(bolt.position, { z: -0.1, duration: 0.11 * q, ease: 'power2.inOut' }, t + 0.22 * q)
        .add(ejectCasing, t + 0.3 * q)
        .to(bolt.position, { z: -0.045, duration: 0.1 * q, ease: 'power2.inOut' }, t + 0.4 * q)
        .to(bolt.rotation, { z: 0, duration: 0.08 * q, ease: 'power2.in' }, t + 0.52 * q)
        .to(right.position, { x: 0, y: -0.032, z: -0.075, duration: 0.18 * q, ease: 'power2.inOut' }, t + 0.6 * q);
      return t + 0.8 * q;
    }
    return {
      gun, hands, right, left,
      muzzle: anchor(gun, 0, 0.004, 0.48), port: anchor(gun, -0.02, 0.02, 0.0),
      base: [0.17, -0.11, -0.86], kick: [0.55, 0.075], rounds: 1, interval: 0, scope: true,
      sight: anchor(sc, 0, 0, -0.1452), adsDist: 0.085, reticle: 'cross', lens: { dark: lensDark, portal, r: LENS_R },
      rack(tl, t, q) {
        tl.to(left.position, { x: 0, y: 0, z: 0, duration: 0.3 * q, ease: 'power2.out' }, t);
        return cycle(tl, t + 0.15 * q, q);
      },
      fireRound() {
        const tl = gsap.timeline();
        cycle(tl, 0.5, 1);
        for (let i = 0; i < 2; i++) puff(0.05 + i * 0.03, 1.2);
      },
      reset() { bolt.position.z = -0.045; bolt.rotation.z = 0; right.position.set(0, -0.032, -0.075); left.position.set(0.12, -0.25, -0.12); },
      grow: sc,
    };
  }

  function anchor(parent, x, y, z) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }

  // the cube he summons it from, and its yellow burst
  const cube = hard(box(0.052, 0.052, 0.052));
  at(cube, 0, -0.004, 0.02, 0.35, 0.5, 0.1);
  rig.add(cube);
  const burst = new THREE.Group();
  {
    const strokes = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2, r0 = 0.045, r1 = 0.07 + (i % 3) * 0.01;
      strokes.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
    }
    burst.add(sketchLines(new Float32Array(strokes), { top: true, rough: 1.5 }));
  }
  burst.visible = false;
  scene.add(burst);

  // the assembly: every top-level part of the gun, where it belongs, and where it floats in the
  // ring of parts before snapping home (lowest parts first, so the grip lands in his hand first)
  let burstTarget = cube;
  const parts = W.gun.children.filter(o => o.children.length || o.isMesh) // not the empty anchors
    .map(o => ({ o, home: o.position.clone(), rot: o.rotation.clone(), p: { rad: 0, ang: 0, k: 1, s: 1 },
      spin: [Math.random() * 3 - 1.5, Math.random() * 3 - 1.5, Math.random() * 3 - 1.5] }))
    .sort((a, b) => a.home.y - b.home.y);
  parts.forEach((pt, i) => { pt.a0 = (i / parts.length) * Math.PI * 2; });
  function placePart(pt) {
    const { rad, ang, k, s } = pt.p, a = pt.a0 + ang, f = 1 - k, tw = f * (1 + ang);
    pt.o.position.set(
      pt.home.x * k + Math.cos(a) * rad * f,
      pt.home.y * k + (0.01 + Math.sin(a) * rad * 0.8) * f,
      pt.home.z * k + (0.03 + Math.sin(a * 2) * 0.03) * f,
    );
    pt.o.rotation.set(pt.rot.x * k + pt.spin[0] * tw, pt.rot.y * k + pt.spin[1] * tw, pt.rot.z * k + pt.spin[2] * tw);
    pt.o.scale.setScalar(s);
  }

  // muzzle flash: three takes of a jagged yellow star with spark strokes, flipped on twos
  const flash = new THREE.Group();
  flash.visible = false;
  scene.add(flash);
  const flashSize = W.scope ? 1.6 : weapon === 'smg' ? 1.15 : 1;
  for (let t = 0; t < 3; t++) {
    const take = new THREE.Group();
    const pts = [], n = 7 + t;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 + t * 0.4;
      const r = (i % 2 ? 0.008 + Math.random() * 0.006 : 0.024 + Math.random() * 0.016) * flashSize;
      pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    const fill = new THREE.Mesh(keep(new THREE.ShapeGeometry(new THREE.Shape(pts))), flashMat);
    fill.renderOrder = 11;
    take.add(fill);
    const outline = [];
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; outline.push(p.x, p.y, 0, q.x, q.y, 0); });
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 0.045 * flashSize, r1 = (0.06 + Math.random() * 0.025) * flashSize;
      outline.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
    }
    take.add(sketchLines(new Float32Array(outline), { top: true, rough: 0.4 }));
    flash.add(take);
  }

  // spent casings and smoke
  const casingGeo = keep(new THREE.CylinderGeometry(0.0045, 0.0045, W.scope ? 0.024 : 0.014, 10));
  const smokeTex = keep(new THREE.CanvasTexture(drawSmoke()));
  const debris = [];
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function ejectCasing() {
    const casing = group(new THREE.Mesh(casingGeo, fillMat), new THREE.Mesh(casingGeo, hullMat));
    W.port.getWorldPosition(casing.position);
    const vel = tmp.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(0.9 + Math.random() * 0.3)
      .add(tmp2.set(0, 1.1 + Math.random() * 0.3, 0.2));
    scene.add(casing);
    debris.push({ obj: casing, vel: vel.clone(), gravity: 5.5, age: 0, life: 0.75, spin: { x: 20 + Math.random() * 10, z: 14 } });
  }
  function puff(delay = 0, size = 1) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
    W.muzzle.getWorldPosition(p.position);
    p.scale.setScalar(0.035 * size);
    scene.add(p);
    debris.push({ obj: p, vel: new THREE.Vector3((Math.random() - 0.5) * 0.06, 0.06 + Math.random() * 0.05, -0.02), gravity: 0, age: -delay, life: 0.9 + Math.random() * 0.3, size });
  }

  /* ----- state ----- */
  const aim = { x: innerWidth / 2, y: innerHeight / 2 };
  const ndc = new THREE.Vector2();
  const target = new THREE.Vector3(0, 0, -4), aimNow = new THREE.Vector3(0, 0, -4);
  const kick = { v: 0 };
  const ads = { v: 0 };          // 0 at the hip, 1 looking down the sight
  const BASE = new THREE.Vector3();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reticle = makeReticle(W.reticle);
  let running = false, ready = false, aiming = false, raf = 0, last = 0, time = 0, step = -1;
  const eyeNow = new THREE.Vector3(), eyeGoal = new THREE.Vector3(), fwd = new THREE.Vector3();
  const sightM = new THREE.Matrix4(), hipQ = new THREE.Quaternion(), adsQ = new THREE.Quaternion(), hipP = new THREE.Vector3();

  function aimRay(x, y, into) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    into.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(4).add(camera.position);
    return into;
  }

  function layout() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    // a tall phone screen: pull it back and in so the hands still fit
    const narrow = camera.aspect < 0.8;
    BASE.set(W.base[0] * (narrow ? 0.4 : 1), W.base[1] * (narrow ? 1.15 : 1), W.base[2] * (narrow ? 1.3 : 1));
    lineMat.resolution.set(innerWidth, innerHeight);
    lineMatTop.resolution.set(innerWidth, innerHeight);
    hullUniforms.uRes.value.set(innerWidth, innerHeight);
  }
  layout();
  addEventListener('resize', layout);

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - (last || now)) / 1000, 1 / 20);
    last = now;
    time += dt;

    const s = Math.floor(time * BOIL_FPS);
    if (s !== step) {
      step = s;
      boilers.forEach(o => { o.geometry = o.userData.takes[(s + o.userData.offset) % 3]; });
      hullUniforms.uStep.value = s % 11;
      if (flash.visible) flash.children.forEach((c, i) => { c.visible = i === s % 3; });
    }

    aimRay(aim.x, aim.y, target);
    aimNow.lerp(target, 1 - Math.exp(-dt * 18));
    const sway = reduced ? 0 : Math.sin(time * 1.5) * 0.0025 * (1 - ads.v);
    view.position.set(BASE.x + ndc.x * 0.05, BASE.y + ndc.y * 0.035 + sway, BASE.z);
    view.lookAt(aimNow);
    // aiming down the sight: put the sight's window exactly on the line from the eye to the
    // cursor, close to the eye, and point the sight line (not the barrel, which sits lower) at
    // the target. Moving the gun changes the angle and turning it moves the window, so it
    // settles both together in a few passes, then blends with the hip pose.
    if (W.sight && ads.v > 0.001) {
      hipP.copy(view.position);
      hipQ.copy(view.quaternion);
      eyeGoal.copy(aimNow).sub(camera.position).normalize().multiplyScalar(W.adsDist).add(camera.position);
      for (let i = 0; i < 4; i++) {
        view.updateMatrixWorld();
        W.sight.getWorldPosition(eyeNow);
        view.position.add(eyeNow.subVectors(eyeGoal, eyeNow));
        view.quaternion.setFromRotationMatrix(sightM.lookAt(aimNow, eyeGoal, view.up));
      }
      view.updateMatrixWorld();
      W.sight.getWorldPosition(eyeNow);
      view.position.add(eyeNow.subVectors(eyeGoal, eyeNow));
      adsQ.copy(view.quaternion);
      view.position.lerpVectors(hipP, view.position, ads.v);
      view.quaternion.slerpQuaternions(hipQ, adsQ, ads.v);
    }
    view.rotateX(-kick.v * W.kick[0] * (1 - ads.v * 0.45));  // the muzzle flips up
    view.translateZ(-kick.v * W.kick[1]);                   // and it all shoves back into his hands
    view.updateMatrixWorld();

    // the dot or ring sits where the sight is pointing, so it jumps with the recoil
    if (W.sight) {
      W.sight.getWorldPosition(eyeNow);
      view.getWorldDirection(fwd);
      eyeNow.addScaledVector(fwd, 4).project(camera);
      const far = [(eyeNow.x + 1) / 2 * innerWidth, (1 - eyeNow.y) / 2 * innerHeight];
      if (W.lens) {
        // the scope's crosshair lives in its lens: same place and size as the lens on screen
        const on = ads.v > 0.6;
        W.lens.portal.visible = on;
        W.lens.dark.visible = !on;
        W.sight.getWorldPosition(eyeNow);
        const dist = eyeNow.distanceTo(camera.position);
        const rPx = W.lens.r / dist / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (innerHeight / 2);
        eyeNow.project(camera);
        reticle.place((eyeNow.x + 1) / 2 * innerWidth, (1 - eyeNow.y) / 2 * innerHeight, Math.max(0, (ads.v - 0.6) / 0.4), rPx);
      } else {
        reticle.place(far[0], far[1], Math.max(0, (ads.v - 0.8) / 0.2));
      }
    }
    // the sniper's scope fills the screen; the gun behind it is hidden
    if (W.overlay) {
      scope.move(aim.x, aim.y);
      canvas.style.opacity = String(1 - ads.v);
    }

    if (flash.visible) { W.muzzle.getWorldPosition(flash.position); flash.quaternion.copy(camera.quaternion); }
    if (burst.visible) { burstTarget.getWorldPosition(burst.position); burst.quaternion.copy(camera.quaternion); }
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.age += dt;
      if (d.age < 0) continue;
      if (d.age > d.life) {
        scene.remove(d.obj);
        if (d.obj.isSprite) d.obj.material.dispose();
        debris.splice(i, 1);
        continue;
      }
      d.vel.y -= d.gravity * dt;
      d.obj.position.addScaledVector(d.vel, dt);
      if (d.spin) { d.obj.rotation.x += d.spin.x * dt; d.obj.rotation.z += d.spin.z * dt; }
      if (d.obj.isSprite) {
        const k = d.age / d.life;
        d.obj.material.opacity = 0.55 * (1 - k);
        d.obj.scale.setScalar((0.035 + k * 0.08) * d.size);
      }
    }
    // fully scoped in, the sniper is hidden behind the scope: nothing to draw
    if (W.overlay && ads.v >= 1) return;
    renderer.render(scene, camera);
  }

  function start() {
    canvas.classList.add('on');
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    ready = false;
    cancelAnimationFrame(raf);
    canvas.classList.remove('on');
    setAim(false, true);
    renderer.clear();
  }

  // hold right-click (or the aim button) to look down the sight
  function setAim(on, instant = false) {
    on = on && ready;
    if (on === aiming && !instant) return;
    aiming = on;
    // looking down the sight, the sight is the crosshair: hide the mouse cursor
    document.documentElement.classList.toggle('ads-on', on);
    gsap.killTweensOf(ads);
    if (instant) ads.v = on ? 1 : 0;
    else gsap.to(ads, { v: on ? 1 : 0, duration: reduced ? 0.08 : 0.2, ease: 'power2.out' });
    if (W.overlay) {
      if (on) scope.enter(aim.x, aim.y, instant); else scope.exit(instant);
      if (instant) canvas.style.opacity = on ? '0' : '';
    }
    if (!on) reticle.place(0, 0, 0);
  }

  // one round: flash, kick, the weapon's own action, smoke
  function round() {
    gsap.timeline()
      .to(kick, { v: 1, duration: 0.035, ease: 'power4.out' })
      .to(kick, { v: 0, duration: W.scope ? 0.7 : 0.45, ease: 'elastic.out(1, 0.45)' });
    flash.visible = true;
    gsap.delayedCall(0.07, () => { flash.visible = false; });
    W.fireRound();
    puff(0, W.scope ? 1.4 : 1);
  }

  /* ----- what script.js uses ----- */
  return {
    weapon,
    rounds: W.rounds,
    interval: W.interval,
    aimAt(x, y) { aim.x = x; aim.y = y; },
    setAim(on, x, y) {
      if (x !== undefined) { aim.x = x; aim.y = y; }
      setAim(on);
    },
    get aiming() { return aiming; },

    // up from the bottom holding a cube; a yellow flash; the cube unfolds into the weapon; racked
    show(x, y) {
      aim.x = x; aim.y = y;
      aimRay(x, y, aimNow);
      gsap.killTweensOf([rig.position, rig.rotation, cube.rotation, burst.scale, kick, ...parts.map(pt => pt.p)]);
      kick.v = 0;
      W.reset();
      W.gun.visible = false;
      cube.visible = true;
      cube.children[0].material = fillMat;
      cube.rotation.set(0.35, 0.5, 0.1);
      burstTarget = cube;
      rig.position.set(0.02, -0.34, 0.06);
      rig.rotation.set(0.6, 0, 0.35);
      start();
      const q = reduced ? 0.35 : 1;
      const tl = gsap.timeline();
      // the cube rises, spinning faster and faster, and flashes
      tl.to(rig.position, { x: 0, y: 0, z: 0, duration: 0.45 * q, ease: 'power3.out' }, 0)
        .to(rig.rotation, { x: 0, z: 0, duration: 0.5 * q, ease: 'power3.out' }, 0)
        .to(cube.rotation, { y: 0.5 + Math.PI * 3, x: 0.35 + Math.PI, duration: 0.62 * q, ease: 'power2.in' }, 0)
        .add(() => { cube.children[0].material = yellowMat; burst.visible = true; }, 0.48 * q)
        .fromTo(burst.scale, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1.2, y: 1.2, z: 1.2, duration: 0.18 * q, ease: 'power2.out' }, 0.48 * q)
        // it bursts into every part of the gun, which fly out into a ring and swirl...
        .add(() => {
          cube.visible = false; burst.visible = false; W.gun.visible = true;
          parts.forEach(pt => { Object.assign(pt.p, { rad: 0, ang: 0, k: 0, s: 0.2 }); placePart(pt); });
        }, 0.64 * q);
      const T = 1.25 * q, gap = (0.5 * q) / parts.length;
      parts.forEach((pt, i) => {
        const onUpdate = () => placePart(pt);
        tl.to(pt.p, { rad: 0.15, s: 1, duration: 0.3 * q, ease: 'back.out(2)', onUpdate }, 0.64 * q)
          .to(pt.p, { ang: 1.6, duration: 0.8 * q, ease: 'power1.out', onUpdate }, 0.64 * q)
          // ...then snap home one by one, grip first, each one jolting his hands
          .to(pt.p, { k: 1, duration: 0.2 * q, ease: 'power3.in', onUpdate, onComplete: () => {
            placePart(pt);
            gsap.fromTo(rig.position, { y: -0.007 }, { y: 0, duration: 0.12, ease: 'power2.out' });
          } }, T + i * gap);
      });
      // assembled: one more flash around the whole gun, and it settles with a wobble
      const done = T + 0.7 * q;
      tl.add(() => { burstTarget = W.gun; burst.visible = true; }, done)
        .fromTo(burst.scale, { x: 0.9, y: 0.9, z: 0.9 }, { x: 2.6, y: 2.6, z: 2.6, duration: 0.2 * q, ease: 'power2.out' }, done)
        .add(() => { burst.visible = false; }, done + 0.2 * q)
        .fromTo(rig.rotation, { z: -0.2 }, { z: 0, duration: 0.45 * q, ease: 'elastic.out(1, 0.4)' }, done);
      const end = W.rack(tl, done + 0.15 * q, q);
      tl.fromTo(rig.rotation, { x: 0 }, { x: -0.05, duration: 0.06, yoyo: true, repeat: 1 }, end - 0.2 * q);
      return tl.then(() => { ready = true; });
    },

    // fires the weapon's rounds (one, or a burst); scoped in, the kick throws the reticle up
    fire() {
      if (W.overlay && aiming) scope.kick(reduced);
      for (let i = 0; i < W.rounds; i++) gsap.delayedCall(i * W.interval, round);
    },

    hide(instant = false) {
      gsap.killTweensOf([rig.position, rig.rotation]);
      setAim(false, true);
      if (instant || !running) { stop(); return Promise.resolve(); }
      return gsap.to(rig.position, { y: -0.4, duration: 0.4, ease: 'power3.in', onComplete: stop }).then();
    },

    dispose() {
      stop();
      removeEventListener('resize', layout);
      debris.forEach(d => { if (d.obj.isSprite) d.obj.material.dispose(); });
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      scope.el.remove();
      reticle.el.remove();
    },
  };
}

/* ---------- the red dot (pistol) or holographic ring (SMG), seen through the sight's glass ---------- */
function makeReticle(kind) {
  const el = document.createElement('div');
  el.className = 'sketch-reticle';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = kind === 'cross'
    // a duplex reticle: thick posts from the rim, hair-thin lines in the middle, mil dots, and
    // the dark shading a scope has round the edge of its picture
    ? '<svg viewBox="-100 -100 200 200"><defs><radialGradient id="sg-shade"><stop offset="72%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".6"/></radialGradient></defs>'
      + '<circle r="100" fill="url(#sg-shade)"/><circle r="99" fill="none" stroke="#1b1a17" stroke-width="2"/>'
      + '<path d="M-100 0 H-42 M42 0 H100 M0 42 V100 M0 -100 V-42" stroke="#1b1a17" stroke-width="5"/>'
      + '<path d="M-42 0 H-3 M3 0 H42 M0 -42 V-3 M0 3 V42" stroke="#1b1a17" stroke-width="0.9"/>'
      + [-30, -20, -10, 10, 20, 30].map(v => `<circle cx="${v}" r="1.5" fill="#1b1a17"/><circle cy="${v}" r="1.5" fill="#1b1a17"/>`).join('')
      + '</svg>'
    : kind === 'holo'
    ? '<svg viewBox="-20 -20 40 40"><circle r="13" fill="none" stroke="#ff3b30" stroke-width="1.6"/><circle r="1.8" fill="#ff3b30"/><path d="M0 -13 V-17 M0 13 V17 M-13 0 H-17 M13 0 H17" stroke="#ff3b30" stroke-width="1.6"/></svg>'
    : '<svg viewBox="-20 -20 40 40"><circle r="2.6" fill="#ff3b30"/><circle r="5" fill="none" stroke="rgba(255,59,48,.25)" stroke-width="3"/></svg>';
  if (kind === 'cross') el.classList.add('scope');
  if (kind) document.body.append(el);
  return {
    el,
    place(x, y, alpha, r) {
      if (!kind) return;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = alpha;
      if (r) Object.assign(el.style, { width: `${r * 2}px`, height: `${r * 2}px`, left: `${-r}px`, top: `${-r}px` });
    },
  };
}

/* ---------- the scope view: a thick ink ring and crosshair on paper, centred on the shot ---------- */
function makeScopeOverlay() {
  const el = document.createElement('div');
  el.className = 'sketch-scope';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="-100 -100 200 200">
    <circle r="86" fill="none" stroke="#1b1a17" stroke-width="12"/>
    <circle r="97" fill="none" stroke="#1b1a17" stroke-width="1.6" stroke-dasharray="40 3 22 4"/>
    <path d="M-86 0 H-6 M6 0 H86 M0 -86 V-6 M0 6 V86" stroke="#1b1a17" stroke-width="1.4"/>
    <path d="M-8 18 H8 M-5 30 H5 M-8 42 H8 M-5 54 H5" stroke="#1b1a17" stroke-width="1.4"/>
  </svg>`;
  document.body.append(el);
  const svg = el.querySelector('svg');
  let r = 0;
  // the overlay is taller than the screen so the kick can throw it up without a gap
  const move = (x, y) => {
    el.style.setProperty('--x', `${x}px`);
    el.style.setProperty('--y', `${y + innerHeight * 0.4}px`);
  };
  return {
    el,
    move,
    enter(x, y, instant) {
      r = Math.min(innerWidth, innerHeight) * 0.38;
      el.style.setProperty('--r', `${r}px`);
      move(x, y);
      gsap.killTweensOf([el, svg]);
      gsap.set(el, { y: 0 });
      gsap.to(el, { autoAlpha: 1, duration: instant ? 0 : 0.12 });
      gsap.fromTo(svg, { scale: 1.12 }, { scale: 1, duration: instant ? 0 : 0.18, ease: 'power3.out' });
    },
    kick(reduced) {
      gsap.timeline()
        .to(el, { y: reduced ? 0 : -r * 0.35, duration: 0.07, ease: 'power3.out' })
        .to(el, { y: 0, duration: 0.4, ease: 'power2.inOut' });
    },
    exit(instant) {
      gsap.killTweensOf(el);
      gsap.to(el, { autoAlpha: 0, y: 0, duration: instant ? 0 : 0.12 });
    },
  };
}

/* ---------- making lines look drawn ----------
   Each straight edge gets a little overshoot at both ends, a wobble, and sometimes a gap. */
function roughen(src, rough = 1) {
  const out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), m1 = new THREE.Vector3(), m2 = new THREE.Vector3();
  const r = Math.random;
  const j = () => (r() - 0.5) * 0.0011 * rough;
  for (let i = 0; i < src.length; i += 6) {
    a.set(src[i], src[i + 1], src[i + 2]);
    b.set(src[i + 3], src[i + 4], src[i + 5]);
    d.subVectors(b, a);
    const len = d.length();
    if (len < 1e-6) continue;
    // short segments are pieces of a curve (a barrel's rim, a scope's bell): they must meet
    // end to end, so they get no overshoot, no gap and only a whisper of wobble
    const curve = len < 0.016, w = curve ? 0.25 : 1;
    if (!curve) { a.addScaledVector(d, -r() * 0.05 * rough); b.addScaledVector(d, r() * 0.05 * rough); }
    a.add(m1.set(j() * w, j() * w, j() * w));
    b.add(m1.set(j() * w, j() * w, j() * w));
    if (len > 0.03 && r() < 0.16 * rough) {
      const t = 0.3 + r() * 0.4, gap = Math.min(0.03 + r() * 0.05, 0.006 / len);
      m1.lerpVectors(a, b, t - gap / 2);
      m2.lerpVectors(a, b, t + gap / 2);
      out.push(a.x, a.y, a.z, m1.x, m1.y, m1.z, m2.x, m2.y, m2.z, b.x, b.y, b.z);
    } else {
      out.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  return out;
}

function drawSmoke() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.strokeStyle = SMOKE;
  x.fillStyle = 'rgba(160,154,144,.35)';
  x.lineWidth = 3;
  [[64, 70, 30], [44, 58, 20], [84, 54, 22], [62, 40, 18]].forEach(([cx, cy, r]) => {
    x.beginPath();
    x.arc(cx, cy, r, 0.2, Math.PI * 2 - 0.5);
    x.fill();
    x.stroke();
  });
  return c;
}
