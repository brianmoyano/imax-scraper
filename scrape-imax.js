const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.join(__dirname, 'imax_snapshot.json');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️ Telegram no configurado, se omite envío');
    return;
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
}

(async () => {
  console.log('🎬 Ejecutando scraper IMAX Showcase');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.todoshowcase.com/', {
    waitUntil: 'networkidle',
  });

  await page.waitForSelector('.boxfilm');

  // 1️⃣ Scraping actual
  const currentMovies = await page.evaluate(() => {
    const map = new Map();

    const imaxCards = Array.from(document.querySelectorAll('.boxfilm'))
      .filter(card =>
        card.querySelector('.tresd p')?.textContent.trim() === 'IMAX'
      );

    imaxCards.forEach(card => {
      const linkEl = card.querySelector('.titulo-pelicula h2 a');
      if (!linkEl) return;

      const title = linkEl.textContent.trim();
      const url = linkEl.href;

      const match = url.match(/filmid=(\d+)/);
      if (!match) return;

      const filmId = match[1];

      if (!map.has(filmId)) {
        map.set(filmId, { filmId, title });
      }
    });

    return Array.from(map.values());
  });

  await browser.close();

  // 2️⃣ Snapshot anterior
  let previousMovies = [];
  if (fs.existsSync(SNAPSHOT_PATH)) {
    previousMovies = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  }

  const prevIds = new Set(previousMovies.map(m => m.filmId));
  const currIds = new Set(currentMovies.map(m => m.filmId));

  const added = currentMovies.filter(m => !prevIds.has(m.filmId));
  const removed = previousMovies.filter(m => !currIds.has(m.filmId));

  // 3️⃣ Armar mensaje
  let message = `🎬 <b>IMAX Showcase</b>\n`;

  if (added.length === 0 && removed.length === 0) {
    message += `\n➡️ Sin cambios desde ayer\n`;
  } else {
    if (added.length > 0) {
      message += `\n🟢 <b>Agregadas:</b>\n`;
      added.forEach(m => (message += `+ ${m.title}\n`));
    }

    if (removed.length > 0) {
      message += `\n🔴 <b>Removidas:</b>\n`;
      removed.forEach(m => (message += `- ${m.title}\n`));
    }
  }

  message += `\n🎥 <b>Cartelera IMAX actual:</b>\n`;
  currentMovies.forEach(m => (message += `• ${m.title}\n`));

  // 4️⃣ Enviar Telegram
  await sendTelegramMessage(message);

  // 5️⃣ Guardar snapshot
  fs.writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify(currentMovies, null, 2)
  );

  console.log('📨 Mensaje enviado a Telegram');
})();

console.log("ENV CHECK", {
  hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
  hasChatId: !!process.env.TELEGRAM_CHAT_ID
});