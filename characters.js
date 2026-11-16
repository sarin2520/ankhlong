// อ่านคล่อง — 3D mascots: เต่า (ปุณ) and ยูนิคอร์น (เปญ่า)
// Every pose is a pure function of time: clip(t) -> params -> transforms.
// One shared WebGL renderer draws every mascot on the page into its own 2D canvas.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ------------------------------------------------------------------ timing helpers
const TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const EASE = {
  lin: u => u,
  io: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: u => 1 - Math.pow(1 - u, 3),
  in: u => u * u * u,
  back: u => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
// keyframes: [[t, value, ease]] — ease shapes the segment arriving at that key
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * EASE[e || 'io']((t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
const pulse = (t, at, w) => clamp01(1 - Math.abs(t - at) / w); // triangle blink
const phase = (t, at, len) => (t >= at && t <= at + len ? (t - at) / len : -1);

// ------------------------------------------------------------------ poses
const BASE = {
  y: 0, sq: 1, lean: 0, tiltX: 0, turn: 0,
  headTilt: 0, headNod: 0, headTurn: 0,
  armA: 0, armB: 0, cross: 0, waveB: 0, legA: 0, legB: 0,
  eye: 1, happy: 0, lookX: 0, lookY: 0, brow: 0, browY: 0,
  smile: 0.55, open: 0, cheek: 0, blush: 0.18, armFwd: 0,
  puffA: -1, puffB: -1, spark: -1,
};
const P = o => Object.assign({}, BASE, o);

// idle: breathing on a 100 BPM pulse (1.2 s = 2 beats), blinks, one glance
const IDLE_LEN = 4.8;
function idle(t) {
  t = ((t % IDLE_LEN) + IDLE_LEN) % IDLE_LEN;
  const breath = Math.sin(TAU * t / 1.2);
  return P({
    sq: 1 + 0.02 * breath,
    y: 0.006 * (breath + 1),
    headTilt: 0.06 * Math.sin(TAU * t / IDLE_LEN),
    headNod: 0.025 * Math.sin(TAU * t / 2.4),
    armA: 0.05 * Math.sin(TAU * t / 2.4 + 0.6),
    armB: 0.05 * Math.sin(TAU * t / 2.4 + 2.1),
    eye: 1 - pulse(t, 1.9, 0.09) - pulse(t, 4.25, 0.09),
    lookX: kf(t, [[2.8, 0], [3.05, 0.55, 'out'], [3.7, 0.55], [3.95, 0, 'out']]),
  });
}

// Each clip: { len, fn(t) -> pose, loopFrom? }. After len the mascot blends into idle
// (or loops its tail from loopFrom, used by the grumpy clip).
const CLIPS = {
  idle: { len: 0, fn: idle },
  test: { len: 9999, fn: () => P(window.__testPose || {}) }, // lab only

  // greeting on first meeting
  hello: {
    len: 2.6,
    fn: t => P({
      sq: kf(t, [[0, 1], [0.15, 0.9, 'out'], [0.4, 1.05, 'out'], [0.6, 1]]),
      y: kf(t, [[0.15, 0], [0.4, 0.18, 'out'], [0.62, 0, 'in']]),
      armB: kf(t, [[0, 0], [0.3, 2.5, 'back'], [2.2, 2.5], [2.6, 0.2]]),
      waveB: t > 0.4 && t < 2.2 ? 0.35 * Math.sin(TAU * (t - 0.4) / 0.45) * kf(t, [[0.4, 0], [0.6, 1], [2.0, 1], [2.2, 0]]) : 0,
      headTilt: kf(t, [[0, 0], [0.5, 0.18], [2.2, 0.18], [2.6, 0]]),
      smile: kf(t, [[0, 0.55], [0.3, 1]]),
      open: kf(t, [[0, 0], [0.35, 0.55], [1.4, 0.55], [1.8, 0.2]]),
      happy: kf(t, [[0, 0], [0.4, 0.55], [2.2, 0.55], [2.6, 0.2]]),
      eye: 1 - pulse(t, 1.5, 0.08),
    }),
  },

  // small celebration on a correct answer
  yay: {
    len: 1.1,
    fn: t => P({
      y: kf(t, [[0.12, 0], [0.38, 0.45, 'out'], [0.62, 0, 'in']]),
      sq: kf(t, [[0, 1], [0.12, 0.84, 'out'], [0.22, 1.12, 'out'], [0.5, 1.03], [0.62, 1], [0.68, 0.86, 'out'], [0.85, 1.04, 'out'], [1.05, 1]]),
      armA: kf(t, [[0, 0], [0.12, -0.15], [0.3, 2.4, 'out'], [1.1, 1.9]]),
      armB: kf(t, [[0, 0], [0.14, -0.15], [0.33, 2.3, 'out'], [1.1, 1.8]]),
      lookY: kf(t, [[0, 0], [0.1, 0.5], [0.5, 0]]),
      happy: kf(t, [[0, 0], [0.25, 0.9], [1.1, 0.75]]),
      smile: kf(t, [[0, 0.55], [0.2, 1]]),
      open: kf(t, [[0, 0], [0.25, 0.65], [1.1, 0.4]]),
      blush: kf(t, [[0, 0.18], [0.4, 0.4]]),
      spark: phase(t, 0.62, 0.7),
    }),
  },

  // lesson passed: anticipation -> leap with a full spin (the shell / mane shows) -> land -> pumps
  cheer: { len: 3.2, fn: t => cheerPose(t, 1) },
  cheer2: { len: 3.6, fn: t => cheerPose(t, 2) }, // team reward: double spin

  // wrong answer: "it's okay" (soft nod) -> "you can do it" (flipper up)
  encourage: {
    len: 2.4,
    fn: t => P({
      lookX: kf(t, [[0, 0], [0.15, -0.3, 'out'], [0.45, 0, 'io']]),
      headTilt: kf(t, [[0, 0], [0.35, 0.24, 'out'], [1.2, 0.24], [1.6, 0.05]]),
      headNod: kf(t, [[0.35, 0], [0.5, 0.2], [0.68, -0.04], [0.84, 0.2], [1.02, 0]]),
      brow: kf(t, [[0, 0], [0.3, -0.5], [1.1, -0.5], [1.45, 0.3]]),
      browY: kf(t, [[0, 0], [0.3, 0.5], [1.1, 0.5], [1.45, 0]]),
      smile: kf(t, [[0, 0.55], [0.3, 0.3], [1.15, 0.3], [1.4, 0.95]]),
      armA: kf(t, [[0, 0], [1.05, 0], [1.15, -0.25], [1.42, 1.45, 'back'], [2.4, 1.4]]),
      armFwd: kf(t, [[1.05, 0], [1.42, 1, 'back'], [1.62, 0.8], [1.8, 1], [1.98, 0.85], [2.4, 0.95]]),
      lean: kf(t, [[1.05, 0], [1.42, -0.09, 'out'], [2.4, -0.06]]),
      sq: kf(t, [[1.05, 1], [1.15, 0.93, 'out'], [1.42, 1.03, 'out'], [1.6, 1]]),
      happy: kf(t, [[1.2, 0], [1.5, 0.25]]),
      open: kf(t, [[1.3, 0], [1.5, 0.45], [2.4, 0.3]]),
    }),
  },

  // long absence: side-eye -> arms crossed, turn away, puffed cheeks, foot tap, steam -> peek back
  grumpy: {
    len: 4.4, loopFrom: 1.4,
    fn: t => {
      const away = kf(t, [[0.4, 0], [0.9, 1, 'back'], [2.8, 1], [3.2, 0.8, 'io'], [3.6, 0.8], [4.0, 1, 'io']]);
      return P({
        lookX: kf(t, [[0, 0], [0.3, -0.6, 'out'], [2.8, -0.6], [3.15, 0.65, 'io'], [3.6, 0.65], [4.0, -0.6, 'io']]),
        brow: kf(t, [[0, 0], [0.4, 0.7]]),
        eye: kf(t, [[0, 1], [0.4, 0.72], [2.8, 0.72], [3.15, 0.5], [3.6, 0.5], [4.0, 0.72]]),
        cross: kf(t, [[0.35, 0], [0.85, 1, 'back']]),
        turn: -0.75 * away,
        headTurn: -0.3 * away + kf(t, [[2.8, 0], [3.2, 0.25], [3.6, 0.25], [4.0, 0]]),
        headNod: kf(t, [[0.4, 0], [0.75, -0.18, 'out'], [2.8, -0.18], [3.2, -0.05], [3.6, -0.05], [4.0, -0.18]]),
        cheek: kf(t, [[0.4, 0], [0.8, 1, 'back']]),
        smile: kf(t, [[0, 0.55], [0.5, -0.3]]),
        blush: kf(t, [[0, 0.18], [0.8, 0.5]]),
        sq: kf(t, [[0.4, 1], [0.6, 0.9, 'out'], [0.85, 1.02], [1.0, 1]]),
        legA: Math.max(0, Math.sin(TAU * (t - 1.4) / 0.32)) * (t > 1.4 && t < 2.68 ? 1 : 0),
        puffA: phase(t, 1.05, 0.9),
        puffB: phase(t, 2.2, 0.9),
      });
    },
  },

  // after "sorry": uncross, turn back, hop into an open-armed hug pose
  forgive: {
    len: 2.0,
    fn: t => {
      const back = kf(t, [[0, 1], [0.5, 0, 'out']]);
      return P({
        turn: -0.75 * back, headTurn: -0.3 * back,
        headNod: kf(t, [[0, -0.18], [0.5, 0]]),
        lookX: kf(t, [[0, -0.6], [0.35, 0, 'out']]),
        cross: kf(t, [[0, 1], [0.45, 0, 'out']]),
        brow: kf(t, [[0, 0.7], [0.4, -0.1]]),
        eye: kf(t, [[0, 0.72], [0.35, 1]]),
        cheek: kf(t, [[0, 1], [0.3, 0]]),
        smile: kf(t, [[0, -0.3], [0.4, 1]]),
        open: kf(t, [[0.4, 0], [0.7, 0.6], [2.0, 0.4]]),
        happy: kf(t, [[0.4, 0], [0.7, 0.8]]),
        blush: kf(t, [[0, 0.5], [0.8, 0.5]]),
        y: kf(t, [[0.5, 0], [0.72, 0.3, 'out'], [0.95, 0, 'in']]),
        sq: kf(t, [[0.4, 1], [0.5, 0.86, 'out'], [0.62, 1.1], [0.95, 1], [1.02, 0.88, 'out'], [1.2, 1.03], [1.35, 1]]),
        armA: kf(t, [[0.4, 0], [0.75, 1.5, 'back'], [2.0, 1.4]]),
        armB: kf(t, [[0.45, 0], [0.8, 1.5, 'back'], [2.0, 1.4]]),
        spark: phase(t, 0.95, 0.7),
      });
    },
  },
};

function cheerPose(t, spins) {
  const L = spins > 1 ? 0.35 : 0; // a double spin needs a longer hang time
  return P({
    y: kf(t, [[0.3, 0], [0.75 + L / 2, 1.0 + L, 'out'], [1.1 + L, 0, 'in'], [1.55 + L, 0], [1.72 + L, 0.2, 'out'], [1.9 + L, 0, 'in'], [2.05 + L, 0], [2.22 + L, 0.2, 'out'], [2.4 + L, 0, 'in']]),
    sq: kf(t, [[0, 1], [0.3, 0.8, 'out'], [0.38, 1.16, 'out'], [0.62, 1], [1.1 + L, 1], [1.17 + L, 0.78, 'out'], [1.32 + L, 1.07, 'out'], [1.48 + L, 1],
      [1.9 + L, 1], [1.95 + L, 0.9], [2.05 + L, 1], [2.4 + L, 1], [2.45 + L, 0.9], [2.6 + L, 1]]),
    turn: kf(t, [[0.36, 0], [1.05 + L, -TAU * spins, 'io']]),
    lookY: kf(t, [[0, 0], [0.25, 0.7, 'out'], [0.6, 0]]),
    browY: kf(t, [[0, 0], [0.25, 0.35], [0.7, 0]]),
    brow: kf(t, [[0.5, 0], [0.8, 0.2], [1.2 + L, 0]]),
    armA: kf(t, [[0, 0], [0.3, -0.35, 'out'], [0.5, 2.6, 'out'], [1.55 + L, 2.6], [1.72 + L, 1.7], [1.9 + L, 2.6], [2.22 + L, 1.7], [2.45 + L, 2.5], [3.2 + L, 2.4]]),
    armB: kf(t, [[0, 0], [0.3, -0.35, 'out'], [0.53, 2.6, 'out'], [1.55 + L, 2.6], [1.72 + L, 2.6], [1.9 + L, 1.7], [2.22 + L, 2.6], [2.45 + L, 2.5], [3.2 + L, 2.4]]),
    legA: kf(t, [[0.4, 0], [0.6, 0.5], [1.0 + L, 0.1], [1.1 + L, 0]]),
    legB: kf(t, [[0.42, 0], [0.62, 0.4], [1.0 + L, 0.1], [1.1 + L, 0]]),
    happy: kf(t, [[0, 0], [0.4, 0.3], [1.1 + L, 0.3], [1.25 + L, 0.9]]),
    smile: kf(t, [[0, 0.55], [0.3, 0.8], [1.2 + L, 1]]),
    open: kf(t, [[0, 0], [0.4, 0.7], [1.1 + L, 0.5], [1.25 + L, 0.85], [3.2 + L, 0.6]]),
    blush: kf(t, [[0, 0.18], [1.2 + L, 0.45]]),
    lean: kf(t, [[2.4 + L, 0], [2.7 + L, 0.06]]),
    spark: phase(t, 1.1 + L, 0.9),
    eye: 1 - pulse(t, 2.9 + L, 0.08),
  });
}

function lerpPose(a, b, w) {
  const o = {};
  for (const k in a) o[k] = (k === 'puffA' || k === 'puffB' || k === 'spark') ? (w < 0.5 ? a[k] : b[k]) : a[k] + (b[k] - a[k]) * w;
  return o;
}
// pose of a clip at time t, including the hand-off into idle
function poseAt(clipName, t, idleOffset = 0) {
  const c = CLIPS[clipName] || CLIPS.idle;
  if (!c.len) return idle(t + idleOffset);
  if (t <= c.len) return c.fn(t);
  if (c.loopFrom != null) return c.fn(c.loopFrom + ((t - c.len) % (c.len - c.loopFrom)));
  const w = EASE.io(clamp01((t - c.len) / 0.5));
  return lerpPose(c.fn(c.len), idle(t - c.len + idleOffset), w);
}

// ------------------------------------------------------------------ materials
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let FELT = null;
function feltTexture() {
  if (FELT) return FELT;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), rnd = mulberry32(7);
  g.fillStyle = '#ececec'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 200 + Math.floor(rnd() * 55);
    g.fillStyle = `rgba(${v},${v},${v},0.55)`;
    g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 0.6 + rnd() * 2.2, 0, TAU); g.fill();
  }
  FELT = new THREE.CanvasTexture(c);
  FELT.wrapS = FELT.wrapT = THREE.RepeatWrapping; FELT.repeat.set(2, 2);
  FELT.colorSpace = THREE.SRGBColorSpace;
  return FELT;
}
const felt = (color, rough = 0.9) => new THREE.MeshStandardMaterial({ color, roughness: rough, map: feltTexture(), bumpMap: feltTexture(), bumpScale: 0.6 });
const gloss = color => new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0.05 });
const metal = color => new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.65 });
const flat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });

const SPH = new THREE.SphereGeometry(1, 40, 28);
function ball(mat, r, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(SPH, mat); m.scale.set(r * sx, r * sy, r * sz); return m; }
// point on a sphere of radius r: yaw (left/right) and pitch (up/down) in radians
const onSphere = (r, yaw, pitch) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * r, Math.sin(pitch) * r, Math.cos(yaw) * Math.cos(pitch) * r);

const RAINBOW = ['#ff6b6b', '#ffb03d', '#ffd84a', '#4cd38a', '#4aa8ff', '#a46bff'];

// ------------------------------------------------------------------ the shared rig
// Both characters share proportions and controls; only their parts differ.
function buildRig(spec) {
  const root = new THREE.Group();
  const body = new THREE.Group(); body.rotation.order = 'YXZ'; root.add(body);

  // shadow blob
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const sg = sc.getContext('2d'), gr = sg.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(40,25,20,0.45)'); gr.addColorStop(1, 'rgba(40,25,20,0)');
  sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; root.add(shadow);

  const skin = felt(spec.skin), skinDark = felt(spec.skinDark);

  // legs
  const legs = [1, -1].map(s => {
    const piv = new THREE.Group(); piv.position.set(0.27 * s, 0.28, 0.02); body.add(piv);
    const leg = ball(skin, 0.2, 0.95, 1.15, 1); leg.position.y = -0.12; piv.add(leg);
    if (spec.hoof) { const h = ball(felt(spec.hoof, 0.6), 0.19, 1, 0.55, 1); h.position.y = -0.24; piv.add(h); }
    return piv;
  });

  // torso
  const torso = ball(spec.torsoMat || skin, 0.6, 1, 1.02, 0.86); torso.position.y = 0.72; body.add(torso);
  spec.buildTorso && spec.buildTorso(body);

  // arms (pivot at the shoulder, limb hangs down)
  const arms = [1, -1].map(s => {
    const piv = new THREE.Group(); piv.position.set(0.52 * s, 0.98, 0.04); body.add(piv);
    const arm = ball(skin, 0.17, 1, 2.1, 0.95); arm.position.y = -0.3; piv.add(arm);
    if (spec.hoof) { const h = ball(felt(spec.hoof, 0.6), 0.165, 1, 0.6, 0.95); h.position.y = -0.6; piv.add(h); }
    return piv;
  });

  // head
  const neck = new THREE.Group(); neck.position.y = 1.2; neck.rotation.order = 'YXZ'; body.add(neck);
  const head = new THREE.Group(); head.position.y = 0.38; neck.add(head);
  const HR = spec.headR;
  const skull = ball(spec.headMat || skin, HR, 1.08, 1, 1); head.add(skull);
  spec.buildHead && spec.buildHead(head, HR);

  // eyes: glossy black with two highlights, upper + lower lids
  const eyeMat = gloss('#15110f'), hiMat = flat('#ffffff');
  const lidMat = spec.headMat || skin;
  const eyes = [1, -1].map(s => {
    const g = new THREE.Group();
    const p = onSphere(HR, 0.36 * s, spec.eyePitch); g.position.copy(p).multiplyScalar(0.94);
    g.lookAt(p.clone().multiplyScalar(3));
    const er = spec.eyeR;
    const eye = ball(eyeMat, er, 0.9, 1.08, 0.62); g.add(eye);
    const h1 = ball(hiMat, er * 0.3); h1.position.set(er * 0.32, er * 0.38, er * 0.5); g.add(h1);
    const h2 = ball(hiMat, er * 0.13); h2.position.set(-er * 0.3, -er * 0.3, er * 0.55); g.add(h2);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(er * 1.12, 32, 16, 0, TAU, 0, Math.PI / 2), lidMat);
    upper.scale.set(0.95, 1.1, 0.75);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(er * 1.1, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), lidMat);
    lower.scale.set(0.95, 1.1, 0.75);
    const upPiv = new THREE.Group(); upPiv.add(upper); g.add(upPiv);
    const loPiv = new THREE.Group(); loPiv.add(lower); g.add(loPiv);
    head.add(g);
    // brow
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, er * 1.1, 6, 12), felt(spec.brow));
    brow.rotation.z = Math.PI / 2;
    const bp = onSphere(HR * 1.01, 0.36 * s, spec.eyePitch + 0.42);
    const browPiv = new THREE.Group(); browPiv.position.copy(bp); browPiv.lookAt(bp.clone().multiplyScalar(3)); browPiv.add(brow); head.add(browPiv);
    // cheek blush
    const cp = onSphere(HR * 0.99, 0.62 * s, spec.eyePitch - 0.32);
    const cheek = ball(new THREE.MeshStandardMaterial({ color: '#ff7a8f', roughness: 0.9, transparent: true, opacity: 0.35 }), 0.1, 1.2, 0.75, 0.4);
    cheek.position.copy(cp); cheek.lookAt(cp.clone().multiplyScalar(3)); head.add(cheek);
    return { g, s, base: g.position.clone(), upPiv, loPiv, browPiv, browBase: bp.clone(), cheek };
  });

  // mouth: a tube along a curve rebuilt from (smile, open), plus a dark inner shape
  const mouthAnchor = new THREE.Group();
  mouthAnchor.position.copy(spec.mouthPos); mouthAnchor.lookAt(spec.mouthPos.clone().add(spec.mouthDir || new THREE.Vector3(0, -0.15, 1)));
  head.add(mouthAnchor);
  const lipMat = felt('#3b2420', 0.7);
  const inner = ball(new THREE.MeshStandardMaterial({ color: '#7a2d33', roughness: 0.6 }), 1); mouthAnchor.add(inner);
  const tongue = ball(new THREE.MeshStandardMaterial({ color: '#ff8a8a', roughness: 0.7 }), 1); mouthAnchor.add(tongue);
  let lip = null, lipKey = '';
  function setMouth(smile, open) {
    const W = spec.mouthW;
    const key = smile.toFixed(2) + '|' + open.toFixed(2);
    if (key === lipKey) return; lipKey = key;
    if (lip) { mouthAnchor.remove(lip); lip.geometry.dispose(); }
    const sag = -smile * 0.1;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-W, 0, 0), new THREE.Vector3(0, sag * 2, 0.02), new THREE.Vector3(W, 0, 0));
    lip = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.02, 8, false), lipMat); mouthAnchor.add(lip);
    const oh = open * 0.13 + 0.0001;
    inner.scale.set(W * 0.82, oh, 0.035); inner.position.set(0, sag - oh * 0.75, -0.01);
    tongue.scale.set(W * 0.45, oh * 0.45, 0.03); tongue.position.set(0, sag - oh * 1.15, 0.0);
    inner.visible = tongue.visible = open > 0.03;
  }

  // steam puffs (grumpy) and sparkles (cheer)
  const puffMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.9 });
  const puffs = [1, -1].map(s => { const g = new THREE.Group(); [0, 1, 2].forEach(i => { const b = ball(puffMat, 0.13 - i * 0.025); b.position.set(i * 0.1 * s, i * 0.09, 0); g.add(b); }); g.position.set(0.2 * s, HR * 0.95, 0); g.userData.s = s; head.add(g); return g; });
  const sparkMat = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb000', emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.3 });
  const sparks = [...Array(7)].map((_, i) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), sparkMat); m.userData.a = (i / 7) * TAU + 0.3; root.add(m); return m; });

  // accessory anchors
  const anchors = { top: new THREE.Group(), eyes: new THREE.Group(), side: new THREE.Group(), chest: new THREE.Group() };
  anchors.top.position.set(0, HR * 0.86, 0); head.add(anchors.top);
  const ep = onSphere(HR, 0, spec.eyePitch); anchors.eyes.position.copy(ep); head.add(anchors.eyes);
  anchors.side.position.set(1.0, 0, 0.2); root.add(anchors.side);
  anchors.chest.position.set(0, 0.95, 0.5); body.add(anchors.chest);

  const extra = spec.extra || (() => {});

  function apply(p, t) {
    body.position.y = p.y;
    const sxz = 1 / Math.sqrt(p.sq);
    body.scale.set(sxz, p.sq, sxz);
    body.rotation.set(p.tiltX, p.turn, p.lean);
    neck.rotation.set(p.headNod, p.headTurn, p.headTilt);
    // limbs
    const cross = p.cross;
    arms.forEach((a, i) => {
      const s = i === 0 ? 1 : -1, raise = i === 0 ? p.armA : p.armB;
      a.rotation.order = 'XYZ';
      // crossing brings the shoulders forward so the arms rest on the belly, one above the other
      a.position.set(0.52 * s - 0.04 * s * cross, 0.98 - (i === 0 ? 0.04 : 0.26) * cross, 0.04 + (i === 0 ? 0.46 : 0.38) * cross);
      // armFwd swings arm A up toward the camera (fist pump) instead of out to the side
      const fwd = i === 0 ? clamp01(p.armFwd) : 0;
      a.rotation.x = -1.3 * cross - 2.2 * fwd;
      a.rotation.z = s * (((0.3 + raise) * (1 - fwd) + 0.3 * fwd) * (1 - cross) - (i === 0 ? 1.2 : 0.95) * cross) + (i === 1 ? p.waveB : 0);
    });
    const dangle = Math.min(1, p.y * 1.5);
    legs[0].rotation.x = -0.5 * p.legA - 0.25 * dangle;
    legs[1].rotation.x = -0.5 * p.legB - 0.2 * dangle;
    legs[0].position.y = 0.28 + 0.06 * p.legA;
    // face
    eyes.forEach(e => {
      e.g.position.set(e.base.x + p.lookX * 0.035, e.base.y + p.lookY * 0.03 + p.browY * 0.005, e.base.z);
      const open = clamp01(p.eye);
      e.upPiv.rotation.set(-Math.PI / 2 + (1 - open) * Math.PI * 0.95, 0, e.s * p.brow * 0.38 * (1 - open * 0.4));
      e.loPiv.rotation.x = Math.PI / 2 - p.happy * Math.PI * 0.62;
      const bb = e.browBase;
      e.browPiv.position.set(bb.x, bb.y + p.browY * 0.06 - Math.max(0, p.brow) * 0.035, bb.z);
      e.browPiv.rotation.z = e.s * p.brow * 0.5;
      e.cheek.scale.set(0.12 * (1 + p.cheek * 0.8), 0.075 * (1 + p.cheek * 0.8), 0.04 * (1 + p.cheek * 2.6));
      e.cheek.material.color.set(p.cheek > 0.3 ? '#ff6f7f' : '#ff7a8f');
      e.cheek.material.opacity = clamp01(p.blush);
    });
    skull.scale.set(HR * 1.08 * (1 + p.cheek * 0.05), HR, HR);
    setMouth(Math.max(-1, Math.min(1, p.smile)), clamp01(p.open) * (1 - p.cheek * 0.8));
    // fx
    puffs.forEach((g, i) => {
      const ph = i === 0 ? p.puffA : p.puffB;
      g.visible = ph >= 0;
      if (ph >= 0) { g.position.y = HR * 0.95 + EASE.out(ph) * 0.35; g.position.x = (0.2 + ph * 0.25) * g.userData.s; g.scale.setScalar(0.4 + EASE.out(ph) * 0.8); g.children.forEach(b => (b.material.opacity = 0.9 * (1 - ph))); }
    });
    sparks.forEach((m, i) => {
      m.visible = p.spark >= 0;
      if (p.spark >= 0) {
        const r = 0.5 + EASE.out(p.spark) * 1.0;
        m.position.set(Math.cos(m.userData.a) * r, 0.35 + Math.sin(m.userData.a) * r * 0.55 + 0.6, 0.25);
        m.scale.setScalar(Math.sin(Math.PI * p.spark) * (1 + (i % 3) * 0.25));
        m.rotation.set(p.spark * 4 + i, p.spark * 3, 0);
      }
    });
    // shadow follows the body height
    shadow.scale.setScalar(1 - Math.min(0.45, p.y * 0.35));
    shadow.material.opacity = 1 - Math.min(0.6, p.y * 0.5);
    extra(p, t);
  }
  return { root, body, head, neck, anchors, apply, HR };
}

// ------------------------------------------------------------------ the two characters
function colorList(color, n) { return color === 'rainbow' ? RAINBOW.slice(0, n) : Array(n).fill(color); }
function shade(hex, f) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, f); return '#' + c.getHexString(); }

function buildTurtle(o) {
  const shellCol = o.color === 'rainbow' ? '#4aa8ff' : o.color;
  let tailRef = null;
  const spec = {
    skin: '#9fcb7c', skinDark: '#6d9a52', brow: '#4f7a3a',
    headR: 0.5, eyeR: 0.125, eyePitch: 0.12,
    mouthPos: onSphere(0.5, 0, -0.22).multiplyScalar(1.0), mouthW: 0.14,
    buildTorso(body) {
      // belly plate (plastron)
      const plate = ball(felt('#f0dfa8'), 0.5, 0.92, 1.0, 0.5); plate.position.set(0, 0.7, 0.3); body.add(plate);
      [0.55, 0.78].forEach(y => { const g = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 6, 32, Math.PI * 0.62), felt('#c9b37a')); g.rotation.z = Math.PI * 1.19; g.position.set(0, y + 0.12, 0.47); g.scale.set(1, 0.35, 1); body.add(g); });
      // shell dome on the back with a cream rim and plates
      const shell = ball(felt(shellCol, 0.75), 0.72, 1.16, 1.12, 0.8); shell.position.set(0, 0.76, -0.2); body.add(shell);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 12, 48), felt(shade(shellCol, 0.18)));
      rim.position.set(0, 0.76, -0.04); rim.scale.set(1.16, 1.14, 1); body.add(rim);
      const cols = colorList(o.color === 'rainbow' ? 'rainbow' : shade(shellCol, -0.12), 6);
      [[0, 0.98], [0.32, 0.78], [-0.32, 0.78], [0, 0.6], [0.3, 0.42], [-0.3, 0.42]].forEach(([x, y], i) => {
        const pl = ball(felt(cols[i % cols.length], 0.7), 0.2, 1.05, 0.9, 0.35);
        const n = new THREE.Vector3(x, y - 0.76, -0.6).normalize();
        pl.position.set(x * 0.95, y, -0.2 - 0.52); pl.lookAt(pl.position.clone().add(n)); body.add(pl);
      });
      [[0.74, 0.95], [0.8, 0.7], [0.72, 0.42], [0.5, 1.28], [0.52, 0.18]].forEach(([x, y], i) => [1, -1].forEach(s => {
        const sc = ball(felt(cols[(i + (s > 0 ? 0 : 3)) % cols.length], 0.7), 0.15, 0.7, 0.95, 0.5);
        sc.position.set(x * s * 1.02, y, -0.06); sc.lookAt(new THREE.Vector3(x * s * 3, y + (y - 0.76) * 2, 0.4)); body.add(sc);
      }));
      const tail = ball(felt('#9fcb7c'), 0.1, 0.8, 0.8, 1.6); tail.position.set(0, 0.32, -0.62); body.add(tail); tailRef = tail;
    },
    buildHead(head, HR) {
      // little nostrils and a cheeky shine
      [1, -1].forEach(s => { const n = ball(flat('#4a6b37'), 0.018); n.position.copy(onSphere(HR, 0.09 * s, -0.02)); head.add(n); });
    },
    extra(p, t) { if (tailRef) tailRef.rotation.y = 0.35 * Math.sin(t * TAU / 1.2); },
  };
  return buildRig(spec);
}

function buildUnicorn(o) {
  const cols = colorList(o.color, 6).map((c, i) => (o.color === 'rainbow' ? c : (i % 2 ? shade(c, 0.12) : c)));
  let tail = null;
  const body = '#f8f2ee';
  const spec = {
    skin: body, skinDark: '#e7dcd6', brow: shade(cols[0], -0.1), hoof: '#b9a3e3',
    headR: 0.5, eyeR: 0.12, eyePitch: 0.2,
    mouthPos: new THREE.Vector3(0, -0.22, 0.6), mouthW: 0.12,
    buildHead(head, HR) {
      // muzzle with nostrils
      const muz = ball(felt('#fbe0e6'), 0.27, 1.25, 0.8, 0.9); muz.position.set(0, -0.17, 0.4); head.add(muz);
      [1, -1].forEach(s => { const n = ball(flat('#c98c9a'), 0.024, 1, 0.7, 1); n.position.set(0.09 * s, -0.08, 0.63); head.add(n); });
      // horn with a spiral
      const hornMat = metal('#f2c14e');
      const hornG = new THREE.Group(); hornG.position.set(0, HR * 0.86, 0.2); hornG.rotation.x = 0.32; head.add(hornG);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.62, 28), hornMat); horn.position.y = 0.31; hornG.add(horn);
      [0, 1, 2, 3].forEach(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.105 - i * 0.025, 0.014, 6, 24), hornMat); r.position.y = 0.06 + i * 0.13; r.rotation.x = Math.PI / 2 + 0.25; r.rotation.y = 0.25; hornG.add(r); });
      // ears
      [1, -1].forEach(s => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 16), felt(body)); e.position.set(0.33 * s, HR - 0.02, -0.05); e.rotation.z = -0.5 * s; head.add(e);
        const inn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.15, 12), felt('#fbcfd9')); inn.position.set(0.33 * s, HR - 0.04, 0.0); inn.rotation.z = -0.5 * s; head.add(inn); });
      // mane: forelock swoop + crest down the back of the head
      // forelock swept to one side of the horn, crest over the top, and a mane that falls down one side
      const mane = [[0.2, HR * 0.9, 0.28, 0.14], [0.32, HR * 0.72, 0.3, 0.12], [-0.17, HR * 0.94, 0.12, 0.15],
        [0.05, HR * 1.0, -0.05, 0.18], [0, HR * 0.88, -0.28, 0.2], [0, HR * 0.6, -0.44, 0.2], [0, HR * 0.22, -0.52, 0.19],
        [-0.36, HR * 0.72, -0.1, 0.17], [-0.48, HR * 0.4, -0.12, 0.17], [-0.52, HR * 0.05, -0.1, 0.16], [-0.5, -HR * 0.3, -0.06, 0.15], [-0.44, -HR * 0.62, -0.02, 0.13]];
      mane.forEach(([x, y, z, r], i) => { const m = ball(felt(cols[i % cols.length], 0.85), r); m.position.set(x, y, z); head.add(m); });
    },
    buildTorso(b) {
      tail = new THREE.Group(); tail.position.set(0, 0.45, -0.5); b.add(tail);
      [[0, 0, 0, 0.16], [0, 0.12, -0.16, 0.15], [0, 0.3, -0.24, 0.14], [0, 0.46, -0.2, 0.11]].forEach(([x, y, z, r], i) => { const m = ball(felt(cols[(i + 2) % cols.length], 0.85), r); m.position.set(x, y, z); tail.add(m); });
    },
    extra(p, t) { if (tail) tail.rotation.z = 0.25 * Math.sin(t * TAU / 1.2 + 0.8); },
  };
  return buildRig(spec);
}

// ------------------------------------------------------------------ accessories
function addAccessory(rig, acc, kid) {
  const A = rig.anchors, HR = rig.HR;
  const g = new THREE.Group();
  const red = felt('#e5484d', 0.8), dark = gloss('#1d1f2b'), gold = metal('#f2c14e');
  switch (acc) {
    case 'cap': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.04, 32, 16, 0, TAU, 0, Math.PI / 2), red); dome.scale.set(1.08, 0.75, 1.02); g.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 32, 1, false, -Math.PI / 2, Math.PI), red); brim.position.set(0, 0.0, 0.36); brim.scale.set(1, 1, 0.9); g.add(brim);
      g.position.y = -HR * 0.5; g.rotation.x = -0.12; A.top.add(g); break;
    }
    case 'phones': {
      const band = new THREE.Mesh(new THREE.TorusGeometry(HR * 1.1, 0.04, 10, 40, Math.PI), dark); band.position.y = -HR * 0.62; g.add(band);
      [1, -1].forEach(s => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 24), felt('#4aa8ff', 0.6)); cup.rotation.z = Math.PI / 2; cup.position.set(HR * 1.1 * s, -HR * 0.62, 0); g.add(cup); });
      A.top.add(g); break;
    }
    case 'shades': {
      [1, -1].forEach(s => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 28), dark); l.rotation.x = Math.PI / 2; l.position.set(0.19 * s, 0, 0.04); l.scale.set(1.15, 1, 0.85); g.add(l); });
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.025), dark); br.position.set(0, 0.03, 0.05); g.add(br);
      g.position.z = 0.05; A.eyes.add(g); break;
    }
    case 'bow': {
      const pink = felt('#ff7aa8', 0.7);
      [1, -1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 16), pink); c.rotation.z = (Math.PI / 2) * s; c.position.x = 0.1 * s; g.add(c); });
      g.add(ball(pink, 0.06)); g.position.set(0.3, -0.05, 0.12); g.rotation.z = -0.4; A.top.add(g); break;
    }
    case 'tophat': {
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.36, 32), dark); hat.position.y = 0.2; g.add(hat);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 32), dark); g.add(brim);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.245, 0.07, 32), felt('#e5484d')); band.position.y = 0.06; g.add(band);
      g.position.set(kid === 'pena' ? -0.18 : 0, -0.02, -0.02); g.rotation.z = 0.18; A.top.add(g); break;
    }
    case 'crown': {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.13, 32, 1, true), gold); ring.material.side = THREE.DoubleSide; g.add(ring);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 10), gold); c.position.set(Math.sin(a) * 0.22, 0.12, Math.cos(a) * 0.22); g.add(c);
        const jw = ball(gloss(['#e5484d', '#4aa8ff', '#4cd38a'][i % 3]), 0.03); jw.position.set(Math.sin(a) * 0.245, 0, Math.cos(a) * 0.245); g.add(jw); }
      g.position.set(kid === 'pena' ? -0.2 : 0, 0.02, 0); g.rotation.z = kid === 'pena' ? 0.3 : 0.08; A.top.add(g); break;
    }
    case 'ball': {
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#222';
      for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(10 + i * 22, i % 2 ? 18 : 44, 8, 0, TAU); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); b.position.y = 0.2; g.add(b); g.userData.spin = b;
      A.side.add(g); break;
    }
    case 'star': {
      const s = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.07 : 0.17, a = (i / 10) * TAU + Math.PI / 2; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? s.lineTo(px, py) : s.moveTo(px, py); }
      const star = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb000', emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.3 }));
      g.add(star); g.position.set(-0.15, 1.95, 0); g.userData.float = star; A.side.add(g); break;
    }
    case 'medal': {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24, Math.PI), felt('#4aa8ff')); rib.rotation.z = Math.PI; rib.position.y = 0.12; g.add(rib);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 28), gold); disc.rotation.x = Math.PI / 2; disc.position.set(0, -0.1, 0.03); g.add(disc);
      g.position.z = 0.02; A.chest.add(g); break;
    }
    default: return null;
  }
  return g;
}

// ------------------------------------------------------------------ renderer + mounts
let R = null, failed = false;
function renderer() {
  if (R || failed) return R;
  try {
    R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.08;
    R.setClearColor(0x000000, 0);
    R.setSize(256, 256, false);
  } catch (e) { failed = true; R = null; }
  return R;
}

function makeScene(kid, color, acc) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff4e8', '#7a5a48', 1.1));
  const key = new THREE.DirectionalLight('#ffe3c6', 2.4); key.position.set(2.5, 4.5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#a8cbff', 1.6); rim.position.set(-3.5, 2.5, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffd9e6', 0.5); fill.position.set(-3, 1, 3); scene.add(fill);
  const rig = kid === 'pena' ? buildUnicorn({ color }) : buildTurtle({ color });
  const accG = addAccessory(rig, acc, kid);
  scene.add(rig.root);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 1.45, 5.7); cam.lookAt(0, 1.2, 0);
  return { scene, rig, cam, accG };
}

const MOUNTS = new Set();
const FPS = 24;
function mount(el) {
  if (el.__m || !renderer()) return;
  const canvas = el.querySelector('canvas');
  const kid = el.dataset.kid || 'pun';
  const m = {
    el, canvas, ctx: canvas.getContext('2d'),
    clip: el.dataset.clip || 'idle', start: performance.now(),
    idleOffset: kid === 'pena' ? 1.7 : 0,
    still: el.dataset.still === '1', lastQ: -1, drawn: false,
    ...makeScene(kid, el.dataset.color || (kid === 'pena' ? '#e8618c' : '#3f8f5e'), el.dataset.acc || 'none'),
  };
  if (el.dataset.t) { m.fixedT = +el.dataset.t; }
  el.__m = m; MOUNTS.add(m);
  el.classList.add('live');
  draw(m, m.fixedT != null ? m.fixedT : 0);
}
function draw(m, t) {
  const r = renderer(); if (!r) return;
  const rect = m.el.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(16, Math.round(rect.width * dpr)), h = Math.max(16, Math.round(rect.height * dpr));
  if (m.canvas.width !== w || m.canvas.height !== h) { m.canvas.width = w; m.canvas.height = h; }
  const cur = r.getSize(new THREE.Vector2());
  if (cur.x < w || cur.y < h) r.setSize(Math.max(cur.x, w), Math.max(cur.y, h), false);
  const H = r.domElement.height;
  m.cam.aspect = w / h; m.cam.updateProjectionMatrix();
  const pose = poseAt(m.clip, t, m.idleOffset);
  m.rig.apply(pose, t);
  const close = rect.width < 100; // footer / header sizes: frame head + shoulders
  const camZ = close ? 3.9 : 5.7, aimY = close ? 1.62 : 1.2;
  m.cam.position.set(0, aimY + 0.25 + pose.y * (close ? 1 : 0.55), camZ); m.cam.lookAt(0, aimY + pose.y * (close ? 1 : 0.55), 0);
  if (m.accG && m.accG.userData.float) { m.accG.userData.float.rotation.y = t * 1.6; m.accG.position.y = 1.95 + 0.06 * Math.sin(t * TAU / 2.4); }
  if (m.accG && m.accG.userData.spin) m.accG.userData.spin.rotation.y = t * 0.5;
  r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h); r.setScissorTest(true);
  r.clear(); r.render(m.scene, m.cam);
  m.ctx.clearRect(0, 0, w, h);
  m.ctx.drawImage(r.domElement, 0, H - h, w, h, 0, 0, w, h);
  m.drawn = true;
}
function tick(now) {
  for (const m of MOUNTS) {
    if (!m.el.isConnected) { MOUNTS.delete(m); continue; }
    if (m.fixedT != null || (m.still && m.drawn)) continue;
    const t = (now - m.start) / 1000;
    const q = Math.floor(t * FPS); // 24 fps, like the reference film
    if (q === m.lastQ) continue;
    m.lastQ = q;
    draw(m, q / FPS);
  }
  requestAnimationFrame(tick);
}
function scan(root = document) { root.querySelectorAll('.m3d:not(.live)').forEach(mount); }

const obs = new MutationObserver(() => scan());
obs.observe(document.documentElement, { childList: true, subtree: true });
scan();
requestAnimationFrame(tick);

window.Mascot = {
  clips: Object.keys(CLIPS),
  clipLength: name => (CLIPS[name] || CLIPS.idle).len,
  // for stills / tests: render an element at an exact time
  renderAt(el, t) { mount(el); if (el.__m) { el.__m.fixedT = t; draw(el.__m, t); } },
  ok: () => !!renderer(),
};
document.dispatchEvent(new Event('mascot-ready'));
