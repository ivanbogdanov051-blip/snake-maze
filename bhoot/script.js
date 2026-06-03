const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const startBtn = document.getElementById('startBtn');
const gameArea = document.getElementById('gameArea');

let score = 0;
let timeLeft = 30;
let gameInterval = null;
let bubbleInterval = null;
let active = false;

function createBubble() {
  const bubble = document.createElement('div');
  const size = Math.random() * 48 + 32;
  const x = Math.random() * (gameArea.clientWidth - size);
  const y = Math.random() * (gameArea.clientHeight - size);
  bubble.className = 'bubble';
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;
  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;
  bubble.style.opacity = '0';
  bubble.addEventListener('click', () => popBubble(bubble));
  gameArea.appendChild(bubble);

  requestAnimationFrame(() => {
    bubble.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    bubble.style.opacity = '1';
    bubble.style.transform = 'scale(1)';
  });

  setTimeout(() => {
    if (bubble.parentElement) {
      bubble.remove();
    }
  }, 2200);
}

function popBubble(bubble) {
  if (!active) return;
  score += 1;
  scoreEl.textContent = score;
  bubble.style.transform = 'scale(0)';
  bubble.style.opacity = '0';
  bubble.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  setTimeout(() => bubble.remove(), 200);
}

function updateTimer() {
  timeLeft -= 1;
  timeEl.textContent = timeLeft;
  if (timeLeft <= 0) {
    endGame();
  }
}

function startGame() {
  if (active) return;
  active = true;
  score = 0;
  timeLeft = 30;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  startBtn.textContent = 'Playing...';
  startBtn.disabled = true;
  gameArea.innerHTML = '';

  bubbleInterval = setInterval(createBubble, 700);
  gameInterval = setInterval(updateTimer, 1000);
  createBubble();
}

function endGame() {
  active = false;
  clearInterval(gameInterval);
  clearInterval(bubbleInterval);
  startBtn.textContent = 'Play Again';
  startBtn.disabled = false;
  gameArea.innerHTML = '<div class="end-message">Time up! Your score: ' + score + '</div>';
}

window.addEventListener('resize', () => {
  // keep bubble creation adapted to the game area size
});
startBtn.addEventListener('click', startGame);
