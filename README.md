# 🎬 IMAX Showcase Bot

Bot that monitors the **Showcase Argentina** IMAX schedule and sends you a weekly Telegram report with programming changes.

## 📋 What does it do?

- 🔍 Scrapes the [Showcase](https://www.todoshowcase.com/) page every Thursday at 10 AM (Argentina time)
- 📊 Detects movies added or removed from the IMAX schedule
- 📨 Sends you a weekly Telegram report with:
  - ✅ New movies in IMAX
  - ❌ Movies that were removed
  - 📽️ Complete list of current movies (if there are no changes)

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

Done! The bot will run automatically every Thursday at 10 AM 🇦🇷

## 🧪 Test it manually

1. Go to **Actions** → **IMAX Showcase Bot 2**
2. Click on **Run workflow** → **Run workflow**
3. You should receive a message on Telegram in less than 1 minute

## 📁 Project Structure
```
imax-scraper/
├── .github/
│   └── workflows/
│       └── scrape.yml          # Cron job configuration
├── scrape-imax.mjs             # Main script
├── package.json                # Dependencies
├── imax_snapshot.json          # Movie snapshot (auto-generated)
└── README.md
```

## 📨 Message Example

### No changes:
```
🎬 Weekly IMAX Report - Showcase

✅ No changes in the schedule

📽️ 6 movies in IMAX:
- Wuthering Heights
- Twenty One Pilots: More Than We Ever Imagined
- Stray Kids: The dominATE Experience
- Avatar: Fire and Ash
- One Fight After Another
- Sinners
```

### With changes:
```
🎬 Weekly IMAX Report - Showcase

🆕 Added:
- Dune: Part Three

❌ Removed:
- Sinners

📽️ Total: 6 movies in IMAX
```

## ⚙️ Configuration

### Change the schedule

Edit `.github/workflows/scrape.yml`:
```yaml
schedule:
  - cron: "0 13 * * 4"   # Thursday 10 AM ARG
```

Examples:
- Every day 9 AM ARG: `"0 12 * * *"`
- Monday and Friday 8 AM ARG: `"0 11 * * 1,5"`

### Change frequency

The bot currently runs **once a week (Thursday)**. To change the frequency, modify the `cron` in the workflow.

## 🛠️ Technologies

- **Node.js 18** - Runtime
- **Playwright** - Web scraping
- **GitHub Actions** - Automation
- **Telegram Bot API** - Notifications

## 📝 Notes

- The bot only tracks movies in **IMAX** format
- The snapshot is automatically saved in the repository
- No server required - runs 100% on GitHub Actions (free)

## 🐛 Troubleshooting

### I'm not receiving any messages
- Verify that the secrets are configured correctly
- Make sure you've sent at least one message to your bot
- Check the logs in **Actions** to see if there are any errors

### The bot says all movies are new
- This is normal the first time it runs
- From the second execution onwards it should work correctly

## 📄 License

MIT

## 🤝 Contributions

Pull requests are welcome. For major changes, please open an issue first.

---

Made with ❤️ for IMAX fans