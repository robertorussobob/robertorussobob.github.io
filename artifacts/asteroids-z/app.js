/* Asteroids Z, client: rendering su canvas, input, menu e HUD.
   La simulazione sta tutta in core.js (window.AZ); qui si disegna cio' che
   il mondo contiene e si traducono tasti e dita in ship.input. */
(function () {
  "use strict";
  const AZ = window.AZ;
  const $ = (id) => document.getElementById(id);
  const canvas = $("c"), ctx = canvas.getContext("2d");
  const menu = $("menu"), overlay = $("over"), pauseEl = $("pause"), touch = $("touch");

  /* --- configurazione e stato --- */
  const config = { mode: "solo", ships: ["cobra", "behemoth"] };
  let world = null, running = false, paused = false, acc = 0, last = 0, overShown = false;
  const keys = Object.create(null);
  const touchIn = { left: false, right: false, thrust: false, fire: false };
  const KEYMAP = [
    { left: "KeyA", right: "KeyD", thrust: "KeyW", fire: "Space" },
    { left: "ArrowLeft", right: "ArrowRight", thrust: "ArrowUp", fire: "Enter" },
  ];
  const HISCORE_KEY = "az.hiscore.solo";
  const loadHiscore = () => { try { return +localStorage.getItem(HISCORE_KEY) || 0; } catch (e) { return 0; } };
  const saveHiscore = (v) => { try { localStorage.setItem(HISCORE_KEY, String(v)); } catch (e) { /* niente storage: pazienza */ } };
  let hiscore = loadHiscore();

  /* --- canvas e trasformazione mondo -> schermo --- */
  let dpr = 1, scale = 1, offX = 0, offY = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    scale = Math.min(w / AZ.W, h / AZ.H) * dpr;
    offX = (canvas.width - AZ.W * scale) / 2;
    offY = (canvas.height - AZ.H * scale) / 2;
  }
  window.addEventListener("resize", resize);

  /* --- disegno --- */
  function poly(verts, close) {
    ctx.beginPath();
    verts.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])));
    if (close !== false) ctx.closePath();
    ctx.stroke();
  }

  /* Disegna l'entita' in ogni copia toroidale che entra nel campo. */
  function wrapped(e, r, draw) {
    for (const ox of [-AZ.W, 0, AZ.W]) for (const oy of [-AZ.H, 0, AZ.H]) {
      const x = e.x + ox, y = e.y + oy;
      if (x < -r || x > AZ.W + r || y < -r || y > AZ.H + r) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.angle || 0); draw(); ctx.restore();
    }
  }

  function drawShip(s) {
    const t = AZ.SHIPS[s.type];
    if (!s.alive) return;
    if (s.invuln > 0 && Math.floor(world.t * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.strokeStyle = s.color; ctx.shadowColor = s.color;
    wrapped(s, s.radius * 2, () => {
      poly(t.shape);
      if (s.thrusting && Math.floor(world.tick / 3) % 2 === 0) {
        const back = -s.radius * 0.9, tip = -s.radius * 2.1, half = s.radius * 0.45;
        ctx.strokeStyle = "#ffb54d"; ctx.shadowColor = "#ffb54d";
        poly([[back, half], [tip, 0], [back, -half]], false);
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawRock(a) {
    ctx.strokeStyle = a.color; ctx.shadowColor = a.color;
    wrapped(a, a.radius, () => poly(a.verts));
  }

  function drawBullet(b) {
    ctx.strokeStyle = b.color; ctx.shadowColor = b.color;
    const k = Math.max(0.015, 0.7 / Math.hypot(b.vx, b.vy));
    wrapped(b, 2, () => poly([[0, 0], [-b.vx * k, -b.vy * k]], false));
  }

  function drawDebris(d) {
    ctx.strokeStyle = d.color; ctx.shadowColor = d.color;
    ctx.globalAlpha = Math.min(1, d.life * 1.5);
    wrapped(d, 2, () => poly([[-d.len / 2, 0], [d.len / 2, 0]], false));
    ctx.globalAlpha = 1;
  }

  function hudText(txt, x, y, color, align, size) {
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6;
    ctx.textAlign = align || "left"; ctx.textBaseline = "top";
    ctx.font = `${(size || 14) * dpr}px "Courier New", ui-monospace, monospace`;
    ctx.fillText(txt, x * dpr, y * dpr);
  }

  function hullBar(s, x, y, alignRight) {
    const w = 110, h = 6, f = Math.max(0, s.hull / s.hullMax);
    const x0 = (alignRight ? x - w : x) * dpr;
    ctx.shadowBlur = 0; ctx.strokeStyle = s.color; ctx.lineWidth = dpr;
    ctx.strokeRect(x0, y * dpr, w * dpr, h * dpr);
    ctx.fillStyle = s.color; ctx.globalAlpha = 0.8;
    ctx.fillRect(x0 + (alignRight ? (1 - f) * w * dpr : 0), y * dpr, w * f * dpr, h * dpr);
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const cw = canvas.width / dpr;
    const p1 = world.ships[0];
    hudText(p1.name.toUpperCase(), 14, 10, p1.color);
    hullBar(p1, 14, 30, false);
    if (world.mode === "solo") {
      hudText(`SCORE ${p1.score}`, 14, 42, "#ddd");
      hudText("LIVES " + "▲".repeat(Math.max(0, p1.lives)), 14, 60, "#ddd");
      hudText(`WAVE ${world.wave}`, cw / 2, 10, "#ff7a1a", "center");
      hudText(`HI ${Math.max(hiscore, p1.score)}`, cw - 14, 10, "#ddd", "right");
      if (!p1.alive && p1.lives > 0) hudText("RESPAWNING", cw / 2, 40, p1.color, "center", 12);
    } else {
      const p2 = world.ships[1];
      hudText(`KILLS ${p1.kills} / ${AZ.DUEL_KILLS}`, 14, 42, "#ddd");
      hudText(p2.name.toUpperCase(), cw - 14, 10, p2.color, "right");
      hullBar(p2, cw - 14, 30, true);
      hudText(`KILLS ${p2.kills} / ${AZ.DUEL_KILLS}`, cw - 14, 42, "#ddd", "right");
    }
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    /* cornice del campo */
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
    ctx.strokeRect(offX, offY, AZ.W * scale, AZ.H * scale);
    ctx.save();
    ctx.beginPath(); ctx.rect(offX, offY, AZ.W * scale, AZ.H * scale); ctx.clip();
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    ctx.lineWidth = 1.7 / scale * dpr; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.shadowBlur = 10 * dpr;
    for (const a of world.asteroids) drawRock(a);
    for (const b of world.bullets) drawBullet(b);
    for (const d of world.debris) drawDebris(d);
    for (const s of world.ships) drawShip(s);
    ctx.restore();
    drawHud();
  }

  /* --- ciclo --- */
  function applyInput() {
    world.ships.forEach((s, i) => {
      const m = KEYMAP[i];
      s.input.left = !!keys[m.left] || (i === 0 && touchIn.left);
      s.input.right = !!keys[m.right] || (i === 0 && touchIn.right);
      s.input.thrust = !!keys[m.thrust] || (i === 0 && touchIn.thrust);
      s.input.fire = !!keys[m.fire] || (i === 0 && touchIn.fire);
    });
  }

  function frame(now) {
    if (!running) return;
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.25) dt = 0.25;
    if (!paused) {
      acc += dt;
      applyInput();
      let n = 0;
      while (acc >= AZ.DT && n < 6) { AZ.step(world); acc -= AZ.DT; n++; }
      if (world.over && !overShown) showOver();
    }
    render();
    requestAnimationFrame(frame);
  }

  function start() {
    world = AZ.createWorld({ mode: config.mode, ships: config.ships.slice() });
    running = true; paused = false; acc = 0; overShown = false; last = performance.now();
    menu.hidden = true; overlay.hidden = true; pauseEl.hidden = true;
    document.body.classList.toggle("touch-on", config.mode === "solo");
    resize();
    requestAnimationFrame(frame);
  }

  function showOver() {
    overShown = true;
    const p1 = world.ships[0];
    let title, sub;
    if (world.mode === "solo") {
      if (p1.score > hiscore) { hiscore = p1.score; saveHiscore(hiscore); }
      title = "GAME OVER";
      sub = `Score ${p1.score}, wave ${world.wave}. Best ${hiscore}.`;
    } else {
      const win = world.ships.find(s => s.id === world.winner), lose = world.ships.find(s => s.id !== world.winner);
      title = `${win.name.toUpperCase()} WINS`;
      sub = `${win.kills} kills to ${lose.kills}.`;
    }
    $("over-title").textContent = title;
    $("over-sub").textContent = sub;
    overlay.hidden = false;
  }

  function togglePause() {
    if (!running || world.over) return;
    paused = !paused; pauseEl.hidden = !paused;
    if (!paused) { last = performance.now(); acc = 0; }
  }

  /* --- input --- */
  const GAME_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]);
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyP" || e.code === "Escape") { if (running && menu.hidden) togglePause(); return; }
    keys[e.code] = true;
    if (running && menu.hidden && GAME_KEYS.has(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  for (const btn of touch.querySelectorAll("[data-in]")) {
    const name = btn.dataset.in;
    const on = (e) => { touchIn[name] = true; btn.classList.add("on"); e.preventDefault(); };
    const off = (e) => { touchIn[name] = false; btn.classList.remove("on"); if (e) e.preventDefault(); };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off);
    btn.addEventListener("pointerleave", off);
  }

  /* --- menu --- */
  const bars = (v, max) => "▮".repeat(Math.round(v / max * 5)) + "▯".repeat(5 - Math.round(v / max * 5));
  function shipStats() {
    const rows = AZ.SHIP_KEYS.map(k => {
      const t = AZ.SHIPS[k], g = t.gun;
      return { key: k, t, accel: t.thrust / t.mass, turn: t.torque / (t.mass * t.radius * t.radius / 2),
        hull: t.hull, fire: g.damage * g.rate * g.barrels };
    });
    const max = {};
    for (const f of ["accel", "turn", "hull", "fire"]) max[f] = Math.max(...rows.map(r => r[f]));
    return { rows, max };
  }

  function buildPicker(el, player) {
    const { rows, max } = shipStats();
    el.innerHTML = "";
    for (const r of rows) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ship"; b.style.setProperty("--c", r.t.color);
      b.innerHTML = `<span class="ship-name">${r.t.name}</span>
        <span class="ship-blurb">${r.t.blurb}</span>
        <span class="stat"><i>accel</i>${bars(r.accel, max.accel)}</span>
        <span class="stat"><i>turn</i>${bars(r.turn, max.turn)}</span>
        <span class="stat"><i>hull</i>${bars(r.hull, max.hull)}</span>
        <span class="stat"><i>guns</i>${bars(r.fire, max.fire)}</span>`;
      b.addEventListener("click", () => { config.ships[player] = r.key; refreshMenu(); });
      b.dataset.key = r.key;
      el.appendChild(b);
    }
  }

  function refreshMenu() {
    for (const b of menu.querySelectorAll("[data-mode]")) b.classList.toggle("sel", b.dataset.mode === config.mode);
    $("pick2-wrap").hidden = config.mode !== "duel";
    $("pick1-label").textContent = config.mode === "duel" ? "Player 1 (W A D, Space)" : "Your ship";
    [0, 1].forEach(p => {
      for (const b of $("pick" + (p + 1)).querySelectorAll(".ship")) b.classList.toggle("sel", b.dataset.key === config.ships[p]);
    });
    $("hiscore").textContent = hiscore ? `Best solo score: ${hiscore}` : "";
  }

  for (const b of menu.querySelectorAll("[data-mode]")) b.addEventListener("click", () => { config.mode = b.dataset.mode; refreshMenu(); });
  buildPicker($("pick1"), 0); buildPicker($("pick2"), 1);
  $("start").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("tomenu").addEventListener("click", () => {
    running = false; overlay.hidden = true; menu.hidden = false;
    document.body.classList.remove("touch-on"); refreshMenu(); startIdle();
  });
  refreshMenu(); resize();

  /* Mondo di sfondo dietro al menu: qualche asteroide che vaga, nessuna nave. */
  function startIdle() {
    world = AZ.createWorld({ mode: "solo", ships: ["cobra"], seed: 2019 });
    world.ships[0].alive = false; world.ships[0].lives = 99; world.ships[0].respawnIn = 1e9;
    requestAnimationFrame(function idle() {
      if (running) return;
      AZ.step(world);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, offX, offY);
      ctx.lineWidth = 1.7 / scale * dpr; ctx.shadowBlur = 10 * dpr; ctx.globalAlpha = 0.5;
      for (const a of world.asteroids) drawRock(a);
      ctx.restore();
      requestAnimationFrame(idle);
    });
  }
  startIdle();
})();
