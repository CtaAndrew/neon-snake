# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based neon snake game built with vanilla HTML5, CSS, and JavaScript. The game features:

- Canvas-based rendering with neon visual effects
- Snake gameplay with wrapping edges
- Multiple fruit types (circle, triangle, diamond, star) with different point values
- Bomb obstacles that end the game
- Pause functionality and touch controls
- Score tracking with high score persistence

## Architecture

### Core Components

- **index.html**: Main HTML structure with game UI elements (start button, scoreboard, modals, canvas)
- **main.js**: Complete game logic containing:
  - Game state management (snake position, fruits, bombs, score)
  - Canvas rendering with interpolated movement for smooth animation
  - Event handling for keyboard and touch input
  - Game loop using `requestAnimationFrame` with fixed timestep
- **styles.css**: Neon-themed styling with glow effects and modal overlays

### Key Game Systems

- **Movement System**: Fixed timestep game loop (133ms) with visual interpolation for smooth rendering
- **Collision Detection**: Grid-based collision for snake segments, fruits, and bombs
- **Spawning System**: Weighted random fruit generation and conditional bomb spawning
- **Rendering**: Canvas 2D with glow effects, shape drawing (circles, triangles, diamonds, stars)

## Development

### Running the Game

Open `index.html` in a web browser. No build process or server required.

### Game Configuration

Key constants in main.js:
- `cellSize`: Grid cell size (40px)
- `speed`: Game tick interval (133ms)
- `MAX_FRUITS`: Maximum fruits on screen (5)
- `MAX_BOMBS`: Maximum bombs on screen (3)

### Controls

- Arrow keys: Movement
- P key: Pause/resume
- Touch gestures: Swipe to change direction
- Click buttons: UI interaction