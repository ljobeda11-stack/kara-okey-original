# 🎤 KARA-OKEY — Feature Improvement Plan

After a deep dive into every file in the codebase, here's what's already excellent and what would take this from great to *unforgettable*.

---

## ✅ What's Already Strong

| Area | Assessment |
|------|-----------|
| **Dual-view architecture** (TV + Phone) | Perfectly split — TV is hands-free, phone is the remote |
| **Real-time SSE sync** | Solid pub/sub with auto-reconnect |
| **Song search + karaoke resolver** | Smart — queries resolve to real karaoke videos, not hardcoded IDs |
| **Voting + drag-reorder** | Crowd democracy with manual override |
| **Cheers + celebrations** | Web Audio synthesized sounds, confetti, floating emojis — zero audio files |
| **Glassmorphism design system** | Premium dark theme with neon accents, custom fonts, particles |
| **Unplayable video recovery** | Auto-blacklist + swap to another karaoke version |
| **Zero-config local dev** | Works out of the box, no API keys needed |

---

## 🚀 Proposed Improvements — 6 Features

### Feature 1: 🎤 Duet Mode — Sing Together

**The Problem:** Right now, every song has exactly one singer name attached to it. In real karaoke parties, people sing duets and group songs *all the time*.

**What It Adds:**
- When queueing a song, a guest can mark it as a **Duet** or **Group** performance
- Other guests see a "**Join This Song**" button next to duet-tagged queue items
- The TV stage overlay shows **all singer names** (e.g., `🎤 gwapoko & StarDust420`)
- A duet has a cap of 2 singers; group mode allows up to 4

**Files Changed:**
| File | Change |
|------|--------|
| [store.js](file:///d:/KARA-OKEY/src/lib/store.js) | Add `mode` field (`solo`/`duet`/`group`) and `coSingers[]` to queue items; new `joinSong()` function |
| [QueueTab.js](file:///d:/KARA-OKEY/src/components/guest/QueueTab.js) | Show "Join" button for duet/group items that aren't full |
| [SearchTab.js](file:///d:/KARA-OKEY/src/components/guest/SearchTab.js) | Add duet/group toggle when queueing a song |
| [StageOverlay.js](file:///d:/KARA-OKEY/src/components/host/StageOverlay.js) | Display multiple singer badges |
| New: `api/room/[code]/join-song/route.js` | API endpoint to join an existing queue item |

**Complexity:** Medium · **Impact:** High — this is the #1 thing karaoke apps are missing

---

### Feature 2: 🏆 Singer Leaderboard & Stats

**The Problem:** There's no sense of progression or friendly competition. People sing a song and it vanishes from memory. The `history` array exists in [store.js](file:///d:/KARA-OKEY/src/lib/store.js#L28) but is never exposed to anyone.

**What It Adds:**
- **TV Idle Screen:** A live, animated leaderboard showing tonight's top singers ranked by songs performed + total cheers received
- **Guest Profile Tab:** Personal stats card — songs sung tonight, total cheers, "Most Popular Song"
- **Post-song celebration:** Shows the singer's rank update (e.g., `⬆️ gwapoko is now #1 tonight!`)

**Files Changed:**
| File | Change |
|------|--------|
| [store.js](file:///d:/KARA-OKEY/src/lib/store.js) | Track `singerStats` map (`{ songCount, cheerCount, lastSong }`) per singer name; update on `advanceQueue()` and `sendCheer()` |
| [IdleScreen.js](file:///d:/KARA-OKEY/src/components/host/IdleScreen.js) | Add animated leaderboard section below the QR code |
| [ProfileTab.js](file:///d:/KARA-OKEY/src/components/guest/ProfileTab.js) | Show personal stats card with songs sung and cheers received |
| [CelebrationOverlay.js](file:///d:/KARA-OKEY/src/components/host/CelebrationOverlay.js) | Include rank change in post-song celebration |
| New: `api/room/[code]/stats/route.js` | API endpoint to fetch leaderboard data |

**Complexity:** Medium · **Impact:** High — gamification keeps people engaged for hours

---

### Feature 3: 📱 "Now Playing" Live Card on Guest Phones

**The Problem:** When a guest is on the Search or Favorites tab, they have *no idea* what's currently playing on the TV without switching to the Queue tab. The TV is across the room — they're staring at their phone.

**What It Adds:**
- A **persistent mini "Now Playing" bar** pinned above the bottom navigation on every tab (not just Queue)
- Shows: thumbnail, song title (scrolling marquee if long), singer name, and a progress indicator
- Tapping it expands to show: lyrics link (YouTube), skip button, cheer shortcuts
- Collapses to a thin neon strip when the user scrolls down to browse songs

**Files Changed:**
| File | Change |
|------|--------|
| New: `components/guest/NowPlayingBar.js` | Floating mini-player component with expand/collapse |
| [join/[code]/page.js](file:///d:/KARA-OKEY/src/app/join/%5Bcode%5D/page.js) | Render `NowPlayingBar` between content and `BottomNav`; pass `nowPlaying` state |
| [globals.css](file:///d:/KARA-OKEY/src/app/globals.css) | Add marquee animation and mini-player styles |

**Complexity:** Low · **Impact:** High — solves a real UX blind spot

---

### Feature 4: 🎵 Song Preview & Countdown Timer

**The Problem:** Guests queue songs blind — they can't hear a preview before committing. Also, when a song is *about* to play (they're #1 in queue), there's no "get ready" signal. The TV just jumps to the next video.

**What It Adds:**
- **30-second song preview** — a small play button on each `SongCard` that opens a YouTube embed in a bottom sheet (on the phone only), so guests can verify it's the right karaoke version before queueing
- **"You're Up Next!" notification** — when a guest's song moves to #1 in queue, their phone vibrates (Vibration API) and shows a fullscreen countdown: `🎤 GET READY! You're singing in 3… 2… 1…`
- **TV countdown between songs** — instead of an instant jump-cut to the next video, show a 5-second animated transition with the next singer's name and song title

**Files Changed:**
| File | Change |
|------|--------|
| New: `components/guest/SongPreview.js` | Bottom sheet with a small YouTube embed for preview |
| [SongCard.js](file:///d:/KARA-OKEY/src/components/guest/SongCard.js) | Add preview play button |
| New: `components/guest/UpNextAlert.js` | Fullscreen "You're Up!" countdown overlay |
| [join/[code]/page.js](file:///d:/KARA-OKEY/src/app/join/%5Bcode%5D/page.js) | Detect when user's song is #1; trigger countdown + vibration |
| New: `components/host/SongTransition.js` | Animated inter-song transition screen for the TV |
| [page.js](file:///d:/KARA-OKEY/src/app/page.js) | Insert `SongTransition` between song endings |
| [globals.css](file:///d:/KARA-OKEY/src/app/globals.css) | Countdown timer animations |

**Complexity:** Medium-High · **Impact:** Very High — transforms the experience from functional to *theatrical*

---

### Feature 5: 🎨 Themed Party Modes

**The Problem:** The app looks the same every session. Parties have themes — 80s night, Disney night, Valentine's karaoke, Halloween, etc. There's no way to match the vibe.

**What It Adds:**
- **Party theme selector** on the host idle screen (before any songs are playing)
- Themes change: color palette, particle effects, mascot outfit, celebration messages, and the default playlist filter
- Built-in themes:
  - 🎉 **Classic Neon** (current default)
  - 🕺 **Retro Disco** — gold/orange/warm tones, disco ball particles
  - 🌊 **Ocean Chill** — teal/blue gradient, wave particles
  - 🎃 **Spooky Night** — orange/green, bat particles, Halloween praise messages
  - 💖 **Love Songs** — pink/red, heart particles, romance-themed celebrations
- Theme syncs to all connected guest phones via SSE

**Files Changed:**
| File | Change |
|------|--------|
| New: `lib/themes.js` | Theme definitions (CSS variable overrides, particle configs, praise sets) |
| [globals.css](file:///d:/KARA-OKEY/src/app/globals.css) | CSS custom property structure to support theme swapping |
| [IdleScreen.js](file:///d:/KARA-OKEY/src/components/host/IdleScreen.js) | Theme picker UI |
| [store.js](file:///d:/KARA-OKEY/src/lib/store.js) | Add `theme` field to room state; broadcast on change |
| [ParticleBackground.js](file:///d:/KARA-OKEY/src/components/shared/ParticleBackground.js) | Theme-aware particle shapes and colors |
| [CelebrationOverlay.js](file:///d:/KARA-OKEY/src/components/host/CelebrationOverlay.js) | Theme-specific praise messages and confetti colors |
| [layout.js](file:///d:/KARA-OKEY/src/app/layout.js) | Apply theme CSS variables to `<html>` |

**Complexity:** Medium · **Impact:** High — instant wow factor, replayability, and social media shareability

---

### Feature 6: 🗑️ Remove Song from Queue + Host Controls Panel

**The Problem:** The `removeFromQueue()` function already exists in [store.js](file:///d:/KARA-OKEY/src/lib/store.js#L210-L222) but **nothing in the UI calls it**. Guests can accidentally queue the wrong song and there's no way to undo it. Also, the host (TV) has no admin controls at all — they can only skip.

**What It Adds:**
- **Guest side:** Swipe-to-delete on songs *they* queued (not others'), with an undo toast
- **Host controls panel** (accessible via a subtle gear icon on the TV idle screen):
  - Remove any song from queue
  - Clear entire queue
  - Lock/unlock queue (prevent new additions during a break)
  - Kick song (remove + blacklist for this session)
  - Set "Max songs per guest" limit (prevents one person hogging the queue)
- Protected by a simple 4-digit PIN that the host sets on first launch

**Files Changed:**
| File | Change |
|------|--------|
| [QueueTab.js](file:///d:/KARA-OKEY/src/components/guest/QueueTab.js) | Add swipe-to-delete for own songs; undo toast |
| New: `api/room/[code]/queue/remove/route.js` | API endpoint for song removal |
| New: `components/host/HostControlsPanel.js` | Full admin panel overlay |
| [HostControls.js](file:///d:/KARA-OKEY/src/components/host/HostControls.js) | Gear icon to open the admin panel |
| [store.js](file:///d:/KARA-OKEY/src/lib/store.js) | Add `locked`, `maxPerGuest`, `hostPin` fields; `clearQueue()`, `lockQueue()` functions |
| [IdleScreen.js](file:///d:/KARA-OKEY/src/components/host/IdleScreen.js) | Render gear icon for host controls |

**Complexity:** Medium · **Impact:** High — essential for real-world party management

---

## 📋 Suggested Priority Order

| Priority | Feature | Why First |
|----------|---------|-----------|
| **1** | 🗑️ Remove Song + Host Controls | Fixes a real usability gap — the `removeFromQueue` function is already written but unused |
| **2** | 📱 Now Playing Bar | Low effort, huge UX improvement — guests always know what's happening |
| **3** | 🎵 Song Preview & Countdown | Makes the transition between songs feel cinematic |
| **4** | 🏆 Singer Leaderboard | Adds addictive gamification that keeps the party going |
| **5** | 🎤 Duet Mode | The killer social feature — but needs careful queue state changes |
| **6** | 🎨 Themed Party Modes | The polish feature — best saved for when everything else is solid |

---

## 🤔 Questions Before We Start

1. **Which feature(s) do you want to build first?** I can start with any of the 6, or tackle them in priority order.
2. **Should we build all 6, or pick a subset?** Each is independent — no feature depends on another.
3. **Any of these spark a different idea?** Happy to modify or combine.
