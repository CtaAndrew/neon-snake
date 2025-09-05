// main.js - Optimized Neon Snake Game with Detailed Comments
// Iteration #18: Performance Optimized & Well Documented

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

// Game grid and timing constants
const CELL_SIZE = 40;                    // Size of each grid cell in pixels
const GAME_SPEED = 133;                  // Milliseconds between game ticks
const PADDING = 10;                      // Canvas padding from screen edges
const BORDER_WIDTH = 2;                  // Canvas border thickness

// Game object limits
const MAX_FRUITS = 5;                    // Maximum fruits on screen simultaneously
const MAX_BOMBS = 3;                     // Maximum bombs on screen simultaneously

// Probability constants (extracted magic numbers)
const BOMB_SPAWN_CHANCE = 0.2;          // 20% chance to spawn bomb when fruit eaten
const BOMB_REMOVE_CHANCE = 0.2;         // 20% chance to remove random bomb when fruit eaten

// Visual constants
const SHADOW_BLUR = 15;                  // Glow effect blur radius
const HEAD_CORNER_RADIUS = 0.2;         // Snake head corner rounding (as fraction of cell size)
const EYE_OFFSET = 0.2;                  // Eye position offset (as fraction of cell size)
const EYE_RADIUS = 0.1;                  // Eye size (as fraction of cell size)
const BOMB_RADIUS = 0.4;                 // Bomb size (as fraction of cell size)

// Game states enum for better state management
const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing', 
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
};

// =============================================================================
// DOM ELEMENT CACHE
// =============================================================================

// Cache frequently accessed DOM elements to avoid repeated queries
const DOM = {
  startButton: null,
  header: null,
  scoreboard: null,
  highscore: null,
  pauseButton: null,
  endGameButton: null,
  gameCanvas: null,
  gameOverModal: null,
  pauseModal: null,
  finalScore: null,
  resetButton: null,
  resumeButton: null
};

// Initialize DOM cache when page loads
function cacheDOMElements() {
  DOM.startButton = document.getElementById('start-button');
  DOM.header = document.getElementById('header');
  DOM.scoreboard = document.getElementById('scoreboard');
  DOM.highscore = document.getElementById('highscore');
  DOM.pauseButton = document.getElementById('pause-button');
  DOM.endGameButton = document.getElementById('end-game-button');
  DOM.gameCanvas = document.getElementById('gameCanvas');
  DOM.gameOverModal = document.getElementById('game-over-modal');
  DOM.pauseModal = document.getElementById('pause-modal');
  DOM.finalScore = document.getElementById('final-score');
  DOM.resetButton = document.getElementById('reset-button');
  DOM.resumeButton = document.getElementById('resume-button');
}

// =============================================================================
// GLOBAL GAME STATE
// =============================================================================

// Canvas and rendering context
let canvas, ctx, cols, rows;

// Snake game objects and state
let snake, prevSnake;                    // Current and previous snake positions for interpolation
let direction, nextDirection;            // Current and queued movement directions
let fruits = [], bombs = [];             // Game objects arrays

// Game state variables
let score, highScore;                    // Score tracking
let currentGameState = GAME_STATES.MENU; // Current game state
let currentSnakeColor;                   // Dynamic snake color based on last fruit eaten

// Touch input tracking
let touchStartX, touchStartY;

// Timing variables for smooth animation
let lastTime = 0, accumulator = 0;

// =============================================================================
// REUSABLE OBJECTS (Performance Optimization)
// =============================================================================

// Reusable position objects to reduce garbage collection
const tempPos = { x: 0, y: 0 };
const tempDirection = { x: 0, y: 0 };

// =============================================================================
// FRUIT CONFIGURATION & GENERATION
// =============================================================================

// Fruit types with weighted spawning and point values
const FRUIT_TYPES = [
  { shape: 'circle', weight: 0.5, points: 5 },    // Common, low value
  { shape: 'triangle', weight: 0.3, points: 10 },  // Uncommon, medium value
  { shape: 'diamond', weight: 0.15, points: 25 }, // Rare, high value
  { shape: 'star', weight: 0.05, points: 50 }     // Very rare, highest value
];

// Available colors for fruits and snake
const FRUIT_COLORS = ['#f0f', '#0f0', '#f00', '#ff8800', '#bf00ff', '#00f', '#0ff'];

/**
 * Selects a fruit type based on weighted probability
 * @returns {Object} Selected fruit type with shape, weight, and points
 */
function selectWeightedFruitType() {
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (const fruitType of FRUIT_TYPES) {
    cumulativeWeight += fruitType.weight;
    if (random < cumulativeWeight) {
      return fruitType;
    }
  }
  
  // Fallback to last fruit type (should never reach here)
  return FRUIT_TYPES[FRUIT_TYPES.length - 1];
}

/**
 * Generates a random position that doesn't collide with existing game objects
 * @returns {Object} Position object with x, y coordinates, or null if no space available
 */
function generateSafePosition() {
  const maxAttempts = 100; // Prevent infinite loop
  let attempts = 0;
  
  do {
    tempPos.x = Math.floor(Math.random() * cols);
    tempPos.y = Math.floor(Math.random() * rows);
    attempts++;
    
    // Check if position is occupied by any game object
    const isOccupied = 
      snake.some(segment => segment.x === tempPos.x && segment.y === tempPos.y) ||
      fruits.some(fruit => fruit.x === tempPos.x && fruit.y === tempPos.y) ||
      bombs.some(bomb => bomb.x === tempPos.x && bomb.y === tempPos.y);
      
    if (!isOccupied) {
      return { x: tempPos.x, y: tempPos.y }; // Return new object to avoid reference issues
    }
  } while (attempts < maxAttempts);
  
  return null; // No safe position found
}

/**
 * Spawns a new fruit at a random safe location
 */
function spawnFruit() {
  // Don't spawn if at maximum capacity
  if (fruits.length >= MAX_FRUITS) return;
  
  const position = generateSafePosition();
  if (!position) return; // No safe space available
  
  const fruitType = selectWeightedFruitType();
  const color = FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)];
  
  fruits.push({
    x: position.x,
    y: position.y,
    shape: fruitType.shape,
    points: fruitType.points,
    color: color
  });
}

/**
 * Spawns a new bomb at a random safe location
 */
function spawnBomb() {
  // Don't spawn if at maximum capacity
  if (bombs.length >= MAX_BOMBS) return;
  
  const position = generateSafePosition();
  if (!position) return; // No safe space available
  
  bombs.push({
    x: position.x,
    y: position.y
  });
}

// =============================================================================
// LOCAL STORAGE FUNCTIONS
// =============================================================================

/**
 * Loads the high score from localStorage
 * @returns {number} The saved high score or 0 if none exists
 */
function loadHighScore() {
  try {
    const savedScore = localStorage.getItem('neonSnakeHighScore');
    return savedScore ? parseInt(savedScore, 10) : 0;
  } catch (error) {
    // localStorage might be disabled or unavailable
    console.warn('Unable to load high score from localStorage:', error);
    return 0;
  }
}

/**
 * Saves the high score to localStorage
 * @param {number} score - The high score to save
 */
function saveHighScore(score) {
  try {
    localStorage.setItem('neonSnakeHighScore', score.toString());
  } catch (error) {
    // localStorage might be disabled, full, or unavailable
    console.warn('Unable to save high score to localStorage:', error);
  }
}

// =============================================================================
// GAME INITIALIZATION & STATE MANAGEMENT
// =============================================================================

/**
 * Initializes and starts a new game
 */
function startGame() {
  // Update game state
  currentGameState = GAME_STATES.PLAYING;
  
  // Update UI visibility
  DOM.startButton.style.display = 'none';
  DOM.gameOverModal.classList.remove('show');
  DOM.pauseModal.classList.remove('show');
  DOM.header.style.display = 'flex';
  DOM.pauseButton.style.display = 'inline-block';
  DOM.endGameButton.style.display = 'inline-block';
  
  // Reset game state variables
  initializeGameState();
  
  // Setup canvas and calculate grid dimensions
  setupCanvas();
  
  // Position snake at center of grid
  snake[0] = { 
    x: Math.floor(cols / 2), 
    y: Math.floor(rows / 2) 
  };
  
  // Spawn initial fruits
  for (let i = 0; i < MAX_FRUITS; i++) {
    spawnFruit();
  }
  
  // Reset timing for smooth animation
  resetGameTiming();
  
  // Start game loop
  requestAnimationFrame(gameLoop);
  
  // Attach event listeners
  attachEventListeners();
}

/**
 * Initializes all game state variables to default values
 */
function initializeGameState() {
  prevSnake = [];
  snake = [{ x: 0, y: 0 }]; // Will be repositioned in startGame()
  direction = { x: 1, y: 0 }; // Start moving right
  nextDirection = { ...direction };
  fruits = [];
  bombs = [];
  score = 0;
  currentSnakeColor = '#0ff'; // Default cyan color
  
  // Load high score from localStorage
  highScore = loadHighScore();
  
  updateScoreDisplay();
  updateHighScoreDisplay();
}

/**
 * Sets up canvas dimensions and rendering context
 */
function setupCanvas() {
  canvas = DOM.gameCanvas;
  canvas.style.display = 'block';
  
  // Calculate grid dimensions based on available screen space
  const headerHeight = DOM.header.offsetHeight;
  cols = Math.floor((window.innerWidth - 2 * PADDING - 2 * BORDER_WIDTH) / CELL_SIZE);
  rows = Math.floor((window.innerHeight - headerHeight - 2 * PADDING - 2 * BORDER_WIDTH) / CELL_SIZE);
  
  // Set canvas size
  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;
  
  // Position canvas
  canvas.style.top = (headerHeight + PADDING) + 'px';
  canvas.style.left = PADDING + 'px';
  
  // Get 2D rendering context
  ctx = canvas.getContext('2d');
}

/**
 * Resets timing variables for smooth animation
 */
function resetGameTiming() {
  lastTime = performance.now();
  accumulator = 0;
}

/**
 * Attaches event listeners for game controls
 */
function attachEventListeners() {
  // Remove existing listeners to prevent duplicates
  window.removeEventListener('keydown', handleKeyPress);
  canvas.removeEventListener('touchstart', handleTouchStart);
  canvas.removeEventListener('touchend', handleTouchEnd);
  DOM.pauseButton.removeEventListener('click', togglePause);
  DOM.endGameButton.removeEventListener('click', manualEndGame);
  
  // Attach new listeners
  window.addEventListener('keydown', handleKeyPress);
  canvas.addEventListener('touchstart', handleTouchStart, false);
  canvas.addEventListener('touchend', handleTouchEnd, false);
  DOM.pauseButton.addEventListener('click', togglePause);
  DOM.endGameButton.addEventListener('click', manualEndGame);
}

// =============================================================================
// MAIN GAME LOOP
// =============================================================================

/**
 * Main game loop with fixed timestep and visual interpolation
 * @param {number} timestamp - Current timestamp from requestAnimationFrame
 */
function gameLoop(timestamp) {
  // Continue loop for paused state to maintain smooth transitions
  if (currentGameState === GAME_STATES.PAUSED) {
    requestAnimationFrame(gameLoop);
    return;
  }
  
  // Stop the game loop when game is over
  if (currentGameState === GAME_STATES.GAME_OVER) {
    return; // Exit game loop completely
  }
  
  // Calculate time delta
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += deltaTime;
  
  // Fixed timestep updates - ensures consistent game speed across different frame rates
  while (accumulator >= GAME_SPEED) {
    // Calculate next head position using reusable object
    const nextHead = calculateNextPosition(snake[0], nextDirection);
    
    // Check for collisions that end the game
    if (checkGameEndingCollisions(nextHead)) {
      endGame();
      return;
    }
    
    // Store previous snake state for smooth interpolation
    prevSnake = snake.map(segment => ({ ...segment }));
    
    // Update game state
    updateGameState();
    
    // Subtract fixed timestep from accumulator
    accumulator -= GAME_SPEED;
  }
  
  // Render frame with interpolation for smooth visuals
  const interpolationFactor = accumulator / GAME_SPEED;
  render(interpolationFactor);
  
  // Continue game loop
  requestAnimationFrame(gameLoop);
}

/**
 * Calculates the next position for a given position and direction
 * @param {Object} currentPos - Current position {x, y}
 * @param {Object} dir - Direction vector {x, y}
 * @returns {Object} Next position with wrapping
 */
function calculateNextPosition(currentPos, dir) {
  tempPos.x = (currentPos.x + dir.x + cols) % cols;
  tempPos.y = (currentPos.y + dir.y + rows) % rows;
  return tempPos;
}

/**
 * Checks for collisions that would end the game
 * @param {Object} nextHeadPos - Next position of snake head
 * @returns {boolean} True if collision detected
 */
function checkGameEndingCollisions(nextHeadPos) {
  // Check bomb collision
  const bombCollision = bombs.some(bomb => 
    bomb.x === nextHeadPos.x && bomb.y === nextHeadPos.y
  );
  
  // Check self-collision (snake hitting itself)
  const selfCollision = snake.some(segment => 
    segment.x === nextHeadPos.x && segment.y === nextHeadPos.y
  );
  
  return bombCollision || selfCollision;
}

/**
 * Ends the current game and shows game over screen
 */
function endGame() {
  currentGameState = GAME_STATES.GAME_OVER;
  
  // Update high score if current score is higher
  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
    updateHighScoreDisplay();
  }
  
  showGameOverModal();
}

/**
 * Manually ends the game when End Game button is clicked
 */
function manualEndGame() {
  if (currentGameState === GAME_STATES.PLAYING || currentGameState === GAME_STATES.PAUSED) {
    // Close pause modal if open
    DOM.pauseModal.classList.remove('show');
    endGame();
  }
}

// =============================================================================
// GAME STATE UPDATE
// =============================================================================

/**
 * Updates game state for one game tick
 */
function updateGameState() {
  // Update snake direction
  direction = { ...nextDirection };
  
  // Calculate new head position
  const newHead = {
    x: (snake[0].x + direction.x + cols) % cols,
    y: (snake[0].y + direction.y + rows) % rows
  };
  
  // Add new head to snake
  snake.unshift(newHead);
  
  // Check for fruit collision
  const eatenFruitIndex = fruits.findIndex(fruit => 
    fruit.x === newHead.x && fruit.y === newHead.y
  );
  
  if (eatenFruitIndex !== -1) {
    handleFruitEaten(eatenFruitIndex);
  } else {
    // No fruit eaten, remove tail to maintain snake length
    snake.pop();
  }
}

/**
 * Handles logic when a fruit is eaten
 * @param {number} fruitIndex - Index of eaten fruit in fruits array
 */
function handleFruitEaten(fruitIndex) {
  const eatenFruit = fruits.splice(fruitIndex, 1)[0];
  
  // Update score and snake color
  score += eatenFruit.points;
  currentSnakeColor = eatenFruit.color;
  updateScoreDisplay();
  
  // Snake grows by NOT removing the tail (which happens automatically since we don't call snake.pop())
  // The new head was already added in updateGameState(), so the snake is now one segment longer
  
  // Spawn new fruit to replace eaten one
  spawnFruit();
  
  // Randomly spawn or remove bombs based on configured probabilities
  if (Math.random() < BOMB_SPAWN_CHANCE) {
    spawnBomb();
  }
  
  if (Math.random() < BOMB_REMOVE_CHANCE && bombs.length > 0) {
    const randomBombIndex = Math.floor(Math.random() * bombs.length);
    bombs.splice(randomBombIndex, 1);
  }
}

// =============================================================================
// RENDERING SYSTEM
// =============================================================================

/**
 * Main rendering function with interpolation for smooth animation
 * @param {number} interpolationFactor - Factor for smooth interpolation (0-1)
 */
function render(interpolationFactor) {
  // Clear entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render game objects
  renderFruits();
  renderBombs();
  renderSnake(interpolationFactor);
}

/**
 * Renders all fruits on the canvas
 */
function renderFruits() {
  // Set up glow effect for fruits
  ctx.shadowBlur = SHADOW_BLUR;
  
  fruits.forEach(fruit => {
    const centerX = fruit.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = fruit.y * CELL_SIZE + CELL_SIZE / 2;
    
    // Set fruit color and glow
    ctx.fillStyle = fruit.color;
    ctx.shadowColor = fruit.color;
    
    // Draw fruit based on shape type
    renderFruitShape(fruit.shape, centerX, centerY);
  });
  
  // Reset shadow for subsequent renders
  ctx.shadowBlur = 0;
}

/**
 * Renders a specific fruit shape at given coordinates
 * @param {string} shape - Shape type ('circle', 'triangle', 'diamond', 'star')
 * @param {number} centerX - X coordinate of shape center
 * @param {number} centerY - Y coordinate of shape center
 */
function renderFruitShape(shape, centerX, centerY) {
  ctx.beginPath();
  
  switch (shape) {
    case 'circle':
      ctx.arc(centerX, centerY, CELL_SIZE / 2, 0, 2 * Math.PI);
      break;
      
    case 'triangle':
      ctx.moveTo(centerX, centerY - CELL_SIZE / 2);
      ctx.lineTo(centerX - CELL_SIZE / 2, centerY + CELL_SIZE / 2);
      ctx.lineTo(centerX + CELL_SIZE / 2, centerY + CELL_SIZE / 2);
      ctx.closePath();
      break;
      
    case 'diamond':
      // Draw rotated square for diamond effect
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
      ctx.restore();
      return; // Early return since we used fillRect
      
    case 'star':
      renderStarShape(centerX, centerY);
      break;
  }
  
  ctx.fill();
}

/**
 * Renders a star shape at given coordinates
 * @param {number} centerX - X coordinate of star center
 * @param {number} centerY - Y coordinate of star center
 */
function renderStarShape(centerX, centerY) {
  const spikes = 5;
  const outerRadius = CELL_SIZE / 2;
  const innerRadius = outerRadius / 2;
  let rotation = Math.PI / 2 * 3; // Start from top
  
  ctx.moveTo(centerX, centerY - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    // Draw to outer point
    ctx.lineTo(
      centerX + Math.cos(rotation) * outerRadius,
      centerY + Math.sin(rotation) * outerRadius
    );
    rotation += Math.PI / spikes;
    
    // Draw to inner point
    ctx.lineTo(
      centerX + Math.cos(rotation) * innerRadius,
      centerY + Math.sin(rotation) * innerRadius
    );
    rotation += Math.PI / spikes;
  }
  
  ctx.closePath();
}

/**
 * Renders all bombs on the canvas
 */
function renderBombs() {
  bombs.forEach(bomb => {
    const centerX = bomb.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = bomb.y * CELL_SIZE + CELL_SIZE / 2;
    const radius = CELL_SIZE * BOMB_RADIUS;
    
    // Draw white circle for bomb body
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0; // No glow for bombs
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw black X for bomb marker
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY - radius);
    ctx.lineTo(centerX + radius, centerY + radius);
    ctx.moveTo(centerX + radius, centerY - radius);
    ctx.lineTo(centerX - radius, centerY + radius);
    ctx.stroke();
  });
}

/**
 * Renders the snake with smooth interpolated movement
 * @param {number} interpolationFactor - Factor for smooth interpolation (0-1)
 */
function renderSnake(interpolationFactor) {
  // Set snake color and glow effect
  ctx.fillStyle = currentSnakeColor;
  ctx.shadowColor = currentSnakeColor;
  ctx.shadowBlur = SHADOW_BLUR;
  
  snake.forEach((segment, index) => {
    // Calculate interpolated position for smooth movement
    const interpolatedPos = calculateInterpolatedPosition(segment, index, interpolationFactor);
    
    if (index === 0) {
      // Render snake head with special shape and eyes
      renderSnakeHead(interpolatedPos.x, interpolatedPos.y);
    } else {
      // Render snake body segment as simple rectangle
      ctx.fillRect(interpolatedPos.x, interpolatedPos.y, CELL_SIZE, CELL_SIZE);
    }
  });
}

/**
 * Calculates interpolated position for smooth snake movement
 * @param {Object} currentSegment - Current segment position
 * @param {number} segmentIndex - Index of segment in snake array
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {Object} Interpolated position {x, y}
 */
function calculateInterpolatedPosition(currentSegment, segmentIndex, factor) {
  // Use previous position if available, otherwise current position
  const previousSegment = prevSnake[segmentIndex] || currentSegment;
  
  // Calculate movement delta with screen wrapping consideration
  let deltaX = currentSegment.x - previousSegment.x;
  let deltaY = currentSegment.y - previousSegment.y;
  
  // Handle screen wrapping for smooth interpolation
  if (deltaX > cols / 2) deltaX -= cols;
  if (deltaX < -cols / 2) deltaX += cols;
  if (deltaY > rows / 2) deltaY -= rows;
  if (deltaY < -rows / 2) deltaY += rows;
  
  // Calculate interpolated position in pixels
  const interpolatedX = (previousSegment.x + deltaX * factor) * CELL_SIZE;
  const interpolatedY = (previousSegment.y + deltaY * factor) * CELL_SIZE;
  
  return { x: interpolatedX, y: interpolatedY };
}

/**
 * Renders the snake head with rounded corners and eyes
 * @param {number} x - X position in pixels
 * @param {number} y - Y position in pixels
 */
function renderSnakeHead(x, y) {
  const cornerRadius = CELL_SIZE * HEAD_CORNER_RADIUS;
  
  // Draw rounded rectangle for snake head based on movement direction
  ctx.beginPath();
  
  if (direction.x === 1) { // Moving right
    ctx.moveTo(x, y);
    ctx.lineTo(x + CELL_SIZE - cornerRadius, y);
    ctx.quadraticCurveTo(x + CELL_SIZE, y, x + CELL_SIZE, y + cornerRadius);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - cornerRadius);
    ctx.quadraticCurveTo(x + CELL_SIZE, y + CELL_SIZE, x + CELL_SIZE - cornerRadius, y + CELL_SIZE);
    ctx.lineTo(x, y + CELL_SIZE);
  } else if (direction.x === -1) { // Moving left
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + CELL_SIZE, y);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
    ctx.lineTo(x + cornerRadius, y + CELL_SIZE);
    ctx.quadraticCurveTo(x, y + CELL_SIZE, x, y + CELL_SIZE - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
  } else if (direction.y === 1) { // Moving down
    ctx.moveTo(x, y);
    ctx.lineTo(x + CELL_SIZE, y);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - cornerRadius);
    ctx.quadraticCurveTo(x + CELL_SIZE, y + CELL_SIZE, x + CELL_SIZE - cornerRadius, y + CELL_SIZE);
    ctx.lineTo(x + cornerRadius, y + CELL_SIZE);
    ctx.quadraticCurveTo(x, y + CELL_SIZE, x, y + CELL_SIZE - cornerRadius);
    ctx.lineTo(x, y);
  } else { // Moving up
    ctx.moveTo(x, y + cornerRadius);
    ctx.lineTo(x, y + CELL_SIZE);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
    ctx.lineTo(x + CELL_SIZE, y + cornerRadius);
    ctx.quadraticCurveTo(x + CELL_SIZE, y, x + CELL_SIZE - cornerRadius, y);
    ctx.lineTo(x + cornerRadius, y);
    ctx.quadraticCurveTo(x, y, x, y + cornerRadius);
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Render eyes on snake head
  renderSnakeEyes(x, y);
}

/**
 * Renders eyes on the snake head
 * @param {number} headX - Head X position in pixels
 * @param {number} headY - Head Y position in pixels
 */
function renderSnakeEyes(headX, headY) {
  const centerX = headX + CELL_SIZE / 2;
  const centerY = headY + CELL_SIZE / 2;
  const eyeOffset = CELL_SIZE * EYE_OFFSET;
  const eyeRadius = CELL_SIZE * EYE_RADIUS;
  
  // Remove glow effect for eyes
  ctx.shadowBlur = 0;
  
  // Draw white eye backgrounds
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  
  if (direction.x === 0) { // Vertical movement - side-by-side eyes
    ctx.arc(centerX - eyeOffset, centerY - eyeOffset / 2, eyeRadius, 0, 2 * Math.PI);
    ctx.arc(centerX + eyeOffset, centerY - eyeOffset / 2, eyeRadius, 0, 2 * Math.PI);
  } else { // Horizontal movement - stacked eyes
    ctx.arc(centerX - eyeOffset / 2, centerY - eyeOffset, eyeRadius, 0, 2 * Math.PI);
    ctx.arc(centerX - eyeOffset / 2, centerY + eyeOffset, eyeRadius, 0, 2 * Math.PI);
  }
  
  ctx.fill();
  
  // Draw black pupils
  ctx.fillStyle = '#000';
  ctx.beginPath();
  
  if (direction.x === 0) { // Vertical movement
    ctx.arc(centerX - eyeOffset, centerY - eyeOffset / 2, eyeRadius / 2, 0, 2 * Math.PI);
    ctx.arc(centerX + eyeOffset, centerY - eyeOffset / 2, eyeRadius / 2, 0, 2 * Math.PI);
  } else { // Horizontal movement
    ctx.arc(centerX - eyeOffset / 2, centerY - eyeOffset, eyeRadius / 2, 0, 2 * Math.PI);
    ctx.arc(centerX - eyeOffset / 2, centerY + eyeOffset, eyeRadius / 2, 0, 2 * Math.PI);
  }
  
  ctx.fill();
  
  // Restore snake color and glow effect for body segments
  ctx.fillStyle = currentSnakeColor;
  ctx.shadowColor = currentSnakeColor;
  ctx.shadowBlur = SHADOW_BLUR;
}

// =============================================================================
// UI UPDATE FUNCTIONS
// =============================================================================

/**
 * Updates the score display in the UI
 */
function updateScoreDisplay() {
  DOM.scoreboard.textContent = 'Score: ' + score;
}

/**
 * Updates the high score display in the UI
 */
function updateHighScoreDisplay() {
  DOM.highscore.textContent = 'High Score: ' + highScore;
}

/**
 * Shows the game over modal with final score
 */
function showGameOverModal() {
  DOM.finalScore.textContent = score;
  DOM.gameOverModal.classList.add('show');
}

/**
 * Toggles game pause state
 */
function togglePause() {
  if (currentGameState === GAME_STATES.PLAYING) {
    currentGameState = GAME_STATES.PAUSED;
    DOM.pauseModal.classList.add('show');
  } else if (currentGameState === GAME_STATES.PAUSED) {
    currentGameState = GAME_STATES.PLAYING;
    DOM.pauseModal.classList.remove('show');
    
    // Reset timing to prevent animation jumps after unpause
    resetGameTiming();
    requestAnimationFrame(gameLoop);
  }
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handles keyboard input for game controls
 * @param {KeyboardEvent} event - Keyboard event object
 */
function handleKeyPress(event) {
  // Handle pause toggle (works in any game state)
  if (event.key === 'p' || event.key === 'P') {
    if (currentGameState === GAME_STATES.PLAYING || currentGameState === GAME_STATES.PAUSED) {
      togglePause();
    }
    return;
  }
  
  // Only process movement keys during active gameplay
  if (currentGameState !== GAME_STATES.PLAYING) return;
  
  // Handle movement input with reverse direction blocking to prevent instant death
  switch (event.key) {
    case 'ArrowUp':
      if (direction.y !== 1) { // Can't move up if currently moving down
        nextDirection.x = 0;
        nextDirection.y = -1;
      }
      break;
      
    case 'ArrowDown':
      if (direction.y !== -1) { // Can't move down if currently moving up
        nextDirection.x = 0;
        nextDirection.y = 1;
      }
      break;
      
    case 'ArrowLeft':
      if (direction.x !== 1) { // Can't move left if currently moving right
        nextDirection.x = -1;
        nextDirection.y = 0;
      }
      break;
      
    case 'ArrowRight':
      if (direction.x !== -1) { // Can't move right if currently moving left
        nextDirection.x = 1;
        nextDirection.y = 0;
      }
      break;
  }
}

/**
 * Handles touch start events for mobile controls
 * @param {TouchEvent} event - Touch event object
 */
function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  event.preventDefault(); // Prevent scrolling
}

/**
 * Handles touch end events for mobile swipe controls
 * @param {TouchEvent} event - Touch event object
 */
function handleTouchEnd(event) {
  // Only process touch input during active gameplay
  if (currentGameState !== GAME_STATES.PLAYING) return;
  
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  
  // Determine swipe direction based on largest delta
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    if (deltaX > 0 && direction.x !== -1) { // Swipe right
      nextDirection.x = 1;
      nextDirection.y = 0;
    } else if (deltaX < 0 && direction.x !== 1) { // Swipe left
      nextDirection.x = -1;
      nextDirection.y = 0;
    }
  } else {
    // Vertical swipe
    if (deltaY > 0 && direction.y !== -1) { // Swipe down
      nextDirection.x = 0;
      nextDirection.y = 1;
    } else if (deltaY < 0 && direction.y !== 1) { // Swipe up
      nextDirection.x = 0;
      nextDirection.y = -1;
    }
  }
  
  event.preventDefault(); // Prevent default touch behavior
}

// =============================================================================
// EVENT LISTENERS & INITIALIZATION
// =============================================================================

/**
 * Initializes the game when DOM content is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  // Cache DOM elements for performance
  cacheDOMElements();
  
  // Load and display saved high score
  highScore = loadHighScore();
  updateHighScoreDisplay();
  
  // Attach UI event listeners
  DOM.startButton.addEventListener('click', startGame);
  DOM.resetButton.addEventListener('click', startGame);
  DOM.resumeButton.addEventListener('click', togglePause);
});

/**
 * Handles window resize by reloading the page to recalculate canvas dimensions
 * This ensures proper game grid sizing on mobile device rotation or window resize
 */
window.addEventListener('resize', function() {
  location.reload();
});