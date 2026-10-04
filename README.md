# 🎤 KARA-OKEY — Real-Time Party Karaoke Web App

A modern, interactive party karaoke web application featuring dual synchronized views:
1. **TV Host View (`/`):** Full-screen YouTube video player, lyrics and singer badge, dynamic audio visualizer, live queue sidebar, and an interactive QR code.
2. **Mobile Guest View (`/join/[code]`):** Instant song search, queue management, live song voting, favorite songs bookmarks, and custom stage names.

---

## ✨ Features

- **No App Download Needed:** Guests just scan the TV's QR code on their phone camera and are instantly connected.
- **Zero API Keys Required for Local Dev:** Runs out of the box with a curated catalog of popular karaoke songs and in-memory Server-Sent Events (SSE) synchronization.
- **Interactive Song Voting:** Crowd members can upvote songs in the queue to boost them higher.
- **Auto-Advance Playback:** Seamlessly plays the next song when the current video finishes.
- **Custom YouTube Songs:** In addition to the curated library, guests can paste any YouTube link or video ID to sing whatever they like.
- **Modern Premium Glassmorphism:** Deep dark theme with glowing neon purple/pink accents, floating particles, and the cute party mascot **"OKEY"**.
- **Vercel-Ready Architecture:** Designed for easy serverless deployment.

---

## 🚀 How to Run Locally

### 1. Start the Development Server
Open your terminal in `d:\KARA-OKEY` and run:

```bash
npm run dev
```

### 2. Open the TV Host Screen
Open your browser and navigate to:
```
http://localhost:3000
```
You will see the **KARA-OKEY** party welcome screen with your unique 4-character Room Code (e.g. `H7K2`) and its QR code.

### 3. Open the Mobile Guest Controller
You can test this in two ways:
- **On your computer:** Click the **"Open Mobile View"** button in the top right of the host screen (or open `http://localhost:3000/join/<YOUR_ROOM_CODE>` in a mobile simulator or new tab).
- **On your mobile phone (same Wi-Fi):**
  1. Find your computer's local IP address (e.g., `192.168.1.50`).
  2. Run the dev server with host binding: `npm run dev -- -H 0.0.0.0`
  3. Scan the QR code with your phone camera!

---

## 🌐 Deploying to Vercel

> 💡 **New to GitHub and Vercel?** Check out our super beginner-friendly step-by-step guide: [DEPLOY_GUIDE.md](file:///d:/KARA-OKEY/DEPLOY_GUIDE.md)! No terminal commands needed.

When you are ready to deploy to Vercel:

### Step 1: Push your Code to GitHub
```bash
git init
git add .
git commit -m "feat: initial commit of KARA-OKEY web app"
git branch -M main
git remote add origin https://github.com/<your-username>/kara-okey.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** → **"Project"**.
3. Select your `kara-okey` GitHub repository.
4. Framework preset will automatically detect **Next.js**.

### Step 3: Configure Optional Environment Variables (in Vercel Project Settings)
The app works right away on single instances. For multi-instance scaling on Vercel serverless:
- **`YOUTUBE_API_KEY`**: Enables live YouTube search for millions of songs beyond the default curated hits. (Get a free key from Google Cloud Console → YouTube Data API v3).
- **`PUSHER_APP_ID`**, **`NEXT_PUBLIC_PUSHER_KEY`**, **`PUSHER_SECRET`**, **`NEXT_PUBLIC_PUSHER_CLUSTER`**: (Free tier on [pusher.com](https://pusher.com) allows up to 200,000 real-time messages/day).
- **`UPSTASH_REDIS_REST_URL`**, **`UPSTASH_REDIS_REST_TOKEN`**: (Free serverless Redis on [upstash.com](https://upstash.com) to persist queue across serverless function lifecycles).

Click **Deploy**!

---

## 📁 Project Structure

```
d:\KARA-OKEY\
├── public/
│   └── images/
│       └── okey-mascot.png       # Generated OKEY party mascot
├── src/
│   ├── app/
│   │   ├── layout.js            # Root layout with fonts & viewport
│   │   ├── page.js              # Host TV Stage (Player, Queue, QR)
│   │   ├── globals.css          # Glassmorphism & neon design system
│   │   ├── join/[code]/page.js  # Mobile Guest Controller view
│   │   └── api/
│   │       ├── room/            # Room creation, state, skip, and voting
│   │       └── search/          # Song search & YouTube matching
│   ├── components/
│   │   ├── host/                # VideoPlayer, NowPlaying, QueueSidebar, QRCodeDisplay
│   │   ├── guest/               # SearchTab, QueueTab, FavoritesTab, ProfileTab
│   │   └── shared/              # Logo, MascotImage, Toast, ParticleBackground
│   └── lib/
│       ├── store.js             # Real-time state & SSE broadcasting
│       └── demoSongs.js         # Curated karaoke hits with working YouTube IDs
├── next.config.js
└── package.json
```
