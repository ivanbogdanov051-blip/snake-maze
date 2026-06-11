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
const longMatchBtn             = document.getElementById('longMatchBtn');
const longMatchSettingsScreen  = document.getElementById('longMatchSettingsScreen');
const lmRoundScreen            = document.getElementById('lmRoundScreen');
const lmRoundTitleEl           = document.getElementById('lmRoundTitle');
const lmPickMsgEl              = document.getElementById('lmPickMsg');
const lmNextBtn                = document.getElementById('lmNextBtn');
const lmRoundMenuBtn           = document.getElementById('lmRoundMenuBtn');
const lmP1WinsEl               = document.getElementById('lmP1Wins');
const lmP2WinsEl               = document.getElementById('lmP2Wins');
const botMatchBtn     = document.getElementById('botMatchBtn');
const setGameBtn      = document.getElementById('setGameBtn');
const fourPlayerBtn   = document.getElementById('fourPlayerBtn');
const setGameScreen   = document.getElementById('setGameScreen');
const fourPScreen     = document.getElementById('fourPScreen');
const fourPTitle      = document.getElementById('fourPTitle');
const fourPSubtitle   = document.getElementById('fourPSubtitle');
const fourPNextBtn    = document.getElementById('fourPNextBtn');
const fourPMenuBtn    = document.getElementById('fourPMenuBtn');

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

// Ability key slots — indexed by slot (0-6)
const P1_ABILITY_KEYS = ['KeyB','KeyN','KeyM','KeyV','KeyG','KeyH','KeyT'];
const P2_ABILITY_KEYS = ['KeyZ','KeyX','KeyC','KeyK','KeyL','KeyO','KeyP'];
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
  { id: 'doubleJump',  name: 'Double Jump',  desc: 'Jump again in the air with a fast horizontal burst', type: 'passive' },
  { id: 'highJump',    name: 'High Jump',     desc: '40% higher jumps',                  type: 'passive' },
  { id: 'superPush',   name: 'Super Push',    desc: 'Push force 2.5×',                  type: 'passive' },
  { id: 'heavy',       name: 'Heavy',         desc: 'Harder to push, slightly slower',   type: 'passive' },
  { id: 'featherFall', name: 'Feather Fall',  desc: 'Fall much slower',                  type: 'passive' },
  { id: 'shield',      name: 'Shield',        desc: '2 s push immunity',                 type: 'active', cooldown: 12000 },
  { id: 'speedBoost',  name: 'Speed Boost',   desc: 'Always +40% movement speed',        type: 'passive' },
  { id: 'groundSlam',  name: 'Ground Slam',   desc: 'Auto-slams opponent on fast fall',  type: 'passive' },
  { id: 'dash',        name: 'Dash',          desc: 'Dash to the furthest platform in your facing direction', type: 'active', cooldown:  5000 },
  { id: 'teleport',    name: 'Teleport',      desc: "Teleport to your opponent's platform", type: 'active', cooldown: 15000 },
  { id: 'grapple',     name: 'Grapple Hook',  desc: 'Pull yourself to nearest platform', type: 'active', cooldown: 10000 },
  { id: 'windBlast',   name: 'Wind Blast',    desc: 'Aura constantly pushes opponent',   type: 'passive' },
  { id: 'magnet',      name: 'Magnet',        desc: 'Aura constantly pulls opponent',    type: 'passive' },
  { id: 'fakeFloor',     name: 'Fake Floor',      desc: 'Passive: auto-spawn a 5s platform when near the void (10s cooldown)', type: 'passive' },
  { id: 'lightningSpawn',name: 'Lightning Spawn', desc: 'Strike a platform near the opponent with lightning, removing it for 5s', type: 'active', cooldown: 2500 },
  { id: 'thunder',       name: 'Thunder',        desc: 'Make the nearest enemy platform fake — collapses on touch (5s)',          type: 'active', cooldown: 10000 },
  { id: 'echoStrike',  name: 'Echo Strike',   desc: 'Push wave bounces off walls (×3)',  type: 'active', cooldown: 10000 },
  { id: 'echoBurst',   name: 'Echo Burst',    desc: 'Echo Strike also fires a wave upward', type: 'passive' },
  { id: 'gravityFlip', name: 'Gravity Flip',  desc: 'Reverse gravity for 2.5 s',         type: 'active', cooldown: 14000 },
  { id: 'ghost',       name: 'Ghost',         desc: 'Immune to all pushes for 2 s',      type: 'active', cooldown:  9000 },
  { id: 'repulse',     name: 'Repulse',       desc: '360° mega push burst',              type: 'active', cooldown: 11000 },
  { id: 'iceAura',     name: 'Ice Aura',      desc: 'Slows opponent when nearby',        type: 'passive' },
  { id: 'tripleJump',  name: 'Triple Jump',   desc: '2 extra air jumps',                 type: 'passive' },
  { id: 'wallSpawn',   name: 'Wall Spawn',    desc: 'Spawn a solid wall (7 s)',           type: 'active', cooldown: 15000 },
  { id: 'infiniteJump',name: 'Infinite Jump', desc: 'Jump non-stop for 3.5 s',           type: 'active', cooldown: 14000 },
  { id: 'arrowShot',   name: 'Arrow Shot',   desc: 'Shoot a fast arrow that pushes your opponent', type: 'active', cooldown: 8000 },
  { id: 'freezeRay',   name: 'Freeze Ray',   desc: 'Shoot a slow beam; freezes opponent 3-4 s on hit', type: 'active', cooldown: 12000 },
  { id: 'archery',     name: 'Archery',      desc: 'Passive: every active ability you use also fires an arrow', type: 'passive' },
  { id: 'swap',        name: 'Swap',         desc: 'Instantly swap positions with opponent (once per match!)', type: 'active', cooldown: 9999000 },
  { id: 'phase',       name: 'Phase',        desc: 'Teleport on top of the wall directly above you', type: 'active', cooldown: 8000 },
  { id: 'homing',     name: 'Homing',       desc: 'All your projectiles home toward the opponent (disappear after 2s)', type: 'passive' },
  { id: 'lifeSteal',  name: 'Life Steal',   desc: 'Steal a life when you kill the opponent (10-15s cooldown)', type: 'passive' },

  // ── 20 NEW ABILITIES ──
  // Passives
  { id: 'ironSkin',     name: 'Iron Skin',     desc: 'Receive 35% less push force',                              type: 'passive' },
  { id: 'thorns',       name: 'Thorns',        desc: 'Counter-push attacker at 40% force when you get pushed',  type: 'passive' },
  { id: 'reboundJump',  name: 'Rebound Jump',  desc: 'Getting pushed refills 1 free air jump',                  type: 'passive' },
  { id: 'adrenaline',   name: 'Adrenaline',    desc: '60% faster movement when at 1 life',                      type: 'passive' },
  { id: 'lastStand',    name: 'Last Stand',    desc: 'Pushes deal 50% more force when at 1 life',               type: 'passive' },
  { id: 'momentum',     name: 'Momentum',      desc: 'Your push force scales with your speed (up to +60%)',     type: 'passive' },
  { id: 'springLegs',   name: 'Spring Legs',   desc: 'Bounce off platforms when landing from a fast fall',      type: 'passive' },
  { id: 'vampiricAura', name: 'Vampiric Aura', desc: 'Continuously drain velocity from nearby opponent',        type: 'passive' },
  { id: 'extraLife',    name: 'Extra Life',    desc: 'Start the round with 1 extra life',                       type: 'passive' },
  { id: 'counterstrike',name: 'Counterstrike', desc: 'On death: blast the opponent with a final explosion',     type: 'passive' },
  { id: 'rage',         name: 'Rage',          desc: 'Getting hit: 3s of boosted stats, then 2s slow',          type: 'passive' },
  { id: 'perfectHit',   name: 'Perfect Hit',   desc: 'Hitting with Arrow Shot instantly resets its cooldown',   type: 'passive' },
  // Actives
  { id: 'timeSlow',     name: 'Time Slow',     desc: 'Halve opponent speed for 3 s',                            type: 'active', cooldown: 12000 },
  { id: 'anchor',       name: 'Anchor',        desc: "Root opponent to the ground — can't jump for 3 s",        type: 'active', cooldown: 11000 },
  { id: 'vortex',       name: 'Vortex',        desc: 'Invert opponent left/right controls for 3 s',             type: 'active', cooldown: 10000 },
  { id: 'empBurst',     name: 'EMP Burst',     desc: 'Disable all opponent active abilities for 6 s',           type: 'active', cooldown: 18000 },
  { id: 'mine',         name: 'Land Mine',     desc: 'Drop a hidden mine that explodes on opponent contact',    type: 'active', cooldown:  8000 },
  { id: 'pulseExpand',  name: 'Pulse Wave',    desc: '360° expanding ring that deals a heavy push on contact',  type: 'active', cooldown:  9000 },
  { id: 'springboard',  name: 'Springboard',   desc: 'Drop a spring platform that launches whoever touches it', type: 'active', cooldown: 12000 },
  { id: 'blackHole',    name: 'Black Hole',    desc: 'Pull both players toward a central point for 3 s',        type: 'active', cooldown: 16000 },
  { id: 'chainLightning',name:'Chain Lightning',desc:'Fire a chain of lightning that deals a massive push',     type: 'active', cooldown:  8000 },
  { id: 'stunBlast',    name: 'Stun Blast',    desc: 'Stun the opponent — fully immobilised for 1.5 s',         type: 'active', cooldown: 13000 },
];

// ─────────────────────────────────────────────────────────────────
//  PLATFORM MAP  (generated randomly each game)
// ─────────────────────────────────────────────────────────────────
let PLATFORMS = [];

function generatePlatforms() {
  const all = [];
  // [0] P2 left spawn, [1] P1 right spawn
  // Spawn Y is fixed here; Long Match GAMEPLAY case overrides it after this call.
  all.push({ x:  55, y: 510, w: 145, h: 20, isSpawn: true });
  all.push({ x: 1000, y: 510, w: 145, h: 20, isSpawn: true });

  // Randomise tier structure every call so each map looks distinctly different.
  // Each tier picks: Y band, platform count.
  const r = () => Math.random();
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1)); // inclusive int in [a,b]

  const tiers = [
    { yMin: ri(60, 120),  yMax: ri(160, 220), count: ri(2, 4) },  // high tier
    { yMin: ri(230, 270), yMax: ri(330, 390), count: ri(3, 5) },  // mid tier
    { yMin: ri(370, 410), yMax: ri(460, 500), count: ri(3, 5) },  // low tier
  ];

  for (const { yMin, yMax, count } of tiers) {
    const sectionW = WORLD_W / (count + 1);
    for (let i = 0; i < count; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 60 && !placed; attempt++) {
        const w  = ri(70, 180);
        const cx = sectionW * (i + 1) + (r() - 0.5) * sectionW * 0.8;
        const x  = Math.round(cx - w / 2);
        const y  = Math.round(yMin + r() * (yMax - yMin));

        if (x < 15 || x + w > WORLD_W - 15) continue;

        let bad = false;
        for (const p of all) {
          if (Math.abs(y - p.y) < 38 && x < p.x + p.w + 22 && x + w > p.x - 22) {
            bad = true; break;
          }
        }
        if (!bad) { all.push({ x, y, w, h: 20, rotation: (Math.random() - 0.5) * (Math.PI / 9) }); placed = true; }
      }
    }
  }

  return all;
}

// Temporary fake-floor platforms
let temporaryPlatforms = [];

// Lightning effects (platform removals)
let lightningEffects = [];

// Spawned solid walls
let walls = [];

// Echo-strike projectiles
let echoWaves = [];

// Arrow projectiles (arrowShot ability + archery passive)
let arrowProjectiles = [];

// Freeze ray projectiles
let freezeRayProjectiles = [];

// Push visual effects
let pushEffects = [];

// Land mines
let mines = [];
// Springboard platforms
let springboards = [];
// Black holes
let blackHoles = [];
// Pulse waves (expanding rings)
let pulseWaves = [];
// Counterstrike death projectiles
let counterstrikeProjectiles = [];

// Custom game settings (used by Set Game mode)
let customSettings = { lives: 3, picks: 3, botOpponent: false, botDifficulty: 'medium', botAutoPick: false, poolSize: Infinity };

function buildSlotHint(n) {
  const p1k = P1_ABILITY_KEYS.slice(0, n).map(k => k.replace('Key', ''));
  const p2k = P2_ABILITY_KEYS.slice(0, n).map(k => k.replace('Key', ''));
  return p1k.map((k, i) => `${i + 1}→${k}/${p2k[i]}`).join('  ·  ');
}

// 4-player tournament state
let fpState = {
  active: false,
  matchNum: 0,          // 0 = semi1, 1 = semi2, 2 = final
  semiWinner1: null,    // 1 or 2 (control slot that won semi1)
  semiWinner2: null,    // 1 or 2 (control slot that won semi2)
  allIds: [[], [], [], []], // power IDs for P1..P4
};

// Long Match state
let lmState = {
  winsNeeded:    5,
  livesPerRound: 1,
  poolSize:      15,
  botOpponent:   false,
  botDifficulty: 'medium',
  p1Wins: 0, p2Wins: 0,
  p1Abilities: [], p2Abilities: [],
  loserNum:  null,
  pickerNum: null,
};

// Bot input state
let botInput = { left: false, right: false, jump: false, push: false };
let botJumpCooldown  = 0;
let botAbilityClock  = 0;

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
let gameMode    = 'normal'; // 'normal' | 'tournament' | 'deathmatch' | 'bot' | 'setgame' | 'fourplayer'
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
//  AUDIO SYSTEM  (Web Audio API — fully procedural, no files)
// ─────────────────────────────────────────────────────────────────
let _ac = null, _sfxG = null, _musG = null;
let _muted = false, _musicTrack = '', _musicTimer = null, _audioReady = false;
let _titleIdx = 0, _gameIdx = 0;
let _masterVol = 0.5; // 0–1; slider default 50 %

function _ensureAC() {
  if (_ac) { if (_ac.state === 'suspended') _ac.resume(); return true; }
  try {
    _ac   = new (window.AudioContext || window.webkitAudioContext)();
    _sfxG = _ac.createGain(); _sfxG.gain.value = _muted ? 0 : _masterVol * 0.9;  _sfxG.connect(_ac.destination);
    _musG = _ac.createGain(); _musG.gain.value = _muted ? 0 : _masterVol * 0.34; _musG.connect(_ac.destination);
    return true;
  } catch (e) { return false; }
}

function _osc(f, type, t0, dur, g, dest) {
  if (!_ac || f === 0) return;
  const o = _ac.createOscillator(), gn = _ac.createGain();
  o.connect(gn); gn.connect(dest || _sfxG);
  o.type = type; o.frequency.value = f;
  gn.gain.setValueAtTime(g, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function _slide(f1, f2, type, t0, dur, g) {
  if (!_ac) return;
  const o = _ac.createOscillator(), gn = _ac.createGain();
  o.connect(gn); gn.connect(_sfxG);
  o.type = type;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  gn.gain.setValueAtTime(g, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

// ── Sound effects ──
function sfxJump()      { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(200,390,'square',   t,.11,.22); }
function sfxDJump()     { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(300,720,'square',   t,.09,.22); _slide(440,920,'triangle',t+.04,.10,.14); }
function sfxLand()      { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(110,50, 'sine',     t,.06,.26); }
function sfxPush()      { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(260,65, 'sawtooth', t,.16,.28); }
function sfxDash()      { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(160,540,'sawtooth', t,.09,.24); _slide(120,400,'sine',t+.02,.11,.13); }
function sfxArrowHit()  { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(700,140,'sawtooth', t,.10,.26); }
function sfxFreezeHit() { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(900,180,'triangle', t,.28,.20); [900,1200,1500].forEach((f,i)=>_osc(f,'sine',t+i*.04,.07,.08)); }
function sfxSwap()      { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(160,800,'sine',t,.09,.20); _slide(800,160,'sine',t+.09,.09,.20); }
function sfxAbility()   { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(380,760,'triangle', t,.13,.16); _osc(600,'sine',t+.07,.08,.09); }
function sfxPickCard()  { if (!_ensureAC()) return; const t=_ac.currentTime; _osc(523,'triangle',t,.06,.17); _osc(659,'triangle',t+.06,.07,.14); }
function sfxRespawn()   { if (!_ensureAC()) return; const t=_ac.currentTime; [261,329,392,523].forEach((f,i)=>_osc(f,'triangle',t+i*.07,.10,.18)); }
function sfxDeath()     { if (!_ensureAC()) return; const t=_ac.currentTime; [440,330,220,110].forEach((f,i)=>_osc(f,'square',  t+i*.09,.09,.24)); }
function sfxLifeSteal() { if (!_ensureAC()) return; const t=_ac.currentTime; [330,415,523,415,523,659].forEach((f,i)=>_osc(f,'triangle',t+i*.055,.08,.17)); }
function sfxWin()       { if (!_ensureAC()) return; const t=_ac.currentTime; [523,659,784,1047].forEach((f,i)=>_osc(f,'triangle',t+i*.13,.18,.27)); _osc(1047,'triangle',t+.52,.35,.30); }
function sfxThunder()   { if (!_ensureAC()) return; const t=_ac.currentTime; _slide(900,80,'sawtooth',t,.06,.20); _slide(350,55,'sawtooth',t+.04,.18,.32); _slide(90,35,'sawtooth',t+.07,.25,.55); }

function toggleMute() {
  _muted = !_muted;
  if (_sfxG) _sfxG.gain.value = _muted ? 0 : _masterVol * 0.9;
  if (_musG) _musG.gain.value = _muted ? 0 : _masterVol * 0.34;
  const btn = document.getElementById('muteBtn');
  if (btn) btn.textContent = _muted ? '🔇' : '🔊';
}

// ── Background music (looping note sequencer) ──
function _mn(f,d,t) { if(_ac&&f>0) _osc(f,'triangle',t,d*.87,.09,_musG); }
function _mb(f,d,t) { if(_ac&&f>0) _osc(f,'sawtooth', t,d*.70,.06,_musG); }

function _sched(pat,t0,fn) { let t=t0; for(const[f,d]of pat){fn(f,d,t);t+=d;} return t; }
function _plen(pat) { return pat.reduce((s,[,d])=>s+d,0); }

// Title tracks (3 variants)
const _TITLE_TRACKS = [
  // 1: E minor, 16 beats × 0.45 s
  { b: 0.45,
    mel: [[392,1],[440,1],[523,1],[440,1],[392,2],[329,1],[392,1],
          [440,1],[523,1],[587,1],[523,1],[440,2],[0,1],[329,1]],
    bas: [[196,1],[0,1],[247,1],[0,1],[164,1],[0,1],[196,1],[0,1]] },
  // 2: C major, 16 beats × 0.40 s
  { b: 0.40,
    mel: [[523,1],[659,1],[784,2],[659,1],[523,1],[587,1],[659,1],
          [784,1],[880,1],[784,1],[659,2],[0,1],[587,1],[523,1]],
    bas: [[131,1],[0,1],[196,1],[0,1],[175,1],[0,1],[196,1],[0,1]] },
  // 3: A minor, 16 beats × 0.50 s
  { b: 0.50,
    mel: [[440,1],[523,1],[659,1],[880,2],[784,1],[659,1],[587,1],
          [659,1],[698,1],[659,1],[523,2],[494,1],[440,1],[0,1]],
    bas: [[110,1],[0,1],[165,1],[0,1],[147,1],[0,1],[165,1],[0,1]] },
  // 4: G major, 16 beats × 0.42 s
  { b: 0.42,
    mel: [[392,1],[494,1],[587,2],[494,1],[392,1],[440,1],[494,1],
          [587,1],[784,2],[659,1],[587,1],[494,2],[392,1]],
    bas: [[196,1],[0,1],[294,1],[0,1],[262,1],[0,1],[294,1],[0,1]] },
  // 5: F major, 16 beats × 0.44 s
  { b: 0.44,
    mel: [[349,1],[440,1],[523,2],[440,1],[349,1],[392,1],[440,1],
          [523,1],[698,2],[587,1],[523,1],[440,2],[349,1]],
    bas: [[175,1],[0,1],[262,1],[0,1],[220,1],[0,1],[262,1],[0,1]] },
].map(tr => ({ mel: tr.mel.map(([f,n])=>[f,n*tr.b]), bas: tr.bas.map(([f,n])=>[f,n*tr.b]) }));

// Game tracks (3 variants)
const _GAME_TRACKS = [
  // 1: E minor driving, 32 beats × 0.30 s
  { b: 0.30,
    mel: [[329,1],[392,1],[493,1],[659,1],[493,1],[392,1],[329,1],[294,1],
          [329,2],[0,1],[247,1],[294,1],[329,1],[392,2],
          [440,1],[392,1],[329,1],[294,1],[329,2],[0,2],
          [329,1],[392,1],[440,1],[493,2],[440,1],[392,1],[329,1]],
    bas: [[82,1],[0,1],[82,1],[0,1],[110,1],[0,1],[110,1],[0,1],
          [124,1],[0,1],[124,1],[0,1],[98,1],[0,1],[98,1],[0,1]] },
  // 2: D minor intense, 32 beats × 0.28 s
  { b: 0.28,
    mel: [[587,1],[698,1],[880,1],[698,1],[587,1],[523,1],[587,1],[523,1],
          [587,2],[0,1],[698,1],[880,1],[698,1],[784,2],
          [880,1],[784,1],[698,1],[587,1],[698,2],[0,2],
          [587,1],[698,1],[784,1],[880,2],[784,1],[698,1],[587,1]],
    bas: [[73,1],[0,1],[73,1],[0,1],[110,1],[0,1],[110,1],[0,1],
          [131,1],[0,1],[131,1],[0,1],[98,1],[0,1],[98,1],[0,1]] },
  // 3: G major heroic, 32 beats × 0.28 s
  { b: 0.28,
    mel: [[392,1],[494,1],[587,1],[784,2],[587,1],[494,1],[392,1],
          [494,1],[587,1],[659,1],[784,2],[659,1],[587,1],[494,1],
          [392,1],[440,1],[494,1],[587,1],[659,1],[784,1],[880,1],[784,1],
          [587,2],[494,1],[392,1],[0,2],[494,1],[587,1]],
    bas: [[98,1],[0,1],[98,1],[0,1],[147,1],[0,1],[147,1],[0,1],
          [131,1],[0,1],[131,1],[0,1],[147,1],[0,1],[147,1],[0,1]] },
  // 4: C minor intense, 32 beats × 0.27 s
  { b: 0.27,
    mel: [[523,1],[622,1],[784,1],[622,1],[523,1],[466,1],[523,1],[622,1],
          [523,2],[0,1],[622,1],[784,1],[622,1],[784,2],
          [932,1],[784,1],[622,1],[523,1],[622,2],[0,2],
          [523,1],[622,1],[784,1],[932,2],[784,1],[622,1],[523,1]],
    bas: [[131,1],[0,1],[131,1],[0,1],[165,1],[0,1],[165,1],[0,1],
          [175,1],[0,1],[175,1],[0,1],[155,1],[0,1],[155,1],[0,1]] },
  // 5: A major energetic, 32 beats × 0.25 s
  { b: 0.25,
    mel: [[440,1],[554,1],[659,1],[880,1],[659,1],[554,1],[440,1],[494,1],
          [440,2],[0,1],[554,1],[659,1],[554,1],[659,2],
          [880,1],[784,1],[659,1],[554,1],[659,2],[0,2],
          [440,1],[554,1],[659,1],[880,2],[784,1],[659,1],[554,1]],
    bas: [[110,1],[0,1],[110,1],[0,1],[165,1],[0,1],[165,1],[0,1],
          [147,1],[0,1],[147,1],[0,1],[123,1],[0,1],[123,1],[0,1]] },
].map(tr => ({ mel: tr.mel.map(([f,n])=>[f,n*tr.b]), bas: tr.bas.map(([f,n])=>[f,n*tr.b]) }));

function _loopTitle() {
  if (!_ac || _musicTrack !== 'title') return;
  const { mel, bas } = _TITLE_TRACKS[_titleIdx];
  const t = _ac.currentTime;
  _sched(mel, t, _mn);
  const bl = _plen(bas);
  _sched(bas, t,    _mb);
  _sched(bas, t+bl, _mb);
  _musicTimer = setTimeout(_loopTitle, (_plen(mel) - 0.12) * 1000);
}
function _loopGame() {
  if (!_ac || _musicTrack !== 'game') return;
  const { mel, bas } = _GAME_TRACKS[_gameIdx];
  const t  = _ac.currentTime;
  _sched(mel, t, _mn);
  const ml = _plen(mel), bl = _plen(bas);
  for (let off = 0; off < ml - 0.05; off += bl) _sched(bas, t + off, _mb);
  _musicTimer = setTimeout(_loopGame, (ml - 0.12) * 1000);
}
function startMusic(track) {
  if (!_ensureAC()) return;
  if (_musicTrack === track) return;
  stopMusic(); _musicTrack = track;
  if (track === 'title') _loopTitle();
  else if (track === 'game') _loopGame();
  _updateMusicBtn();
}
function stopMusic() {
  if (_musicTimer) { clearTimeout(_musicTimer); _musicTimer = null; }
  _musicTrack = '';
}
function changeMusic() {
  if (!_ensureAC()) return;
  if (!_audioReady) {
    _audioReady = true;
    const track = gameState === 'GAMEPLAY' ? 'game' : 'title';
    _musicTrack = track;
    if (track === 'title') _loopTitle();
    else _loopGame();
    _updateMusicBtn();
    return;
  }
  const curTrack = _musicTrack;
  if (curTrack !== 'title' && curTrack !== 'game') return;

  // Cut pre-scheduled notes immediately by zeroing the music gain
  if (_musG) {
    _musG.gain.cancelScheduledValues(_ac.currentTime);
    _musG.gain.setValueAtTime(0, _ac.currentTime);
  }
  // Kill timer so the old loop can't reschedule
  if (_musicTimer) { clearTimeout(_musicTimer); _musicTimer = null; }
  _musicTrack = '';

  // Advance to next track
  if (curTrack === 'title') _titleIdx = (_titleIdx + 1) % _TITLE_TRACKS.length;
  else _gameIdx = (_gameIdx + 1) % _GAME_TRACKS.length;

  // Tiny gap lets the pre-buffered audio drain, then start fresh
  setTimeout(() => {
    _musicTrack = curTrack;
    _updateMusicBtn();
    if (curTrack === 'title') _loopTitle();
    else _loopGame();
    if (_musG) _musG.gain.setValueAtTime(_muted ? 0 : _masterVol * 0.34, _ac.currentTime);
  }, 80);
}
function _updateMusicBtn() {
  const btn = document.getElementById('changeMusicBtn');
  if (!btn) return;
  const idx   = _musicTrack === 'game' ? _gameIdx   : _titleIdx;
  const total = _musicTrack === 'game' ? _GAME_TRACKS.length : _TITLE_TRACKS.length;
  btn.textContent = `🎵 ${idx + 1}/${total}`;
  _updateSettingsTrackBtns(idx);
}
function _updateSettingsTrackBtns(activeIdx) {
  const idx = activeIdx !== undefined ? activeIdx
    : (_musicTrack === 'game' ? _gameIdx : _titleIdx);
  document.querySelectorAll('.strack-btn').forEach((b, i) => {
    b.classList.toggle('active', i === idx);
  });
}

// ─────────────────────────────────────────────────────────────────
//  INPUT SYSTEM
// ─────────────────────────────────────────────────────────────────
const keys            = {};
const keysJustPressed = {};

function initInput() {
  window.addEventListener('keydown', e => {
    // First interaction: start audio + music
    if (!_audioReady && _ensureAC()) {
      _audioReady = true;
      if (gameState === 'GAMEPLAY') startMusic('game');
      else startMusic('title');
    }
    if (e.code === 'Backquote') { toggleMute(); return; }
    if (!keys[e.code]) keysJustPressed[e.code] = true;
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
  window.addEventListener('mousedown', e => {
    if (e.target.closest('#changeMusicBtn,#muteBtn,#settingsBtn,#settingsPanel')) return;
    if (!_audioReady && _ensureAC()) {
      _audioReady = true;
      if (gameState === 'GAMEPLAY') startMusic('game');
      else startMusic('title');
    }
  });
  document.getElementById('muteBtn')?.addEventListener('click', toggleMute);
  document.getElementById('changeMusicBtn')?.addEventListener('click', changeMusic);

  // Settings panel
  const _settingsPanel = document.getElementById('settingsPanel');
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    if (!_settingsPanel) return;
    const open = _settingsPanel.style.display !== 'none' && _settingsPanel.style.display !== '';
    _settingsPanel.style.display = open ? 'none' : 'flex';
    if (!open) _updateSettingsTrackBtns();
  });
  document.getElementById('settingsCloseBtn')?.addEventListener('click', () => {
    if (_settingsPanel) _settingsPanel.style.display = 'none';
  });
  _settingsPanel?.addEventListener('click', e => {
    if (e.target === _settingsPanel) _settingsPanel.style.display = 'none';
  });
  document.getElementById('volumeSlider')?.addEventListener('input', e => {
    _masterVol = parseInt(e.target.value) / 100;
    if (_sfxG) _sfxG.gain.value = _muted ? 0 : _masterVol * 0.9;
    if (_musG) _musG.gain.value = _muted ? 0 : _masterVol * 0.34;
  });
  document.querySelectorAll('.strack-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const trackIdx = parseInt(btn.dataset.track);
      if (!_ensureAC()) return;
      if (!_audioReady) { _audioReady = true; }
      const curTrack = _musicTrack || (gameState === 'GAMEPLAY' ? 'game' : 'title');
      if (curTrack === 'game') _gameIdx = trackIdx % _GAME_TRACKS.length;
      else _titleIdx = trackIdx % _TITLE_TRACKS.length;
      if (_musicTrack) {
        if (_musG) { _musG.gain.cancelScheduledValues(_ac.currentTime); _musG.gain.setValueAtTime(0, _ac.currentTime); }
        if (_musicTimer) { clearTimeout(_musicTimer); _musicTimer = null; }
        _musicTrack = '';
        setTimeout(() => {
          _musicTrack = curTrack;
          if (curTrack === 'title') _loopTitle(); else _loopGame();
          if (_musG) _musG.gain.setValueAtTime(_muted ? 0 : _masterVol * 0.34, _ac.currentTime);
          _updateMusicBtn();
        }, 80);
      } else {
        _updateMusicBtn();
      }
    });
  });
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
  const baseLives = gameMode === 'setgame'   ? customSettings.lives
                  : gameMode === 'longmatch' ? lmState.livesPerRound
                  : 3;
  const lives = baseLives + (selectedIds.includes('extraLife') ? 1 : 0);
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
    lives,
    maxLives: lives,
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
    frozen: false,
    frozenUntil: 0,
    swapUsed: false,
    dashActive: false,
    dashTargetX: 0,
    dashTargetY: 0,
    dashTrail: [],
    lastHitBy: null,
    lifeStealCooldown: 0,
    lifeStealFlash: 0,
    djBurstTimer: 0,
    djBurstDir: 1,
    djTrail: [],
    // New ability states
    timeSlowed: false,
    timeSlowedExpiry: 0,
    anchored: false,
    anchoredExpiry: 0,
    controlsInverted: false,
    controlsInvertedExpiry: 0,
    empActive: false,
    empExpiry: 0,
    stunned: false,
    stunnedExpiry: 0,
    rageActive: false,
    rageExpiry: 0,
    rageSlowActive: false,
    rageSlowExpiry: 0,
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
  if (player.passives.includes('adrenaline') && player.lives <= 1) spd *= 1.6;
  if (player.rageActive)     spd *= 1.5;
  if (player.rageSlowActive) spd *= 0.45;
  if (player.timeSlowed) spd *= 0.45;

  if (left)  { player.vx -= MOVE_ACCEL; if (player.vx < -spd) player.vx = -spd; player.facingRight = false; }
  if (right) { player.vx += MOVE_ACCEL; if (player.vx >  spd) player.vx =  spd; player.facingRight = true; }

  const friction = player.onGround ? GROUND_FRICTION : MOVE_FRICTION;
  if (!left && !right) player.vx *= friction;
  // dampen overspeed (e.g. after dash/push)
  if (player.vx >  spd * 2.5) player.vx *= 0.92;
  if (player.vx < -spd * 2.5) player.vx *= 0.92;
}

function attemptJump(player) {
  if (player.anchored || player.stunned) return;
  let force = JUMP_FORCE;
  if (player.passives.includes('highJump')) force *= HIGH_JUMP_MULT;
  if (player.rageActive) force *= 1.3;
  if (player.onGround) {
    player.vy = force;
    player.onGround = false;
    sfxJump();
    if (player.passives.includes('tripleJump'))      player.airJumpsLeft = 2;
    else if (player.passives.includes('doubleJump')) player.airJumpsLeft = 1;
    else player.airJumpsLeft = 0;
  } else if (player.airJumpsLeft > 0 || player.infiniteJumpActive) {
    player.vy = force;
    if (!player.infiniteJumpActive) player.airJumpsLeft--;

    // Double Jump only: strong horizontal burst + visual effect
    if (player.passives.includes('doubleJump')) {
      const dir = player.vx !== 0 ? Math.sign(player.vx) : (player.facingRight ? 1 : -1);
      player.vx = dir * MAX_VX * 5.0;
      player.djBurstTimer = 420;
      player.djBurstDir   = dir;
      player.djTrail      = [];
      sfxDJump();
    } else {
      sfxJump();
    }
  }
}

function getAllPlatforms() {
  const now = Date.now();
  return PLATFORMS.filter(p => !p.removedUntil || p.removedUntil <= now)
    .concat(temporaryPlatforms)
    .concat(springboards);
}

function resolveVertical(player) {
  const prevBottom = player.prevY + player.h;
  player.onGround = false;
  const all = getAllPlatforms();
  for (const plat of all) {
    if (plat.rotation) {
      // Rotated platform: compute effective top-surface y at player's center x
      const pcx   = player.x + player.w / 2;
      const cx    = plat.x + plat.w / 2;
      const cy    = plat.y + plat.h / 2;
      const cos   = Math.cos(plat.rotation);
      const sin   = Math.sin(plat.rotation);
      const ph2   = plat.h / 2;
      if (Math.abs(cos) < 0.1) continue;
      const lx = (pcx - cx - ph2 * sin) / cos;
      if (Math.abs(lx) > plat.w / 2 + 4) continue;
      const surfaceY    = cy + lx * sin - ph2 * cos;
      const playerBottom = player.y + player.h;
      const prevPlayerBottom = player.prevY + player.h;
      if (player.vy >= 0 && prevPlayerBottom <= surfaceY + 6 && playerBottom >= surfaceY - 8) {
        const landVy = player.vy;
        player.y = surfaceY - player.h;
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
        if (player.passives.includes('springLegs') && landVy > 14) {
          let jf = JUMP_FORCE;
          if (player.passives.includes('highJump')) jf *= HIGH_JUMP_MULT;
          player.vy = jf * 0.85;
          player.onGround = false;
        }
      }
      continue;
    }
    if (player.x + player.w <= plat.x || player.x >= plat.x + plat.w) continue;
    if (player.y + player.h < plat.y || player.y > plat.y + plat.h) continue;
    if (player.vy >= 0 && prevBottom <= plat.y + 2) {
      const landVy = player.vy;
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
      // Spring Legs: bounce on fast landing
      if (player.passives.includes('springLegs') && landVy > 14) {
        let jf = JUMP_FORCE;
        if (player.passives.includes('highJump')) jf *= HIGH_JUMP_MULT;
        player.vy = jf * 0.85;
        player.onGround = false;
      }
      // Springboard bounce
      if (plat.isSpringboard) {
        let jf = JUMP_FORCE;
        if (player.passives.includes('highJump')) jf *= HIGH_JUMP_MULT;
        player.vy = jf * 2.2;
        player.onGround = false;
        sfxDJump();
      }
    }
  }
}

function resolveHorizontal(player) {
  if (player.vy < 0) return; // moving upward — pass through platforms freely
  const all = getAllPlatforms();
  for (const plat of all) {
    if (plat.rotation) continue; // rotated platforms handled in resolveVertical only
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
  if (target.dashActive) return;
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
  if (pusher.passives.includes('superPush'))                          force *= 2.5;
  if (target.passives.includes('heavy'))                              force *= 0.60;
  if (pusher.passives.includes('momentum'))                           force *= 1 + Math.min(Math.hypot(pusher.vx, pusher.vy) / 20, 0.6);
  if (pusher.passives.includes('lastStand') && pusher.lives <= 1)     force *= 1.5;
  if (target.passives.includes('ironSkin'))                           force *= 0.65;
  if (pusher.rageActive)                                              force *= 1.4;

  target.vx += dir * force;
  target.vy  = Math.min(target.vy - 3, -3);
  target.pushFlashTimer = 250;
  target.lastHitBy = pusher.num;
  sfxPush();

  // Rage: being hit triggers a 3s stat boost followed by 2s slow
  if (target.passives.includes('rage') && !target.rageActive && !target.rageSlowActive) {
    target.rageActive = true;
    target.rageExpiry = ts + 3000;
  }

  // Rebound Jump: being pushed refills 1 air jump
  if (target.passives.includes('reboundJump')) target.airJumpsLeft = Math.max(target.airJumpsLeft, 1);

  // Thorns: counter-push the attacker
  if (target.passives.includes('thorns') && !pusher.ghostActive && !pusher.shieldActive) {
    pusher.vx -= dir * force * 0.4;
    pusher.vy  = Math.min(pusher.vy - 2, -2);
    pusher.pushFlashTimer = 200;
  }

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

function updatePushInputGame(ts) {
  if (p1Down() && player1 && !player1.isDead) tryPush(player1, player2, ts);
  const p2WantsPush = isBotMode() ? botInput.push : p2Down();
  if (p2WantsPush && player2 && !player2.isDead) tryPush(player2, player1, ts);

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
  // Swap is once-per-match
  if (id === 'swap' && player.swapUsed) return;
  // EMP: all active abilities blocked
  if (player.empActive) return;
  player.cooldowns[id] = now + getCooldown(id);

  switch (id) {
    case 'shield':     doShield(player, now);     break;
    case 'speedBoost': doSpeedBoost(player, now); break;
    case 'groundSlam': doGroundSlam(player);      break;
    case 'dash':       doDash(player, opponent);  break;
    case 'teleport':   doTeleport(player, opponent); break;
    case 'grapple':    doGrapple(player);         break;
    case 'windBlast':  doWindBlast(player, opponent, now); break;
    case 'magnet':     doMagnet(player, opponent); break;
    case 'lightningSpawn': doLightningSpawn(player, now);    break;
    case 'thunder':        doThunder(player, now);           break;
    case 'echoStrike':   doEchoStrike(player);               break;
    case 'gravityFlip':  doGravityFlip(player, now);         break;
    case 'ghost':        doGhost(player, now);               break;
    case 'repulse':      doRepulse(player, opponent, ts);    break;
    case 'wallSpawn':    doWallSpawn(player, now);           break;
    case 'infiniteJump': doInfiniteJump(player, now);        break;
    case 'arrowShot':    doArrowShot(player);                break;
    case 'freezeRay':    doFreezeRay(player);                break;
    case 'swap':         doSwap(player, opponent);           break;
    case 'phase':          doPhase(player);                              break;
    case 'timeSlow':       doTimeSlow(player, opponent, now);           break;
    case 'anchor':         doAnchor(player, opponent, now);             break;
    case 'vortex':         doVortex(player, opponent, now);             break;
    case 'empBurst':       doEmpBurst(player, opponent, now);           break;
    case 'mine':           doMine(player, now);                         break;
    case 'pulseExpand':    doPulseExpand(player, opponent, ts);         break;
    case 'springboard':    doSpringboard(player, now);                  break;
    case 'blackHole':      doBlackHole(player, opponent, now);          break;
    case 'chainLightning': doChainLightning(player, opponent, ts);      break;
    case 'stunBlast':      doStunBlast(player, opponent, ts, now);      break;
  }

  // Archery passive: auto-fire an arrow after any active ability (except arrowShot itself)
  if (player.passives.includes('archery') && id !== 'arrowShot') {
    doArrowShot(player);
  }

  // Generic ability sound (dash/swap have their own)
  if (id !== 'dash' && id !== 'swap' && id !== 'thunder') sfxAbility();
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

function doDash(player, opponent) {
  const dir = player.facingRight ? 1 : -1;
  const playerCx = player.x + player.w / 2;
  const oppCx = opponent ? opponent.x + opponent.w / 2 : -9999;

  let best = null, bestDist = 0;
  for (const plat of PLATFORMS) {
    const platCx = plat.x + plat.w / 2;
    if (dir > 0 && platCx <= playerCx) continue;
    if (dir < 0 && platCx >= playerCx) continue;
    const dist = Math.abs(platCx - playerCx);
    if (opponent && !opponent.isDead) {
      const oppOnPlat = oppCx >= plat.x - 10 && oppCx <= plat.x + plat.w + 10 &&
                        opponent.y + opponent.h >= plat.y - 4 && opponent.y + opponent.h <= plat.y + 8;
      if (oppOnPlat) continue;
    }
    if (dist > bestDist) { bestDist = dist; best = plat; }
  }

  if (best) {
    player.dashActive  = true;
    player.dashTargetX = best.x + best.w / 2 - player.w / 2;
    player.dashTargetY = best.y - player.h;
    player.dashTrail   = [];
    player.vx = 0; player.vy = 0;
    sfxDash();
  } else {
    player.vx = dir * 24;
    sfxDash();
  }
}

const DASH_SPEED = 40; // px per frame during animated dash

function updateDash(player) {
  if (!player.dashActive) return;

  // Record ghost position before moving
  player.dashTrail.push({ x: player.x, y: player.y });
  if (player.dashTrail.length > 8) player.dashTrail.shift();

  const dx   = player.dashTargetX - player.x;
  const dy   = player.dashTargetY - player.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= DASH_SPEED) {
    // Landed — snap to target
    player.x         = player.dashTargetX;
    player.y         = player.dashTargetY;
    player.dashActive = false;
    player.vx = 0; player.vy = 0;
    player.onGround   = true;
    player.dashTrail  = [];
    // Landing ring effect
    spawnPushEffect(player, player.facingRight ? 1 : -1, true);
  } else {
    player.x += (dx / dist) * DASH_SPEED;
    player.y += (dy / dist) * DASH_SPEED;
  }
}

function doTeleport(player, opponent) {
  // Teleport to opponent's platform
  if (opponent && !opponent.isDead) {
    const oppCx = opponent.x + opponent.w / 2;
    const oppBottom = opponent.y + opponent.h;
    // Find which platform the opponent is on
    let oppPlat = null;
    for (const plat of getAllPlatforms()) {
      if (oppCx >= plat.x && oppCx <= plat.x + plat.w &&
          Math.abs(oppBottom - plat.y) <= 6) {
        oppPlat = plat; break;
      }
    }
    if (oppPlat) {
      // Land on the opposite side of the opponent on that platform
      const side = opponent.x + opponent.w / 2 > oppPlat.x + oppPlat.w / 2 ? -1 : 1;
      player.x = Math.max(oppPlat.x, Math.min(oppPlat.x + oppPlat.w - player.w,
                  opponent.x + side * (player.w + 8)));
      player.y = oppPlat.y - player.h;
      player.vy = 0;
      player.onGround = true;
      return;
    }
  }
  // Fallback: blink 200px in facing direction
  const dir = player.facingRight ? 1 : -1;
  player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x + dir * 200));
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
  // Only works when near the void
  if (player.y + player.h < VOID_Y - 200) return;
  temporaryPlatforms.push({
    x: player.x - 60,
    y: player.y + player.h + 6,
    w: 180,
    h: 20,
    expiresAt: now + 5000,
    isFake: true,
  });
}

function doLightningSpawn(player, now) {
  const opp = player.num === 1 ? player2 : player1;
  const tx = opp && !opp.isDead ? opp.x + opp.w / 2 : player.x + player.w / 2;
  const ty = opp && !opp.isDead ? opp.y + opp.h     : player.y + player.h;
  // Find nearest platform to the opponent (skip already-removed ones)
  let best = null, bestScore = Infinity;
  for (const p of PLATFORMS) {
    if (p.isSpawn) continue;
    if (p.removedUntil && p.removedUntil > now) continue;
    const px = p.x + p.w / 2;
    const score = Math.abs(px - tx) + Math.abs(p.y - ty) * 0.4;
    if (score < bestScore) { bestScore = score; best = p; }
  }
  if (!best) return;
  best.removedUntil = now + 5000;
  lightningEffects.push({ x: best.x + best.w / 2, y: best.y, w: best.w, startAt: now, expiresAt: now + 5000 });
  sfxAbility();
}

function doThunder(player, now) {
  const opp = player.num === 1 ? player2 : player1;
  if (!opp || opp.isDead) return;
  const ox = opp.x + opp.w / 2;
  const oy = opp.y + opp.h;
  // Find which platform the opponent is currently standing on
  let oppStandingOn = null;
  for (const p of PLATFORMS) {
    if (p.removedUntil && p.removedUntil > now) continue;
    if (Math.abs(oy - p.y) < 6 && opp.x + opp.w > p.x && opp.x < p.x + p.w) {
      oppStandingOn = p; break;
    }
  }
  // Find nearest platform to the opponent that isn't their current one
  let best = null, bestDist = Infinity;
  for (const p of PLATFORMS) {
    if (p === oppStandingOn) continue;
    if (p.isSpawn) continue;
    if (p.removedUntil && p.removedUntil > now) continue;
    if (p.fakePlatformUntil && p.fakePlatformUntil > now) continue;
    const dist = Math.hypot(p.x + p.w / 2 - ox, p.y - oy);
    if (dist < bestDist) { bestDist = dist; best = p; }
  }
  if (!best) return;
  best.fakePlatformUntil = now + 5000;
  sfxThunder();
}

function updateFakePlatforms(now) {
  for (const p of PLATFORMS) {
    if (!p.fakePlatformUntil) continue;
    if (p.fakePlatformUntil <= now) { delete p.fakePlatformUntil; continue; }
    if (p.removedUntil && p.removedUntil > now) continue; // already collapsed
    // Collapse if any player touches it
    for (const pl of [player1, player2]) {
      if (!pl || pl.isDead) continue;
      if (Math.abs(pl.y + pl.h - p.y) < 8 && pl.x + pl.w > p.x + 2 && pl.x < p.x + p.w - 2) {
        p.removedUntil = p.fakePlatformUntil;
        delete p.fakePlatformUntil;
        // Spark the collapse with a brief lightning flash
        lightningEffects.push({ x: p.x + p.w / 2, y: p.y, w: p.w, startAt: now, expiresAt: now + 500 });
        sfxAbility();
        break;
      }
    }
  }
}

function updateLightningEffects(now) {
  lightningEffects = lightningEffects.filter(e => e.expiresAt > now);
  for (const p of PLATFORMS) {
    if (p.removedUntil && p.removedUntil <= now) delete p.removedUntil;
  }
}

function drawLightningEffects() {
  const now = Date.now();
  for (const e of lightningEffects) {
    const elapsed = now - e.startAt;
    const remaining = e.expiresAt - now;
    if (remaining <= 0) continue;

    // Chain lightning bolt (player-to-player jagged beam)
    if (e.isChain) {
      const alpha = remaining / (e.expiresAt - e.startAt);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(e.sx, e.sy);
      const steps = 6;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const mx = e.sx + (e.ex - e.sx) * t + (Math.random() - 0.5) * 40;
        const my = e.sy + (e.ey - e.sy) * t + (Math.random() - 0.5) * 40;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(e.ex, e.ey);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // Mine blast flash
    if (e.isMineBlast) {
      const alpha2 = remaining / (e.expiresAt - e.startAt);
      ctx.save();
      ctx.globalAlpha = alpha2 * 0.9;
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 30 * (1 - alpha2 + 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    // Strike bolt — visible first 350ms
    if (elapsed < 350) {
      const alpha = 1 - elapsed / 350;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(e.x,      0);
      ctx.lineTo(e.x + 22, e.y * 0.28);
      ctx.lineTo(e.x - 16, e.y * 0.52);
      ctx.lineTo(e.x + 12, e.y * 0.76);
      ctx.lineTo(e.x,      e.y);
      ctx.stroke();
      ctx.restore();
    }
    // Electric shimmer at platform site
    const flicker = Math.floor(now / 130) % 2 === 0;
    if (remaining > 1000 || flicker) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 8;
      ctx.fillRect(e.x - e.w / 2, e.y - 3, e.w, 6);
      ctx.restore();
    }
  }
}

function doEchoStrike(player) {
  echoWaves.push({
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    vx: player.facingRight ? 18 : -18,
    vy: 0,
    owner: player.num,
    bounces: 3,
    hitsLeft: 3,
  });
  if (player.passives.includes('echoBurst')) {
    echoWaves.push({
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      vx: 0,
      vy: -18,
      owner: player.num,
      bounces: 3,
      hitsLeft: 3,
    });
  }
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
    player.vy = Math.min(player.vy * -0.3, 2);
  }
  if (player.ghostActive && now > player.ghostExpiry) player.ghostActive = false;
  if (player.infiniteJumpActive && now > player.infiniteJumpExpiry) {
    player.infiniteJumpActive = false;
    player.airJumpsLeft = 0;
  }
  if (player.frozen && now > player.frozenUntil) {
    player.frozen = false;
  }
  if (player.timeSlowed && now > player.timeSlowedExpiry)             player.timeSlowed = false;
  if (player.anchored   && now > player.anchoredExpiry)               player.anchored = false;
  if (player.controlsInverted && now > player.controlsInvertedExpiry) player.controlsInverted = false;
  if (player.empActive  && now > player.empExpiry)                    player.empActive = false;
  if (player.stunned    && now > player.stunnedExpiry)                player.stunned = false;
  if (player.rageActive && now > player.rageExpiry) {
    player.rageActive = false;
    player.rageSlowActive = true;
    player.rageSlowExpiry = now + 2000;
  }
  if (player.rageSlowActive && now > player.rageSlowExpiry)          player.rageSlowActive = false;
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

  // Fake Floor passive: auto-spawn platform when near void
  if (player.passives.includes('fakeFloor')) {
    const n = Date.now();
    if (player.y + player.h > VOID_Y - 200 && (player.cooldowns['fakeFloor'] || 0) <= n) {
      doFakeFloor(player, n);
      player.cooldowns['fakeFloor'] = n + 10000;
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

  // Vampiric Aura passive: drain velocity from nearby opponent
  if (player.passives.includes('vampiricAura') && opponent && !opponent.isDead) {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h / 2;
    if (Math.hypot(cx - ox, cy - oy) < 350) {
      opponent.vx *= 0.973;
      if (opponent.vy > 0) opponent.vy *= 0.973;
    }
  }
}

function updateAbilityInput(player, opponent, ts) {
  if (player.frozen || player.stunned) return;
  const fn = player.num === 1 ? p1Ability : p2Ability;
  for (let s = 0; s < player.actives.length; s++) {
    if (fn(s)) activateAbility(player, opponent, s, ts);
  }
}

function updateEchoWaves(now) {
  echoWaves = echoWaves.filter(w => {
    w.x += w.vx;
    w.y += w.vy;
    // Bounce off world bounds
    if (w.x < 0)       { w.x = 0;       w.vx = Math.abs(w.vx);  w.bounces--; }
    if (w.x > WORLD_W) { w.x = WORLD_W; w.vx = -Math.abs(w.vx); w.bounces--; }
    if (w.y < 0)       { w.y = 0;       w.vy = Math.abs(w.vy);  w.bounces--; }

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

function doArrowShot(player) {
  const opp = player.num === 1 ? player2 : player1;
  const ox = player.x + player.w / 2;
  const oy = player.y + player.h / 2;
  let vx, vy;
  if (opp && !opp.isDead) {
    const tx = opp.x + opp.w / 2;
    const ty = opp.y + opp.h / 2;
    const d = Math.hypot(tx - ox, ty - oy) || 1;
    vx = (tx - ox) / d * 32;
    vy = (ty - oy) / d * 32;
  } else {
    vx = (player.facingRight ? 1 : -1) * 32;
    vy = 0;
  }
  arrowProjectiles.push({
    x: ox, y: oy,
    vx, vy,
    owner: player.num,
    color: player.color,
    life: 1.0,
    homing: player.passives.includes('homing'),
    born: Date.now(),
  });
}

function doFreezeRay(player) {
  const opp = player.num === 1 ? player2 : player1;
  const ox = player.x + player.w / 2;
  const oy = player.y + player.h / 2;
  let vx, vy;
  if (opp && !opp.isDead) {
    const tx = opp.x + opp.w / 2;
    const ty = opp.y + opp.h / 2;
    const d = Math.hypot(tx - ox, ty - oy) || 1;
    vx = (tx - ox) / d * 9;
    vy = (ty - oy) / d * 9;
  } else {
    vx = (player.facingRight ? 1 : -1) * 9;
    vy = 0;
  }
  freezeRayProjectiles.push({
    x: ox, y: oy,
    vx, vy,
    owner: player.num,
    life: 1.0,
    homing: player.passives.includes('homing'),
    born: Date.now(),
  });
}

function doSwap(player, opponent) {
  if (!opponent || opponent.isDead || player.swapUsed) return;
  const px = player.x, py = player.y;
  player.x = opponent.x; player.y = opponent.y;
  opponent.x = px; opponent.y = py;
  // Zero velocities to avoid immediate void deaths
  player.vx = 0; player.vy = 0;
  opponent.vx = 0; opponent.vy = 0;
  player.swapUsed = true;
  sfxSwap();
}

function doPhase(player) {
  // Find the closest surface directly above the player (platforms, temp platforms, or spawned walls)
  const px = player.x, pw = player.w, py = player.y;
  let best = null, bestDist = Infinity;

  for (const surf of [...getAllPlatforms(), ...walls]) {
    // Must horizontally overlap with the player
    if (px + pw <= surf.x || px >= surf.x + surf.w) continue;
    // Surface top must be strictly above the player's top edge
    if (surf.y >= py) continue;
    // Closest above = smallest upward distance
    const dist = py - surf.y;
    if (dist < bestDist) { bestDist = dist; best = surf; }
  }

  if (!best) return;

  player.x        = Math.max(best.x, Math.min(best.x + best.w - player.w, player.x));
  player.y        = best.y - player.h;
  player.vy       = 0;
  player.vx       = 0;
  player.onGround = true;
}

// ── NEW ABILITY IMPLEMENTATIONS ──

function doTimeSlow(player, opponent, now) {
  if (!opponent || opponent.isDead) return;
  opponent.timeSlowed = true;
  opponent.timeSlowedExpiry = now + 3000;
}

function doAnchor(player, opponent, now) {
  if (!opponent || opponent.isDead) return;
  opponent.anchored = true;
  opponent.anchoredExpiry = now + 3000;
  opponent.vy = 0;
  // Golden ring at opponent feet
  const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h;
  pulseWaves.push({ x: ox, y: oy, r: 0, maxR: 60, born: now, owner: player.num, anchorVisual: true });
}

function doVortex(player, opponent, now) {
  if (!opponent || opponent.isDead) return;
  opponent.controlsInverted = true;
  opponent.controlsInvertedExpiry = now + 3000;
}

function doEmpBurst(player, opponent, now) {
  if (!opponent || opponent.isDead) return;
  opponent.empActive = true;
  opponent.empExpiry = now + 6000;
  // Spawn a visual EMP ring
  pulseWaves.push({ x: opponent.x + opponent.w / 2, y: opponent.y + opponent.h / 2, r: 0, maxR: 120, born: now, owner: player.num, empVisual: true });
}

function doMine(player, now) {
  const cx = player.x + player.w / 2;
  const pBottom = player.y + player.h;
  // Snap mine to nearest platform surface at or below player feet
  let mineY = pBottom;
  let best = Infinity;
  for (const plat of getAllPlatforms()) {
    if (cx < plat.x || cx > plat.x + plat.w) continue;
    const dist = plat.y - pBottom;
    if (dist >= -5 && dist < best) { best = dist; mineY = plat.y; }
  }
  mines.push({
    x: cx,
    y: mineY,
    owner: player.num,
    expiresAt: now + 20000,
    triggered: false,
  });
}

function doPulseExpand(player, opponent, ts) {
  const now = Date.now();
  pulseWaves.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, r: 0, maxR: 220, born: now, owner: player.num });
  // Immediate push on spawn
  if (opponent && !opponent.isDead) {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h / 2;
    const dist = Math.hypot(cx - ox, cy - oy) || 1;
    if (now >= opponent.spawnImmunityExpiry && !opponent.ghostActive && !opponent.shieldActive) {
      opponent.vx += ((ox - cx) / dist) * PUSH_BASE_FORCE * 1.8;
      opponent.vy += ((oy - cy) / dist) * PUSH_BASE_FORCE * 0.8 - 3;
      opponent.pushFlashTimer = 300;
      opponent.lastHitBy = player.num;
    }
  }
}

function doSpringboard(player, now) {
  springboards.push({
    x: player.x - 20,
    y: player.y + player.h + 2,
    w: player.w + 40,
    h: 14,
    isSpringboard: true,
    expiresAt: now + 8000,
  });
}

function doBlackHole(player, opponent, now) {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const ox = opponent && !opponent.isDead ? opponent.x + opponent.w / 2 : cx;
  const oy = opponent && !opponent.isDead ? opponent.y + opponent.h / 2 : cy;
  blackHoles.push({
    x: (cx + ox) / 2,
    y: (cy + oy) / 2,
    born: now,
    expiresAt: now + 3000,
    owner: player.num,
  });
}

function doChainLightning(player, opponent, ts) {
  if (!opponent || opponent.isDead) return;
  const now = Date.now();
  // A heavy directional push
  tryPush(player, opponent, ts, 2.8);
  // Lightning visual: a jagged line stored like a lightning effect
  const sx = player.x + player.w / 2, sy = player.y + player.h / 2;
  const ex = opponent.x + opponent.w / 2, ey = opponent.y + opponent.h / 2;
  lightningEffects.push({ x: (sx + ex) / 2, y: Math.min(sy, ey), w: Math.abs(sx - ex) + 10, startAt: now, expiresAt: now + 400, isChain: true, sx, sy, ex, ey });
  sfxThunder();
}

function doStunBlast(player, opponent, ts, now) {
  if (!opponent || opponent.isDead) return;
  if (now < opponent.spawnImmunityExpiry || opponent.ghostActive) return;
  // Must be in push range
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  const ox = opponent.x + opponent.w / 2, oy = opponent.y + opponent.h / 2;
  if (Math.hypot(cx - ox, cy - oy) > PUSH_RANGE * 1.3) return;
  opponent.stunned = true;
  opponent.stunnedExpiry = now + 1500;
  opponent.vx = 0; opponent.vy = 0;
  // Big expanding ring at opponent location
  pulseWaves.push({ x: ox, y: oy, r: 0, maxR: 80, born: now, owner: player.num });
  pulseWaves.push({ x: ox, y: oy, r: 0, maxR: 50, born: now + 120, owner: player.num });
  spawnPushEffect(player, opponent.x > player.x ? 1 : -1, true);
}

function updateWalls(now) {
  walls = walls.filter(w => w.expiresAt > now);
}

function updateArrows(now) {
  arrowProjectiles = arrowProjectiles.filter(a => {
    // Homing: steer toward opponent each frame, expire after 2 s
    if (a.homing) {
      if (now - a.born > 2000) return false;
      const opp = a.owner === 1 ? player2 : player1;
      if (opp && !opp.isDead) {
        const dx = (opp.x + opp.w / 2) - a.x;
        const dy = (opp.y + opp.h / 2) - a.y;
        const d  = Math.hypot(dx, dy) || 1;
        a.vx += (dx / d) * 2.2;
        a.vy += (dy / d) * 2.2;
        const spd = Math.hypot(a.vx, a.vy) || 1;
        a.vx = (a.vx / spd) * 32;
        a.vy = (a.vy / spd) * 32;
      }
    }

    a.x += a.vx;
    a.y += a.vy;
    a.life -= 0.008;
    if (a.life <= 0 || a.x < -20 || a.x > WORLD_W + 20 || a.y < -20 || a.y > WORLD_H + 20) return false;

    const opp = a.owner === 1 ? player2 : player1;
    if (opp && !opp.isDead) {
      const dist = Math.hypot(a.x - (opp.x + opp.w / 2), a.y - (opp.y + opp.h / 2));
      if (dist < 36) {
        const shooter = a.owner === 1 ? player1 : player2;
        tryPush(shooter, opp, now, 3.2);
        if (shooter && shooter.passives.includes('perfectHit')) {
          shooter.cooldowns['arrowShot'] = 0;
        }
        sfxArrowHit();
        return false;
      }
    }
    return true;
  });
}

function updateFreezeRays(now) {
  freezeRayProjectiles = freezeRayProjectiles.filter(f => {
    // Homing: steer toward opponent each frame, expire after 2 s
    if (f.homing) {
      if (now - f.born > 2000) return false;
      const opp = f.owner === 1 ? player2 : player1;
      if (opp && !opp.isDead) {
        const dx = (opp.x + opp.w / 2) - f.x;
        const dy = (opp.y + opp.h / 2) - f.y;
        const d  = Math.hypot(dx, dy) || 1;
        f.vx += (dx / d) * 0.9;
        f.vy += (dy / d) * 0.9;
        const spd = Math.hypot(f.vx, f.vy) || 1;
        f.vx = (f.vx / spd) * 9;
        f.vy = (f.vy / spd) * 9;
      }
    }

    f.x += f.vx;
    f.y += f.vy;
    f.life -= 0.004;
    if (f.life <= 0 || f.x < -20 || f.x > WORLD_W + 20 || f.y < -20 || f.y > WORLD_H + 20) return false;

    const opp = f.owner === 1 ? player2 : player1;
    if (opp && !opp.isDead && !opp.frozen) {
      const dist = Math.hypot(f.x - (opp.x + opp.w / 2), f.y - (opp.y + opp.h / 2));
      if (dist < 34) {
        opp.frozen = true;
        opp.frozenUntil = now + 3000 + Math.random() * 1000;
        opp.vx = 0; opp.vy = 0;
        sfxFreezeHit();
        return false;
      }
    }
    return true;
  });
}

function updateTemporaryPlatforms(now) {
  temporaryPlatforms = temporaryPlatforms.filter(p => p.expiresAt > now);
}

function updateMines(now) {
  for (const m of mines) {
    if (m.triggered) continue;
    const opp = m.owner === 1 ? player2 : player1;
    if (!opp || opp.isDead) continue;
    const ox = opp.x + opp.w / 2, oy = opp.y + opp.h;
    if (Math.abs(ox - m.x) < 28 && Math.abs(oy - m.y) < 22) {
      m.triggered = true;
      // Big push from mine center
      const self = m.owner === 1 ? player1 : player2;
      if (now > opp.spawnImmunityExpiry && !opp.ghostActive) {
        const dir = opp.x + opp.w / 2 > m.x ? 1 : -1;
        opp.vx += dir * PUSH_BASE_FORCE * 8.0;
        opp.vy  = Math.min(opp.vy - 20, -20);
        opp.pushFlashTimer = 600;
        opp.lastHitBy = m.owner;
      }
      pulseWaves.push({ x: m.x, y: m.y, r: 0, maxR: 180, born: now, owner: m.owner });
      pulseWaves.push({ x: m.x, y: m.y, r: 0, maxR: 100, born: now + 60, owner: m.owner });
      lightningEffects.push({ x: m.x, y: m.y, w: 120, startAt: now, expiresAt: now + 500, isMineBlast: true });
      sfxPush();
    }
  }
  mines = mines.filter(m => !m.triggered && m.expiresAt > now);
}

function updateSpringboards(now) {
  springboards = springboards.filter(s => s.expiresAt > now);
}

function updateBlackHoles(now) {
  blackHoles = blackHoles.filter(b => b.expiresAt > now);
  for (const bh of blackHoles) {
    for (const pl of [player1, player2]) {
      if (!pl || pl.isDead || pl.dashActive) continue;
      const dx = bh.x - (pl.x + pl.w / 2);
      const dy = bh.y - (pl.y + pl.h / 2);
      const dist = Math.hypot(dx, dy) || 1;
      // Pull from any distance — stronger when closer, minimum pull at far range
      const pull = Math.max(0.4, 2.2 * (1 - Math.min(dist, 600) / 600));
      pl.vx += (dx / dist) * pull;
      pl.vy += (dy / dist) * pull;
    }
  }
}

function updatePulseWaves(now) {
  for (const w of pulseWaves) {
    const age = now - w.born;
    w.r = (age / 400) * w.maxR;
  }
  pulseWaves = pulseWaves.filter(w => now - w.born < 600);
}

function updateCounterstrikeProjectiles(now) {
  counterstrikeProjectiles = counterstrikeProjectiles.filter(p => {
    if (p.homing) {
      if (now - p.born > 3000) return false;
      const opp = p.owner === 1 ? player2 : player1;
      if (opp && !opp.isDead) {
        const dx = (opp.x + opp.w / 2) - p.x;
        const dy = (opp.y + opp.h / 2) - p.y;
        const d  = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 2.5;
        p.vy += (dy / d) * 2.5;
        const spd = Math.hypot(p.vx, p.vy) || 1;
        p.vx = (p.vx / spd) * 26;
        p.vy = (p.vy / spd) * 26;
      }
    }
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.005;
    if (p.life <= 0 || p.x < -40 || p.x > WORLD_W + 40 || p.y < -40 || p.y > WORLD_H + 200) return false;
    const opp = p.owner === 1 ? player2 : player1;
    if (opp && !opp.isDead) {
      const dist = Math.hypot(p.x - (opp.x + opp.w / 2), p.y - (opp.y + opp.h / 2));
      if (dist < 44) {
        if (now > opp.spawnImmunityExpiry && !opp.ghostActive && !opp.shieldActive) {
          const dir = (opp.x + opp.w / 2) > p.x ? 1 : -1;
          opp.vx += dir * PUSH_BASE_FORCE * 5.5;
          opp.vy  = Math.min(opp.vy - 14, -14);
          opp.pushFlashTimer = 600;
          opp.lastHitBy = p.owner;
        }
        pulseWaves.push({ x: p.x, y: p.y, r: 0, maxR: 220, born: now,       owner: p.owner });
        pulseWaves.push({ x: p.x, y: p.y, r: 0, maxR: 130, born: now + 70,  owner: p.owner });
        pulseWaves.push({ x: p.x, y: p.y, r: 0, maxR: 70,  born: now + 140, owner: p.owner });
        lightningEffects.push({ x: p.x, y: p.y, w: 200, startAt: now, expiresAt: now + 600, isMineBlast: true });
        sfxPush();
        return false;
      }
    }
    return true;
  });
}

function drawCounterstrikeProjectiles() {
  for (const p of counterstrikeProjectiles) {
    const ang = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.globalAlpha = p.life * 0.95;
    // Outer glow
    ctx.strokeStyle = '#ff4400';
    ctx.lineWidth = 7;
    ctx.globalAlpha = p.life * 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Homing ring
    if (p.homing) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = p.life * 0.95;
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    // Skull-like projectile: fiery orb
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 10);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffd700');
    grad.addColorStop(0.7, '#ff4400');
    grad.addColorStop(1, 'rgba(255,68,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawMines() {
  const now = Date.now();
  for (const m of mines) {
    const flicker = Math.floor(now / 600) % 2 === 0;
    const c = m.owner === 1 ? '#3b82f6' : '#f97316';
    ctx.save();
    ctx.globalAlpha = flicker ? 0.9 : 0.6;
    ctx.fillStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = 6;
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - 8);
    ctx.lineTo(m.x + 7, m.y);
    ctx.lineTo(m.x, m.y + 5);
    ctx.lineTo(m.x - 7, m.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawSpringboards() {
  for (const s of springboards) {
    const now = Date.now();
    const remaining = s.expiresAt - now;
    const alpha = Math.min(1, remaining / 1000);
    ctx.save();
    ctx.globalAlpha = alpha;
    // Platform
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 8;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    // Spring coils
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 2;
    const coils = 4;
    const cw = s.w / coils;
    for (let i = 0; i < coils; i++) {
      const cx2 = s.x + cw * i + cw / 2;
      ctx.beginPath();
      ctx.moveTo(cx2, s.y);
      ctx.lineTo(cx2 - 4, s.y + 5);
      ctx.lineTo(cx2 + 4, s.y + 10);
      ctx.lineTo(cx2, s.y + s.h);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawBlackHoles() {
  const now = Date.now();
  for (const bh of blackHoles) {
    const age = now - bh.born;
    const pulse = 0.8 + 0.2 * Math.sin(age * 0.01);
    ctx.save();
    // Outer glow
    const grad = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, 55 * pulse);
    grad.addColorStop(0, 'rgba(88,28,135,0.85)');
    grad.addColorStop(0.5, 'rgba(139,92,246,0.4)');
    grad.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, 55 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, 14 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Swirl lines
    ctx.strokeStyle = 'rgba(167,139,250,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = (age * 0.004) + (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, 22 + i * 5, a, a + Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPulseWaves() {
  const now = Date.now();
  for (const w of pulseWaves) {
    const age = now - w.born;
    const alpha = Math.max(0, 1 - age / 500);
    let c;
    if (w.empVisual)    c = '#38bdf8';
    else if (w.anchorVisual) c = '#f59e0b';
    else c = w.owner === 1 ? '#3b82f6' : '#f97316';
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = c;
    ctx.lineWidth = w.anchorVisual ? 4 : 3;
    ctx.shadowColor = c;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(w.x, w.y, Math.max(1, w.r), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────
//  BOT AI
// ─────────────────────────────────────────────────────────────────
function isBotMode() {
  return gameMode === 'bot'
    || (gameMode === 'setgame'   && customSettings.botOpponent)
    || (gameMode === 'longmatch' && lmState.botOpponent);
}

const BOT_SURVIVAL_ABILITIES = new Set(['grapple','infiniteJump','dash','shield','ghost','springboard','blackHole','empBurst','rage']);
const BOT_RANGE_ABILITIES    = new Set(['arrowShot','freezeRay','echoStrike','windBlast','repulse','magnet','lightningSpawn','thunder','timeSlow','anchor','vortex','chainLightning','stunBlast','pulseExpand','mine','perfectHit']);
const BOT_TRAVEL_ABILITIES   = new Set(['dash','grapple','teleport','infiniteJump']);

function botPlatformUnder(entity) {
  const cx = entity.x + entity.w / 2;
  for (const p of getAllPlatforms()) {
    if (cx >= p.x - 4 && cx <= p.x + p.w + 4 &&
        entity.y + entity.h >= p.y - 2 && entity.y + entity.h <= p.y + 10) {
      return p;
    }
  }
  return null;
}

// Returns true if the bot could realistically jump from botPlatform to targetPlatform.
function botCanJumpTo(bot, botPlat, targetPlat) {
  if (!botPlat || !targetPlat) return false;
  if (botPlat === targetPlat) return true;

  const rise   = botPlat.y - targetPlat.y;             // positive = target is above
  const hdist  = Math.abs((targetPlat.x + targetPlat.w / 2) - (botPlat.x + botPlat.w / 2));

  const jumpVel     = Math.abs(JUMP_FORCE) * (bot.passives.includes('highJump') ? HIGH_JUMP_MULT : 1);
  const jumpHeight  = (jumpVel * jumpVel) / (2 * GRAVITY);          // ≈58 px, 114 with highJump
  const extraJumps  = bot.passives.includes('tripleJump') ? 2 : bot.passives.includes('doubleJump') ? 1 : 0;
  const totalHeight = jumpHeight * (1 + extraJumps * 0.8);          // air-jump stacking
  const airTime     = (jumpVel / GRAVITY) * 2 * (1 + extraJumps * 0.85);
  const hRange      = MAX_VX * airTime + 60;                        // generous margin

  if (rise > 0) return rise <= totalHeight && hdist <= hRange;      // target above: need height
  return hdist <= hRange + 80;                                       // same/below: walk-off or drop
}

function updateBotAI(dt, now) {
  if (!isBotMode() || !player2 || !player1) return;
  if (player2.isDead) {
    botInput.left = false; botInput.right = false; botInput.jump = false; botInput.push = false;
    return;
  }

  const bot = player2;
  const opp = player1;
  const botCx = bot.x + bot.w / 2;
  const oppCx = opp.x + opp.w / 2;
  const dx    = oppCx - botCx;
  const dist  = Math.hypot(dx, (opp.y + opp.h / 2) - (bot.y + bot.h / 2));

  const nearVoid     = bot.y + bot.h > VOID_Y - 200;
  const criticalVoid = bot.y + bot.h > VOID_Y - 80;

  const botPlat  = botPlatformUnder(bot);
  const oppPlat  = opp.isDead ? null : botPlatformUnder(opp);
  const samePlat = botPlat && oppPlat && botPlat === oppPlat;
  const canJump  = botCanJumpTo(bot, botPlat, oppPlat);

  // ── MOVEMENT ──
  botInput.left  = false;
  botInput.right = false;

  if (nearVoid || !botPlat) {
    // SURVIVAL: head toward nearest platform above
    let best = null, bestScore = Infinity;
    for (const p of PLATFORMS) {
      if (p.y + p.h >= bot.y + bot.h) continue;
      const score = Math.hypot((p.x + p.w / 2) - botCx, bot.y - p.y);
      if (score < bestScore) { bestScore = score; best = p; }
    }
    const tx = best ? best.x + best.w / 2 : CANVAS_W / 2;
    botInput.left  = tx < botCx - 12;
    botInput.right = tx > botCx + 12;

  } else if (canJump) {
    // CAN REACH: move toward opponent, respect platform edges
    const safeLeft  = bot.x - botPlat.x;
    const safeRight = (botPlat.x + botPlat.w) - (bot.x + bot.w);
    const margin    = 30;
    if (dx < -50 && safeLeft  > margin) botInput.left  = true;
    if (dx >  50 && safeRight > margin) botInput.right = true;

  } else {
    // CANNOT REACH: stand still, face the opponent
    bot.facingRight = dx > 0;
  }

  // ── JUMPING ──
  botJumpCooldown = Math.max(0, botJumpCooldown - dt);
  botInput.jump   = false;

  if (botJumpCooldown <= 0) {
    if (criticalVoid) {
      // Emergency jump no matter what
      botInput.jump = true; botJumpCooldown = 280;
    } else if (nearVoid && bot.onGround) {
      botInput.jump = true; botJumpCooldown = 480;
    } else if (nearVoid && !bot.onGround && bot.airJumpsLeft > 0) {
      // Burn air jumps to escape
      botInput.jump = true; botJumpCooldown = 420;
    } else if (canJump && bot.onGround && oppPlat && botPlat && oppPlat.y < botPlat.y - 20) {
      // Opponent is on a higher platform the bot can reach — jump toward it
      botInput.jump = true; botJumpCooldown = 850;
    }
    // If canJump is false: no random jumping — the bot waits
  }

  // ── PUSH ──
  botInput.push = samePlat && !nearVoid && dist < PUSH_RANGE * 0.65 && !opp.isDead;

  // ── ABILITIES ──
  const _diff      = gameMode === 'longmatch' ? lmState.botDifficulty : customSettings.botDifficulty;
  const diffChance = _diff === 'easy' ? 0.001 : _diff === 'hard' ? 0.012 : 0.003;

  botAbilityClock = Math.max(0, botAbilityClock - dt);
  if (botAbilityClock <= 0) {
    for (let s = 0; s < bot.actives.length; s++) {
      const id = bot.actives[s];
      if ((bot.cooldowns[id] || 0) > now) continue;

      // Near void: use survival abilities immediately
      if (nearVoid && BOT_SURVIVAL_ABILITIES.has(id)) {
        activateAbility(bot, opp, s, now);
        botAbilityClock = 500;
        break;
      }

      // Can't jump to opponent: prefer range then travel abilities
      if (!nearVoid && !canJump) {
        if (BOT_RANGE_ABILITIES.has(id) && Math.random() < diffChance * 5) {
          activateAbility(bot, opp, s, now);
          botAbilityClock = 700 + Math.random() * 800;
          break;
        }
        if (BOT_TRAVEL_ABILITIES.has(id) && Math.random() < diffChance * 3) {
          bot.facingRight = dx > 0;  // face opponent before dashing/teleporting
          activateAbility(bot, opp, s, now);
          botAbilityClock = 900 + Math.random() * 800;
          break;
        }
      }

      // General ability use when safe
      if (!nearVoid && Math.random() < diffChance) {
        activateAbility(bot, opp, s, now);
        botAbilityClock = 1400 + Math.random() * 1600;
        break;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  LIFE & RESPAWN SYSTEM
// ─────────────────────────────────────────────────────────────────
function killPlayer(player) {
  if (player.isDead) return;

  // Counterstrike: fire an explosive projectile on death
  if (player.passives.includes('counterstrike')) {
    const opp = player.num === 1 ? player2 : player1;
    const now2 = Date.now();
    const px2 = player.x + player.w / 2, py2 = player.y + player.h / 2;
    // Aim at opponent or straight ahead if already dead
    if (opp && !opp.isDead) {
      const dx = (opp.x + opp.w / 2) - px2;
      const dy = (opp.y + opp.h / 2) - py2;
      const d  = Math.hypot(dx, dy) || 1;
      counterstrikeProjectiles.push({
        x: px2, y: py2,
        vx: (dx / d) * 26, vy: (dy / d) * 26,
        owner: player.num,
        homing: player.passives.includes('homing'),
        born: now2, life: 1.0,
      });
    }
    pulseWaves.push({ x: px2, y: py2, r: 0, maxR: 80, born: now2, owner: player.num });
    lightningEffects.push({ x: px2, y: py2, w: 80, startAt: now2, expiresAt: now2 + 300, isMineBlast: true });
  }

  player.lives--;
  player.isDead       = true;
  player.respawnTimer = 2200;
  player.vx = 0; player.vy = 0;
  player.x  = -9999; player.y = -9999;
  player.grappling      = false;
  player.groundSlamming = false;
  player.dashActive     = false;
  player.dashTrail      = [];
  sfxDeath();

  // Life Steal: killer gains a life if the passive is ready
  const now    = Date.now();
  const killer = player.lastHitBy === 1 ? player1
               : player.lastHitBy === 2 ? player2
               : null;
  if (killer && killer !== player && killer.passives.includes('lifeSteal')) {
    if (now >= (killer.lifeStealCooldown || 0)) {
      killer.lives = Math.min(killer.lives + 1, killer.maxLives);
      killer.lifeStealCooldown = now + 10000 + Math.random() * 5000;
      killer.lifeStealFlash    = 900;
      sfxLifeSteal();
    }
  }

  if (player.lives <= 0) {
    checkWinCondition();
  }
}

function updateRespawn(player, dt) {
  if (!player.isDead || player.lives <= 0) return;
  const rate = player.passives.includes('persistence') ? 1.65 : 1;
  player.respawnTimer -= dt * rate;
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
  sfxRespawn();
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
  const now = Date.now();
  for (const plat of PLATFORMS) {
    if (plat.removedUntil && plat.removedUntil > now) {
      // Draw scorched outline where the platform was
      const remaining = plat.removedUntil - now;
      const flicker = Math.floor(now / 120) % 2 === 0;
      if (remaining < 1200 && flicker) continue;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      roundRect(ctx, plat.x, plat.y, plat.w, plat.h, 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      continue;
    }
    // Draw platform (with rotation support for non-spawn platforms)
    if (plat.rotation) {
      const pcx = plat.x + plat.w / 2, pcy = plat.y + plat.h / 2;
      const pw = plat.w, ph = plat.h, rc = 4;
      ctx.save();
      ctx.translate(pcx, pcy);
      ctx.rotate(plat.rotation);
      ctx.fillStyle = '#2d3a4a';
      ctx.beginPath();
      ctx.moveTo(-pw / 2 + rc, -ph / 2);
      ctx.lineTo( pw / 2 - rc, -ph / 2);
      ctx.quadraticCurveTo( pw / 2, -ph / 2,  pw / 2, -ph / 2 + rc);
      ctx.lineTo( pw / 2,  ph / 2 - rc);
      ctx.quadraticCurveTo( pw / 2,  ph / 2,  pw / 2 - rc,  ph / 2);
      ctx.lineTo(-pw / 2 + rc,  ph / 2);
      ctx.quadraticCurveTo(-pw / 2,  ph / 2, -pw / 2,  ph / 2 - rc);
      ctx.lineTo(-pw / 2, -ph / 2 + rc);
      ctx.quadraticCurveTo(-pw / 2, -ph / 2, -pw / 2 + rc, -ph / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a6a7a';
      ctx.fillRect(-pw / 2 + 4, -ph / 2, pw - 8, 3);
      ctx.restore();
    } else {
      ctx.fillStyle = '#2d3a4a';
      roundRect(ctx, plat.x, plat.y, plat.w, plat.h, 4);
      ctx.fill();
      ctx.fillStyle = '#4a6a7a';
      ctx.fillRect(plat.x + 4, plat.y, plat.w - 8, 3);
    }
  }

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

  const px  = player.x;
  const py  = player.y;
  const now = Date.now();

  // ── DASH TRAIL ──
  if (player.dashActive && player.dashTrail.length > 0) {
    const total = player.dashTrail.length;
    for (let i = 0; i < total; i++) {
      const t   = player.dashTrail[i];
      const alp = ((i + 1) / total) * 0.45; // oldest = most transparent
      ctx.save();
      ctx.globalAlpha = alp;
      ctx.fillStyle   = player.color;
      roundRect(ctx, t.x, t.y, player.w, player.h, 8);
      ctx.fill();
      ctx.restore();
    }
    // Speed lines behind the player
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = player.color;
    ctx.lineWidth   = 2;
    const lineDir   = player.facingRight ? -1 : 1;
    for (let i = 0; i < 6; i++) {
      const ly  = py + 6 + i * 6;
      const len = 18 + i * 10;
      ctx.beginPath();
      ctx.moveTo(px + (player.facingRight ? 0 : player.w), ly);
      ctx.lineTo(px + (player.facingRight ? 0 : player.w) + lineDir * len, ly);
      ctx.stroke();
    }
    ctx.restore();
  }

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

  // Rage glow — pulsing red aura
  if (player.rageActive) {
    const pulse = 0.25 + Math.sin(now * 0.012) * 0.1;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ef4444';
    roundRect(ctx, px - 6, py - 2, player.w + 12, player.h + 4, 10);
    ctx.fill();
    ctx.globalAlpha = pulse * 0.5;
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    roundRect(ctx, px - 8, py - 4, player.w + 16, player.h + 8, 12);
    ctx.stroke();
    ctx.restore();
  }

  // Rage slow — grey shimmer
  if (player.rageSlowActive) {
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(now * 0.006) * 0.05;
    ctx.fillStyle = '#94a3b8';
    roundRect(ctx, px - 4, py, player.w + 8, player.h, 8);
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

  // Double Jump burst effect — ghost trail + speed lines (same style as dash)
  if (player.djBurstTimer > 0 && player.djTrail.length > 0) {
    const total = player.djTrail.length;
    // Ghost copies fading from oldest to newest
    for (let i = 0; i < total; i++) {
      const ghost = player.djTrail[i];
      ctx.save();
      ctx.globalAlpha = ((i + 1) / total) * 0.42;
      ctx.fillStyle   = player.color;
      roundRect(ctx, ghost.x, ghost.y, player.w, player.h, 8);
      ctx.fill();
      ctx.restore();
    }
    // Speed lines behind the player
    const fade = player.djBurstTimer / 420;
    const dir  = player.djBurstDir;
    ctx.save();
    ctx.globalAlpha = fade * 0.65;
    ctx.strokeStyle = player.color;
    ctx.lineWidth   = 2;
    for (let i = 0; i < 6; i++) {
      const ly  = py + 5 + i * 6;
      const len = (20 + i * 12) * fade;
      ctx.beginPath();
      ctx.moveTo(px + (dir > 0 ? 0 : player.w), ly);
      ctx.lineTo(px + (dir > 0 ? 0 : player.w) - dir * len, ly);
      ctx.stroke();
    }
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

  // Anchored — chains below feet
  if (player.anchored) {
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.85;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(px + player.w / 2 + i * 10, py + player.h);
      ctx.lineTo(px + player.w / 2 + i * 10, py + player.h + 18);
      ctx.stroke();
    }
    ctx.fillStyle = '#f59e0b';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(px + player.w / 2, py + player.h + 20, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Stunned — spinning stars above head
  if (player.stunned) {
    ctx.save();
    const angle = (Date.now() * 0.007) % (Math.PI * 2);
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 3; i++) {
      const a = angle + (i / 3) * Math.PI * 2;
      const sx = px + player.w / 2 + Math.cos(a) * 18;
      const sy = py - 14 + Math.sin(a) * 6;
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Time slowed — blue clock overlay
  if (player.timeSlowed) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#60a5fa';
    roundRect(ctx, px, py, player.w, player.h, 8);
    ctx.fill();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.5;
    const tc = px + player.w / 2, tr = 7;
    ctx.beginPath(); ctx.arc(tc, py + 8, tr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Controls inverted — swirl arrows
  if (player.controlsInverted) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 6;
    const iangle = (Date.now() * 0.005) % (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(px + player.w / 2, py - 16, 10, iangle, iangle + Math.PI * 1.5);
    ctx.stroke();
    // Arrow tip
    const tip = { x: px + player.w / 2 + Math.cos(iangle + Math.PI * 1.5) * 10, y: py - 16 + Math.sin(iangle + Math.PI * 1.5) * 10 };
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Vampiric Aura — drain tendrils toward nearby opponent
  if (player.passives.includes('vampiricAura') && !player.isDead) {
    const opp = player.num === 1 ? player2 : player1;
    if (opp && !opp.isDead) {
      const dist = Math.hypot(px + player.w/2 - (opp.x + opp.w/2), py + player.h/2 - (opp.y + opp.h/2));
      if (dist < 350) {
        const alpha = (1 - dist / 350) * 0.55;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(opp.x + opp.w / 2, opp.y + opp.h / 2);
        ctx.lineTo(px + player.w / 2, py + player.h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  // EMP active — static crackling
  if (player.empActive) {
    ctx.save();
    const flick = Math.floor(Date.now() / 100) % 2 === 0;
    ctx.globalAlpha = flick ? 0.5 : 0.25;
    ctx.fillStyle = '#38bdf8';
    roundRect(ctx, px - 3, py - 3, player.w + 6, player.h + 6, 10);
    ctx.fill();
    ctx.restore();
  }

  // Frozen overlay — ice crystals
  if (player.frozen) {
    ctx.save();
    ctx.globalAlpha = 0.72 + Math.sin(now * 0.012) * 0.15;
    ctx.fillStyle = '#bae6fd';
    roundRect(ctx, px, py, player.w, player.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    roundRect(ctx, px, py, player.w, player.h, 8);
    ctx.stroke();
    // Snowflake
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85;
    const cx2 = px + player.w / 2, cy2 = py + player.h / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      ctx.lineTo(cx2 + Math.cos(a) * 10, cy2 + Math.sin(a) * 10);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawArrows() {
  for (const a of arrowProjectiles) {
    ctx.save();
    ctx.globalAlpha = a.life * 0.92;

    // Homing glow: purple swirl around homing arrows
    if (a.homing) {
      ctx.globalAlpha = a.life * 0.55;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a.life * 0.92;
    }

    ctx.fillStyle = a.color;
    ctx.strokeStyle = a.homing ? '#d8b4fe' : '#fbbf24';
    ctx.lineWidth = 1.5;
    const speed  = Math.hypot(a.vx, a.vy) || 1;
    const ang    = Math.atan2(a.vy, a.vx);
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFreezeRays() {
  for (const f of freezeRayProjectiles) {
    ctx.save();
    ctx.globalAlpha = f.life * 0.9;

    // Homing glow: larger purple aura
    if (f.homing) {
      ctx.globalAlpha = f.life * 0.4;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = f.life * 0.9;
    }

    const grad = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 10);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, f.homing ? '#c4b5fd' : '#7dd3fc');
    grad.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStatusOverlays() {
  const now = Date.now();
  // Time Slow: subtle blue tint over whole screen when active
  for (const pl of [player1, player2]) {
    if (!pl || pl.isDead || !pl.timeSlowed) continue;
    const rem = pl.timeSlowedExpiry - now;
    const alpha = Math.min(1, rem / 500) * 0.10;
    ctx.fillStyle = `rgba(96,165,250,${alpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  // EMP: cyan static flash on screen edge when emp fires
  for (const pl of [player1, player2]) {
    if (!pl || pl.isDead || !pl.empActive) continue;
    const rem = pl.empExpiry - now;
    const totalDur = 6000;
    const elapsed = totalDur - rem;
    if (elapsed < 400) {
      const alpha = (1 - elapsed / 400) * 0.18;
      ctx.fillStyle = `rgba(56,189,248,${alpha})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }
  // Vortex: subtle pink edge vignette when controls are inverted
  for (const pl of [player1, player2]) {
    if (!pl || pl.isDead || !pl.controlsInverted) continue;
    const rem = pl.controlsInvertedExpiry - now;
    const alpha = Math.min(1, rem / 400) * 0.08 + 0.04 * Math.sin(now * 0.012);
    const grad = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.3, CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.9);
    grad.addColorStop(0, 'rgba(232,121,249,0)');
    grad.addColorStop(1, `rgba(232,121,249,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

function drawHUD() {
  const now = Date.now();
  drawStatusOverlays();
  // P2 HUD — top left
  drawLives(player2, 16, 16);
  drawAbilityCooldowns(player2, 16, 52, false);

  // P1 HUD — top right
  drawLives(player1, CANVAS_W - 16, 16, true);
  drawAbilityCooldowns(player1, CANVAS_W - 16, 52, true);

  // Score overlays
  if (gameMode === 'tournament') drawTournamentScore();
  if (gameMode === 'longmatch')  drawLongMatchScore();

  // Respawn timers
  if (player1.isDead && player1.lives > 0) {
    drawRespawnMsg(player1, now);
  }
  if (player2.isDead && player2.lives > 0) {
    drawRespawnMsg(player2, now);
  }
}

function drawLongMatchScore() {
  const cx = CANVAS_W / 2;
  ctx.font = 'bold 11px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`LONG MATCH  ·  first to ${lmState.winsNeeded}`, cx, 16);
  ctx.font = 'bold 16px Segoe UI, Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#3b82f6';
  ctx.fillText(`P1: ${lmState.p1Wins}`, cx - 10, 36);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f97316';
  ctx.fillText(`P2: ${lmState.p2Wins}`, cx + 10, 36);
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
  const now  = Date.now();
  const maxL = player.maxLives || 3;

  // Gold flash when life steal triggers
  const flashing = player.lifeStealFlash > 0;
  ctx.font = 'bold 20px Segoe UI, Arial';
  ctx.textAlign = rightAlign ? 'right' : 'left';
  ctx.fillStyle = flashing ? '#fbbf24' : player.color;
  const hearts = '♥'.repeat(Math.max(0, player.lives)) + '♡'.repeat(Math.max(0, maxL - player.lives));
  ctx.fillText(hearts, x, y + 18);

  // Life steal cooldown badge
  if (player.passives && player.passives.includes('lifeSteal')) {
    const cdRemain = Math.max(0, (player.lifeStealCooldown || 0) - now);
    ctx.font = '10px Segoe UI, Arial';
    ctx.fillStyle = cdRemain > 0 ? '#64748b' : '#fbbf24';
    const cdText = cdRemain > 0 ? `💀 ${Math.ceil(cdRemain / 1000)}s` : '💀 ready';
    ctx.fillText(cdText, x, y + 34);
  }
}

function drawAbilityCooldowns(player, x, y, rightAlign) {
  const now   = Date.now();
  const count = player.actives.length;
  const barW  = count <= 3 ? 80 : count === 4 ? 68 : count <= 5 ? 58 : count <= 6 ? 48 : 40;
  const barH  = 9;
  const gap   = count <= 3 ? 18 : count <= 4 ? 14 : count <= 5 ? 12 : count <= 6 ? 10 : 8;
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
    const keyLabel  = keyArr[i].replace('Key', '');
    const maxChars  = barW < 50 ? 8 : barW < 65 ? 10 : 13;
    const shortName = pu.name.length > maxChars ? pu.name.slice(0, maxChars - 1) + '…' : pu.name;
    ctx.fillText(keyLabel + ': ' + shortName, bx + barW / 2, y + barH + 14);
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
  drawSpringboards();
  drawMines();
  drawBlackHoles();
  drawPulseWaves();
  drawLightningEffects();
  drawWalls();
  drawEchoWaves();
  drawArrows();
  drawFreezeRays();
  drawCounterstrikeProjectiles();
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
const CW = 108, CH = 36; // card canvas resolution

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
    const phase  = (t % 1400) / 1400;
    const midY   = CH / 2 + 2;
    const startX = 10, endX = CW - 26;
    const px     = startX + phase * (endX - startX);

    // Ghost trail
    const trailCount = 6;
    for (let i = trailCount; i >= 1; i--) {
      const tp  = Math.max(0, phase - i * 0.06);
      const tx  = startX + tp * (endX - startX);
      const alp = (1 - i / trailCount) * 0.38;
      ctx.fillStyle = `rgba(251,191,36,${alp})`;
      ctx.fillRect(tx, midY - 13, 14, 15);
    }

    // Speed lines
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const ly  = midY - 10 + i * 5;
      const len = 12 + i * 6;
      ctx.beginPath();
      ctx.moveTo(px, ly);
      ctx.lineTo(px - len, ly);
      ctx.stroke();
    }

    // Player
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(px, midY - 13, 14, 15);

    // Landing ring when arriving
    if (phase > 0.88) {
      const p = (phase - 0.88) / 0.12;
      ctx.strokeStyle = `rgba(251,191,36,${1 - p})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(endX + 7, midY + 2, p * 18, p * 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
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

  lightningSpawn(ctx, t) {
    const phase = (t % 1400) / 1400;
    const platY = CH - 14, cx = CW / 2;
    // Platform (solid then disappearing)
    if (phase < 0.55) {
      ctx.fillStyle = '#2d3a4a'; ctx.fillRect(cx - 28, platY, 56, 6);
    } else {
      const p = (phase - 0.55) / 0.1;
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1;
      ctx.strokeRect(cx - 28, platY, 56, 6); ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // Lightning bolt striking the platform
    if (phase > 0.3 && phase < 0.65) {
      const p = (phase - 0.3) / 0.35;
      ctx.save();
      ctx.globalAlpha = p < 0.5 ? p * 2 : (1 - p) * 2;
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx,      0);
      ctx.lineTo(cx + 8,  platY * 0.3);
      ctx.lineTo(cx - 6,  platY * 0.55);
      ctx.lineTo(cx + 5,  platY * 0.78);
      ctx.lineTo(cx,      platY);
      ctx.stroke();
      ctx.restore();
    }
  },

  thunder(ctx, t) {
    const phase = (t % 1800) / 1800;
    const platY = CH - 10, cx = CW / 2;
    // Enemy player standing on the platform
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cx - 7, platY - 16, 14, 15);
    // Platform — normal then turns fake
    const fakeP = Math.max(0, Math.min(1, (phase - 0.3) / 0.2));
    ctx.fillStyle = '#2d3a4a';
    ctx.fillRect(cx - 26, platY, 52, 6);
    if (fakeP > 0) {
      ctx.save();
      ctx.globalAlpha = fakeP;
      ctx.fillStyle = '#3d1010';
      ctx.fillRect(cx - 26, platY, 52, 6);
      ctx.setLineDash([4, 2]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 26, platY, 52, 6);
      ctx.setLineDash([]);
      ctx.restore();
    }
    // Lightning bolt striking the platform
    if (phase > 0.1 && phase < 0.45) {
      const lp = (phase - 0.1) / 0.35;
      ctx.save();
      ctx.globalAlpha = lp < 0.5 ? lp * 2 : (1 - lp) * 2;
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 2);
      ctx.lineTo(cx + 6, platY * 0.35);
      ctx.lineTo(cx - 5, platY * 0.6);
      ctx.lineTo(cx + 3, platY);
      ctx.stroke();
      ctx.restore();
    }
    // Collapse — platform cracks apart
    if (phase > 0.72) {
      const cp = Math.min(1, (phase - 0.72) / 0.18);
      ctx.save();
      ctx.globalAlpha = 1 - cp;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
      ctx.strokeRect(cx - 26, platY, 52, 6);
      ctx.setLineDash([]);
      ctx.restore();
    }
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

  echoBurst(ctx, t) {
    const phase = (t % 1500) / 1500;
    const cy = CH / 2 + 2, originX = 16;
    ctx.fillStyle = '#fb7185'; ctx.fillRect(originX - 6, cy - 13, 12, 14);
    // Horizontal wave (same as echoStrike)
    const travel = phase * 1.9;
    const maxX = CW - 10;
    const wx = travel <= 1 ? originX + travel * (maxX - originX) : maxX - (travel - 1) * (maxX - originX);
    const goingRight = travel <= 1;
    const sa = goingRight ? -Math.PI * 0.5 : Math.PI * 0.5;
    const ea = goingRight ?  Math.PI * 0.5 : Math.PI * 1.5;
    ctx.strokeStyle = 'rgba(251,113,133,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(wx, cy, 10, sa, ea); ctx.stroke();
    // Upward wave
    const wy = cy - phase * (cy + 4);
    ctx.strokeStyle = 'rgba(251,113,133,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(originX, wy, 10, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(251,113,133,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(originX, wy, 17, Math.PI, 0); ctx.stroke();
  },

  arrowShot(ctx, t) {
    const phase = (t % 1200) / 1200;
    const cy = CH / 2 + 2;
    const ax = 14 + phase * (CW - 20);
    // Shooter
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    // Arrow head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.moveTo(ax + 12, cy); ctx.lineTo(ax, cy - 5); ctx.lineTo(ax, cy + 5); ctx.closePath(); ctx.fill();
    // Shaft
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(Math.max(8, ax - 18), cy); ctx.stroke();
    // Feathers
    if (phase < 0.85) {
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ax - 12, cy); ctx.lineTo(ax - 18, cy - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax - 12, cy); ctx.lineTo(ax - 18, cy + 5); ctx.stroke();
    }
  },

  freezeRay(ctx, t) {
    const phase = (t % 1600) / 1600;
    const cy = CH / 2 + 2;
    // Shooter
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(8, cy - 12, 12, 13);
    // Slow orb
    const ox = 22 + phase * (CW - 38);
    const grad = ctx.createRadialGradient(ox, cy, 1, ox, cy, 9);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#7dd3fc');
    grad.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(ox, cy, 9, 0, Math.PI * 2); ctx.fill();
    // Frozen target at end
    if (phase > 0.7) {
      const p = (phase - 0.7) / 0.3;
      ctx.fillStyle = `rgba(186,230,253,${p * 0.7})`; ctx.fillRect(CW - 22, cy - 12, 12, 13);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
      ctx.strokeRect(CW - 22, cy - 12, 12, 13);
    }
  },

  archery(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cy = CH / 2 + 2, cx = CW / 2;
    ctx.fillStyle = '#4ade80'; ctx.fillRect(cx - 7, cy - 12, 14, 13);
    // Multiple arrows spawning after "action" at phase 0.3
    for (let i = 0; i < 2; i++) {
      const delay = i * 0.25;
      const p = Math.max(0, (phase - 0.3 - delay)) / 0.5;
      if (p <= 0) continue;
      const dir = i === 0 ? 1 : -1;
      const ax = cx + dir * (8 + p * 42);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.moveTo(ax + dir*10, cy); ctx.lineTo(ax, cy - 4); ctx.lineTo(ax, cy + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(ax - dir*12, cy); ctx.stroke();
    }
  },

  swap(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    // Two players swap
    const px1 = phase < 0.5 ? 14 : CW - 26;
    const px2 = phase < 0.5 ? CW - 26 : 14;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(px1, cy - 12, 12, 13);
    ctx.fillStyle = '#f97316'; ctx.fillRect(px2, cy - 12, 12, 13);
    // Swap arc during transition
    if (phase >= 0.35 && phase <= 0.65) {
      const p = (phase - 0.35) / 0.3;
      ctx.strokeStyle = `rgba(168,85,247,${1 - Math.abs(p - 0.5) * 2})`; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(CW/2, cy, CW/2 - 14, Math.PI * 0.9, Math.PI * 0.1, false); ctx.stroke();
      ctx.beginPath(); ctx.arc(CW/2, cy, CW/2 - 14, Math.PI * 1.1, Math.PI * 1.9, false); ctx.stroke();
      ctx.setLineDash([]);
    }
  },

  homing(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    // Shooter on left
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    // Target on right
    ctx.fillStyle = '#f97316'; ctx.fillRect(CW - 20, cy - 12, 12, 13);
    // Homing arrow curving toward target
    const progress = phase;
    const startX = 22, endX = CW - 20;
    const controlY = cy - 28;
    const t2 = progress;
    const ax = (1-t2)*(1-t2)*startX + 2*(1-t2)*t2*(CW/2) + t2*t2*endX;
    const ay = (1-t2)*(1-t2)*cy     + 2*(1-t2)*t2*controlY  + t2*t2*cy;
    // Trail
    for (let i = 1; i <= 6; i++) {
      const tp = Math.max(0, t2 - i * 0.05);
      const tx2 = (1-tp)*(1-tp)*startX + 2*(1-tp)*tp*(CW/2) + tp*tp*endX;
      const ty2 = (1-tp)*(1-tp)*cy     + 2*(1-tp)*tp*controlY  + tp*tp*cy;
      ctx.fillStyle = `rgba(168,85,247,${(1 - i/7) * 0.55})`;
      ctx.beginPath(); ctx.arc(tx2, ty2, 3 - i*0.3, 0, Math.PI*2); ctx.fill();
    }
    // Arrow head
    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI*2); ctx.fill();
    // Purple glow ring
    ctx.strokeStyle = `rgba(168,85,247,${0.5 + Math.sin(t*0.008)*0.3})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI*2); ctx.stroke();
  },

  lifeSteal(ctx, t) {
    const phase = (t % 2000) / 2000;
    const cy = CH / 2 + 2;
    // Killer on left (blue), victim on right (orange, fading)
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    const fade = phase > 0.5 ? Math.max(0, 1 - (phase - 0.5) / 0.25) : 1;
    ctx.fillStyle = `rgba(249,115,22,${fade})`; ctx.fillRect(CW - 20, cy - 12, 12, 13);
    // Heart traveling from victim to killer
    if (phase > 0.45 && phase < 0.95) {
      const hp = (phase - 0.45) / 0.5;
      const hx = (CW - 20) + hp * (8 - (CW - 20));
      ctx.font = `${11 + Math.sin(hp * Math.PI) * 4}px Segoe UI`;
      ctx.fillStyle = `rgba(251,191,36,${Math.sin(hp * Math.PI)})`;
      ctx.textAlign = 'center';
      ctx.fillText('♥', hx, cy - 2);
    }
    // Gold glow on killer when heart arrives
    if (phase > 0.88) {
      const gp = (phase - 0.88) / 0.12;
      ctx.strokeStyle = `rgba(251,191,36,${(1 - gp) * 0.9})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(14, cy - 5, (1-gp) * 14 + 6, 0, Math.PI*2); ctx.stroke();
    }
  },

  phase(ctx, t) {
    const phase = (t % 1600) / 1600;
    const cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 16, 6, 32, 18);
    ctx.fillStyle = '#475569'; ctx.fillRect(cx - 12, 9, 8, 6); ctx.fillRect(cx + 2, 9, 8, 6);
    const groundY = CH - 8;
    const topY = 6 - 16;
    const py = phase < 0.5
      ? groundY - (phase / 0.5) * (groundY - 24)
      : topY + ((phase - 0.5) / 0.1) * (24 - topY);
    ctx.save();
    if (phase > 0.35 && phase < 0.65) ctx.globalAlpha = 0.3 + Math.sin(phase * Math.PI * 8) * 0.25;
    ctx.fillStyle = '#818cf8'; ctx.fillRect(cx - 7, Math.min(py, CH - 18) - 14, 14, 15);
    ctx.restore();
  },

  // ── 20 NEW ABILITY CARD ANIMATIONS ──

  ironSkin(ctx, t) {
    const phase = (t % 1600) / 1600;
    const cx = CW / 2, cy = CH / 2 + 2;
    // Armour plates forming around player
    ctx.fillStyle = '#1d4ed8'; ctx.fillRect(cx - 7, cy - 13, 14, 15);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + phase * Math.PI * 0.5;
      const r = 18;
      const px2 = cx + Math.cos(a) * r, py2 = cy - 5 + Math.sin(a) * r * 0.6;
      const alpha = 0.4 + 0.5 * Math.abs(Math.sin(phase * Math.PI * 2 + i));
      ctx.fillStyle = `rgba(71,85,105,${alpha})`;
      ctx.fillRect(px2 - 4, py2 - 4, 8, 8);
    }
    // Push wave hitting and bouncing back
    if (phase > 0.5) {
      const p = (phase - 0.5) / 0.5;
      const r = p * 30;
      ctx.strokeStyle = `rgba(251,191,36,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx - 26 + r, cy - 5, 6, Math.PI * 0.4, Math.PI * 1.6); ctx.stroke();
    }
  },

  thorns(ctx, t) {
    const phase = (t % 1600) / 1600;
    const cy = CH / 2 + 2;
    // Player with spikes
    ctx.fillStyle = '#16a34a'; ctx.fillRect(26, cy - 13, 14, 15);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const len = 10 + Math.sin(phase * Math.PI * 2 + i) * 3;
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(33 + Math.cos(a) * 10, cy - 5 + Math.sin(a) * 8);
      ctx.lineTo(33 + Math.cos(a) * (10 + len), cy - 5 + Math.sin(a) * (8 + len * 0.6));
      ctx.stroke();
    }
    // Attacker getting pushed back
    if (phase > 0.3) {
      const p = (phase - 0.3) / 0.7;
      ctx.fillStyle = `rgba(249,115,22,${1 - p * 0.5})`; ctx.fillRect(CW - 22 + p * 12, cy - 12, 12, 13);
    } else {
      ctx.fillStyle = '#f97316'; ctx.fillRect(CW - 22 - (0.3 - phase) / 0.3 * 28, cy - 12, 12, 13);
    }
  },

  reboundJump(ctx, t) {
    const phase = (t % 1600) / 1600;
    const groundY = CH - 8, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    // Player gets pushed from left, then immediately jumps
    const pushed = phase > 0.3 && phase < 0.65;
    let py;
    if (phase < 0.3) {
      py = groundY - 16;
      // Arrow incoming from left
      const ax = -4 + (phase / 0.3) * (cx - 2);
      ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, groundY - 9); ctx.lineTo(ax + 10, groundY - 9); ctx.stroke();
    } else if (phase < 0.65) {
      const p = (phase - 0.3) / 0.35;
      py = groundY - 16 - Math.sin(p * Math.PI) * 32;
      // Jump spark
      if (p < 0.15) { ctx.fillStyle = 'rgba(251,191,36,0.85)'; ctx.beginPath(); ctx.arc(cx, py + 15, p * 12, 0, Math.PI*2); ctx.fill(); }
    } else {
      py = groundY - 16 - Math.sin(((1 - phase) / 0.35) * Math.PI) * 14;
    }
    ctx.fillStyle = '#34d399'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  adrenaline(ctx, t) {
    const phase = (t % 1400) / 1400;
    const groundY = CH - 8, cx = 22;
    ctx.fillStyle = '#334155'; ctx.fillRect(4, groundY, CW - 8, 4);
    const spd = 0.5 + phase * 1.2;
    const px2 = 14 + (phase * spd * (CW - 28)) % (CW - 28);
    // Speed lines behind fast player (red = last life)
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(239,68,68,${(1 - i * 0.18) * 0.65})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px2 - 6 - i * 10, groundY - 9 + (i % 2) * 5);
      ctx.lineTo(px2 - 18 - i * 10, groundY - 9 + (i % 2) * 5); ctx.stroke();
    }
    ctx.fillStyle = '#ef4444'; ctx.fillRect(px2, groundY - 16, 14, 15);
    // Single life indicator
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('♥', px2 + 7, groundY - 5);
  },

  lastStand(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cy = CH / 2 + 2;
    // Player on left (red = 1 life) firing a huge push
    ctx.fillStyle = '#ef4444'; ctx.fillRect(8, cy - 12, 12, 13);
    ctx.fillStyle = '#fbbf24'; ctx.font = '9px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText('♥', 14, cy - 14);
    // Big push arc
    if (phase > 0.2) {
      const p = (phase - 0.2) / 0.8;
      const r = 10 + p * 58;
      ctx.strokeStyle = `rgba(239,68,68,${Math.max(0, 1 - p)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(20, cy - 5, r, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    }
    // Opponent getting launched
    const ox = Math.min(22 + phase * 70, CW - 14);
    ctx.fillStyle = '#f97316'; ctx.fillRect(ox, cy - 12 - phase * 14, 12, 13);
  },

  momentum(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cy = CH / 2 + 2;
    // Player accelerating across screen
    const px2 = 10 + phase * (CW - 36);
    for (let i = 1; i <= 5; i++) {
      const tp = Math.max(0, phase - i * 0.07);
      const tx2 = 10 + tp * (CW - 36);
      ctx.fillStyle = `rgba(99,102,241,${(1 - i / 6) * 0.5})`; ctx.fillRect(tx2, cy - 12, 12, 13);
    }
    ctx.fillStyle = '#6366f1'; ctx.fillRect(px2, cy - 12, 12, 13);
    // Speed speedometer arc
    const r = 14;
    const ang = -Math.PI * 0.8 + phase * Math.PI * 1.6;
    ctx.strokeStyle = 'rgba(99,102,241,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px2 + 6, cy + 14, r, -Math.PI * 0.8, Math.PI * 0.8); ctx.stroke();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px2 + 6, cy + 14, r, -Math.PI * 0.8, ang); ctx.stroke();
  },

  springLegs(ctx, t) {
    const phase = (t % 1600) / 1600;
    const groundY = CH - 8, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 30, groundY, 60, 4);
    // Player falls then bounces with spring effect
    let py;
    const bounce = phase > 0.45 && phase < 0.75;
    if (phase < 0.45) {
      py = 4 + (phase / 0.45) * (groundY - 20);
    } else if (phase < 0.75) {
      const p = (phase - 0.45) / 0.3;
      py = groundY - 16 - Math.sin(p * Math.PI) * 34;
      // Spring coil under feet
      if (p < 0.2) {
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const y0 = groundY - i * 5;
          ctx.beginPath(); ctx.moveTo(cx - 6, y0); ctx.lineTo(cx + 6, y0 - 3); ctx.stroke();
        }
      }
    } else {
      py = groundY - 16 - Math.sin((1 - (phase - 0.75) / 0.25) * Math.PI) * 14;
    }
    ctx.fillStyle = '#22c55e'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  vampiricAura(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    // Player (left) draining from opponent (right)
    ctx.fillStyle = '#9333ea'; ctx.fillRect(8, cy - 12, 12, 13);
    const fade = Math.max(0.2, 1 - phase * 0.6);
    ctx.fillStyle = `rgba(249,115,22,${fade})`; ctx.fillRect(CW - 20, cy - 12, 12, 13);
    // Drain tendrils flowing left to right
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.3;
      const p = ((phase + delay) % 1);
      const dx = CW - 20 - 22;
      ctx.strokeStyle = `rgba(192,132,252,${(1 - p) * 0.8})`; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CW - 20, cy - 3 + i * 5);
      ctx.quadraticCurveTo(CW / 2, cy - 10 + i * 8, 22 - (1 - p) * dx * 0.15, cy - 3 + i * 5);
      ctx.stroke();
    }
    // Glow growing on the player
    ctx.strokeStyle = `rgba(147,51,234,${0.3 + phase * 0.5})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(14, cy - 5, 8 + phase * 6, 0, Math.PI * 2); ctx.stroke();
  },

  extraLife(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cx = CW / 2, cy = CH / 2 + 2;
    ctx.fillStyle = '#22c55e'; ctx.fillRect(cx - 7, cy - 12, 14, 13);
    // Heart icon appearing above player
    const heartY = cy - 18 - Math.abs(Math.sin(phase * Math.PI)) * 12;
    const heartAlpha = 0.5 + Math.abs(Math.sin(phase * Math.PI * 2)) * 0.5;
    ctx.font = `${12 + Math.sin(phase * Math.PI * 2) * 3}px Segoe UI`;
    ctx.fillStyle = `rgba(251,191,36,${heartAlpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('♥', cx, heartY);
    // Life counter +1
    ctx.fillStyle = 'rgba(34,197,94,0.7)';
    ctx.font = 'bold 9px Segoe UI';
    ctx.fillText('+1', cx + 12, cy - 16);
  },

  counterstrike(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    // Player (left) falling off, then firing a blast
    if (phase < 0.35) {
      const p = phase / 0.35;
      ctx.fillStyle = `rgba(239,68,68,${1 - p * 0.6})`; ctx.fillRect(8, cy - 12 + p * (CH - cy + 12), 12, 13);
    }
    // Death blast explosion
    if (phase > 0.35 && phase < 0.65) {
      const p = (phase - 0.35) / 0.3;
      ctx.fillStyle = `rgba(239,68,68,${(1 - p) * 0.7})`;
      ctx.beginPath(); ctx.arc(14, cy, p * 32, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(251,191,36,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(14, cy, p * 32, 0, Math.PI * 2); ctx.stroke();
    }
    // Opponent gets launched
    if (phase > 0.4) {
      const p = (phase - 0.4) / 0.6;
      ctx.fillStyle = '#f97316'; ctx.fillRect(Math.min(22 + p * 60, CW - 14), cy - 12 - p * 18, 12, 13);
    }
  },

  timeSlow(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    // Shooter on left moving normally
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    // Opponent on right moving very slowly with blue clock tint
    const ox = CW - 26 + (phase < 0.5 ? 0 : (phase - 0.5) / 0.5 * 4);
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(ox, cy - 12, 12, 13);
    // Clock face overlay
    const r = 8;
    ctx.strokeStyle = 'rgba(186,230,253,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox + 6, cy - 5, r, 0, Math.PI * 2); ctx.stroke();
    // Clock hand slowing down
    const handAng = -Math.PI / 2 + phase * Math.PI * (phase < 0.5 ? 4 : 0.3);
    ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox + 6, cy - 5); ctx.lineTo(ox + 6 + Math.cos(handAng) * 5, cy - 5 + Math.sin(handAng) * 5); ctx.stroke();
    // Blue wave from shooter
    if (phase > 0.1 && phase < 0.55) {
      const p = (phase - 0.1) / 0.45;
      const wx = 22 + p * (ox - 22);
      ctx.strokeStyle = `rgba(96,165,250,${(1 - p) * 0.8})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wx, cy - 5, 8, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
  },

  anchor(ctx, t) {
    const phase = (t % 1600) / 1600;
    const groundY = CH - 8, cx = CW - 24;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 26, groundY, 60, 4);
    // Target player stuck to ground
    ctx.fillStyle = '#f97316'; ctx.fillRect(cx - 7, groundY - 16, 14, 15);
    // Chains going into ground
    ctx.strokeStyle = `rgba(245,158,11,${0.7 + Math.sin(phase * Math.PI * 2) * 0.2})`; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 8, groundY);
      ctx.lineTo(cx + i * 8, groundY + 14 * Math.min(1, phase / 0.4));
      ctx.stroke();
    }
    // Anchor symbol
    if (phase > 0.3) {
      ctx.fillStyle = 'rgba(245,158,11,0.6)';
      ctx.font = '13px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('⚓', cx, groundY - 20);
    }
    // Shooter on left
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(10, groundY - 16, 12, 15);
  },

  vortex(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    ctx.fillStyle = '#f97316'; ctx.fillRect(CW - 20, cy - 12, 12, 13);
    // Swirling arrows around opponent (controls inverted)
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + phase * Math.PI * 3;
      ctx.strokeStyle = `rgba(232,121,249,${0.5 + Math.sin(a) * 0.3})`; ctx.lineWidth = 1.5;
      const rx = CW - 14 + Math.cos(a) * 14;
      const ry = cy - 5 + Math.sin(a) * 10;
      ctx.beginPath(); ctx.arc(rx, ry, 3, a, a + Math.PI); ctx.stroke();
    }
    // Reversed arrow indicators
    if (phase > 0.5) {
      const p = (phase - 0.5) / 0.5;
      ctx.strokeStyle = `rgba(232,121,249,${p})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(CW - 9, cy - 22); ctx.lineTo(CW - 19, cy - 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CW - 18, cy - 26); ctx.lineTo(CW - 19, cy - 22); ctx.lineTo(CW - 14, cy - 18); ctx.stroke();
    }
  },

  empBurst(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    // EMP ring expanding
    if (phase > 0.2) {
      const p = Math.min(1, (phase - 0.2) / 0.5);
      ctx.strokeStyle = `rgba(56,189,248,${1 - p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CW - 14, cy - 5, p * 34, 0, Math.PI * 2); ctx.stroke();
      // Static lines radiating
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.strokeStyle = `rgba(56,189,248,${(1 - p) * 0.7})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(CW - 14 + Math.cos(a) * p * 28, cy - 5 + Math.sin(a) * p * 28);
        ctx.lineTo(CW - 14 + Math.cos(a) * p * 38, cy - 5 + Math.sin(a) * p * 38); ctx.stroke();
      }
    }
    // Opponent flickering (EMP'd, can't use abilities)
    const flicker = Math.floor(phase * 30) % 2 === 0;
    ctx.fillStyle = flicker ? '#f97316' : '#7f3a0d';
    ctx.fillRect(CW - 20, cy - 12, 12, 13);
    // X over opponent's ability icon
    if (phase > 0.55) {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(CW - 20, cy - 12); ctx.lineTo(CW - 8, cy + 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CW - 8, cy - 12); ctx.lineTo(CW - 20, cy + 1); ctx.stroke();
    }
  },

  mine(ctx, t) {
    const phase = (t % 1800) / 1800;
    const groundY = CH - 8, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 36, groundY, 72, 4);
    // Mine sitting on ground
    const mineAlpha = phase < 0.65 ? 0.4 + Math.sin(phase * Math.PI * 4) * 0.3 : 0;
    if (mineAlpha > 0) {
      ctx.fillStyle = `rgba(239,68,68,${mineAlpha})`;
      ctx.beginPath();
      ctx.moveTo(cx, groundY - 8); ctx.lineTo(cx + 7, groundY); ctx.lineTo(cx, groundY + 5); ctx.lineTo(cx - 7, groundY); ctx.closePath(); ctx.fill();
    }
    // Opponent walking over mine → explosion
    if (phase > 0.45) {
      const p = phase < 0.65 ? (phase - 0.45) / 0.2 : 1;
      ctx.fillStyle = '#f97316'; ctx.fillRect(cx - 22 + p * 18, groundY - 16, 12, 15);
    }
    if (phase > 0.65 && phase < 0.9) {
      const p = (phase - 0.65) / 0.25;
      ctx.fillStyle = `rgba(251,191,36,${1 - p})`;
      ctx.beginPath(); ctx.arc(cx, groundY - 2, p * 28, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(239,68,68,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, groundY - 2, p * 28, 0, Math.PI * 2); ctx.stroke();
    }
  },

  pulseExpand(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cx = CW / 2 - 8, cy = CH / 2 + 2;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(cx - 7, cy - 12, 14, 13);
    for (let i = 0; i < 3; i++) {
      const p = ((phase + i * 0.33) % 1);
      const r = p * 44;
      ctx.strokeStyle = `rgba(99,102,241,${(1 - p) * 0.85})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy - 5, r, 0, Math.PI * 2); ctx.stroke();
    }
  },

  springboard(ctx, t) {
    const phase = (t % 1800) / 1800;
    const groundY = CH - 8, cx = CW / 2;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx - 36, groundY, 72, 4);
    // Springboard platform
    ctx.fillStyle = '#22c55e'; ctx.fillRect(cx - 22, groundY - 10, 44, 8);
    ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const sx = cx - 18 + i * 11; ctx.beginPath(); ctx.moveTo(sx, groundY - 10); ctx.lineTo(sx + 3, groundY - 6); ctx.lineTo(sx + 6, groundY - 10); ctx.stroke(); }
    // Player bouncing off it
    const py = phase < 0.45
      ? groundY - Math.pow(phase / 0.45, 2) * 46 + 16 - 16
      : groundY - 16 - Math.sin(((phase - 0.45) / 0.55) * Math.PI) * 42;
    ctx.fillStyle = '#f97316'; ctx.fillRect(cx - 7, py - 14, 14, 15);
  },

  blackHole(ctx, t) {
    const phase = (t % 2000) / 2000;
    const cx = CW / 2, cy = CH / 2 + 2;
    // Black hole in center
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.01);
    const grad = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy - 5, 22 * pulse);
    grad.addColorStop(0, 'rgba(88,28,135,0.9)');
    grad.addColorStop(0.5, 'rgba(109,40,217,0.4)');
    grad.addColorStop(1, 'rgba(109,40,217,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy - 5, 22 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f0720';
    ctx.beginPath(); ctx.arc(cx, cy - 5, 7 * pulse, 0, Math.PI * 2); ctx.fill();
    // Swirl lines
    for (let i = 0; i < 4; i++) {
      const a = (t * 0.005) + (i / 4) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(167,139,250,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy - 5, 12 + i * 2, a, a + Math.PI * 0.9); ctx.stroke();
    }
    // Two players being pulled in
    const p1x = 10 + phase * 26;
    const p2x = CW - 22 - phase * 26;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(p1x, cy - 12, 12, 13);
    ctx.fillStyle = '#f97316'; ctx.fillRect(p2x, cy - 12, 12, 13);
  },

  chainLightning(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cy = CH / 2 + 2;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    ctx.fillStyle = '#f97316'; ctx.fillRect(CW - 20, cy - 12, 12, 13);
    // Jagged lightning bolt between players
    if (phase > 0.15 && phase < 0.7) {
      const lp = (phase - 0.15) / 0.55;
      const alpha = lp < 0.5 ? lp * 2 : (1 - lp) * 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.5; ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(22, cy - 5);
      const segs = 5;
      for (let i = 1; i < segs; i++) {
        const sx = 22 + (i / segs) * (CW - 42);
        ctx.lineTo(sx + (Math.random() - 0.5) * 22, cy - 5 + (Math.random() - 0.5) * 18);
      }
      ctx.lineTo(CW - 20, cy - 5);
      ctx.stroke();
      ctx.restore();
    }
    // Opponent launched
    if (phase > 0.6) {
      const p = (phase - 0.6) / 0.4;
      ctx.fillStyle = '#f97316'; ctx.fillRect(CW - 20 + p * 8, cy - 12 - p * 16, 12, 13);
    }
  },

  stunBlast(ctx, t) {
    const phase = (t % 1600) / 1600;
    const cy = CH / 2 + 2;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 12, 12, 13);
    // Opponent frozen with stars above
    ctx.fillStyle = '#f97316'; ctx.fillRect(CW - 20, cy - 12, 12, 13);
    if (phase > 0.3) {
      const p = Math.min(1, (phase - 0.3) / 0.25);
      // Stun ring
      ctx.strokeStyle = `rgba(253,224,71,${p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CW - 14, cy - 5, p * 16, 0, Math.PI * 2); ctx.stroke();
      // Stars spinning
      const angle = phase * Math.PI * 6;
      for (let i = 0; i < 3; i++) {
        const a = angle + (i / 3) * Math.PI * 2;
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(CW - 14 + Math.cos(a) * 10, cy - 5 + Math.sin(a) * 6, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Blast wave from shooter
    if (phase > 0.1 && phase < 0.45) {
      const p = (phase - 0.1) / 0.35;
      const bx = 22 + p * (CW - 42);
      ctx.strokeStyle = `rgba(251,191,36,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, cy - 5, 8, -Math.PI/2, Math.PI/2); ctx.stroke();
    }
  },

  rage(ctx, t) {
    const phase = (t % 1800) / 1800;
    const cy = CH / 2 + 2;
    // Player body
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(CW/2 - 6, cy - 12, 12, 14);
    // Rage aura: pulsing red rings
    const pulse = 0.4 + Math.sin(phase * Math.PI * 2) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CW/2, cy - 5, 12 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CW/2, cy - 5, 18 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Boost indicators
    if (phase > 0.15 && phase < 0.55) {
      const p = Math.min(1, (phase - 0.15) / 0.15);
      ctx.strokeStyle = `rgba(251,146,60,${p * 0.8})`; ctx.lineWidth = 2;
      const bx = CW/2 + 14 + p * 18, bx2 = CW/2 - 14 - p * 18;
      ctx.beginPath(); ctx.moveTo(bx - 4, cy - 5); ctx.lineTo(bx + 4, cy - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx2 + 4, cy - 5); ctx.lineTo(bx2 - 4, cy - 5); ctx.stroke();
    }
    // Slow phase indicator (grey tint)
    if (phase > 0.65) {
      const p = (phase - 0.65) / 0.35;
      ctx.globalAlpha = p * 0.4;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(CW/2 - 8, cy - 14, 16, 18);
      ctx.globalAlpha = 1;
    }
  },

  perfectHit(ctx, t) {
    const phase = (t % 1400) / 1400;
    const cy = CH / 2 + 2;
    // Two players
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, cy - 11, 10, 13);
    ctx.fillStyle = '#f97316'; ctx.fillRect(CW - 18, cy - 11, 10, 13);
    // Arrow flying
    const ax = 22 + phase * (CW - 52);
    const ang = 0;
    ctx.save();
    ctx.translate(ax, cy - 5);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, 0); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    // On hit: flash + cooldown reset (CD icon disappears)
    if (phase > 0.75) {
      const p = (phase - 0.75) / 0.25;
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CW - 13, cy - 5, p * 14, 0, Math.PI * 2); ctx.stroke();
      // CD text cleared
      ctx.fillStyle = '#4ade80';
      ctx.font = `bold ${7}px sans-serif`;
      ctx.fillText('CD!', 4, cy + 14 * p - 2);
      ctx.globalAlpha = 1;
    }
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
  const lmPoolNum = (lmState.poolSize === 'all' || lmState.poolSize === Infinity)
    ? ALL_POWERUPS.length : (lmState.poolSize || 15);
  const cardCount = gameMode === 'setgame'
    ? Math.min(customSettings.poolSize, ALL_POWERUPS.length)
    : gameMode === 'longmatch'
    ? Math.min(lmPoolNum, ALL_POWERUPS.length)
    : gameMode === 'deathmatch' ? 15 : 12;

  // Long Match pick phase: exclude abilities the picker already has
  let pool = [...ALL_POWERUPS];
  if (gameMode === 'longmatch' && lmState.pickerNum !== null) {
    const existing = lmState.pickerNum === 1 ? lmState.p1Abilities : lmState.p2Abilities;
    pool = pool.filter(p => !existing.includes(p.id));
  }
  const shuffled = pool.sort(() => Math.random() - 0.5);
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

  if (gameMode === 'longmatch') {
    const names = ids => ids.map(id => ALL_POWERUPS.find(p => p.id === id)?.name).filter(Boolean).join(', ');
    if (lmState.pickerNum === null) {
      // Initial pick — both pick 1
      p1StatusEl.textContent = p1Confirmed ? '✓ Ready!' : 'Pick your starting ability (1/1)';
      p2StatusEl.textContent = p2Confirmed ? '✓ Ready!' : 'Pick your starting ability (1/1)';
    } else if (lmState.pickerNum === 1) {
      p1StatusEl.textContent = p1Confirmed ? '✓ Ready!' : `Pick 1 new ability  ·  Have: ${names(lmState.p1Abilities) || 'none'}`;
      p2StatusEl.textContent = `✓ Set  ·  Has: ${names(lmState.p2Abilities) || 'none'}`;
    } else {
      p1StatusEl.textContent = `✓ Set  ·  Has: ${names(lmState.p1Abilities) || 'none'}`;
      p2StatusEl.textContent = p2Confirmed ? '✓ Ready!' : `Pick 1 new ability  ·  Have: ${names(lmState.p2Abilities) || 'none'}`;
    }
  } else {
    p1StatusEl.textContent = p1Confirmed
      ? '✓ Ready!'
      : `Pick ${maxPicks} powers (${p1SelectedIds.length}/${maxPicks})`;
    p2StatusEl.textContent = p2Confirmed
      ? '✓ Ready!'
      : `Pick ${maxPicks} powers (${p2SelectedIds.length}/${maxPicks})`;
  }
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

  // P1 pick / confirm (blocked in Long Match if P1 is not the picker)
  const p1CanPick = gameMode !== 'longmatch' || lmState.pickerNum === null || lmState.pickerNum === 1;
  if (p1CanPick && p1SelectConfirm()) {
    const id = drawnPowerups[p1SelectCursor].id;
    if (!p1Confirmed) {
      if (p1SelectedIds.includes(id)) {
        p1SelectedIds = p1SelectedIds.filter(x => x !== id);
      } else if (p1SelectedIds.length < maxPicks) {
        p1SelectedIds.push(id);
        sfxPickCard();
      }
      if (p1SelectedIds.length === maxPicks) p1Confirmed = true;
    }
  }

  // P2 pick / confirm (blocked in Long Match if P2 is not the picker)
  const p2CanPick = gameMode !== 'longmatch' || lmState.pickerNum === null || lmState.pickerNum === 2;
  if (p2CanPick && p2SelectConfirm()) {
    const id = drawnPowerups[p2SelectCursor].id;
    if (!p2Confirmed) {
      if (p2SelectedIds.includes(id)) {
        p2SelectedIds = p2SelectedIds.filter(x => x !== id);
      } else if (p2SelectedIds.length < maxPicks) {
        p2SelectedIds.push(id);
        sfxPickCard();
      }
      if (p2SelectedIds.length === maxPicks) p2Confirmed = true;
    }
  }

  // Long Match bot auto-pick
  if (gameMode === 'longmatch' && lmState.botOpponent && !p2Confirmed) {
    const shouldPick = lmState.pickerNum === 2           // bot's dedicated pick turn
                    || (lmState.pickerNum === null && p1Confirmed); // initial pick after P1 confirms
    if (shouldPick) {
      const avail = drawnPowerups.filter(p => !p2SelectedIds.includes(p.id));
      if (avail.length > 0) {
        p2SelectedIds = [avail[Math.floor(Math.random() * avail.length)].id];
        p2Confirmed   = true;
      }
    }
  }

  // Set Game / Bot Match auto-pick: once P1 confirms, randomly fill P2's slots
  if (isBotMode() && customSettings.botAutoPick && p1Confirmed && !p2Confirmed) {
    const available = drawnPowerups.filter(p => !p2SelectedIds.includes(p.id));
    const shuffled  = [...available].sort(() => Math.random() - 0.5);
    p2SelectedIds   = shuffled.slice(0, maxPicks).map(p => p.id);
    if (p2SelectedIds.length >= maxPicks) p2Confirmed = true;
  }

  updatePowerSelectCursors();

  // Override P2 status text when bot auto-pick is on
  if (isBotMode() && customSettings.botAutoPick) {
    p2StatusEl.textContent = p2Confirmed ? '🤖 Bot ready!' : '🤖 Waiting for P1…';
  }

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

  // Bot AI (computes botInput before physics)
  updateBotAI(dt, now);

  // Abilities
  updateAbilityEffects(player1, now);
  updateAbilityEffects(player2, now);
  updatePassiveEffects(player1, player2);
  updatePassiveEffects(player2, player1);
  updateAbilityInput(player1, player2, ts);
  if (!isBotMode()) updateAbilityInput(player2, player1, ts);

  // Physics P1
  if (!player1.isDead && !player1.frozen && !player1.stunned) {
    if (player1.dashActive) {
      updateDash(player1);
    } else if (!player1.grappling) {
      applyGravity(player1);
      const p1l = player1.controlsInverted ? p1Right() : p1Left();
      const p1r = player1.controlsInverted ? p1Left()  : p1Right();
      applyHorizontalMovement(player1, p1l, p1r);
      if (p1Jump()) attemptJump(player1);
      moveAndCollide(player1);
      checkVoid(player1);
    }
  }

  // Physics P2
  if (!player2.isDead && !player2.frozen && !player2.stunned) {
    if (player2.dashActive) {
      updateDash(player2);
    } else if (!player2.grappling) {
      applyGravity(player2);
      let doLeft  = isBotMode() ? botInput.left  : p2Left();
      let doRight = isBotMode() ? botInput.right : p2Right();
      if (player2.controlsInverted) { const tmp = doLeft; doLeft = doRight; doRight = tmp; }
      applyHorizontalMovement(player2, doLeft, doRight);
      const doJump = isBotMode() ? botInput.jump : p2Jump();
      if (doJump) attemptJump(player2);
      moveAndCollide(player2);
      checkVoid(player2);
    }
  }

  // Systems
  updatePushInputGame(now);
  updatePushEffects(dt);
  updateEchoWaves(now);
  updateArrows(now);
  updateFreezeRays(now);
  updateWalls(now);
  updateTemporaryPlatforms(now);
  updateLightningEffects(now);
  updateFakePlatforms(now);
  updateMines(now);
  updateSpringboards(now);
  updateBlackHoles(now);
  updatePulseWaves(now);
  updateCounterstrikeProjectiles(now);
  updateRespawn(player1, dt);
  updateRespawn(player2, dt);

  // Timers
  // Landing sound — fires on the first frame a player touches a platform
  const now2 = Date.now();
  if (!player1.isDead && !player1.dashActive && player1.onGround && !player1._wasGround
      && now2 > player1.spawnImmunityExpiry) sfxLand();
  if (!player2.isDead && !player2.dashActive && player2.onGround && !player2._wasGround
      && now2 > player2.spawnImmunityExpiry) sfxLand();
  player1._wasGround = player1.onGround;
  player2._wasGround = player2.onGround;

  if (player1.pushFlashTimer  > 0) player1.pushFlashTimer  -= dt;
  if (player2.pushFlashTimer  > 0) player2.pushFlashTimer  -= dt;
  if (player1.lifeStealFlash  > 0) player1.lifeStealFlash  -= dt;
  if (player2.lifeStealFlash  > 0) player2.lifeStealFlash  -= dt;
  if (player1.djBurstTimer > 0) {
    player1.djBurstTimer -= dt;
    player1.djTrail.push({ x: player1.x, y: player1.y });
    if (player1.djTrail.length > 9) player1.djTrail.shift();
  } else { player1.djTrail = []; }

  if (player2.djBurstTimer > 0) {
    player2.djBurstTimer -= dt;
    player2.djTrail.push({ x: player2.x, y: player2.y });
    if (player2.djTrail.length > 9) player2.djTrail.shift();
  } else { player2.djTrail = []; }

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
  [titleScreen, powerSelectScreen, gameScreen, gameOverScreen, roundOverScreen,
   setGameScreen, fourPScreen, longMatchSettingsScreen, lmRoundScreen].forEach(s => {
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
      fpState  = { active: false, matchNum: 0, semiWinner1: null, semiWinner2: null, allIds: [[], [], [], []] };
      lmState  = { ...lmState, p1Wins: 0, p2Wins: 0, p1Abilities: [], p2Abilities: [], loserNum: null, pickerNum: null };
      startMusic('title');
      break;

    case 'POWER_SELECT': {
      const selectTitleEl = document.getElementById('selectTitle');
      const slotHintEl    = document.getElementById('slotHint');
      if (fpState.active && fpState.matchNum === 1) {
        selectTitleEl.textContent = 'Semi-Final 2 — Player 3 & 4 Choose Powers';
      } else if (fpState.active && fpState.matchNum === 0) {
        selectTitleEl.textContent = 'Semi-Final 1 — Player 1 & 2 Choose Powers';
      } else if (gameMode === 'longmatch') {
        if (lmState.pickerNum === null) {
          selectTitleEl.textContent = 'Long Match — Pick your starting ability';
        } else {
          selectTitleEl.textContent = `Player ${lmState.pickerNum}, pick your next ability!`;
        }
      } else if (isBotMode()) {
        selectTitleEl.textContent = `Bot Match — Choose Your Powers (${maxPicks} each)`;
      } else {
        selectTitleEl.textContent = `Choose Your Powers (${maxPicks} each)`;
      }
      slotHintEl.textContent = buildSlotHint(maxPicks);

      // Reset selection state
      p1SelectCursor = 0; p2SelectCursor = 0;
      p1SelectedIds = []; p2SelectedIds = [];
      p1Confirmed   = false; p2Confirmed = false;
      if (readyTimer) { clearInterval(readyTimer); readyTimer = null; }

      // Long Match: auto-confirm the non-picker AFTER the reset
      if (gameMode === 'longmatch' && lmState.pickerNum !== null) {
        if (lmState.pickerNum === 1) p2Confirmed = true;
        else                         p1Confirmed = true;
      }

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
      // Long Match: also vary spawn platform height each round so the map feels fresh
      if (gameMode === 'longmatch') {
        const spawnY = 470 + Math.floor(Math.random() * 60); // 470–530
        PLATFORMS[0] = { ...PLATFORMS[0], y: spawnY };
        PLATFORMS[1] = { ...PLATFORMS[1], y: spawnY };
      }

      // Long Match: merge the newly picked ability with accumulated set
      if (gameMode === 'longmatch') {
        if (lmState.pickerNum === 1) {
          p1SelectedIds = [...lmState.p1Abilities,
            ...p1SelectedIds.filter(id => !lmState.p1Abilities.includes(id))];
          p2SelectedIds = [...lmState.p2Abilities];
        } else if (lmState.pickerNum === 2) {
          p1SelectedIds = [...lmState.p1Abilities];
          p2SelectedIds = [...lmState.p2Abilities,
            ...p2SelectedIds.filter(id => !lmState.p2Abilities.includes(id))];
        }
        lmState.p1Abilities = [...p1SelectedIds];
        lmState.p2Abilities = [...p2SelectedIds];
        lmState.pickerNum   = null;
      }

      // Save power IDs for 4P tournament
      if (fpState.active) {
        fpState.allIds[fpState.matchNum * 2]     = [...p1SelectedIds];
        fpState.allIds[fpState.matchNum * 2 + 1] = [...p2SelectedIds];
      }
      player1 = createPlayer(1, 1, p1SelectedIds);
      player2 = createPlayer(2, 0, p2SelectedIds);
      temporaryPlatforms = [];
      lightningEffects = [];
      walls = [];
      echoWaves = [];
      arrowProjectiles = [];
      freezeRayProjectiles = [];
      pushEffects = [];
      mines = [];
      springboards = [];
      blackHoles = [];
      pulseWaves = [];
      botInput = { left: false, right: false, jump: false, push: false };
      botJumpCooldown = 0;
      botAbilityClock = 0;
      updateCamera();
      showScreen(gameScreen);
      startGameLoop();
      startMusic('game');
      break;

    case 'GAME_OVER': {
      stopMusic();
      const isP1Win = winnerNum === 1;
      const winColor = isP1Win ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'linear-gradient(135deg,#f97316,#ef4444)';

      // ── Long Match handling ──
      if (gameMode === 'longmatch') {
        const loserNum = winnerNum === 1 ? 2 : 1;
        if (winnerNum === 1) lmState.p1Wins++; else lmState.p2Wins++;
        lmState.loserNum = loserNum;
        lmP1WinsEl.textContent = lmState.p1Wins;
        lmP2WinsEl.textContent = lmState.p2Wins;

        // Did someone win the Long Match?
        if (lmState.p1Wins >= lmState.winsNeeded || lmState.p2Wins >= lmState.winsNeeded) {
          sfxWin(); showScreen(gameOverScreen);
          winnerText.textContent = `Player ${winnerNum} Wins the Long Match!`;
          winnerText.style.background = winColor;
          winnerText.style['-webkit-background-clip'] = 'text';
          winnerText.style['-webkit-text-fill-color'] = 'transparent';
          finalStats.innerHTML = `<div>Final score — P1: ${lmState.p1Wins} &nbsp;–&nbsp; P2: ${lmState.p2Wins}</div>`;
          break;
        }

        // Round over — show round result screen
        lmRoundTitleEl.textContent = `Player ${winnerNum} wins the round!`;
        lmRoundTitleEl.style.background = winColor;
        lmRoundTitleEl.style['-webkit-background-clip'] = 'text';
        lmRoundTitleEl.style['-webkit-text-fill-color'] = 'transparent';

        const maxSlots = P1_ABILITY_KEYS.length;
        const loserHas = loserNum === 1 ? lmState.p1Abilities.length : lmState.p2Abilities.length;
        if (loserHas >= maxSlots) {
          lmPickMsgEl.textContent = `Player ${loserNum} already has all ability slots filled — straight to next round!`;
          lmNextBtn.textContent   = '▶ Next Round';
        } else {
          lmPickMsgEl.textContent = `Player ${loserNum}, pick a new ability for the next round!`;
          lmNextBtn.textContent   = '🎲 Pick Ability';
        }
        showScreen(lmRoundScreen);
        break;
      }

      // ── 4-Player Tournament handling ──
      if (fpState.active) {
        if (fpState.matchNum === 0) {
          // Semi-final 1 done
          fpState.semiWinner1 = winnerNum;
          const winnerLabel = winnerNum === 1 ? 'Player 1' : 'Player 2';
          fourPTitle.textContent = `${winnerLabel} wins Semi-Final 1!`;
          fourPTitle.style.background = winColor;
          fourPTitle.style['-webkit-background-clip'] = 'text';
          fourPTitle.style['-webkit-text-fill-color'] = 'transparent';
          fourPSubtitle.textContent = 'Next up: Player 3 vs Player 4';
          fpState.matchNum = 1;
          showScreen(fourPScreen);
        } else if (fpState.matchNum === 1) {
          // Semi-final 2 done
          fpState.semiWinner2 = winnerNum;
          const w1label = fpState.semiWinner1 === 1 ? 'Player 1' : 'Player 2';
          const w2label = winnerNum === 1 ? 'Player 3' : 'Player 4';
          fourPTitle.textContent = `${w2label} wins Semi-Final 2!`;
          fourPTitle.style.background = winColor;
          fourPTitle.style['-webkit-background-clip'] = 'text';
          fourPTitle.style['-webkit-text-fill-color'] = 'transparent';
          fourPSubtitle.textContent = `Final: ${w1label} vs ${w2label} — use P1/P2 controls`;
          fpState.matchNum = 2;
          // Prepare final IDs
          const semi1WinIdx = fpState.semiWinner1 - 1;       // 0 or 1
          const semi2WinIdx = 2 + (fpState.semiWinner2 - 1); // 2 or 3
          p1SelectedIds = fpState.allIds[semi1WinIdx];
          p2SelectedIds = fpState.allIds[semi2WinIdx];
          showScreen(fourPScreen);
        } else {
          // Final done
          fpState.active = false;
          // In the final: P1 control = semi1 winner, P2 control = semi2 winner
          const champion = winnerNum === 1
            ? (fpState.semiWinner1 === 1 ? 'Player 1' : 'Player 2')
            : (fpState.semiWinner2 === 1 ? 'Player 3' : 'Player 4');
          sfxWin(); showScreen(gameOverScreen);
          winnerText.textContent = `${champion} wins the Tournament!`;
          winnerText.style.background = winColor;
          winnerText.style['-webkit-background-clip'] = 'text';
          winnerText.style['-webkit-text-fill-color'] = 'transparent';
          finalStats.innerHTML = '<div>4-Player Tournament Champion!</div>';
        }
        break;
      }

      if (gameMode === 'tournament') {
        currentRound++;
        if (isP1Win) p1RoundWins++; else p2RoundWins++;
        p1WinsDisplay.textContent = p1RoundWins;
        p2WinsDisplay.textContent = p2RoundWins;

        if (p1RoundWins >= 3 || p2RoundWins >= 3) {
          sfxWin(); showScreen(gameOverScreen);
          winnerText.textContent = `Player ${winnerNum} Wins the Tournament!`;
          winnerText.style.background = winColor;
          winnerText.style['-webkit-background-clip'] = 'text';
          winnerText.style['-webkit-text-fill-color'] = 'transparent';
          finalStats.innerHTML = `<div>Final score — P1: ${p1RoundWins} wins &nbsp;|&nbsp; P2: ${p2RoundWins} wins</div>`;
        } else {
          roundWinnerText.textContent = `Player ${winnerNum} wins Round ${currentRound}!`;
          roundWinnerText.style.background = winColor;
          roundWinnerText.style['-webkit-background-clip'] = 'text';
          roundWinnerText.style['-webkit-text-fill-color'] = 'transparent';
          showScreen(roundOverScreen);
        }
      } else {
        sfxWin(); showScreen(gameOverScreen);
        const label = isBotMode() && winnerNum === 2 ? 'Bot Wins!' : `Player ${winnerNum} Wins!`;
        winnerText.textContent = label;
        winnerText.style.background = winColor;
        winnerText.style['-webkit-background-clip'] = 'text';
        winnerText.style['-webkit-text-fill-color'] = 'transparent';
        finalStats.innerHTML = `
          <div>Player 1 powers: ${p1SelectedIds.map(id => ALL_POWERUPS.find(p=>p.id===id)?.name).join(', ')}</div>
          <div>${isBotMode() ? 'Bot' : 'Player 2'} powers: ${p2SelectedIds.map(id => ALL_POWERUPS.find(p=>p.id===id)?.name).join(', ')}</div>
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
longMatchBtn.addEventListener('click', () => {
  showScreen(longMatchSettingsScreen);
});
document.getElementById('lmStartBtn')?.addEventListener('click', () => {
  gameMode = 'longmatch';
  maxPicks  = 1;
  lmState   = { ...lmState, p1Wins: 0, p2Wins: 0, p1Abilities: [], p2Abilities: [], loserNum: null, pickerNum: null };
  transitionTo('POWER_SELECT');
});
document.getElementById('lmMenuBtn')?.addEventListener('click', () => transitionTo('TITLE'));
lmNextBtn.addEventListener('click', () => {
  const maxSlots   = P1_ABILITY_KEYS.length;
  const loserHas   = lmState.loserNum === 1 ? lmState.p1Abilities.length : lmState.p2Abilities.length;
  if (loserHas >= maxSlots) {
    // Slots full — skip pick, go straight to next round
    p1SelectedIds = [...lmState.p1Abilities];
    p2SelectedIds = [...lmState.p2Abilities];
    transitionTo('GAMEPLAY');
  } else {
    lmState.pickerNum = lmState.loserNum;
    maxPicks = 1;
    transitionTo('POWER_SELECT');
  }
});
lmRoundMenuBtn.addEventListener('click', () => transitionTo('TITLE'));

// Long Match setting groups
initSettingGroup('lmWins',       val => { lmState.winsNeeded    = parseInt(val); });
initSettingGroup('lmLives',      val => { lmState.livesPerRound = parseInt(val); });
initSettingGroup('lmDifficulty', val => { lmState.botDifficulty = val; });
initSettingGroup('lmOpponent',   val => {
  lmState.botOpponent = val === 'bot';
  const row = document.getElementById('lmDifficultyRow');
  if (row) row.style.display = val === 'bot' ? 'flex' : 'none';
});
initSettingGroup('lmPool',       val => { lmState.poolSize = val === 'all' ? Infinity : parseInt(val); });

// Update "All" label in Long Match pool buttons
(function() {
  const allBtn = document.querySelector('#lmPool [data-val="all"]');
  if (allBtn) allBtn.textContent = `All (${ALL_POWERUPS.length})`;
}());

botMatchBtn.addEventListener('click', () => {
  gameMode = 'bot'; maxPicks = 3;
  customSettings.botOpponent = true;
  customSettings.botDifficulty = 'medium';
  transitionTo('POWER_SELECT');
});
fourPlayerBtn.addEventListener('click', () => {
  gameMode = 'normal'; maxPicks = 3;
  fpState = { active: true, matchNum: 0, semiWinner1: null, semiWinner2: null, allIds: [[], [], [], []] };
  p1RoundWins = 0; p2RoundWins = 0; currentRound = 0;
  transitionTo('POWER_SELECT');
});
setGameBtn.addEventListener('click', () => {
  showScreen(setGameScreen);
  updateDifficultyRow();
});
replayBtn.addEventListener('click', () => {
  if (gameMode === 'tournament') {
    p1RoundWins = 0; p2RoundWins = 0; currentRound = 0;
  } else if (gameMode === 'longmatch') {
    lmState = { ...lmState, p1Wins: 0, p2Wins: 0, p1Abilities: [], p2Abilities: [], loserNum: null, pickerNum: null };
    maxPicks = 1;
  }
  transitionTo('POWER_SELECT');
});
menuBtn.addEventListener('click', () => transitionTo('TITLE'));
nextRoundBtn.addEventListener('click', () => transitionTo('GAMEPLAY'));
tournamentMenuBtn.addEventListener('click', () => transitionTo('TITLE'));
fourPNextBtn.addEventListener('click', () => {
  if (fpState.matchNum === 2) {
    // Final — go straight to gameplay with pre-set IDs
    transitionTo('GAMEPLAY');
  } else {
    // Next semi-final — power select
    transitionTo('POWER_SELECT');
  }
});
fourPMenuBtn.addEventListener('click', () => {
  fpState.active = false;
  transitionTo('TITLE');
});

// ── Set Game UI ──
function updateDifficultyRow() {
  const show = customSettings.botOpponent;
  const diffRow = document.getElementById('difficultyRow');
  const pickRow = document.getElementById('botPicksRow');
  if (diffRow) diffRow.style.display = show ? 'flex' : 'none';
  if (pickRow) pickRow.style.display  = show ? 'flex' : 'none';
}

function initSettingGroup(groupId, onSelect) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.setting-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.setting-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.dataset.val);
    });
  });
}

initSettingGroup('settingLives', val => { customSettings.lives = parseInt(val); });
initSettingGroup('settingPicks', val => { maxPicks = parseInt(val); customSettings.picks = parseInt(val); });
initSettingGroup('settingOpponent', val => {
  customSettings.botOpponent = val === 'bot';
  updateDifficultyRow();
});
initSettingGroup('settingDifficulty', val => { customSettings.botDifficulty = val; });
initSettingGroup('settingBotPicks', val => { customSettings.botAutoPick = val === 'auto'; });
initSettingGroup('settingPool', val => {
  customSettings.poolSize = val === 'all' ? Infinity : parseInt(val);
});

// Keep the "All" button label + value in sync with ALL_POWERUPS
(function() {
  const allBtn = document.querySelector('#settingPool [data-val="27"]');
  if (allBtn) {
    allBtn.dataset.val  = 'all';
    allBtn.textContent  = `All (${ALL_POWERUPS.length})`;
    allBtn.classList.add('active'); // default selection
    // Deactivate the "12" button that was the previous default
    const prev = document.querySelector('#settingPool [data-val="12"]');
    if (prev) prev.classList.remove('active');
  }
}());

// Power list toggle
(function() {
  const toggle = document.getElementById('powerListToggle');
  const panel  = document.getElementById('powerListPanel');
  if (!toggle || !panel) return;

  // Populate once
  ALL_POWERUPS.forEach(pu => {
    const row = document.createElement('div');
    row.className = 'power-list-entry';
    const cd = pu.cooldown ? `${pu.cooldown / 1000}s` : '';
    row.innerHTML = `
      <span class="power-list-name">${pu.name}</span>
      <span class="power-list-badge ${pu.type}">${pu.type}</span>
      <span class="power-list-desc">${pu.desc}</span>
      ${cd ? `<span class="power-list-cd">${cd}</span>` : ''}
    `;
    panel.appendChild(row);
  });

  toggle.addEventListener('click', () => {
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'flex';
    toggle.textContent  = open ? '📋 Show Power List' : '📋 Hide Power List';
  });
}());

document.getElementById('setGameStartBtn')?.addEventListener('click', () => {
  gameMode = 'setgame';
  maxPicks = customSettings.picks || 3;
  transitionTo('POWER_SELECT');
});
document.getElementById('setGameQuickBtn')?.addEventListener('click', () => {
  gameMode = 'setgame';
  maxPicks = customSettings.picks || 3;
  quickStart();
});
document.getElementById('setGameMenuBtn')?.addEventListener('click', () => transitionTo('TITLE'));

// ─────────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────────
initInput();
transitionTo('TITLE');
