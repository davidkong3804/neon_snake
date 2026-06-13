const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock minimal browser environment
global.document = {
  getElementById: (id) => {
    if (id === 'game-canvas') {
      return {
        getContext: () => ({
          fillRect: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          arc: () => {},
          fill: () => {},
          save: () => {},
          restore: () => {},
          quadraticCurveTo: () => {},
        }),
        width: 500,
        height: 500
      };
    }
    return {
      addEventListener: () => {},
      classList: {
        add: () => {},
        remove: () => {}
      },
      style: {},
      innerText: '',
      disabled: false,
      value: ''
    };
  },
  querySelectorAll: () => []
};

global.window = {
  addEventListener: () => {}
};

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Require the exported functions from game.js
const game = require('../public/game.js');

// Test Cases
console.log('🧪 Starting AI Pathfinder Unit Tests...');

try {
  // Test Case 1: isCellBlocked basic logic
  const mockSnake = [
    { x: 12, y: 12 },
    { x: 11, y: 12 },
    { x: 10, y: 12 }
  ];
  assert.strictEqual(game.isCellBlocked(10, 12, 1, mockSnake), false, 'Tail should be free at step 1');
  assert.strictEqual(game.isCellBlocked(11, 12, 1, mockSnake), true, 'Body should be blocked at step 1');
  assert.strictEqual(game.isCellBlocked(11, 12, 2, mockSnake), false, 'Body should be free at step 2');

  console.log('✅ isCellBlocked unit tests passed!');

  // Test Case 2: findPathTime finding shortest path
  game.setCurrentMode('classic');
  
  const start = { x: 5, y: 5 };
  const target = { x: 5, y: 7 };
  const obstacleSnake = [
    { x: 5, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 }
  ];
  
  const pathResult = game.findPathTime(start, target, obstacleSnake);
  assert.notStrictEqual(pathResult, null, 'Should find path around obstacle');
  assert.ok(pathResult.length > 0, 'Path should contain steps');
  
  console.log('✅ findPathTime unit tests passed!');

  // Test Case 3: Autonomous Autopilot Simulation
  console.log('🏃 Running 200-step AI simulation test...');
  
  game.setSnake([
    { x: 12, y: 12 },
    { x: 11, y: 12 },
    { x: 10, y: 12 }
  ]);
  game.setFoods([{ x: 15, y: 12, eaten: false }]);
  
  for (let step = 0; step < 200; step++) {
    const dir = game.getAutopilotDirection();
    if (!dir) {
      throw new Error(`AI got stuck with no returned direction at step ${step}.`);
    }
    
    const currentSnake = game.getSnake();
    const currentFoods = game.getFoods();
    
    // Simulate movement
    const head = { ...currentSnake[0] };
    if (dir === 'UP') head.y--;
    else if (dir === 'DOWN') head.y++;
    else if (dir === 'LEFT') head.x--;
    else if (dir === 'RIGHT') head.x++;
    
    // Check collision (excluding tail)
    const collidedWithBody = currentSnake.slice(0, -1).some(s => s.x === head.x && s.y === head.y);
    const collidedWithWall = head.x < 0 || head.x >= 24 || head.y < 0 || head.y >= 24;
    
    if (collidedWithBody) {
      throw new Error(`AI collided with its own body at step ${step} moving ${dir} to (${head.x}, ${head.y})`);
    }
    if (collidedWithWall) {
      throw new Error(`AI collided with wall at step ${step} moving ${dir} to (${head.x}, ${head.y})`);
    }
    
    currentSnake.unshift(head);
    
    if (head.x === currentFoods[0].x && head.y === currentFoods[0].y) {
      let fx, fy;
      do {
        fx = Math.floor(Math.random() * 24);
        fy = Math.floor(Math.random() * 24);
      } while (currentSnake.some(s => s.x === fx && s.y === fy));
      
      game.setFoods([{ x: fx, y: fy, eaten: false }]);
    } else {
      currentSnake.pop();
    }
    
    game.setSnake(currentSnake);
  }

  console.log(`✅ Simulation test passed! Snake length: ${game.getSnake().length}`);
  console.log('🎉 All tests completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('❌ Test failed:', error.stack || error.message);
  process.exit(1);
}
