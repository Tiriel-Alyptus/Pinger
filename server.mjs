import express from 'express';
import fs from 'fs';
import path from 'path';
import { runTest } from './index.mjs';

const app = express();
const PORT = 5000;

app.use(express.static('public'));


// API pour récupérer les données
app.get('/api/data', (req, res) => {
  let dataArr = [];
  if (fs.existsSync('./data.json')) {
    try {
      const content = fs.readFileSync('./data.json');
      if (content.length > 0) {
        dataArr = JSON.parse(content);
      }
    } catch (err) {
      console.error("Erreur lecture JSON : ", err.message);
    }
  }
  res.json(dataArr);
});

// Page principale
app.get('/', (req, res) => {
  res.sendFile(path.resolve('./public/index.html'));
});

// Lancement automatique toutes les minutes
setInterval(async () => {
  console.log("Lancement auto d'un test...");
  await runTest();
}, 60000);  // 60000 ms = 1 minute

// Premier test au démarrage
runTest();

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
