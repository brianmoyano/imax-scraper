# Contexto: automatizaciones de cartelera y turnos (IMAX / Cinemark / Unión Personal)

Este repo (`imax-scraper`) es una de tres piezas de un mismo setup de automatización personal.
Las tres corren juntas en una Raspberry Pi en casa, no en GitHub Actions. Esta nota existe para
que una conversación nueva (o vos mismo en unos meses) tenga el panorama completo sin tener que
reconstruirlo de cero.

## ⚠️ Este checkout local está atrasado

Al momento de escribir esto, este clone local (`~/projects/showcase-scrapper`) estaba **131
commits detrás de `origin/main`** — todavía tenía `scrape-imax.mjs` / `imax_snapshot.json`
(la versión vieja basada en Playwright/scraping HTML). La versión actual en GitHub y en la Pi
usa `check-imax.mjs` / `imax_estado.json` y pega directo a una API JSON, sin navegador. Hacé
`git pull` antes de asumir que lo que ves en disco acá es lo que corre en producción.

## Las tres piezas

| Repo | Qué trackea | Cómo | Dónde corre |
|---|---|---|---|
| **imax-scraper** (este repo) | Cartelera IMAX de Showcase Argentina (única sala: IMAX Theatre Norcenter, house_id 3250) | `fetch()` directo a la API no documentada `api.voyalcine.net` — sin navegador, sin dependencias | Pi, cron cada 10 min |
| **turnos-up** | Turnos médicos disponibles en el portal de Unión Personal, 2 cuentas | Playwright (login + lectura de calendario) | Pi, cron cada 10 min. El cron de GitHub Actions está deshabilitado (se dejó `workflow_dispatch` para disparo manual) |
| **cinemark-tracker** | Cartelera + preventa de Cinemark Hoyts (Parque Brown) | Playwright — Cinemark no tiene API pública, es una app Next.js que arma los datos en el servidor (RSC), no hay JSON consumible | Pi únicamente, nunca tuvo GitHub Actions |

Los tres viven en `~/imax-scraper`, `~/turnos-up`, `~/cinemark-tracker` en la Pi, y se disparan
desde **una sola entrada de crontab** que llama a `~/run-checks.sh`, un script orquestador que
los corre secuencialmente (imax-scraper → cinemark-tracker → turnos-up) para que nunca compitan
por CPU/memoria al mismo tiempo. Cada uno loguea a su propio `cron.log` dentro de su carpeta.

## Acceso a la Pi

- Host: `turnos-up.local` (mDNS, resuelve solo si estás en la misma red que la Pi)
- Usuario: `brian`
- Acceso por clave SSH (ed25519, generada y copiada a `~/.ssh/authorized_keys` de la Pi) — no
  hace falta contraseña.

## Telegram: dos bots distintos, no mezclar

- **`@imax_scraper_bot`** (chat id `1601918157`) — usado por `imax-scraper` **y**
  `cinemark-tracker`. Es el bot de "cosas de cine".
- **Un bot separado** (configurado en el `.env` de `turnos-up` en la Pi y en los GitHub Secrets
  de ese repo) — usado solo por `turnos-up`, para turnos médicos.

Este mezclado ya se dio una vez por error (se copiaron las credenciales de `turnos-up` a
`imax-scraper` sin querer) y se corrigió. Si algo empieza a mandar avisos de cine al bot de
turnos (o viceversa), revisar los `.env` de cada proyecto en la Pi.

## Decisiones que vale la pena recordar

- **Por qué se migró de GitHub Actions a la Pi**: para consolidar todo en un solo lugar y evitar
  depender de que GitHub Actions tenga IPs de datacenter que algunos sitios (como el portal de
  Unión Personal) podían eventualmente bloquear.
- **Por qué Cinemark usa Playwright y no una API**: se investigó — el sitio es Next.js con
  React Server Components, los datos vienen en el protocolo interno de streaming RSC del
  framework, no hay un endpoint JSON público como sí tiene Showcase (`voyalcine`).
- **`turnos-up` / Cuenta 2 / "Estudios Cardiológicos"**: deshabilitado a propósito, comentado en
  `src/scraper.ts` de `turnos-up` (no borrado) para poder reactivarlo rápido si hace falta.
- Los snapshots de estado (`imax_estado.json`, `cinemark_estado.json`, `state.json` de
  turnos-up) son cachés de "qué ya avisé" — no hay drama en borrarlos si hace falta forzar una
  corrida limpia, el propio script los regenera solo.
