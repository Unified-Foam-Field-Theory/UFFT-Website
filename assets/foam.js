/* ============================================================================
   foam.js — the Kelvin cell (truncated octahedron) rendered from first
   principles. Vertices = all permutations of (0, ±1, ±2). 24 vertices,
   36 edges, 14 faces (8 hexagons + 6 squares). Those integers are the
   framework's inputs, so we build the object exactly, not as a stand-in.
   Requires THREE (r128) loaded globally.
   ========================================================================== */
(function () {
  "use strict";
  var canvas = document.getElementById("foam-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  // --- 24 vertices: permutations of (0, ±1, ±2) ----------------------------
  var V = [];
  for (var zero = 0; zero < 3; zero++) {
    var others = [0, 1, 2].filter(function (a) { return a !== zero; });
    var mags = [[1, 2], [2, 1]];
    for (var mi = 0; mi < 2; mi++) {
      for (var s1 = -1; s1 <= 1; s1 += 2) {
        for (var s2 = -1; s2 <= 1; s2 += 2) {
          var v = [0, 0, 0];
          v[others[0]] = s1 * mags[mi][0];
          v[others[1]] = s2 * mags[mi][1];
          V.push(v);
        }
      }
    }
  }

  // --- faces by plane membership ------------------------------------------
  // squares: v[axis] === ±2 ; hexagons: sx*x+sy*y+sz*z === 3
  function collectSquare(axis, sign) {
    var idx = [];
    for (var i = 0; i < V.length; i++) if (V[i][axis] === sign * 2) idx.push(i);
    return idx;
  }
  function collectHex(sx, sy, sz) {
    var idx = [];
    for (var i = 0; i < V.length; i++) {
      if (sx * V[i][0] + sy * V[i][1] + sz * V[i][2] === 3) idx.push(i);
    }
    return idx;
  }
  var squares = [], hexes = [];
  for (var ax = 0; ax < 3; ax++) { squares.push(collectSquare(ax, 1)); squares.push(collectSquare(ax, -1)); }
  for (var a = -1; a <= 1; a += 2) for (var b = -1; b <= 1; b += 2) for (var c = -1; c <= 1; c += 2)
    hexes.push(collectHex(a, b, c));

  // --- order a face's vertices CCW around its outward normal ----------------
  function sortFace(idx) {
    var cx = 0, cy = 0, cz = 0, n = idx.length, i;
    for (i = 0; i < n; i++) { cx += V[idx[i]][0]; cy += V[idx[i]][1]; cz += V[idx[i]][2]; }
    cx /= n; cy /= n; cz /= n;
    var nlen = Math.hypot(cx, cy, cz) || 1;
    var nrm = [cx / nlen, cy / nlen, cz / nlen];
    // build a basis in the face plane
    var ref = Math.abs(nrm[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    var u = cross(ref, nrm); normalize(u);
    var w = cross(nrm, u);
    return idx.slice().sort(function (p, q) {
      var ap = ang(V[p]), aq = ang(V[q]);
      return ap - aq;
    });
    function ang(pt) {
      var dx = pt[0] - cx, dy = pt[1] - cy, dz = pt[2] - cz;
      return Math.atan2(dot([dx, dy, dz], w), dot([dx, dy, dz], u));
    }
  }
  function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function normalize(a) { var l = Math.hypot(a[0],a[1],a[2])||1; a[0]/=l; a[1]/=l; a[2]/=l; }

  // --- triangulated geometry for a set of faces ---------------------------
  function faceGeometry(faces) {
    var pos = [];
    for (var f = 0; f < faces.length; f++) {
      var o = sortFace(faces[f]);
      for (var t = 1; t < o.length - 1; t++) {
        pushV(pos, V[o[0]]); pushV(pos, V[o[t]]); pushV(pos, V[o[t + 1]]);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  function pushV(arr, v) { arr.push(v[0], v[1], v[2]); }

  var hexGeo = faceGeometry(hexes);
  var sqGeo  = faceGeometry(squares);

  // --- scene --------------------------------------------------------------
  var scene = new THREE.Scene();
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(4.6, 3.2, 5.4);
  camera.lookAt(0, 0, 0);

  var root = new THREE.Group();
  scene.add(root);

  var hexMat = new THREE.MeshStandardMaterial({
    color: 0x5ad1c8, transparent: true, opacity: 0.16, roughness: 0.5, metalness: 0.1,
    side: THREE.DoubleSide, depthWrite: false
  });
  var sqMat = new THREE.MeshStandardMaterial({
    color: 0xf0b429, transparent: true, opacity: 0.18, roughness: 0.5, metalness: 0.1,
    side: THREE.DoubleSide, depthWrite: false
  });
  root.add(new THREE.Mesh(hexGeo, hexMat));
  root.add(new THREE.Mesh(sqGeo, sqMat));

  // edges (true polyhedron edges only — coplanar triangulation suppressed)
  var edgeMat = new THREE.LineBasicMaterial({ color: 0x9fe9e2, transparent: true, opacity: 0.85 });
  root.add(new THREE.LineSegments(new THREE.EdgesGeometry(hexGeo, 1), edgeMat));
  root.add(new THREE.LineSegments(new THREE.EdgesGeometry(sqGeo, 1), edgeMat));

  // 24 vertices as points
  var vpos = [];
  for (var i = 0; i < V.length; i++) pushV(vpos, V[i]);
  var vGeo = new THREE.BufferGeometry();
  vGeo.setAttribute("position", new THREE.Float32BufferAttribute(vpos, 3));
  root.add(new THREE.Points(vGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14 })));

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  var key = new THREE.DirectionalLight(0xbfefff, 0.9); key.position.set(5, 6, 4); scene.add(key);
  var rim = new THREE.DirectionalLight(0xf0b429, 0.4); rim.position.set(-5, -3, -4); scene.add(rim);

  // --- size / resize ------------------------------------------------------
  function resize() {
    var w = canvas.clientWidth || canvas.parentElement.clientWidth;
    var h = canvas.clientHeight || 420;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // --- drag to rotate, auto-spin otherwise --------------------------------
  var dragging = false, px = 0, py = 0, ry = 0.4, rx = -0.25, auto = true;
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", function (e) { dragging = true; auto = false; px = e.clientX; py = e.clientY; canvas.style.cursor = "grabbing"; });
  window.addEventListener("pointerup", function () { dragging = false; canvas.style.cursor = "grab"; });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    ry += (e.clientX - px) * 0.008; rx += (e.clientY - py) * 0.008;
    rx = Math.max(-1.4, Math.min(1.4, rx));
    px = e.clientX; py = e.clientY;
  });

  (function loop() {
    requestAnimationFrame(loop);
    if (auto) ry += 0.0032;
    root.rotation.y = ry; root.rotation.x = rx;
    renderer.render(scene, camera);
  })();
})();
