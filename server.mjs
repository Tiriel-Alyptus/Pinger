import express from 'express';
import fs from 'fs';
import path from 'path';
import { runTest } from './index.mjs';

const app = express();
const PORT = 5000;
app.use(express.json());

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

// Supprimer les entrées plus anciennes que 7 jours
app.delete('/api/data/old', (req, res) => {
  const limit = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 jours en ms
  let dataArr = [];
  if (fs.existsSync('./data.json')) {
    try {
      const content = fs.readFileSync('./data.json');
      if (content.length > 0) {
        dataArr = JSON.parse(content);
      }
    } catch (err) {
      console.error('Erreur lecture JSON : ', err.message);
    }
  }
  const filtered = dataArr.filter(entry => new Date(entry.timestamp).getTime() >= limit);
  fs.writeFileSync('./data.json', JSON.stringify(filtered, null, 2));
  res.json({ removed: dataArr.length - filtered.length });
});

// Supprimer une entrée spécifique (par timestamp)
app.delete('/api/data/:timestamp', (req, res) => {
  const { timestamp } = req.params;
  let dataArr = [];
  if (fs.existsSync('./data.json')) {
    try {
      const content = fs.readFileSync('./data.json');
      if (content.length > 0) {
        dataArr = JSON.parse(content);
      }
    } catch (err) {
      console.error('Erreur lecture JSON : ', err.message);
    }
  }
  const filtered = dataArr.filter(entry => entry.timestamp !== timestamp);
  fs.writeFileSync('./data.json', JSON.stringify(filtered, null, 2));
  res.json({ removed: dataArr.length - filtered.length });
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
