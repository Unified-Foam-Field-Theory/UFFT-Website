/* ============================================================================
   bubble-void.js : the foam slice and the B + V = D sandbox.
   The slice is the true cross-section of the Kelvin foam (BCC packing of
   truncated octahedra, vertices = perms of (0, ±1, ±2)) cut through a layer of
   cell centres: each cell there is cut into an octagon |x|,|y| <= 2,
   |x|+|y| <= 3, and the cells of the next layer touch the plane at their
   square faces, which show as diamonds |x|+|y| <= 1. That is the 4.8.8 tiling.
   No dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var TEAL = "#5ad1c8", AMBER = "#f0b429", INK = "#e6edf3";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var OCT = [[2,-1],[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2]];
  var DIA = [[1,0],[0,1],[-1,0],[0,-1]];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function mix(c1, c2, t) {
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    var r = Math.round(lerp(a >> 16, b >> 16, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)),
        bl = Math.round(lerp(a & 255, b & 255, t));
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // ---- a foam field on a canvas ---------------------------------------------
  function Foam(canvas, opts) {
    this.c = canvas; this.x = canvas.getContext("2d"); this.opts = opts || {};
    this.cells = []; this.dias = [];
    this.resize();
    var self = this;
    window.addEventListener("resize", function () { self.resize(); });
  }
  Foam.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = this.c.clientWidth, h = this.c.clientHeight;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    var across = this.opts.across || (w < 520 ? 3.8 : 7.5);
    this.u = w / (4 * across);
    var old = {};
    this.cells.forEach(function (c) { old[c.i + "," + c.j] = c; });
    this.cells = []; this.dias = [];
    var ni = Math.ceil(w / (4 * this.u)) + 2, nj = Math.ceil(h / (4 * this.u)) + 2;
    var ox = w / 2, oy = h / 2;
    for (var i = -ni; i <= ni; i++) for (var j = -nj; j <= nj; j++) {
      var cx = ox + 4 * i * this.u, cy = oy + 4 * j * this.u;
      if (cx < -3 * this.u || cx > w + 3 * this.u || cy < -3 * this.u || cy > h + 3 * this.u) continue;
      var prev = old[i + "," + j];
      this.cells.push(prev ? Object.assign(prev, { cx: cx, cy: cy }) :
        { i: i, j: j, cx: cx, cy: cy, lvl: 1, tgt: 1, role: null, pair: null, ring: 0 });
      var dx = cx + 2 * this.u, dy = cy + 2 * this.u;
      if (dx < w + 2 * this.u && dy < h + 2 * this.u) this.dias.push({ cx: dx, cy: dy });
    }
    this.byKey = {};
    var self = this;
    this.cells.forEach(function (c) { self.byKey[c.i + "," + c.j] = c; });
  };
  Foam.prototype.cellAt = function (px, py) {
    var best = null, bd = 1e9, u = this.u;
    this.cells.forEach(function (c) {
      var dx = px - c.cx, dy = py - c.cy, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = c; }
    });
    return bd < (2.4 * u) * (2.4 * u) ? best : null;
  };
  Foam.prototype.inView = function (c) {
    var m = 1.2 * this.u;
    return c.cx > m && c.cx < this.w - m && c.cy > m && c.cy < this.h - m;
  };
  Foam.prototype.poly = function (cx, cy, pts, s) {
    var x = this.x, u = this.u * s;
    x.beginPath();
    for (var k = 0; k < pts.length; k++) {
      var px = cx + pts[k][0] * u, py = cy + pts[k][1] * u;
      if (k) x.lineTo(px, py); else x.moveTo(px, py);
    }
    x.closePath();
  };
  Foam.prototype.drawBase = function (t) {
    var x = this.x, self = this;
    x.clearRect(0, 0, this.w, this.h);
    // diamonds (next layer, touched at square faces)
    this.dias.forEach(function (d) {
      var sh = reduced ? 0 : 0.5 + 0.5 * Math.sin(t * 0.0009 + d.cx * 0.013 + d.cy * 0.017);
      self.poly(d.cx, d.cy, DIA, 0.9);
      x.fillStyle = mix("#0f151f", "#131b27", sh); x.fill();
      x.lineWidth = 1; x.strokeStyle = "#1f2a3a"; x.stroke();
    });
    // octagons
    this.cells.forEach(function (c) {
      var sh = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.0011 + c.cx * 0.011 - c.cy * 0.009);
      var L = c.lvl;
      var s = 0.955 + 0.03 * (L - 1) + (L > 1.2 && !reduced ? 0.008 * Math.sin(t * 0.006) : 0);
      if (L >= 1) {
        var k = L - 1;
        self.poly(c.cx, c.cy, OCT, s);
        if (k > 0.02) {
          var g = x.createRadialGradient(c.cx, c.cy, 0, c.cx, c.cy, 2.3 * self.u);
          g.addColorStop(0, mix("#172131", "#b8fbf4", k));
          g.addColorStop(0.55, mix("#141c28", TEAL, k));
          g.addColorStop(1, mix("#131a25", "#1d5f5a", k));
          x.fillStyle = g;
          x.shadowColor = "rgba(90,209,200," + (0.75 * k) + ")"; x.shadowBlur = 26 * k;
        } else {
          x.fillStyle = mix("#131a25", "#172131", sh);
        }
        x.fill(); x.shadowBlur = 0;
        x.lineWidth = 1 + 1.5 * k; x.strokeStyle = mix("#26334a", TEAL, k); x.stroke();
      } else {
        var v = 1 - L;
        self.poly(c.cx, c.cy, OCT, s);
        x.fillStyle = mix("#131a25", "#030508", v); x.fill();
        x.save(); x.setLineDash([6, 5]); x.lineDashOffset = reduced ? 0 : -t * 0.01;
        x.lineWidth = 1 + 1.2 * v; x.strokeStyle = mix("#26334a", AMBER, v); x.stroke(); x.restore();
        if (v > 0.5) { // inner hollow
          self.poly(c.cx, c.cy, OCT, 0.55 * s);
          x.fillStyle = "rgba(0,0,0," + (0.5 * v) + ")"; x.fill();
        }
      }
      if (c.ring > 0) {
        var r = (1 - c.ring);
        self.poly(c.cx, c.cy, OCT, 1 + 0.9 * r);
        x.lineWidth = 2.5; x.strokeStyle = (c.role === "V" ? "rgba(240,180,41," : "rgba(90,209,200,") + c.ring + ")";
        x.stroke();
      }
    });
  };
  Foam.prototype.step = function (dt) {
    this.cells.forEach(function (c) {
      c.lvl += (c.tgt - c.lvl) * clamp(dt * 0.009, 0, 1);
      if (c.ring > 0) c.ring = Math.max(0, c.ring - dt * 0.0012);
    });
  };

  // ---- 1. quiet slice ---------------------------------------------------------
  var sc = document.getElementById("bv-slice");
  if (sc) {
    var slice = new Foam(sc, { across: sc.clientWidth < 520 ? 4.2 : 5.5 });
    var visS = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visS = e[0].isIntersecting; }).observe(sc);
    (function loopS(t) { if (visS) slice.drawBase(t); if (!reduced) requestAnimationFrame(loopS); })(0);
    if (reduced) slice.drawBase(0);
  }

  // ---- 2. the sandbox ---------------------------------------------------------
  var pc = document.getElementById("bv-play");
  if (!pc) return;
  var F = new Foam(pc);
  var X = F.x;
  var pairs = [];          // {v: cell, b: cell, born, flow: [{p, back}], leaving}
  var hint = document.getElementById("bv-hint");
  var readout = document.getElementById("bv-readout");
  var touched = false, demoTimers = [];

  function setHint(s) { if (hint) { hint.textContent = s; hint.style.opacity = s ? 1 : 0; } }
  function updateReadout() {
    var n = pairs.filter(function (p) { return !p.leaving; }).length;
    readout.innerHTML =
      "<span>displacements <b>" + n + "</b></span>" +
      "<span>bubbles <b>" + n + "</b></span>" +
      "<span>voids <b>" + n + "</b></span>" +
      "<span>energy in the foam <b class='ok'>unchanged</b></span>";
  }

  function neighbours(c) {
    return [[1,0],[-1,0],[0,1],[0,-1]].map(function (d) { return F.byKey[(c.i + d[0]) + "," + (c.j + d[1])]; })
      .filter(function (n) { return n && !n.role && F.inView(n); });
  }

  function makePair(c) {
    if (!c || c.role) return null;
    var ns = neighbours(c);
    if (!ns.length) return null;
    // prefer the neighbour pointing toward the middle of the canvas
    ns.sort(function (a, b) {
      var da = Math.hypot(a.cx - F.w / 2, a.cy - F.h / 2), db = Math.hypot(b.cx - F.w / 2, b.cy - F.h / 2);
      return da - db + (Math.random() - 0.5) * F.u * 3;
    });
    var b = ns[0];
    var p = { v: c, b: b, born: performance.now(), flow: [] };
    c.role = "V"; c.pair = p; b.role = "B"; b.pair = p;
    c.tgt = 0; b.tgt = 2;
    for (var k = 0; k < 7; k++) p.flow.push({ p: -k * 0.12, back: false });
    pairs.push(p);
    var live = pairs.filter(function (q) { return !q.leaving; });
    if (live.length > 6) fillPair(live[0]);
    updateReadout();
    return p;
  }

  function fillPair(p) {
    if (p.leaving) return;
    p.leaving = performance.now();
    p.flow = [];
    for (var k = 0; k < 7; k++) p.flow.push({ p: -k * 0.12, back: true });
    setTimeout(function () {
      p.v.tgt = 1; p.b.tgt = 1;
      p.v.role = null; p.b.role = null; p.v.pair = null; p.b.pair = null;
      pairs.splice(pairs.indexOf(p), 1);
      updateReadout();
    }, reduced ? 0 : 650);
  }

  function moveBubble(p, to) {
    if (!to || to.role || !F.inView(to)) return false;
    var from = p.b;
    from.role = null; from.pair = null; from.tgt = 1; from.lvl = Math.min(from.lvl, 1.4);
    to.role = "B"; to.pair = p; to.tgt = 2; to.lvl = Math.max(to.lvl, 1.6);
    p.b = to;
    return true;
  }

  function poke(p) {
    p.v.ring = 1; p.b.ring = 1;
    setHint("Both ends answered at once. One object, two places.");
  }

  function clearAll() {
    pairs.slice().forEach(function (p) {
      p.v.role = p.b.role = null; p.v.pair = p.b.pair = null;
      p.v.tgt = p.b.tgt = 1;
    });
    pairs = [];
    updateReadout();
  }

  // ---- pointer ----------------------------------------------------------------
  var drag = null;
  function pos(e) { var r = pc.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function stopDemo() { touched = true; demoTimers.forEach(clearTimeout); demoTimers = []; }

  pc.addEventListener("pointerdown", function (e) {
    stopDemo();
    var q = pos(e), c = F.cellAt(q[0], q[1]);
    drag = { x0: q[0], y0: q[1], cell: c, moved: false, id: e.pointerId };
    pc.setPointerCapture && pc.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  pc.addEventListener("pointermove", function (e) {
    var q = pos(e);
    var over = F.cellAt(q[0], q[1]);
    pc.style.cursor = over && over.role === "B" ? "grab" : "pointer";
    if (!drag) return;
    if (!drag.moved && Math.hypot(q[0] - drag.x0, q[1] - drag.y0) > 8) drag.moved = true;
    if (drag.moved && drag.cell && drag.cell.role === "B") {
      pc.style.cursor = "grabbing";
      var p = drag.cell.pair;
      if (over && over !== p.b && moveBubble(p, over)) {
        drag.cell = over;
        var d = Math.round(Math.hypot(p.b.i - p.v.i, p.b.j - p.v.j) * 10) / 10;
        setHint(d > 2.5 ? "Stretch it as far as you like. The thread never breaks." : "Dragging the bubble");
      }
    }
  });
  function up(e) {
    if (!drag) return;
    var c = drag.cell;
    if (!drag.moved && c) {
      if (c.role) poke(c.pair);
      else if (makePair(c)) setHint("Now drag the glowing bubble away");
      else setHint("Try a cell nearer the middle");
    }
    drag = null;
  }
  pc.addEventListener("pointerup", up);
  pc.addEventListener("pointercancel", function () { drag = null; });

  document.getElementById("bv-fill").addEventListener("click", function () {
    stopDemo();
    pairs.slice().forEach(fillPair);
    setHint("Every hole filled from its own pile. The foam is back to rest.");
  });
  document.getElementById("bv-reset").addEventListener("click", function () {
    stopDemo(); clearAll(); setHint("Tap any cell");
  });

  // ---- threads ----------------------------------------------------------------
  function curve(p) {
    var ax = p.v.cx, ay = p.v.cy, bx = p.b.cx, by = p.b.cy;
    var mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    var bow = Math.min(0.28 * len, 3 * F.u);
    var cx = mx - dy / len * bow, cy = my + dx / len * bow;
    return [ax, ay, cx, cy, bx, by];
  }
  function onCurve(q, t) {
    var a = 1 - t;
    return [a * a * q[0] + 2 * a * t * q[2] + t * t * q[4], a * a * q[1] + 2 * a * t * q[3] + t * t * q[5]];
  }
  function drawThreads(t, dt) {
    pairs.forEach(function (p, idx) {
      var q = curve(p);
      var g = X.createLinearGradient(q[0], q[1], q[4], q[5]);
      g.addColorStop(0, AMBER); g.addColorStop(1, TEAL);
      var fade = p.leaving ? clamp(1 - (performance.now() - p.leaving) / 650, 0, 1) : 1;
      X.globalAlpha = 0.9 * fade;
      X.lineWidth = 3; X.strokeStyle = g; X.lineCap = "round";
      X.beginPath(); X.moveTo(q[0], q[1]); X.quadraticCurveTo(q[2], q[3], q[4], q[5]); X.stroke();
      // travelling energy
      if (!reduced) {
        var any = false;
        p.flow.forEach(function (f) {
          f.p += dt * 0.0016;
          if (f.p < 0 || f.p > 1) return;
          any = true;
          var s = onCurve(q, f.back ? 1 - easeInOut(f.p) : easeInOut(f.p));
          X.fillStyle = INK; X.beginPath(); X.arc(s[0], s[1], 3.2, 0, 6.2832); X.fill();
        });
        if (!any && !p.leaving) {
          // idle shimmer along D
          var ph = ((t * 0.00035) + idx * 0.37) % 1;
          for (var k = 0; k < 3; k++) {
            var s2 = onCurve(q, (ph + k / 3) % 1);
            X.fillStyle = "rgba(230,237,243,0.55)"; X.beginPath(); X.arc(s2[0], s2[1], 2, 0, 6.2832); X.fill();
          }
        }
      }
      X.globalAlpha = fade;
      // labels
      chip(p.v.cx, p.v.cy + 2.45 * F.u, "V", AMBER);
      chip(p.b.cx, p.b.cy + 2.45 * F.u, "B", TEAL);
      if (idx === pairs.length - 1) { var m = onCurve(q, 0.5); chip(m[0], m[1] - 14, "D", INK); }
      X.globalAlpha = 1;
    });
  }
  function chip(x0, y0, s, col) {
    X.font = "600 13px ui-monospace, Menlo, monospace";
    X.fillStyle = "rgba(10,13,18,0.85)"; X.strokeStyle = col; X.lineWidth = 1.2;
    var w = 22, h = 20;
    X.beginPath();
    if (X.roundRect) X.roundRect(x0 - w / 2, y0 - h / 2, w, h, 6); else X.rect(x0 - w / 2, y0 - h / 2, w, h);
    X.fill(); X.stroke();
    X.fillStyle = col; X.textAlign = "center"; X.textBaseline = "middle"; X.fillText(s, x0, y0 + 1);
  }

  // ---- loop -------------------------------------------------------------------
  var last = 0, vis = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      vis = e[0].isIntersecting;
      if (vis && !touched && !demoTimers.length && !pairs.length) demo();
    }, { threshold: 0.4 }).observe(pc);
  }
  function loop(t) {
    var dt = last ? Math.min(t - last, 50) : 16; last = t;
    if (vis) { F.step(reduced ? 1000 : dt); F.drawBase(t); drawThreads(t, dt); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  updateReadout();

  // a short demonstration the first time the sandbox scrolls into view
  function demo() {
    var mid = F.cellAt(F.w / 2 - 4 * F.u, F.h / 2);
    if (!mid) return;
    setHint("Watch: one scoop");
    demoTimers.push(setTimeout(function () {
      var p = makePair(mid);
      if (!p) return;
      var steps = [[1, 0], [1, 0], [1, -1]];
      steps.forEach(function (s, k) {
        demoTimers.push(setTimeout(function () {
          if (touched) return;
          var to = F.byKey[(p.b.i + s[0]) + "," + (p.b.j + s[1])];
          moveBubble(p, to);
          if (k === steps.length - 1) {
            demoTimers.push(setTimeout(function () {
              if (touched) return;
              poke(p);
              demoTimers.push(setTimeout(function () { if (!touched) setHint("Your turn: tap any cell"); }, 1800));
            }, 900));
          }
        }, 1500 + k * 650));
      });
    }, 900));
  }
})();

/* ---- bubble inside the 3D cell (uses the hook in foam.js) ------------------- */
(function () {
  "use strict";
  var cell = window.UFFTCell, btn = document.getElementById("bv-cell-toggle"), cap = document.getElementById("bv-cell-cap");
  if (!cell || !btn) return;
  var T = cell.THREE;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the largest ball that fits touches the 8 hexagons at distance sqrt(3); stay just inside
  var body = new T.Mesh(new T.SphereGeometry(1.62, 48, 32), new T.MeshStandardMaterial({
    color: 0x5ad1c8, emissive: 0x1f8f84, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0,
    transparent: true, opacity: 0, depthWrite: false }));
  var core = new T.Mesh(new T.SphereGeometry(0.95, 32, 24), new T.MeshBasicMaterial({
    color: 0xe2fffb, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
  var halo = new T.Mesh(new T.SphereGeometry(1.72, 48, 32), new T.MeshBasicMaterial({
    color: 0x5ad1c8, transparent: true, opacity: 0, side: T.BackSide, blending: T.AdditiveBlending, depthWrite: false }));
  [halo, body, core].forEach(function (m) { m.scale.setScalar(0.001); m.visible = false; cell.root.add(m); });
  var hex0 = cell.hexMat.opacity, sq0 = cell.sqMat.opacity;
  var on = false, k = 0, t = 0;
  cell.onFrame = function () {
    t += 0.016;
    k += ((on ? 1 : 0) - k) * (reduced ? 1 : 0.07);
    var vis = k > 0.003;
    var p = reduced ? 1 : 1 + 0.035 * Math.sin(t * 3.2);
    [halo, body, core].forEach(function (m) { m.visible = vis; m.scale.setScalar(Math.max(0.001, k * p)); });
    body.material.opacity = 0.5 * k;
    core.material.opacity = 0.32 * k;
    halo.material.opacity = 0.22 * k;
    cell.hexMat.opacity = hex0 * (1 - 0.35 * k);
    cell.sqMat.opacity = sq0 * (1 - 0.35 * k);
  };
  btn.addEventListener("click", function () {
    on = !on;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "Take the bubble out" : "Put a bubble in the cell";
    cap.textContent = on
      ? "A bubble: this cell now holds one extra packet of energy, pushed in from a neighbour. Somewhere next door, a cell is missing the same amount."
      : "One cell in 3D · 14 faces · drag to rotate. At rest it holds the same amount as every other cell.";
  });
})();

/* ---- the whole foam: BCC lattice of Kelvin cells ---------------------------
   Cell centres on two interpenetrating cubic lattices, (4i,4j,4k) and
   (4i+2,4j+2,4k+2). With vertices at perms of (0,±1,±2) this is the exact
   space-filling Kelvin foam: square faces meet across the cube axes, hexagons
   across the body diagonals. 125 + 64 = 189 cells. */
(function () {
  "use strict";
  var canvas = document.getElementById("bv-lattice");
  if (!canvas || typeof THREE === "undefined") return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // one cell's geometry
  var V = [];
  [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].forEach(function (p) {
    [1,-1].forEach(function (s1) { [1,-1].forEach(function (s2) {
      var v = [0,0,0]; v[p[1]] = s1; v[p[2]] = 2 * s2;
      if (!V.some(function (w) { return w[0]===v[0] && w[1]===v[1] && w[2]===v[2]; })) V.push(v);
    }); });
  });
  function faceTris(test, normal) {
    var idx = V.map(function (v, i) { return i; }).filter(function (i) { return test(V[i]); });
    var c = [0,0,0]; idx.forEach(function (i) { c[0]+=V[i][0]; c[1]+=V[i][1]; c[2]+=V[i][2]; });
    c = c.map(function (x) { return x / idx.length; });
    var u = [V[idx[0]][0]-c[0], V[idx[0]][1]-c[1], V[idx[0]][2]-c[2]];
    var w = [normal[1]*u[2]-normal[2]*u[1], normal[2]*u[0]-normal[0]*u[2], normal[0]*u[1]-normal[1]*u[0]];
    idx.sort(function (a, b) {
      function ang(i) { var d=[V[i][0]-c[0],V[i][1]-c[1],V[i][2]-c[2]]; return Math.atan2(d[0]*w[0]+d[1]*w[1]+d[2]*w[2], d[0]*u[0]+d[1]*u[1]+d[2]*u[2]); }
      return ang(a) - ang(b);
    });
    var out = [];
    for (var t = 1; t < idx.length - 1; t++) out.push(V[idx[0]], V[idx[t]], V[idx[t+1]]);
    return out;
  }
  function geo(tris) {
    var pos = []; tris.forEach(function (v) { pos.push(v[0], v[1], v[2]); });
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals(); return g;
  }
  var sqT = [], hxT = [];
  for (var a = 0; a < 3; a++) [1,-1].forEach(function (s) {
    var n = [0,0,0]; n[a] = s; sqT = sqT.concat(faceTris(function (v) { return v[a] === 2 * s; }, n));
  });
  [1,-1].forEach(function (sx) { [1,-1].forEach(function (sy) { [1,-1].forEach(function (sz) {
    hxT = hxT.concat(faceTris(function (v) { return sx*v[0] + sy*v[1] + sz*v[2] === 3; }, [sx,sy,sz]));
  }); }); });
  var E = [];
  for (var i = 0; i < V.length; i++) for (var j = i + 1; j < V.length; j++) {
    var d = [V[i][0]-V[j][0], V[i][1]-V[j][1], V[i][2]-V[j][2]];
    if (d[0]*d[0]+d[1]*d[1]+d[2]*d[2] === 2) E.push([i, j]);
  }

  // lattice
  var C = [];
  for (var x = -2; x <= 2; x++) for (var y = -2; y <= 2; y++) for (var z = -2; z <= 2; z++) C.push([4*x, 4*y, 4*z]);
  for (x = -2; x <= 1; x++) for (y = -2; y <= 1; y++) for (z = -2; z <= 1; z++) C.push([4*x+2, 4*y+2, 4*z+2]);
  var n = C.length;
  var key = {}; C.forEach(function (c, k) { key[c.join(",")] = k; });

  // scene
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
  var root = new THREE.Group(); scene.add(root);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var l1 = new THREE.DirectionalLight(0xbfefff, 0.9); l1.position.set(30, 40, 25); scene.add(l1);
  var l2 = new THREE.DirectionalLight(0xf0b429, 0.35); l2.position.set(-30, -20, -30); scene.add(l2);

  var sqMat = new THREE.MeshStandardMaterial({ color: 0xf0b429, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 });
  var hxMat = new THREE.MeshStandardMaterial({ color: 0x5ad1c8, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 });
  var sqI = new THREE.InstancedMesh(geo(sqT), sqMat, n);
  var hxI = new THREE.InstancedMesh(geo(hxT), hxMat, n);
  var bubI = new THREE.InstancedMesh(new THREE.SphereGeometry(1.45, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0a3a36, emissiveIntensity: 1, roughness: 0.3, transparent: true, opacity: 0.4, depthWrite: false }), n);
  root.add(sqI); root.add(hxI); root.add(bubI);

  var edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * E.length * 6), 3));
  var edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x7fd8cf, transparent: true, opacity: 0.32 }));
  root.add(edges);

  var dGeo = new THREE.BufferGeometry();
  var dLines = new THREE.LineSegments(dGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
  root.add(dLines);

  // state
  var state = { shells: true, edges: true, bubbles: true, spread: 0 };
  var role = new Array(n).fill(0);   // 0 rest, 1 bubble, -1 void
  var pairs = [];
  var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
  var cRest = new THREE.Color(0x2c8f87), cBub = new THREE.Color(0xffffff), cVoid = new THREE.Color(0xff9d00);

  function place(k) { var f = 1 + state.spread; return [C[k][0]*f, C[k][1]*f, C[k][2]*f]; }
  function rebuild() {
    var ep = edgeGeo.attributes.position.array, q = 0;
    for (var k = 0; k < n; k++) {
      var p = place(k);
      P.set(p[0], p[1], p[2]); S.set(1, 1, 1); M.compose(P, Q, S);
      sqI.setMatrixAt(k, M); hxI.setMatrixAt(k, M);
      var r = role[k] === 1 ? 1.32 : role[k] === -1 ? 0.42 : 0.92;
      S.set(r, r, r); M.compose(P, Q, S); bubI.setMatrixAt(k, M);
      bubI.setColorAt(k, role[k] === 1 ? cBub : role[k] === -1 ? cVoid : cRest);
      for (var e = 0; e < E.length; e++) {
        var A = V[E[e][0]], B = V[E[e][1]];
        ep[q++] = p[0]+A[0]; ep[q++] = p[1]+A[1]; ep[q++] = p[2]+A[2];
        ep[q++] = p[0]+B[0]; ep[q++] = p[1]+B[1]; ep[q++] = p[2]+B[2];
      }
    }
    edgeGeo.attributes.position.needsUpdate = true;
    sqI.instanceMatrix.needsUpdate = hxI.instanceMatrix.needsUpdate = bubI.instanceMatrix.needsUpdate = true;
    if (bubI.instanceColor) bubI.instanceColor.needsUpdate = true;
    var dp = [], dc = [];
    pairs.forEach(function (pr) {
      var a = place(pr[0]), b = place(pr[1]);
      dp.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      dc.push(0.94, 0.71, 0.16, 0.35, 0.82, 0.78);
    });
    dGeo.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    dGeo.setAttribute("color", new THREE.Float32BufferAttribute(dc, 3));
    sqI.visible = hxI.visible = state.shells;
    edges.visible = state.edges;
    bubI.visible = state.bubbles || pairs.length > 0;
    bubI.material.opacity = state.bubbles ? 0.4 : 0.0;
    if (!state.bubbles && pairs.length) {  // show only the displaced cells
      bubI.material.opacity = 0.75;
      for (var k2 = 0; k2 < n; k2++) if (!role[k2]) { S.set(0.001,0.001,0.001); var pp = place(k2); P.set(pp[0],pp[1],pp[2]); M.compose(P,Q,S); bubI.setMatrixAt(k2, M); }
      bubI.instanceMatrix.needsUpdate = true;
    }
  }

  function displace() {
    var tries = 0, made = 0;
    while (made < 6 && tries < 400) {
      tries++;
      var k = Math.floor(Math.random() * n);
      if (role[k]) continue;
      var c = C[k], ds = [];
      [2,-2].forEach(function (a) { [2,-2].forEach(function (b) { [2,-2].forEach(function (cc) { ds.push([a,b,cc]); }); }); });
      var d = ds[Math.floor(Math.random() * 8)];
      var nb = key[(c[0]+d[0]) + "," + (c[1]+d[1]) + "," + (c[2]+d[2])];
      if (nb === undefined || role[nb]) continue;
      // hop the bubble one or two cells further along the same diagonal when possible
      var far = key[(c[0]+2*d[0]) + "," + (c[1]+2*d[1]) + "," + (c[2]+2*d[2])];
      if (far !== undefined && !role[far] && Math.random() < 0.6) nb = far;
      role[k] = -1; role[nb] = 1; pairs.push([k, nb]); made++;
    }
  }

  var ctrls = document.getElementById("bv-lat-ctrls"), cap = document.getElementById("bv-lat-cap");
  ctrls.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var k = b.getAttribute("data-k");
    if (k === "reset") {
      role.fill(0); pairs = []; state.shells = state.edges = state.bubbles = true; state.spread = 0;
      document.getElementById("bv-spread").value = 0;
      ctrls.querySelectorAll("button[data-k]").forEach(function (x) {
        var on = ["shells","edges","bubbles"].indexOf(x.getAttribute("data-k")) >= 0;
        x.classList.toggle("on", on); x.setAttribute("aria-pressed", on);
      });
      cap.textContent = "The whole foam · 189 cells packed with no gaps · drag to rotate · toggle the shells, edges and bubbles";
    } else if (k === "pairs") {
      displace();
      b.classList.add("on"); b.setAttribute("aria-pressed", "true");
      cap.textContent = pairs.length + " displacements · bright = bubble (extra energy), small amber = void (energy missing), line = D joining each pair · press again for more";
    } else {
      state[k] = !state[k];
      b.classList.toggle("on", state[k]); b.setAttribute("aria-pressed", state[k]);
    }
    rebuild();
  });
  document.getElementById("bv-spread").addEventListener("input", function (e) {
    state.spread = e.target.value / 100 * 0.9; rebuild();
  });

  // size + camera
  var dist = 52;
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    dist = w < 520 ? 64 : 52;
  }
  window.addEventListener("resize", resize); resize();

  var drag = false, px = 0, py = 0, ry = 0.6, rx = 0.45, auto = !reduced;
  canvas.addEventListener("pointerdown", function (e) { drag = true; auto = false; px = e.clientX; py = e.clientY; canvas.style.cursor = "grabbing"; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointerup", function () { drag = false; canvas.style.cursor = "grab"; });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag) return;
    ry += (e.clientX - px) * 0.008; rx += (e.clientY - py) * 0.008; rx = Math.max(-1.4, Math.min(1.4, rx));
    px = e.clientX; py = e.clientY;
  });
  var vis = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }).observe(canvas);
  rebuild();
  (function loop() {
    requestAnimationFrame(loop);
    if (!vis) return;
    if (auto) ry += 0.0025;
    var d = dist * (1 + state.spread * 0.9);
    camera.position.set(0, 0, d); camera.lookAt(0, 0, 0);
    root.rotation.y = ry; root.rotation.x = rx;
    renderer.render(scene, camera);
  })();
})();
