const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read scores
function readScores() {
  try {
    if (!fs.existsSync(SCORES_FILE)) {
      // Seed with some fun default scores
      const defaultScores = [
        { name: "Antigravity AI", score: 800, date: new Date().toLocaleDateString(), skin: "Rainbow" },
        { name: "Snake Master", score: 500, date: new Date().toLocaleDateString(), skin: "Cyberpunk Gradient" },
        { name: "Pixel Legend", score: 300, date: new Date().toLocaleDateString(), skin: "Neon Green" },
        { name: "Retro Fanatic", score: 150, date: new Date().toLocaleDateString(), skin: "Electric Blue" }
      ];
      fs.writeFileSync(SCORES_FILE, JSON.stringify(defaultScores, null, 2));
      return defaultScores;
    }
    const data = fs.readFileSync(SCORES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading scores file:", error);
    return [];
  }
}

// Helper to write scores
function writeScores(scores) {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
  } catch (error) {
    console.error("Error writing scores file:", error);
  }
}

// REST API Endpoints
app.get('/api/scores', (req, res) => {
  const scores = readScores();
  // Sort descending and return top 10
  const topScores = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(topScores);
});

app.post('/api/scores', (req, res) => {
  const { name, score, skin } = req.body;
  
  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: "Invalid request payload. Name and score are required." });
  }

  const scores = readScores();
  const newEntry = {
    name: name.trim().substring(0, 15), // Limit name to 15 chars
    score,
    skin: skin || "Neon Green",
    date: new Date().toLocaleDateString()
  };

  scores.push(newEntry);
  
  // Sort and keep top 10
  const updatedScores = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  writeScores(updatedScores);
  res.json(updatedScores);
});

// Fallback to index.html for single page application styling if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Cyberpunk Snake Server running on port ${PORT}`);
  console.log(`👉 Access the game at: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
