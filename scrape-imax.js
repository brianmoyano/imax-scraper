import fs from "fs";

const SNAPSHOT_FILE = "imax_snapshot.json";

// películas IMAX actuales (array de strings)
const todayMovies = imaxMovies.map(m => m.title).sort();

let yesterdayMovies = [];

if (fs.existsSync(SNAPSHOT_FILE)) {
  yesterdayMovies = JSON.parse(
    fs.readFileSync(SNAPSHOT_FILE, "utf-8")
  );
}

// comparación
const added = todayMovies.filter(m => !yesterdayMovies.includes(m));
const removed = yesterdayMovies.filter(m => !todayMovies.includes(m));

// 👉 acá mandás Telegram
if (added.length || removed.length) {
  let message = "🎬 IMAX Showcase – Cambios\n\n";

  if (added.length) {
    message += "➕ Agregadas:\n";
    added.forEach(m => (message += `• ${m}\n`));
    message += "\n";
  }

  if (removed.length) {
    message += "➖ Quitadas:\n";
    removed.forEach(m => (message += `• ${m}\n`));
    message += "\n";
  }

  message += "\n📋 Cartelera actual:\n";
  todayMovies.forEach(m => (message += `• ${m}\n`));

  await sendTelegramMessage(message);
} else {
  await sendTelegramMessage(
    "🎬 IMAX Showcase\n\nSin cambios respecto a ayer.\n\n" +
    todayMovies.map(m => `• ${m}`).join("\n")
  );
}

// guardar snapshot para mañana
fs.writeFileSync(
  SNAPSHOT_FILE,
  JSON.stringify(todayMovies, null, 2)
);
