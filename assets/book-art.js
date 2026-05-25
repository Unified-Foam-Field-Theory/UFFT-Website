/* ============================================================================
   book-art.js — deterministic generative "foam" illustration per chapter.
   A stand-in for the hand-drawn plates: each chapter seeds a unique field of
   bubbles + connective lines. Part One = teal (cosmology), Part Two = amber
   (life), front/back matter = balanced. Drop a real <img> into .chap-illus to
   override (the canvas only draws if present).
   ========================================================================== */
(function () {
  "use strict";

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function palette(part) {
    if (part === "two")  return { a: 40,  b: 172 };   // amber dominant, teal accent
    if (part === "one")  return { a: 174, b: 42  };    // teal dominant, amber accent
    return { a: 174, b: 40 };                          // neutral: both
  }

  function draw(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var seed = parseInt(canvas.getAttribute("data-seed"), 10) || 1;
    var pal = palette(canvas.getAttribute("data-part"));
    var rng = mulberry32((seed * 374761393 + 668265263) >>> 0);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.clientWidth || canvas.parentElement.clientWidth || 720;
    var H = canvas.clientHeight || 260;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var minD = Math.min(W, H);
    var N = 22 + Math.floor(rng() * 16);
    var cells = [];
    for (var i = 0; i < N; i++) {
      cells.push({
        x: rng() * W,
        y: rng() * H,
        r: (0.05 + Math.pow(rng(), 1.7) * 0.32) * minD,
        hue: (rng() < 0.26 ? pal.b : pal.a) + (rng() * 24 - 12)
      });
    }

    // connective lines (behind)
    ctx.lineWidth = 1;
    for (var p = 0; p < cells.length; p++) {
      for (var q = p + 1; q < cells.length; q++) {
        var dx = cells[p].x - cells[q].x, dy = cells[p].y - cells[q].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.20 * W) {
          ctx.strokeStyle = "hsla(" + pal.a + ",45%,62%," + (0.10 * (1 - d / (0.20 * W))).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(cells[p].x, cells[p].y); ctx.lineTo(cells[q].x, cells[q].y); ctx.stroke();
        }
      }
    }

    // bubbles: soft radial fill + crisp rim
    for (var k = 0; k < cells.length; k++) {
      var c = cells[k];
      var g = ctx.createRadialGradient(c.x, c.y, c.r * 0.1, c.x, c.y, c.r);
      g.addColorStop(0, "hsla(" + c.hue + ",70%,62%,0.16)");
      g.addColorStop(1, "hsla(" + c.hue + ",70%,62%,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsla(" + c.hue + ",75%,68%,0.45)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
    }

    // bright vertices on a subset
    for (var m = 0; m < cells.length; m++) {
      if (rng() < 0.5) continue;
      ctx.fillStyle = "rgba(230,237,243,0.7)";
      ctx.beginPath(); ctx.arc(cells[m].x, cells[m].y, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function init() {
    var cs = document.querySelectorAll("canvas.book-art");
    cs.forEach(function (c) { draw(c); });
    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () { cs.forEach(function (c) { draw(c); }); }, 150);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
