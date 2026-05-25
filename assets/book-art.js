/* ============================================================================
   book-art.js — themed generative chapter illustrations.
   Each <canvas class="book-art" data-scene="..." data-seed="N" data-part="one|two|neutral">
   draws a deterministic scene matching its chapter's subject. Drop a real <img>
   into .chap-illus to override. Validated against scenes_preview before porting.
   ========================================================================== */
(function () {
  "use strict";
  var WHITE = [230, 237, 243], DIM = [58, 74, 94], VOID = [10, 15, 23];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function palette(part) {
    var teal = [90, 209, 200], amber = [240, 180, 41];
    if (part === "two") return { prim: amber, acc: teal };
    return { prim: teal, acc: amber };
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function seg(x, c0, c1, col, a, w) { x.strokeStyle = rgba(col, a); x.lineWidth = w || 1; x.beginPath(); x.moveTo(c0[0], c0[1]); x.lineTo(c1[0], c1[1]); x.stroke(); }
  function ring(x, cx, cy, r, col, a, w) { x.strokeStyle = rgba(col, a); x.lineWidth = w || 1; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); }
  function disc(x, cx, cy, r, col, a) { x.fillStyle = rgba(col, a); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }

  // ---- scenes -----------------------------------------------------------
  function water(x, W, H, r, P) {
    for (var i = 0; i < 11; i++) {
      var y = H * 0.40 + i * (H * 0.58 / 10), a = (40 + i * 16) / 255, amp = H * 0.02 + i * H * 0.007, ph = r() * 6;
      x.strokeStyle = rgba(P.prim, a); x.lineWidth = 2; x.beginPath();
      for (var px = 0; px <= W; px += 6) { var yy = y + Math.sin(px * 0.05 + ph) * amp; px === 0 ? x.moveTo(px, yy) : x.lineTo(px, yy); }
      x.stroke();
    }
    seg(x, [0, H * 0.40], [W, H * 0.40], P.prim, 70 / 255, 1);
  }
  function light(x, W, H, r, P) {
    var cx = W / 2, cy = H / 2, M = Math.min(W, H);
    for (var i = 0; i < 7; i++) ring(x, cx, cy, M * 0.06 + i * M * 0.105, P.prim, Math.max(8, 120 - i * 16) / 255, 2);
    for (var k = 0; k < 16; k++) { var ang = k * Math.PI / 8, L = M * 0.46 + r() * M * 0.1; seg(x, [cx, cy], [cx + Math.cos(ang) * L, cy + Math.sin(ang) * L], P.acc, 40 / 255, 1); }
    disc(x, cx, cy, M * 0.028, WHITE, 1);
  }
  function cellVerts() {
    var V = [], z, o, m, s1, s2;
    for (z = 0; z < 3; z++) { o = [0, 1, 2].filter(function (i) { return i !== z; }); for (m = 0; m < 2; m++) { var mg = [[1, 2], [2, 1]][m]; for (s1 = -1; s1 <= 1; s1 += 2) for (s2 = -1; s2 <= 1; s2 += 2) { var c = [0, 0, 0]; c[o[0]] = s1 * mg[0]; c[o[1]] = s2 * mg[1]; V.push(c); } } }
    return V;
  }
  function cell(x, W, H, r, P) {
    var V = cellVerts(), M = Math.min(W, H), sc = M * 0.30, cx = W * 0.5, cy = H * 0.5;
    var rx = 0.5 + r() * 0.3, ry = 0.7 + r() * 0.5;
    function proj(v) { var X = v[0] * Math.cos(ry) + v[2] * Math.sin(ry), Z = -v[0] * Math.sin(ry) + v[2] * Math.cos(ry), Y = v[1]; var Y2 = Y * Math.cos(rx) - Z * Math.sin(rx), Z2 = Y * Math.sin(rx) + Z * Math.cos(rx); return [cx + sc * X, cy - sc * Y2, Z2]; }
    var P3 = V.map(proj);
    var faces = [], ax, sg, a, b, cc, i, idx;
    for (ax = 0; ax < 3; ax++) for (sg = -1; sg <= 1; sg += 2) { idx = []; for (i = 0; i < V.length; i++) if (V[i][ax] === sg * 2) idx.push(i); faces.push({ idx: idx, col: P.acc }); }
    for (a = -1; a <= 1; a += 2) for (b = -1; b <= 1; b += 2) for (cc = -1; cc <= 1; cc += 2) { idx = []; for (i = 0; i < V.length; i++) if (a * V[i][0] + b * V[i][1] + cc * V[i][2] === 3) idx.push(i); faces.push({ idx: idx, col: P.prim }); }
    faces.forEach(function (f) {
      var mx = 0, my = 0; f.idx.forEach(function (i) { mx += P3[i][0]; my += P3[i][1]; }); mx /= f.idx.length; my /= f.idx.length;
      var o = f.idx.slice().sort(function (p, q) { return Math.atan2(P3[p][1] - my, P3[p][0] - mx) - Math.atan2(P3[q][1] - my, P3[q][0] - mx); });
      x.fillStyle = rgba(f.col, 0.15); x.beginPath();
      o.forEach(function (i, k) { k ? x.lineTo(P3[i][0], P3[i][1]) : x.moveTo(P3[i][0], P3[i][1]); }); x.closePath(); x.fill();
    });
    for (i = 0; i < V.length; i++) for (var j = i + 1; j < V.length; j++) {
      var dx = V[i][0] - V[j][0], dy = V[i][1] - V[j][1], dz = V[i][2] - V[j][2];
      if (Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - Math.SQRT2) < 1e-6) {
        var zz = (P3[i][2] + P3[j][2]) / 2, al = Math.max(60, Math.min(220, 120 + zz * 22)) / 255;
        seg(x, P3[i], P3[j], P.prim, al, 2);
      }
    }
    P3.forEach(function (p) { disc(x, p[0], p[1], p[2] > 0 ? 3 : 2, p[2] > 0 ? WHITE : DIM, 0.86); });
  }
  function network(x, W, H, r, P) {
    var M = Math.min(W, H), n = 16, nd = [], i, j;
    for (i = 0; i < n; i++) nd.push([20 + r() * (W - 40), 20 + r() * (H - 40)]);
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) { var d = Math.hypot(nd[i][0] - nd[j][0], nd[i][1] - nd[j][1]); if (d < M * 0.5) seg(x, nd[i], nd[j], P.prim, 70 / 255 * (1 - d / (M * 0.5)), 1); }
    nd.forEach(function (p) { disc(x, p[0], p[1], 4, r() < 0.25 ? P.acc : P.prim, 0.82); });
  }
  function lattice(x, W, H, r, P) {
    var rad = Math.min(W, H) * 0.105, dx = rad * Math.sqrt(3), dy = rad * 1.5, row = 0, y = 8;
    while (y < H + rad) {
      var sx = 8 + (row % 2 ? dx / 2 : 0);
      for (var cx = sx; cx < W + rad; cx += dx) {
        var col = r() < 0.12 ? P.acc : P.prim;
        x.strokeStyle = rgba(col, 90 / 255); x.lineWidth = 1; x.beginPath();
        for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3, vx = cx + rad * Math.cos(a), vy = y + rad * Math.sin(a); k ? x.lineTo(vx, vy) : x.moveTo(vx, vy); }
        x.closePath(); x.stroke();
      }
      y += dy; row++;
    }
  }
  function wave(x, W, H, r, P) {
    [[P.prim, 150, H * 0.125, 0], [P.acc, 90, H * 0.087, 1.6], [P.prim, 60, H * 0.058, 3.1]].forEach(function (s) {
      x.strokeStyle = rgba(s[0], s[1] / 255); x.lineWidth = 2; x.beginPath();
      for (var px = 0; px <= W; px += 4) { var yy = H * 0.5 + Math.sin(px * 0.045 + s[3]) * s[2]; px === 0 ? x.moveTo(px, yy) : x.lineTo(px, yy); }
      x.stroke();
    });
  }
  function star(x, W, H, r, P) {
    var cx = W / 2, cy = H / 2, M = Math.min(W, H);
    for (var k = 0; k < 44; k++) { var ang = r() * Math.PI * 2, L = M * 0.16 + r() * M * 0.5, col = r() < 0.3 ? P.acc : P.prim; seg(x, [cx + Math.cos(ang) * M * 0.05, cy + Math.sin(ang) * M * 0.05], [cx + Math.cos(ang) * L, cy + Math.sin(ang) * L], col, (60 + r() * 120) / 255, 1); }
    ring(x, cx, cy, M * 0.08, P.acc, 120 / 255, 2); disc(x, cx, cy, M * 0.035, WHITE, 1);
  }
  function tunnel(x, W, H, r, P) {
    var vx = W * 0.5 + (r() - 0.5) * W * 0.2, vy = H * 0.5 + (r() - 0.5) * H * 0.2;
    for (var i = 0; i < 12; i++) {
      var t = i / 11, rw = W * 0.62 * (1 - t) + 8, rh = H * 0.6 * (1 - t) + 5;
      var cx = W * 0.5 + (vx - W * 0.5) * t, cy = H * 0.5 + (vy - H * 0.5) * t;
      x.strokeStyle = rgba(i === 11 ? P.acc : P.prim, (40 + t * 150) / 255); x.lineWidth = 2;
      x.beginPath(); x.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); x.stroke();
    }
  }
  function pyramid(x, W, H, r, P) {
    var ax = W * 0.5, ay = H * 0.16, bl = W * 0.28, br = W * 0.72, by = H * 0.86;
    x.strokeStyle = rgba(P.prim, 200 / 255); x.lineWidth = 2; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bl, by); x.lineTo(br, by); x.closePath(); x.stroke();
    for (var i = 1; i < 7; i++) { var t = i / 7, ly = ay + (by - ay) * t; seg(x, [ax + (bl - ax) * t, ly], [ax + (br - ax) * t, ly], P.prim, 70 / 255, 1); }
    seg(x, [ax, ay], [(bl + br) / 2, by], P.prim, 60 / 255, 1); disc(x, ax, ay, Math.min(W, H) * 0.025, P.acc, 1);
  }
  function firmament(x, W, H, r, P) {
    x.strokeStyle = rgba(P.prim, 170 / 255); x.lineWidth = 2; x.beginPath(); x.ellipse(W * 0.5, H * 0.85, W * 0.4, H * 0.65, 0, Math.PI, Math.PI * 2); x.stroke();
    for (var i = 0; i < 28; i++) { var sx = r() * W, sy = H * 0.1 + r() * H * 0.38; disc(x, sx, sy, 1.3, r() < 0.3 ? P.acc : WHITE, 0.62); }
    for (var w = 0; w < 5; w++) { var y = H * 0.78 + w * 6; x.strokeStyle = rgba(P.prim, 80 / 255); x.lineWidth = 1; x.beginPath(); for (var px = 0; px <= W; px += 6) { var yy = y + Math.sin(px * 0.06) * 3; px === 0 ? x.moveTo(px, yy) : x.lineTo(px, yy); } x.stroke(); }
  }
  function displacement(x, W, H, r, P) {
    var M = Math.min(W, H), b = [W * 0.34, H * 0.5], v = [W * 0.66, H * 0.5], rr = M * 0.16;
    x.strokeStyle = rgba(P.prim, 90 / 255); x.lineWidth = 1; x.beginPath();
    for (var t = 0; t <= 1.0001; t += 0.025) { var px = b[0] + (v[0] - b[0]) * t, py = H * 0.5 + Math.sin(t * Math.PI * 3) * 8; t === 0 ? x.moveTo(px, py) : x.lineTo(px, py); }
    x.stroke();
    disc(x, b[0], b[1], rr, P.prim, 0.28); ring(x, b[0], b[1], rr, P.prim, 0.86, 2);
    disc(x, v[0], v[1], rr, VOID, 0.95); ring(x, v[0], v[1], rr, P.acc, 0.8, 2);
    disc(x, b[0], b[1], M * 0.03, WHITE, 1);
  }
  function matrix(x, W, H, r, P) {
    var N = 14, m = Math.min(W, H) * 0.1, cs = (Math.min(W, H) - 2 * m) / N, ox = (W - cs * N) / 2, oy = (H - cs * N) / 2;
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var on = r() < 0.22, col = (on && r() < 0.3) ? P.acc : P.prim, x0 = ox + j * cs, y0 = oy + i * cs;
      x.strokeStyle = rgba(col, 40 / 255); x.lineWidth = 1; x.strokeRect(x0, y0, cs - 1, cs - 1);
      if (on) { x.fillStyle = rgba(col, 150 / 255); x.fillRect(x0 + 2, y0 + 2, cs - 4, cs - 4); }
    }
  }
  function foam(x, W, H, r, P) {
    for (var i = 0; i < 30; i++) {
      var cx = r() * W, cy = r() * H, rad = 8 + r() * Math.min(W, H) * 0.22, col = r() < 0.26 ? P.acc : P.prim;
      var g = x.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
      g.addColorStop(0, rgba(col, 0.16)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
      ring(x, cx, cy, rad, col, 0.4, 1.2);
    }
  }

  var SCENES = { water: water, light: light, cell: cell, network: network, lattice: lattice,
    wave: wave, star: star, tunnel: tunnel, pyramid: pyramid, firmament: firmament,
    displacement: displacement, matrix: matrix, foam: foam };

  function render(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var seed = parseInt(canvas.getAttribute("data-seed"), 10) || 1;
    var scene = SCENES[canvas.getAttribute("data-scene")] || foam;
    var P = palette(canvas.getAttribute("data-part"));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.clientWidth || canvas.parentElement.clientWidth || 720, H = canvas.clientHeight || 240;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    scene(ctx, W, H, mulberry32((seed * 374761393 + 668265263) >>> 0), P);
  }
  function init() {
    var cs = document.querySelectorAll("canvas.book-art");
    cs.forEach(render);
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () { cs.forEach(render); }, 150); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
