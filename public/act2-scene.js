/* ---------- act 2: "ew, this looks so AI. let me fix that." ----------
   A small low-poly room and a low-poly Sein, built from primitives so there's no model file to
   load. He's a hierarchy of joints (hips, spine, shoulders...) and his two animations, IdleDare
   and ShotSlump, are keyframed clips played by an AnimationMixer. script.js drives the beats. */
import * as THREE from 'three';

const gsap = window.gsap;
const CREAM = 0xefe3cf;

// camera framings: where it starts (during the "render pass"), where it settles, where it pushes in to
const SHOTS = {
  start: { px: 2.2, py: 2.6, pz: 7.2, tx: 0, ty: 1.2, tz: 0 },
  frame: { px: 0.55, py: 1.5, pz: 4.4, tx: 0.1, ty: 1.08, tz: -0.2 },
  push: { px: 0.3, py: 1.05, pz: 2.6, tx: 0.05, ty: 0.55, tz: -1.25 },
};

export function createAct2(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CREAM);
  scene.fog = new THREE.Fog(CREAM, 7, 17);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

  // soft sky/ground fill and one warm sun that throws the shadows
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0xa48565, 1.7));
  const sun = new THREE.DirectionalLight(0xffd29a, 2.6);
  sun.position.set(3.2, 6, 4.6);
  sun.target.position.set(0, 0.8, -0.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4.5, bottom: -3, near: 1, far: 20 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const room = buildRoom();
  scene.add(room);
  const sein = buildSein();
  sein.group.position.set(0.1, 0, 0.3);
  scene.add(sein.group);

  /* ----- animation ----- */
  const mixer = new THREE.AnimationMixer(sein.rig);
  const idle = mixer.clipAction(idleDareClip());
  const slump = mixer.clipAction(shotSlumpClip());
  slump.setLoop(THREE.LoopOnce, 1);
  slump.clampWhenFinished = true;
  idle.play();

  /* ----- camera ----- */
  const cam = { ...SHOTS.start };
  const shake = { amt: 0 };
  function layout() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // phones are tall and narrow: widen the lens so he and the wall still fit
    camera.fov = camera.aspect < 0.8 ? 58 : camera.aspect < 1.2 ? 48 : 40;
    camera.updateProjectionMatrix();
  }
  layout();
  addEventListener('resize', layout);

  const clock = new THREE.Clock();
  let raf = 0, dead = false;
  const tmp = new THREE.Vector3();
  function frame() {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 1 / 20);
    mixer.update(dt);
    const s = shake.amt;
    camera.position.set(cam.px + (Math.random() - 0.5) * s, cam.py + (Math.random() - 0.5) * s, cam.pz);
    camera.lookAt(cam.tx + (Math.random() - 0.5) * s * 0.4, cam.ty + (Math.random() - 0.5) * s * 0.4, cam.tz);
    renderer.render(scene, camera);
  }
  frame();

  /* ----- what script.js uses ----- */
  return {
    // the "render pass": everything drawn as wireframe, then filled in
    wireframe(on) {
      scene.traverse(o => {
        if (!o.isMesh) return;
        [].concat(o.material).forEach(m => { m.wireframe = on; });
      });
      renderer.shadowMap.enabled = !on;
      scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    },
    settle(duration = 1.6) {
      return gsap.to(cam, { ...SHOTS.frame, duration, ease: 'power2.inOut' });
    },
    // the point just above his hair, in css pixels: the speech bubble sits here
    headPoint() {
      sein.head.getWorldPosition(tmp);
      tmp.y += 0.34;
      tmp.project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (tmp.x + 1) / 2 * r.width, y: r.top + (1 - tmp.y) / 2 * r.height };
    },
    // where to aim the gun from: his chest
    chestPoint() {
      sein.chest.getWorldPosition(tmp);
      tmp.project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (tmp.x + 1) / 2 * r.width, y: r.top + (1 - tmp.y) / 2 * r.height };
    },
    // the second shot: stumble back into the wall and slide down it
    shoot({ reduced = false } = {}) {
      slump.reset().play();
      idle.crossFadeTo(slump, 0.06, false);
      if (!reduced) {
        gsap.timeline()
          .set(shake, { amt: 0.22 })
          .to(shake, { amt: 0, duration: 0.55, ease: 'power2.out' })
          // the back hits the wall
          .set(shake, { amt: 0.09 }, 0.88)
          .to(shake, { amt: 0, duration: 0.4, ease: 'power2.out' }, 0.88);
      }
      gsap.to(cam, { ...SHOTS.push, duration: 4.2, ease: 'power1.inOut', delay: 0.15 });
      return new Promise(resolve => setTimeout(resolve, slump.getClip().duration * 1000));
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      removeEventListener('resize', layout);
      gsap.killTweensOf(cam);
      gsap.killTweensOf(shake);
      mixer.stopAllAction();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/* ---------- the room: a warm corner with one solid back wall to fall against ---------- */
function mat(color, extra) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, metalness: 0, ...extra });
}
function box(w, h, d, material, x, y, z, { cast = false, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function buildRoom() {
  const g = new THREE.Group();
  const wall = mat(0xf2e7d1), side = mat(0xeadcc2), trim = mat(0x8a6447), ink = mat(0x1b1a17);

  // floor planks, alternating a shade
  for (let i = 0; i < 11; i++) {
    g.add(box(10, 0.1, 0.74, mat(i % 2 ? 0xc49a6c : 0xcca57a), 0, -0.05, -1.6 + 0.37 + i * 0.74));
  }
  g.add(box(10, 4.4, 0.14, wall, 0, 2.2, -1.67));            // back wall
  g.add(box(0.14, 4.4, 8.2, side, -2.67, 2.2, 2.4));          // side wall
  g.add(box(10, 0.16, 0.05, trim, 0, 0.08, -1.58));           // baseboards
  g.add(box(0.05, 0.16, 8.2, trim, -2.58, 0.08, 2.4));

  // a rug under him
  g.add(box(2.6, 0.03, 1.7, mat(0xf0b445), 0.15, 0.015, 0.55));
  g.add(box(2.3, 0.032, 1.4, mat(0xe7a43a), 0.15, 0.016, 0.55));

  // a poster: the hero's own colours
  g.add(box(1.12, 1.42, 0.05, ink, 1.45, 2.05, -1.58, { cast: true }));
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshStandardMaterial({ map: canvasTex(drawPoster()), roughness: 0.95 }));
  poster.position.set(1.45, 2.05, -1.552);
  g.add(poster);

  // a sticky note that, in hindsight, should have been bigger
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ map: canvasTex(drawNote()), roughness: 1 }));
  note.position.set(-0.85, 1.62, -1.598);
  note.rotation.z = 0.07;
  g.add(note);

  // a window in the side wall, letting the warm light in
  g.add(box(0.1, 1.5, 1.7, mat(0xfaf3e4), -2.6, 2.15, 0.9));
  g.add(box(0.04, 1.32, 1.52, mat(0xcde4ea, { emissive: 0x9cc6d4, emissiveIntensity: 0.35 }), -2.56, 2.15, 0.9));
  g.add(box(0.06, 1.32, 0.05, mat(0xfaf3e4), -2.54, 2.15, 0.9));
  g.add(box(0.06, 0.05, 1.52, mat(0xfaf3e4), -2.54, 2.15, 0.9));

  // a plant in the corner
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.17, 0.4, 7), mat(0xc4694a));
  pot.position.set(-2.05, 0.2, -1.12);
  pot.castShadow = pot.receiveShadow = true;
  g.add(pot);
  const leaf = mat(0x6f9a5b), leafDark = mat(0x5b8549);
  for (let i = 0; i < 6; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.7 + (i % 3) * 0.14, 5), i % 2 ? leaf : leafDark);
    const a = (i / 6) * Math.PI * 2;
    cone.position.set(-2.05 + Math.cos(a) * 0.08, 0.72, -1.12 + Math.sin(a) * 0.08);
    cone.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
    cone.castShadow = true;
    g.add(cone);
  }
  return g;
}

/* ---------- him: low-poly Sein, a joint hierarchy the clips can drive ---------- */
function buildSein() {
  const skin = mat(0xa8714c), sweater = mat(0xd3ccbe), pants = mat(0x5e4130), shoe = mat(0xece6d9),
    sole = mat(0x7a5a40), hair = mat(0x1c1714), frame = mat(0x2b2622), dark = mat(0x111111);
  const joint = name => { const o = new THREE.Group(); o.name = name; return o; };
  const part = (geo, material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  // a limb hanging down from its joint: thick at the top, thinner at the end
  const limb = (len, r0, r1, material, seg = 7) => {
    const geo = new THREE.CylinderGeometry(r0, r1, len, seg);
    geo.translate(0, -len / 2, 0);
    return part(geo, material);
  };

  const group = new THREE.Group();
  const rig = joint('root');
  group.add(rig);

  const hips = joint('hips');
  hips.position.y = 0.92;
  rig.add(hips);
  hips.add(part(new THREE.BoxGeometry(0.35, 0.17, 0.23), pants));

  const spine = joint('spine');
  spine.position.y = 0.06;
  hips.add(spine);
  const torso = new THREE.CylinderGeometry(0.215, 0.185, 0.58, 6);
  torso.scale(1, 1, 0.64);
  torso.translate(0, 0.29, 0);
  spine.add(part(torso, sweater));
  const hem = new THREE.CylinderGeometry(0.19, 0.19, 0.07, 6);
  hem.scale(1, 1, 0.66);
  hem.translate(0, 0.03, 0);
  spine.add(part(hem, mat(0xc7bfb0)));
  const chest = new THREE.Object3D();
  chest.position.set(0, 0.36, 0.1);
  spine.add(chest);

  const neck = joint('neck');
  neck.position.y = 0.57;
  spine.add(neck);
  const neckGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.1, 6);
  neckGeo.translate(0, 0.04, 0);
  neck.add(part(neckGeo, skin));

  const head = joint('head');
  head.position.y = 0.08;
  neck.add(head);
  const skull = new THREE.IcosahedronGeometry(0.13, 1);
  skull.scale(0.93, 1.08, 1);
  head.add(part(skull, skin, 0, 0.12, 0));
  head.add(part(new THREE.BoxGeometry(0.035, 0.06, 0.04), skin, 0.12, 0.11, 0));   // ears
  head.add(part(new THREE.BoxGeometry(0.035, 0.06, 0.04), skin, -0.12, 0.11, 0));
  const nose = part(new THREE.ConeGeometry(0.022, 0.06, 4), skin, 0, 0.1, 0.13);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  // curly hair: a cluster of chunky blobs on top and round the back
  [[0, 0.24, 0.0, 0.085], [0.07, 0.22, 0.03, 0.07], [-0.07, 0.225, 0.02, 0.072], [0.04, 0.21, 0.08, 0.06],
    [-0.04, 0.215, 0.085, 0.06], [0.09, 0.17, -0.04, 0.065], [-0.09, 0.17, -0.05, 0.066], [0, 0.18, -0.09, 0.08],
    [0.06, 0.12, -0.09, 0.06], [-0.06, 0.12, -0.09, 0.06], [0.1, 0.13, 0.04, 0.05], [-0.1, 0.13, 0.04, 0.05]]
    .forEach(([x, y, z, r]) => head.add(part(new THREE.IcosahedronGeometry(r, 0), hair, x, y, z)));
  // glasses
  [-1, 1].forEach(s => {
    const rim = part(new THREE.TorusGeometry(0.038, 0.008, 4, 8), frame, s * 0.048, 0.125, 0.122);
    head.add(rim);
    head.add(part(new THREE.BoxGeometry(0.018, 0.018, 0.01), dark, s * 0.048, 0.122, 0.117)); // eyes
    head.add(part(new THREE.BoxGeometry(0.008, 0.008, 0.11), frame, s * 0.088, 0.13, 0.07));   // arms of the glasses
  });
  head.add(part(new THREE.BoxGeometry(0.03, 0.008, 0.008), frame, 0, 0.13, 0.124));

  const joints = { hips, spine, neck, head };
  [['L', 1], ['R', -1]].forEach(([S, s]) => {
    const shoulder = joint('shoulder' + S);
    shoulder.position.set(0.245 * s, 0.5, 0);
    spine.add(shoulder);
    shoulder.add(part(new THREE.IcosahedronGeometry(0.068, 0), sweater));
    shoulder.add(limb(0.3, 0.064, 0.052, sweater));
    const elbow = joint('elbow' + S);
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    elbow.add(limb(0.25, 0.052, 0.044, sweater));
    elbow.add(part(new THREE.BoxGeometry(0.065, 0.095, 0.05), skin, 0, -0.3, 0));

    const hip = joint('hip' + S);
    hip.position.set(0.1 * s, -0.05, 0);
    hips.add(hip);
    hip.add(limb(0.44, 0.088, 0.066, pants));
    const knee = joint('knee' + S);
    knee.position.y = -0.44;
    hip.add(knee);
    knee.add(limb(0.42, 0.066, 0.052, pants));
    knee.add(part(new THREE.BoxGeometry(0.12, 0.08, 0.25), shoe, 0, -0.39, 0.05));
    knee.add(part(new THREE.BoxGeometry(0.125, 0.03, 0.26), sole, 0, -0.435, 0.05));
    Object.assign(joints, { ['shoulder' + S]: shoulder, ['elbow' + S]: elbow, ['hip' + S]: hip, ['knee' + S]: knee });
  });

  return { group, rig, head, chest, joints };
}

/* ---------- clips ----------
   Each key lists only what changes; everything else carries over from the key before.
   r: joint rotations [x, y, z] in radians. p: positions. He faces +z (the camera).
   Arms hang down, so a negative x swings them forward; the spine points up, so a negative x
   leans him back. */
function makeClip(name, keys) {
  const rNodes = new Set(), pNodes = new Set();
  keys.forEach(k => {
    Object.keys(k.r || {}).forEach(n => rNodes.add(n));
    Object.keys(k.p || {}).forEach(n => pNodes.add(n));
  });
  const rest = { root: [0, 0, 0], hips: [0, 0.92, 0] };
  const times = [], rv = {}, pv = {};
  rNodes.forEach(n => { rv[n] = []; });
  pNodes.forEach(n => { pv[n] = []; });
  let curR = {}, curP = {};
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  keys.forEach(k => {
    curR = { ...curR, ...k.r };
    curP = { ...curP, ...k.p };
    times.push(k.t);
    rNodes.forEach(n => {
      const a = curR[n] || [0, 0, 0];
      q.setFromEuler(e.set(a[0], a[1], a[2]));
      rv[n].push(q.x, q.y, q.z, q.w);
    });
    pNodes.forEach(n => pv[n].push(...(curP[n] || rest[n])));
  });
  const tracks = [
    ...[...rNodes].map(n => new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, rv[n])),
    ...[...pNodes].map(n => new THREE.VectorKeyframeTrack(`${n}.position`, times, pv[n])),
  ];
  return new THREE.AnimationClip(name, keys.at(-1).t, tracks);
}

// hand on his hip, the other one beckoning: come on then
const DARE = {
  hips: [0, 0, 0.03], spine: [0.02, 0, -0.03], neck: [0, 0, 0], head: [-0.08, 0.15, 0.12],
  shoulderL: [0.15, 0, 0.55], elbowL: [0, 0, -1.45], shoulderR: [-1.2, 0.1, -0.12], elbowR: [-0.35, 0, 0],
  hipL: [0, 0, 0.07], hipR: [0, 0, -0.07], kneeL: [0, 0, 0], kneeR: [0, 0, 0],
};

function idleDareClip() {
  return makeClip('IdleDare', [
    { t: 0, r: DARE, p: { hips: [0, 0.92, 0] } },
    { t: 0.3, r: { elbowR: [-1.55, 0, 0] } },
    { t: 0.6, r: { elbowR: [-0.35, 0, 0] } },
    { t: 0.9, r: { elbowR: [-1.55, 0, 0], head: [-0.1, 0.1, 0.16] } },
    { t: 1.2, r: { elbowR: [-0.35, 0, 0], hips: [0, 0, 0.05] }, p: { hips: [0.02, 0.915, 0] } },
    { t: 1.8, r: { head: [-0.05, 0.19, 0.1], spine: [0.03, 0, -0.05] }, p: { hips: [0.01, 0.92, 0] } },
    { t: 2.4, r: { head: DARE.head, hips: DARE.hips, spine: DARE.spine }, p: { hips: [0, 0.92, 0] } },
  ]);
}

// hit in the chest: thrown back two steps into the wall, then slides down it and slumps
function shotSlumpClip() {
  return makeClip('ShotSlump', [
    { t: 0, r: DARE, p: { root: [0, 0, 0], hips: [0, 0.92, 0] } },
    { t: 0.07, r: {
      spine: [-0.5, 0, 0.1], neck: [-0.35, 0, 0], head: [-0.2, 0.2, 0], hips: [-0.15, 0, 0],
      shoulderL: [0.6, 0, 0.5], elbowL: [-0.3, 0, 0], shoulderR: [0.5, 0, -0.6], elbowR: [-0.3, 0, 0],
    }, p: { root: [0, 0, -0.15] } },
    { t: 0.35, r: { spine: [-0.35, 0, 0.05], hipR: [0.55, 0, -0.05], kneeR: [0.5, 0, 0], hipL: [-0.2, 0, 0.05] },
      p: { root: [0.02, 0, -0.6], hips: [0, 0.9, 0] } },
    { t: 0.6, r: { spine: [-0.3, 0, -0.05], hipL: [0.55, 0, 0.05], kneeL: [0.5, 0, 0], hipR: [-0.15, 0, -0.05], kneeR: [0.1, 0, 0] },
      p: { root: [0.05, 0, -1.1] } },
    // the back meets the wall: flat against it, head knocked forward
    { t: 0.85, r: { spine: [-0.12, 0, 0], neck: [0.1, 0, 0], head: [0.25, 0, 0], hips: [0, 0, 0],
      hipL: [0.1, 0, 0.06], hipR: [0.1, 0, -0.06], kneeL: [0, 0, 0], kneeR: [0, 0, 0] },
      p: { root: [0.05, 0, -1.55], hips: [0, 0.92, 0] } },
    { t: 0.97, r: { spine: [-0.05, 0, 0], head: [0.05, 0, 0], shoulderL: [0.2, 0, 0.35], shoulderR: [0.2, 0, -0.35],
      elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0] } },
    // sliding down
    { t: 1.15, r: { hipL: [-0.4, 0, 0.06], hipR: [-0.4, 0, -0.06], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0], neck: [0.15, 0, 0] },
      p: { root: [0.05, 0, -1.58], hips: [0, 0.84, 0] } },
    { t: 1.6, r: { hipL: [-1.0, 0, 0.08], hipR: [-1.0, 0, -0.08], kneeL: [1.1, 0, 0], kneeR: [1.1, 0, 0], spine: [-0.18, 0, 0],
      head: [0.15, 0, 0.1] }, p: { root: [0.05, 0, -1.6], hips: [0, 0.5, 0] } },
    // sat against the wall, legs out, arms limp
    { t: 2.0, r: { hipL: [-1.45, 0, 0.12], hipR: [-1.4, 0, -0.08], kneeL: [0.35, 0, 0], kneeR: [0.4, 0, 0], spine: [-0.25, 0, 0],
      neck: [0.45, 0, 0], head: [0.3, 0, 0.2], shoulderL: [0.05, 0, 0.18], shoulderR: [0.05, 0, -0.18],
      elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0] }, p: { root: [0.05, 0, -1.62], hips: [0, 0.15, 0] } },
    { t: 2.4, r: { neck: [0.6, 0, 0], head: [0.35, 0.1, 0.35], spine: [-0.22, 0, 0.06] } },
  ]);
}

/* ---------- little canvas textures ---------- */
function canvasTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function drawPoster() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 333;
  const x = c.getContext('2d');
  x.fillStyle = '#ffc93c'; x.fillRect(0, 0, 256, 333);
  x.fillStyle = '#1b1a17'; x.fillRect(14, 14, 228, 305);
  x.fillStyle = '#fffdf6'; x.fillRect(20, 20, 216, 293);
  x.fillStyle = '#1b1a17'; x.textAlign = 'center';
  x.font = 'italic 92px "Instrument Serif", Georgia, serif'; x.fillText('sein.', 128, 160);
  x.font = '26px VT323, monospace'; x.fillText('★ portfolio vol. 2026 ★', 128, 214);
  x.fillStyle = '#9b8cff'; x.fillRect(48, 244, 160, 12);
  x.fillStyle = '#ff6b4a'; x.fillRect(48, 266, 110, 12);
  return c;
}
function drawNote() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffe266'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(0, 0, 128, 18);
  x.fillStyle = '#1b1a17'; x.textAlign = 'center';
  x.font = '30px VT323, monospace';
  x.fillText('do NOT', 64, 62);
  x.fillText('shoot', 64, 92);
  return c;
}
