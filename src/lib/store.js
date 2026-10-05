// Universal In-Memory + Cloud Store for Real-Time Karaoke Rooms
// Attached to globalThis so state is preserved during Next.js hot-reloads and API calls
// Supports Upstash Redis / Vercel KV for multi-instance serverless deployments on Vercel

if (!globalThis._karaokeyRooms) {
  globalThis._karaokeyRooms = new Map();
}

const rooms = globalThis._karaokeyRooms;

// Upstash Redis / Vercel KV environment variables
const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  null;
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  null;

export function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createRoomShell(code) {
  return {
    code,
    createdAt: Date.now(),
    nowPlaying: null,
    queue: [],
    history: [],
    subscribers: new Set(),
    guestCount: 1,
    locked: false,
    maxPerGuest: 0, // 0 = unlimited
    hostPin: null, // Host admin PIN
    singerStats: {}, // { [name]: { songsSung: 0, cheersReceived: 0, lastSong: '' } }
    // true = placeholder fabricated for a code this instance had never seen.
    // Such a room must never be handed out as an authoritative snapshot.
    synthetic: false,
  };
}

// Create (or fetch) the in-memory room without touching the cloud store.
function ensureLocalRoom(roomCode) {
  const code = (roomCode || '').toUpperCase().trim();
  if (!rooms.has(code)) {
    rooms.set(code, createRoomShell(code));
  }
  const room = rooms.get(code);
  // Ensure backward compatibility
  if (room.locked === undefined) room.locked = false;
  if (room.maxPerGuest === undefined) room.maxPerGuest = 0;
  if (!room.singerStats) room.singerStats = {};
  if (room.guestCount === undefined || room.guestCount < 1) room.guestCount = 1;
  return room;
}

export function getOrCreateRoom(roomCode) {
  const code = (roomCode || '').toUpperCase().trim();
  const isNew = !rooms.has(code);
  const room = ensureLocalRoom(code);
  if (isNew) {
    // Attempt cloud recovery in background if cloud store is enabled
    hydrateRoomFromCloud(code).catch(() => {});
  }
  return room;
}

export function getRoom(roomCode) {
  const code = (roomCode || '').toUpperCase().trim();
  if (!code) return null;
  if (rooms.has(code)) {
    return rooms.get(code);
  }
  // On serverless environments (like Vercel), different Lambda containers can
  // handle host and guest requests. If a valid room code (3-8 alphanumeric
  // chars) is passed, auto-initialize the room so guests never get a 404
  // "Room not found" — but flag it as a synthetic placeholder so callers can
  // tell it apart from a room whose real state this instance actually holds.
  if (/^[A-Z0-9]{3,8}$/.test(code)) {
    const room = getOrCreateRoom(code);
    room.synthetic = true; // cleared as soon as a cloud snapshot arrives
    return room;
  }
  return null;
}

export async function resolveRoomCode(request, params) {
  const resolved = await Promise.resolve(params || {});
  let code = (resolved?.code || '').toUpperCase().trim();
  if (!code && request?.url) {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split('/').filter(Boolean);
      const idx = segments.indexOf('room');
      if (idx >= 0 && segments[idx + 1]) {
        code = segments[idx + 1].toUpperCase().trim();
      }
    } catch (e) {}
  }
  return code;
}

export function broadcastRoomEvent(roomCode, event, data) {
  const room = getRoom(roomCode);
  if (!room) return;

  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  const message = `event: ${event}\ndata: ${payload}\n\n`;

  for (const send of room.subscribers) {
    try {
      send(message);
    } catch (err) {
      room.subscribers.delete(send);
    }
  }

  // Trigger cloud sync in background
  syncRoomToCloud(roomCode).catch(() => {});
}

export function addSubscriber(roomCode, send) {
  const room = getRoom(roomCode);
  if (!room) return null;
  room.subscribers.add(send);
  room.guestCount = Math.max(room.subscribers.size, 1);
  broadcastRoomEvent(roomCode, 'guest_count', { guestCount: room.guestCount });

  return () => {
    room.subscribers.delete(send);
    room.guestCount = Math.max(room.subscribers.size, 1);
    broadcastRoomEvent(roomCode, 'guest_count', { guestCount: room.guestCount });
  };
}

export function addSongToQueue(roomCode, song, singerName = 'Guest Singer', options = {}) {
  const room = getOrCreateRoom(roomCode);

  // Check queue lock
  if (room.locked) {
    return { error: 'Queue is currently locked by the host.' };
  }

  const cleanSingerName = (singerName || 'Guest Singer').trim();

  // Check max per guest limit
  if (room.maxPerGuest > 0) {
    const userSongCount = room.queue.filter(
      (q) => (q.singerName || '').toLowerCase() === cleanSingerName.toLowerCase()
    ).length;
    if (userSongCount >= room.maxPerGuest) {
      return { error: `Queue limit reached: max ${room.maxPerGuest} song${room.maxPerGuest > 1 ? 's' : ''} per singer.` };
    }
  }

  const mode = options.mode || song.mode || 'solo'; // 'solo' | 'duet' | 'group'
  const maxSingers = mode === 'duet' ? 2 : mode === 'group' ? 4 : 1;
  const initialCoSingers = Array.isArray(options.coSingers) ? options.coSingers : [];

  const queueItem = {
    queueId: 'q_' + Math.random().toString(36).substring(2, 9),
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration || '3:30',
    thumbnail: song.thumbnail || `https://img.youtube.com/vi/${song.id}/hqdefault.jpg`,
    singerName: cleanSingerName,
    mode,
    maxSingers,
    coSingers: initialCoSingers,
    votes: 0,
    voters: [],
    addedAt: Date.now(),
  };

  // If nothing is playing, immediately play this song!
  if (!room.nowPlaying) {
    room.nowPlaying = queueItem;
    broadcastRoomEvent(roomCode, 'now_playing_updated', {
      nowPlaying: room.nowPlaying,
      queue: room.queue,
    });
    return { item: queueItem, isNowPlaying: true };
  }

  room.queue.push(queueItem);
  sortQueue(room.queue);

  broadcastRoomEvent(roomCode, 'queue_updated', {
    queue: room.queue,
    nowPlaying: room.nowPlaying,
    addedItem: queueItem,
  });

  return { item: queueItem, isNowPlaying: false };
}

export function voteForSong(roomCode, queueId, voterId = 'anon') {
  const room = getRoom(roomCode);
  if (!room) return null;

  const item = room.queue.find((q) => q.queueId === queueId);
  if (!item) return null;

  if (!item.voters) item.voters = [];

  const alreadyVotedIndex = item.voters.indexOf(voterId);
  if (alreadyVotedIndex >= 0) {
    // Toggle vote off
    item.voters.splice(alreadyVotedIndex, 1);
    item.votes = Math.max(0, item.votes - 1);
  } else {
    // Add vote
    item.voters.push(voterId);
    item.votes += 1;
  }

  sortQueue(room.queue);

  broadcastRoomEvent(roomCode, 'queue_updated', {
    queue: room.queue,
    nowPlaying: room.nowPlaying,
  });

  return { queue: room.queue, item };
}

export function advanceQueue(roomCode) {
  const room = getRoom(roomCode);
  if (!room) return null;

  if (room.nowPlaying) {
    const finished = room.nowPlaying;
    room.history.unshift(finished);
    if (room.history.length > 20) room.history.pop();

    // Record stats for singer and any co-singers
    recordSingerSongComplete(room, finished);
  }

  if (room.queue.length > 0) {
    room.nowPlaying = room.queue.shift();
  } else {
    room.nowPlaying = null;
  }

  broadcastRoomEvent(roomCode, 'now_playing_updated', {
    nowPlaying: room.nowPlaying,
    queue: room.queue,
  });

  return { nowPlaying: room.nowPlaying, queue: room.queue };
}

export function sendCheer(roomCode, effectId, fromName = 'Guest') {
  const room = getRoom(roomCode);
  if (!room) return null;

  const cheer = {
    id: 'cheer_' + Math.random().toString(36).substring(2, 9),
    effectId,
    fromName: (fromName || 'Guest').slice(0, 20),
    at: Date.now(),
  };

  // If a song is currently playing, credit the cheers to the active performers
  if (room.nowPlaying) {
    recordSingerCheer(room, room.nowPlaying);
  }

  broadcastRoomEvent(roomCode, 'cheer', cheer);
  return cheer;
}

export function reorderQueue(roomCode, orderedQueueIds) {
  const room = getRoom(roomCode);
  if (!room) return null;
  if (!Array.isArray(orderedQueueIds) || orderedQueueIds.length === 0) return room.queue;

  const byId = new Map(room.queue.map((q) => [q.queueId, q]));
  const next = [];
  for (const id of orderedQueueIds) {
    const item = byId.get(id);
    if (item) {
      next.push(item);
      byId.delete(id);
    }
  }
  // Any items missing from the client order (race) stay at the end
  for (const item of room.queue) {
    if (byId.has(item.queueId)) next.push(item);
  }
  // Stamp the manual order so it survives vote ties
  const stamp = Date.now();
  next.forEach((item, i) => {
    item.addedAt = stamp + i;
  });
  room.queue = next;

  broadcastRoomEvent(roomCode, 'queue_updated', {
    queue: room.queue,
    nowPlaying: room.nowPlaying,
  });

  return room.queue;
}

export function removeFromQueue(roomCode, queueId) {
  const room = getRoom(roomCode);
  if (!room) return null;

  room.queue = room.queue.filter((q) => q.queueId !== queueId);

  broadcastRoomEvent(roomCode, 'queue_updated', {
    queue: room.queue,
    nowPlaying: room.nowPlaying,
  });

  return room.queue;
}

// Host controls: Clear entire queue
export function clearQueue(roomCode) {
  const room = getRoom(roomCode);
  if (!room) return null;

  room.queue = [];

  broadcastRoomEvent(roomCode, 'queue_updated', {
    queue: room.queue,
    nowPlaying: room.nowPlaying,
  });

  return room.queue;
}

// Host controls: Lock/Unlock queue
export function setQueueLocked(roomCode, locked) {
  const room = getRoom(roomCode);
  if (!room) return null;

  room.locked = !!locked;

  broadcastRoomEvent(roomCode, 'room_settings_updated', {
    locked: room.locked,
    maxPerGuest: room.maxPerGuest,
  });

  return room.locked;
}

// Host controls: Set max songs per guest
export function setMaxPerGuest(roomCode, maxPerGuest) {
  const room = getRoom(roomCode);
  if (!room) return null;

  room.maxPerGuest = Math.max(0, parseInt(maxPerGuest, 10) || 0);

  broadcastRoomEvent(roomCode, 'room_settings_updated', {
    locked: room.locked,
    maxPerGuest: room.maxPerGuest,
  });

  return room.maxPerGuest;
}

// Host controls: Set host PIN
export function setHostPin(roomCode, pin) {
  const room = getRoom(roomCode);
  if (!room) return false;
  room.hostPin = pin ? String(pin).trim() : null;
  syncRoomToCloud(roomCode).catch(() => {});
  return true;
}

// Host controls: Verify host PIN
export function verifyHostPin(roomCode, pin) {
  const room = getRoom(roomCode);
  if (!room) return false;
  if (!room.hostPin) return true; // No PIN set yet
  return room.hostPin === String(pin).trim();
}

// Duet/Group Mode: Join an existing queue item
export function joinSong(roomCode, queueId, coSingerName) {
  const room = getRoom(roomCode);
  if (!room) return { error: 'Room not found.' };

  const item = room.queue.find((q) => q.queueId === queueId);
  if (!item) return { error: 'Song not found in queue.' };

  if (item.mode !== 'duet' && item.mode !== 'group') {
    return { error: 'This song is marked as a solo performance.' };
  }

  if (!item.coSingers) item.coSingers = [];

  const cleanName = (coSingerName || '').trim();
  if (!cleanName) return { error: 'Singer name is required.' };

  if (
    cleanName.toLowerCase() === (item.singerName || '').toLowerCase() ||
    item.coSingers.some((s) => s.toLowerCase() === cleanName.toLowerCase())
  ) {
    return { error: 'You are already signed up for this song!' };
  }

  const maxCoSingers = (item.maxSingers || 2) - 1;
  if (item.coSingers.length >= maxCoSingers) {
    return { error: 'This song is already full!' };
  }

  item.coSingers.push(cleanName);

  broadcastRoomEvent(roomCode, 'queue_updated', {
    queue: room.queue,
    nowPlaying: room.nowPlaying,
  });

  return { success: true, item };
}

// Singer Stats & Leaderboard helpers
function ensureSingerRecord(room, name) {
  if (!name) return null;
  const key = name.trim();
  if (!key) return null;
  if (!room.singerStats[key]) {
    room.singerStats[key] = {
      singerName: key,
      songsSung: 0,
      cheersReceived: 0,
      lastSong: '',
    };
  }
  return room.singerStats[key];
}

function recordSingerSongComplete(room, songItem) {
  if (!room.singerStats) room.singerStats = {};
  const names = [songItem.singerName, ...(songItem.coSingers || [])].filter(Boolean);
  for (const n of names) {
    const rec = ensureSingerRecord(room, n);
    if (rec) {
      rec.songsSung += 1;
      rec.lastSong = songItem.title;
    }
  }
  broadcastRoomEvent(room.code, 'stats_updated', {
    leaderboard: getSingerLeaderboard(room.code),
  });
}

function recordSingerCheer(room, songItem) {
  if (!room.singerStats) room.singerStats = {};
  const names = [songItem.singerName, ...(songItem.coSingers || [])].filter(Boolean);
  for (const n of names) {
    const rec = ensureSingerRecord(room, n);
    if (rec) {
      rec.cheersReceived += 1;
    }
  }
  broadcastRoomEvent(room.code, 'stats_updated', {
    leaderboard: getSingerLeaderboard(room.code),
  });
}

export function getSingerLeaderboard(roomCode) {
  const room = getRoom(roomCode);
  if (!room || !room.singerStats) return [];

  const list = Object.values(room.singerStats).map((s) => ({
    singerName: s.singerName,
    songsSung: s.songsSung,
    cheersReceived: s.cheersReceived,
    score: (s.songsSung * 100) + (s.cheersReceived * 10),
    lastSong: s.lastSong,
  }));

  list.sort((a, b) => b.score - a.score || b.songsSung - a.songsSung);
  return list;
}

// Helper: sort queue descending by votes, then ascending by addedAt timestamp
function sortQueue(queue) {
  queue.sort((a, b) => {
    if (b.votes !== a.votes) {
      return b.votes - a.votes;
    }
    return a.addedAt - b.addedAt;
  });
}

// Cloud persistence helpers for Vercel Serverless (Upstash Redis / Vercel KV / Vercel Blob).
// With these env vars set the cloud store becomes the shared source of truth
// that lets separate serverless instances serve the same karaoke room.
export function isCloudStoreEnabled() {
  return Boolean((REDIS_URL && REDIS_TOKEN) || process.env.BLOB_READ_WRITE_TOKEN);
}

// Read a room snapshot out of cloud storage (Redis or Vercel Blob).
// Returns null when the store is disabled, unreachable, or simply has no entry for this code yet.
async function fetchRoomFromCloud(roomCode) {
  // 1. Upstash Redis / Vercel KV
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(`${REDIS_URL}/get/karaokey:${roomCode}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.result !== undefined && data.result !== null) {
          let parsed = data.result;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
              if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
              }
            } catch (e) {}
          }
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      }
    } catch (e) {
      // Cloud read silent fallback
    }
  }

  // 2. Vercel Blob fallback
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { get } = await import('@vercel/blob');
      const result = await get(`karaokey-rooms/${roomCode}.json`, {
        access: 'public',
        useCache: false,
      });
      if (result && result.stream) {
        const response = new Response(result.stream);
        const text = await response.text();
        let parsed = JSON.parse(text);
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      // Blob read silent fallback
    }
  }

  return null;
}

// Merge a cloud snapshot into this instance's copy of the room.
function applyCloudSnapshot(roomCode, parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const room = ensureLocalRoom(roomCode);
  if (parsed.nowPlaying !== undefined) room.nowPlaying = parsed.nowPlaying;
  if (Array.isArray(parsed.queue)) room.queue = parsed.queue;
  if (Array.isArray(parsed.history)) room.history = parsed.history;
  if (parsed.locked !== undefined) room.locked = parsed.locked;
  if (parsed.maxPerGuest !== undefined) room.maxPerGuest = parsed.maxPerGuest;
  if (parsed.hostPin !== undefined) room.hostPin = parsed.hostPin;
  if (parsed.singerStats && typeof parsed.singerStats === 'object') room.singerStats = parsed.singerStats;
  room.synthetic = false; // real data straight from the shared store
  return room;
}

async function hydrateRoomFromCloud(roomCode) {
  const parsed = await fetchRoomFromCloud(roomCode);
  if (!parsed) return null;
  return applyCloudSnapshot(roomCode, parsed);
}

// Read path for the API routes. When the shared store is configured the
// snapshot always comes from it, so every serverless instance reports exactly
// the same room — this is what stops the TV stage from bouncing between the
// idle screen and a fresh autoplay when several Lambda instances are involved.
export async function hydrateRoom(roomCode) {
  const code = (roomCode || '').toUpperCase().trim();
  if (!code) return null;
  if (isCloudStoreEnabled()) {
    const fromCloud = await hydrateRoomFromCloud(code);
    if (fromCloud) return fromCloud;
    // Key missing: fall back to the local copy, which covers the brief window
    // between creating a room and its first background sync completing.
    return rooms.get(code) || null;
  }
  return getRoom(code);
}

export async function syncRoomToCloud(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = {
    code: room.code,
    nowPlaying: room.nowPlaying,
    queue: room.queue,
    history: room.history,
    locked: room.locked,
    maxPerGuest: room.maxPerGuest,
    hostPin: room.hostPin,
    singerStats: room.singerStats,
    updatedAt: Date.now(),
  };
  const payloadString = JSON.stringify(payload);

  // 1. Upstash Redis / Vercel KV
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      // Set in Redis with 24h expiration (86400 seconds)
      await fetch(`${REDIS_URL}/set/karaokey:${roomCode}?ex=86400`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'text/plain',
        },
        body: payloadString,
      });
    } catch (e) {
      // Cloud write silent fallback
    }
  }

  // 2. Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import('@vercel/blob');
      await put(`karaokey-rooms/${roomCode}.json`, payloadString, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      });
    } catch (e) {
      // Blob write silent fallback
    }
  }
}
