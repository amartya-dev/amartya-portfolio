/* Amartya Gaur — portfolio behaviour.
   Four pieces: the cold-start overlay, the orchestrator canvas, scroll reveals, and the trace rows. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- boot -- */
  var boot = document.getElementById('boot');
  var bootSeen = false;
  try { bootSeen = sessionStorage.getItem('booted') === '1'; } catch (e) {}

  function endBoot() {
    if (!boot || boot.hidden) return;
    document.body.classList.remove('booting');
    boot.classList.add('done');
    try { sessionStorage.setItem('booted', '1'); } catch (e) {}
    setTimeout(function () { boot.hidden = true; }, 820);
    window.removeEventListener('keydown', endBoot);
    window.removeEventListener('pointerdown', endBoot);
    start();
  }

  if (!boot || bootSeen || reduced) {
    if (boot) boot.hidden = true;
    setTimeout(start, 0);
  } else {
    document.body.classList.add('booting');
    var lines = boot.querySelectorAll('.boot-line');
    var fill = document.getElementById('boot-fill');
    lines.forEach(function (line, i) {
      setTimeout(function () {
        line.classList.add('on');
        if (fill) fill.style.width = ((i + 1) / lines.length * 100) + '%';
      }, 260 + i * 210);
    });
    setTimeout(endBoot, 260 + lines.length * 210 + 380);
    window.addEventListener('keydown', endBoot);
    window.addEventListener('pointerdown', endBoot);
  }

  /* ------------------------------------------------------------- reveals -- */
  function start() {
    var targets = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || reduced) {
      targets.forEach(function (el) { el.classList.add('in'); });
      countAll();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = Array.prototype.slice.call((el.parentElement || document).children).filter(function (n) {
          return n.classList.contains('rv');
        });
        var i = Math.max(0, siblings.indexOf(el));
        setTimeout(function () { el.classList.add('in'); }, Math.min(i, 5) * 80);
        if (el.querySelector('.fig')) count(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* -------------------------------------------------------------- counts -- */
  function count(scope) {
    scope.querySelectorAll('.fig').forEach(function (fig) {
      var target = parseFloat(fig.getAttribute('data-count'));
      var suffix = fig.getAttribute('data-suffix') || '';
      var comma = fig.getAttribute('data-format') === 'comma';
      var t0 = null;
      var dur = 1100;
      function frame(now) {
        if (t0 === null) t0 = now;
        var p = Math.min(1, (now - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = Math.round(target * eased);
        fig.textContent = (comma ? value.toLocaleString('en-US') : String(value)) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      if (reduced) {
        fig.textContent = (comma ? target.toLocaleString('en-US') : String(target)) + suffix;
      } else {
        requestAnimationFrame(frame);
      }
    });
  }
  function countAll() { count(document); }

  /* --------------------------------------------------------------- trace -- */
  document.querySelectorAll('.span-row').forEach(function (row) {
    row.addEventListener('click', function () {
      var open = row.getAttribute('aria-expanded') === 'true';
      var detail = document.getElementById(row.getAttribute('aria-controls'));
      row.setAttribute('aria-expanded', String(!open));
      if (detail) detail.hidden = open;
    });
  });

  /* ------------------------------------------------------------ progress -- */
  var progress = document.getElementById('progress');
  if (progress) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var max = document.body.scrollHeight - window.innerHeight;
        progress.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------ spotlight -- */
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  /* -------------------------------------------------------- orchestrator -- */
  var canvas = document.getElementById('orchestrator');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // A request entering a sticky orchestrator: classify, pick a workflow off the
  // registry or call a tool, verify, repair if verification fails, resolve.
  // Wide screens read left to right; narrow ones get a taller, stacked layout so
  // the labels never collide.
  var NODES = [
    { id: 'intake',       x: 0.06, y: 0.50, sx: 0.08, sy: 0.04 },
    { id: 'classify',     x: 0.22, y: 0.50, sx: 0.34, sy: 0.16 },
    { id: 'registry',     x: 0.38, y: 0.20, sx: 0.66, sy: 0.06 },
    { id: 'wf.billing',   x: 0.60, y: 0.10, sx: 0.86, sy: 0.20 },
    { id: 'wf.dns',       x: 0.58, y: 0.32, sx: 0.60, sy: 0.30 },
    { id: 'tool.call',    x: 0.38, y: 0.76, sx: 0.20, sy: 0.42 },
    { id: 'verify',       x: 0.60, y: 0.60, sx: 0.52, sy: 0.56 },
    { id: 'repair',       x: 0.46, y: 0.95, sx: 0.14, sy: 0.72 },
    { id: 'handoff',      x: 0.80, y: 0.26, sx: 0.84, sy: 0.44 },
    { id: 'resolve',      x: 0.92, y: 0.62, sx: 0.70, sy: 0.80 },
    { id: 'eval.gate',    x: 0.76, y: 0.90, sx: 0.30, sy: 0.90 }
  ];
  var INDEX = {};
  NODES.forEach(function (n, i) { INDEX[n.id] = i; n.heat = 0; n.born = 0; });

  var EDGES = [
    ['intake', 'classify'], ['classify', 'registry'], ['classify', 'tool.call'],
    ['registry', 'wf.billing'], ['registry', 'wf.dns'],
    ['wf.billing', 'handoff'], ['wf.dns', 'handoff'],
    ['tool.call', 'verify'], ['verify', 'handoff'], ['verify', 'repair'],
    ['repair', 'tool.call'], ['handoff', 'resolve'], ['verify', 'resolve'],
    ['eval.gate', 'verify', true], ['eval.gate', 'resolve', true]
  ].map(function (e) { return { a: INDEX[e[0]], b: INDEX[e[1]], dashed: !!e[2] }; });

  var ROUTES = [
    ['intake', 'classify', 'registry', 'wf.billing', 'handoff', 'resolve'],
    ['intake', 'classify', 'registry', 'wf.dns', 'handoff', 'resolve'],
    ['intake', 'classify', 'tool.call', 'verify', 'handoff', 'resolve'],
    ['intake', 'classify', 'tool.call', 'verify', 'repair', 'tool.call', 'verify', 'resolve']
  ].map(function (r) { return r.map(function (id) { return INDEX[id]; }); });

  var W = 0, H = 0, padX = 30, padR = 112, padY = 34, narrow = false, labelFont = 11.5;
  var mouse = { x: -999, y: -999, on: false };
  var pulses = [];
  var t0 = performance.now();
  var visible = true;
  var raf = null;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    narrow = W < 560;
    padR = narrow ? 74 : 112;
    padX = narrow ? 22 : 30;
    labelFont = narrow ? 9.5 : 11.5;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function px(n) { return padX + (narrow && n.sx !== undefined ? n.sx : n.x) * (W - padX - padR); }
  function py(n) { return padY + (narrow && n.sy !== undefined ? n.sy : n.y) * (H - padY * 2); }

  function spawn() {
    if (pulses.length > 7) return;
    var route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    pulses.push({ route: route, leg: 0, t: 0, speed: 0.006 + Math.random() * 0.005 });
  }

  function draw(now) {
    var elapsed = now - t0;
    ctx.clearRect(0, 0, W, H);

    // edges
    EDGES.forEach(function (e, i) {
      var a = NODES[e.a], b = NODES[e.b];
      var appear = Math.min(1, Math.max(0, (elapsed - 120 - i * 45) / 420));
      if (appear <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(e.dashed ? [3, 5] : []);
      ctx.strokeStyle = e.dashed ? 'rgba(155,140,255,.34)' : 'rgba(58,80,108,.95)';
      ctx.lineWidth = 1.2;
      var ax = px(a), ay = py(a), bx = px(b), by = py(b);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (bx - ax) * appear, ay + (by - ay) * appear);
      ctx.stroke();
      ctx.restore();
    });

    // pulses
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      p.t += p.speed;
      if (p.t >= 1) {
        p.t = 0; p.leg++;
        if (p.leg >= p.route.length - 1) { pulses.splice(i, 1); continue; }
        NODES[p.route[p.leg]].heat = 1;
      }
      var a2 = NODES[p.route[p.leg]], b2 = NODES[p.route[p.leg + 1]];
      var x = px(a2) + (px(b2) - px(a2)) * p.t;
      var y = py(a2) + (py(b2) - py(a2)) * p.t;
      var tail = Math.max(0, p.t - 0.28);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245,165,36,.55)';
      ctx.lineWidth = 2;
      ctx.moveTo(px(a2) + (px(b2) - px(a2)) * tail, py(a2) + (py(b2) - py(a2)) * tail);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = '#f5a524';
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // nodes
    NODES.forEach(function (n, i) {
      var appear = Math.min(1, Math.max(0, (elapsed - i * 55) / 380));
      if (appear <= 0) return;
      var x = px(n), y = py(n);
      var near = mouse.on ? Math.max(0, 1 - Math.hypot(mouse.x - x, mouse.y - y) / 110) : 0;
      var heat = Math.max(n.heat, near);
      n.heat *= 0.955;

      if (heat > 0.02) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(245,165,36,' + (0.16 * heat).toFixed(3) + ')';
        ctx.arc(x, y, 16 + heat * 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = heat > 0.15 ? '#f5a524' : '#1f2b3b';
      ctx.strokeStyle = heat > 0.15 ? '#f5a524' : '#33465e';
      ctx.lineWidth = 1.3;
      ctx.arc(x, y, (4.4 + heat * 2.2) * appear, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '500 ' + labelFont + 'px "IBM Plex Mono", monospace';
      ctx.fillStyle = heat > 0.15 ? 'rgba(233,239,246,' + appear + ')' : 'rgba(130,152,173,' + (0.65 * appear) + ')';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.id, x + (narrow ? 11 : 14), y);
    });

    raf = requestAnimationFrame(draw);
  }

  function loop() { if (!raf) raf = requestAnimationFrame(draw); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  resize();
  window.addEventListener('resize', function () { resize(); });
  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
  });
  canvas.addEventListener('pointerleave', function () { mouse.on = false; });

  if (reduced) {
    // one static frame, no pulses
    requestAnimationFrame(function (now) { t0 = now - 3000; draw(now); stop(); });
  } else {
    setInterval(function () { if (visible) spawn(); }, 900);
    spawn();
    loop();
    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
      if (visible) loop(); else stop();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible) loop(); else stop();
        });
      }, { threshold: 0 }).observe(canvas);
    }
  }
})();
