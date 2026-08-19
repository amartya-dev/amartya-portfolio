/* The hero object is an eval suite running: every cube is a test case.
   A sweep resolves them left to right; a few fail, get repaired, and pass. */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// 739 — the real size of the regression suite this is a picture of.
const COUNT = 739;
const PENDING = new THREE.Color('#20202a');
const PASS = new THREE.Color('#35e08a');
const FAIL = new THREE.Color('#ff6244');
const FLASH = new THREE.Color('#ffffff');

export function mountSwarm(canvas, readout) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x08080a, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08080a, 0.011);
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 400);
  camera.position.set(0, 0, 74);

  const group = new THREE.Group();
  scene.add(group);

  const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);

  // Fibonacci shell, so the cloud reads as one dense object rather than noise.
  const cells = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    const shell = 23 + (i % 5) * 1.4;
    cells.push({
      pos: new THREE.Vector3(Math.cos(th) * r * shell, y * shell, Math.sin(th) * r * shell),
      grid: new THREE.Vector3(),
      at: new THREE.Vector3(),
      spin: new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28),
      order: 0, state: 0, t: 0, scale: 0.55, color: PENDING.clone(), repairAt: 0
    });
  }
  // Sweep order runs along x, so the resolve wave crosses the object.
  // Order view: the same 739 cases as a flat matrix, which is what a test report
  // actually looks like. Flow view: the same data as an object.
  const COLS = 37, ROWS = Math.ceil(COUNT / 37);
  cells.forEach((c, i) => {
    const col = i % COLS, rw = Math.floor(i / COLS);
    c.grid.set((col - (COLS - 1) / 2) * 1.55, -(rw - (ROWS - 1) / 2) * 1.55, 0);
  });

  const xs = cells.map(c => c.pos.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  cells.forEach(c => { c.order = (c.pos.x - minX) / (maxX - minX); });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.6, 0.28);
  composer.addPass(bloom);

  // Bloom is the expensive pass. Machines that can't hold a frame rate lose it
  // rather than watching the whole scene crawl.
  let quality = 2;
  let probeFrames = 0, probeStart = 0;

  const dummy = new THREE.Object3D();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const CYCLE = 8.6; // seconds for one sweep, wall-clock so a slow frame rate can't stall it
  let sweep = -0.05, cycle = 0, passing = 0, failing = 0, raf = null, live = true, phase0 = 0;
  let order = 0, orderTarget = 0; // 0 = flow, 1 = order
  let paused = false;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, r.width < 768 ? 1 : quality === 2 ? 1.5 : 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(r.width, r.height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(r.width, r.height);
    bloom.setSize(r.width / 2, r.height / 2);
    camera.aspect = r.width / r.height;
    camera.fov = r.width < 760 ? 56 : 42;
    camera.updateProjectionMatrix();
  }

  function reset(now) {
    phase0 = now;
    sweep = -0.05;
    cycle++;
    passing = failing = 0;
    for (const c of cells) { c.state = 0; c.t = 0; c.scale = 0.55; c.color.copy(PENDING); c.repairAt = 0; }
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!phase0) phase0 = now;
    sweep = ((now - phase0) / 1000 / CYCLE) * 1.6 - 0.05;
    if (sweep > 1.55) reset(now);

    order += (orderTarget - order) * Math.min(1, dt * 3.4);
    const flow = 1 - order;

    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    group.rotation.y += dt * 0.075 * flow;
    group.rotation.y *= order > 0.98 ? 0 : 1;
    group.rotation.x = pointer.y * 0.22 * flow;
    group.rotation.z = pointer.x * 0.06 * flow;
    camera.position.x = pointer.x * 5 * flow;
    camera.position.y = -pointer.y * 4 * flow;
    group.position.x = order * (W > 900 ? 13 : 0);
    camera.lookAt(0, 0, 0);

    for (let i = 0; i < COUNT; i++) {
      const c = cells[i];
      if (c.state === 0 && sweep > c.order) {
        // deterministic-ish failure scatter, ~4% of the suite
        c.state = ((i * 2654435761) % 100) < 4 ? 2 : 1;
        c.t = 0;
        if (c.state === 1) passing++; else { failing++; c.repairAt = 0.9 + Math.random() * 1.4; }
      }
      if (c.state !== 0) {
        c.t += dt;
        const target = c.state === 2 ? FAIL : PASS;
        const flash = Math.max(0, 1 - c.t * 5);
        c.color.copy(target).lerp(FLASH, flash * 0.85);
        c.scale += (1 - c.scale) * Math.min(1, dt * 9);
        if (c.state === 2 && c.t > c.repairAt) { c.state = 1; c.t = 0; failing--; passing++; }
      }
      c.at.lerpVectors(c.pos, c.grid, ease(order));
      dummy.position.copy(c.at);
      dummy.rotation.set(
        c.spin.x * flow,
        c.spin.y * flow + now * 0.00008 * (1 + (i % 3)) * flow,
        c.spin.z * flow
      );
      dummy.scale.setScalar(c.scale * (1 - order * 0.22));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, c.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (readout) {
      readout.querySelector('[data-pass]').textContent = passing.toLocaleString('en-US');
      readout.querySelector('[data-fail]').textContent = failing.toLocaleString('en-US');
      readout.querySelector('[data-run]').textContent = String(cycle).padStart(3, '0');
    }

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

  function play() { if (!raf && live && !paused) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', e => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  if (reduced) {
    sweep = 1.2;
    for (let i = 0; i < COUNT; i++) {
      const c = cells[i];
      c.state = 1; c.t = 5; c.scale = 1; c.color.copy(PASS);
    }
    passing = COUNT;
    requestAnimationFrame(t => { last = t; phase0 = t - CYCLE * 620; frame(t); pause(); });
  } else {
    new IntersectionObserver(es => es.forEach(e => { live = e.isIntersecting; live ? play() : pause(); }),
      { threshold: 0 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { live = !document.hidden; live ? play() : pause(); });
    play();
  }

  return {
    setOrder: (v) => { orderTarget = v ? 1 : 0; play(); },
    setPaused: (v) => { paused = v; if (v) pause(); else play(); }
  };
}
