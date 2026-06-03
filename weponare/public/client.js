'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const CANVAS_W = 480, CANVAS_H = 270;
const ARENA_X = 8, ARENA_Y = 8;
const ARENA_W = CANVAS_W - 16, ARENA_H = CANVAS_H - 16;

const PAL = {
  bg:'#0a0a14', arena:'#1a1a2e', wall:'#2a2a4a',
  p1:'#4488ff', p2:'#ff6644', monster:'#44cc44',
  xp:'#ffcc00', hp:'#ff3333', hpBg:'#330000',
  text:'#e8e8e8', sword:'#aabbcc', dagger:'#ccddaa',
  axe:'#cc8844', spear:'#bbbbbb', bow:'#aa8855', staff:'#aa44ff',
  white:'#ffffff',
};

const WEAPON_COLOR = { sword:PAL.sword, dagger:PAL.dagger, axe:PAL.axe, spear:PAL.spear, bow:PAL.bow, staff:PAL.staff };
const WEAPON_DESC  = { sword:'Balanced blade', dagger:'Fast, low damage', axe:'Slow, heavy hit', spear:'Long reach', bow:'Fires arrows', staff:'AoE magic burst' };

// ─── WebSocket ────────────────────────────────────────────────────────────────

const wsUrl = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? `ws://${location.hostname}:${location.port}`
  : `wss://${location.hostname}`;

let ws = null, myNum = null, connected = false;
let prevState = null, currState = null, stateRecvTime = 0;
const SERVER_TICK_MS = 50;

function connect() {
  ws = new WebSocket(wsUrl);
  ws.onopen = () => { connected = true; setLobbyMsg('Waiting for opponent...'); };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'welcome') {
      myNum = msg.num;
      setLobbyMsg(myNum === 1
        ? '<span class="p1-color">YOU ARE PLAYER 1 (BLUE)</span><br>Waiting for opponent...'
        : '<span class="p2-color">YOU ARE PLAYER 2 (RED)</span><br>Game starting!');
      document.getElementById('xpDisplay').textContent = '';
    }
    if (msg.type === 'full') { setLobbyMsg('Room is full. Try again later.'); return; }
    if (msg.type === 'state') {
      if (currState && msg.gameState === 'GAMEPLAY') detectSlashes(currState, msg);
      prevState = currState;
      currState = msg;
      stateRecvTime = performance.now();
      updateScreens(msg);
    }
  };
  ws.onclose = () => { connected = false; showScreen('disconnectedScreen'); setTimeout(connect, 3000); };
  ws.onerror = () => ws.close();
}
connect();

// ─── Interpolation ────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function interpState(prev, curr, t) {
  if (!prev || t >= 1) return curr;
  const ip = (a, b) => (!a || !b || b.dead) ? b : { ...b, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  return {
    ...curr,
    players: {
      p1: ip(prev.players?.p1, curr.players?.p1),
      p2: ip(prev.players?.p2, curr.players?.p2),
    },
    monsters: curr.monsters.map((m, i) => {
      const pm = prev.monsters?.[i];
      return pm ? { ...m, x: lerp(pm.x, m.x, t), y: lerp(pm.y, m.y, t) } : m;
    }),
    projectiles: curr.projectiles.map((p, i) => {
      const pp = prev.projectiles?.[i];
      return pp ? { ...p, x: lerp(pp.x, p.x, t), y: lerp(pp.y, p.y, t) } : p;
    }),
  };
}

// ─── Slash Effects ────────────────────────────────────────────────────────────

const slashes = [];

function detectSlashes(prev, curr) {
  for (const key of ['p1', 'p2']) {
    const cp = curr.players?.[key], pp = prev.players?.[key];
    if (!cp || cp.dead) continue;
    const fresh = cp.swingTimer > 0 && (!pp || pp.swingTimer <= 0 || cp.swingTimer > pp.swingTimer);
    if (fresh) slashes.push({ x: cp.x + cp.w / 2, y: cp.y + cp.h / 2, facing: cp.facing, weaponId: cp.weaponId, timer: 200, maxTimer: 200, color: WEAPON_COLOR[cp.weaponId] || PAL.white });
  }
}

function tickSlashes(dt) {
  for (let i = slashes.length - 1; i >= 0; i--) { slashes[i].timer -= dt; if (slashes[i].timer <= 0) slashes.splice(i, 1); }
}

function drawSlashes() {
  for (const sl of slashes) {
    const alpha = sl.timer / sl.maxTimer;
    const progress = 1 - alpha;
    const cx = Math.round(sl.x), cy = Math.round(sl.y);
    const isRanged = sl.weaponId === 'bow' || sl.weaponId === 'staff';
    ctx.save();
    ctx.lineCap = 'round';
    if (!isRanged) {
      const r = 13 + progress * 5;
      const dir = sl.facing;
      const aS = dir === 1 ? -Math.PI * 0.65 : Math.PI * 0.35;
      const aE = dir === 1 ?  Math.PI * 0.25  : Math.PI * 1.65;
      const ccw = dir !== 1;
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, aS, aE, ccw); ctx.stroke();
      if (alpha > 0.55) {
        ctx.globalAlpha = ((alpha - 0.55) / 0.45) * 0.5;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r - 3, aS, aE, ccw); ctx.stroke();
      }
    } else {
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 1.5;
      const steps = sl.weaponId === 'staff' ? 8 : 6;
      for (let a = 0; a < Math.PI * 2; a += Math.PI * 2 / steps) {
        const len = 4 + progress * 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3);
        ctx.lineTo(cx + Math.cos(a) * (3 + len), cy + Math.sin(a) * (3 + len));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ─── Input ────────────────────────────────────────────────────────────────────

const keys = {};
window.addEventListener('keydown', (e) => {
  if (!keys[e.code]) { keys[e.code] = true; sendInput(); }
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' && currState && currState.gameState === 'WEAPON_UNLOCK') sendAckUnlock();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; sendInput(); });

function sendInput() {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type:'input', keys:{ up:!!keys['ArrowUp'], down:!!keys['ArrowDown'], left:!!keys['ArrowLeft'], right:!!keys['ArrowRight'], attack:!!keys['Space'], swap:!!keys['Enter'] } }));
}
function sendAckUnlock() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type:'ack_unlock' })); }

// ─── Screens ──────────────────────────────────────────────────────────────────

const SCREENS = ['lobbyScreen','unlockScreen','roundScreen','disconnectedScreen'];
function showScreen(id) { SCREENS.forEach(s => { const el = document.getElementById(s); if (el) el.className = 'overlay ' + (s === id ? 'active' : 'hidden'); }); }
function hideAllScreens() { SCREENS.forEach(s => { const el = document.getElementById(s); if (el) el.className = 'overlay hidden'; }); }
function setLobbyMsg(html) { showScreen('lobbyScreen'); document.getElementById('lobbyMsg').innerHTML = html; }

function updateScreens(state) {
  if (state.gameState === 'LOBBY') {
    setLobbyMsg(myNum ? (myNum === 1 ? '<span class="p1-color">YOU ARE PLAYER 1</span><br>Waiting for opponent...' : '<span class="p2-color">YOU ARE PLAYER 2</span><br>Waiting...') : 'Waiting for opponent...');
    document.getElementById('xpDisplay').textContent = 'XP: ' + (state.xp || 0);
    return;
  }
  if (state.gameState === 'WEAPON_UNLOCK') {
    showScreen('unlockScreen');
    const w = state.pendingUnlock;
    if (w) { document.getElementById('unlockName').textContent = w.toUpperCase(); document.getElementById('unlockDesc').textContent = WEAPON_DESC[w] || ''; drawUnlockPreview(w); }
    return;
  }
  if (state.gameState === 'ROUND_OVER') {
    showScreen('roundScreen');
    const r = state.round, p2 = state.players.p2;
    const winnerNum = (p2 && p2.lives <= 0) ? 1 : 2;
    document.getElementById('roundTitle').innerHTML = `<span class="${winnerNum === 1 ? 'p1-color' : 'p2-color'}">PLAYER ${winnerNum} WINS!</span>`;
    document.getElementById('roundStats').innerHTML = `P1 WINS: ${r.p1Wins} &nbsp; P2 WINS: ${r.p2Wins}<br>XP: ${state.xp}`;
    return;
  }
  if (state.gameState === 'GAMEPLAY') { hideAllScreens(); return; }
}

// ─── Render Loop ──────────────────────────────────────────────────────────────

let lastFrameTime = 0;
function renderLoop(now) {
  const dt = lastFrameTime ? Math.min(now - lastFrameTime, 100) : 16;
  lastFrameTime = now;
  tickSlashes(dt);
  if (currState && currState.gameState === 'GAMEPLAY') {
    const t = Math.min(1, (now - stateRecvTime) / SERVER_TICK_MS);
    draw(interpState(prevState, currState, t));
  }
  requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);

// ─── Draw ─────────────────────────────────────────────────────────────────────

function draw(state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawArena();
  drawSlashes();
  drawProjectiles(state.projectiles || []);
  drawMonsters(state.monsters || []);
  if (state.players.p1) drawPlayer(state.players.p1, PAL.p1, 'P1');
  if (state.players.p2) drawPlayer(state.players.p2, PAL.p2, 'P2');
  drawParticles(state.particles || []);
  drawHUD(state);
  drawWeaponPanel(state);
}

function drawArena() {
  ctx.fillStyle = PAL.arena;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(0, 0, CANVAS_W, ARENA_Y);
  ctx.fillRect(0, CANVAS_H - ARENA_Y, CANVAS_W, ARENA_Y);
  ctx.fillRect(0, 0, ARENA_X, CANVAS_H);
  ctx.fillRect(CANVAS_W - ARENA_X, 0, ARENA_X, CANVAS_H);
  ctx.fillStyle = 'rgba(170,170,255,0.08)';
  ctx.fillRect(ARENA_X, ARENA_Y, ARENA_W, 1);
  ctx.fillRect(ARENA_X, ARENA_Y, 1, ARENA_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = ARENA_X; x < ARENA_X + ARENA_W; x += 16) { ctx.beginPath(); ctx.moveTo(x, ARENA_Y); ctx.lineTo(x, ARENA_Y + ARENA_H); ctx.stroke(); }
  for (let y = ARENA_Y; y < ARENA_Y + ARENA_H; y += 16) { ctx.beginPath(); ctx.moveTo(ARENA_X, y); ctx.lineTo(ARENA_X + ARENA_W, y); ctx.stroke(); }
}

function drawPlayer(p, baseColor, label) {
  if (p.dead) return;
  const c = p.hitFlash > 0 ? PAL.white : baseColor;
  const x = Math.round(p.x), y = Math.round(p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 1, y + p.h, p.w - 2, 2);
  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y + 11, 4, 5);
  ctx.fillRect(x + 7, y + 11, 4, 5);
  ctx.fillRect(x, y + 5, p.w, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y + 5, p.w, 2);
  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y, p.w - 2, 5);
  ctx.fillStyle = PAL.white;
  ctx.fillRect(p.facing === 1 ? x + 8 : x + 2, y + 1, 2, 2);
  drawNametag(x + p.w / 2, y - 2, label, baseColor);
  drawWeaponSprite(p, x, y);
}

function drawNametag(cx, bottomY, label, color) {
  const isMe = myNum && ((label === 'P1' && myNum === 1) || (label === 'P2' && myNum === 2));
  ctx.save();
  ctx.font = '5px "Courier New", monospace';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  const rx = Math.round(cx);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText(label, rx + 1, bottomY + 1);
  ctx.fillStyle = isMe ? PAL.white : color;
  ctx.fillText(label, rx, bottomY);
  ctx.restore();
}

function drawWeaponSprite(p, px, py) {
  const wId = p.weaponId, wc = WEAPON_COLOR[wId] || PAL.white;
  const swinging = p.swingTimer > 0;
  const cx = p.facing === 1 ? px + p.w : px, cy = py + 7;
  ctx.save();
  ctx.fillStyle = wc; ctx.strokeStyle = wc; ctx.lineWidth = 1;
  if (wId === 'sword') {
    if (swinging) { ctx.translate(cx, cy); ctx.rotate(p.facing * 0.7); ctx.fillRect(p.facing === 1 ? 0 : -10, -1, 10, 2); ctx.fillRect(p.facing === 1 ? 7 : -9, -3, 2, 6); }
    else { ctx.fillRect(p.facing === 1 ? cx : cx - 10, cy - 1, 10, 2); }
  } else if (wId === 'dagger') {
    ctx.fillRect(p.facing === 1 ? cx : cx - 7, cy - 1, 7, 2);
  } else if (wId === 'axe') {
    ctx.fillRect(p.facing === 1 ? cx : cx - 8, cy - 1, 4, 2);
    ctx.fillRect(p.facing === 1 ? cx + 3 : cx - 8, cy - 4, 5, 8);
  } else if (wId === 'spear') {
    ctx.fillRect(p.facing === 1 ? cx : cx - 14, cy, 14, 1);
    ctx.beginPath();
    if (p.facing === 1) { ctx.moveTo(cx+14,cy); ctx.lineTo(cx+18,cy-3); ctx.lineTo(cx+18,cy+3); }
    else { ctx.moveTo(cx-14,cy); ctx.lineTo(cx-18,cy-3); ctx.lineTo(cx-18,cy+3); }
    ctx.fill();
  } else if (wId === 'bow') {
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.facing === 1 ? cx+2 : cx-2, cy, 6, Math.PI*0.25, Math.PI*1.75, p.facing === 1); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#886633';
    ctx.beginPath(); ctx.moveTo(p.facing===1?cx+2:cx-2,cy-6); ctx.lineTo(p.facing===1?cx+2:cx-2,cy+6); ctx.stroke();
  } else if (wId === 'staff') {
    ctx.fillRect(p.facing === 1 ? cx : cx-10, cy-1, 10, 2);
    ctx.fillStyle = '#dd88ff';
    ctx.beginPath(); ctx.arc(p.facing===1?cx+13:cx-13, cy, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(221,136,255,0.4)';
    ctx.beginPath(); ctx.arc(p.facing===1?cx+13:cx-13, cy, 6, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawMonster(m) {
  const c = m.hitFlash > 0 ? PAL.white : PAL.monster;
  const x = Math.round(m.x), y = Math.round(m.y);
  ctx.fillStyle = c;
  ctx.fillRect(x+1, y+4, m.w-2, m.h-4); ctx.fillRect(x, y, m.w, 5);
  ctx.fillRect(x-1, y+1, 2, 3); ctx.fillRect(x+m.w-1, y+1, 2, 3);
  ctx.fillStyle = '#ff2222'; ctx.fillRect(x+2,y+1,2,2); ctx.fillRect(x+6,y+1,2,2);
  drawHpBar(x-1, y-5, m.w+2, 2, m.hp/m.maxHp, '#44ff44', '#003300');
}
function drawMonsters(monsters) { for (const m of monsters) drawMonster(m); }

function drawProjectiles(projs) {
  for (const pr of projs) {
    if (pr.weaponId === 'bow') {
      ctx.strokeStyle = PAL.bow; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pr.x,pr.y); ctx.lineTo(pr.x-pr.dx*4,pr.y-pr.dy*4); ctx.stroke();
      ctx.fillStyle = '#ffeeaa'; ctx.fillRect(Math.round(pr.x)-1,Math.round(pr.y)-1,2,2);
    } else if (pr.weaponId === 'staff') {
      ctx.strokeStyle = PAL.staff; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pr.x,pr.y,4,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(170,68,255,0.5)';
      ctx.beginPath(); ctx.arc(pr.x,pr.y,6,0,Math.PI*2); ctx.fill();
    }
  }
}

function drawParticles(particles) {
  for (const p of particles) {
    if (p.type === 'xp') {
      const alpha = Math.max(0, p.timer/900);
      const rise = (1 - p.timer/900)*12;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PAL.xp;
      pixelText(p.text, Math.round(p.x), Math.round(p.y - rise));
      ctx.globalAlpha = 1;
    } else if (p.type === 'aoe') {
      ctx.globalAlpha = Math.max(0, p.timer/300);
      ctx.strokeStyle = p.color || PAL.staff; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.radius||4,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.type === 'waveclear') {
      ctx.globalAlpha = Math.min(1, p.timer/2500*3);
      ctx.fillStyle = PAL.xp; ctx.font = '10px "Courier New",monospace';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }
}

function drawHUD(state) {
  const p1 = state.players.p1, p2 = state.players.p2;
  if (p1) {
    ctx.fillStyle = PAL.p1; pixelText('P1', 10, 6);
    drawHpBar(22, 5, 56, 5, p1.hp/p1.maxHp, PAL.p1, '#330000');
    for (let i = 0; i < (p1.lives||0); i++) { ctx.fillStyle = PAL.p1; ctx.fillRect(10+i*5,13,3,3); }
  }
  if (p2) {
    ctx.fillStyle = PAL.p2; pixelText('P2', CANVAS_W-18, 6);
    drawHpBar(CANVAS_W-80, 5, 56, 5, p2.hp/p2.maxHp, PAL.p2, '#330000');
    for (let i = 0; i < (p2.lives||0); i++) { ctx.fillStyle = PAL.p2; ctx.fillRect(CANVAS_W-12-i*5,13,3,3); }
  }
  const w = state.wave;
  if (w) {
    const wt = 'WAVE '+w.num, mt = w.monstersLeft+' LEFT';
    ctx.fillStyle = PAL.text; pixelText(wt, Math.round(CANVAS_W/2-wt.length*3), 6);
    ctx.fillStyle = '#888'; pixelText(mt, Math.round(CANVAS_W/2-mt.length*3), 13);
  }
  ctx.fillStyle = PAL.xp; pixelText('XP:'+state.xp, 10, CANVAS_H-10);
}

// ─── Weapon Panel ─────────────────────────────────────────────────────────────

function drawWeaponPanel(state) {
  if (!myNum) return;
  const mp = myNum === 1 ? state.players?.p1 : state.players?.p2;
  if (!mp || !mp.unlockedWeapons) return;

  const weapons = mp.unlockedWeapons;
  const slotW = 26, slotH = 22, gap = 2;
  const totalW = weapons.length * (slotW + gap) - gap;
  const panelX = Math.round((CANVAS_W - totalW) / 2);
  const panelY = CANVAS_H - slotH - 4;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(panelX - 4, panelY - 3, totalW + 8, slotH + 6);

  // Controls hint to the right of the slots
  const hx = panelX + totalW + 10, hy = panelY;
  ctx.save();
  ctx.font = '5px "Courier New",monospace';
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = '#555'; ctx.fillText('ARROWS MOVE', hx, hy);
  ctx.fillStyle = '#555'; ctx.fillText('SPACE  ATK',  hx, hy + 7);
  ctx.fillStyle = '#555'; ctx.fillText('ENTER  SWAP', hx, hy + 14);
  ctx.restore();

  for (let i = 0; i < weapons.length; i++) {
    const wId = weapons[i];
    const sel = wId === mp.weaponId;
    const sx = panelX + i * (slotW + gap), sy = panelY;
    const wc = WEAPON_COLOR[wId] || PAL.white;

    ctx.fillStyle = sel ? 'rgba(255,255,255,0.1)' : 'rgba(5,5,15,0.8)';
    ctx.fillRect(sx, sy, slotW, slotH);
    ctx.strokeStyle = sel ? wc : '#2a2a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, slotW - 1, slotH - 1);

    if (sel) {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = wc; ctx.lineWidth = 1;
      ctx.strokeRect(sx - 0.5, sy - 0.5, slotW + 1, slotH + 1);
      ctx.restore();
    }

    drawWeaponIconMini(wId, sx + slotW / 2, sy + 9, wc, sel);

    ctx.save();
    ctx.font = '4px "Courier New",monospace';
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
    ctx.fillStyle = sel ? wc : '#444';
    ctx.fillText(wId.slice(0, 4).toUpperCase(), sx + slotW / 2, sy + slotH - 1);
    ctx.restore();
  }
}

function drawWeaponIconMini(wId, cx, cy, color, bright) {
  const c = bright ? color : '#404050';
  const icx = Math.round(cx), icy = Math.round(cy);
  ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 1;
  if (wId === 'sword') {
    ctx.fillRect(icx-6, icy-1, 12, 2); ctx.fillRect(icx+4, icy-3, 2, 6);
  } else if (wId === 'dagger') {
    ctx.fillRect(icx-4, icy-1, 9, 2);
    ctx.beginPath(); ctx.moveTo(icx+5,icy-2); ctx.lineTo(icx+8,icy); ctx.lineTo(icx+5,icy+2); ctx.fill();
  } else if (wId === 'axe') {
    ctx.fillRect(icx-1, icy-5, 2, 10); ctx.fillRect(icx, icy-4, 6, 8);
  } else if (wId === 'spear') {
    ctx.fillRect(icx-7, icy, 14, 1);
    ctx.beginPath(); ctx.moveTo(icx+7,icy-3); ctx.lineTo(icx+11,icy); ctx.lineTo(icx+7,icy+3); ctx.fill();
  } else if (wId === 'bow') {
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(icx, icy, 6, Math.PI*0.3, Math.PI*1.7); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = bright ? '#aa7733' : '#333';
    ctx.beginPath(); ctx.moveTo(icx, icy-6); ctx.lineTo(icx, icy+6); ctx.stroke();
    ctx.strokeStyle = c;
  } else if (wId === 'staff') {
    ctx.fillRect(icx-6, icy-1, 10, 2);
    ctx.fillStyle = bright ? '#dd88ff' : '#404050';
    ctx.beginPath(); ctx.arc(icx+6, icy, 3, 0, Math.PI*2); ctx.fill();
  }
}

function drawHpBar(x, y, w, h, ratio, fg, bg) {
  ctx.fillStyle = bg; ctx.fillRect(x,y,w,h);
  ctx.fillStyle = fg; ctx.fillRect(x,y,Math.round(w*Math.max(0,ratio)),h);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x,y,w,h);
}

function pixelText(text, x, y) {
  const saved = ctx.fillStyle;
  ctx.font = '6px "Courier New",monospace';
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText(text, x+1, y+1);
  ctx.fillStyle = saved;
  ctx.fillText(text, x, y);
}

// ─── Unlock Preview ───────────────────────────────────────────────────────────

function drawUnlockPreview(weaponId) {
  const uc = document.getElementById('unlockCanvas');
  const ux = uc.getContext('2d');
  ux.imageSmoothingEnabled = false;
  ux.clearRect(0,0,120,80);
  const wc = WEAPON_COLOR[weaponId] || '#ffffff';
  const cx=60, cy=40;
  ux.fillStyle='#1a1a2e'; ux.fillRect(0,0,120,80);
  ux.strokeStyle=wc; ux.lineWidth=1; ux.strokeRect(2,2,116,76);
  ux.fillStyle=wc; ux.strokeStyle=wc;
  if (weaponId==='sword') { ux.fillRect(cx-20,cy-2,40,4); ux.fillRect(cx+17,cy-8,4,16); ux.fillRect(cx-8,cy-1,6,2); }
  else if (weaponId==='dagger') { ux.fillRect(cx-14,cy-2,28,4); ux.beginPath(); ux.moveTo(cx+14,cy-4); ux.lineTo(cx+22,cy); ux.lineTo(cx+14,cy+4); ux.fill(); }
  else if (weaponId==='axe') { ux.fillRect(cx-5,cy-22,10,44); ux.fillRect(cx+4,cy-18,16,36); }
  else if (weaponId==='spear') { ux.fillRect(cx-28,cy-1,50,2); ux.beginPath(); ux.moveTo(cx+22,cy-6); ux.lineTo(cx+34,cy); ux.lineTo(cx+22,cy+6); ux.fill(); }
  else if (weaponId==='bow') { ux.lineWidth=3; ux.beginPath(); ux.arc(cx,cy,20,Math.PI*0.3,Math.PI*1.7); ux.stroke(); ux.lineWidth=1; ux.strokeStyle='#886633'; ux.beginPath(); ux.moveTo(cx,cy-20); ux.lineTo(cx,cy+20); ux.stroke(); }
  else if (weaponId==='staff') { ux.fillRect(cx-30,cy-2,50,4); ux.fillStyle='#dd88ff'; ux.beginPath(); ux.arc(cx+26,cy,10,0,Math.PI*2); ux.fill(); ux.fillStyle='rgba(221,136,255,0.4)'; ux.beginPath(); ux.arc(cx+26,cy,16,0,Math.PI*2); ux.fill(); }
}
