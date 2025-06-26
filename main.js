// main.js

const cellSize = 20;
const speed = 133; // ms interval (~50% faster)
let canvas, ctx, cols, rows;
let snake, direction, nextDirection, food, score, highScore, isPaused, currentSnakeColor;
let touchStartX, touchStartY;
let gameLoop;

// Define fruit types with neon colors and shapes
const fruitTypes = [
    { color: '#f0f', shape: 'circle' },   // magenta circle
    { color: '#ff0', shape: 'square' },   // yellow square
    { color: '#0f0', shape: 'triangle' }, // green triangle
    { color: '#f00', shape: 'star' }      // red star
];

function startGame() {
    document.getElementById('start-button').style.display = 'none';
    document.getElementById('game-over-modal').classList.remove('show');
    document.getElementById('pause-modal').classList.remove('show');
    document.getElementById('header').style.display = 'flex';

    // Reset game state
    snake = [{ x: 0, y: 0 }];
    direction = { x: 1, y: 0 };
    nextDirection = { ...direction };
    score = 0;
    isPaused = false;
    currentSnakeColor = '#0ff'; // neon cyan

    // Setup canvas
    canvas = document.getElementById('gameCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');

    cols = Math.floor(canvas.width / cellSize);
    rows = Math.floor(canvas.height / cellSize);
    snake[0] = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };

    placeFood();
    updateScore();
    if (typeof highScore === 'undefined') highScore = 0;
    updateHighScore();

    // Add input listeners
    window.addEventListener('keydown', handleKey);
    canvas.addEventListener('touchstart', handleTouchStart, false);
    canvas.addEventListener('touchend', handleTouchEnd, false);

    clearInterval(gameLoop);
    gameLoop = setInterval(update, speed);
}

function placeFood() {
    const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    let pos;
    do {
        pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = { ...pos, color: type.color, shape: type.shape };
}

function update() {
    if (isPaused) return;
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    head.x = (head.x + cols) % cols;
    head.y = (head.y + rows) % rows;

    // Collision detection
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        clearInterval(gameLoop);
        if (score > highScore) {
            highScore = score;
            updateHighScore();
        }
        showGameOver();
        return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score++;
        currentSnakeColor = food.color;
        updateScore();
        placeFood();
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw food
    ctx.fillStyle = food.color;
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    const fx = food.x * cellSize + cellSize / 2;
    const fy = food.y * cellSize + cellSize / 2;
    if (food.shape === 'circle') {
        ctx.arc(fx, fy, cellSize / 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (food.shape === 'square') {
        ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
    } else if (food.shape === 'triangle') {
        ctx.moveTo(fx, fy - cellSize / 2);
        ctx.lineTo(fx - cellSize / 2, fy + cellSize / 2);
        ctx.lineTo(fx + cellSize / 2, fy + cellSize / 2);
        ctx.closePath();
        ctx.fill();
    } else if (food.shape === 'star') {
        const spikes = 5;
        const outerRadius = cellSize / 2;
        const innerRadius = outerRadius / 2;
        let rot = Math.PI / 2 * 3;
        let x = fx;
        let y = fy;
        const step = Math.PI / spikes;
        ctx.moveTo(fx, fy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = fx + Math.cos(rot) * outerRadius;
            y = fy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            x = fx + Math.cos(rot) * innerRadius;
            y = fy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
    }

    // Draw snake
    ctx.fillStyle = currentSnakeColor;
    ctx.shadowColor = currentSnakeColor;
    ctx.shadowBlur = 15;
    snake.forEach(seg => {
        ctx.fillRect(seg.x * cellSize, seg.y * cellSize, cellSize, cellSize);
    });
}

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

function handleKey(e) {
    const key = e.key;
    if (key === 'p' || key === 'P') {
        togglePause();
    }
    if (!isPaused) {
        if (key === 'ArrowUp' && direction.y !== 1) nextDirection = { x: 0, y: -1 };
        if (key === 'ArrowDown' && direction.y !== -1) nextDirection = { x: 0, y: 1 };
        if (key === 'ArrowLeft' && direction.x !== 1) nextDirection = { x: -1, y: 0 };
        if (key === 'ArrowRight' && direction.x !== -1) nextDirection = { x: 1, y: 0 };
    }
}

function handleTouchStart(e) {
    const touch = e.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    e.preventDefault();
}

function handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (!isPaused) {
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
            else if (dx < 0 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
        } else {
            if (dy > 0 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
            else if (dy < 0 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
        }
    }
    e.preventDefault();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('reset-button').addEventListener('click', startGame);
    document.getElementById('resume-button').addEventListener('click', togglePause);
});

window.addEventListener('resize', () => {
    location.reload();
});
