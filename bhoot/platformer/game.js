'use strict';

// ─────────────────────────────────────────────────────────────────
//  DOM REFERENCES
// ─────────────────────────────────────────────────────────────────
const canvas          = document.getElementById('gameCanvas');
const ctx             = canvas.getContext('2d');
const titleScreen     = document.getElementById('titleScreen');
const powerSelectScreen = document.getElementById('powerSelectScreen');
const gameScreen      = document.getElementById('gameScreen');
const gameOverScreen  = document.getElementById('gameOverScreen');
const startBtn        = document.getElementById('startBtn');
const replayBtn       = document.getElementById('replayBtn');
const menuBtn         = document.getElementById('menuBtn');
const winnerText      = document.getElementById('winnerText');
const finalStats      = document.getElementById('finalStats');
const powerGrid       = document.getElementById('powerGrid');
const p1StatusEl      = document.getElementById('p1Status');
const p2StatusEl      = document.getElementById('p2Status');
const selectReadyMsg  = document.getElementById('selectReadyMsg');
const readyCountdown  = document.getElementById('readyCountdown');

// ─────────────────────────────────────────────────────────────────
//  PHYSICS & WORLD CONSTANTS
// ─────────────────────────────────────────────────────────────────
const GRAVITY          = 1.4;
const JUMP_FORCE       = -16;
const HIGH_JUMP_MULT   = 1.40;
const MOVE_ACCEL       = 1.4;
const MOVE_FRICTION    = 0.80;
const GROUND_FRICTION  = 0.74;
const MAX_VX           = 7;
const HEAVY_MAX_VX     = 4.5;
const FEATHER_GRAVITY  = 0.38;
const MAX_VY           = 24;
const PUSH_BASE_FORCE  = 11;
const PUSH_RANGE       = 100;
const PLAYER_W         = 36;
const PLAYER_H         = 44;

const CANVAS_W         = 1200;
const CANVAS_H         = 650;
const WORLD_W          = 3000;
const WORLD_H          = 1200;
const VOID_Y           = 1100;

const CAM_LERP         = 0.09;

// ─────────────────────────────────────────────────────────────────
//  POWER-UP POOL (15 total)
// ─────────────────────────────────────────────────────────────────
const ALL_POWERUPS = [
  { id: 'doubleJump',  name: 'Double Jump',  desc: 'Jump again while in the air',        type: 'passive' },
  { id: 'highJump',    name: 'High Jump',     desc: '40% higher jumps',                  type: 'passive' },
  { id: 'superPush',   name: 'Super Push',    desc: 'Push force 2.5×',                  type: 'passive' },
  { id: 'heavy',       name: 'Heavy',         desc: 'Harder to push, slightly slower',   type: 'passive' },
  { id: 'featherFall', name: 'Feather Fall',  desc: 'Fall much slower',                  type: 'passive' },
  { id: 'shield',      name: 'Shield',        desc: '2 s push immunity',                 type: 'active', cooldown: 12000 },
  { id: 'speedBoost',  name: 'Speed Boost',   desc: '3 s movement speed burst',          type: 'active', cooldown: 10000 },
  { id: 'groundSlam',  name: 'Ground Slam',   desc: 'Slam down, push nearby opponent',   type: 'active', cooldown:  8000 },
  { id: 'dash',        name: 'Dash',          desc: 'Quick horizontal burst',            type: 'active', cooldown:  5000 },
  { id: 'teleport',    name: 'Teleport',      desc: 'Blink 200 px in facing direction',  type: 'active', cooldown: 15000 },
  { id: 'grapple',     name: 'Grapple Hook',  desc: 'Pull yourself to nearest platform', type: 'active', cooldown: 10000 },
  { id: 'windBlast',   name: 'Wind Blast',    desc: 'Ranged push (500 px)',              type: 'active', cooldown:  8000 },
  { id: 'magnet',      name: 'Magnet',        desc: 'Pull opponent toward you',          type: 'active', cooldown: 12000 },
  { id: 'fakeFloor',   name: 'Fake Floor',    desc: 'Drops a 5 s temp platform',         type: 'active', cooldown: 20000 },
  { id: 'echoStrike',  name: 'Echo Strike',   desc: 'Push wave bounces off walls (×3)',  type: 'active', cooldown: 10000 },
];

// ─────────────────────────────────────────────────────────────────
//  PLATFORM MAP  (h:20, one-way from above)
// ─────────────────────────────────────────────────────────────────
const PLATFORMS = [
  // LEFT ZONE — P1 spawn
  { x:   60, y: 900, w: 300, h: 20 },  // [0]  P1 spawn
  { x:  300, y: 760, w: 180, h: 20 },  // [1]
  { x:   80, y: 640, w: 140, h: 20 },  // [2]
  { x:  430, y: 680, w: 200, h: 20 },  // [3]
  { x:  250, y: 520, w: 160, h: 20 },  // [4]
  { x:  600, y: 580, w: 220, h: 20 },  // [5]
  { x:  700, y: 440, w: 120, h: 20 },  // [6]
  { x:  820, y: 350, w: 180, h: 20 },  // [7]
  // CENTER ZONE
  { x:  960, y: 900, w: 280, h: 20 },  // [8]
  { x: 1100, y: 750, w: 200, h: 20 },  // [9]
  { x: 1280, y: 620, w: 160, h: 20 },  // [10]
  { x: 1450, y: 500, w: 300, h: 20 },  // [11]
  { x: 1350, y: 360, w: 140, h: 20 },  // [12]
  { x: 1620, y: 420, w: 120, h: 20 },  // [13]
  { x: 1750, y: 580, w: 200, h: 20 },  // [14]
  { x: 1900, y: 720, w: 180, h: 20 },  // [15]
  { x: 1700, y: 820, w: 250, h: 20 },  // [16]
  // TRANSITION
  { x: 2050, y: 560, w: 160, h: 20 },  // [17]
  { x: 2200, y: 420, w: 200, h: 20 },  // [18]
  { x: 2350, y: 640, w: 140, h: 20 },  // [19]
  // RIGHT ZONE — P2 spawn
  { x: 2400, y: 780, w: 180, h: 20 },  // [20]
  { x: 2560, y: 650, w: 160, h: 20 },  // [21]
  { x: 2640, y: 900, w: 300, h: 20 },  // [22]  P2 spawn
  { x: 2750, y: 500, w: 200, h: 20 },  // [23]
  { x: 2850, y: 340, w: 140, h: 20 },  // [24]
];

// Temporary fake-floor platforms
let temporaryPlatforms = [];

// Echo-strike projectiles
let echoWaves = [];

// Pre-generated starfield
const STARS = (function () {
  const arr = [];
  const rng = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    arr.push({ x: rng() * WORLD_W, y: rng() * WORLD_H * 0.8, r: rng() * 1.5 + 0.3, a: rng() * 0.6 + 0.2 });
  }
  return arr;
}());

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────────────────
let gameState = 'TITLE'; // TITLE | POWER_SELECT | GAMEPLAY | GAME_OVER

// Power selection
let drawnPowerups    = [];
let p1SelectCursor   = 0;
let p2SelectCursor   = 0;
let p1SelectedIds    = [];
let p2SelectedIds    = [];
let p1Confirmed      = false;
let p2Confirmed      = false;
let selectRafId      = null;
let readyTimer       = null;
let readyCount       = 3;

// Players
let player1 = null;
let player2 = null;

// Camera
let camX        = 0;
let camY        = 0;
let camTargetX  = 0;
let camTargetY  = 0;

// Game loop
let rafId         = null;
let lastTimestamp = 0;

// ─────────────────────────────────────────────────────────────────
//  INPUT SYSTEM
// ─────────────────────────────────────────────────────────────────
const keys            = {};
const keysJustPressed = {};

function initInput() {
  window.addEventListener('keydown', e => {
    if (!keys[e.code]) keysJustPressed[e.code] = true;
    keys[e.code] = true;
    // Prevent page scroll on arrow keys
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
}

function clearJustPressed() {
  for (const k in keysJustPressed) delete keysJustPressed[k];
}

// Player 1 input helpers
function p1Left()  { return !!keys['ArrowLeft']; }
function p1Right() { return !!keys['ArrowRight']; }
function p1Jump()  { return !!keysJustPressed['ArrowUp']; }
function p1Down()  { return !!keys['ArrowDown']; }
function p1Ability(slot) {
  return !!keysJustPressed[['KeyZ','KeyX','KeyC'][slot]];
}
function p1SelectMove() {
  if (keysJustPressed['ArrowLeft'])  return -1;
  if (keysJustPressed['ArrowRight']) return  1;
  return 0;
}
function p1SelectMoveRow() {
  if (keysJustPressed['ArrowUp'])   return -5;
  if (keysJustPressed['ArrowDown']) return  5;
  return 0;
}
function p1SelectConfirm() { return !!keysJustPressed['KeyZ']; }

// Player 2 input helpers
function p2Left()  { return !!keys['KeyA']; }
function p2Right() { return !!keys['KeyD']; }
function p2Jump()  { return !!keysJustPressed['KeyW']; }
function p2Down()  { return !!keys['KeyS']; }
function p2Ability(slot) {
  return !!keysJustPressed[['KeyJ','KeyK','KeyL'][slot]];
}
function p2SelectMove() {
  if (keysJustPressed['KeyA']) return -1;
  if (keysJustPressed['KeyD']) return  1;
  return 0;
}
function p2SelectMoveRow() {
  if (keysJustPressed['KeyW']) return -5;
  if (keysJustPressed['KeyS']) return  5;
  return 0;
}
function p2SelectConfirm() { return !!keysJustPressed['KeyM']; }

// ─────────────────────────────────────────────────────────────────
//  PLAYER FACTORY
// ─────────────────────────────────────────────────────────────────
function createPlayer(num, spawnIdx, selectedIds) {
  const sp = PLATFORMS[spawnIdx];
  const passives = selectedIds.filter(id => {
    const pu = ALL_POWERUPS.find(p => p.id === id);
    return pu && pu.type === 'passive';
  });
  const actives = selectedIds.filter(id => {
    const pu = ALL_POWERUPS.find(p => p.id === id);
    return pu && pu.type === 'active';
  });
  return {
    num,
    color: num === 1 ? '#3b82f6' : '#f97316',
    x: sp.x + sp.w / 2 - PLAYER_W / 2,
    y: sp.y - PLAYER_H,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    prevY: 0,
    onGround: false,
    facingRight: num === 1,
    airJumpsLeft: 0,
    lives: 3,
    isDead: false,
    respawnTimer: 0,
    spawnIdx,
    passives,
    actives,
    cooldowns: {},
    shieldActive: false,
    shieldExpiry: 0,
    speedBoostActive: false,
    speedBoostExpiry: 0,
    groundSlamming: false,
    grappling: false,
    grappleTarget: null,
    grappleVisible: false,
    pushFlashTimer: 0,
    spawnImmunityExpiry: 0,
  };
}

// ─────────────────────────────────────────────────────────────────
//  PHYSICS
// ─────────────────────────────────────────────────────────────────
function applyGravity(player) {
  const g = player.passives.includes('featherFall') ? FEATHER_GRAVITY : GRAVITY;
  player.vy += g;
  if (player.vy > MAX_VY) player.vy = MAX_VY;
}

function applyHorizontalMovement(player, left, right) {
  let spd = player.passives.includes('heavy') ? HEAVY_MAX_VX : MAX_VX;
  if (player.speedBoostActive) spd *= 1.7;

  if (left)  { player.vx -= MOVE_ACCEL; if (player.vx < -spd) player.vx = -spd; player.facingRight = false; }
  if (right) { player.vx += MOVE_ACCEL; if (player.vx >  spd) player.vx =  spd; player.facingRight = true; }

  const friction = player.onGround ? GROUND_FRICTION : MOVE_FRICTION;
  if (!left && !right) player.vx *= friction;
  // dampen overspeed (e.g. after dash/push)
  if (player.vx >  spd * 2.5) player.vx *= 0.92;
  if (player.vx < -spd * 2.5) player.vx *= 0.92;
}

function attemptJump(player) {
  let force = JUMP_FORCE;
  if (player.passives.includes('highJump')) force *= HIGH_JUMP_MULT;
  if (player.onGround) {
    player.vy = force;
    player.onGround = false;
    player.airJumpsLeft = player.passives.includes('doubleJump') ? 1 : 0;
  } else if (player.airJumpsLeft > 0) {
    player.vy = force;
    player.airJumpsLeft--;
  }
}

function getAllPlatforms() {
  return PLATFORMS.concat(temporaryPlatforms);
}

function resolveVertical(player) {
  const prevBottom = player.prevY + player.h;
  player.onGround = false;
  const all = getAllPlatforms();
  for (const plat of all) {
    // AABB overlap check
    if (player.x + player.w <= plat.x || player.x >= plat.x + plat.w) continue;
    if (player.y + player.h < plat.y || player.y > plat.y + plat.h) continue;
    // One-way: only land if falling and was above last frame
    if (player.vy >= 0 && prevBottom <= plat.y + 2) {
      player.y = plat.y - player.h;
      player.vy = 0;
      player.onGround = true;
      if (player.passives.includes('doubleJump')) player.airJumpsLeft = 1;
      else player.airJumpsLeft = 0;
      // ground slam landing
      if (player.groundSlamming) {
        player.groundSlamming = false;
        const opp = player.num === 1 ? player2 : player1;
        if (opp && !opp.isDead) slamHit(player, opp);
      }
    }
  }
}

function resolveHorizontal(player) {
  const all = getAllPlatforms();
  for (const plat of all) {
    if (player.y + player.h <= plat.y || player.y >= plat.y + plat.h) continue;
    if (player.x + player.w <= plat.x || player.x >= plat.x + plat.w) continue;
    // horizontal clipping: push out from nearest side
    const overlapL = (player.x + player.w) - plat.x;
    const overlapR = (plat.x + plat.w) - player.x;
    if (overlapL < overlapR) { player.x = plat.x - player.w; player.vx = 0; }
    else                     { player.x = plat.x + plat.w;   player.vx = 0; }
  }
}

function moveAndCollide(player) {
  player.prevY = player.y;

  // Horizontal
  player.x += player.vx;
  player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));
  resolveHorizontal(player);

  // Vertical
  player.y += player.vy;
  resolveVertical(player);
}

function checkVoid(player) {
  if (player.y > VOID_Y) killPlayer(player);
}

// ─────────────────────────────────────────────────────────────────
//  PUSH SYSTEM
// ─────────────────────────────────────────────────────────────────
function tryPush(pusher, target, ts, forceMult) {
  if (target.isDead) return;
  if (Date.now() < target.spawnImmunityExpiry) return;
  if (target.shieldActive && ts < target.shieldExpiry) return;

  const px = pusher.x + pusher.w / 2;
  const tx = target.x + target.w  / 2;
  const py = pusher.y + pusher.h / 2;
  const ty = target.y + target.h  / 2;
  const dist = Math.hypot(px - tx, py - ty);
  if (dist > PUSH_RANGE && !forceMult) return;

  const dir = tx > px ? 1 : -1;
  let force = PUSH_BASE_FORCE * (forceMult || 1);
  if (pusher.passives.includes('superPush')) force *= 2.5;
  if (target.passives.includes('heavy'))     force *= 0.60;

  target.vx += dir * force;
  target.vy  = Math.min(target.vy - 3, -3);
  target.pushFlashTimer = 250;
}

function updatePushInput(ts) {
  if (p1Down() && player1 && !player1.isDead) tryPush(player1, player2, ts);
  if (p2Down() && player2 && !player2.isDead) tryPush(player2, player1, ts);
}

// ─────────────────────────────────────────────────────────────────
//  ABILITY SYSTEM
// ─────────────────────────────────────────────────────────────────
function getCooldown(abilityId) {
  const pu = ALL_POWERUPS.find(p => p.id === abilityId);
  return pu ? (pu.cooldown || 0) : 0;
}

function activateAbility(player, opponent, slot, ts) {
  const id = player.actives[slot];
  if (!id) return;
  const now = Date.now();
  if ((player.cooldowns[id] || 0) > now) return;
  player.cooldowns[id] = now + getCooldown(id);

  switch (id) {
    case 'shield':     doShield(player, now);     break;
    case 'speedBoost': doSpeedBoost(player, now); break;
    case 'groundSlam': doGroundSlam(player);      break;
    case 'dash':       doDash(player);            break;
    case 'teleport':   doTeleport(player);        break;
    case 'grapple':    doGrapple(player);         break;
    case 'windBlast':  doWindBlast(player, opponent, now); break;
    case 'magnet':     doMagnet(player, opponent); break;
    case 'fakeFloor':  doFakeFloor(player, now);  break;
    case 'echoStrike': doEchoStrike(player);      break;
  }
}

function doShield(player, now) {
  player.shieldActive = true;
  player.shieldExpiry = now + 2000;
}

function doSpeedBoost(player, now) {
  player.speedBoostActive = true;
  player.speedBoostExpiry = now + 3000;
}

function doGroundSlam(player) {
  if (player.onGround) return; // must be airborne
  player.groundSlamming = true;
  player.vy = MAX_VY;
}

function slamHit(slammer, opp) {
  const cx = slammer.x + slammer.w / 2;
  const ox = opp.x + opp.w / 2;
  if (Math.abs(cx - ox) < 160) {
    tryPush(slammer, opp, Date.now(), 1.5);
  }
}

function doDash(player) {
  const dir = player.facingRight ? 1 : -1;
  player.vx = dir * 20;
}

function doTeleport(player) {
  const dir = player.facingRight ? 1 : -1;
  player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x + dir * 200));
  // re-resolve to avoid clipping
  resolveHorizontal(player);
  resolveVertical(player);
}

function doGrapple(player) {
  // Find nearest platform whose top is above the player's center
  const cy = player.y + player.h / 2;
  const cx = player.x + player.w / 2;
  let best = null, bestDist = Infinity;
  for (const p of PLATFORMS) {
    if (p.y + p.h >= cy) continue; // platform must be above
    const px = p.x + p.w / 2;
    const d  = Math.hypot(cx - px, cy - p.y);
    if (d < bestDist && d < 500) { bestDist = d; best = p; }
  }
  if (!best) return;
  player.grappling      = true;
  player.grappleTarget  = { x: best.x + best.w / 2, y: best.y };
  player.grappleVisible = true;
  player.vx = 0;
  player.vy = 0;
}

function updateGrapple(player) {
  if (!player.grappling) return;
  const tx = player.grappleTarget.x;
  const ty = player.grappleTarget.y;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const dist = Math.hypot(cx - tx, cy - ty);
  if (dist < 8) {
    player.x = tx - player.w / 2;
    player.y = ty - player.h;
    player.grappling = false;
    player.grappleVisible = false;
    player.onGround = true;
    player.vy = 0;
    return;
  }
  const speed = 14;
  player.x += ((tx - cx) / dist) * speed;
  player.y += ((ty - cy) / dist) * speed;
}

function doWindBlast(player, opponent, now) {
  if (!opponent || opponent.isDead) return;
  // Ignores PUSH_RANGE — ranged ability
  tryPush(player, opponent, now, 0.85); // slightly weaker, no range check
  // Override range restriction by passing a truthy forceMult
}

function doMagnet(player, opponent) {
  if (!opponent || opponent.isDead) return;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const ox = opponent.x + opponent.w / 2;
  const oy = opponent.y + opponent.h / 2;
  const dist = Math.hypot(cx - ox, cy - oy);
  if (dist < 1) return;
  opponent.vx += ((cx - ox) / dist) * 14;
  opponent.vy += ((cy - oy) / dist) * 7;
}

function doFakeFloor(player, now) {
  temporaryPlatforms.push({
    x: player.x - 60,
    y: player.y + player.h + 6,
    w: 180,
    h: 20,
    expiresAt: now + 5000,
    isFake: true,
  });
}

function doEchoStrike(player) {
  echoWaves.push({
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    vx: player.facingRight ? 12 : -12,
    vy: 0,
    owner: player.num,
    bounces: 3,
  });
}

function updateAbilityEffects(player, now) {
  if (player.shieldActive && now > player.shieldExpiry)       player.shieldActive = false;
  if (player.speedBoostActive && now > player.speedBoostExpiry) player.speedBoostActive = false;
  if (player.grappling) updateGrapple(player);
}

function updateAbilityInput(player, opponent, ts) {
  for (let s = 0; s < 3; s++) {
    const fn = player.num === 1 ? p1Ability : p2Ability;
    if (fn(s)) activateAbility(player, opponent, s, ts);
  }
}

function updateEchoWaves(now) {
  echoWaves = echoWaves.filter(w => {
    w.x += w.vx;
    w.y += w.vy;
    // Bounce off world horizontal bounds
    if (w.x < 0)       { w.x = 0;       w.vx = Math.abs(w.vx); w.bounces--; }
    if (w.x > WORLD_W) { w.x = WORLD_W; w.vx = -Math.abs(w.vx); w.bounces--; }

    if (w.bounces < 0) return false;

    // Hit opponent
    const opp = w.owner === 1 ? player2 : player1;
    if (opp && !opp.isDead) {
      const dist = Math.hypot(w.x - (opp.x + opp.w/2), w.y - (opp.y + opp.h/2));
      if (dist < 50) {
        tryPush(w.owner === 1 ? player1 : player2, opp, now, 0.9);
        return false;
      }
    }
    return true;
  });
}

function updateTemporaryPlatforms(now) {
  temporaryPlatforms = temporaryPlatforms.filter(p => p.expiresAt > now);
}

// ─────────────────────────────────────────────────────────────────
//  LIFE & RESPAWN SYSTEM
// ─────────────────────────────────────────────────────────────────
function killPlayer(player) {
  if (player.isDead) return;
  player.lives--;
  player.isDead      = true;
  player.respawnTimer = 2200;
  player.vx = 0; player.vy = 0;
  player.x  = -9999; player.y = -9999;
  player.grappling   = false;
  player.groundSlamming = false;
  if (player.lives <= 0) {
    checkWinCondition();
  }
}

function updateRespawn(player, dt) {
  if (!player.isDead || player.lives <= 0) return;
  player.respawnTimer -= dt;
  if (player.respawnTimer <= 0) respawnPlayer(player);
}

function respawnPlayer(player) {
  const sp = PLATFORMS[player.spawnIdx];
  player.x  = sp.x + sp.w / 2 - PLAYER_W / 2;
  player.y  = sp.y - PLAYER_H;
  player.vx = 0; player.vy = 0;
  player.isDead  = false;
  player.onGround = false;
  player.airJumpsLeft = 0;
  // spawn immunity
  player.shieldActive  = true;
  player.shieldExpiry  = Date.now() + 1800;
  player.spawnImmunityExpiry = Date.now() + 1800;
}

function checkWinCondition() {
  if (gameState !== 'GAMEPLAY') return;
  if (player1.lives <= 0) { transitionTo('GAME_OVER', 2); return; }
  if (player2.lives <= 0) { transitionTo('GAME_OVER', 1); }
}

// ─────────────────────────────────────────────────────────────────
//  CAMERA
// ─────────────────────────────────────────────────────────────────
function updateCamera() {
  let mx, my;
  const p1alive = !player1.isDead;
  const p2alive = !player2.isDead;

  if (p1alive && p2alive) {
    mx = (player1.x + player2.x) / 2;
    my = (player1.y + player2.y) / 2;
  } else if (p1alive) {
    mx = player1.x; my = player1.y;
  } else {
    mx = player2.x; my = player2.y;
  }

  camTargetX = mx - CANVAS_W / 2;
  camTargetY = my - CANVAS_H / 2;
  camTargetX = Math.max(0, Math.min(WORLD_W - CANVAS_W, camTargetX));
  camTargetY = Math.max(0, Math.min(WORLD_H - CANVAS_H, camTargetY));

  camX += (camTargetX - camX) * CAM_LERP;
  camY += (camTargetY - camY) * CAM_LERP;
}

// ─────────────────────────────────────────────────────────────────
//  RENDERING
// ─────────────────────────────────────────────────────────────────
function clearCanvas() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#050510');
  grad.addColorStop(1, '#100520');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Parallax stars
  for (const s of STARS) {
    const sx = ((s.x - camX * 0.15) % CANVAS_W + CANVAS_W) % CANVAS_W;
    const sy = ((s.y - camY * 0.1)  % CANVAS_H + CANVAS_H) % CANVAS_H;
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Void indicator — red fog at bottom
  const voidScreenY = VOID_Y - camY;
  if (voidScreenY < CANVAS_H) {
    const vg = ctx.createLinearGradient(0, Math.max(0, voidScreenY - 80), 0, CANVAS_H);
    vg.addColorStop(0, 'rgba(180,20,20,0)');
    vg.addColorStop(1, 'rgba(180,20,20,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, Math.max(0, voidScreenY - 80), CANVAS_W, CANVAS_H);
  }
}

function drawPlatforms() {
  ctx.save();
  ctx.translate(-camX, -camY);

  for (const plat of PLATFORMS) {
    ctx.fillStyle = '#2d3a4a';
    roundRect(ctx, plat.x, plat.y, plat.w, plat.h, 4);
    ctx.fill();
    ctx.fillStyle = '#4a6a7a';
    ctx.fillRect(plat.x + 4, plat.y, plat.w - 8, 3);
  }

  const now = Date.now();
  for (const plat of temporaryPlatforms) {
    const remaining = plat.expiresAt - now;
    const flash = remaining < 1500 && Math.floor(remaining / 200) % 2 === 0;
    if (!flash) {
      ctx.fillStyle = '#2a4a2a';
      roundRect(ctx, plat.x, plat.y, plat.w, plat.h, 4);
      ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      roundRect(ctx, plat.x, plat.y, plat.w, plat.h, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPlayer(player) {
  if (player.isDead) return;

  const sx = player.x - camX;
  const sy = player.y - camY;
  const now = Date.now();

  // Spawn immunity blink
  const immune = now < player.spawnImmunityExpiry;
  if (immune && Math.floor(now / 120) % 2 === 0) return;

  // Push flash overlay
  const flashing = player.pushFlashTimer > 0;

  // Grapple line
  if (player.grappling && player.grappleTarget) {
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(sx + player.w / 2, sy + player.h / 2);
    ctx.lineTo(player.grappleTarget.x - camX, player.grappleTarget.y - camY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Body
  ctx.save();
  roundRect(ctx, sx, sy, player.w, player.h, 8);
  ctx.fillStyle = flashing ? '#ef4444' : player.color;
  ctx.fill();

  // Darker bottom half for depth
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, sx, sy + player.h * 0.5, player.w, player.h * 0.5, 8);
  ctx.fill();

  // Eyes
  const eyeY = sy + 12;
  const eyeOffsetX = player.facingRight ? 8 : 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(sx + eyeOffsetX, eyeY, 5, 0, Math.PI * 2);
  ctx.arc(sx + eyeOffsetX + 12, eyeY, 5, 0, Math.PI * 2);
  ctx.fill();
  // Pupils
  const pupilDir = player.facingRight ? 2 : -1;
  ctx.fillStyle = '#1e1e2e';
  ctx.beginPath();
  ctx.arc(sx + eyeOffsetX + pupilDir, eyeY + 1, 2.5, 0, Math.PI * 2);
  ctx.arc(sx + eyeOffsetX + 12 + pupilDir, eyeY + 1, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Player label above head
  ctx.font = 'bold 12px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = player.color;
  ctx.fillText('P' + player.num, sx + player.w / 2, sy - 6);

  ctx.restore();

  // Shield bubble
  if (player.shieldActive) {
    const pulse = 0.7 + 0.3 * Math.sin(now / 150);
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx + player.w / 2, sy + player.h / 2, player.w * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1 * pulse;
    ctx.fillStyle = '#67e8f9';
    ctx.fill();
    ctx.restore();
  }

  // Speed boost trail glow
  if (player.speedBoostActive) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fbbf24';
    roundRect(ctx, sx - 4, sy + 4, player.w + 8, player.h - 4, 8);
    ctx.fill();
    ctx.restore();
  }

  // Ground slam indicator
  if (player.groundSlamming) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(sx + player.w / 2, sy + player.h + 8);
    ctx.lineTo(sx + player.w / 2 - 10, sy + player.h + 28);
    ctx.lineTo(sx + player.w / 2 + 10, sy + player.h + 28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawHUD() {
  const now = Date.now();
  // P1 HUD — top left
  drawLives(player1, 16, 16);
  drawAbilityCooldowns(player1, 16, 52, false);

  // P2 HUD — top right
  drawLives(player2, CANVAS_W - 16, 16, true);
  drawAbilityCooldowns(player2, CANVAS_W - 16, 52, true);

  // Respawn timers
  if (player1.isDead && player1.lives > 0) {
    drawRespawnMsg(player1, now);
  }
  if (player2.isDead && player2.lives > 0) {
    drawRespawnMsg(player2, now);
  }
}

function drawLives(player, x, y, rightAlign) {
  ctx.font = 'bold 20px Segoe UI, Arial';
  ctx.textAlign = rightAlign ? 'right' : 'left';
  ctx.fillStyle = player.color;
  const hearts = '♥'.repeat(Math.max(0, player.lives)) + '♡'.repeat(Math.max(0, 3 - player.lives));
  ctx.fillText(hearts, x, y + 18);
}

function drawAbilityCooldowns(player, x, y, rightAlign) {
  const now = Date.now();
  const barW = 64, barH = 8, gap = 6;
  const total = barW * 3 + gap * 2;
  const startX = rightAlign ? x - total : x;

  for (let i = 0; i < player.actives.length; i++) {
    const id  = player.actives[i];
    const pu  = ALL_POWERUPS.find(p => p.id === id);
    if (!pu) continue;

    const bx     = startX + i * (barW + gap);
    const ready  = player.cooldowns[id] || 0;
    const ratio  = Math.min(1, Math.max(0, 1 - (ready - now) / pu.cooldown));

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, bx, y, barW, barH, 3);
    ctx.fill();

    // Fill
    ctx.fillStyle = ratio >= 1 ? player.color : '#64748b';
    roundRect(ctx, bx, y, barW * ratio, barH, 3);
    ctx.fill();

    // Label
    ctx.font = '10px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = ratio >= 1 ? '#fff' : '#94a3b8';
    const keyLabel = player.num === 1 ? ['Z','X','C'][i] : ['J','K','L'][i];
    ctx.fillText(keyLabel + ': ' + pu.name, bx + barW / 2, y + barH + 13);
  }
}

function drawRespawnMsg(player, now) {
  const secs = Math.ceil(player.respawnTimer / 1000);
  ctx.font = 'bold 18px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = player.color;
  const cy = player.num === 1 ? CANVAS_H / 2 - 20 : CANVAS_H / 2 + 20;
  ctx.fillText('P' + player.num + ' respawning in ' + secs + '...', CANVAS_W / 2, cy);
}

function drawEchoWaves() {
  for (const w of echoWaves) {
    const sx = w.x - camX;
    const sy = w.y - camY;
    if (sx < -60 || sx > CANVAS_W + 60) continue;
    ctx.save();
    ctx.globalAlpha = 0.7;
    const c = w.owner === 1 ? '#3b82f6' : '#f97316';
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 28, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
  }
}

function renderFrame(ts) {
  clearCanvas();
  drawBackground();
  drawPlatforms();
  drawEchoWaves();
  drawPlayer(player1);
  drawPlayer(player2);
  drawHUD();
}

// ─────────────────────────────────────────────────────────────────
//  POWER SELECT UI  (DOM-based)
// ─────────────────────────────────────────────────────────────────
function drawPowerSelectGrid() {
  // Shuffle and pick 10
  const shuffled = [...ALL_POWERUPS].sort(() => Math.random() - 0.5);
  drawnPowerups = shuffled.slice(0, 10);

  powerGrid.innerHTML = '';
  for (let i = 0; i < drawnPowerups.length; i++) {
    const pu   = drawnPowerups[i];
    const card = document.createElement('div');
    card.className    = 'power-card';
    card.dataset.index = i;

    const cdText = pu.cooldown ? `<div class="card-cd">Cooldown: ${pu.cooldown/1000}s</div>` : '';
    card.innerHTML = `
      <div class="card-name">${pu.name}</div>
      <span class="card-type ${pu.type}">${pu.type}</span>
      <div class="card-desc">${pu.desc}</div>
      ${cdText}
    `;
    powerGrid.appendChild(card);
  }
}

function updatePowerSelectCursors() {
  const cards = powerGrid.querySelectorAll('.power-card');
  cards.forEach((card, i) => {
    card.classList.remove('p1-cursor','p2-cursor','p1-selected','p2-selected');
    const id = drawnPowerups[i].id;
    if (i === p1SelectCursor) card.classList.add('p1-cursor');
    if (i === p2SelectCursor) card.classList.add('p2-cursor');
    if (p1SelectedIds.includes(id)) card.classList.add('p1-selected');
    if (p2SelectedIds.includes(id)) card.classList.add('p2-selected');
  });

  // Update pick slots
  updatePickSlots('p1Picks', p1SelectedIds, ['Z','X','C']);
  updatePickSlots('p2Picks', p2SelectedIds, ['J','K','L']);

  p1StatusEl.textContent = p1Confirmed
    ? '✓ Ready!'
    : `Pick 3 powers (${p1SelectedIds.length}/3)`;
  p2StatusEl.textContent = p2Confirmed
    ? '✓ Ready!'
    : `Pick 3 powers (${p2SelectedIds.length}/3)`;
}

function updatePickSlots(containerId, ids, keys) {
  const slots = document.querySelectorAll(`#${containerId} .pick-slot`);
  slots.forEach((slot, i) => {
    const nameEl = slot.querySelector('.slot-name');
    if (ids[i]) {
      const pu = ALL_POWERUPS.find(p => p.id === ids[i]);
      nameEl.textContent = pu ? pu.name : '—';
      slot.classList.add('filled');
    } else {
      nameEl.textContent = '—';
      slot.classList.remove('filled');
    }
  });
}

function handlePowerSelectInput() {
  // P1 cursor movement
  const p1dx = p1SelectMove();
  const p1dy = p1SelectMoveRow();
  if (p1dx !== 0) p1SelectCursor = (p1SelectCursor + p1dx + 10) % 10;
  if (p1dy !== 0) p1SelectCursor = Math.max(0, Math.min(9, p1SelectCursor + p1dy));

  // P2 cursor movement
  const p2dx = p2SelectMove();
  const p2dy = p2SelectMoveRow();
  if (p2dx !== 0) p2SelectCursor = (p2SelectCursor + p2dx + 10) % 10;
  if (p2dy !== 0) p2SelectCursor = Math.max(0, Math.min(9, p2SelectCursor + p2dy));

  // P1 pick / confirm
  if (p1SelectConfirm()) {
    const id = drawnPowerups[p1SelectCursor].id;
    if (!p1Confirmed) {
      if (p1SelectedIds.includes(id)) {
        p1SelectedIds = p1SelectedIds.filter(x => x !== id);
      } else if (p1SelectedIds.length < 3) {
        p1SelectedIds.push(id);
      }
      if (p1SelectedIds.length === 3) {
        p1Confirmed = true;
      }
    }
  }

  // P2 pick / confirm
  if (p2SelectConfirm()) {
    const id = drawnPowerups[p2SelectCursor].id;
    if (!p2Confirmed) {
      if (p2SelectedIds.includes(id)) {
        p2SelectedIds = p2SelectedIds.filter(x => x !== id);
      } else if (p2SelectedIds.length < 3) {
        p2SelectedIds.push(id);
      }
      if (p2SelectedIds.length === 3) {
        p2Confirmed = true;
      }
    }
  }

  updatePowerSelectCursors();

  if (p1Confirmed && p2Confirmed) {
    startReadyCountdown();
  }
}

function startReadyCountdown() {
  if (readyTimer) return; // already started
  selectReadyMsg.classList.remove('hidden');
  readyCount = 3;
  readyCountdown.textContent = readyCount;
  readyTimer = setInterval(() => {
    readyCount--;
    readyCountdown.textContent = readyCount;
    if (readyCount <= 0) {
      clearInterval(readyTimer);
      readyTimer = null;
      cancelAnimationFrame(selectRafId);
      selectRafId = null;
      transitionTo('GAMEPLAY');
    }
  }, 1000);
}

function selectLoop() {
  handlePowerSelectInput();
  clearJustPressed();
  selectRafId = requestAnimationFrame(selectLoop);
}

// ─────────────────────────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────────────────────────
function gameLoop(ts) {
  if (gameState !== 'GAMEPLAY') return;
  const dt = Math.min(ts - lastTimestamp, 50);
  lastTimestamp = ts;

  const now = Date.now();

  // Abilities
  updateAbilityEffects(player1, now);
  updateAbilityEffects(player2, now);
  updateAbilityInput(player1, player2, ts);
  updateAbilityInput(player2, player1, ts);

  // Physics P1
  if (!player1.isDead && !player1.grappling) {
    applyGravity(player1);
    applyHorizontalMovement(player1, p1Left(), p1Right());
    if (p1Jump()) attemptJump(player1);
    moveAndCollide(player1);
    checkVoid(player1);
  }

  // Physics P2
  if (!player2.isDead && !player2.grappling) {
    applyGravity(player2);
    applyHorizontalMovement(player2, p2Left(), p2Right());
    if (p2Jump()) attemptJump(player2);
    moveAndCollide(player2);
    checkVoid(player2);
  }

  // Systems
  updatePushInput(now);
  updateEchoWaves(now);
  updateTemporaryPlatforms(now);
  updateRespawn(player1, dt);
  updateRespawn(player2, dt);

  // Timers
  if (player1.pushFlashTimer > 0) player1.pushFlashTimer -= dt;
  if (player2.pushFlashTimer > 0) player2.pushFlashTimer -= dt;

  updateCamera();

  renderFrame(ts);
  clearJustPressed();

  rafId = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
  lastTimestamp = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────────────────────────
//  STATE MACHINE
// ─────────────────────────────────────────────────────────────────
function showScreen(screen) {
  [titleScreen, powerSelectScreen, gameScreen, gameOverScreen].forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  screen.classList.remove('hidden');
  screen.classList.add('active');
}

function transitionTo(state, winnerNum) {
  gameState = state;

  // Stop loops
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  switch (state) {
    case 'TITLE':
      showScreen(titleScreen);
      break;

    case 'POWER_SELECT':
      // Reset selection state
      p1SelectCursor = 0; p2SelectCursor = 0;
      p1SelectedIds = []; p2SelectedIds = [];
      p1Confirmed   = false; p2Confirmed = false;
      if (readyTimer) { clearInterval(readyTimer); readyTimer = null; }
      selectReadyMsg.classList.add('hidden');
      showScreen(powerSelectScreen);
      drawPowerSelectGrid();
      updatePowerSelectCursors();
      selectRafId = requestAnimationFrame(selectLoop);
      break;

    case 'GAMEPLAY':
      player1 = createPlayer(1, 0,  p1SelectedIds);
      player2 = createPlayer(2, 22, p2SelectedIds);
      temporaryPlatforms = [];
      echoWaves = [];
      // Init camera between spawn platforms
      const sp1 = PLATFORMS[0];
      const sp2 = PLATFORMS[22];
      camX = ((sp1.x + sp2.x) / 2) - CANVAS_W / 2;
      camY = ((sp1.y + sp2.y) / 2) - CANVAS_H / 2;
      camX = Math.max(0, Math.min(WORLD_W - CANVAS_W, camX));
      camY = Math.max(0, Math.min(WORLD_H - CANVAS_H, camY));
      camTargetX = camX; camTargetY = camY;
      showScreen(gameScreen);
      startGameLoop();
      break;

    case 'GAME_OVER':
      showScreen(gameOverScreen);
      const isP1Win = winnerNum === 1;
      winnerText.textContent = `Player ${winnerNum} Wins!`;
      winnerText.style.background = isP1Win
        ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
        : 'linear-gradient(135deg, #f97316, #ef4444)';
      winnerText.style['-webkit-background-clip'] = 'text';
      winnerText.style['-webkit-text-fill-color'] = 'transparent';

      const loser = winnerNum === 1 ? player2 : player1;
      finalStats.innerHTML = `
        <div>Player 1 powers: ${p1SelectedIds.map(id => ALL_POWERUPS.find(p=>p.id===id)?.name).join(', ')}</div>
        <div>Player 2 powers: ${p2SelectedIds.map(id => ALL_POWERUPS.find(p=>p.id===id)?.name).join(', ')}</div>
      `;
      break;
  }
}

// ─────────────────────────────────────────────────────────────────
//  BUTTON LISTENERS
// ─────────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => transitionTo('POWER_SELECT'));
replayBtn.addEventListener('click', () => transitionTo('POWER_SELECT'));
menuBtn.addEventListener('click',  () => transitionTo('TITLE'));

// ─────────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────────
initInput();
transitionTo('TITLE');
