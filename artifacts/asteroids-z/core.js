/* Asteroids Z, nucleo di simulazione.
   Puro: nessun accesso al DOM, nessuna dipendenza. Lo stesso file gira nel
   browser (espone window.AZ) e in Node (module.exports), cosi' che i test lo
   provino senza browser. Tutto cio' che e' fisica, regole e stato del mondo
   sta qui; app.js disegna e legge l'input. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AZ = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Campo di gioco in unita' di mondo e passo fisso della simulazione. */
  const W = 160, H = 90, DT = 1 / 60;
  const TAU = Math.PI * 2;

  /* Roster. Le forme sono poligoni in unita' di mondo, prua verso +x. Il
     raggio serve per gli urti e per il momento d'inerzia. angDamp e' lo
     smorzamento angolare (RCS automatico), thrust e torque sono forza e
     coppia, non accelerazioni: il compromesso fra le navi passa dalla massa. */
  const SHIPS = {
    cobra: {
      name: "Cobra MK2", color: "#4de8ff", mass: 1.0, thrust: 40, torque: 30, hull: 60,
      radius: 2.2, angDamp: 4,
      gun: { damage: 8, muzzle: 60, rate: 6, bulletMass: 0.01, barrels: 1, spread: 0, life: 1.1 },
      shape: [[3, 0], [-2.2, 2], [-1.2, 0], [-2.2, -2]],
      blurb: "Light and nimble. Fast guns, thin hull.",
    },
    behemoth: {
      name: "Behemoth", color: "#ff5a4d", mass: 4.0, thrust: 90, torque: 60, hull: 220,
      radius: 4.0, angDamp: 3,
      gun: { damage: 45, muzzle: 40, rate: 1.2, bulletMass: 0.12, barrels: 1, spread: 0, life: 1.6 },
      shape: [[4.5, 0], [1.5, 2.5], [-3.5, 3.5], [-2.5, 0], [-3.5, -3.5], [1.5, -2.5]],
      blurb: "Heavy starship with big guns. Slow to turn, slow to stop.",
    },
    wasp: {
      name: "Wasp", color: "#ffe34d", mass: 0.6, thrust: 28, torque: 25, hull: 35,
      radius: 1.8, angDamp: 5,
      gun: { damage: 4, muzzle: 55, rate: 10, bulletMass: 0.005, barrels: 2, spread: 0.06, life: 0.9 },
      shape: [[2.4, 0], [-1.2, 1.9], [-1.8, 0.8], [-1.8, -0.8], [-1.2, -1.9]],
      blurb: "Twin rapid guns, paper hull. Turns on a dime.",
    },
    lancer: {
      name: "Lancer", color: "#5dff8a", mass: 1.6, thrust: 55, torque: 40, hull: 110,
      radius: 2.8, angDamp: 4,
      gun: { damage: 30, muzzle: 110, rate: 1.5, bulletMass: 0.2, barrels: 1, spread: 0, life: 0.8 },
      shape: [[4, 0], [0, 1.2], [-2.5, 2.4], [-1.5, 0], [-2.5, -2.4], [0, -1.2]],
      blurb: "Railgun. Every shot kicks you backwards.",
    },
  };
  const SHIP_KEYS = Object.keys(SHIPS);

  /* Asteroidi per taglia: 3 grande, 2 medio, 1 piccolo. */
  const ROCK = {
    3: { radius: 6, mass: 6, hp: 40, points: 20 },
    2: { radius: 3.5, mass: 3, hp: 20, points: 50 },
    1: { radius: 1.8, mass: 1.5, hp: 8, points: 100 },
  };
  const ROCK_COLOR = "#ff7a1a";

  const RESPAWN_S = 2, INVULN_S = 2, DUEL_KILLS = 5, SOLO_LIVES = 3;
  const WAVE_PAUSE_S = 2, DUEL_MIN_ROCKS = 4, DUEL_ROCK_EVERY_S = 6;
  const IMPACT_DMG = 0.35;

  /* RNG seminato (mulberry32): a parita' di seme la stessa sequenza, cosi'
     che una partita sia riproducibile e un domani sincronizzabile in rete. */
  function Rng(seed) {
    let a = (seed >>> 0) || 1;
    const next = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      range: (lo, hi) => lo + (hi - lo) * next(),
      int: (n) => Math.floor(next() * n),
    };
  }

  const wrap = (v, size) => ((v % size) + size) % size;
  function torusDelta(a, b) {
    let dx = b.x - a.x, dy = b.y - a.y;
    if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
    if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
    return { x: dx, y: dy };
  }
  const torusDist = (a, b) => { const d = torusDelta(a, b); return Math.hypot(d.x, d.y); };

  /* --- entita' --- */

  function createShip(type, id, x, y, angle) {
    const t = SHIPS[type];
    return {
      kind: "ship", id, type, name: t.name, color: t.color,
      mass: t.mass, radius: t.radius, inertia: t.mass * t.radius * t.radius / 2,
      x, y, vx: 0, vy: 0, angle, angVel: 0,
      hull: t.hull, hullMax: t.hull,
      cooldown: 0, invuln: INVULN_S, alive: true, respawnIn: 0,
      score: 0, kills: 0, deaths: 0, lives: SOLO_LIVES, shotsFired: 0,
      thrusting: false,
      input: { left: false, right: false, thrust: false, fire: false },
    };
  }

  function rockVerts(radius, rng) {
    const n = 7 + rng.int(4), verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, r = radius * rng.range(0.72, 1.05);
      verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return verts;
  }

  function createAsteroid(size, x, y, vx, vy, rng) {
    const r = ROCK[size];
    return {
      kind: "rock", size, radius: r.radius, mass: r.mass, hp: r.hp, points: r.points,
      x: wrap(x, W), y: wrap(y, H), vx, vy,
      angle: rng.range(0, TAU), angVel: rng.range(-1.2, 1.2),
      verts: rockVerts(r.radius, rng), color: ROCK_COLOR,
    };
  }

  /* Due figli della taglia sotto, con la quantita' di moto del padre divisa
     a meta' piu' una spinta perpendicolare uguale e opposta, cosi' che la
     somma resti quella del padre. */
  function splitAsteroid(a, rng) {
    if (a.size <= 1) return [];
    const size = a.size - 1, m = ROCK[size].mass;
    const speed = Math.hypot(a.vx, a.vy);
    const kick = rng.range(3, 6) + speed * 0.3;
    const dir = Math.atan2(a.vy, a.vx) + Math.PI / 2;
    const kx = Math.cos(dir) * kick, ky = Math.sin(dir) * kick;
    const px = a.mass * a.vx / 2, py = a.mass * a.vy / 2;
    const off = ROCK[size].radius * 0.9;
    return [
      createAsteroid(size, a.x + Math.cos(dir) * off, a.y + Math.sin(dir) * off, px / m + kx, py / m + ky, rng),
      createAsteroid(size, a.x - Math.cos(dir) * off, a.y - Math.sin(dir) * off, px / m - kx, py / m - ky, rng),
    ];
  }

  function spawnDebris(world, x, y, vx, vy, color, n, spread) {
    const rng = world.rng;
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, TAU), s = rng.range(2, spread);
      world.debris.push({
        x, y, vx: vx * 0.3 + Math.cos(a) * s, vy: vy * 0.3 + Math.sin(a) * s,
        angle: rng.range(0, TAU), angVel: rng.range(-6, 6),
        len: rng.range(0.5, 1.8), life: rng.range(0.5, 1.1), color,
      });
    }
  }

  /* --- mondo --- */

  function createWorld(opts) {
    const mode = opts.mode || "solo";
    const seed = opts.seed == null ? (Date.now() & 0x7fffffff) : opts.seed;
    const world = {
      mode, W, H, DT, t: 0, tick: 0, seed, rng: Rng(seed),
      ships: [], asteroids: [], bullets: [], debris: [],
      wave: 0, waveTimer: 0, rockTimer: 0, over: false, winner: null,
    };
    const types = opts.ships || ["cobra"];
    if (mode === "duel") {
      world.ships.push(createShip(types[0], 0, W / 4, H / 2, 0));
      world.ships.push(createShip(types[1] || types[0], 1, 3 * W / 4, H / 2, Math.PI));
      spawnRocks(world, DUEL_MIN_ROCKS, 4, 7);
    } else {
      world.ships.push(createShip(types[0], 0, W / 2, H / 2, -Math.PI / 2));
      spawnWave(world, 1);
    }
    return world;
  }

  /* Un punto a distanza almeno minDist da ogni nave viva, sul toro. */
  function farPoint(world, minDist) {
    const rng = world.rng;
    let best = null, bestD = -1;
    for (let tries = 0; tries < 40; tries++) {
      const p = { x: rng.range(0, W), y: rng.range(0, H) };
      let d = Infinity;
      for (const s of world.ships) if (s.alive) d = Math.min(d, torusDist(p, s));
      if (d >= minDist) return p;
      if (d > bestD) { bestD = d; best = p; }
    }
    return best;
  }

  function spawnRocks(world, n, vmin, vmax) {
    const rng = world.rng;
    for (let i = 0; i < n; i++) {
      const p = farPoint(world, 25);
      const a = rng.range(0, TAU), v = rng.range(vmin, vmax);
      world.asteroids.push(createAsteroid(3, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, rng));
    }
  }

  function spawnWave(world, n) {
    world.wave = n;
    spawnRocks(world, 3 + n, 3, 6 + n);
  }

  /* --- azioni --- */

  function fire(ship, world) {
    if (!ship.alive || ship.cooldown > 0) return false;
    const g = SHIPS[ship.type].gun;
    ship.cooldown = 1 / g.rate;
    ship.shotsFired++;
    const hx = Math.cos(ship.angle), hy = Math.sin(ship.angle);
    for (let i = 0; i < g.barrels; i++) {
      /* canne affiancate: scostamento perpendicolare simmetrico */
      const side = g.barrels === 1 ? 0 : (i - (g.barrels - 1) / 2) * ship.radius * 0.8;
      const ang = ship.angle + (g.barrels === 1 ? 0 : (i - (g.barrels - 1) / 2) * g.spread);
      const bx = Math.cos(ang), by = Math.sin(ang);
      world.bullets.push({
        kind: "bullet", owner: ship.id, mass: g.bulletMass, damage: g.damage, radius: 0.5,
        x: wrap(ship.x + hx * ship.radius * 1.2 - hy * side, W),
        y: wrap(ship.y + hy * ship.radius * 1.2 + hx * side, H),
        vx: ship.vx + bx * g.muzzle, vy: ship.vy + by * g.muzzle,
        life: g.life, color: ship.color,
      });
    }
    /* rinculo: la massa a bordo (secca) resta quella dichiarata, il
       proiettile parte con la quantita' di moto che la nave perde */
    const impulse = g.barrels * g.bulletMass * g.muzzle;
    ship.vx -= hx * impulse / ship.mass;
    ship.vy -= hy * impulse / ship.mass;
    return true;
  }

  function damageShip(world, ship, dmg, byId) {
    if (!ship.alive || ship.invuln > 0) return false;
    ship.hull -= dmg;
    if (ship.hull > 0) return false;
    ship.hull = 0;
    ship.alive = false;
    ship.deaths++;
    ship.respawnIn = RESPAWN_S;
    ship.thrusting = false;
    if (world.mode === "solo") ship.lives--;
    if (byId != null && byId !== ship.id) {
      const killer = world.ships.find(s => s.id === byId);
      if (killer) killer.kills++;
    }
    spawnDebris(world, ship.x, ship.y, ship.vx, ship.vy, ship.color, 14, 14);
    return true;
  }

  function respawn(world, ship) {
    let p;
    if (world.mode === "duel") {
      const other = world.ships.find(s => s !== ship && s.alive);
      const cands = [[W / 4, H / 4], [3 * W / 4, H / 4], [W / 4, 3 * H / 4], [3 * W / 4, 3 * H / 4]];
      let best = cands[0], bestD = -1;
      for (const c of cands) {
        const pt = { x: c[0], y: c[1] };
        const d = other ? torusDist(pt, other) : 0;
        if (d > bestD) { bestD = d; best = c; }
      }
      p = { x: best[0], y: best[1] };
    } else {
      p = { x: W / 2, y: H / 2 };
    }
    ship.x = p.x; ship.y = p.y; ship.vx = 0; ship.vy = 0; ship.angVel = 0;
    ship.angle = world.mode === "duel" ? (p.x < W / 2 ? 0 : Math.PI) : -Math.PI / 2;
    ship.hull = ship.hullMax; ship.alive = true; ship.invuln = INVULN_S; ship.cooldown = 0;
  }

  /* Urto elastico fra due cerchi sul toro, con masse reali. Restituisce la
     velocita' relativa lungo la normale al momento dell'impatto (0 se non
     si toccano o si stanno gia' allontanando), utile per il danno. */
  function collideCircles(a, b, restitution) {
    const e = restitution == null ? 1 : restitution;
    const d = torusDelta(a, b);
    const dist = Math.hypot(d.x, d.y), rsum = a.radius + b.radius;
    if (dist >= rsum || dist === 0) return 0;
    const nx = d.x / dist, ny = d.y / dist;
    /* separazione delle compenetrazioni, ripartita per massa inversa */
    const pen = rsum - dist, ima = 1 / a.mass, imb = 1 / b.mass;
    const corr = pen / (ima + imb);
    a.x = wrap(a.x - nx * corr * ima, W); a.y = wrap(a.y - ny * corr * ima, H);
    b.x = wrap(b.x + nx * corr * imb, W); b.y = wrap(b.y + ny * corr * imb, H);
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return 0;
    const j = -(1 + e) * vn / (ima + imb);
    a.vx -= nx * j * ima; a.vy -= ny * j * ima;
    b.vx += nx * j * imb; b.vy += ny * j * imb;
    return -vn;
  }

  function killRock(world, a, ownerId) {
    const i = world.asteroids.indexOf(a);
    if (i >= 0) world.asteroids.splice(i, 1);
    const kids = splitAsteroid(a, world.rng);
    for (const k of kids) world.asteroids.push(k);
    spawnDebris(world, a.x, a.y, a.vx, a.vy, a.color, 4 + a.size * 3, 6 + a.size * 2);
    if (ownerId != null) {
      const s = world.ships.find(x => x.id === ownerId);
      if (s) s.score += a.points;
    }
  }

  /* --- passo --- */

  function step(world) {
    if (world.over) return;
    world.t += DT; world.tick++;

    for (const s of world.ships) {
      if (!s.alive) {
        s.respawnIn -= DT;
        if (s.respawnIn <= 0 && (world.mode === "duel" || s.lives > 0)) respawn(world, s);
        continue;
      }
      const t = SHIPS[s.type];
      const turn = (s.input.right ? 1 : 0) - (s.input.left ? 1 : 0);
      s.angVel += turn * t.torque / s.inertia * DT;
      s.angVel *= Math.exp(-t.angDamp * DT);
      s.angle = wrap(s.angle + s.angVel * DT, TAU);
      s.thrusting = !!s.input.thrust;
      if (s.thrusting) {
        const acc = t.thrust / s.mass;
        s.vx += Math.cos(s.angle) * acc * DT;
        s.vy += Math.sin(s.angle) * acc * DT;
      }
      s.x = wrap(s.x + s.vx * DT, W);
      s.y = wrap(s.y + s.vy * DT, H);
      if (s.cooldown > 0) s.cooldown -= DT;
      if (s.invuln > 0) s.invuln -= DT;
      if (s.input.fire) fire(s, world);
    }

    for (const b of world.bullets) {
      b.x = wrap(b.x + b.vx * DT, W); b.y = wrap(b.y + b.vy * DT, H); b.life -= DT;
    }
    for (const a of world.asteroids) {
      a.x = wrap(a.x + a.vx * DT, W); a.y = wrap(a.y + a.vy * DT, H);
      a.angle += a.angVel * DT;
    }
    for (const d of world.debris) {
      d.x = wrap(d.x + d.vx * DT, W); d.y = wrap(d.y + d.vy * DT, H);
      d.angle += d.angVel * DT; d.life -= DT;
    }

    /* proiettili contro asteroidi e navi */
    for (const b of world.bullets) {
      if (b.life <= 0) continue;
      let hit = false;
      for (const a of world.asteroids) {
        if (torusDist(b, a) < a.radius + b.radius) {
          a.vx += b.mass * b.vx / a.mass; a.vy += b.mass * b.vy / a.mass;
          a.hp -= b.damage;
          if (a.hp <= 0) killRock(world, a, b.owner);
          hit = true; break;
        }
      }
      if (!hit) for (const s of world.ships) {
        if (!s.alive || s.id === b.owner || s.invuln > 0) continue;
        if (torusDist(b, s) < s.radius + b.radius) {
          s.vx += b.mass * b.vx / s.mass; s.vy += b.mass * b.vy / s.mass;
          damageShip(world, s, b.damage, b.owner);
          hit = true; break;
        }
      }
      if (hit) b.life = 0;
    }
    world.bullets = world.bullets.filter(b => b.life > 0);
    world.debris = world.debris.filter(d => d.life > 0);

    /* asteroidi fra loro: rimbalzano */
    const rocks = world.asteroids;
    for (let i = 0; i < rocks.length; i++)
      for (let j = i + 1; j < rocks.length; j++) collideCircles(rocks[i], rocks[j], 0.9);

    /* navi contro asteroidi e navi: rimbalzo e danno da impatto */
    const live = world.ships.filter(s => s.alive);
    for (const s of live) {
      for (const a of rocks) {
        const vn = collideCircles(s, a, 0.6);
        if (vn > 0) damageShip(world, s, vn * a.mass * IMPACT_DMG, null);
        if (!s.alive) break;
      }
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (!a.alive || !b.alive) continue;
      const vn = collideCircles(a, b, 0.6);
      if (vn > 0) {
        damageShip(world, a, vn * b.mass * IMPACT_DMG, b.id);
        damageShip(world, b, vn * a.mass * IMPACT_DMG, a.id);
      }
    }

    /* regole di modalita' */
    if (world.mode === "solo") {
      const s = world.ships[0];
      if (!s.alive && s.lives <= 0 && s.respawnIn <= 0) { world.over = true; return; }
      if (rocks.length === 0) {
        world.waveTimer += DT;
        if (world.waveTimer >= WAVE_PAUSE_S) { world.waveTimer = 0; spawnWave(world, world.wave + 1); }
      }
    } else {
      for (const s of world.ships) if (s.kills >= DUEL_KILLS) { world.over = true; world.winner = s.id; return; }
      if (rocks.length < DUEL_MIN_ROCKS) {
        world.rockTimer += DT;
        if (world.rockTimer >= DUEL_ROCK_EVERY_S) { world.rockTimer = 0; spawnRocks(world, 1, 4, 8); }
      } else world.rockTimer = 0;
    }
  }

  return {
    W, H, DT, SHIPS, SHIP_KEYS, ROCK, DUEL_KILLS, SOLO_LIVES,
    Rng, wrap, torusDelta, torusDist,
    createShip, createAsteroid, splitAsteroid, createWorld, spawnWave, spawnRocks,
    fire, damageShip, respawn, collideCircles, step,
  };
});
