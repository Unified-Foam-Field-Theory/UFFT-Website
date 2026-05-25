/* ============================================================================
   eigenmode.js — face-Laplacian eigenmode explorer for the Kelvin cell.
   Each of the 7 distinct eigenvalues is a standing wave on the 14 faces;
   the framework identifies each with a Standard Model sector. Faces are
   membrane-subdivided so they bend smoothly. Outward = amber, inward = teal.
   Adapted from the UFFT education module; restyled to the site palette.
   Requires THREE (r128).
   ========================================================================== */
(function () {
  "use strict";
  var canvas = document.getElementById("eigen-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  var SC = 1.4, s17 = Math.sqrt(17);
  var r1 = (9 - s17) / 2, r2 = (9 + s17) / 2;
  var bR1 = (1 + s17) / 2, bR2 = (1 - s17) / 2;
  var NUM_RINGS = 6, MAX_DISP = 0.42;

  // --- the 7 modes (distinct eigenvalues) ---------------------------------
  var MODES = [
    { name: "Breathing", sym: "A₁g", lam: 0.0, mult: 1, face: "all 14",
      phys: "zero mode — photon / gravity carrier",
      desc: "All faces move in unison. Zero eigenvalue: no restoring force, so it propagates infinitely far.",
      ev: function () { return 1; } },
    { name: "Fermion (L)", sym: "T₁u", lam: r1, mult: 3, face: "hex + square",
      phys: "identified with left-handed fermions",
      desc: "A dipole on both face types; squares move " + Math.abs(bR1).toFixed(1) + "× the hexagons. Lower root of λ²−9λ+16.",
      subs: ["x", "y", "z"], subI: 0,
      ev: function (f, si) { var ax = si || 0; if (f.type === "hex") return f.signs[ax]; return f.axis === ax ? f.sign * bR1 : 0; } },
    { name: "Weak", sym: "Eg", lam: 4, mult: 2, face: "squares only",
      phys: "identified with the W / Z sector",
      desc: "Only the 6 square faces move; all 8 hexagons are exact nodes.",
      subs: ["z²", "x²−y²"], subI: 0,
      ev: function (f, si) { if (f.type === "hex") return 0; if ((si || 0) === 0) return f.axis === 2 ? 2 : -1; if (f.axis === 0) return 1; if (f.axis === 1) return -1; return 0; } },
    { name: "Fermion (R)", sym: "T₁u", lam: r2, mult: 3, face: "hex + square",
      phys: "identified with right-handed fermions",
      desc: "Anti-phase dipole: hex and square move oppositely (ratio " + bR2.toFixed(2) + "). Upper root of λ²−9λ+16.",
      subs: ["x", "y", "z"], subI: 0,
      ev: function (f, si) { var ax = si || 0; if (f.type === "hex") return f.signs[ax]; return f.axis === ax ? f.sign * bR2 : 0; } },
    { name: "Colour", sym: "T₂g", lam: 7, mult: 3, face: "hexagons only",
      phys: "identified with the strong sector (gluons)",
      desc: "Hex-only quadrupole; squares are exact nodes. The framework reads this hex-hex-only propagation as confinement.",
      subs: ["xy", "xz", "yz"], subI: 0,
      ev: function (f, si) { if (f.type === "sq") return 0; var p = [[0,1],[0,2],[1,2]][si || 0]; return f.signs[p[0]] * f.signs[p[1]]; } },
    { name: "Anti-breathe", sym: "A₁g", lam: 7, mult: 1, face: "hex vs square",
      phys: "mixed hex/square compression",
      desc: "Hexagons and squares displace in opposition, ratio −4/3.",
      ev: function (f) { return f.type === "hex" ? 1 : -4 / 3; } },
    { name: "Higgs", sym: "A₂u", lam: 9, mult: 1, face: "hexagons only",
      phys: "A₂u — uniquely the Higgs (Tier 1)",
      desc: "Alternating s₁s₂s₃ flips sign across every hex neighbour. Top of the spectrum, maximum curvature.",
      ev: function (f) { if (f.type === "sq") return 0; return f.signs[0] * f.signs[1] * f.signs[2]; } }
  ];

  // --- geometry -----------------------------------------------------------
  function genVerts() {
    var v = [];
    for (var zp = 0; zp < 3; zp++) {
      var op = [0, 1, 2].filter(function (i) { return i !== zp; });
      for (var sw = 0; sw < 2; sw++) {
        var sP = op[sw], tP = op[1 - sw];
        for (var ss = -1; ss <= 1; ss += 2) for (var ts = -1; ts <= 1; ts += 2) {
          var c = [0, 0, 0]; c[sP] = ss * SC; c[tP] = ts * 2 * SC;
          v.push(new THREE.Vector3(c[0], c[1], c[2]));
        }
      }
    }
    return v;
  }
  function avgVec(arr) { var s = new THREE.Vector3(); for (var i = 0; i < arr.length; i++) s.add(arr[i]); return s.divideScalar(arr.length); }
  function sortPoly(verts, cen, norm) {
    var up = Math.abs(norm.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    var u = new THREE.Vector3().crossVectors(norm, up).normalize();
    var w = new THREE.Vector3().crossVectors(norm, u).normalize();
    verts.sort(function (a, b) {
      var da = a.clone().sub(cen), db = b.clone().sub(cen);
      return Math.atan2(da.dot(w), da.dot(u)) - Math.atan2(db.dot(w), db.dot(u));
    });
  }
  function buildFaces(verts) {
    var faces = [], eps = 0.01, s1, s2, s3;
    for (s1 = -1; s1 <= 1; s1 += 2) for (s2 = -1; s2 <= 1; s2 += 2) for (s3 = -1; s3 <= 1; s3 += 2) {
      var n = new THREE.Vector3(s1, s2, s3).normalize(), tgt = 3 * SC;
      var fv = verts.filter(function (v) { return Math.abs(v.x * s1 + v.y * s2 + v.z * s3 - tgt) < eps; });
      if (fv.length !== 6) continue;
      var cen = avgVec(fv); sortPoly(fv, cen, n);
      faces.push({ type: "hex", verts: fv, normal: n, centroid: cen, signs: [s1, s2, s3] });
    }
    for (var ax = 0; ax < 3; ax++) for (var sg = -1; sg <= 1; sg += 2) {
      var n2 = new THREE.Vector3(); n2.setComponent(ax, sg);
      var fv2 = verts.filter(function (v) { return Math.abs(v.getComponent(ax) - sg * 2 * SC) < eps; });
      if (fv2.length !== 4) continue;
      var cen2 = avgVec(fv2); sortPoly(fv2, cen2, n2);
      faces.push({ type: "sq", verts: fv2, normal: n2, centroid: cen2, axis: ax, sign: sg });
    }
    return faces;
  }
  function subdivideFace(face) {
    var N = face.verts.length, cen = face.centroid, boundary = [], i;
    for (i = 0; i < N; i++) {
      boundary.push(face.verts[i].clone());
      boundary.push(face.verts[i].clone().add(face.verts[(i + 1) % N]).multiplyScalar(0.5));
    }
    var nA = boundary.length, positions = [], weights = [];
    positions.push(cen.x, cen.y, cen.z); weights.push(1.0);
    for (var r = 1; r <= NUM_RINGS; r++) {
      var t = r / NUM_RINGS, w = Math.cos(Math.PI * t / 2), w2 = w * w;
      for (var a = 0; a < nA; a++) {
        var bp = boundary[a];
        positions.push(cen.x + t * (bp.x - cen.x), cen.y + t * (bp.y - cen.y), cen.z + t * (bp.z - cen.z));
        weights.push(w2);
      }
    }
    var indices = [];
    for (var a2 = 0; a2 < nA; a2++) indices.push(0, 1 + a2, 1 + (a2 + 1) % nA);
    for (var rr = 1; rr < NUM_RINGS; rr++) {
      var b1 = 1 + (rr - 1) * nA, b2 = 1 + rr * nA;
      for (var a3 = 0; a3 < nA; a3++) { var a4 = (a3 + 1) % nA; indices.push(b1 + a3, b2 + a3, b2 + a4); indices.push(b1 + a3, b2 + a4, b1 + a4); }
    }
    return { positions: new Float32Array(positions), weights: new Float32Array(weights), indices: indices };
  }

  // --- scene --------------------------------------------------------------
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0x8090a8, 0.55));
  var dl1 = new THREE.DirectionalLight(0xffffff, 0.85); dl1.position.set(5, 8, 6); scene.add(dl1);
  var dl2 = new THREE.DirectionalLight(0x4488ff, 0.3); dl2.position.set(-4, -3, -5); scene.add(dl2);
  var group = new THREE.Group(); scene.add(group);

  var verts = genVerts(), faces = buildFaces(verts), faceData = [];
  // node colour (dark) and outward(amber)/inward(teal)
  var cNone = [0.10, 0.13, 0.18], cOut = [0.94, 0.71, 0.16], cIn = [0.35, 0.82, 0.78];

  faces.forEach(function (face) {
    var sub = subdivideFace(face), n = sub.weights.length;
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(sub.positions.slice(), 3));
    geo.setIndex(sub.indices);
    var colors = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { colors[i*3] = cNone[0]; colors[i*3+1] = cNone[1]; colors[i*3+2] = cNone[2]; }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mat = new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.7, side: THREE.DoubleSide, shininess: 55 });
    var mesh = new THREE.Mesh(geo, mat); group.add(mesh);
    faceData.push({ geo: geo, mat: mat, face: face, rest: sub.positions.slice(), weights: sub.weights,
      posAttr: geo.getAttribute("position"), colAttr: geo.getAttribute("color") });
  });

  // edges + vertex dots
  var elen = SC * Math.SQRT2, pts = [];
  for (var i = 0; i < verts.length; i++) for (var j = i + 1; j < verts.length; j++)
    if (Math.abs(verts[i].distanceTo(verts[j]) - elen) < 0.05) pts.push(verts[i], verts[j]);
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x3a4a5e, transparent: true, opacity: 0.8 })));
  var dotGeo = new THREE.SphereGeometry(0.05, 8, 6), dotMat = new THREE.MeshBasicMaterial({ color: 0x5a6a7e });
  verts.forEach(function (v) { var m = new THREE.Mesh(dotGeo, dotMat); m.position.copy(v); group.add(m); });

  // --- state + controls ---------------------------------------------------
  var active = 0, amp = 0.55, spd = 0.30, maxCache = {}, t = 0;
  var modesEl = document.getElementById("eigen-modes");
  var infoEl = document.getElementById("eigen-info");
  var evEl = document.getElementById("eigen-ev");

  if (modesEl) {
    MODES.forEach(function (m, i) {
      var b = document.createElement("button");
      b.className = "eigen-mode-btn"; b.dataset.i = i;
      b.innerHTML = "<span class='em-name'>" + m.name + "</span><span class='em-sym'>" + m.sym + " · λ=" + (m.lam < 0.01 ? "0" : m.lam.toFixed(3)) + "</span>";
      b.onclick = function () { select(i); };
      modesEl.appendChild(b);
    });
  }
  var ampEl = document.getElementById("eigen-amp"), spdEl = document.getElementById("eigen-spd");
  if (ampEl) ampEl.oninput = function () { amp = ampEl.value / 100; };
  if (spdEl) spdEl.oninput = function () { spd = spdEl.value / 100; };

  function select(i) {
    active = i; maxCache = {};
    if (modesEl) Array.prototype.forEach.call(modesEl.children, function (c, k) { c.classList.toggle("active", k === i); });
    var m = MODES[i];
    if (evEl) evEl.innerHTML = "<span class='evk'>λ = " + (m.lam < 0.01 ? "0" : m.lam.toFixed(4)) + "</span>" +
      "<span class='evs'>" + m.sym + " · ω ∝ √λ = " + (m.lam < 0.01 ? "0" : Math.sqrt(m.lam).toFixed(3)) + " · mult " + m.mult + "</span>";
    if (infoEl) infoEl.innerHTML = "<strong>" + m.name + "</strong> — " + m.phys + ". " + m.desc +
      " <span class='em-faces'>Active faces: " + m.face + ".</span>";
  }
  function getMax(i) {
    var key = i + "_" + (MODES[i].subI || 0);
    if (maxCache[key] !== undefined) return maxCache[key];
    var mx = 0, m = MODES[i];
    for (var k = 0; k < faceData.length; k++) mx = Math.max(mx, Math.abs(m.ev(faceData[k].face, m.subI || 0)));
    maxCache[key] = mx || 1; return maxCache[key];
  }

  // --- orbit --------------------------------------------------------------
  var drag = false, px, py, rx = 0.35, ry = 0.6, dist = 7.2;
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", function (e) { drag = true; px = e.clientX; py = e.clientY; canvas.style.cursor = "grabbing"; });
  window.addEventListener("pointerup", function () { drag = false; canvas.style.cursor = "grab"; });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return; ry += (e.clientX - px) * 0.006; rx += (e.clientY - py) * 0.006;
    rx = Math.max(-1.4, Math.min(1.4, rx)); px = e.clientX; py = e.clientY;
  });
  canvas.addEventListener("wheel", function (e) { dist = Math.max(4.5, Math.min(12, dist + e.deltaY * 0.005)); e.preventDefault(); }, { passive: false });

  function resize() {
    var w = canvas.clientWidth || canvas.parentElement.clientWidth, h = canvas.clientHeight || 460;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // --- loop ---------------------------------------------------------------
  function loop() {
    requestAnimationFrame(loop);
    t += 0.016;
    var m = MODES[active], maxC = getMax(active), freq = Math.sqrt(Math.max(0.3, m.lam));
    for (var fi = 0; fi < faceData.length; fi++) {
      var fd = faceData[fi], nx = fd.face.normal.x, ny = fd.face.normal.y, nz = fd.face.normal.z;
      var raw = m.ev(fd.face, m.subI || 0), disp = (raw / maxC) * amp * MAX_DISP * Math.sin(freq * spd * 8 * t);
      var pos = fd.posAttr.array, col = fd.colAttr.array, rest = fd.rest, wt = fd.weights, cnt = fd.posAttr.count;
      for (var vi = 0; vi < cnt; vi++) {
        var d = disp * wt[vi];
        pos[vi*3] = rest[vi*3] + nx * d; pos[vi*3+1] = rest[vi*3+1] + ny * d; pos[vi*3+2] = rest[vi*3+2] + nz * d;
        var inten = Math.min(1, Math.abs(d) / 0.12), cr, cg, cb, base;
        if (inten < 0.001) { cr = cNone[0]; cg = cNone[1]; cb = cNone[2]; }
        else { base = d > 0 ? cOut : cIn; cr = cNone[0] + (base[0] - cNone[0]) * inten; cg = cNone[1] + (base[1] - cNone[1]) * inten; cb = cNone[2] + (base[2] - cNone[2]) * inten; }
        col[vi*3] = cr; col[vi*3+1] = cg; col[vi*3+2] = cb;
      }
      fd.posAttr.needsUpdate = true; fd.colAttr.needsUpdate = true;
      fd.mat.opacity = Math.min(0.95, 0.72 + Math.abs(disp) * 1.8);
      fd.geo.computeVertexNormals();
    }
    if (!drag) ry += 0.002;
    camera.position.set(dist * Math.sin(ry) * Math.cos(rx), dist * Math.sin(rx), dist * Math.cos(ry) * Math.cos(rx));
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  resize(); select(1); loop();   // open on the left-handed fermion mode
})();
