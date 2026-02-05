import fs from "fs";

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
const IMAX_URL = "https://www.cinemarkhoyts.com.ar/cartelera/imax";

// =====================
// HELPERS
// =====================
function uniqByTitle(movies) {
  const map = new Map();
  for (const m of movies) {
    map.set(m.title, m);
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
// SCRAPER (mock simple)
// =====================
// ⛔️ ACÁ normalmente iría Playwright
// ⛔️ dejo mockeado para que el flujo sea claro
const imaxMovies = [
  { filmId: "1", title: "Avatar: fuego y cenizas" },
  { filmId: "2", title: "Cumbres borrascosas" },
  { filmId: "3", title: "Pecadores" },
];

// =====================
// MAIN
// =====================
(async () => {
  console.log("🎬 Películas IMAX hoy:");
  imaxMovies.forEach(m => console.log(" -", m.title));

  const todayMovies = uniqByTitle(imaxMovies);

  let previousMovies = [];
  if (fs.existsSync(SNAPSHOT_FILE)) {
    previousMovies = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
  }

  const prevIds = new Set(previousMovies.map(m => m.filmId));
  const todayIds = new Set(todayMovies.map(m => m.filmId));

  const added = todayMovies.filter(m => !prevIds.has(m.filmId));
  const removed = previousMovies.filter(m => !todayIds.has(m.filmId));

  console.log("🆕 Agregadas:", added.map(m => m.title));
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

  let message = "🎬 *Cambios en IMAX*\n\n";

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

  console.log("🚀 Voy a mandar Telegram");
  await sendTelegramMessage(message);
})();
