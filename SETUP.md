# Goals Progress Dashboard - Setup Guide

## 🚀 Quick Start (Windows 11)

### Prerequisites
- **Node.js** installed ([Download here](https://nodejs.org/))
  - Check if installed: Open Command Prompt and type `node -v`

### Step 1: Install Dependencies

Open Command Prompt in your project folder and run:

```bash
npm run install-all
```

This installs everything you need for both the backend and frontend.

### Step 2: Start the App

In the same Command Prompt, run:

```bash
npm run dev
```

You'll see output like:
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:3000`

### Step 3: Open in Browser

- **On your computer:** Go to `http://localhost:3000`
- The dashboard loads automatically and refreshes every 30 seconds

---

## 📱 View on iPhone

### Option 1: Same WiFi Network (Easiest)

1. **Find your computer's IP address:**
   - Open Command Prompt
   - Type: `ipconfig`
   - Look for "IPv4 Address" (something like `192.168.x.x`)

2. **On your iPhone:**
   - Open Safari
   - Type: `http://<YOUR-IP-ADDRESS>:3000`
   - Example: `http://192.168.1.100:3000`
   - Bookmark it for quick access!

### Option 2: Using Ngrok (Access from anywhere)

If you want to access from outside your home WiFi:

1. Download [ngrok](https://ngrok.com/download)
2. In Command Prompt, run: `ngrok http 3000`
3. You'll get a URL like `https://abc123.ngrok.io`
4. Use that URL on your iPhone

---

## 📊 How to Use

### Dashboard Tab
- **See your 4 income paths** at a glance
- **Revenue tracker** shows progress toward $5,000/month
- **Countdown timer** shows days until December 1, 2026

### Experiments Tab
- **Add new experiments** (click "+ New Experiment")
- **Update progress** - log revenue, hours, learnings
- **Track status** - Active, Paused, or Completed

### Today's Tasks Tab
- **Plan your day** - add must-do, should-do, nice-to-have tasks
- **Link to experiments** - connect tasks to your income paths
- **Check them off** - see your completion rate

---

## 🔧 Troubleshooting

**App won't start?**
- Make sure Node.js is installed: `node -v`
- Delete `node_modules` folder and run `npm run install-all` again

**Can't access on iPhone?**
- Both devices must be on the same WiFi network
- Check your computer's IP with `ipconfig`
- Make sure port 3000 isn't blocked by Windows Firewall

**Backend won't start?**
- SQLite database should be created automatically
- Delete `goals.db` and restart if having issues

---

## 📁 Project Structure

```
MilksSchmeat/
├── backend/          # Node.js API server
│   ├── server.js
│   ├── db.js         # SQLite database
│   ├── routes.js     # API endpoints
│   └── package.json
├── frontend/         # React dashboard
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── goals.db          # Your local database (created automatically)
```

---

## 💡 What Happens at 8:30 AM?

Currently, the app just logs that it's time for the daily update. Next phase will:
- Scan your other Claude conversations
- Extract progress on your goals
- Auto-update your experiments

For now, you manually log progress in the app.

---

## 📝 Sample Data

The app comes pre-populated with sample experiments for your 4 paths. Delete them and add your real experiments!

---

## 📰 Live News & Social Trends

The dashboard has two side panels:

- **Top 10 Social Trends** (left) — pulls live from Reddit's public feed. **No setup needed.**
- **Live Headlines** (right) — shows news with photos.

Both work out of the box with realistic content. To make the **news headlines fully live**, add a free NewsAPI key:

1. Go to **https://newsapi.org/register** and sign up (free, ~2 minutes)
2. Copy your API key from the dashboard
3. In the `backend` folder, make a copy of `.env.example` and name it `.env`
4. Open `.env` and paste your key after `NEWS_API_KEY=`
5. Restart the backend

Until you do this, the news panel shows sample articles with photos — the app works fine without it.

---

## 💾 Your Data is Local

Everything is stored in `goals.db` on your computer. Your data never leaves your machine unless you share the database file.

To backup: Just copy `goals.db` to a safe location.

---

## 🎯 Next Steps

1. ✅ Get the app running on your computer
2. ✅ Access it on your iPhone
3. ✅ Add your real experiments
4. ✅ Plan today's tasks
5. ✅ Check it daily!

**Questions?** The app is simple - experiment, fail fast, learn what works for you.

Good luck! 🚀
