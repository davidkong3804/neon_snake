// Cyberpunk Snake Game Core Logic

// Game Grid Settings
const GRID_SIZE = 24;
let CELL_SIZE = 20; // Will be computed on load/resize to match canvas size

// Game States
let snake = [];
let direction = 'RIGHT';
let nextDirection = 'RIGHT';
let foods = []; // Array of food objects: { x, y, type, expiresAt }
let score = 0;
let highScore = 0;
let gameOver = false;
let gamePaused = false;
let gameInterval = null;
let gameStartTime = null;
let survivalTimer = 0; // seconds
let autopilot = false;

// Game Settings
let currentLevel = 'normal'; // easy, normal, hard, insane
let currentMode = 'classic'; // classic (walls kill), wrap (wrap around walls)
let activeSkin = 'Neon Green';
let soundEnabled = true;

// Web Audio API Context
let audioCtx = null;

// Particle System
let particles = [];

// Screen Shake variables
let isShaking = false;
const canvasWrapper = document.getElementById('canvas-wrapper');

// Canvas context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game speed configs (base interval in ms)
const SPEED_CONFIGS = {
  easy: 140,
  normal: 100,
  hard: 70,
  insane: 45
};

// Skin Colors mapping
const SKIN_PALETTES = {
  'Neon Green': {
    primary: '#39ff14',
    secondary: '#1f990a',
    glow: '#39ff14',
    draw: (ctx, x, y, isHead, index, length) => {
      ctx.fillStyle = isHead ? '#39ff14' : '#1f990a';
      if (isHead) {
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 4);
    }
  },
  'Cyberpunk Gradient': {
    primary: '#ff007f',
    secondary: '#7f00ff',
    glow: '#ff007f',
    draw: (ctx, x, y, isHead, index, length) => {
      const ratio = index / length;
      ctx.fillStyle = isHead ? '#ff007f' : getGradientColor(ratio);
      if (isHead) {
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 4);
    }
  },
  'Electric Blue': {
    primary: '#00e5ff',
    secondary: '#00838f',
    glow: '#00e5ff',
    draw: (ctx, x, y, isHead, index, length) => {
      ctx.fillStyle = isHead ? '#00e5ff' : '#00838f';
      if (isHead) {
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 4);
    }
  },
  'Rainbow': {
    primary: '#ff0000',
    secondary: '#ff00ff',
    glow: '#00e5ff',
    draw: (ctx, x, y, isHead, index, length) => {
      const hue = (index * 360 / Math.max(10, length) + (Date.now() / 15)) % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      if (isHead) {
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 4);
    }
  },
  'Gold Rush': {
    primary: '#ffd700',
    secondary: '#ffa000',
    glow: '#ffd700',
    draw: (ctx, x, y, isHead, index, length) => {
      ctx.fillStyle = isHead ? '#ffd700' : '#ffa000';
      if (isHead) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
      } else {
        ctx.shadowBlur = 0;
      }
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 4);
    }
  }
};

// Helper: Linear interpolation for color gradient
function getGradientColor(ratio) {
  // Hex values for pink (#ff007f -> r:255, g:0, b:127) and purple (#7f00ff -> r:127, g:0, b:255)
  const r = Math.round(255 - ratio * (255 - 127));
  const g = 0;
  const b = Math.round(127 + ratio * (255 - 127));
  return `rgb(${r}, ${g}, ${b})`;
}

// Helper: Draw rounded rectangles on canvas
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

// Lazy Initialize Web Audio API
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Synthesize Audio Tone
function playSound(type) {
  if (!soundEnabled) return;
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  if (type === 'eat') {
    // Retro game jump/eat sound
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === 'gold') {
    // Golden scale arpeggio
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.12, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.12);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.12);
    });
  } else if (type === 'slow') {
    // Chilled sound effect
    const notes = [659, 523, 392];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.18);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.18);
    });
  } else if (type === 'crash') {
    // Cyber explosion sweep
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(20, now + 0.6);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.6);
  } else if (type === 'pause') {
    // High-to-low chime
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(320, now + 0.06);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// Screen Shake Trigger
function triggerScreenShake() {
  if (isShaking) return;
  isShaking = true;
  canvasWrapper.classList.add('shake-animation');
  setTimeout(() => {
    canvasWrapper.classList.remove('shake-animation');
    isShaking = false;
  }, 400);
}

// Particle Explosion Generator
function spawnParticles(x, y, color) {
  const count = 15;
  // Convert grid coordinates to pixel center of grid block
  const px = x * CELL_SIZE + CELL_SIZE / 2;
  const py = y * CELL_SIZE + CELL_SIZE / 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color: color,
      alpha: 1.0,
      decay: 0.02 + Math.random() * 0.03
    });
  }
}

// Update particle physics
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// Draw particles
function drawParticles() {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Resize Canvas dynamically depending on parent container width
function resizeCanvas() {
  const size = Math.min(500, canvasWrapper.clientWidth);
  canvas.width = size;
  canvas.height = size;
  CELL_SIZE = size / GRID_SIZE;
  drawGame();
}

// Game Core Logic
function initGame() {
  // Reset autopilot
  autopilot = false;
  const aiBtn = document.getElementById('btn-ai');
  if (aiBtn) {
    aiBtn.innerText = '🤖 啟動 AI 自動導航';
    aiBtn.classList.remove('active');
  }

  // Reset Snake to middle facing right
  snake = [
    { x: 12, y: 12 },
    { x: 11, y: 12 },
    { x: 10, y: 12 }
  ];
  direction = 'RIGHT';
  nextDirection = 'RIGHT';
  
  score = 0;
  gameOver = false;
  gamePaused = false;
  foods = [];
  particles = [];
  survivalTimer = 0;
  gameStartTime = Date.now();
  
  updateScoreUI();
  
  // Spawn initial food
  spawnFood('normal');
  
  // Hide modal
  document.getElementById('gameover-modal').classList.remove('active');
  document.getElementById('pause-overlay').classList.remove('active');
  document.getElementById('start-overlay').style.display = 'none';

  // Toggle control buttons state
  document.getElementById('btn-start').innerText = '重開遊戲';
  document.getElementById('btn-pause').disabled = false;
  document.getElementById('btn-pause').innerText = '暫停';

  // Set game speed tick
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameStep, getTickInterval());
}

// Calculate Tick Interval depending on Level difficulty
function getTickInterval() {
  let interval = SPEED_CONFIGS[currentLevel] || 100;
  
  // Check if any special food item affects speed
  const now = Date.now();
  const speedBoostActive = foods.some(f => f.type === 'gold' && f.eaten && f.effectExpiresAt > now);
  const slowActive = foods.some(f => f.type === 'slow' && f.eaten && f.effectExpiresAt > now);

  if (speedBoostActive) {
    interval = interval * 0.65; // 35% faster
  } else if (slowActive) {
    interval = interval * 1.5; // 50% slower
  }

  return interval;
}

// Spawn food of certain type
function spawnFood(type = 'normal') {
  let x, y;
  let attempts = 0;
  const maxAttempts = 100;
  
  // Try to find an empty spot on the board
  do {
    x = Math.floor(Math.random() * GRID_SIZE);
    y = Math.floor(Math.random() * GRID_SIZE);
    attempts++;
  } while (
    (snake.some(segment => segment.x === x && segment.y === y) || 
     foods.some(food => food.x === x && food.y === y)) && 
    attempts < maxAttempts
  );

  const expiresAfter = type === 'gold' ? 6000 : type === 'slow' ? 8000 : null;

  foods.push({
    x,
    y,
    type,
    eaten: false,
    spawnedAt: Date.now(),
    expiresAt: expiresAfter ? Date.now() + expiresAfter : null
  });
}

// Single step game tick
function gameStep() {
  if (gameOver || gamePaused) return;

  // Run AI autopilot if enabled
  if (autopilot) {
    const aiDir = getAutopilotDirection();
    if (aiDir) {
      nextDirection = aiDir;
    }
  }

  // Update direction
  direction = nextDirection;

  // Calculate new head position
  const head = { ...snake[0] };
  switch (direction) {
    case 'UP': head.y--; break;
    case 'DOWN': head.y++; break;
    case 'LEFT': head.x--; break;
    case 'RIGHT': head.x++; break;
  }

  // Check collision with wall
  if (currentMode === 'classic') {
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      triggerGameOver();
      return;
    }
  } else {
    // Wrap mode: wrap around coordinates
    if (head.x < 0) head.x = GRID_SIZE - 1;
    if (head.x >= GRID_SIZE) head.x = 0;
    if (head.y < 0) head.y = GRID_SIZE - 1;
    if (head.y >= GRID_SIZE) head.y = 0;
  }

  // Check collision with self (excluding tail segment since it moves out of the way this tick)
  if (snake.slice(0, -1).some(segment => segment.x === head.x && segment.y === head.y)) {
    triggerGameOver();
    return;
  }

  // Move head into snake array
  snake.unshift(head);

  // Check if snake ate food
  let foodEaten = false;
  const now = Date.now();
  
  // Clean up expired special foods
  foods = foods.filter(f => !f.expiresAt || f.expiresAt > now || f.eaten);

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    if (!food.eaten && food.x === head.x && food.y === head.y) {
      food.eaten = true;
      foodEaten = true;

      // Trigger effects depending on food type
      let scoreIncrement = 10;
      let particleColor = varToHex('--neon-pink');

      if (food.type === 'normal') {
        playSound('eat');
        spawnFood('normal');
      } else if (food.type === 'gold') {
        playSound('gold');
        scoreIncrement = 30;
        triggerScreenShake();
        particleColor = varToHex('--neon-gold');
        // Activate Speed Boost effect
        food.effectExpiresAt = now + 5000;
        // Adjust main speed loop instantly
        resetSpeedLoop();
      } else if (food.type === 'slow') {
        playSound('slow');
        scoreIncrement = 10;
        particleColor = varToHex('--neon-blue');
        // Activate Slow Speed effect
        food.effectExpiresAt = now + 5000;
        // Adjust main speed loop instantly
        resetSpeedLoop();
      }

      score += scoreIncrement;
      if (score > highScore) {
        highScore = score;
        document.getElementById('best-score').innerText = padScore(highScore);
      }
      
      updateScoreUI();
      spawnParticles(food.x, food.y, particleColor);

      // Randomly spawn special food (15% chance for gold, 15% chance for slow)
      // Only spawn if there are no other active foods of the same type
      const activeSpecialCount = foods.filter(f => !f.eaten && f.type !== 'normal').length;
      if (activeSpecialCount === 0) {
        const rand = Math.random();
        if (rand < 0.15) {
          spawnFood('gold');
        } else if (rand < 0.3) {
          spawnFood('slow');
        }
      }
      break;
    }
  }

  // If did not eat, remove tail to keep length consistent
  if (!foodEaten) {
    snake.pop();
  } else {
    // Keep eaten special food items in array to track their active boosts, but filter out once expired
    foods = foods.filter(f => !f.eaten || (f.effectExpiresAt && f.effectExpiresAt > now));
  }

  // Update game elapsed survival time
  if (gameStartTime) {
    survivalTimer = Math.floor((Date.now() - gameStartTime) / 1000);
  }

  // Redraw board
  drawGame();
}

// Reset the interval timers to handle dynamic speed changes
function resetSpeedLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = setInterval(gameStep, getTickInterval());
  }
}

// Draw Game Board
function drawGame() {
  // Clear Canvas
  ctx.fillStyle = '#02030a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Grid Lines (subtle details)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();
  }

  // Draw Foods
  const now = Date.now();
  foods.forEach(food => {
    if (food.eaten) return;
    
    // Pulse sizes using date timer
    const pulse = 1 + 0.15 * Math.sin(Date.now() / 150);
    const radius = (CELL_SIZE / 2) * 0.7 * pulse;
    const px = food.x * CELL_SIZE + CELL_SIZE / 2;
    const py = food.y * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    ctx.beginPath();
    
    if (food.type === 'normal') {
      ctx.fillStyle = varToHex('--neon-pink');
      ctx.shadowColor = varToHex('--neon-pink');
      ctx.shadowBlur = 12 * pulse;
    } else if (food.type === 'gold') {
      ctx.fillStyle = varToHex('--neon-gold');
      ctx.shadowColor = varToHex('--neon-gold');
      ctx.shadowBlur = 18 * pulse;
    } else if (food.type === 'slow') {
      ctx.fillStyle = varToHex('--neon-blue');
      ctx.shadowColor = varToHex('--neon-blue');
      ctx.shadowBlur = 15 * pulse;
    }

    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Draw Snake segments
  const skin = SKIN_PALETTES[activeSkin] || SKIN_PALETTES['Neon Green'];
  snake.forEach((segment, index) => {
    const isHead = index === 0;
    const px = segment.x * CELL_SIZE;
    const py = segment.y * CELL_SIZE;
    
    ctx.save();
    skin.draw(ctx, px, py, isHead, index, snake.length);
    
    // Draw neon eyes on head for cute cyber detail
    if (isHead) {
      ctx.shadowBlur = 0; // Disable shadow glow for fine details
      ctx.fillStyle = '#000';
      const eyeSize = CELL_SIZE * 0.15;
      
      let e1x = 0, e1y = 0, e2x = 0, e2y = 0;
      switch (direction) {
        case 'UP':
          e1x = CELL_SIZE * 0.25; e1y = CELL_SIZE * 0.25;
          e2x = CELL_SIZE * 0.75; e2y = CELL_SIZE * 0.25;
          break;
        case 'DOWN':
          e1x = CELL_SIZE * 0.25; e1y = CELL_SIZE * 0.75;
          e2x = CELL_SIZE * 0.75; e2y = CELL_SIZE * 0.75;
          break;
        case 'LEFT':
          e1x = CELL_SIZE * 0.25; e1y = CELL_SIZE * 0.25;
          e2x = CELL_SIZE * 0.25; e2y = CELL_SIZE * 0.75;
          break;
        case 'RIGHT':
          e1x = CELL_SIZE * 0.75; e1y = CELL_SIZE * 0.25;
          e2x = CELL_SIZE * 0.75; e2y = CELL_SIZE * 0.75;
          break;
      }
      ctx.beginPath();
      ctx.arc(px + e1x, py + e1y, eyeSize, 0, Math.PI * 2);
      ctx.arc(px + e2x, py + e2y, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // Render particle explosion layers
  updateParticles();
  drawParticles();
}

// Convert CSS variables to Hex strings for Canvas draw fills
function varToHex(variable) {
  switch (variable) {
    case '--neon-green': return '#39ff14';
    case '--neon-pink': return '#ff007f';
    case '--neon-blue': return '#00e5ff';
    case '--neon-gold': return '#ffd700';
    case '--neon-purple': return '#bd00ff';
    default: return '#ffffff';
  }
}

// Helper: Format integers to 3-digit padded arcade values
function padScore(val) {
  return String(val).padStart(3, '0');
}

// Update UI state scores
function updateScoreUI() {
  document.getElementById('current-score').innerText = padScore(score);
  
  // Calculate dynamic speed factor label
  let speedLabel = '1.0x';
  if (currentLevel === 'easy') speedLabel = '0.7x';
  if (currentLevel === 'hard') speedLabel = '1.4x';
  if (currentLevel === 'insane') speedLabel = '2.0x';

  // Check if buffs are active
  const now = Date.now();
  const speedBoostActive = foods.some(f => f.type === 'gold' && f.eaten && f.effectExpiresAt > now);
  const slowActive = foods.some(f => f.type === 'slow' && f.eaten && f.effectExpiresAt > now);

  if (speedBoostActive) {
    speedLabel += ' 🚀 BOOSTED';
    document.getElementById('current-speed').style.color = 'var(--neon-gold)';
  } else if (slowActive) {
    speedLabel += ' ❄️ SLOWED';
    document.getElementById('current-speed').style.color = 'var(--neon-blue)';
  } else {
    document.getElementById('current-speed').style.color = 'var(--neon-blue)';
  }

  document.getElementById('current-speed').innerText = speedLabel;
}

// Game Over handler
function triggerGameOver() {
  gameOver = true;
  playSound('crash');
  triggerScreenShake();
  
  // Reset Autopilot
  autopilot = false;
  const aiBtn = document.getElementById('btn-ai');
  if (aiBtn) {
    aiBtn.innerText = '🤖 啟動 AI 自動導航';
    aiBtn.classList.remove('active');
  }
  
  if (gameInterval) clearInterval(gameInterval);

  // Set final values
  document.getElementById('modal-final-score').innerText = padScore(score);
  
  // Format MM:SS for survival time
  const min = String(Math.floor(survivalTimer / 60)).padStart(2, '0');
  const sec = String(survivalTimer % 60).padStart(2, '0');
  document.getElementById('modal-time').innerText = `${min}:${sec}`;

  // Check if name entry form is shown
  // Show only if score > 0
  if (score > 0) {
    document.getElementById('high-score-form').style.display = 'block';
    document.getElementById('form-error').innerText = '';
    document.getElementById('player-name').value = localStorage.getItem('cyber-snake-player-name') || '';
  } else {
    document.getElementById('high-score-form').style.display = 'none';
  }

  // Display modal
  document.getElementById('gameover-modal').classList.add('active');

  // Toggle control buttons state
  document.getElementById('btn-pause').disabled = true;
}

// Pause/Resume game handling
function togglePause() {
  if (gameOver) return;
  
  gamePaused = !gamePaused;
  playSound('pause');

  const pauseOverlay = document.getElementById('pause-overlay');
  const btnPause = document.getElementById('btn-pause');

  if (gamePaused) {
    pauseOverlay.classList.add('active');
    btnPause.innerText = '恢復';
    if (gameInterval) clearInterval(gameInterval);
  } else {
    pauseOverlay.classList.remove('active');
    btnPause.innerText = '暫停';
    gameInterval = setInterval(gameStep, getTickInterval());
    // Adjust start time to ignore paused durations
    gameStartTime = Date.now() - (survivalTimer * 1000);
  }
}

// API: Fetch local server scores
// Helper: Get local scores from localStorage
function getLocalScores() {
  const scoresJSON = localStorage.getItem('cyber-snake-local-scores');
  if (scoresJSON) {
    try {
      return JSON.parse(scoresJSON);
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Helper: Save local score
function saveLocalScore(name, score, skin) {
  const scores = getLocalScores();
  scores.push({
    name,
    score,
    skin,
    date: new Date().toISOString()
  });
  // Sort descending by score, keep top 10
  scores.sort((a, b) => b.score - a.score);
  const topScores = scores.slice(0, 10);
  localStorage.setItem('cyber-snake-local-scores', JSON.stringify(topScores));
  return topScores;
}

// API: Fetch local server scores (with localStorage fallback for static deployment)
async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/scores');
    if (!res.ok) throw new Error("Could not fetch leaderboard data.");
    const data = await res.json();
    renderLeaderboard(data);
  } catch (error) {
    console.warn("Express server unavailable, running in static/local mode. Loading scores from localStorage.");
    const localScores = getLocalScores();
    renderLeaderboard(localScores);
  }
}

// Render Leaderboard array to table DOM
function renderLeaderboard(scores) {
  const tbody = document.getElementById('leaderboard-body');
  if (!scores || scores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="loading-text">尚無記錄，快來爭奪第一名吧！</td></tr>`;
    return;
  }

  tbody.innerHTML = scores.map((entry, index) => {
    const rank = index + 1;
    let badge = `<span class="rank-badge">${rank}</span>`;
    
    // Style skin tag badge color
    const skinName = entry.skin || 'Neon Green';
    const skinColor = SKIN_PALETTES[skinName] ? SKIN_PALETTES[skinName].primary : '#39ff14';

    return `
      <tr>
        <td>${badge}</td>
        <td>${escapeHTML(entry.name)}</td>
        <td><span class="player-skin-badge" style="color: ${skinColor};">${escapeHTML(skinName)}</span></td>
        <td>${padScore(entry.score)}</td>
      </tr>
    `;
  }).join('');
}

// Helper: Escape HTML strings to protect against XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// API: Post high score to Express Backend (with LocalStorage fallback)
async function submitHighScore() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput.value.trim();
  const errorEl = document.getElementById('form-error');

  if (!name) {
    errorEl.innerText = "🚨 請輸入代號！";
    return;
  }

  try {
    // Save to local storage for convenience in next games
    localStorage.setItem('cyber-snake-player-name', name);
    
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        score,
        skin: activeSkin
      })
    });

    if (!res.ok) throw new Error("Submit error.");

    const updatedLeaderboard = await res.json();
    renderLeaderboard(updatedLeaderboard);

    // Hide input form once successfully uploaded
    document.getElementById('high-score-form').style.display = 'none';
  } catch (error) {
    console.warn("Express server submit failed, saving score locally to localStorage.");
    const updatedLocalScores = saveLocalScore(name, score, activeSkin);
    renderLeaderboard(updatedLocalScores);
    document.getElementById('high-score-form').style.display = 'none';
  }
}

// Controls: Keyboard actions
window.addEventListener('keydown', e => {
  // Prevent browser window scroll defaults
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }

  if (gameOver) return;

  // Turn off autopilot on manual direction key press
  if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
    if (autopilot) {
      autopilot = false;
      const aiBtn = document.getElementById('btn-ai');
      if (aiBtn) {
        aiBtn.innerText = '🤖 啟動 AI 自動導航';
        aiBtn.classList.remove('active');
      }
    }
  }

  // Key codes for W/A/S/D and arrow keys
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      if (direction !== 'DOWN') nextDirection = 'UP';
      break;
    case 'ArrowDown':
    case 'KeyS':
      if (direction !== 'UP') nextDirection = 'DOWN';
      break;
    case 'ArrowLeft':
    case 'KeyA':
      if (direction !== 'RIGHT') nextDirection = 'LEFT';
      break;
    case 'ArrowRight':
    case 'KeyD':
      if (direction !== 'LEFT') nextDirection = 'RIGHT';
      break;
    case 'Space':
      if (document.getElementById('start-overlay').style.display !== 'none') {
        initGame();
      } else {
        togglePause();
      }
      break;
    case 'Escape':
      togglePause();
      break;
  }
});

// Event Listeners for UI Components
document.getElementById('btn-start').addEventListener('click', () => {
  initAudio();
  initGame();
});

document.getElementById('btn-pause').addEventListener('click', togglePause);

// Settings - Speed difficulty
document.getElementById('select-difficulty').addEventListener('change', e => {
  currentLevel = e.target.value;
  if (!gameOver && !gamePaused && gameInterval) {
    resetSpeedLoop();
  }
});

// Settings - Boundary Mode
document.getElementById('select-mode').addEventListener('change', e => {
  currentMode = e.target.value;
});

// Settings - Skins swatches selectors
const swatches = document.querySelectorAll('.skin-swatch');
swatches.forEach(swatch => {
  swatch.addEventListener('click', () => {
    swatches.forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    activeSkin = swatch.getAttribute('data-skin');
    
    // Redraw game to show skin update instantly on screen if active
    if (!gameOver) drawGame();
  });
});

// Settings - Audio on/off toggle
document.getElementById('btn-audio').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  const audioBtn = document.getElementById('btn-audio');
  
  if (soundEnabled) {
    audioBtn.innerHTML = '<span class="audio-icon">🔊</span> On';
    audioBtn.classList.remove('muted');
    initAudio();
  } else {
    audioBtn.innerHTML = '<span class="audio-icon">🔇</span> Off';
    audioBtn.classList.add('muted');
  }
});

// Overlay Start Button
document.getElementById('start-overlay-btn').addEventListener('click', () => {
  initAudio();
  initGame();
});

// Modal Actions
document.getElementById('btn-submit-score').addEventListener('click', submitHighScore);
document.getElementById('btn-modal-restart').addEventListener('click', () => {
  initGame();
});

// Mobile virtual buttons
const handleJoyInput = (dir) => {
  if (gameOver || gamePaused) return;
  initAudio();
  
  // Turn off autopilot on touch control override
  if (autopilot) {
    autopilot = false;
    const aiBtn = document.getElementById('btn-ai');
    if (aiBtn) {
      aiBtn.innerText = '🤖 啟動 AI 自動導航';
      aiBtn.classList.remove('active');
    }
  }
  
  switch (dir) {
    case 'UP': if (direction !== 'DOWN') nextDirection = 'UP'; break;
    case 'DOWN': if (direction !== 'UP') nextDirection = 'DOWN'; break;
    case 'LEFT': if (direction !== 'RIGHT') nextDirection = 'LEFT'; break;
    case 'RIGHT': if (direction !== 'LEFT') nextDirection = 'RIGHT'; break;
  }
};

document.getElementById('joy-up').addEventListener('touchstart', e => { e.preventDefault(); handleJoyInput('UP'); });
document.getElementById('joy-down').addEventListener('touchstart', e => { e.preventDefault(); handleJoyInput('DOWN'); });
document.getElementById('joy-left').addEventListener('touchstart', e => { e.preventDefault(); handleJoyInput('LEFT'); });
document.getElementById('joy-right').addEventListener('touchstart', e => { e.preventDefault(); handleJoyInput('RIGHT'); });

// Add mouse click fallbacks for virtual buttons to aid testing in emulator
document.getElementById('joy-up').addEventListener('click', () => handleJoyInput('UP'));
document.getElementById('joy-down').addEventListener('click', () => handleJoyInput('DOWN'));
document.getElementById('joy-left').addEventListener('click', () => handleJoyInput('LEFT'));
document.getElementById('joy-right').addEventListener('click', () => handleJoyInput('RIGHT'));

// Window Resize triggers canvas resize
window.addEventListener('resize', resizeCanvas);

// On Page Load Initialization
window.addEventListener('DOMContentLoaded', () => {
  // Set up canvas sizes
  resizeCanvas();
  
  // Load Leaderboard scores
  fetchLeaderboard();
  
  // Initial draw
  drawGame();
});

// AI Autopilot button handler
document.getElementById('btn-ai').addEventListener('click', () => {
  autopilot = !autopilot;
  const aiBtn = document.getElementById('btn-ai');
  if (autopilot) {
    aiBtn.innerText = '🤖 AI 自動導航運作中';
    aiBtn.classList.add('active');
    
    // Automatically trigger audio init in case it hasn't been done
    initAudio();
  } else {
    aiBtn.innerText = '🤖 啟動 AI 自動導航';
    aiBtn.classList.remove('active');
  }
});

// space-maximizing tail-chaser AI Autopilot Solver (Time-Based BFS)
function isCellBlocked(x, y, t, snakeBody) {
  for (let i = 0; i < snakeBody.length; i++) {
    if (snakeBody[i].x === x && snakeBody[i].y === y) {
      // The segment snakeBody[i] will leave the cell at step: snakeBody.length - i
      if (t < snakeBody.length - i) {
        return true;
      }
    }
  }
  return false;
}

function findPathTime(start, target, snakeBody) {
  const queue = [{ cell: { x: start.x, y: start.y }, t: 0, path: [`${start.x},${start.y}`] }];
  const visited = new Map();
  visited.set(`${start.x},${start.y}`, 0);

  while (queue.length > 0) {
    const curr = queue.shift();
    const { cell, t, path } = curr;

    if (cell.x === target.x && cell.y === target.y) {
      const resultPath = [];
      for (let i = 1; i < path.length; i++) {
        const [px, py] = path[i].split(',').map(Number);
        resultPath.push({ x: px, y: py });
      }
      return resultPath;
    }

    const neighbors = getGridNeighbors(cell);
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (path.includes(key)) continue;

      const nextT = t + 1;

      // Check if blocked by moving body segments
      if (isCellBlocked(n.x, n.y, nextT, snakeBody)) {
        continue;
      }

      if (visited.has(key) && visited.get(key) <= nextT) continue;

      visited.set(key, nextT);
      queue.push({
        cell: n,
        t: nextT,
        path: [...path, key]
      });
    }
  }
  return null;
}

function getReachableSpaceSize(startCell, virtualSnake) {
  const queue = [startCell];
  const visited = new Set();
  visited.add(`${startCell.x},${startCell.y}`);

  const bodySet = new Set();
  for (let i = 0; i < virtualSnake.length - 1; i++) {
    bodySet.add(`${virtualSnake[i].x},${virtualSnake[i].y}`);
  }

  let count = 0;
  while (queue.length > 0) {
    const curr = queue.shift();
    count++;

    const neighbors = getGridNeighbors(curr);
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key) || bodySet.has(key)) continue;

      visited.add(key);
      queue.push(n);
    }
  }
  return count;
}

function getSafeDirections(start, snakeBody) {
  const neighbors = getGridNeighbors(start);
  const safe = [];
  for (const n of neighbors) {
    if (!isCellBlocked(n.x, n.y, 1, snakeBody)) {
      safe.push({ target: n });
    }
  }
  return safe;
}

function getAutopilotDirection() {
  const start = snake[0];
  const activeFoods = foods.filter(f => !f.eaten);
  if (activeFoods.length === 0) return null;

  activeFoods.sort((a, b) => {
    return getMinManhattanDist(a, [start]) - getMinManhattanDist(b, [start]);
  });
  const targetFood = activeFoods[0];

  let chosenNextStep = null;

  // 1. Try shortest path to food
  const pathToFood = findPathTime(start, targetFood, snake);

  if (pathToFood && pathToFood.length > 0) {
    // 2. Safety check: simulate virtual snake eating the food
    let virtualSnake = [...snake];
    for (let i = 0; i < pathToFood.length; i++) {
      const step = pathToFood[i];
      virtualSnake.unshift(step);
      if (i < pathToFood.length - 1) {
        virtualSnake.pop();
      }
    }

    const virtualHead = virtualSnake[0];
    const virtualTail = virtualSnake[virtualSnake.length - 1];

    // Check if virtual head can reach virtual tail after eating
    const pathToVirtualTail = findPathTime(virtualHead, virtualTail, virtualSnake);

    if ((pathToVirtualTail && pathToVirtualTail.length > 0) || snake.length < 4) {
      chosenNextStep = pathToFood[0];
    }
  }

  // 3. If food path is unavailable or unsafe, chase the tail
  if (!chosenNextStep) {
    const safeMoves = getSafeDirections(start, snake);
    const tailChasingMoves = [];

    for (const move of safeMoves) {
      const virtualSnake = [move.target, ...snake.slice(0, -1)];
      const canReachTail = findPathTime(virtualSnake[0], virtualSnake[virtualSnake.length - 1], virtualSnake);
      if (canReachTail || snake.length < 4) {
        move.spaceSize = getReachableSpaceSize(move.target, virtualSnake);
        tailChasingMoves.push(move);
      }
    }

    if (tailChasingMoves.length > 0) {
      tailChasingMoves.sort((a, b) => b.spaceSize - a.spaceSize);
      chosenNextStep = tailChasingMoves[0].target;
    }
  }

  // 4. Survival fallback: pick the safe move that maximizes space size
  if (!chosenNextStep) {
    const safeMoves = getSafeDirections(start, snake);
    if (safeMoves.length > 0) {
      safeMoves.forEach(move => {
        const virtualSnake = [move.target, ...snake.slice(0, -1)];
        move.spaceSize = getReachableSpaceSize(move.target, virtualSnake);
      });
      safeMoves.sort((a, b) => b.spaceSize - a.spaceSize);
      chosenNextStep = safeMoves[0].target;
    }
  }

  if (chosenNextStep) {
    return getDirBetween(start, chosenNextStep);
  }

  return null;
}

// Find path between two cells using BFS (Legacy, kept for reference or fallback if needed)
function findPath(start, target, bodySet) {
  const queue = [{ x: start.x, y: start.y }];
  const visited = new Set();
  visited.add(`${start.x},${start.y}`);

  const parent = {};
  let found = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === target.x && current.y === target.y) {
      found = true;
      break;
    }

    const neighbors = getGridNeighbors(current);
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;

      const isTarget = n.x === target.x && n.y === target.y;
      if (bodySet.has(key) && !isTarget) continue;

      visited.add(key);
      parent[key] = current;
      queue.push(n);
    }
  }

  if (found) {
    let curr = target;
    const path = [];
    while (curr && !(curr.x === start.x && curr.y === start.y)) {
      path.push(curr);
      const key = `${curr.x},${curr.y}`;
      curr = parent[key];
    }
    return path.reverse();
  }
  return null;
}

// Get adjacent cells on the grid
function getGridNeighbors(cell) {
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];
  const neighbors = [];
  for (const d of directions) {
    let nx = cell.x + d.dx;
    let ny = cell.y + d.dy;

    if (currentMode === 'classic') {
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        neighbors.push({ x: nx, y: ny });
      }
    } else {
      nx = (nx + GRID_SIZE) % GRID_SIZE;
      ny = (ny + GRID_SIZE) % GRID_SIZE;
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

// Get direction between two adjacent grid cells (handles wrap-around)
function getDirBetween(from, to) {
  let dx = to.x - from.x;
  let dy = to.y - from.y;

  // Handle wrap-around diff
  if (currentMode === 'wrap') {
    if (dx > 1) dx = -1; // wrapped right-to-left
    if (dx < -1) dx = 1; // wrapped left-to-right
    if (dy > 1) dy = -1; // wrapped bottom-to-top
    if (dy < -1) dy = 1; // wrapped top-to-bottom
  }

  if (dx === 0 && dy === -1) return 'UP';
  if (dx === 0 && dy === 1) return 'DOWN';
  if (dx === -1 && dy === 0) return 'LEFT';
  if (dx === 1 && dy === 0) return 'RIGHT';
  return null;
}

// Get minimum Manhattan distance to any target in the list
function getMinManhattanDist(cell, targetList) {
  let minDist = Infinity;
  for (const target of targetList) {
    let dx = Math.abs(cell.x - target.x);
    let dy = Math.abs(cell.y - target.y);
    if (currentMode === 'wrap') {
      dx = Math.min(dx, GRID_SIZE - dx);
      dy = Math.min(dy, GRID_SIZE - dy);
    }
    const dist = dx + dy;
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isCellBlocked,
    findPathTime,
    getReachableSpaceSize,
    getSafeDirections,
    getAutopilotDirection,
    setSnake: (val) => { snake = val; },
    getSnake: () => snake,
    setFoods: (val) => { foods = val; },
    getFoods: () => foods,
    setCurrentMode: (val) => { currentMode = val; }
  };
}
