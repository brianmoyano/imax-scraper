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
const API_BASE = "https://api.voyalcine.net";
const IMAX_HOUSE_ID = 3250; // IMAX Theatre (Norcenter) — única sala IMAX del circuito
const SNAPSHOT_FILE = "imax_estado.json";

// =====================
// HELPERS
// =====================
async function fetchJSON(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) {
    throw new Error(`API error ${res.status} en ${path}`);
  }
  return res.json();
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

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Aplana days → { "YYYY-MM-DD": ["HH:MM", ...] }, juntando todos los formatos de la sala
function flattenDays(days) {
  const flat = {};
  for (const [date, theaters] of Object.entries(days || {})) {
    const times = new Set();
    for (const theater of theaters) {
      for (const format of theater.formats || []) {
        for (const perf of format.performances || []) {
          times.add(perf.showTime);
        }
      }
    }
    flat[date] = [...times].sort();
  }
  return flat;
}

// =====================
// OBTENER ESTADO ACTUAL DE IMAX
// =====================
async function fetchImaxState() {
  console.log("🌐 Consultando cartelera...");
  const allFilms = await fetchJSON("/films");
  console.log(`✅ ${allFilms.length} películas en cartelera`);

  const state = {};
  for (const film of allFilms) {
    const tree = await fetchJSON(`/films/${film.id}/tree/${IMAX_HOUSE_ID}`);
    const days = flattenDays(tree.days);
    if (Object.keys(days).length > 0) {
      state[film.id] = { name: film.name, days };
    }
  }
  return state;
}

// =====================
// MAIN
// =====================
(async () => {
  const current = await fetchImaxState();
  const currentIds = Object.keys(current);
  console.log(
    `🎬 ${currentIds.length} películas en IMAX ahora: ${currentIds
      .map((id) => current[id].name)
      .join(", ")}`
  );

  let previous = {};
  let hasPreviousSnapshot = false;
  if (fs.existsSync(SNAPSHOT_FILE)) {
    previous = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
    hasPreviousSnapshot = true;
    console.log(`📂 Snapshot anterior con ${Object.keys(previous).length} películas`);
  } else {
    console.log("⚠️ No se encontró snapshot anterior (primera corrida)");
  }
  const previousIds = Object.keys(previous);

  const addedFilms = currentIds.filter((id) => !previousIds.includes(id));
  const removedFilms = previousIds.filter((id) => !currentIds.includes(id));

  // Nuevas funciones (fechas/horarios) solo para películas que ya veníamos trackeando
  // — las películas recién agregadas a IMAX ya se reportan en "Nuevas películas"
  const newFunctionsByFilm = {};
  for (const id of currentIds) {
    if (!previousIds.includes(id)) continue;

    const prevDays = previous[id].days || {};
    const curDays = current[id].days;
    const newDates = [];
    const newTimesByDate = {};

    for (const date of Object.keys(curDays)) {
      if (!(date in prevDays)) {
        newDates.push({ date, times: curDays[date] });
        continue;
      }
      const prevTimes = new Set(prevDays[date]);
      const added = curDays[date].filter((t) => !prevTimes.has(t));
      if (added.length) newTimesByDate[date] = added;
    }

    if (newDates.length || Object.keys(newTimesByDate).length) {
      newFunctionsByFilm[id] = { name: current[id].name, newDates, newTimesByDate };
    }
  }

  // Guardar snapshot nuevo
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(current, null, 2));

  if (!hasPreviousSnapshot) {
    console.log("ℹ️ Primera corrida: se guarda el snapshot base, no se envía mensaje.");
    return;
  }

  const hasChanges =
    addedFilms.length > 0 ||
    removedFilms.length > 0 ||
    Object.keys(newFunctionsByFilm).length > 0;

  if (!hasChanges) {
    console.log("ℹ️ Sin cambios en IMAX. No se envía mensaje.");
    return;
  }

  let message = "🎬 *IMAX Showcase - Actualización*\n\n";

  if (addedFilms.length) {
    message += "🆕 *Nuevas películas en IMAX:*\n";
    for (const id of addedFilms) {
      message += `• ${current[id].name}\n`;
    }
    message += "\n";
  }

  if (removedFilms.length) {
    message += "❌ *Salieron de IMAX:*\n";
    for (const id of removedFilms) {
      message += `• ${previous[id].name}\n`;
    }
    message += "\n";
  }

  if (Object.keys(newFunctionsByFilm).length) {
    message += "🕐 *Nuevas funciones:*\n";
    for (const { name, newDates, newTimesByDate } of Object.values(newFunctionsByFilm)) {
      message += `*${name}*\n`;
      for (const { date, times } of newDates) {
        message += `  • ${formatDate(date)}: ${times.join(", ")}\n`;
      }
      for (const [date, times] of Object.entries(newTimesByDate)) {
        message += `  • ${formatDate(date)}: ${times.join(", ")} (horario nuevo)\n`;
      }
    }
  }

  console.log("🚀 Enviando aviso...");
  await sendTelegramMessage(message.trim());
})();
