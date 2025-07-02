import axios from 'axios';
import { load } from 'cheerio';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import FastSpeedtest from 'fast-speedtest-api';
import fs from 'fs';
import clear from 'console-clear';

async function getTokenFromFastCom() {
  const { data } = await axios.get("https://fast.com/");
  const $ = load(data);
  const scriptSrc = $("script[src]").first().attr("src");
  const scriptUrl = new URL(scriptSrc, "https://fast.com/").toString();

  const { data: script } = await axios.get(scriptUrl);
  const result = parse(script, { ecmaVersion: 2022 });

  let token = null;
  simple(result, {
    Property(node) {
      if (node.key.name === "token") {
        token = node.value.value;
      }
    },
  });

  if (!token) throw new Error("Token introuvable depuis fast.com");
  return token;
}

export async function runTest() {
  clear(true);
  console.log("🚀 FAST.COM - Démarrage du test de débit...");

  try {
    const token = await getTokenFromFastCom();

    const speedtest = new FastSpeedtest({
      token,
      verbose: false,
      timeout: 10000,
      https: true,
      urlCount: 5,
      bufferSize: 8,
      unit: FastSpeedtest.UNITS.Mbps,
    });

    const speed = await speedtest.getSpeed();
    console.log(`✅ Vitesse mesurée : ${speed} Mbps`);

    const result = {
      timestamp: new Date().toISOString(),
      download_mbps: speed
    };

    // Sauvegarde dans data.json
    const dataPath = './data.json';
    let dataArr = [];
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
    if (dataArr.length > 500) dataArr = dataArr.slice(-500); // max 500 entrées
    fs.writeFileSync(dataPath, JSON.stringify(dataArr, null, 2));

    return result;
  } catch (error) {
    console.error("❌ Test échoué :", error.message);
    return null;
  }
}
