import express from 'express';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { runTest } from './index.mjs';

const app = express();
// Allow overriding the port via environment variable when running in Docker
const PORT = process.env.PORT || 5000;
app.use(express.json());

app.use(express.static('public'));

// Fichier de test de débit (~40MB)
app.get('/speedtest-file', (req, res) => {
  const size = 40 * 1024 * 1024; // 40MB
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="speedtest.bin"');

  const chunkSize = 64 * 1024;
  let sent = 0;
  const stream = new Readable({
    read() {
      if (sent >= size) {
        this.push(null);
      } else {
        sent += chunkSize;
        this.push(Buffer.alloc(chunkSize));
      }
    }
  });
  stream.pipe(res);
});


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

// Lancer un test de débit à la demande
app.post('/api/test', async (req, res) => {
  const result = await runTest();
  if (result) {
    res.json(result);
  } else {
    res.status(500).json({ error: 'Test échoué' });
  }
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
