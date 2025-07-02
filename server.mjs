import express from "express";
import { runTest } from "./index.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public"))); // <-- ton HTML doit être dans ./public

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

app.listen(PORT, () => {
  console.log(`🌐 Interface disponible sur http://localhost:${PORT}`);
});
