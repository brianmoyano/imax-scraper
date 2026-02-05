const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.join(__dirname, 'imax_snapshot.json');

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
        map.set(filmId, {
          filmId,
          title,
        });
      }
    });

    return Array.from(map.values());
  });

  await browser.close();

  // 2️⃣ Leer snapshot anterior
  let previousMovies = [];
  if (fs.existsSync(SNAPSHOT_PATH)) {
    previousMovies = JSON.parse(
      fs.readFileSync(SNAPSHOT_PATH, 'utf-8')
    );
  }

  // Convertimos a sets de filmId
  const prevIds = new Set(previousMovies.map(m => m.filmId));
  const currIds = new Set(currentMovies.map(m => m.filmId));

  // 3️⃣ Detectar cambios
  const added = currentMovies.filter(m => !prevIds.has(m.filmId));
  const removed = previousMovies.filter(m => !currIds.has(m.filmId));

  // 4️⃣ Output
  console.log('\n📌 Resumen de cambios IMAX');

  if (added.length === 0 && removed.length === 0) {
    console.log('➡️  No hubo cambios desde la última ejecución');
  } else {
    if (added.length > 0) {
      console.log('\n🟢 Películas agregadas:');
      added.forEach(m => console.log(`+ ${m.title}`));
    }

    if (removed.length > 0) {
      console.log('\n🔴 Películas removidas:');
      removed.forEach(m => console.log(`- ${m.title}`));
    }
  }

  // 5️⃣ Listado completo actual
  console.log('\n🎥 Cartelera IMAX actual:');
  currentMovies.forEach(m => {
    console.log(`• ${m.title}`);
  });

  // 6️⃣ Guardar snapshot nuevo
  fs.writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify(currentMovies, null, 2)
  );

  console.log('\n💾 Snapshot actualizado');
})();
