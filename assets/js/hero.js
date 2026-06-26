/* PALEOTRON vector hero.
   Wireframe asteroids drifting with linear Newtonian motion and wraparound,
   plus one slow-turning ship. Phosphor amber on transparent. Vanilla, no deps.
   Honours prefers-reduced-motion: draws a single static frame and stops. */
(function () {
  "use strict";
  var canvas = document.getElementById("vector-hero");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var AMBER = "#ffb000";
  var CYAN = "#36e0d0";
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0;
  var rocks = [];
  var ship = null;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeRock(x, y) {
    var r = rand(16, 46);
    var n = (Math.random() * 4 | 0) + 7;
    var verts = [];
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2;
      var rr = r * rand(0.72, 1.12);
      verts.push([Math.cos(ang) * rr, Math.sin(ang) * rr]);
    }
    return {
      x: x, y: y, r: r, verts: verts,
      vx: rand(-0.18, 0.18), vy: rand(-0.14, 0.14),
      rot: rand(0, Math.PI * 2), vr: rand(-0.004, 0.004)
    };
  }

  function build() {
    rocks = [];
    var count = W < 640 ? 5 : 9;
    for (var i = 0; i < count; i++) {
      rocks.push(makeRock(rand(0, W), rand(0, H)));
    }
    ship = { x: W * 0.5, y: H * 0.5, rot: 0, vr: 0.0035 };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(rect.width, 1);
    H = Math.max(rect.height, 1);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
    if (reduced) draw();
  }

  function wrap(o, pad) {
    if (o.x < -pad) o.x = W + pad;
    if (o.x > W + pad) o.x = -pad;
    if (o.y < -pad) o.y = H + pad;
    if (o.y > H + pad) o.y = -pad;
  }

  function drawRock(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.beginPath();
    for (var i = 0; i < o.verts.length; i++) {
      var v = o.verts[i];
      if (i === 0) ctx.moveTo(v[0], v[1]); else ctx.lineTo(v[0], v[1]);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawShip(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.strokeStyle = CYAN;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(9, 11);
    ctx.lineTo(0, 6);
    ctx.lineTo(-9, 11);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = AMBER;
    ctx.shadowColor = "rgba(255,176,0,0.5)";
    ctx.shadowBlur = 8;
    for (var i = 0; i < rocks.length; i++) drawRock(rocks[i]);
    if (ship) drawShip(ship);
    ctx.shadowBlur = 0;
  }

  function step() {
    for (var i = 0; i < rocks.length; i++) {
      var o = rocks[i];
      o.x += o.vx; o.y += o.vy; o.rot += o.vr;
      wrap(o, o.r + 8);
    }
    if (ship) ship.rot += ship.vr;
    draw();
    raf = window.requestAnimationFrame(step);
  }

  var raf = 0;
  resize();
  var t;
  window.addEventListener("resize", function () {
    window.clearTimeout(t);
    t = window.setTimeout(resize, 150);
  });

  if (!reduced) step();
})();
