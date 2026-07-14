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
const FILM_ID = 5875;
const HOUSE_ID = 3250;
const FILM_NAME = "La Odisea";
const API_URL = `https://api.voyalcine.net/films/${FILM_ID}/tree/${HOUSE_ID}`;
const SNAPSHOT_FILE = `imax_${FILM_ID}_funciones.json`;

// =====================
// HELPERS
// =====================
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

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// =====================
// FETCH FUNCIONES
// =====================
async function fetchFunciones() {
  console.log(`🌐 Consultando ${API_URL}...`);
  const res = await fetch(API_URL);

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  // Aplanamos a { "YYYY-MM-DD": ["HH:MM", ...] }
  const funciones = {};
  for (const [date, theaters] of Object.entries(data.days || {})) {
    const times = new Set();
    for (const theater of theaters) {
      for (const format of theater.formats || []) {
        for (const perf of format.performances || []) {
          times.add(perf.showTime);
        }
      }
    }
    funciones[date] = [...times].sort();
  }

  return funciones;
}

// =====================
// MAIN
// =====================
(async () => {
  const current = await fetchFunciones();
  const currentDates = Object.keys(current).sort();
  console.log(`✅ ${currentDates.length} fechas encontradas para "${FILM_NAME}"`);

  let previous = {};
  let hasPreviousSnapshot = false;
  if (fs.existsSync(SNAPSHOT_FILE)) {
    previous = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
    hasPreviousSnapshot = true;
    console.log(`📂 Snapshot encontrado con ${Object.keys(previous).length} fechas`);
  } else {
    console.log("⚠️ No se encontró snapshot anterior (primera corrida)");
  }

  const newDates = [];
  const newTimesByDate = {};

  for (const date of currentDates) {
    if (!(date in previous)) {
      newDates.push(date);
      continue;
    }
    const prevTimes = new Set(previous[date]);
    const added = current[date].filter((t) => !prevTimes.has(t));
    if (added.length) {
      newTimesByDate[date] = added;
    }
  }

  // Guardar snapshot nuevo
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(current, null, 2));

  const hasChanges = newDates.length > 0 || Object.keys(newTimesByDate).length > 0;

  if (!hasPreviousSnapshot) {
    console.log("ℹ️ Primera corrida: se guarda el snapshot base, no se envía mensaje.");
    return;
  }

  if (!hasChanges) {
    console.log("ℹ️ Sin funciones nuevas. No se envía mensaje.");
    return;
  }

  let message = `🎬 *Nuevas funciones IMAX - ${FILM_NAME}*\n\n`;

  if (newDates.length) {
    message += "🆕 *Nuevas fechas:*\n";
    for (const date of newDates) {
      message += `• ${formatDate(date)}: ${current[date].join(", ")}\n`;
    }
    message += "\n";
  }

  if (Object.keys(newTimesByDate).length) {
    message += "🕐 *Nuevos horarios en fechas existentes:*\n";
    for (const [date, times] of Object.entries(newTimesByDate)) {
      message += `• ${formatDate(date)}: ${times.join(", ")}\n`;
    }
  }

  console.log("🚀 Enviando aviso de funciones nuevas...");
  await sendTelegramMessage(message);
})();
