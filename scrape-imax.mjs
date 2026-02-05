import fs from "fs";
import { chromium } from "playwright";

const SNAPSHOT_FILE = "imax_snapshot.json";
const URL = "https://www.todoshowcase.com/";

async function getIMAXMovies() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });

  const movies = await page.evaluate(() => {
    const results = [];
    const films = document.querySelectorAll(".boxfilm");

    films.forEach(film => {
      const imaxTag = film.querySelector(".tresd p");
      if (!imaxTag) return;
      if (imaxTag.innerText.trim() !== "IMAX") return;

      const titleEl = film.querySelector(".titulo-pelicula h2 a");
      const title = titleEl ? titleEl.innerText.trim() : null;

      if (title) {
        results.push({ title });
      }
    });

    return results;
  });

  await browser.close();
  return movies;
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
}

function saveSnapshot(titles) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(titles, null, 2));
}

function diffMovies(today, yesterday) {
  const added = today.filter(t => !yesterday.includes(t));
  const removed = yesterday.filter(y => !today.includes(y));
  return { added, removed };
}

async function main() {
  // 1️⃣ Scrape
  const imaxMovies = await getIMAXMovies();

  // 2️⃣ Normalizar
  const todayTitles = imaxMovies.map(m => m.title).sort();
  const yesterdayTitles = loadSnapshot();

  // 3️⃣ Comparar
  const { added, removed } = diffMovies(todayTitles, yesterdayTitles);

  console.log("🎬 Películas IMAX hoy:");
  todayTitles.forEach(t => console.log(" -", t));

  if (added.length || removed.length) {
    console.log("🆕 Agregadas:", added);
    console.log("❌ Quitadas:", removed);
  } else {
    console.log("Sin cambios respecto al día anterior");
  }

  // 4️⃣ Guardar snapshot
  saveSnapshot(todayTitles);
}

// 🚀 Ejecutar
main().catch(err => {
  console.error("❌ Error en scraper:", err);
  process.exit(1);
});
