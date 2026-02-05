import fs from "fs";
import { chromium } from "playwright";

// =====================
// ENV
// =====================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("❌ Faltan variables de entorno de Telegram");
  process.exit(1);
}

// =====================
// CONFIG
// =====================
const SNAPSHOT_FILE = "imax_snapshot.json";
const SHOWCASE_URL = "https://www.todoshowcase.com/";

// =====================
// HELPERS
// =====================
function uniqByTitle(movies) {
  const map = new Map();
  for (const m of movies) {
    // Normalizar: trim + eliminar espacios dobles + lowercase para comparar
    const normalizedTitle = m.title.trim().replace(/\s+/g, ' ').toLowerCase();
    // Guardar con el título original (no normalizado) para display
    if (!map.has(normalizedTitle)) {
      map.set(normalizedTitle, m);
    }
  }
  return [...map.values()];
}

async function sendTelegramMessage(text) {
  console.log("📨 Enviando mensaje a Telegram...");

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Telegram error: " + err);
  }

  console.log("✅ Mensaje enviado a Telegram");
}

// =====================
// SCRAPER
// =====================
async function scrapeImaxMovies() {
  console.log("🌐 Abriendo Playwright...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("📡 Cargando Showcase...");
  await page.goto(SHOWCASE_URL, { waitUntil: "networkidle" });

  console.log("🔍 Buscando películas IMAX...");
  
  const imaxMovies = await page.$$eval(".boxfilm", (boxes) => {
    return boxes
      .filter((box) => {
        const imaxTag = box.querySelector(".tresd p");
        return imaxTag && imaxTag.textContent.trim() === "IMAX";
      })
      .map((box) => {
        const titleElement = box.querySelector(".titulo-pelicula h2 a");
        const title = titleElement ? titleElement.textContent.trim() : "Sin título";

        const link = box.querySelector(".afiche-pelicula a");
        const href = link ? link.getAttribute("href") : "";
        const match = href.match(/filmid=(\d+)/);
        const filmId = match ? match[1] : "unknown";

        return { filmId, title };
      });
  });

  await browser.close();
  console.log(`✅ Encontradas ${imaxMovies.length} películas IMAX`);
  
  console.log("🔍 Detalle de filmIds encontrados:");
  imaxMovies.forEach(m => console.log(`  ${m.filmId} - ${m.title}`));
  
  return imaxMovies;
}

// =====================
// MAIN
// =====================
(async () => {
  const imaxMovies = await scrapeImaxMovies();

  console.log("🎬 Películas IMAX hoy:");
  imaxMovies.forEach(m => console.log(" -", m.title));

  const todayMovies = uniqByTitle(imaxMovies);
  
  console.log(`\n📊 Después de deduplicar: ${todayMovies.length} películas únicas`);
  todayMovies.forEach(m => console.log(` - ${m.filmId}: ${m.title}`));

  let previousMovies = [];
  if (fs.existsSync(SNAPSHOT_FILE)) {
    previousMovies = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
    console.log(`\n📂 Snapshot encontrado con ${previousMovies.length} películas`);
    console.log("Previous IDs:", previousMovies.map(m => m.filmId));
  } else {
    console.log("\n⚠️ No se encontró snapshot anterior");
  }

  console.log("Today IDs:", todayMovies.map(m => m.filmId));

  const prevIds = new Set(previousMovies.map(m => m.filmId));
  const todayIds = new Set(todayMovies.map(m => m.filmId));

  const added = todayMovies.filter(m => !prevIds.has(m.filmId));
  const removed = previousMovies.filter(m => !todayIds.has(m.filmId));

  console.log("\n🆕 Agregadas:", added.map(m => m.title));
  console.log("❌ Quitadas:", removed.map(m => m.title));

  // Guardar snapshot nuevo
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(todayMovies, null, 2));

  // =====================
  // TELEGRAM
  // =====================
  if (added.length === 0 && removed.length === 0) {
    console.log("ℹ️ No hay cambios, no se envía Telegram");
    return;
  }

  let message = "🎬 *Cambios en IMAX - Showcase*\n\n";

  if (added.length) {
    message += "🆕 *Agregadas:*\n";
    added.forEach(m => {
      message += `• ${m.title}\n`;
    });
    message += "\n";
  }

  if (removed.length) {
    message += "❌ *Quitadas:*\n";
    removed.forEach(m => {
      message += `• ${m.title}\n`;
    });
  }

  console.log("🚀 Enviando notificación...");
  await sendTelegramMessage(message);
})();