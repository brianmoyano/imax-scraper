# 🎬 IMAX Showcase Bot

Bot that monitors the **Showcase Argentina** IMAX schedule (movies, dates and showtimes) and sends you a Telegram alert whenever something changes.

## 📋 What does it do?

- 🌐 Queries the undocumented [voyalcine](https://api.voyalcine.net) JSON API that powers the Showcase ticketing site every 30 minutes — no browser/scraping involved
- 📊 Detects:
  - 🆕 Movies added to or ❌ removed from the IMAX lineup
  - 🕐 New dates or showtimes added for movies already tracked
- 📨 Sends a Telegram message **only when something actually changed** — silent otherwise

## 🚀 Installation

### 1️⃣ Create your Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send the command `/newbot`
3. Choose a name for your bot (e.g., "IMAX Tracker")
4. Choose a username (must end with `bot`, e.g., `imax_tracker_bot`)
5. **Save the token** that BotFather gives you (something like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2️⃣ Get your Chat ID

1. Send any message to your newly created bot
2. Open this URL in your browser (replace `YOUR_TOKEN` with the token from the previous step):
```
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
```
3. Look for the number in `"chat":{"id":123456789}`
4. **Save that number** - it's your Chat ID

### 3️⃣ Fork and Repository Configuration

1. **Fork** this repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Create two new secrets:
   - `TELEGRAM_BOT_TOKEN` → The token from BotFather
   - `TELEGRAM_CHAT_ID` → Your Chat ID (the number you obtained)

### 4️⃣ Enable GitHub Actions

1. Go to the **Actions** tab of your fork
2. Click on **"I understand my workflows, go ahead and enable them"**

Done! The bot will run automatically every 30 minutes 🇦🇷

## 🧪 Test it manually

1. Go to **Actions** → **IMAX Showcase Bot**
2. Click on **Run workflow** → **Run workflow**
3. If there are changes since the last run, you'll get a Telegram message in a few seconds

## 📁 Project Structure
```
imax-scraper/
├── .github/
│   └── workflows/
│       └── imax-bot.yml        # Cron job configuration (every 30 min)
├── check-imax.mjs              # Main script
├── package.json
├── imax_estado.json            # IMAX state snapshot (auto-generated)
└── README.md
```

## 📨 Message Example

Only sent when something changes — silent otherwise:
```
🎬 IMAX Showcase - Actualización

🆕 Nuevas películas en IMAX:
• Dune: Part Three

❌ Salieron de IMAX:
• Sinners

🕐 Nuevas funciones:
*La Odisea*
  • 05/08/2026: 15:25, 19:00, 22:35
  • 16/07/2026: 22:35 (horario nuevo)
```

## ⚙️ Configuration

### Change the frequency

Edit `.github/workflows/imax-bot.yml`:
```yaml
schedule:
  - cron: "*/30 * * * *"   # Every 30 minutes
```

Examples:
- Every hour: `"0 * * * *"`
- Every day at 9 AM ARG: `"0 12 * * *"`

### Track a different IMAX theatre

`check-imax.mjs` hardcodes `IMAX_HOUSE_ID = 3250`, the ewaveId for IMAX Theatre (Norcenter) — currently the only IMAX screen in the Showcase Argentina circuit. If that changes, find the new theatre's ewaveId by requesting `https://api.voyalcine.net/films/{any_film_id}/tree` (no house filter) and looking for the entry with `formatDescription` containing `IMAX`.

## 🛠️ Technologies

- **Node.js 18** - Runtime (plain `fetch`, no dependencies)
- **voyalcine JSON API** - Same backend the ticketing site itself calls, no scraping
- **GitHub Actions** - Automation
- **Telegram Bot API** - Notifications

## 📝 Notes

- The bot only tracks movies in **IMAX** format
- The snapshot is automatically saved in the repository
- No server required - runs 100% on GitHub Actions (free)
- On the very first run there's no previous snapshot to compare against, so it just saves the baseline silently — no message

## 🐛 Troubleshooting

### I'm not receiving any messages
- Verify that the secrets are configured correctly
- Make sure you've sent at least one message to your bot
- Check the logs in **Actions** to see if there are any errors
- If nothing has actually changed in the IMAX lineup, that's expected — the bot stays silent

## 📄 License

MIT

## 🤝 Contributions

Pull requests are welcome. For major changes, please open an issue first.

---

Made with ❤️ for IMAX fans