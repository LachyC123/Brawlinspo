const introScreen = document.getElementById('matchIntro');
const gameScreen = document.getElementById('gameScreen');
const cardsGrid = document.getElementById('cardsGrid');
const introCountdown = document.getElementById('introCountdown');
const brawlersLeftEl = document.getElementById('brawlersLeft');
const playerNameTag = document.getElementById('playerNameTag');
const endOverlay = document.getElementById('endOverlay');
const endTitle = document.getElementById('endTitle');
const endSubtitle = document.getElementById('endSubtitle');
const playAgainBtn = document.getElementById('playAgainBtn');
const killFeed = document.getElementById('killFeed');
const ammoCountEl = document.getElementById('ammoCount');
const powerCountEl = document.getElementById('powerCount');
const elimCountEl = document.getElementById('elimCount');
const endElimsEl = document.getElementById('endElims');
const endCratesEl = document.getElementById('endCrates');
const endDamageEl = document.getElementById('endDamage');
const damageLayer = document.getElementById('damageLayer');
const matchToast = document.getElementById('matchToast');
const readyFightBanner = document.getElementById('readyFightBanner');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');
const shootStickBase = document.getElementById('shootStickBase');
const shootStickKnob = document.getElementById('shootStickKnob');
const shootButton = document.getElementById('shootButton');
const superButton = document.getElementById('superButton');

const WORLD_W = 2200;
const WORLD_H = 1400;
const PLAYER_COUNT = 10;
const WALL = 96;

let lastTime = 0;
let introTimer = 5;
let gameStarted = false;
let entities = [];
let projectiles = [];
let particles = [];
let crates = [];
let walls = [];
let bushes = [];
let acidPools = [];
let safeZone = { x: WORLD_W / 2, y: WORLD_H / 2, radius: 1200, targetRadius: 1200, shrinkTimer: 12 };
let player;
let gameOver = false;
let damageTexts = [];
let cameraShake = 0;
let toastTimer = 0;
let decor = [];
let stars = [];
let matchStats = { elims: 0, crates: 0, damage: 0 };
let readyFightTimer = 0;
let ringEffects = [];
let fogBands = [];
let rankToastAt = PLAYER_COUNT;
let banners = [];

const characters = [
  { name: 'Boltwick', type: 'goggle', skin: '#ffd27d', cloth: '#9ca7ff', hat: '#ffd843', weapon: '#8a8d95' },
  { name: 'Aegis', type: 'warrior', skin: '#9de8f3', cloth: '#6be1ff', hat: '#a7f0ff', weapon: '#6c849b' },
  { name: 'Blip', type: 'blob', skin: '#8beaff', cloth: '#7d51ce', hat: '#a3d4ff', weapon: '#5a70ff' },
  { name: 'Rook', type: 'bird', skin: '#d63e2b', cloth: '#37465a', hat: '#da3b36', weapon: '#40556a' },
  { name: 'Luma', type: 'hero', skin: '#f5d39a', cloth: '#f55882', hair: '#ffd782', weapon: '#5b403c' },
  { name: 'Mira', type: 'hero', skin: '#d7d7e4', cloth: '#ee6aa8', hair: '#bb57ff', weapon: '#8c8fa1' },
  { name: 'Rook-X', type: 'bird', skin: '#d63e2b', cloth: '#37465a', hat: '#da3b36', weapon: '#40556a' },
  { name: 'Sol', type: 'skull', skin: '#f5d54d', cloth: '#2e2e2e', hair: '#f5d54d', weapon: '#7bea42' },
  { name: 'Nova', type: 'hero', skin: '#b98062', cloth: '#4970ff', hair: '#ad5eff', weapon: '#7e4bd4' },
  { name: 'Auric', type: 'warrior', skin: '#ffe0a7', cloth: '#f3ca2f', hair: '#fff1a8', weapon: '#9f62ff' }
];

const mapLayout = {
  walls: [
    [220, 250, 320, 220], [640, 130, 260, 130], [1020, 240, 280, 130], [1510, 170, 320, 180],
    [410, 580, 250, 250], [1080, 520, 160, 210], [1450, 540, 320, 120], [1820, 780, 220, 260],
    [260, 990, 220, 160], [740, 930, 320, 120], [1220, 960, 230, 170], [1560, 1120, 340, 110]
  ],
  bushes: [
    [350, 160, 95, 105], [680, 320, 110, 90], [1260, 400, 120, 90], [1770, 330, 110, 140],
    [300, 720, 120, 110], [740, 640, 100, 100], [1300, 710, 115, 105], [1860, 580, 130, 100],
    [500, 1180, 110, 90], [980, 1110, 135, 110], [1670, 980, 100, 105], [1960, 1080, 120, 100]
  ],
  pools: [[520, 140, 120, 70], [1700, 1020, 150, 90], [124, 1180, 110, 90]],
  crates: [[830, 520], [920, 920], [1380, 880], [1810, 470], [580, 1080], [310, 420], [1640, 250], [1180, 220]]
};

const state = {
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0, active: false },
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

function buildIntroCards() {
  cardsGrid.innerHTML = '';
  const handles = ['EBK Ghast', 'mammtt', 'ta6ko kasabow', 'bign!gg@', '<3danial----', 'Ronaldo246', '.+•η(｀ω´)η•.+', 'AJUS 5', 'Bobiuuy', 'YT:NINORASIERI'];
  const clubs = ['#solo', '#haters', '#rush', '#storm', '#snipe', '#skulls', '#night', '#music', '#clutch', '#rank1'];
  characters.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = `character-card ${i === 0 ? 'player' : 'enemy'}`;
    card.innerHTML = `
      <div class="portrait type-${c.type}" style="--skin:${c.skin};--cloth:${c.cloth};--hat:${c.hat || c.cloth};--weapon:${c.weapon};--hair:${c.hair || c.hat || c.skin};">
        <span class="hat"></span>
        <span class="hair"></span>
        <span class="head"></span>
        <span class="eye left"></span>
        <span class="eye right"></span>
        <span class="detail"></span>
        <span class="body"></span>
        <span class="arm left"></span>
        <span class="arm right"></span>
        <span class="weapon"></span>
      </div>
      <div class="card-footer">
        <span>${handles[i] || (i === 0 ? 'You' : c.name)}</span>
        <span class="badges"><span class="badge"></span><span class="badge alt"></span></span>
      </div>
    `;
    if (i !== 0) {
      const tag = document.createElement('div');
      tag.style.cssText = 'position:absolute;left:8px;bottom:42px;font-weight:900;font-size:12px;color:#ffe696;text-shadow:-2px 0 #130f25,0 2px #130f25,2px 0 #130f25,0 -2px #130f25;';
      tag.textContent = clubs[i] || '#solo';
      card.appendChild(tag);
    }
    cardsGrid.appendChild(card);
  });
}

function setupMap() {
  walls = mapLayout.walls.map(([x, y, w, h]) => ({ x, y, w, h }));
  bushes = mapLayout.bushes.map(([x, y, w, h]) => ({ x, y, w, h, sway: Math.random() * Math.PI * 2 }));
  acidPools = mapLayout.pools.map(([x, y, w, h]) => ({ x, y, w, h }));
  crates = mapLayout.crates.map(([x, y], i) => ({ id: i, x, y, r: 34, hp: 4200 }));
  decor = [
    { type:'stump', x:420, y:1040 }, { type:'stump', x:1360, y:330 }, { type:'stump', x:1730, y:910 },
    { type:'bones', x:840, y:280 }, { type:'bones', x:1140, y:1170 }, { type:'lantern', x:1950, y:260 },
    { type:'lantern', x:240, y:1210 }, { type:'flowers', x:620, y:820 }, { type:'flowers', x:1510, y:760 },
    { type:'banner', x:1000, y:134 }, { type:'banner', x:1650, y:640 }, { type:'banner', x:320, y:660 }
  ];
  fogBands = Array.from({length: 6}, (_, i) => ({ y: 120 + i * 180, speed: 10 + i * 6, alpha: 0.04 + i * 0.01 }));
  stars = Array.from({length: 40}, (_, i) => ({
    x: Math.random() * WORLD_W,
    y: Math.random() * WORLD_H,
    s: 1 + Math.random() * 2,
    a: Math.random() * Math.PI * 2
  }));
}

function spawnEntities() {
  entities = [];
  const spawnPoints = [
    [260, 1100], [280, 250], [650, 1180], [720, 210], [1120, 230], [1900, 220], [1890, 1120], [1450, 1170], [1100, 1060], [1860, 690]
  ];
  characters.forEach((ch, i) => {
    const [x, y] = spawnPoints[i];
    const ent = {
      id: i,
      ...ch,
      isPlayer: i === 0,
      x, y,
      vx: 0, vy: 0,
      angle: -0.25,
      hp: 5800 - i * 70,
      maxHp: 5800 - i * 70,
      ammo: 3,
      ammoTimer: 0,
      shootCd: rand(0.08, 0.2),
      speed: i === 0 ? 220 : rand(160, 205),
      radius: 28,
      alive: true,
      power: 0,
      colorA: i === 0 ? '#ffd642' : ['#ff7c6d', '#78f0ff', '#e05dff', '#ffd75d'][i % 4],
      colorB: ['#3752ff', '#42557a', '#7f4de0', '#d12728', '#e95d93'][i % 5],
      ai: {
        archetype: ['rusher', 'skirmisher', 'ranged'][i % 3],
        wander: rand(0, Math.PI * 2),
        retarget: 0,
        fireBurst: 0,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        dodgeTimer: rand(0.2, 0.8),
        preferredRange: i % 3 === 0 ? 150 : (i % 3 === 1 ? 250 : 360),
        bravery: rand(0.85, 1.15)
      }
    };
    if (ent.isPlayer) player = ent;
    entities.push(ent);
  });
}

function resetGame() {
  introTimer = 5;
  gameStarted = false;
  gameOver = false;
  projectiles = [];
  particles = [];
  damageTexts = [];
  cameraShake = 0;
  toastTimer = 0;
  matchStats = { elims: 0, crates: 0, damage: 0 };
  rankToastAt = PLAYER_COUNT;
  banners = [];
  killFeed.innerHTML = '';
  endOverlay.classList.add('hidden');
  safeZone = { x: WORLD_W / 2, y: WORLD_H / 2, radius: 1200, targetRadius: 1200, shrinkTimer: 12 };
  setupMap();
  spawnEntities();
  buildIntroCards();
  introScreen.classList.add('active');
  gameScreen.classList.remove('active');
  showToast('Drop in… survive everyone.');
}

function startGame() {
  introScreen.classList.remove('active');
  gameScreen.classList.add('active');
  gameStarted = true;
  readyFightTimer = 1.05;
  readyFightBanner.textContent = 'BRAWL!';
  readyFightBanner.classList.remove('hidden');
  readyFightBanner.classList.add('show');
  setTimeout(() => {
    readyFightBanner.classList.add('hidden');
    readyFightBanner.classList.remove('show');
  }, 1000);
}

function addKillFeed(text) {
  const div = document.createElement('div');
  div.className = 'killItem';
  div.textContent = text;
  killFeed.prepend(div);
  setTimeout(() => div.remove(), 2800);
}

function createProjectile(owner, angle, speed = 540, damage = 720) {
  projectiles.push({
    x: owner.x + Math.cos(angle) * 30,
    y: owner.y + Math.sin(angle) * 30,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    owner: owner.id,
    life: 1.1,
    r: 10,
    damage: damage + owner.power * 120,
    color: owner.isPlayer ? '#77d7ff' : '#ff8b76'
  });
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: owner.x + Math.cos(angle) * (12 + i * 8),
      y: owner.y + Math.sin(angle) * (12 + i * 8),
      vx: Math.cos(angle) * rand(40, 70),
      vy: Math.sin(angle) * rand(40, 70),
      life: rand(.08, .16),
      maxLife: .16,
      color: owner.isPlayer ? '#9ce9ff' : '#ffc0ad',
      size: rand(4, 8)
    });
  }
}

function burst(x, y, color, count = 9, force = 100) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(force * .4, force);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .65), maxLife: .65, color, size: rand(4, 10) });
  }
}


function screenFromWorld(x, y, camera) {
  return { x: x - camera.x, y: y - camera.y };
}
function showToast(text) {
  matchToast.textContent = text;
  matchToast.classList.remove('hidden');
  toastTimer = 2;
}
function addDamageFloat(worldX, worldY, value, kind = 'hit') {
  damageTexts.push({ x: worldX, y: worldY, value, kind, life: 0.7, maxLife: 0.7 });
}
function updateDamageTexts(dt) {
  damageTexts = damageTexts.filter(t => {
    t.life -= dt;
    t.y -= 24 * dt;
    return t.life > 0;
  });
}
function syncDamageTexts(camera) {
  damageLayer.innerHTML = '';
  for (const d of damageTexts) {
    const el = document.createElement('div');
    el.className = `damage-float ${d.kind === 'crate' ? 'crate' : ''}${d.kind === 'heal' ? ' heal' : ''}`;
    const pt = screenFromWorld(d.x, d.y, camera);
    el.style.left = `${(pt.x / canvas.width) * window.innerWidth}px`;
    el.style.top = `${(pt.y / canvas.height) * window.innerHeight}px`;
    el.textContent = d.kind === 'heal' ? `+${Math.round(d.value)}` : Math.round(d.value);
    damageLayer.appendChild(el);
  }
}


function addBanner(text, color = '#ffe669') {
  banners.push({ text, color, life: 1.5, maxLife: 1.5 });
}
function updateBanners(dt) {
  banners = banners.filter(b => (b.life -= dt) > 0);
}
function drawBanners() {
  if (!banners.length) return;
  const b = banners[0];
  ctx.save();
  ctx.globalAlpha = Math.min(1, b.life / b.maxLife + 0.1);
  ctx.fillStyle = 'rgba(17,12,31,0.72)';
  drawRoundedRect(canvas.width / 2 - 170, 26, 340, 58, 18, true);
  ctx.fillStyle = b.color;
  ctx.font = '900 28px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#130f25';
  ctx.lineWidth = 6;
  ctx.strokeText(b.text, canvas.width / 2, 63);
  ctx.fillText(b.text, canvas.width / 2, 63);
  ctx.restore();
}
function drawFog(camera) {
  const t = performance.now() * 0.001;
  for (const band of fogBands) {
    const y = band.y - camera.y * 0.06 + Math.sin(t + band.y * 0.02) * 10;
    ctx.fillStyle = `rgba(186, 180, 255, ${band.alpha})`;
    for (let x = -220; x < canvas.width + 220; x += 220) {
      ctx.beginPath();
      ctx.ellipse(x + ((t * band.speed) % 220), y, 130, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function collideCircleRect(ent, rect) {
  const nx = clamp(ent.x, rect.x, rect.x + rect.w);
  const ny = clamp(ent.y, rect.y, rect.y + rect.h);
  const dx = ent.x - nx;
  const dy = ent.y - ny;
  const d = Math.hypot(dx, dy);
  if (d < ent.radius) {
    const push = ent.radius - d + 0.1;
    const ang = Math.atan2(dy || 0.01, dx || 0.01);
    ent.x += Math.cos(ang) * push;
    ent.y += Math.sin(ang) * push;
  }
}

function entityCanSee(a, b) {
  for (const w of walls) {
    const steps = 10;
    for (let i = 1; i < steps; i++) {
      const x = lerp(a.x, b.x, i / steps);
      const y = lerp(a.y, b.y, i / steps);
      if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return false;
    }
  }
  return true;
}

function isInBush(x, y) {
  return bushes.some(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
}

function nearestEnemy(ent) {
  let best = null;
  let bestD = 99999;
  for (const other of entities) {
    if (!other.alive || other.id === ent.id) continue;
    const d = dist(ent.x, ent.y, other.x, other.y);
    if (d < bestD) { bestD = d; best = other; }
  }
  return { target: best, distance: bestD };
}

function moveEntity(ent, dx, dy, dt) {
  const len = Math.hypot(dx, dy) || 1;
  const speed = ent.speed * (ent.hp < ent.maxHp * .35 ? 1.05 : 1);
  ent.x += dx / len * speed * dt;
  ent.y += dy / len * speed * dt;
  ent.x = clamp(ent.x, ent.radius, WORLD_W - ent.radius);
  ent.y = clamp(ent.y, ent.radius, WORLD_H - ent.radius);
  for (const w of walls) collideCircleRect(ent, w);
}

function damageEntity(target, amount, sourceName = 'Storm', killerName = 'Storm') {
  if (!target.alive) return;
  target.hp -= amount;
  cameraShake = Math.min(16, cameraShake + 2.1);
  addDamageFloat(target.x, target.y - 40, amount, 'hit');
  if (killerName === 'You') matchStats.damage += amount;
  burst(target.x, target.y, '#ffd066', 6, 70);
  if (target.hp <= 0) {
    target.alive = false;
    burst(target.x, target.y, '#ff5d7c', 18, 180);
    addKillFeed(`${killerName} defeated ${target.isPlayer ? 'You' : target.name}`);
    if (killerName !== 'Storm') {
      const killer = entities.find(e => e.name === killerName || (killerName === 'You' && e.isPlayer));
      if (killer) killer.power += 1;
      if (killerName === 'You') {
        matchStats.elims += 1;
        showToast(`Elimination! Total ${matchStats.elims}`);
        addBanner('ENEMY DOWN', '#ffdb6e');
      }
    }
  }
}

function updateAI(ent, dt) {
  if (!ent.alive) return;
  ent.ai.retarget -= dt;
  ent.ai.dodgeTimer -= dt;
  const { target, distance } = nearestEnemy(ent);
  let dx = 0, dy = 0;
  if (target && ent.ai.retarget <= 0) {
    ent.ai.wander = angleTo(ent.x, ent.y, target.x, target.y) + rand(-0.6, 0.6);
    ent.ai.retarget = rand(.22, .55);
    if (Math.random() > 0.65) ent.ai.strafeDir *= -1;
  }
  if (target) {
    const toward = angleTo(ent.x, ent.y, target.x, target.y);
    const sight = entityCanSee(ent, target);
    const desired = ent.ai.preferredRange * ent.ai.bravery;
    ent.angle = toward;
    if (distance > desired + 70 || !sight) {
      dx = Math.cos(ent.ai.wander);
      dy = Math.sin(ent.ai.wander);
    } else if (distance < desired - 55) {
      dx = Math.cos(toward + Math.PI + ent.ai.strafeDir * 0.45);
      dy = Math.sin(toward + Math.PI + ent.ai.strafeDir * 0.45);
    } else {
      dx = Math.cos(toward + ent.ai.strafeDir * 1.15);
      dy = Math.sin(toward + ent.ai.strafeDir * 1.15);
    }
    if (ent.ai.dodgeTimer <= 0 && Math.random() > 0.55) {
      dx += Math.cos(toward + Math.PI / 2 * ent.ai.strafeDir) * 0.9;
      dy += Math.sin(toward + Math.PI / 2 * ent.ai.strafeDir) * 0.9;
      ent.ai.dodgeTimer = rand(0.25, 0.7);
    }
    if (ent.shootCd <= 0 && sight && distance < 450 && ent.ammo > 0) {
      const spread = ent.ai.archetype === 'ranged' ? 0.06 : (ent.ai.archetype === 'skirmisher' ? 0.1 : 0.15);
      createProjectile(ent, toward + rand(-spread, spread));
      ent.shootCd = ent.ai.archetype === 'rusher' ? rand(.35, .6) : rand(.42, .72);
      ent.ammo -= 1;
      burst(ent.x + Math.cos(toward) * 24, ent.y + Math.sin(toward) * 24, '#ffbf8b', 5, 90);
    }
  } else {
    dx = Math.cos(ent.ai.wander);
    dy = Math.sin(ent.ai.wander);
  }
  moveEntity(ent, dx, dy, dt);
}

function updatePlayer(dt) {
  if (!player.alive) return;
  if (state.move.x || state.move.y) {
    player.angle = Math.atan2(state.move.y, state.move.x);
    moveEntity(player, state.move.x, state.move.y, dt);
  }
  if (state.aim.active && player.shootCd <= 0 && player.ammo > 0) {
    const a = Math.atan2(state.aim.y, state.aim.x);
    player.angle = a;
    createProjectile(player, a, 630, 760);
    player.shootCd = 0.25;
    player.ammo -= 1;
    burst(player.x + Math.cos(a) * 28, player.y + Math.sin(a) * 28, '#9fe3ff', 6, 100);
  }
}

function updateGame(dt) {
  if (!gameStarted || gameOver) return;

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) matchToast.classList.add('hidden');
  }
  updateDamageTexts(dt);
  updateBanners(dt);
  cameraShake *= 0.88;
  ringEffects = ringEffects.filter(r => {
    r.life -= dt;
    r.r += 340 * dt;
    return r.life > 0;
  });

  safeZone.shrinkTimer -= dt;
  if (safeZone.shrinkTimer <= 0) {
    safeZone.targetRadius = Math.max(260, safeZone.targetRadius - 170);
    safeZone.shrinkTimer = 11;
  }
  safeZone.radius = lerp(safeZone.radius, safeZone.targetRadius, dt * .22);

  for (const ent of entities) {
    if (!ent.alive) continue;
    ent.shootCd -= dt;
    ent.ammoTimer += dt;
    if (ent.ammo < 3 && ent.ammoTimer > 1.35) {
      ent.ammo += 1;
      ent.ammoTimer = 0;
    }
    if (!ent.isPlayer) updateAI(ent, dt);

    const dStorm = dist(ent.x, ent.y, safeZone.x, safeZone.y);
    if (dStorm > safeZone.radius) damageEntity(ent, 18 * dt, 'Storm', 'Storm');
  }

  updatePlayer(dt);

  for (const crate of crates) {
    if (crate.hp <= 0) continue;
  }

  projectiles = projectiles.filter(p => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0 || p.x < 0 || p.y < 0 || p.x > WORLD_W || p.y > WORLD_H) return false;
    for (const w of walls) {
      if (p.x > w.x && p.x < w.x + w.w && p.y > w.y && p.y < w.y + w.h) {
        burst(p.x, p.y, '#c8d0ff', 4, 70);
        return false;
      }
    }
    for (const crate of crates) {
      if (crate.hp > 0 && dist(p.x, p.y, crate.x, crate.y) < crate.r + p.r) {
        crate.hp -= p.damage;
        burst(p.x, p.y, '#ffc96a', 6, 90);
        if (crate.hp <= 0) {
          burst(crate.x, crate.y, '#ffbf50', 20, 200);
          addDamageFloat(crate.x, crate.y - 36, 'CRATE!', 'crate');
          const owner = entities.find(e => e.id === p.owner);
          if (owner) owner.power += 1;
          if (owner?.isPlayer) {
            matchStats.crates += 1;
            showToast(`Power crate cracked!`);
          }
        }
        return false;
      }
    }
    for (const ent of entities) {
      if (!ent.alive || ent.id === p.owner) continue;
      if (dist(p.x, p.y, ent.x, ent.y) < ent.radius + p.r) {
        const owner = entities.find(e => e.id === p.owner);
        damageEntity(ent, p.damage, owner?.name || 'Unknown', owner?.isPlayer ? 'You' : (owner?.name || 'Unknown'));
        return false;
      }
    }
    return true;
  });

  particles = particles.filter(pt => {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    return pt.life > 0;
  });

  const alive = entities.filter(e => e.alive);
  brawlersLeftEl.textContent = `Brawlers left: ${alive.length}`;
  ammoCountEl.textContent = player.ammo;
  powerCountEl.textContent = player.power;
  elimCountEl.textContent = matchStats.elims;
  if (alive.length <= 5 && rankToastAt > 5) { addBanner('TOP 5', '#8de8ff'); rankToastAt = 5; }
  if (alive.length <= 3 && rankToastAt > 3) { addBanner('TOP 3', '#b7ff8d'); rankToastAt = 3; }
  if (alive.length <= 2 && rankToastAt > 2) { addBanner('FINAL DUEL', '#ff9ad0'); rankToastAt = 2; }

  if (!player.alive) {
    endTitle.textContent = 'Defeated';
    endSubtitle.textContent = `Rank ${alive.length + 1}`;
    endElimsEl.textContent = matchStats.elims;
    endCratesEl.textContent = matchStats.crates;
    endDamageEl.textContent = Math.round(matchStats.damage);
    endOverlay.classList.remove('hidden');
    gameOver = true;
  } else if (alive.length === 1 && player.alive) {
    endTitle.textContent = 'Victory!';
    endSubtitle.textContent = 'Rank 1';
    endElimsEl.textContent = matchStats.elims;
    endCratesEl.textContent = matchStats.crates;
    endDamageEl.textContent = Math.round(matchStats.damage);
    endOverlay.classList.remove('hidden');
    gameOver = true;
  }
}

function drawRoundedRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
}


function drawDecor(camera) {
  const t = performance.now() * 0.001;
  for (const s of stars) {
    const sx = (s.x - camera.x * 0.08) % canvas.width;
    const sy = (s.y - camera.y * 0.08) % canvas.height;
    ctx.globalAlpha = 0.2 + Math.sin(t + s.a) * 0.12;
    ctx.fillStyle = '#c8d6ff';
    ctx.beginPath();
    ctx.arc((sx + canvas.width) % canvas.width, (sy + canvas.height) % canvas.height, s.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const d of decor) {
    const x = d.x - camera.x, y = d.y - camera.y;
    if (d.type === 'stump') {
      ctx.fillStyle = '#5a2b22';
      drawRoundedRect(x - 14, y - 10, 28, 34, 10, true);
      ctx.fillStyle = '#87453a';
      drawRoundedRect(x - 10, y - 18, 20, 10, 8, true);
    } else if (d.type === 'bones') {
      ctx.strokeStyle = '#d7ccb8';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x - 16, y + 6); ctx.lineTo(x + 12, y - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 8, y - 12); ctx.lineTo(x + 18, y + 10); ctx.stroke();
    } else if (d.type === 'lantern') {
      ctx.fillStyle = '#573e2f';
      drawRoundedRect(x - 10, y - 18, 20, 30, 8, true);
      ctx.fillStyle = '#ffcf63';
      ctx.beginPath(); ctx.arc(x, y - 2, 8 + Math.sin(t * 5 + x) * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ffbd54';
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (d.type === 'flowers') {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#ff79c3' : '#75ffd7';
        ctx.beginPath();
        ctx.arc(x + i * 8 - 12, y + Math.sin(t * 2 + i) * 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.type === 'banner') {
      ctx.fillStyle = '#5e3cff';
      drawRoundedRect(x - 12, y - 26, 24, 60, 6, true);
      ctx.fillStyle = '#ff6b8b';
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 22);
      ctx.lineTo(x + 56, y - 10 + Math.sin(t * 4 + x * 0.02) * 6);
      ctx.lineTo(x + 12, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe87a';
      ctx.beginPath();
      ctx.arc(x + 22, y - 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMap(camera) {
  const offX = camera.x, offY = camera.y;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#382b4a');
  grad.addColorStop(1, '#2a2038');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = -((offX * 0.3) % 120); x < canvas.width + 120; x += 120) {
    for (let y = -((offY * 0.3) % 90); y < canvas.height + 90; y += 90) {
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 28, y + 6);
      ctx.stroke();
    }
  }

  acidPools.forEach(p => {
    const x = p.x - offX, y = p.y - offY;
    ctx.fillStyle = '#30ff78';
    drawRoundedRect(x, y, p.w, p.h, 20, true);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    drawRoundedRect(x + 8, y + 8, p.w - 16, p.h - 16, 16, true);
  });

  bushes.forEach((b, i) => {
    const x = b.x - offX, y = b.y - offY;
    const sway = Math.sin(performance.now() * 0.003 + i) * 2;
    ctx.fillStyle = '#0a7d87';
    drawRoundedRect(x, y, b.w, b.h, 18, true);
    for (let k = 0; k < 20; k++) {
      ctx.strokeStyle = k % 2 ? '#3ae0db' : '#179eb0';
      ctx.lineWidth = 4;
      const bx = x + 8 + (k * 13) % (b.w - 14);
      const by = y + b.h;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + sway, by - rand(18, b.h - 8));
      ctx.stroke();
    }
  });

  walls.forEach(w => {
    const x = w.x - offX, y = w.y - offY;
    ctx.fillStyle = '#7d86b2';
    drawRoundedRect(x, y, w.w, w.h, 18, true);
    ctx.fillStyle = '#9fa6d3';
    for (let gx = 0; gx < w.w; gx += WALL) {
      for (let gy = 0; gy < w.h; gy += WALL) {
        drawRoundedRect(x + gx + 6, y + gy + 6, Math.min(WALL - 10, w.w - gx - 8), Math.min(WALL - 10, w.h - gy - 8), 10, true);
      }
    }
    ctx.strokeStyle = 'rgba(55,44,84,0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w.w - 4, w.h - 4);
  });

  crates.forEach(c => {
    if (c.hp <= 0) return;
    const x = c.x - offX, y = c.y - offY;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#f18847';
    drawRoundedRect(-30, -30, 60, 60, 12, true);
    ctx.fillStyle = '#c76b35';
    drawRoundedRect(-22, -22, 44, 44, 8, true);
    ctx.fillStyle = '#8f4b26';
    drawRoundedRect(-8, -4, 16, 14, 4, true);
    ctx.strokeStyle = '#fff4';
    ctx.lineWidth = 3;
    ctx.strokeRect(-18, -18, 36, 36);
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#27192e';
    ctx.lineWidth = 6;
    ctx.strokeText(Math.ceil(c.hp), x, y - 42);
    ctx.fillText(Math.ceil(c.hp), x, y - 42);
  });
}

function drawEntity(ent, camera) {
  if (!ent.alive) return;
  const x = ent.x - camera.x;
  const y = ent.y - camera.y;
  const hidden = isInBush(ent.x, ent.y) && !ent.isPlayer && dist(ent.x, ent.y, player.x, player.y) > 180;
  if (hidden) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ent.angle + Math.sin(performance.now() * 0.008 + ent.id) * 0.04);
  ctx.fillStyle = ent.isPlayer ? 'rgba(108,255,99,.22)' : 'rgba(255,80,80,.18)';
  ctx.beginPath(); ctx.arc(0, 14, ent.radius + 12, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = ent.colorB;
  ctx.beginPath(); ctx.roundRect?.(-22, -6, 44, 40, 16); if (!ctx.roundRect) drawRoundedRect(-22, -6, 44, 40, 16, true); else ctx.fill();
  if (ctx.roundRect) ctx.fill();
  ctx.fillStyle = ent.colorA;
  ctx.beginPath(); ctx.arc(0, -18, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-6, -20, 4, 0, Math.PI * 2); ctx.arc(6, -20, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f1831';
  ctx.beginPath(); ctx.arc(-6, -20, 2, 0, Math.PI * 2); ctx.arc(6, -20, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ent.isPlayer ? '#8fd2ff' : '#5d657c';
  drawRoundedRect(10, -8, 24, 12, 5, true);
  ctx.restore();

  ctx.fillStyle = 'rgba(0,0,0,.34)';
  ctx.beginPath(); ctx.ellipse(x, y + 28, 24, 10, 0, 0, Math.PI * 2); ctx.fill();

  // health bar
  const barW = 72;
  ctx.fillStyle = '#351d25';
  drawRoundedRect(x - barW / 2, y - 62, barW, 10, 10, true);
  ctx.fillStyle = ent.isPlayer ? '#5eff6a' : '#ff6464';
  drawRoundedRect(x - barW / 2 + 2, y - 60, (barW - 4) * clamp(ent.hp / ent.maxHp, 0, 1), 6, 8, true);
  ctx.fillStyle = ent.isPlayer ? '#61ff7b' : '#fff';
  ctx.font = '900 17px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#171126'; ctx.lineWidth = 5;
  const name = ent.isPlayer ? 'You' : ent.name;
  ctx.strokeText(name, x, y - 70);
  ctx.fillText(name, x, y - 70);

  if (ent.power > 0) {
    ctx.fillStyle = '#71ff55';
    drawRoundedRect(x - 12, y - 42, 24, 20, 6, true);
    ctx.fillStyle = '#113108';
    ctx.font = '900 14px Arial';
    ctx.fillText(ent.power, x, y - 27);
  }
}

function drawProjectiles(camera) {
  for (const p of projectiles) {
    const x = p.x - camera.x, y = p.y - camera.y;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff7';
    ctx.beginPath(); ctx.arc(x - 3, y - 3, p.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles(camera) {
  for (const pt of particles) {
    const x = pt.x - camera.x, y = pt.y - camera.y;
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(x, y, pt.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}


function drawRingEffects(camera) {
  for (const r of ringEffects) {
    ctx.globalAlpha = r.life / r.maxLife;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 10 * (r.life / r.maxLife);
    ctx.beginPath();
    ctx.arc(r.x - camera.x, r.y - camera.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawStorm(camera) {
  ctx.save();
  ctx.fillStyle = 'rgba(171, 65, 255, 0.12)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(safeZone.x - camera.x, safeZone.y - camera.y, safeZone.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(211,130,255,.65)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(safeZone.x - camera.x, safeZone.y - camera.y, safeZone.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function render() {
  const cam = {
    x: clamp(player.x - WORLD_W * 0.25 + (Math.random() - 0.5) * cameraShake, 0, WORLD_W - canvas.width),
    y: clamp(player.y - WORLD_H * 0.25 + (Math.random() - 0.5) * cameraShake, 0, WORLD_H - canvas.height)
  };
  drawMap(cam);
  drawFog(cam);
  drawDecor(cam);
  drawProjectiles(cam);
  entities.forEach(ent => drawEntity(ent, cam));
  drawParticles(cam);
  drawRingEffects(cam);
  drawStorm(cam);
  drawBanners();

  playerNameTag.style.left = `${(player.x - cam.x) * (window.innerWidth / canvas.width)}px`;
  playerNameTag.style.top = `${(player.y - cam.y - 92) * (window.innerHeight / canvas.height)}px`;
  syncDamageTexts(cam);
}

function resizeCanvas() {
  const ratio = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  canvas.width = 1280;
  canvas.height = 720;
}

function animationFrame(t) {
  const dt = Math.min(0.033, (t - lastTime) / 1000 || 0.016);
  lastTime = t;

  if (!gameStarted) {
    introCountdown.textContent = Math.ceil(introTimer);
    introTimer -= dt;
    if (introTimer <= 0) startGame();
  } else {
    updateGame(dt);
    render();
  }
  requestAnimationFrame(animationFrame);
}

function setStick(knob, x, y) {
  knob.style.transform = `translate(${x}px, ${y}px)`;
}
setStick(joystickKnob, 0, 0);
setStick(shootStickKnob, 0, 0);

function bindStick(base, knob, handler, release) {
  let activeId = null;
  const max = 36;
  function process(clientX, clientY) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = dx / len * max;
      dy = dy / len * max;
    }
    setStick(knob, dx, dy);
    handler(dx / max, dy / max);
  }
  base.addEventListener('pointerdown', e => {
    activeId = e.pointerId;
    base.setPointerCapture(activeId);
    process(e.clientX, e.clientY);
  });
  base.addEventListener('pointermove', e => {
    if (e.pointerId !== activeId) return;
    process(e.clientX, e.clientY);
  });
  function end(e) {
    if (e.pointerId !== activeId) return;
    activeId = null;
    setStick(knob, 0, 0);
    release();
  }
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
}

bindStick(joystickBase, joystickKnob, (x, y) => {
  state.move.x = x;
  state.move.y = y;
}, () => { state.move.x = 0; state.move.y = 0; });

bindStick(shootStickBase, shootStickKnob, (x, y) => {
  state.aim.x = x;
  state.aim.y = y;
  state.aim.active = Math.hypot(x, y) > 0.35;
}, () => { state.aim.active = false; state.aim.x = 0; state.aim.y = 0; });

shootButton.addEventListener('pointerdown', () => {
  state.aim.active = true;
  state.aim.x = 1;
  state.aim.y = 0;
});
shootButton.addEventListener('pointerup', () => { state.aim.active = false; });

superButton.addEventListener('click', () => {
  if (!player || !player.alive) return;
  const a = player.angle;
  for (let i = -2; i <= 2; i++) createProjectile(player, a + i * 0.12, 700, 920);
  ringEffects.push({ x: player.x, y: player.y, r: 20, life: .45, maxLife: .45, color: '#85dbff' });
  burst(player.x, player.y, '#70c7ff', 26, 200);
  showToast('Super blast!');
});

playAgainBtn.addEventListener('click', resetGame);

window.addEventListener('resize', resizeCanvas);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

resizeCanvas();
resetGame();
requestAnimationFrame(animationFrame);
