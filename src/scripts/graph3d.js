/* The orchestrator, in space. Nodes are states, edges are transitions,
   and the bright travellers are conversations moving through them. */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const NODES = [
  ['intake',      -30,   2,   8],
  ['classify',    -16,  -4,  -6],
  ['registry',     -2,  13,   4],
  ['wf.billing',   13,  18,  -8],
  ['wf.dns',       12,   7,   9],
  ['tool.call',    -4, -15,  -4],
  ['verify',       12,  -8,   5],
  ['repair',       -2, -24,   7],
  ['handoff',      26,   8,  -3],
  ['resolve',      34,  -5,   6],
  ['eval.gate',    20, -20,  -9]
];
const IX = {};
NODES.forEach((n, i) => (IX[n[0]] = i));

const EDGES = [
  ['intake', 'classify'], ['classify', 'registry'], ['classify', 'tool.call'],
  ['registry', 'wf.billing'], ['registry', 'wf.dns'], ['wf.billing', 'handoff'],
  ['wf.dns', 'handoff'], ['tool.call', 'verify'], ['verify', 'handoff'],
  ['verify', 'repair'], ['repair', 'tool.call'], ['handoff', 'resolve'],
  ['verify', 'resolve'], ['eval.gate', 'verify'], ['eval.gate', 'resolve']
];

const ROUTES = [
  ['intake', 'classify', 'registry', 'wf.billing', 'handoff', 'resolve'],
  ['intake', 'classify', 'registry', 'wf.dns', 'handoff', 'resolve'],
  ['intake', 'classify', 'tool.call', 'verify', 'handoff', 'resolve'],
  ['intake', 'classify', 'tool.call', 'verify', 'repair', 'tool.call', 'verify', 'resolve']
].map((r) => r.map((id) => IX[id]));

export function mountGraph(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x08080a, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08080a, 0.006);
  const camera = new THREE.PerspectiveCamera(46, 1, 1, 500);
  const group = new THREE.Group();
  scene.add(group);

  const pts = NODES.map((n) => new THREE.Vector3(n[1], n[2], n[3]));

  // edges
  const verts = [];
  EDGES.forEach(([a, b]) => {
    verts.push(pts[IX[a]].x, pts[IX[a]].y, pts[IX[a]].z, pts[IX[b]].x, pts[IX[b]].y, pts[IX[b]].z);
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x36363f })));

  // nodes
  const nodeGeo = new THREE.OctahedronGeometry(1.15, 0);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0x5c6270, toneMapped: false });
  const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, NODES.length);
  const dummy = new THREE.Object3D();
  const heat = new Array(NODES.length).fill(0);
  group.add(nodes);

  // labels, drawn once into a canvas texture each
  const sprites = NODES.map((n) => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const dpr = 2;
    ctx.font = `500 ${13 * dpr}px "IBM Plex Mono", monospace`;
    c.width = Math.ceil(ctx.measureText(n[0]).width) + 8 * dpr;
    c.height = 20 * dpr;
    ctx.font = `500 ${13 * dpr}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = '#8b8b93';
    ctx.textBaseline = 'middle';
    ctx.fillText(n[0], 4 * dpr, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(c.width / dpr / 18, c.height / dpr / 18, 1);
    group.add(s);
    return s;
  });

  // travellers
  const travGeo = new THREE.SphereGeometry(0.5, 8, 8);
  const travMat = new THREE.MeshBasicMaterial({ color: 0x35e08a, toneMapped: false });
  const travellers = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(travGeo, travMat);
    m.visible = false;
    group.add(m);
    travellers.push({ mesh: m, route: null, leg: 0, t: 0, speed: 0.5 });
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15, 0.75, 0.1);
  composer.addPass(bloom);
  let quality = 2, probeFrames = 0, probeStart = 0;

  const drag = { on: false, x: 0, y: 0 };
  const rot = { x: 0.1, y: 0.2, tx: 0.1, ty: 0.2 };
  let raf = null, live = true, spawnAt = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, quality === 2 ? 1.5 : 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(r.width, r.height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(r.width, r.height);
    bloom.setSize(r.width / 2, r.height / 2);
    camera.aspect = r.width / r.height;
    camera.position.set(0, 0, r.width < 900 ? 112 : 82);
    group.position.x = r.width < 900 ? 0 : 14;
    camera.updateProjectionMatrix();
  }

  function spawn() {
    const free = travellers.find((t) => !t.route);
    if (!free) return;
    free.route = ROUTES[(Math.random() * ROUTES.length) | 0];
    free.leg = 0;
    free.t = 0;
    free.speed = 0.45 + Math.random() * 0.4;
    free.mesh.visible = true;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!drag.on) rot.ty += dt * 0.08;
    rot.x += (rot.tx - rot.x) * 0.07;
    rot.y += (rot.ty - rot.y) * 0.07;
    group.rotation.x = rot.x;
    group.rotation.y = rot.y;

    if (now > spawnAt) { spawn(); spawnAt = now + 620; }

    travellers.forEach((tr) => {
      if (!tr.route) return;
      tr.t += dt * tr.speed;
      if (tr.t >= 1) {
        tr.t = 0;
        tr.leg++;
        if (tr.leg >= tr.route.length - 1) { tr.route = null; tr.mesh.visible = false; return; }
        heat[tr.route[tr.leg]] = 1;
      }
      const a = pts[tr.route[tr.leg]], b = pts[tr.route[tr.leg + 1]];
      tr.mesh.position.lerpVectors(a, b, tr.t);
    });

    for (let i = 0; i < NODES.length; i++) {
      heat[i] *= 0.94;
      dummy.position.copy(pts[i]);
      dummy.rotation.set(now * 0.0002, now * 0.0003, 0);
      dummy.scale.setScalar(1 + heat[i] * 1.1);
      dummy.updateMatrix();
      nodes.setMatrixAt(i, dummy.matrix);
      sprites[i].position.set(pts[i].x + 3.2, pts[i].y + 1.9, pts[i].z);
      sprites[i].material.opacity = 0.52 + heat[i] * 0.48;
    }
    nodes.instanceMatrix.needsUpdate = true;

    if (quality === 2) composer.render();
    else renderer.render(scene, camera);

    if (quality === 2) {
      if (!probeStart) { probeStart = now; probeFrames = 0; }
      probeFrames++;
      if (now - probeStart > 1400) {
        if (probeFrames / ((now - probeStart) / 1000) < 26) { quality = 1; resize(); }
        probeStart = -1;
      }
    }

    raf = requestAnimationFrame(frame);
  }

  function play() { if (!raf && live) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  resize();
  addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', (e) => { drag.on = true; drag.x = e.clientX; drag.y = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', (e) => { drag.on = false; canvas.releasePointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag.on) return;
    rot.ty += (e.clientX - drag.x) * 0.005;
    rot.tx = Math.max(-0.9, Math.min(0.9, rot.tx + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX; drag.y = e.clientY;
  });

  if (reduced) {
    requestAnimationFrame((t) => { last = t; frame(t); pause(); });
  } else {
    new IntersectionObserver((es) => es.forEach((e) => { live = e.isIntersecting; live ? play() : pause(); }), { threshold: 0 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { live = !document.hidden; live ? play() : pause(); });
    play();
  }
}
