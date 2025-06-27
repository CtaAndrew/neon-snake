// main.js - Iteration #17: Pause Fix & Complete Script

// --------------------
// CONSTANTS & SETTINGS
// --------------------
const cellSize = 40;
const speed = 133;  // ms per movement tick
const PADDING = 10, BORDER = 2;
const MAX_FRUITS = 5, MAX_BOMBS = 3;

// --------------------
// GLOBAL STATE
// --------------------
let canvas, ctx, cols, rows;
let snake, prevSnake, direction, nextDirection;
let fruits = [], bombs = [];
let score, highScore, isPaused, currentSnakeColor;
let touchStartX, touchStartY;
let lastTime = 0, accumulator = 0;

// Fruit definitions
const shapeOptions = [
  { shape: 'circle', weight: 0.5, points: 1 },
  { shape: 'triangle', weight: 0.3, points: 5 },
  { shape: 'diamond', weight: 0.15, points: 10 },
  { shape: 'star', weight: 0.05, points: 25 }
];
const colorOptions = ['#f0f', '#0f0', '#f00', '#ff8800', '#bf00ff', '#00f', '#0ff'];

// --------------------
// UTILITY FUNCTIONS
// --------------------
function weightedShape() {
  let r = Math.random(), sum = 0;
  for (const opt of shapeOptions) {
    sum += opt.weight;
    if (r < sum) return opt;
  }
  return shapeOptions[shapeOptions.length - 1];
}

function spawnFruit() {
  if (fruits.length >= MAX_FRUITS) return;
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  } while (
    snake.some(s => s.x === pos.x && s.y === pos.y) ||
    fruits.some(f => f.x === pos.x && f.y === pos.y) ||
    bombs.some(b => b.x === pos.x && b.y === pos.y)
  );
  const shp = weightedShape();
  const col = colorOptions[Math.floor(Math.random() * colorOptions.length)];
  fruits.push({ x: pos.x, y: pos.y, shape: shp.shape, points: shp.points, color: col });
}

function spawnBomb() {
  if (bombs.length >= MAX_BOMBS) return;
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  } while (
    snake.some(s => s.x === pos.x && s.y === pos.y) ||
    fruits.some(f => f.x === pos.x && f.y === pos.y) ||
    bombs.some(b => b.x === pos.x && b.y === pos.y)
  );
  bombs.push({ x: pos.x, y: pos.y });
}

// --------------------
// GAME INITIALIZATION
// --------------------
function startGame() {
  // Show/hide UI
  document.getElementById('start-button').style.display = 'none';
  document.getElementById('game-over-modal').classList.remove('show');
  document.getElementById('pause-modal').classList.remove('show');
  document.getElementById('header').style.display = 'flex';
  document.getElementById('pause-button').style.display = 'inline-block';

  // Initialize state
  prevSnake = [];
  snake = [{ x: 0, y: 0 }];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  fruits = [];
  bombs = [];
  score = 0;
  isPaused = false;
  currentSnakeColor = '#0ff';
  updateScore();
  if (typeof highScore === 'undefined') highScore = 0;
  updateHighScore();

  // Setup canvas
  canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  const headerH = document.getElementById('header').offsetHeight;
  cols = Math.floor((window.innerWidth - 2 * PADDING - 2 * BORDER) / cellSize);
  rows = Math.floor((window.innerHeight - headerH - 2 * PADDING - 2 * BORDER) / cellSize);
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  canvas.style.top = (headerH + PADDING) + 'px';
  canvas.style.left = PADDING + 'px';
  ctx = canvas.getContext('2d');

  snake[0] = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };

  // Spawn initial fruits
  for (let i = 0; i < MAX_FRUITS; i++) spawnFruit();

  // Reset timing
  lastTime = performance.now();
  accumulator = 0;
  requestAnimationFrame(gameLoop);

  // Event listeners
  window.addEventListener('keydown', handleKey);
  canvas.addEventListener('touchstart', handleTouchStart, false);
  canvas.addEventListener('touchend', handleTouchEnd, false);
  document.getElementById('pause-button').addEventListener('click', togglePause);
}

// --------------------
// MAIN LOOP
// --------------------
function gameLoop(timestamp) {
  if (isPaused) {
    requestAnimationFrame(gameLoop);
    return;
  }
  let delta = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += delta;

  while (accumulator >= speed) {
    const nextHead = {
      x: (snake[0].x + nextDirection.x + cols) % cols,
      y: (snake[0].y + nextDirection.y + rows) % rows
    };
    // Collision checks
    if (bombs.some(b => b.x === nextHead.x && b.y === nextHead.y) ||
        snake.some(s => s.x === nextHead.x && s.y === nextHead.y)) {
      if (score > highScore) { highScore = score; updateHighScore(); }
      showGameOver();
      return;
    }

    prevSnake = snake.map(seg => ({ ...seg }));
    update();
    accumulator -= speed;
  }

  const frac = accumulator / speed;
  draw(frac);
  requestAnimationFrame(gameLoop);
}

// --------------------
// UPDATE STATE
// --------------------
function update() {
  direction = nextDirection;
  const head = {
    x: (snake[0].x + direction.x + cols) % cols,
    y: (snake[0].y + direction.y + rows) % rows
  };
  snake.unshift(head);

  const eatenIndex = fruits.findIndex(f => f.x === head.x && f.y === head.y);
  if (eatenIndex !== -1) {
    const eaten = fruits.splice(eatenIndex, 1)[0];
    score += eaten.points;
    currentSnakeColor = eaten.color;
    updateScore();
    spawnFruit();
    if (Math.random() < 0.2) spawnBomb();
    if (Math.random() < 0.2 && bombs.length > 0) {
      bombs.splice(Math.floor(Math.random() * bombs.length), 1);
    }
  } else {
    snake.pop();
  }
}

// --------------------
// RENDER
// --------------------
function draw(frac) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw fruits
  fruits.forEach(f => {
    const fx = f.x * cellSize + cellSize/2;
    const fy = f.y * cellSize + cellSize/2;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    if (f.shape === 'circle') {
      ctx.arc(fx, fy, cellSize/2, 0, 2*Math.PI);
    } else if (f.shape === 'triangle') {
      ctx.moveTo(fx, fy - cellSize/2);
      ctx.lineTo(fx - cellSize/2, fy + cellSize/2);
      ctx.lineTo(fx + cellSize/2, fy + cellSize/2);
      ctx.closePath();
    } else if (f.shape === 'diamond') {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(Math.PI/4);
      ctx.fillRect(-cellSize/2, -cellSize/2, cellSize, cellSize);
      ctx.restore();
    } else { // star
      const spikes = 5, outer = cellSize/2, inner = outer/2;
      let rot = Math.PI/2 * 3;
      ctx.moveTo(fx, fy - outer);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(fx + Math.cos(rot)*outer, fy + Math.sin(rot)*outer);
        rot += Math.PI/spikes;
        ctx.lineTo(fx + Math.cos(rot)*inner, fy + Math.sin(rot)*inner);
        rot += Math.PI/spikes;
      }
      ctx.closePath();
    }
    ctx.fill();
  });

  // Draw bombs
  bombs.forEach(b => {
    const bx = b.x * cellSize + cellSize/2;
    const by = b.y * cellSize + cellSize/2;
    const br = cellSize * 0.4;
    // White circle
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, 2*Math.PI);
    ctx.fill();
    // Black X
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - br, by - br);
    ctx.lineTo(bx + br, by + br);
    ctx.moveTo(bx + br, by - br);
    ctx.lineTo(bx - br, by + br);
    ctx.stroke();
  });

  // Draw snake segments
  snake.forEach((seg, i) => {
    const prev = prevSnake[i] || seg;
    let dx = seg.x - prev.x;
    let dy = seg.y - prev.y;
    // handle wrap-around interpolation
    if (dx > cols/2) dx -= cols; if (dx < -cols/2) dx += cols;
    if (dy > rows/2) dy -= rows; if (dy < -rows/2) dy += rows;
    const x = (prev.x + dx * frac) * cellSize;
    const y = (prev.y + dy * frac) * cellSize;

    ctx.fillStyle = currentSnakeColor;
    ctx.shadowColor = currentSnakeColor;
    ctx.shadowBlur = 15;

    if (i > 0) {
      // body
      ctx.fillRect(x, y, cellSize, cellSize);
    } else {
      // head with equal rounded front corners
      const r = cellSize * 0.2;
      ctx.beginPath();
      if (direction.x === 1) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize - r, y);
        ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + r);
        ctx.lineTo(x + cellSize, y + cellSize - r);
        ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
        ctx.lineTo(x, y + cellSize);
      } else if (direction.x === -1) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.lineTo(x + r, y + cellSize);
        ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      } else if (direction.y === 1) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize - r);
        ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
        ctx.lineTo(x + r, y + cellSize);
        ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
        ctx.lineTo(x, y);
      } else { // up
        ctx.moveTo(x, y + r);
        ctx.lineTo(x, y + cellSize);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.lineTo(x + cellSize, y + r);
        ctx.quadraticCurveTo(x + cellSize, y, x + cellSize - r, y);
        ctx.lineTo(x + r, y);
        ctx.quadraticCurveTo(x, y, x, y + r);
      }
      ctx.closePath();
      ctx.fill();

      // eyes
      const cX = x + cellSize/2, cY = y + cellSize/2;
      const eOff = cellSize * 0.2, eR = cellSize * 0.1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      if (direction.x === 0) {
        // vertical: side-by-side
        ctx.beginPath();
        ctx.arc(cX - eOff, cY - eOff/2, eR, 0, 2*Math.PI);
        ctx.arc(cX + eOff, cY - eOff/2, eR, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cX - eOff, cY - eOff/2, eR/2, 0, 2*Math.PI);
        ctx.arc(cX + eOff, cY - eOff/2, eR/2, 0, 2*Math.PI);
        ctx.fill();
      } else {
        // horizontal: stacked
        ctx.beginPath();
        ctx.arc(cX - eOff/2, cY - eOff, eR, 0, 2*Math.PI);
        ctx.arc(cX - eOff/2, cY + eOff, eR, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cX - eOff/2, cY - eOff, eR/2, 0, 2*Math.PI);
        ctx.arc(cX - eOff/2, cY + eOff, eR/2, 0, 2*Math.PI);
        ctx.fill();
      }
    }
  });
}

// --------------------
// UI & CONTROLS
// --------------------
function updateScore() {
  document.getElementById('scoreboard').textContent = 'Score: ' + score;
}
function updateHighScore() {
  document.getElementById('highscore').textContent = 'High Score: ' + highScore;
}
function showGameOver() {
  document.getElementById('final-score').textContent = score;
  document.getElementById('game-over-modal').classList.add('show');
}
function togglePause() {
  isPaused = !isPaused;
  const modal = document.getElementById('pause-modal');
  modal.classList.toggle('show', isPaused);
  if (!isPaused) {
    // reset timing to prevent jump
    lastTime = performance.now();
    accumulator = 0;
    requestAnimationFrame(gameLoop);
  }
}

function handleKey(e) {
  if (e.key === 'p' || e.key === 'P') {
    togglePause();
  }
  if (!isPaused) {
    if (e.key === 'ArrowUp' && direction.y !== 1) nextDirection = { x: 0, y: -1 };
    if (e.key === 'ArrowDown' && direction.y !== -1) nextDirection = { x: 0, y: 1 };
    if (e.key === 'ArrowLeft' && direction.x !== 1) nextDirection = { x: -1, y: 0 };
    if (e.key === 'ArrowRight' && direction.x !== -1) nextDirection = { x: 1, y: 0 };
  }
}

function handleTouchStart(e) {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  e.preventDefault();
}
function handleTouchEnd(e) {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
  if (!isPaused) {
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
      if (dx < 0 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
    } else {
      if (dy > 0 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
      if (dy < 0 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
    }
  }
  e.preventDefault();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-button').addEventListener('click', startGame);
  document.getElementById('reset-button').addEventListener('click', startGame);
  document.getElementById('resume-button').addEventListener('click', () => {
    togglePause();
  });
});
window.addEventListener('resize', () => location.reload());
