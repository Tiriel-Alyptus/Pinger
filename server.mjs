import express from "express";
import { runTest } from "./index.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// Page principale générée via JS
app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pinger</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.tailwindcss.com/4"></script>
  </head>
  <body class="bg-gradient-to-tr from-sky-50 to-white min-h-screen">
    <div id="app"></div>
    <script type="module" src="/app.js"></script>
  </body>
  </html>`);
});

app.use(express.json());

// API - obtenir les données JSON
app.get("/api/data", (req, res) => {
  const dataPath = path.join(__dirname, "data.json");
  if (fs.existsSync(dataPath)) {
    const content = fs.readFileSync(dataPath, "utf8");
    try {
      const json = JSON.parse(content);
      return res.json(json);
    } catch (err) {
      return res.status(500).json({ error: "Fichier JSON corrompu" });
    }
  }
  res.json([]);
});

// API - lancer un test de débit
app.post("/api/test", async (req, res) => {
  const result = await runTest();
  if (result) return res.json(result);
  res.status(500).json({ error: "Échec du test" });
});

// API - suppression d'une entrée par timestamp
app.delete("/api/data/:ts", (req, res) => {
  const ts = req.params.ts;
  const dataPath = path.join(__dirname, "data.json");
  if (!fs.existsSync(dataPath)) return res.status(404).end();

  let data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  data = data.filter(d => d.timestamp !== ts);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.status(200).end();
});

// API - nettoyage des entrées de plus de 7 jours
app.delete("/api/data/old", (req, res) => {
  const now = Date.now();
  const dataPath = path.join(__dirname, "data.json");
  if (!fs.existsSync(dataPath)) return res.status(404).end();

  let data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  data = data.filter(d => now - new Date(d.timestamp).getTime() < 7 * 86400000);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.status(200).end();
});

// Fichier fictif pour test local
app.get("/speedtest-file", (req, res) => {
  res.set("Content-Length", 1024 * 1024 * 2); // 2 Mo
  const buffer = Buffer.alloc(1024 * 1024 * 2, 0); // données neutres
  res.end(buffer);
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Interface disponible sur :
  → http://localhost:${PORT}
  → http://${getLocalIP()}:${PORT}`);
});
