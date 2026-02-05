import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const SNAPSHOT_FILE = "imax_snapshot.json";

async function getIMAXMovies() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://www.todoshowcase.com/", {
    waitUntil: "networkidle",
  });

  const movies = await page.evaluate(() => {
    const results = [];
    const films = document.querySelectorAll(".boxfilm");

    films.forEach(film => {
      const isIMAX = film.querySelector(".tresd p")?.innerText.trim() === "IMAX";
      if (!isIMAX) return;

      const title =
        film.querySelector(".titulo-pelicula h2 a")?.innerText.trim();

      if (title) {
        results.push({ title });
      }
    });

    return results;
  });

  await browser.close();
  return movies;
}

function loadPreviousSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return [];
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
}

function saveSnapshot(movies) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(movies, null, 2));
}

function diffMovies(today, yesterday) {
  const added = today.filter(t => !yesterday.includes(t));
  const removed = yesterday.filter(y => !today.includes(y));
  return { added, removed };
}

async function main() {
  // 1️⃣ scrapeamos
  const imaxMovies = await getIMAXMovies();

  // 2️⃣ normalizamos
  const todayMovies = imaxMovies.map(m => m.title).sort();
  const yesterdayMovies = loadPreviousSnapshot();

  // 3️⃣ comparamos
  const { added, removed } = diffMovies(todayMovies, yesterdayMovies);
