// main.js - Neon Snake Canvas Game with detailed comments

// --------------------
// CONSTANTS & SETTINGS
// --------------------

// Size of each square cell in pixels
const cellSize = 40;

// Game update interval in milliseconds (controls speed)
const speed = 133;

// Padding and border thickness (used when sizing the canvas)
const PADDING = 10;
const BORDER = 2;

// --------------------
// GLOBAL VARIABLES
// --------------------

// Canvas and drawing context
let canvas, ctx, cols, rows;

// Game state
let snake, prevSnake;
let direction, nextDirection;
let food;

// Scores
let score, highScore;

// Pause state
let isPaused;

// Current snake color (changes when eating fruit)
let currentSnakeColor;

// Touch coordinates for mobile swipe controls
let touchStartX, touchStartY;

// Time tracking for smooth animation
let lastTime = 0;
let accumulator = 0;

// Fruit shapes with spawn probability (weight) and point value
const shapeOptions = [
  { shape: 'circle', weight: 0.5, points: 1 },
  { shape: 'triangle', weight: 0.3, points: 5 },
  { shape: 'diamond', weight: 0.15, points: 10 },
  { shape: 'star', weight: 0.05, points: 25 }
];

// Neon colors for fruits and snake
const colorOptions = ['#f0f', '#0f0', '#f00', '#ff8800', '#bf00ff', '#00f', '#0ff'];


// --------------------
// UTILITY FUNCTIONS
// --------------------

// Chooses a fruit type based on weighted probability
function weightedShape() {
  let r = Math.random();
  let sum = 0;
  for (const opt of shapeOptions) {
    sum += opt.weight;
    if (r < sum) return opt;
  }
  // Fallback if rounding issues occur
  return shapeOptions[shapeOptions.length - 1];
}


// --------------------
// GAME INITIALIZATION
// --------------------

// Called when the user clicks "Start Game"
function startGame() {
  // Hide start button and modals
  document.getElementById('start-button').style.display = 'none';
  document.getElementById('game-over-modal').classList.remove('show');
  document.getElementById('pause-modal').classList.remove('show');

  // Show header and pause button
  const header = document.getElementById('header');
  header.style.display = 'flex';
  document.getElementById('pause-button').style.display = 'inline-block';

  // Reset game state
  prevSnake = [];
  snake = [{ x: 0, y: 0 }];       // Snake segments: array of {x,y}
  direction = { x: 1, y: 0 };     // Current movement direction
  nextDirection = { ...direction };
  score = 0;
  isPaused = false;
  currentSnakeColor = '#0ff';     // Initial snake color

  updateScore();
  if (typeof highScore === 'undefined') highScore = 0;
  updateHighScore();

  // Setup canvas size and position
  canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  const headerHeight = header.offsetHeight;

  // Calculate number of columns and rows that fit
  cols = Math.floor((window.innerWidth - 2 * PADDING - 2 * BORDER) / cellSize);
  rows = Math.floor((window.innerHeight - headerHeight - 2 * PADDING - 2 * BORDER) / cellSize);

  // Resize canvas to exact multiple of cellSize
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;

  // Position canvas below header, with padding
  canvas.style.top = (headerHeight + PADDING) + 'px';
  canvas.style.left = PADDING + 'px';

  // Get 2D drawing context
  ctx = canvas.getContext('2d');

  // Place snake head at center
  snake[0] = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };

  // Generate first fruit
  placeFood();

  // Begin animation loop
  lastTime = performance.now();
  accumulator = 0;
  requestAnimationFrame(gameLoop);

  // Event listeners for controls
  window.addEventListener('keydown', handleKey);
  canvas.addEventListener('touchstart', handleTouchStart, false);
  canvas.addEventListener('touchend', handleTouchEnd, false);
  document.getElementById('pause-button').addEventListener('click', togglePause);
}


// --------------------
// GAME LOOP
// --------------------

// Called by the browser to update and render each frame
function gameLoop(timestamp) {
  const delta = timestamp - lastTime;  // Time since last frame
  lastTime = timestamp;
  accumulator += delta;

  // Update game state at fixed intervals (speed)
  while (accumulator >= speed) {
    // Pre-check collision before moving head
    const nextHead = {
      x: (snake[0].x + nextDirection.x + cols) % cols,
      y: (snake[0].y + nextDirection.y + rows) % rows
    };
    if (snake.some(seg => seg.x === nextHead.x && seg.y === nextHead.y)) {
      // Collision: Game Over
      if (score > highScore) { highScore = score; updateHighScore(); }
      showGameOver();
      return;
    }
    // Save previous state for interpolation
    prevSnake = snake.map(s => ({ ...s }));
    update();        // Move snake and handle fruit
    accumulator -= speed;
  }

  // Fraction for smooth interpolation between updates
  const frac = accumulator / speed;
  draw(frac);         // Render frame
  requestAnimationFrame(gameLoop);
}


// --------------------
// GAME LOGIC
// --------------------

// Place a new fruit at a random empty cell
function placeFood() {
  const opt = weightedShape();   // Fruit shape and point value
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));

  // Assign color randomly
  const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
  food = { ...pos, shape: opt.shape, points: opt.points, color };
}

// Move snake in the current direction, grow if eating fruit
function update() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  head.x = (head.x + cols) % cols;
  head.y = (head.y + rows) % rows;
  snake.unshift(head);

  // Fruit collision
  if (head.x === food.x && head.y === food.y) {
    score += food.points;
    currentSnakeColor = food.color;
    updateScore();
    placeFood();
  } else {
    snake.pop();  // Remove tail if not eating
  }
}


// --------------------
// RENDERING
// --------------------

// Draw game state, using `frac` for interpolation
function draw(frac) {
  // Clear entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ---------- Draw fruit ----------
  const fx = food.x * cellSize + cellSize/2;
  const fy = food.y * cellSize + cellSize/2;
  ctx.fillStyle = food.color;
  ctx.shadowColor = food.color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  if (food.shape === 'circle') {
    ctx.arc(fx, fy, cellSize/2, 0, 2 * Math.PI);
  } else if (food.shape === 'triangle') {
    // Equilateral triangle pointing up
    ctx.moveTo(fx, fy - cellSize/2);
    ctx.lineTo(fx - cellSize/2, fy + cellSize/2);
    ctx.lineTo(fx + cellSize/2, fy + cellSize/2);
    ctx.closePath();
  } else if (food.shape === 'diamond') {
    // Diamond rotated square
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-cellSize/2, -cellSize/2, cellSize, cellSize);
    ctx.restore();
  } else {
    // Star shape: draw five spikes
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

  // ---------- Draw snake segments ----------
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const prev = prevSnake[i] || seg;
    let dx = seg.x - prev.x, dy = seg.y - prev.y;

    // Handle wrap-around interpolation
    if (dx > cols/2) dx -= cols;
    if (dx < -cols/2) dx += cols;
    if (dy > rows/2) dy -= rows;
    if (dy < -rows/2) dy += rows;

    // Interpolated position
    const x = (prev.x + dx * frac) * cellSize;
    const y = (prev.y + dy * frac) * cellSize;

    // Body segments
    if (i > 0) {
      ctx.fillStyle = currentSnakeColor;
      ctx.shadowColor = currentSnakeColor;
      ctx.shadowBlur = 15;
      ctx.fillRect(x, y, cellSize, cellSize);
    } else {
      // Head segment with slight corner rounding at the front
      const r = cellSize * 0.2;  // Radius for corners
      ctx.fillStyle = currentSnakeColor;
      ctx.shadowColor = currentSnakeColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      if (direction.x === 1) {
        // Moving right: round top-right & bottom-right corners
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize - r, y);
        ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + r);
        ctx.lineTo(x + cellSize, y + cellSize - r);
        ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
        ctx.lineTo(x, y + cellSize);
      } else if (direction.x === -1) {
        // Moving left: round top-left & bottom-left corners
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.lineTo(x + r, y + cellSize);
        ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      } else if (direction.y === 1) {
        // Moving down: round bottom-left & bottom-right corners
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize - r);
        ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
        ctx.lineTo(x + r, y + cellSize);
        ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
        ctx.lineTo(x, y);
      } else {
        // Moving up: round top-left & top-right corners
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

      // Draw eyes on head
      const centerX = x + cellSize/2;
      const centerY = y + cellSize/2;
      const eyeOffset = cellSize * 0.2;
      const eyeRadius = cellSize * 0.1;

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';  // White sclera
      if (direction.x === 0) {
        // Vertical: eyes side-by-side
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset, centerY - eyeOffset/2, eyeRadius, 0, 2*Math.PI);
        ctx.arc(centerX + eyeOffset, centerY - eyeOffset/2, eyeRadius, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000';  // Pupils
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset, centerY - eyeOffset/2, eyeRadius/2, 0, 2*Math.PI);
        ctx.arc(centerX + eyeOffset, centerY - eyeOffset/2, eyeRadius/2, 0, 2*Math.PI);
        ctx.fill();
      } else {
        // Horizontal: eyes stacked
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset/2, centerY - eyeOffset, eyeRadius, 0, 2*Math.PI);
        ctx.arc(centerX - eyeOffset/2, centerY + eyeOffset, eyeRadius, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset/2, centerY - eyeOffset, eyeRadius/2, 0, 2*Math.PI);
        ctx.arc(centerX - eyeOffset/2, centerY + eyeOffset, eyeRadius/2, 0, 2*Math.PI);
        ctx.fill();
      }
    }
  }
}

// --------------------
// SCORE & MODAL FUNCTIONS
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
  document.getElementById('pause-modal').classList.toggle('show');
}

// --------------------
// INPUT HANDLERS
// --------------------

// Keyboard arrow keys and 'P' for pause
function handleKey(e) {
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (!isPaused) {
    if (e.key === 'ArrowUp' && direction.y !== 1) nextDirection = { x: 0, y: -1 };
    if (e.key === 'ArrowDown' && direction.y !== -1) nextDirection = { x: 0, y: 1 };
    if (e.key === 'ArrowLeft' && direction.x !== 1) nextDirection = { x: -1, y: 0 };
    if (e.key === 'ArrowRight' && direction.x !== -1) nextDirection = { x: 1, y: 0 };
  }
}

// Touch-based swipe controls for mobile
function handleTouchStart(e) {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  e.preventDefault();
}

function handleTouchEnd(e) {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
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

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-button').addEventListener('click', startGame);
  document.getElementById('reset-button').addEventListener('click', startGame);
  document.getElementById('resume-button').addEventListener('click', togglePause);
});

// Handle window resize by restarting the game
window.addEventListener('resize', () => location.reload());
