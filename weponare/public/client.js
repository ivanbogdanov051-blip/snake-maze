'use strict';

// ─── Canvas setup ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const CANVAS_W = 480, CANVAS_H = 270;
const ARENA_X = 8, ARENA_Y = 8;
const ARENA_W = CANVAS_W - 16, ARENA_H = CANVAS_H - 16;

// ─── Palette ──────────────────────────────────────────────────────────────────

const PAL = {
  bg:      '#0a0a14', arena:   '#1a1a2e', wall:    '#2a2a4a',
  p1:      '#4488ff', p2:      '#ff6644', monster: '#44cc44',
  xp:      '#ffcc00', hp:      '#ff3333', hpBg:    '#330000',
  text:    '#e8e8e8', shadow:  '#000000',
  sword:   '#aabbcc', dagger:  '#ccddaa', axe:     '#cc8844',
  spear:   '#bbbbbb', bow:     '#aa8855', staff:   '#aa44ff',
  white:   '#ffffff',
};

const WEAPON_COLOR = { sword: PAL.sword, dagger: PAL.dagger, axe: PAL.axe, spear: PAL.spear, bow: PAL.bow, staff: PAL.staff };
const WEAPON_DESC  = {
  sword:  'Balanced blade',
  dagger: 'Fast, low damage',
  axe:    'Slow, heavy hit',
  spear:  'Long reach',
  bow:    'Fires arrows',
  staff:  'AoE magic burst',
};

// ─── WebSocket ────────────────────────────────────────────────────────────────

const wsUrl = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? `ws://${location.hostname}:${location.port}`
  : `wss://${location.hostname}`;

let ws = null;
let myNum = null;
let latestState = null;
let connected = false;

function connect() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    connected = true;
    setLobbyMsg('Waiting for opponent...');
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === 'welcome') {
      myNum = msg.num;
      setLobbyMsg(
        myNum === 1
          ? '<span class="p1-color">YOU ARE PLAYER 1 (BLUE)</span><br>Waiting for opponent...'
          : '<span class="p2-color">YOU ARE PLAYER 2 (RED)</span><br>Game starting!'
      );
      document.getElementById('xpDisplay').textContent = '';
    }

    if (msg.type === 'full') {
      setLobbyMsg('Room is full. Try again later.');
      return;
    }

    if (msg.type === 'state') {
      latestState = msg;
      updateScreens(msg);
    }
  };

  ws.onclose = () => {
    connected = false;
    showScreen('disconnectedScreen');
    setTimeout(connect, 3000);
  };

  ws.onerror = () => ws.close();
}

connect();

// ─── Input ────────────────────────────────────────────────────────────────────

const keys = {};

window.addEventListener('keydown', (e) => {
  if (!keys[e.code]) {
    keys[e.code] = true;
    sendInput();
  }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) {
    e.preventDefault();
  }

  // Unlock ACK
  if (e.code === 'Space' && latestState && latestState.gameState === 'WEAPON_UNLOCK') {
    sendAckUnlock();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  sendInput();
});

function sendInput() {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({
    type: 'input',
    keys: {
      up:    !!keys['ArrowUp'],
      down:  !!keys['ArrowDown'],
      left:  !!keys['ArrowLeft'],
      right: !!keys['ArrowRight'],
      attack: !!keys['Space'],
      swap:  !!keys['Enter'],
    },
  }));
}

function sendAckUnlock() {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'ack_unlock' }));
}

// ─── Screen Management ────────────────────────────────────────────────────────

const SCREENS = ['lobbyScreen', 'unlockScreen', 'roundScreen', 'disconnectedScreen'];

function showScreen(id) {
  SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.className = 'overlay ' + (s === id ? 'active' : 'hidden');
  });
}

function hideAllScreens() {
  SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.className = 'overlay hidden';
  });
}

function setLobbyMsg(html) {
  showScreen('lobbyScreen');
  document.getElementById('lobbyMsg').innerHTML = html;
}

function updateScreens(state) {
  if (state.gameState === 'LOBBY') {
    setLobbyMsg(myNum
      ? (myNum === 1 ? '<span class="p1-color">YOU ARE PLAYER 1</span><br>Waiting for opponent...' : '<span class="p2-color">YOU ARE PLAYER 2</span><br>Waiting...')
      : 'Waiting for opponent...');
    document.getElementById('xpDisplay').textContent = 'XP: ' + (state.xp || 0);
    return;
  }

  if (state.gameState === 'WEAPON_UNLOCK') {
    showScreen('unlockScreen');
    const w = state.pendingUnlock;
    if (w) {
      document.getElementById('unlockName').textContent = w.toUpperCase();
      document.getElementById('unlockDesc').textContent = WEAPON_DESC[w] || '';
      drawUnlockPreview(w);
    }
    return;
  }

  if (state.gameState === 'ROUND_OVER') {
    showScreen('roundScreen');
    const r = state.round;
    const p1 = state.players.p1;
    const p2 = state.players.p2;
    const winnerNum = (p2 && p2.lives <= 0) ? 1 : 2;
    const winnerColor = winnerNum === 1 ? 'p1-color' : 'p2-color';
    document.getElementById('roundTitle').innerHTML =
      `<span class="${winnerColor}">PLAYER ${winnerNum} WINS!</span>`;
    document.getElementById('roundStats').innerHTML =
      `P1 WINS: ${r.p1Wins} &nbsp; P2 WINS: ${r.p2Wins}<br>XP: ${state.xp}`;
    return;
  }

  if (state.gameState === 'GAMEPLAY') {
    hideAllScreens();
    return;
  }
}

// ─── Render Loop ──────────────────────────────────────────────────────────────

function renderLoop() {
  if (latestState && latestState.gameState === 'GAMEPLAY') {
    draw(latestState);
  }
  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

// ─── Drawing ──────────────────────────────────────────────────────────────────

function draw(state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawArena();
  drawProjectiles(state.projectiles || []);
  drawMonsters(state.monsters || []);
  if (state.players.p1) drawPlayer(state.players.p1, PAL.p1);
  if (state.players.p2) drawPlayer(state.players.p2, PAL.p2);
  drawParticles(state.particles || []);
  drawHUD(state);
}

function drawArena() {
  ctx.fillStyle = PAL.arena;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Wall borders
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(0, 0, CANVAS_W, ARENA_Y);
  ctx.fillRect(0, CANVAS_H - ARENA_Y, CANVAS_W, ARENA_Y);
  ctx.fillRect(0, 0, ARENA_X, CANVAS_H);
  ctx.fillRect(CANVAS_W - ARENA_X, 0, ARENA_X, CANVAS_H);

  // Wall edge highlights
  ctx.fillStyle = 'rgba(170,170,255,0.08)';
  ctx.fillRect(ARENA_X, ARENA_Y, ARENA_W, 1);
  ctx.fillRect(ARENA_X, ARENA_Y, 1, ARENA_H);

  // Floor grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = ARENA_X; x < ARENA_X + ARENA_W; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, ARENA_Y); ctx.lineTo(x, ARENA_Y + ARENA_H); ctx.stroke();
  }
  for (let y = ARENA_Y; y < ARENA_Y + ARENA_H; y += 16) {
    ctx.beginPath(); ctx.moveTo(ARENA_X, y); ctx.lineTo(ARENA_X + ARENA_W, y); ctx.stroke();
  }
}

function drawPlayer(p, baseColor) {
  if (p.dead) return;
  const c = p.hitFlash > 0 ? PAL.white : baseColor;
  const x = Math.round(p.x), y = Math.round(p.y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 1, y + p.h, p.w - 2, 2);

  // Legs
  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y + 11, 4, 5);
  ctx.fillRect(x + 7, y + 11, 4, 5);

  // Torso
  ctx.fillRect(x, y + 5, p.w, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y + 5, p.w, 2);

  // Head
  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y, p.w - 2, 5);

  // Eye
  ctx.fillStyle = PAL.white;
  const eyeX = p.facing === 1 ? x + 8 : x + 2;
  ctx.fillRect(eyeX, y + 1, 2, 2);

  // Weapon
  drawWeaponSprite(p, x, y);
}

function drawWeaponSprite(p, px, py) {
  const wId = p.weaponId;
  const wc = WEAPON_COLOR[wId] || PAL.white;
  const swinging = p.swingTimer > 0;
  const cx = p.facing === 1 ? px + p.w : px;
  const cy = py + 7;

  ctx.save();
  ctx.fillStyle = wc;
  ctx.strokeStyle = wc;
  ctx.lineWidth = 1;

  if (wId === 'sword') {
    if (swinging) {
      ctx.translate(cx, cy);
      ctx.rotate(p.facing * 0.7);
      ctx.fillRect(p.facing === 1 ? 0 : -10, -1, 10, 2);
      ctx.fillRect(p.facing === 1 ? 7 : -9, -3, 2, 6);
    } else {
      ctx.fillRect(p.facing === 1 ? cx : cx - 10, cy - 1, 10, 2);
    }
  } else if (wId === 'dagger') {
    ctx.fillRect(p.facing === 1 ? cx : cx - 7, cy - 1, 7, 2);
  } else if (wId === 'axe') {
    const hx = p.facing === 1 ? cx : cx - 8;
    ctx.fillRect(hx, cy - 1, 4, 2);
    ctx.fillRect(p.facing === 1 ? cx + 3 : cx - 8, cy - 4, 5, 8);
  } else if (wId === 'spear') {
    const sx = p.facing === 1 ? cx : cx - 14;
    ctx.fillRect(sx, cy, 14, 1);
    ctx.beginPath();
    if (p.facing === 1) {
      ctx.moveTo(cx + 14, cy); ctx.lineTo(cx + 18, cy - 3); ctx.lineTo(cx + 18, cy + 3);
    } else {
      ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 18, cy - 3); ctx.lineTo(cx - 18, cy + 3);
    }
    ctx.fill();
  } else if (wId === 'bow') {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.facing === 1 ? cx + 2 : cx - 2, cy, 6, Math.PI * 0.25, Math.PI * 1.75, p.facing === 1);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#886633';
    ctx.beginPath();
    ctx.moveTo(p.facing === 1 ? cx + 2 : cx - 2, cy - 6);
    ctx.lineTo(p.facing === 1 ? cx + 2 : cx - 2, cy + 6);
    ctx.stroke();
  } else if (wId === 'staff') {
    ctx.fillRect(p.facing === 1 ? cx : cx - 10, cy - 1, 10, 2);
    ctx.fillStyle = '#dd88ff';
    ctx.beginPath();
    ctx.arc(p.facing === 1 ? cx + 13 : cx - 13, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(221,136,255,0.4)';
    ctx.beginPath();
    ctx.arc(p.facing === 1 ? cx + 13 : cx - 13, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMonster(m) {
  const c = m.hitFlash > 0 ? PAL.white : PAL.monster;
  const x = Math.round(m.x), y = Math.round(m.y);

  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y + 4, m.w - 2, m.h - 4);
  ctx.fillRect(x, y, m.w, 5);
  ctx.fillRect(x - 1, y + 1, 2, 3);
  ctx.fillRect(x + m.w - 1, y + 1, 2, 3);
  ctx.fillStyle = '#ff2222';
  ctx.fillRect(x + 2, y + 1, 2, 2);
  ctx.fillRect(x + 6, y + 1, 2, 2);

  drawHpBar(x - 1, y - 5, m.w + 2, 2, m.hp / m.maxHp, '#44ff44', '#003300');
}

function drawMonsters(monsters) {
  for (const m of monsters) drawMonster(m);
}

function drawProjectiles(projs) {
  for (const pr of projs) {
    if (pr.weaponId === 'bow') {
      const wc = PAL.bow;
      ctx.strokeStyle = wc;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(pr.x - pr.dx * 4, pr.y - pr.dy * 4);
      ctx.stroke();
      ctx.fillStyle = '#ffeeaa';
      ctx.fillRect(Math.round(pr.x) - 1, Math.round(pr.y) - 1, 2, 2);
    } else if (pr.weaponId === 'staff') {
      ctx.strokeStyle = PAL.staff;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(170,68,255,0.5)';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles(particles) {
  for (const p of particles) {
    if (p.type === 'xp') {
      const alpha = Math.max(0, p.timer / 900);
      const rise = (1 - p.timer / 900) * 12;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000';
      pixelText(p.text, Math.round(p.x) + 1, Math.round(p.y - rise) + 1);
      ctx.fillStyle = PAL.xp;
      pixelText(p.text, Math.round(p.x), Math.round(p.y - rise));
      ctx.globalAlpha = 1;
    } else if (p.type === 'aoe') {
      const alpha = Math.max(0, p.timer / 300);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color || PAL.staff;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius || 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.type === 'waveclear') {
      const alpha = Math.min(1, p.timer / 2500 * 3);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PAL.xp;
      ctx.font = '10px "Courier New", monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }
}

function drawHUD(state) {
  const p1 = state.players.p1;
  const p2 = state.players.p2;

  // P1 — top left
  if (p1) {
    ctx.fillStyle = PAL.p1;
    pixelText('P1', 10, 6);
    drawHpBar(22, 5, 56, 5, p1.hp / p1.maxHp, PAL.p1, PAL.hpBg);
    ctx.fillStyle = '#aaa';
    pixelText(p1.weaponId ? p1.weaponId.toUpperCase() : '', 10, 13);
    // Lives
    for (let i = 0; i < (p1.lives || 0); i++) {
      ctx.fillStyle = PAL.p1;
      ctx.fillRect(10 + i * 5, 21, 3, 3);
    }
  }

  // P2 — top right
  if (p2) {
    ctx.fillStyle = PAL.p2;
    pixelText('P2', CANVAS_W - 18, 6);
    drawHpBar(CANVAS_W - 80, 5, 56, 5, p2.hp / p2.maxHp, PAL.p2, PAL.hpBg);
    ctx.fillStyle = '#aaa';
    const wname = p2.weaponId ? p2.weaponId.toUpperCase() : '';
    pixelText(wname, CANVAS_W - 10 - wname.length * 6, 13);
    for (let i = 0; i < (p2.lives || 0); i++) {
      ctx.fillStyle = PAL.p2;
      ctx.fillRect(CANVAS_W - 12 - i * 5, 21, 3, 3);
    }
  }

  // Wave — center top
  const w = state.wave;
  if (w) {
    ctx.fillStyle = PAL.text;
    const wt = 'WAVE ' + w.num;
    pixelText(wt, Math.round(CANVAS_W / 2 - wt.length * 3), 6);
    const mt = w.monstersLeft + ' LEFT';
    ctx.fillStyle = '#888';
    pixelText(mt, Math.round(CANVAS_W / 2 - mt.length * 3), 13);
  }

  // XP — bottom left
  ctx.fillStyle = PAL.xp;
  pixelText('XP:' + state.xp, 10, CANVAS_H - 10);

  // My player indicator arrow
  if (myNum) {
    const mp = myNum === 1 ? p1 : p2;
    if (mp && !mp.dead) {
      ctx.fillStyle = myNum === 1 ? PAL.p1 : PAL.p2;
      const ax = Math.round(mp.x + mp.w / 2);
      const ay = Math.round(mp.y - 6);
      ctx.beginPath();
      ctx.moveTo(ax, ay + 3);
      ctx.lineTo(ax - 3, ay);
      ctx.lineTo(ax + 3, ay);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawHpBar(x, y, w, h, ratio, fgColor, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fgColor;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, ratio)), h);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function pixelText(text, x, y) {
  ctx.font = '6px "Courier New", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillText(text, x - 1, y + 1);
  ctx.fillStyle = ctx.fillStyle; // already set; caller sets it before calling
  ctx.fillText(text, x, y);
}

// ─── Unlock Preview Canvas ────────────────────────────────────────────────────

function drawUnlockPreview(weaponId) {
  const uc = document.getElementById('unlockCanvas');
  const ux = uc.getContext('2d');
  ux.imageSmoothingEnabled = false;
  ux.clearRect(0, 0, 120, 80);

  const wc = WEAPON_COLOR[weaponId] || '#ffffff';
  const cx = 60, cy = 40;

  ux.fillStyle = '#1a1a2e';
  ux.fillRect(0, 0, 120, 80);
  ux.strokeStyle = wc;
  ux.lineWidth = 1;
  ux.strokeRect(2, 2, 116, 76);

  ux.fillStyle = wc;
  ux.strokeStyle = wc;

  if (weaponId === 'sword') {
    ux.fillRect(cx - 20, cy - 2, 40, 4);
    ux.fillRect(cx + 17, cy - 8, 4, 16);
    ux.fillRect(cx - 8, cy - 1, 6, 2);
  } else if (weaponId === 'dagger') {
    ux.fillRect(cx - 14, cy - 2, 28, 4);
    ux.beginPath(); ux.moveTo(cx + 14, cy - 4); ux.lineTo(cx + 22, cy); ux.lineTo(cx + 14, cy + 4); ux.fill();
  } else if (weaponId === 'axe') {
    ux.fillRect(cx - 5, cy - 22, 10, 44);
    ux.fillRect(cx + 4, cy - 18, 16, 36);
  } else if (weaponId === 'spear') {
    ux.fillRect(cx - 28, cy - 1, 50, 2);
    ux.beginPath(); ux.moveTo(cx + 22, cy - 6); ux.lineTo(cx + 34, cy); ux.lineTo(cx + 22, cy + 6); ux.fill();
  } else if (weaponId === 'bow') {
    ux.lineWidth = 3;
    ux.beginPath(); ux.arc(cx, cy, 20, Math.PI * 0.3, Math.PI * 1.7); ux.stroke();
    ux.lineWidth = 1;
    ux.strokeStyle = '#886633';
    ux.beginPath(); ux.moveTo(cx, cy - 20); ux.lineTo(cx, cy + 20); ux.stroke();
  } else if (weaponId === 'staff') {
    ux.fillRect(cx - 30, cy - 2, 50, 4);
    ux.fillStyle = '#dd88ff';
    ux.beginPath(); ux.arc(cx + 26, cy, 10, 0, Math.PI * 2); ux.fill();
    ux.fillStyle = 'rgba(221,136,255,0.4)';
    ux.beginPath(); ux.arc(cx + 26, cy, 16, 0, Math.PI * 2); ux.fill();
  }
}
