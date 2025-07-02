import { load } from 'cheerio';
import axios from 'axios';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import { performance } from 'node:perf_hooks';
import clear from 'console-clear';
import fs from 'fs';

// Création d'une instance Axios avec redirections limitées
const instance = axios.create({
  maxRedirects: 5
});

async function parseToken(scriptPath) {
  const { data: script } = await instance.get(scriptPath, { responseType: 'text' });
  const result = parse(script, { ecmaVersion: 2022 });

  return new Promise((resolve) => {
    let token = null;
    simple(result, {
      Property(node) {
        if (node.key.name === "token") {
          token = node.value.value;
        }
      },
    });
    resolve(token);
  });
}

export async function runTest() {
  clear(true);
  console.log("🚀 FAST.COM - Démarrage du test de débit...");

  try {
    const { data } = await instance.get("https://fast.com/");
    const $ = load(data);
    const scriptSrc = $("script[src]").first().attr("src");
    const token = await parseToken(new URL(scriptSrc, "https://fast.com/"));

    const { data: { targets } } = await instance.get(
      `https://api.fast.com/netflix/speedtest/v2?https=true&token=${token}&urlCount=5`
    );

    let bytes = 0;
    const avg = [];
    const controller = new AbortController();
    let startedAt = Date.now();

    const results = await Promise.all(
      targets.map(async ({ url }) => {
        return new Promise((resolve) => {
          instance.get(url, { responseType: 'stream', signal: controller.signal }).then(({ data: stream }) => {
            stream.on('data', buffer => {
              bytes += buffer.length;
              const now = Date.now();
              if (now - startedAt >= 100) {
                avg.push(bytes * 8 * 10); // bits/sec
                bytes = 0;
                startedAt = now;
              }
            });

            stream.on('end', () => resolve());
            stream.on('error', () => resolve()); // éviter que ça bloque tout
          }).catch(() => resolve()); // ignore erreur individuelle
        });
      })
    );

    controller.abort();

    const averageBits = avg.length > 0
      ? avg.reduce((a, b) => a + b, 0) / avg.length
      : 0;
    const speedMbps = Math.round(averageBits / 1000000);

    console.log(`✅ Vitesse mesurée : ${speedMbps} Mbps`);

    const result = {
      timestamp: new Date().toISOString(),
      download_mbps: speedMbps
    };

    // Sauvegarde dans data.json
    let dataArr = [];
    const dataPath = './data.json';
    if (fs.existsSync(dataPath)) {
      try {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        if (fileContent.length > 0) {
          dataArr = JSON.parse(fileContent);
        }
      } catch (err) {
        console.error("❌ Erreur lecture JSON : ", err.message);
      }
    }

    dataArr.push(result);
    if (dataArr.length > 500) dataArr = dataArr.slice(-500); // limite à 500 entrées

    fs.writeFileSync(dataPath, JSON.stringify(dataArr, null, 2));

    return result;
  } catch (error) {
    console.error("❌ Test échoué : ", error.message);
    return null;
  }
}
