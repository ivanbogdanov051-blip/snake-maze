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
const quickStartBtn   = document.getElementById('quickStartBtn');
const replayBtn       = document.getElementById('replayBtn');
const menuBtn         = document.getElementById('menuBtn');
const winnerText      = document.getElementById('winnerText');
const finalStats      = document.getElementById('finalStats');
const powerGrid       = document.getElementById('powerGrid');
const p1StatusEl      = document.getElementById('p1Status');
const p2StatusEl      = document.getElementById('p2Status');
const selectReadyMsg  = document.getElementById('selectReadyMsg');
const readyCountdown  = document.getElementById('readyCountdown');
const tournamentBtn   = document.getElementById('tournamentBtn');
const deathMatchBtn   = document.getElementById('deathMatchBtn');
const roundOverScreen = document.getElementById('roundOverScreen');
const roundWinnerText = document.getElementById('roundWinnerText');
const p1WinsDisplay   = document.getElementById('p1WinsDisplay');
const p2WinsDisplay   = document.getElementById('p2WinsDisplay');
const nextRoundBtn    = document.getElementById('nextRoundBtn');
const tournamentMenuBtn = document.getElementById('tournamentMenuBtn');

// ─────────────────────────────────────────────────────────────────
//  PHYSICS & WORLD CONSTANTS
// ─────────────────────────────────────────────────────────────────
const GRAVITY          = 2.2;
const JUMP_FORCE       = -16;
const HIGH_JUMP_MULT   = 1.40;
const MOVE_ACCEL       = 1.4;
const MOVE_FRICTION    = 0.80;
const GROUND_FRICTION  = 0.74;
const MAX_VX           = 7;
const HEAVY_MAX_VX     = 4.5;
const FEATHER_GRAVITY  = 0.85;
const MAX_VY           = 24;
const PUSH_BASE_FORCE  = 11;
const PUSH_RANGE       = 100;

// Ability key slots — indexed by slot (0-4)
const P1_ABILITY_KEYS = ['KeyB','KeyN','KeyM','KeyV','KeyG'];
const P2_ABILITY_KEYS = ['KeyZ','KeyX','KeyC','KeyK','KeyL'];
const PLAYER_W         = 36;
const PLAYER_H         = 44;

const CANVAS_W         = 1200;
const CANVAS_H         = 650;
const WORLD_W          = 1200;   // matches canvas — no scrolling needed
const WORLD_H          = 650;
const VOID_Y           = 615;    // bottom ~35 px is void

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
  { id: 'speedBoost',  name: 'Speed Boost',   desc: 'Always +40% movement speed',        type: 'passive' },
  { id: 'groundSlam',  name: 'Ground Slam',   desc: 'Auto-slams opponent on fast fall',  type: 'passive' },
  { id: 'dash',        name: 'Dash',          desc: 'Quick horizontal burst',            type: 'active', cooldown:  5000 },
  { id: 'teleport',    name: 'Teleport',      desc: 'Blink 200 px in facing direction',  type: 'active', cooldown: 15000 },
  { id: 'grapple',     name: 'Grapple Hook',  desc: 'Pull yourself to nearest platform', type: 'active', cooldown: 10000 },
  { id: 'windBlast',   name: 'Wind Blast',    desc: 'Aura constantly pushes opponent',   type: 'passive' },
  { id: 'magnet',      name: 'Magnet',        desc: 'Aura constantly pulls opponent',    type: 'passive' },
  { id: 'fakeFloor',   name: 'Fake Floor',    desc: 'Drops a 5 s temp platform',         type: 'active', cooldown: 20000 },
  { id: 'echoStrike',  name: 'Echo Strike',   desc: 'Push wave bounces off walls (×3)',  type: 'active', cooldown: 10000 },
  { id: 'gravityFlip', name: 'Gravity Flip',  desc: 'Reverse gravity for 2.5 s',         type: 'active', cooldown: 14000 },
  { id: 'ghost',       name: 'Ghost',         desc: 'Immune to all pushes for 2 s',      type: 'active', cooldown:  9000 },
  { id: 'repulse',     name: 'Repulse',       desc: '360° mega push burst',              type: 'active', cooldown: 11000 },
  { id: 'iceAura',     name: 'Ice Aura',      desc: 'Slows opponent when nearby',        type: 'passive' },
  { id: 'tripleJump',  name: 'Triple Jump',   desc: '2 extra air jumps',                 type: 'passive' },
  { id: 'wallSpawn',   name: 'Wall Spawn',    desc: 'Spawn a solid wall (7 s)',           type: 'active', cooldown: 15000 },
  { id: 'infiniteJump',name: 'Infinite Jump', desc: 'Jump non-stop for 3.5 s',           type: 'active', cooldown: 14000 },
];

// ─────────────────────────────────────────────────────────────────
//  PLATFORM MAP  (generated randomly each game)
// ─────────────────────────────────────────────────────────────────
let PLATFORMS = [];

function generatePlatforms() {
  const all = [];
  // [0] P2 left spawn, [1] P1 right spawn — fixed at bottom
  all.push({ x:  55, y: 510, w: 145, h: 20 });
  all.push({ x: 1000, y: 510, w: 145, h: 20 });

  // 3 height tiers distributed evenly across the width.
  // Each tier gets (count) platforms spread across (count+1) equal sections.
  const tiers = [
    { yMin:  90, yMax: 190, count: 3 },   // high
    { yMin: 230, yMax: 350, count: 4 },   // mid
    { yMin: 380, yMax: 490, count: 4 },   // low (above spawns)
  ];

  for (const { yMin, yMax, count } of tiers) {
    const sectionW = WORLD_W / (count + 1);
    for (let i = 0; i < count; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 50 && !placed; attempt++) {
        const w = 75 + Math.floor(Math.random() * 115);
        const cx = sectionW * (i + 1) + (Math.random() - 0.5) * sectionW * 0.75;
        const x  = Math.round(cx - w / 2);
        const y  = Math.round(yMin + Math.random() * (yMax - yMin));

        if (x < 15 || x + w > WORLD_W - 15) continue;

        let bad = false;
        for (const p of all) {
          if (Math.abs(y - p.y) < 38 && x < p.x + p.w + 22 && x + w > p.x - 22) {
            bad = true; break;
          }
        }
        if (!bad) { all.push({ x, y, w, h: 20 }); placed = true; }
      }
    }
  }

  return all;
}

// Temporary fake-floor platforms
let temporaryPlatforms = [];

// Spawned solid walls
let walls = [];

// Echo-strike projectiles
let echoWaves = [];

// Push visual effects
let pushEffects = [];

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

// Game mode
let gameMode    = 'normal'; // 'normal' | 'tournament' | 'deathmatch'
let maxPicks    = 3;
let p1RoundWins = 0;
let p2RoundWins = 0;
let currentRound = 0;

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
let camScale    = 1.0;

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
  return !!keysJustPressed[P1_ABILITY_KEYS[slot]];
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
function p1SelectConfirm() { return !!keysJustPressed['KeyB']; }

// Player 2 input helpers
function p2Left()  { return !!keys['KeyA']; }
function p2Right() { return !!keys['KeyD']; }
function p2Jump()  { return !!keysJustPressed['KeyW']; }
function p2Down()  { return !!keys['KeyS']; }
function p2Ability(slot) {
  return !!keysJustPressed[P2_ABILITY_KEYS[slot]];
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
function p2SelectConfirm() { return !!keysJustPressed['KeyZ']; }

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
    autoPushTimer: 0,
    gravityFlipped: false,
    gravityFlipExpiry: 0,
    ghostActive: false,
    ghostExpiry: 0,
    icedBy: false,
    infiniteJumpActive: false,
    infiniteJumpExpiry: 0,
  };
}

// ─────────────────────────────────────────────────────────────────
//  PHYSICS
// ─────────────────────────────────────────────────────────────────
function applyGravity(player) {
  if (player.gravityFlipped) {
    player.vy -= GRAVITY;
    if (player.vy < -MAX_VY) player.vy = -MAX_VY;
    return;
  }
  const g = player.passives.includes('featherFall') ? FEATHER_GRAVITY : GRAVITY;
  player.vy += g;
  if (player.vy > MAX_VY) player.vy = MAX_VY;
}

function applyHorizontalMovement(player, left, right) {
  let spd = player.passives.includes('heavy') ? HEAVY_MAX_VX : MAX_VX;
  if (player.speedBoostActive) spd *= 1.7;
  if (player.icedBy) { spd *= 0.52; player.icedBy = false; }

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
    if (player.passives.includes('tripleJump'))      player.airJumpsLeft = 2;
    else if (player.passives.includes('doubleJump')) player.airJumpsLeft = 1;
    else player.airJumpsLeft = 0;
  } else if (player.airJumpsLeft > 0 || player.infiniteJumpActive) {
    player.vy = force;
    if (!player.infiniteJumpActive) player.airJumpsLeft--;
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
    if (player.x + player.w <= plat.x || player.x >= plat.x + plat.w) continue;
    if (player.y + player.h < plat.y || player.y > plat.y + plat.h) continue;
    if (player.vy >= 0 && prevBottom <= plat.y + 2) {
      player.y = plat.y - player.h;
      player.vy = 0;
      player.onGround = true;
      if (player.passives.includes('tripleJump'))      player.airJumpsLeft = 2;
      else if (player.passives.includes('doubleJump')) player.airJumpsLeft = 1;
      else player.airJumpsLeft = 0;
      if (player.groundSlamming) {
        player.groundSlamming = false;
        const opp = player.num === 1 ? player2 : player1;
        if (opp && !opp.isDead) slamHit(player, opp);
      }
    }
  }
}

function resolveHorizontal(player) {
  if (player.vy < 0) return; // moving upward — pass through platforms freely
  const all = getAllPlatforms();
  for (const plat of all) {
    if (player.y + player.h <= plat.y || player.y >= plat.y + plat.h) continue;
    if (player.x + player.w <= plat.x || player.x >= plat.x + plat.w) continue;
    const overlapL = (player.x + player.w) - plat.x;
    const overlapR = (plat.x + plat.w) - player.x;
    if (overlapL < overlapR) { player.x = plat.x - player.w; player.vx = 0; }
    else                     { player.x = plat.x + plat.w;   player.vx = 0; }
  }
}

function resolveWalls(player) {
  for (const wall of walls) {
    if (player.x + player.w <= wall.x || player.x >= wall.x + wall.w) continue;
    if (player.y + player.h <= wall.y || player.y >= wall.y + wall.h) continue;
    const overlapL = (player.x + player.w) - wall.x;
    const overlapR = (wall.x + wall.w) - player.x;
    const overlapT = (player.y + player.h) - wall.y;
    const overlapB = (wall.y + wall.h) - player.y;
    if (Math.min(overlapL, overlapR) <= Math.min(overlapT, overlapB)) {
      if (overlapL < overlapR) { player.x = wall.x - player.w; player.vx = Math.min(0, player.vx); }
      else                      { player.x = wall.x + wall.w;  player.vx = Math.max(0, player.vx); }
    } else {
      if (overlapT < overlapB) { player.y = wall.y - player.h; if (player.vy > 0) { player.vy = 0; player.onGround = true; } }
      else                      { player.y = wall.y + wall.h;  if (player.vy < 0) player.vy = 0; }
    }
  }
}

function moveAndCollide(player) {
  player.prevY = player.y;

  player.x += player.vx;
  player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));
  resolveHorizontal(player);
  resolveWalls(player);

  player.y += player.vy;
  if (player.gravityFlipped && player.y < 0) { player.y = 0; player.vy = 0; }
  resolveVertical(player);
  resolveWalls(player);
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
  if (target.ghostActive) return; // ghost is intangible

  // Auto-reactive shield: if target has shield active ability and cooldown is ready, block this push
  if (target.actives.includes('shield')) {
    const now = Date.now();
    if ((target.cooldowns['shield'] || 0) <= now) {
      doShield(target, now);
      target.cooldowns['shield'] = now + getCooldown('shield');
      return;
    }
  }

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

  spawnPushEffect(pusher, dir);
}

function spawnPushEffect(pusher, dir, full = false) {
  pushEffects.push({
    x:         pusher.x + pusher.w / 2 + (full ? 0 : dir * (pusher.w / 2 + 4)),
    y:         pusher.y + pusher.h / 2,
    radius:    8,
    maxRadius: full ? 130 : 80,
    alpha:     1.0,
    dir,
    full,
    color:     pusher.num === 1 ? '#3b82f6' : '#f97316',
  });
}

function updatePushEffects(dt) {
  const speed = 3.2; // px per ms growth
  for (const e of pushEffects) {
    e.radius += speed * dt;
    e.alpha   = Math.max(0, 1 - e.radius / e.maxRadius);
  }
  pushEffects = pushEffects.filter(e => e.alpha > 0);
}

function updatePushInput(ts) {
  if (p1Down() && player1 && !player1.isDead) tryPush(player1, player2, ts);
  if (p2Down() && player2 && !player2.isDead) tryPush(player2, player1, ts);

  // Auto proximity push when players are very close
  if (player1 && player2 && !player1.isDead && !player2.isDead) {
    const p1cx = player1.x + player1.w / 2;
    const p2cx = player2.x + player2.w / 2;
    const p1cy = player1.y + player1.h / 2;
    const p2cy = player2.y + player2.h / 2;
    const dist = Math.hypot(p1cx - p2cx, p1cy - p2cy);
    const now = Date.now();
    if (dist < 52) {
      if (player1.autoPushTimer < now) { tryPush(player1, player2, ts); player1.autoPushTimer = now + 900; }
      if (player2.autoPushTimer < now) { tryPush(player2, player1, ts); player2.autoPushTimer = now + 900; }
    }
  }
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
    case 'fakeFloor':    doFakeFloor(player, now);           break;
    case 'echoStrike':   doEchoStrike(player);               break;
    case 'gravityFlip':  doGravityFlip(player, now);         break;
    case 'ghost':        doGhost(player, now);               break;
    case 'repulse':      doRepulse(player, opponent, ts);    break;
    case 'wallSpawn':    doWallSpawn(player, now);           break;
    case 'infiniteJump': doInfiniteJump(player, now);        break;
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
    vx: player.facingRight ? 18 : -18,
    vy: 0,
    owner: player.num,
    bounces: 3,
    hitsLeft: 3,  // can hit once per bounce remaining
  });
}

function doGravityFlip(player, now) {
  player.gravityFlipped = true;
  player.gravityFlipExpiry = now + 2500;
  player.vy *= -0.5; // reverse current vertical momentum
}

function doGhost(player, now) {
  player.ghostActive = true;
  player.ghostExpiry = now + 2000;
}

function doRepulse(player, opponent, ts) {
  if (!opponent || opponent.isDead) return;
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h / 2;
  const dist = Math.hypot(cx - ox, cy - oy) || 1;
  const now = Date.now();
  if (now < opponent.spawnImmunityExpiry || opponent.ghostActive) return;
  if (opponent.actives.includes('shield') && (opponent.cooldowns['shield'] || 0) <= now) {
    doShield(opponent, now);
    opponent.cooldowns['shield'] = now + getCooldown('shield');
  } else if (!(opponent.shieldActive && ts < opponent.shieldExpiry)) {
    opponent.vx += ((ox - cx) / dist) * PUSH_BASE_FORCE * 2.2;
    opponent.vy += ((oy - cy) / dist) * PUSH_BASE_FORCE * 1.0 - 4;
    opponent.pushFlashTimer = 350;
  }
  spawnPushEffect(player, 1, true); // full circle visual
}

function updateAbilityEffects(player, now) {
  if (player.shieldActive && now > player.shieldExpiry) player.shieldActive = false;
  if (player.speedBoostActive && !player.passives.includes('speedBoost') && now > player.speedBoostExpiry) {
    player.speedBoostActive = false;
  }
  if (player.gravityFlipped && now > player.gravityFlipExpiry) {
    player.gravityFlipped = false;
    player.vy = Math.min(player.vy * -0.3, 2); // gentle return
  }
  if (player.ghostActive && now > player.ghostExpiry) player.ghostActive = false;
  if (player.infiniteJumpActive && now > player.infiniteJumpExpiry) {
    player.infiniteJumpActive = false;
    player.airJumpsLeft = 0;
  }
  if (player.grappling) updateGrapple(player);
}

function updatePassiveEffects(player, opponent) {
  // Speed Boost passive: always active
  if (player.passives.includes('speedBoost')) {
    player.speedBoostActive = true;
  }

  // Magnet passive: continuously pull opponent toward player
  if (player.passives.includes('magnet') && opponent && !opponent.isDead) {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h / 2;
    const dist = Math.hypot(cx - ox, cy - oy);
    if (dist > 20 && dist < 520) {
      opponent.vx += ((cx - ox) / dist) * 0.38;
      opponent.vy += ((cy - oy) / dist) * 0.16;
    }
  }

  // Wind Blast passive: continuously push opponent away
  if (player.passives.includes('windBlast') && opponent && !opponent.isDead) {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h / 2;
    const dist = Math.hypot(cx - ox, cy - oy);
    if (dist > 20 && dist < 380) {
      opponent.vx += ((ox - cx) / dist) * 0.30;
      opponent.vy += ((oy - cy) / dist) * 0.10;
    }
  }

  // Ground Slam passive: auto-slam when falling fast
  if (player.passives.includes('groundSlam') && !player.onGround && player.vy > 15) {
    player.groundSlamming = true;
  }

  // Ice Aura passive: slow opponent when nearby
  if (player.passives.includes('iceAura') && opponent && !opponent.isDead) {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h / 2;
    if (Math.hypot(cx - ox, cy - oy) < 230) opponent.icedBy = true;
  }
}

function updateAbilityInput(player, opponent, ts) {
  const fn = player.num === 1 ? p1Ability : p2Ability;
  for (let s = 0; s < player.actives.length; s++) {
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

    // Bounce off solid walls
    for (const wall of walls) {
      if (w.x > wall.x - 10 && w.x < wall.x + wall.w + 10 &&
          w.y > wall.y && w.y < wall.y + wall.h) {
        w.vx *= -1;
        w.x += w.vx * 12; // skip past the wall to avoid re-triggering
        w.bounces--;
        break;
      }
    }

    if (w.bounces < 0) return false;

    // Hit opponent
    const opp = w.owner === 1 ? player2 : player1;
    if (opp && !opp.isDead && w.hitsLeft > 0) {
      const dist = Math.hypot(w.x - (opp.x + opp.w/2), w.y - (opp.y + opp.h/2));
      if (dist < 65) {
        tryPush(w.owner === 1 ? player1 : player2, opp, now, 3.8);
        w.hitsLeft--;
        w.bounces--;  // each hit counts as a bounce — wave weakens
        // Brief cooldown: move wave past the opponent so it doesn't re-hit instantly
        w.x += w.vx * 8;
      }
    }
    return true;
  });
}

function doWallSpawn(player, now) {
  const dir = player.facingRight ? 1 : -1;
  const wx = Math.max(0, Math.min(WORLD_W - 20, player.x + player.w / 2 + dir * 60 - 10));
  walls.push({ x: wx, y: player.y - 30, w: 20, h: 104, expiresAt: now + 7000 });
}

function doInfiniteJump(player, now) {
  player.infiniteJumpActive = true;
  player.infiniteJumpExpiry = now + 3500;
  player.airJumpsLeft = 99; // instant first jump if airborne
}

function updateWalls(now) {
  walls = walls.filter(w => w.expiresAt > now);
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
  // World = canvas size, so no zoom or scroll needed — always 1:1
  camScale = 1.0;
  camX     = 0;
  camY     = 0;
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
  const voidScreenY = (VOID_Y - camY) * camScale;
  if (voidScreenY < CANVAS_H) {
    const vg = ctx.createLinearGradient(0, Math.max(0, voidScreenY - 80), 0, CANVAS_H);
    vg.addColorStop(0, 'rgba(180,20,20,0)');
    vg.addColorStop(1, 'rgba(180,20,20,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, Math.max(0, voidScreenY - 80), CANVAS_W, CANVAS_H);
  }
}

function drawPlatforms() {
  // World space — transform already applied by renderFrame
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

  // World coordinates — transform already applied by renderFrame
  const px = player.x;
  const py = player.y;
  const now = Date.now();

  const immune = now < player.spawnImmunityExpiry;
  if (immune && Math.floor(now / 120) % 2 === 0) return;

  const flashing = player.pushFlashTimer > 0;

  // Grapple line
  if (player.grappling && player.grappleTarget) {
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(px + player.w / 2, py + player.h / 2);
    ctx.lineTo(player.grappleTarget.x, player.grappleTarget.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Body
  ctx.save();
  if (player.ghostActive) ctx.globalAlpha = 0.32 + Math.sin(now * 0.008) * 0.12;
  roundRect(ctx, px, py, player.w, player.h, 8);
  ctx.fillStyle = flashing ? '#ef4444' : player.color;
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, px, py + player.h * 0.5, player.w, player.h * 0.5, 8);
  ctx.fill();

  // Eyes
  const eyeY = py + 12;
  const eyeOffsetX = player.facingRight ? 8 : 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px + eyeOffsetX, eyeY, 5, 0, Math.PI * 2);
  ctx.arc(px + eyeOffsetX + 12, eyeY, 5, 0, Math.PI * 2);
  ctx.fill();
  const pupilDir = player.facingRight ? 2 : -1;
  ctx.fillStyle = '#1e1e2e';
  ctx.beginPath();
  ctx.arc(px + eyeOffsetX + pupilDir, eyeY + 1, 2.5, 0, Math.PI * 2);
  ctx.arc(px + eyeOffsetX + 12 + pupilDir, eyeY + 1, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Player label above head
  ctx.font = 'bold 12px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = player.color;
  ctx.fillText('P' + player.num, px + player.w / 2, py - 6);

  ctx.restore();

  // Shield bubble
  if (player.shieldActive) {
    const pulse = 0.7 + 0.3 * Math.sin(now / 150);
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + player.w / 2, py + player.h / 2, player.w * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1 * pulse;
    ctx.fillStyle = '#67e8f9';
    ctx.fill();
    ctx.restore();
  }

  // Speed boost glow
  if (player.speedBoostActive) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fbbf24';
    roundRect(ctx, px - 4, py + 4, player.w + 8, player.h - 4, 8);
    ctx.fill();
    ctx.restore();
  }

  // Gravity flip — upward arrow indicator
  if (player.gravityFlipped) {
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(now * 0.01) * 0.2;
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + player.w/2, py - 4); ctx.lineTo(px + player.w/2, py - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + player.w/2 - 5, py - 12); ctx.lineTo(px + player.w/2, py - 18); ctx.lineTo(px + player.w/2 + 5, py - 12); ctx.stroke();
    ctx.restore();
  }

  // Ice aura — frost tint on iced player
  if (player.icedBy) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#bae6fd';
    roundRect(ctx, px, py, player.w, player.h, 8);
    ctx.fill();
    ctx.restore();
  }

  // Ground slam indicator
  if (player.groundSlamming) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(px + player.w / 2, py + player.h + 8);
    ctx.lineTo(px + player.w / 2 - 10, py + player.h + 28);
    ctx.lineTo(px + player.w / 2 + 10, py + player.h + 28);
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

  // Tournament score overlay
  if (gameMode === 'tournament') drawTournamentScore();

  // Respawn timers
  if (player1.isDead && player1.lives > 0) {
    drawRespawnMsg(player1, now);
  }
  if (player2.isDead && player2.lives > 0) {
    drawRespawnMsg(player2, now);
  }
}

function drawTournamentScore() {
  const cx = CANVAS_W / 2;
  // Round label
  ctx.font = 'bold 11px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('ROUND ' + (currentRound + 1) + '  ·  first to 3', cx, 16);
  // P1 stars
  ctx.font = 'bold 14px Segoe UI, Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('P1 ' + '★'.repeat(p1RoundWins) + '☆'.repeat(Math.max(0, 3 - p1RoundWins)), cx - 8, 32);
  // P2 stars
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f97316';
  ctx.fillText('★'.repeat(p2RoundWins) + '☆'.repeat(Math.max(0, 3 - p2RoundWins)) + ' P2', cx + 8, 32);
}

function drawLives(player, x, y, rightAlign) {
  ctx.font = 'bold 20px Segoe UI, Arial';
  ctx.textAlign = rightAlign ? 'right' : 'left';
  ctx.fillStyle = player.color;
  const hearts = '♥'.repeat(Math.max(0, player.lives)) + '♡'.repeat(Math.max(0, 3 - player.lives));
  ctx.fillText(hearts, x, y + 18);
}

function drawAbilityCooldowns(player, x, y, rightAlign) {
  const now   = Date.now();
  const count = player.actives.length;
  const barW  = count <= 3 ? 64 : count === 4 ? 52 : 42;
  const barH  = 8;
  const gap   = count <= 3 ? 6  : 4;
  const total = barW * count + gap * (count - 1);
  const startX = rightAlign ? x - total : x;
  const keyArr = player.num === 1 ? P1_ABILITY_KEYS : P2_ABILITY_KEYS;

  for (let i = 0; i < count; i++) {
    const id  = player.actives[i];
    const pu  = ALL_POWERUPS.find(p => p.id === id);
    if (!pu) continue;

    const bx    = startX + i * (barW + gap);
    const ready = player.cooldowns[id] || 0;
    const ratio = Math.min(1, Math.max(0, 1 - (ready - now) / pu.cooldown));

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, bx, y, barW, barH, 3);
    ctx.fill();

    ctx.fillStyle = ratio >= 1 ? player.color : '#64748b';
    roundRect(ctx, bx, y, barW * ratio, barH, 3);
    ctx.fill();

    ctx.font = '10px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = ratio >= 1 ? '#fff' : '#94a3b8';
    const keyLabel = keyArr[i].replace('Key', '');
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

function drawPushEffects() {
  for (const e of pushEffects) {
    ctx.save();
    ctx.globalAlpha = e.alpha;
    ctx.strokeStyle = e.color;
    if (e.full) {
      // Full 360° ring for repulse
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.stroke();
      if (e.radius > 20) {
        ctx.globalAlpha = e.alpha * 0.35;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.65, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
      // Semicircle arc for directional push
      const sa = e.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const ea = e.dir > 0 ?  Math.PI / 2 : 3 * Math.PI / 2;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, sa, ea); ctx.stroke();
      if (e.radius > 16) {
        ctx.globalAlpha = e.alpha * 0.4;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.6, sa, ea); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawWalls() {
  const now = Date.now();
  for (const wall of walls) {
    const remaining = wall.expiresAt - now;
    const flash = remaining < 1500 && Math.floor(remaining / 180) % 2 === 0;
    if (flash) continue;
    // Main block
    ctx.fillStyle = '#334155';
    roundRect(ctx, wall.x, wall.y, wall.w, wall.h, 3);
    ctx.fill();
    // Brick-style highlights
    ctx.fillStyle = '#475569';
    const brickH = 14, brickPad = 3;
    for (let by = wall.y + brickPad; by < wall.y + wall.h - brickH; by += brickH + 2) {
      ctx.fillRect(wall.x + brickPad, by, wall.w - brickPad * 2, 5);
    }
    // Top edge highlight
    ctx.fillStyle = '#64748b';
    ctx.fillRect(wall.x + 2, wall.y + 2, wall.w - 4, 3);
  }
}

function drawEchoWaves() {
  // World space — transform already applied by renderFrame
  for (const w of echoWaves) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    const c = w.owner === 1 ? '#3b82f6' : '#f97316';
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w.x, w.y, 28, 14, 0, 0, Math.PI * 2);
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

  // World-space drawing — scaled and translated
  ctx.save();
  ctx.scale(camScale, camScale);
  ctx.translate(-camX, -camY);
  drawPlatforms();
  drawWalls();
  drawEchoWaves();
  drawPushEffects();
  drawPlayer(player1);
  drawPlayer(player2);
  ctx.restore();

  // Screen-space drawing — no transform
  drawHUD();
}

// ─────────────────────────────────────────────────────────────────
//  CARD PREVIEW ANIMATIONS
// ─────────────────────────────────────────────────────────────────
const CW = 120, CH = 52; // card canvas resolution

const CARD_ANIMS = {
  doubleJump(ctx, t) {
    const phase = (t % 1600) / 1600;
    const groundY = CH - 10, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    let py;
    if (phase < 0.5) py = groundY - Math.sin((phase / 0.5) * Math.PI) * 30;
    else             py = (groundY - 14) - Math.sin(((phase - 0.5) / 0.5) * Math.PI) * 20;
    if (phase >= 0.5 && phase < 0.62) {
      const sp = (phase - 0.5) / 0.12;
      ctx.fillStyle = 'rgba(251,191,36,0.85)';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a)*sp*13, py + 6 + Math.sin(a)*sp*8, 2.5, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  highJump(ctx, t) {
    const phase = (t % 1400) / 1400;
    const groundY = CH - 10, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    const py = groundY - Math.sin(Math.min(1, phase / 0.85) * Math.PI) * 42;
    if (phase < 0.5) {
      ctx.strokeStyle = 'rgba(96,165,250,0.45)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(cx - 10, py + 16 + i * 4); ctx.lineTo(cx + 10, py + 16 + i * 4); ctx.stroke();
      }
    }
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  superPush(ctx, t) {
    const phase = (t % 1400) / 1400;
    const midY = CH / 2 + 2;
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(10, midY - 8, 12, 14);
    const tx = Math.min(22 + phase * 74, CW - 14);
    ctx.fillStyle = '#fb923c'; ctx.fillRect(tx, midY - 8 - phase * 12, 12, 14);
    if (phase < 0.5) {
      const r = 8 + phase * 42;
      ctx.strokeStyle = `rgba(251,191,36,${Math.max(0, 0.9 - phase * 1.6)})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(22, midY, r, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke();
    }
  },

  heavy(ctx, t) {
    const phase = (t % 1200) / 1200;
    const groundY = CH - 10, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    const py = Math.min(-4 + Math.pow(phase / 0.6, 2.5) * (groundY + 4), groundY - 16);
    ctx.fillStyle = '#1d4ed8'; ctx.fillRect(cx - 9, py - 16, 18, 17);
    if (phase > 0.62 && phase < 0.88) {
      const p = (phase - 0.62) / 0.26;
      ctx.strokeStyle = `rgba(96,165,250,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, groundY, p * 33, p * 7, 0, 0, Math.PI * 2); ctx.stroke();
    }
  },

  featherFall(ctx, t) {
    const phase = (t % 2200) / 2200;
    const groundY = CH - 10, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    const py = -14 + phase * (groundY + 14);
    const sway = Math.sin(phase * Math.PI * 5) * 13;
    ctx.fillStyle = 'rgba(74,222,128,0.28)';
    for (let i = 1; i <= 4; i++) {
      const tp = phase - i * 0.055; if (tp < 0) continue;
      ctx.beginPath(); ctx.arc(cx + Math.sin(tp * Math.PI * 5) * 13, -14 + tp * (groundY + 14), 2.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#4ade80'; ctx.fillRect(cx + sway - 7, py - 14, 14, 15);
  },

  shield(ctx, t) {
    const phase = (t % 1600) / 1600;
    const cx = CW / 2, cy = CH / 2 + 4;
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(cx - 7, cy - 15, 14, 15);
    const r = 20 * (1 + Math.sin(phase * Math.PI * 2) * 0.07);
    ctx.strokeStyle = 'rgba(56,189,248,0.22)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(cx, cy - 5, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(56,189,248,${0.72 + Math.sin(phase * Math.PI * 2) * 0.22})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy - 5, r, 0, Math.PI * 2); ctx.stroke();
  },

  speedBoost(ctx, t) {
    const phase = (t % 900) / 900;
    const midY = CH / 2 + 2;
    const px = -14 + phase * (CW + 14);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(251,191,36,${(1 - i * 0.18) * 0.6})`;
      ctx.beginPath(); ctx.moveTo(Math.max(0, px - 8 - i*12), midY - 3 + (i % 2) * 5);
      ctx.lineTo(Math.max(0, px - 20 - i*12), midY - 3 + (i % 2) * 5); ctx.stroke();
    }
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(Math.min(px, CW - 14), midY - 14, 14, 15);
  },

  groundSlam(ctx, t) {
    const phase = (t % 1500) / 1500;
    const groundY = CH - 10, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    const py = Math.min(-4 + Math.pow(Math.min(1, phase / 0.55), 2.8) * (groundY + 4), groundY - 15);
    ctx.fillStyle = '#c084fc'; ctx.fillRect(cx - 7, py - 14, 14, 15);
    if (phase > 0.57 && phase < 0.88) {
      const p = (phase - 0.57) / 0.31;
      ctx.strokeStyle = `rgba(192,132,252,${1 - p})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(cx, groundY, p * 46, p * 9, 0, 0, Math.PI * 2); ctx.stroke();
    }
  },

  dash(ctx, t) {
    const phase = (t % 1100) / 1100;
    const midY = CH / 2 + 2;
    const startX = 10, endX = CW - 26;
    if (phase >= 0.28 && phase < 0.42) {
      const p = (phase - 0.28) / 0.14;
      for (let i = 4; i >= 1; i--) {
        ctx.fillStyle = `rgba(251,191,36,${((5 - i) / 5) * 0.45 * (1 - p)})`;
        ctx.fillRect(startX + (i - 1) * (endX - startX) / 4, midY - 13, 14, 15);
      }
    }
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(phase < 0.38 ? startX : endX, midY - 13, 14, 15);
  },

  teleport(ctx, t) {
    const phase = (t % 1600) / 1600;
    const midY = CH / 2 + 2;
    const fromX = 10, toX = CW - 24;
    if (phase < 0.38) {
      ctx.fillStyle = '#a855f7'; ctx.fillRect(fromX, midY - 13, 14, 15);
    } else if (phase < 0.46) {
      const p = (phase - 0.38) / 0.08;
      ctx.strokeStyle = `rgba(168,85,247,${1 - p})`; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(fromX+7, midY-5, (1-p)*(8+i*6), 0, Math.PI*2); ctx.stroke(); }
    } else if (phase < 0.56) {
      const p = (phase - 0.46) / 0.10;
      ctx.strokeStyle = `rgba(168,85,247,${1 - p})`; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(toX+7, midY-5, p*(8+i*6), 0, Math.PI*2); ctx.stroke(); }
      ctx.fillStyle = `rgba(168,85,247,${p})`; ctx.fillRect(toX, midY - 13, 14, 15);
    } else {
      ctx.fillStyle = '#a855f7'; ctx.fillRect(toX, midY - 13, 14, 15);
    }
  },

  grapple(ctx, t) {
    const phase = (t % 1800) / 1800;
    const groundY = CH - 10, platY = 8, cx = CW / 2;
    ctx.fillStyle = '#475569'; ctx.fillRect(cx - 22, platY, 44, 5);
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    if (phase < 0.45) {
      const p = phase / 0.45;
      const hookY = groundY - 18 - p * (groundY - 18 - platY - 5);
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, groundY - 18); ctx.lineTo(cx, hookY); ctx.stroke();
      ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(cx, hookY, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4ade80'; ctx.fillRect(cx - 7, groundY - 33, 14, 15);
    } else {
      const p = (phase - 0.45) / 0.55;
      const py = groundY - 18 - p * (groundY - 18 - platY - 5);
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(cx, platY + 5); ctx.stroke();
      ctx.fillStyle = '#4ade80'; ctx.fillRect(cx - 7, py - 15, 14, 15);
    }
  },

  windBlast(ctx, t) {
    const phase = (t % 1200) / 1200;
    const cy = CH / 2 + 2;
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(8, cy - 13, 12, 14);
    for (let i = 0; i < 3; i++) {
      const p = ((phase + i * 0.33) % 1);
      ctx.strokeStyle = `rgba(34,211,238,${(1 - p) * 0.85})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(14, cy, 8 + p * 52, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke();
    }
  },

  magnet(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cy = CH / 2 + 2;
    ctx.fillStyle = '#f472b6'; ctx.fillRect(8, cy - 13, 12, 14);
    const ox = Math.max(26, CW - 24 - phase * (CW - 58));
    ctx.fillStyle = '#fb923c'; ctx.fillRect(ox, cy - 13, 12, 14);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(244,114,182,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(ox, cy); ctx.stroke(); ctx.setLineDash([]);
  },

  fakeFloor(ctx, t) {
    const phase = (t % 1800) / 1800;
    const groundY = CH - 10, platY = groundY - 22, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    if (phase > 0.25) {
      const p = Math.min(1, (phase - 0.25) / 0.2);
      const pw = p * 72;
      ctx.fillStyle = `rgba(251,191,36,${p * 0.5})`; ctx.fillRect(cx - pw/2, platY, pw, 5);
      ctx.strokeStyle = `rgba(251,191,36,${p})`; ctx.lineWidth = 1; ctx.strokeRect(cx - pw/2, platY, pw, 5);
    }
    const py = Math.min(-14 + (phase / 0.55) * (platY - 1), platY - 15);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  gravityFlip(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cx = CW / 2;
    // Flip happens at phase 0.3
    const flipped = phase > 0.3 && phase < 0.85;
    const groundY = flipped ? 8  : CH - 10;
    const ceilY   = flipped ? CH - 10 : 8;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    ctx.fillStyle = 'rgba(51,65,85,0.4)'; ctx.fillRect(cx - 30, ceilY, 60, 4);
    const py = flipped
      ? 10 + Math.abs(Math.sin((phase - 0.3) / 0.55 * Math.PI)) * 28
      : CH - 24 - Math.abs(Math.sin(phase / 0.28 * Math.PI)) * 8;
    // Flip flash
    if (phase >= 0.28 && phase < 0.38) {
      const p = (phase - 0.28) / 0.10;
      ctx.strokeStyle = `rgba(168,85,247,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, py, p * 18, 0, Math.PI*2); ctx.stroke();
    }
    // Arrows indicating gravity direction
    const arrowY = flipped ? py + 18 : py - 18;
    const arrowDir = flipped ? -1 : 1;
    ctx.strokeStyle = 'rgba(168,85,247,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, py + 14 * arrowDir); ctx.lineTo(cx, arrowY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, arrowY - 6 * arrowDir); ctx.lineTo(cx, arrowY); ctx.lineTo(cx + 5, arrowY - 6 * arrowDir); ctx.stroke();
    ctx.fillStyle = '#a855f7'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  ghost(ctx, t) {
    const phase = (t % 1600) / 1600;
    const platY = CH / 2 - 2;
    const cx = CW / 2;
    // Platform
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, platY, 60, 5);
    ctx.fillStyle = '#4a6a7a'; ctx.fillRect(cx - 26, platY, 52, 3);
    // Player phases downward through it
    const py = -14 + phase * (CH + 10);
    const ghosting = py > platY - 20 && py < platY + 20;
    ctx.save();
    if (ghosting) {
      ctx.globalAlpha = 0.32 + Math.sin(t * 0.02) * 0.1;
      // Sparkle particles
      ctx.fillStyle = 'rgba(167,139,250,0.55)';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 0.003;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a)*14, py + 7 + Math.sin(a)*8, 2, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.fillStyle = '#818cf8';
    ctx.fillRect(cx - 7, py - 14, 14, 15);
    ctx.restore();
  },

  repulse(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cx = CW / 2, cy = CH / 2 + 2;
    ctx.fillStyle = '#f97316'; ctx.fillRect(cx - 7, cy - 13, 14, 15);
    for (let i = 0; i < 3; i++) {
      const p = ((phase + i * 0.33) % 1);
      const r = 4 + p * 44;
      ctx.strokeStyle = `rgba(249,115,22,${(1 - p) * 0.85})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
  },

  iceAura(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cx = 22, cy = CH / 2 + 2;
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(cx - 7, cy - 13, 14, 15);
    // Frost crystals radiating out
    const n = 6;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + phase * Math.PI;
      const r = 14 + Math.sin(phase * Math.PI * 2 + i) * 4;
      const ex = cx + Math.cos(angle) * r;
      const ey = cy + Math.sin(angle) * r;
      ctx.strokeStyle = `rgba(56,189,248,${0.5 + Math.sin(phase * Math.PI * 2 + i) * 0.3})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = 'rgba(186,230,253,0.85)';
      ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI*2); ctx.fill();
    }
    // Opponent slowed
    const ox = CW - 22;
    ctx.fillStyle = '#fb923c'; ctx.fillRect(ox - 7, cy - 13, 14, 15);
    // Frost overlay on opponent
    ctx.fillStyle = `rgba(186,230,253,${0.3 + Math.sin(phase * Math.PI * 2) * 0.15})`;
    ctx.fillRect(ox - 7, cy - 13, 14, 15);
    // Slow arrow
    ctx.strokeStyle = 'rgba(186,230,253,0.65)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox - 1, cy - 20); ctx.lineTo(ox - 1, cy - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox - 5, cy - 12); ctx.lineTo(ox - 1, cy - 8); ctx.lineTo(ox + 3, cy - 12); ctx.stroke();
  },

  wallSpawn(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    const wallX = CW / 2 - 7;
    // Owner player on left
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(12, cy - 13, 12, 14);
    // Wall materializing
    const wp = Math.min(1, phase < 0.35 ? phase / 0.35 : 1);
    const wallH = wp * 46;
    ctx.fillStyle = `rgba(71,85,105,${wp})`; ctx.fillRect(wallX, cy - wallH/2, 14, wallH);
    ctx.fillStyle = `rgba(100,116,139,${wp * 0.7})`; ctx.fillRect(wallX + 3, cy - wallH/2 + 3, 5, 7);
    ctx.fillRect(wallX + 3, cy - wallH/2 + 14, 5, 7);
    ctx.fillRect(wallX + 3, cy - wallH/2 + 25, 5, 7);
    // Opponent walking into wall and stopping
    const ox = phase > 0.4 ? Math.max(wallX + 18, CW - 24 - (phase - 0.4) / 0.35 * 50) : CW - 24;
    ctx.fillStyle = '#fb923c'; ctx.fillRect(Math.min(ox, CW - 24), cy - 13, 12, 14);
    // Impact flash
    if (phase > 0.76 && phase < 0.9) {
      const p = (phase - 0.76) / 0.14;
      ctx.fillStyle = `rgba(251,191,36,${(1 - p) * 0.8})`;
      ctx.beginPath(); ctx.arc(wallX + 14, cy, (1 - p) * 10, 0, Math.PI * 2); ctx.fill();
    }
    // Echo wave bouncing off wall
    if (phase > 0.55 && phase < 0.78) {
      const p = (phase - 0.55) / 0.23;
      const wx2 = wallX - p * 30;
      ctx.strokeStyle = `rgba(251,113,133,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wx2, cy, 8, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    }
  },

  infiniteJump(ctx, t) {
    const phase = (t % 2000) / 2000;
    const groundY = CH - 8, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 28, groundY, 56, 4);
    // Player bouncing rapidly
    const bounceFreq = 4;
    const envelope = phase < 0.8 ? 1 : (1 - (phase - 0.8) / 0.2); // fade out near end
    const py = groundY - Math.abs(Math.sin(phase * Math.PI * bounceFreq)) * 36 * envelope;
    // Multiple trailing sparks
    for (let i = 1; i <= 4; i++) {
      const tp = ((phase - i * 0.025 + 1) % 1);
      const tpy = groundY - Math.abs(Math.sin(tp * Math.PI * bounceFreq)) * 36 * (phase < 0.8 ? 1 : (1 - (tp - 0.8) / 0.2));
      ctx.fillStyle = `rgba(52,211,153,${(1 - i * 0.22) * 0.6})`;
      ctx.fillRect(cx - 5, tpy - 10, 10, 11);
    }
    ctx.fillStyle = '#34d399'; ctx.fillRect(cx - 7, py - 14, 14, 15);
    // Jump sparks at each apex
    const localPhase = (phase * bounceFreq) % 1;
    if (localPhase < 0.12) {
      const sp = localPhase / 0.12;
      ctx.fillStyle = 'rgba(251,191,36,0.85)';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a)*sp*9, py + 7 + Math.sin(a)*sp*5, 2, 0, Math.PI*2); ctx.fill();
      }
    }
  },

  tripleJump(ctx, t) {
    const phase = (t % 2000) / 2000;
    const groundY = CH - 8, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    let py;
    if (phase < 0.3)        py = groundY - Math.sin((phase / 0.3) * Math.PI) * 22;
    else if (phase < 0.6)   py = groundY - Math.sin(((phase-0.3)/0.3) * Math.PI) * 32;
    else if (phase < 0.9)   py = groundY - Math.sin(((phase-0.6)/0.3) * Math.PI) * 42;
    else                     py = groundY;
    // Sparkle on each jump
    const jumpPhase = phase % 0.3;
    if (jumpPhase < 0.05 && phase < 0.9) {
      const sp = jumpPhase / 0.05;
      ctx.fillStyle = 'rgba(251,191,36,0.85)';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a)*sp*10, py + 7 + Math.sin(a)*sp*6, 2, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.fillStyle = '#34d399'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  echoStrike(ctx, t) {
    const phase = (t % 1500) / 1500;
    const cy = CH / 2 + 2, originX = 16;
    ctx.fillStyle = '#fb7185'; ctx.fillRect(originX - 6, cy - 13, 12, 14);
    const travel = phase * 1.9;
    const maxX = CW - 10;
    const wx = travel <= 1 ? originX + travel * (maxX - originX) : maxX - (travel - 1) * (maxX - originX);
    const goingRight = travel <= 1;
    const sa = goingRight ? -Math.PI * 0.5 : Math.PI * 0.5;
    const ea = goingRight ?  Math.PI * 0.5 : Math.PI * 1.5;
    ctx.strokeStyle = 'rgba(251,113,133,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(wx, cy, 10, sa, ea); ctx.stroke();
    ctx.strokeStyle = 'rgba(251,113,133,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(wx, cy, 17, sa, ea); ctx.stroke();
  },
};

let cardAnimCanvases = []; // { ctx2d, id }

function tickCardAnimations(ts) {
  for (const { canvas, ctx2d, id } of cardAnimCanvases) {
    ctx2d.clearRect(0, 0, CW, CH);
    const fn = CARD_ANIMS[id];
    if (fn) fn(ctx2d, ts);
  }
}

// ─────────────────────────────────────────────────────────────────
//  POWER SELECT UI  (DOM-based)
// ─────────────────────────────────────────────────────────────────
function buildPickSlots() {
  const p1Container = document.getElementById('p1Picks');
  const p2Container = document.getElementById('p2Picks');
  const p1Keys = P1_ABILITY_KEYS.slice(0, maxPicks).map(k => k.replace('Key', ''));
  const p2Keys = P2_ABILITY_KEYS.slice(0, maxPicks).map(k => k.replace('Key', ''));
  function html(keys) {
    return keys.map(k => `<div class="pick-slot"><span class="slot-key">${k}</span><span class="slot-name">—</span></div>`).join('');
  }
  p1Container.innerHTML = html(p1Keys);
  p2Container.innerHTML = html(p2Keys);
}

function drawPowerSelectGrid() {
  // Show 10 cards normally, 15 for deathmatch (more variety for 5 picks)
  const cardCount = gameMode === 'deathmatch' ? 15 : 10;
  const shuffled = [...ALL_POWERUPS].sort(() => Math.random() - 0.5);
  drawnPowerups = shuffled.slice(0, cardCount);

  powerGrid.innerHTML = '';
  cardAnimCanvases = [];
  for (let i = 0; i < drawnPowerups.length; i++) {
    const pu   = drawnPowerups[i];
    const card = document.createElement('div');
    card.className    = 'power-card';
    card.dataset.index = i;

    const cdText = pu.cooldown ? `<div class="card-cd">Cooldown: ${pu.cooldown/1000}s</div>` : '';
    card.innerHTML = `
      <canvas class="card-anim" width="${CW}" height="${CH}"></canvas>
      <div class="card-name">${pu.name}</div>
      <span class="card-type ${pu.type}">${pu.type}</span>
      <div class="card-desc">${pu.desc}</div>
      ${cdText}
    `;
    const cvs = card.querySelector('.card-anim');
    cardAnimCanvases.push({ canvas: cvs, ctx2d: cvs.getContext('2d'), id: pu.id });
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
  const p1KeyLabels = P1_ABILITY_KEYS.slice(0, maxPicks).map(k => k.replace('Key', ''));
  const p2KeyLabels = P2_ABILITY_KEYS.slice(0, maxPicks).map(k => k.replace('Key', ''));
  updatePickSlots('p1Picks', p1SelectedIds, p1KeyLabels);
  updatePickSlots('p2Picks', p2SelectedIds, p2KeyLabels);

  p1StatusEl.textContent = p1Confirmed
    ? '✓ Ready!'
    : `Pick ${maxPicks} powers (${p1SelectedIds.length}/${maxPicks})`;
  p2StatusEl.textContent = p2Confirmed
    ? '✓ Ready!'
    : `Pick ${maxPicks} powers (${p2SelectedIds.length}/${maxPicks})`;
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
  const cardCount = drawnPowerups.length;
  const p1dx = p1SelectMove();
  const p1dy = p1SelectMoveRow();
  if (p1dx !== 0) p1SelectCursor = (p1SelectCursor + p1dx + cardCount) % cardCount;
  if (p1dy !== 0) p1SelectCursor = Math.max(0, Math.min(cardCount - 1, p1SelectCursor + p1dy));

  // P2 cursor movement
  const p2dx = p2SelectMove();
  const p2dy = p2SelectMoveRow();
  if (p2dx !== 0) p2SelectCursor = (p2SelectCursor + p2dx + cardCount) % cardCount;
  if (p2dy !== 0) p2SelectCursor = Math.max(0, Math.min(cardCount - 1, p2SelectCursor + p2dy));

  // P1 pick / confirm
  if (p1SelectConfirm()) {
    const id = drawnPowerups[p1SelectCursor].id;
    if (!p1Confirmed) {
      if (p1SelectedIds.includes(id)) {
        p1SelectedIds = p1SelectedIds.filter(x => x !== id);
      } else if (p1SelectedIds.length < maxPicks) {
        p1SelectedIds.push(id);
      }
      if (p1SelectedIds.length === maxPicks) {
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
      } else if (p2SelectedIds.length < maxPicks) {
        p2SelectedIds.push(id);
      }
      if (p2SelectedIds.length === maxPicks) {
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

function selectLoop(ts) {
  handlePowerSelectInput();
  tickCardAnimations(ts);
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
  updatePassiveEffects(player1, player2);
  updatePassiveEffects(player2, player1);
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
  updatePushEffects(dt);
  updateEchoWaves(now);
  updateWalls(now);
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
  [titleScreen, powerSelectScreen, gameScreen, gameOverScreen, roundOverScreen].forEach(s => {
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
      gameMode = 'normal';
      maxPicks = 3;
      break;

    case 'POWER_SELECT': {
      // Update header/hint text for mode
      const selectTitleEl = document.getElementById('selectTitle');
      const slotHintEl    = document.getElementById('slotHint');
      if (gameMode === 'deathmatch') {
        selectTitleEl.textContent = 'Choose Your Powers (5 each)';
        slotHintEl.textContent    = '1st→B/Z  ·  2nd→N/X  ·  3rd→M/C  ·  4th→V/K  ·  5th→G/L';
      } else {
        selectTitleEl.textContent = 'Choose Your Powers';
        slotHintEl.textContent    = '1st pick → slot B/Z  ·  2nd → N/X  ·  3rd → M/C';
      }
      // Reset selection state
      p1SelectCursor = 0; p2SelectCursor = 0;
      p1SelectedIds = []; p2SelectedIds = [];
      p1Confirmed   = false; p2Confirmed = false;
      if (readyTimer) { clearInterval(readyTimer); readyTimer = null; }
      selectReadyMsg.classList.add('hidden');
      showScreen(powerSelectScreen);
      buildPickSlots();
      drawPowerSelectGrid();
      updatePowerSelectCursors();
      selectRafId = requestAnimationFrame(selectLoop);
      break;
    }

    case 'GAMEPLAY':
      PLATFORMS = generatePlatforms(); // index 0 = P2 spawn, index 1 = P1 spawn
      player1 = createPlayer(1, 1, p1SelectedIds);
      player2 = createPlayer(2, 0, p2SelectedIds);
      temporaryPlatforms = [];
      walls = [];
      echoWaves = [];
      pushEffects = [];
      updateCamera();
      showScreen(gameScreen);
      startGameLoop();
      break;

    case 'GAME_OVER': {
      const isP1Win = winnerNum === 1;
      const winColor = isP1Win ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'linear-gradient(135deg,#f97316,#ef4444)';

      if (gameMode === 'tournament') {
        currentRound++;
        if (isP1Win) p1RoundWins++; else p2RoundWins++;
        p1WinsDisplay.textContent = p1RoundWins;
        p2WinsDisplay.textContent = p2RoundWins;

        if (p1RoundWins >= 3 || p2RoundWins >= 3) {
          // Tournament champion — show final game over screen
          showScreen(gameOverScreen);
          winnerText.textContent = `Player ${winnerNum} Wins the Tournament!`;
          winnerText.style.background = winColor;
          winnerText.style['-webkit-background-clip'] = 'text';
          winnerText.style['-webkit-text-fill-color'] = 'transparent';
          finalStats.innerHTML = `<div>Final score — P1: ${p1RoundWins} wins &nbsp;|&nbsp; P2: ${p2RoundWins} wins</div>`;
        } else {
          // Round over — show round screen
          roundWinnerText.textContent = `Player ${winnerNum} wins Round ${currentRound}!`;
          roundWinnerText.style.background = winColor;
          roundWinnerText.style['-webkit-background-clip'] = 'text';
          roundWinnerText.style['-webkit-text-fill-color'] = 'transparent';
          showScreen(roundOverScreen);
        }
      } else {
        showScreen(gameOverScreen);
        winnerText.textContent = `Player ${winnerNum} Wins!`;
        winnerText.style.background = winColor;
        winnerText.style['-webkit-background-clip'] = 'text';
        winnerText.style['-webkit-text-fill-color'] = 'transparent';
        finalStats.innerHTML = `
          <div>Player 1 powers: ${p1SelectedIds.map(id => ALL_POWERUPS.find(p=>p.id===id)?.name).join(', ')}</div>
          <div>Player 2 powers: ${p2SelectedIds.map(id => ALL_POWERUPS.find(p=>p.id===id)?.name).join(', ')}</div>
        `;
      }
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  BUTTON LISTENERS
// ─────────────────────────────────────────────────────────────────
function quickStart() {
  const shuffled = [...ALL_POWERUPS].sort(() => Math.random() - 0.5);
  const pool = shuffled.slice(0, Math.max(10, maxPicks * 2));
  const pickN = () => [...pool].sort(() => Math.random() - 0.5).slice(0, maxPicks).map(p => p.id);
  p1SelectedIds = pickN();
  p2SelectedIds = pickN();
  transitionTo('GAMEPLAY');
}

startBtn.addEventListener('click', () => {
  gameMode = 'normal'; maxPicks = 3;
  transitionTo('POWER_SELECT');
});
quickStartBtn.addEventListener('click', () => {
  gameMode = 'normal'; maxPicks = 3;
  quickStart();
});
tournamentBtn.addEventListener('click', () => {
  gameMode = 'tournament'; maxPicks = 3;
  p1RoundWins = 0; p2RoundWins = 0; currentRound = 0;
  transitionTo('POWER_SELECT');
});
deathMatchBtn.addEventListener('click', () => {
  gameMode = 'deathmatch'; maxPicks = 5;
  transitionTo('POWER_SELECT');
});
replayBtn.addEventListener('click', () => {
  if (gameMode === 'tournament') {
    // New tournament — reset score
    p1RoundWins = 0; p2RoundWins = 0; currentRound = 0;
  }
  transitionTo('POWER_SELECT');
});
menuBtn.addEventListener('click', () => transitionTo('TITLE'));
nextRoundBtn.addEventListener('click', () => transitionTo('GAMEPLAY'));
tournamentMenuBtn.addEventListener('click', () => transitionTo('TITLE'));

// ─────────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────────
initInput();
transitionTo('TITLE');
