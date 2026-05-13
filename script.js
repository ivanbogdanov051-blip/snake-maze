const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const titleScreen = document.getElementById('titleScreen');
const gameContainer = document.getElementById('gameContainer');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const gameLevelLabel = document.getElementById('gameLevel');
const applesLabel = document.getElementById('apples');
const enemyCountLabel = document.getElementById('enemyCount');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const messageBox = document.getElementById('message');
const leaderboardMenuBtn = document.getElementById('leaderboardMenuBtn');
const leaderboardBackBtn = document.getElementById('leaderboardBackBtn');
const leaderboardTable = document.getElementById('leaderboardTable');

const tileSize = 32;
const wallColor = '#334155';
const appleColor = '#f97316';

// Level configurations
const levelConfigs = {
  1: { width: 768, height: 576, name: 'Small Map', maxEnemies: 3 },
  2: { width: 960, height: 720, name: 'Medium Map', maxEnemies: 4 },
  3: { width: 1152, height: 864, name: 'Large Map', maxEnemies: 5 }
};

let currentMapLevel = 1;
let columns = 24;
let rows = 18;
const mazeWalls = new Set();
let apples = [];
let player = null;
let enemies = [];
let gameInterval = null;
let gameRunning = false;
let gameOverState = false;

function setCanvasDimensions(level) {
  const config = levelConfigs[level];
  canvas.width = config.width;
  canvas.height = config.height;
  columns = config.width / tileSize;
  rows = config.height / tileSize;
}

function loadLeaderboard() {
  const stored = localStorage.getItem('snakeMazeLeaderboard');
  return stored ? JSON.parse(stored) : [];
}

function saveLeaderboard(scores) {
  localStorage.setItem('snakeMazeLeaderboard', JSON.stringify(scores));
}

function addScore(finalLevel, mapLevel) {
  const scores = loadLeaderboard();
  scores.push({
    score: finalLevel,
    mapLevel: mapLevel,
    date: new Date().toLocaleDateString()
  });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(10);
  saveLeaderboard(scores);
}

function displayLeaderboard() {
  const scores = loadLeaderboard();
  leaderboardTable.innerHTML = `
    <div class="leaderboard-entry header">
      <span class="rank">Rank</span>
      <span class="score">Score</span>
      <span class="level">Map</span>
      <span class="date">Date</span>
    </div>
  `;
  
  if (scores.length === 0) {
    leaderboardTable.innerHTML += '<div class="leaderboard-entry empty">No scores yet. Start playing!</div>';
    return;
  }
  
  scores.forEach((score, index) => {
    const entry = document.createElement('div');
    entry.className = 'leaderboard-entry';
    entry.innerHTML = `
      <span class="rank">#${index + 1}</span>
      <span class="score">${score.score}</span>
      <span class="level">Lvl ${score.mapLevel}</span>
      <span class="date">${score.date}</span>
    `;
    leaderboardTable.appendChild(entry);
  });
}

function setMessage(text, warning = false) {
  messageBox.textContent = text;
  messageBox.style.color = warning ? '#fda4af' : '#a5f3fc';
}

function cellKey(x, y) {
  return `${x}:${y}`;
}

function withinBounds(x, y) {
  return x >= 0 && x < columns && y >= 0 && y < rows;
}

function createMaze() {
  mazeWalls.clear();

  for (let x = 0; x < columns; x += 1) {
    mazeWalls.add(cellKey(x, 0));
    mazeWalls.add(cellKey(x, rows - 1));
  }
  for (let y = 0; y < rows; y += 1) {
    mazeWalls.add(cellKey(0, y));
    mazeWalls.add(cellKey(columns - 1, y));
  }

  const segmentCount = Math.floor(12 * (columns / 24));
  for (let i = 0; i < segmentCount; i += 1) {
    const length = 3 + Math.floor(Math.random() * 4);
    const horizontal = Math.random() > 0.5;
    const startX = 2 + Math.floor(Math.random() * (columns - 6));
    const startY = 2 + Math.floor(Math.random() * (rows - 6));

    for (let step = 0; step < length; step += 1) {
      const x = startX + (horizontal ? step : 0);
      const y = startY + (horizontal ? 0 : step);
      if (withinBounds(x, y) && x > 1 && x < columns - 2 && y > 1 && y < rows - 2) {
        if (Math.random() > 0.3) {
          mazeWalls.add(cellKey(x, y));
        }
      }
    }
  }

  const extraWalls = Math.floor(columns * rows * 0.02);
  for (let i = 0; i < extraWalls; i += 1) {
    const x = 2 + Math.floor(Math.random() * (columns - 4));
    const y = 2 + Math.floor(Math.random() * (rows - 4));
    if (Math.random() > 0.85) {
      mazeWalls.add(cellKey(x, y));
    }
  }
}

function getEmptyCell() {
  const occupied = new Set(mazeWalls);
  if (player && player.body) {
    player.body.forEach(part => occupied.add(cellKey(part.x, part.y)));
  }
  enemies.forEach(enemy => enemy.body.forEach(part => occupied.add(cellKey(part.x, part.y))));
  apples.forEach(apple => occupied.add(cellKey(apple.x, apple.y)));

  while (true) {
    const x = Math.floor(Math.random() * columns);
    const y = Math.floor(Math.random() * rows);
    if (!occupied.has(cellKey(x, y))) {
      return { x, y };
    }
  }
}

function createApple() {
  const position = getEmptyCell();
  apples.push(position);
}

function spawnSnake(length, color, level) {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const head = getEmptyCell();
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const body = [head];
    let valid = true;

    for (let i = 1; i < length; i += 1) {
      const previous = body[i - 1];
      const next = { x: previous.x - direction.x, y: previous.y - direction.y };
      if (!withinBounds(next.x, next.y) || mazeWalls.has(cellKey(next.x, next.y)) || body.some(part => part.x === next.x && part.y === next.y)) {
        valid = false;
        break;
      }
      body.push(next);
    }

    if (valid) {
      return { color, level, body, direction, nextDirection: direction, grow: 0 };
    }
  }

  return { color, level, body: [getEmptyCell()], direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 }, grow: 0 };
}

function getRandomEnemyLevel() {
  const playerLevel = Math.max(1, player ? player.level : 1);
  const minLevel = Math.max(1, playerLevel - 1);
  const maxLevel = playerLevel + 2;
  return minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
}

function spawnEnemies() {
  const initialCount = levelConfigs[currentMapLevel].maxEnemies;
  enemies = [];
  const colors = ['#ef4444', '#14b8a6', '#eab308', '#8b5cf6', '#f59e0b'];
  
  for (let i = 0; i < initialCount; i += 1) {
    enemies.push(spawnSnake(2 + (i % 2), colors[i % colors.length], getRandomEnemyLevel()));
  }
}

function resetGame() {
  createMaze();
  apples = [];
  enemies = [];
  player = spawnSnake(3, '#10b981', 1);
  player.apples = 0;
  player.grow = 0;
  player.level = 1;

  spawnEnemies();
  for (let i = 0; i < 5; i += 1) {
    createApple();
  }

  gameLevelLabel.textContent = player.level;
  applesLabel.textContent = player.apples;
  enemyCountLabel.textContent = enemies.length;
  setMessage('Press arrow keys or WASD to begin.');
  gameRunning = false;
  gameOverState = false;
  draw();
}

function canChangeDirection(oldDir, nextDir) {
  return oldDir.x !== -nextDir.x || oldDir.y !== -nextDir.y;
}

function getSnakeCells(snake) {
  return new Set(snake.body.map(part => cellKey(part.x, part.y)));
}

function moveSnake(snake) {
  const nextDirection = snake.nextDirection;
  if (canChangeDirection(snake.direction, nextDirection)) {
    snake.direction = nextDirection;
  }
  const head = snake.body[0];
  const newHead = { x: head.x + snake.direction.x, y: head.y + snake.direction.y };
  snake.body.unshift(newHead);
  if (snake.grow > 0) {
    snake.grow -= 1;
  } else {
    snake.body.pop();
  }
}

function pickEnemyDirection(enemy) {
  const options = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const valid = options.filter(dir => {
    if (dir.x === -enemy.direction.x && dir.y === -enemy.direction.y) return false;
    const next = { x: enemy.body[0].x + dir.x, y: enemy.body[0].y + dir.y };
    if (!withinBounds(next.x, next.y) || mazeWalls.has(cellKey(next.x, next.y))) return false;
    
    // Avoid own body (except tail which will move away)
    for (const part of enemy.body.slice(0, -1)) {
      if (next.x === part.x && next.y === part.y) return false;
    }
    
    // Avoid player snake
    if (player && player.body) {
      for (const part of player.body) {
        if (next.x === part.x && next.y === part.y) return false;
      }
    }
    
    // Avoid other enemy snakes
    for (const otherEnemy of enemies) {
      if (otherEnemy === enemy) continue;
      for (const part of otherEnemy.body) {
        if (next.x === part.x && next.y === part.y) return false;
      }
    }
    
    return true;
  });
  if (valid.length === 0) return enemy.direction;
  const choice = valid[Math.floor(Math.random() * valid.length)];
  return choice;
}

function eatEnemy(playerSnake, enemySnake) {
  playerSnake.level += enemySnake.level;
  playerSnake.grow += enemySnake.level;
  setMessage(`You ate a level ${enemySnake.level} snake and gained ${enemySnake.level} levels!`);
}

function gameOver(reason) {
  setMessage(`${reason} Tap Respawn to play again.`, true);
  gameRunning = false;
  gameOverState = true;
  addScore(player.level, currentMapLevel);
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function handlePlayerCollisions() {
  const head = player.body[0];
  if (!withinBounds(head.x, head.y) || mazeWalls.has(cellKey(head.x, head.y))) {
    gameOver('You hit a wall and restarted!');
    return;
  }
  for (let i = 1; i < player.body.length; i += 1) {
    if (head.x === player.body[i].x && head.y === player.body[i].y) {
      gameOver('You ran into yourself and restarted!');
      return;
    }
  }
  const eatenAppleIndex = apples.findIndex(apple => apple.x === head.x && apple.y === head.y);
  if (eatenAppleIndex > -1) {
    apples.splice(eatenAppleIndex, 1);
    player.apples += 1;
    player.level += 1;
    player.grow += 1;
    applesLabel.textContent = player.apples;
    gameLevelLabel.textContent = player.level;
    createApple();
    setMessage('Apple eaten! Level increased.');
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const enemyCells = getSnakeCells(enemy);
    if (enemyCells.has(cellKey(head.x, head.y))) {
      if (player.level > enemy.level) {
        eatEnemy(player, enemy);
        enemies.splice(i, 1);
        enemyCountLabel.textContent = enemies.length;
        gameLevelLabel.textContent = player.level;
      } else {
        gameOver(`Level ${enemy.level} snake ate you!`);
        return;
      }
    }
  }
}

function handleEnemyCollisions() {
  if (!gameRunning) return;
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const head = enemy.body[0];
    
    // Check wall collision
    if (!withinBounds(head.x, head.y) || mazeWalls.has(cellKey(head.x, head.y))) {
      enemies.splice(i, 1);
      enemyCountLabel.textContent = enemies.length;
      continue;
    }
    
    // Check self collision
    for (let j = 1; j < enemy.body.length; j += 1) {
      if (head.x === enemy.body[j].x && head.y === enemy.body[j].y) {
        enemies.splice(i, 1);
        enemyCountLabel.textContent = enemies.length;
        continue;
      }
    }
    
    // Check collision with other enemies
    let hitOtherEnemy = false;
    for (let j = 0; j < enemies.length; j += 1) {
      if (i === j) continue;
      const otherEnemy = enemies[j];
      for (const part of otherEnemy.body) {
        if (head.x === part.x && head.y === part.y) {
          hitOtherEnemy = true;
          break;
        }
      }
      if (hitOtherEnemy) break;
    }
    if (hitOtherEnemy) {
      enemies.splice(i, 1);
      enemyCountLabel.textContent = enemies.length;
      continue;
    }
    
    // Check collision with player
    const playerHead = player.body[0];
    if (head.x === playerHead.x && head.y === playerHead.y) {
      if (player.level > enemy.level) {
        eatEnemy(player, enemy);
        enemies.splice(i, 1);
        enemyCountLabel.textContent = enemies.length;
        gameLevelLabel.textContent = player.level;
      } else {
        gameOver(`Level ${enemy.level} snake ate you!`);
        return;
      }
    }
  }
}

function updateEnemies() {
  enemies.forEach(enemy => {
    enemy.nextDirection = pickEnemyDirection(enemy);
    enemy.direction = enemy.nextDirection;
    moveSnake(enemy);
  });
  handleEnemyCollisions();
  const maxEnemies = levelConfigs[currentMapLevel].maxEnemies;
  if (enemies.length < maxEnemies) {
    const newEnemyLevel = getRandomEnemyLevel();
    const colors = ['#ef4444', '#14b8a6', '#eab308', '#8b5cf6', '#f59e0b'];
    enemies.push({
      color: colors[enemies.length % colors.length],
      level: newEnemyLevel,
      body: [{ x: 2, y: rows - 4 }, { x: 3, y: rows - 4 }],
      direction: { x: 1, y: 0 },
      grow: 0,
    });
    enemyCountLabel.textContent = enemies.length;
  }
}

function drawCell(x, y, fillStyle, strokeStyle) {
  ctx.fillStyle = fillStyle;
  ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.strokeRect(x * tileSize + 0.5, y * tileSize + 0.5, tileSize - 1, tileSize - 1);
  }
}

function drawGrid() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  mazeWalls.forEach(key => {
    const [x, y] = key.split(':').map(Number);
    drawCell(x, y, wallColor);
  });
  apples.forEach(apple => drawCell(apple.x, apple.y, appleColor));
}

function drawSnake(snake, highlight) {
  snake.body.forEach((segment, index) => {
    const tint = index === 0 ? '#ffffff' : snake.color;
    drawCell(segment.x, segment.y, tint);
  });
  const head = snake.body[0];
  ctx.fillStyle = snake.color;
  ctx.fillRect(head.x * tileSize + 8, head.y * tileSize + 8, tileSize - 16, tileSize - 16);
  if (highlight) {
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(head.x * tileSize + 2, head.y * tileSize + 2, tileSize - 4, tileSize - 4);
  }

  const text = String(snake.level);
  ctx.font = 'bold 14px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textX = head.x * tileSize + tileSize / 2;
  const textY = head.y * tileSize + tileSize * 0.25;
  ctx.fillStyle = '#111827';
  ctx.fillRect(textX - 12, textY - 10, 24, 18);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(text, textX, textY);

  if (highlight && !gameRunning) {
    ctx.font = 'bold 16px Inter, Arial, sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('YOU', textX, textY - 20);
  }
}

function draw() {
  drawGrid();
  drawSnake(player, true);
  enemies.forEach(enemy => drawSnake(enemy));
}

function tick() {
  if (!gameRunning) return;
  moveSnake(player);
  handlePlayerCollisions();
  updateEnemies();
  draw();
}

function startLoop() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = window.setInterval(tick, 220);
}

window.addEventListener('keydown', event => {
  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };
  const move = keyMap[event.key];
  if (move) {
    event.preventDefault();
    if (gameOverState) return;
    if (canChangeDirection(player.direction, move)) {
      player.nextDirection = move;
      if (!gameRunning) {
        gameRunning = true;
        setMessage('Game started. Eat apples, avoid stronger snakes.');
      }
    }
  }
});

restartButton.addEventListener('click', () => {
  resetGame();
  startLoop();
});

menuButton.addEventListener('click', () => {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = null;
  gameRunning = false;
  gameOverState = false;
  titleScreen.classList.remove('hidden');
  gameContainer.classList.add('hidden');
});

// Level selection
document.querySelectorAll('.level-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const level = parseInt(e.currentTarget.dataset.level, 10);
    currentMapLevel = level;
    setCanvasDimensions(level);
    titleScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    resetGame();
    startLoop();
  });
});

// Leaderboard buttons
leaderboardMenuBtn.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  leaderboardScreen.classList.remove('hidden');
  displayLeaderboard();
});

leaderboardBackBtn.addEventListener('click', () => {
  leaderboardScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
});

// Show title screen on load
titleScreen.classList.remove('hidden');
gameContainer.classList.add('hidden');
leaderboardScreen.classList.add('hidden');

