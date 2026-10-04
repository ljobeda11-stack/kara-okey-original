// Universal In-Memory Store for Real-Time Karaoke Rooms
// Attached to globalThis so state is preserved during Next.js hot-reloads and API calls

if (!globalThis._karaokeyRooms) {
  globalThis._karaokeyRooms = new Map();
}

const rooms = globalThis._karaokeyRooms;

export function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getOrCreateRoom(roomCode) {
  const code = (roomCode || '').toUpperCase().trim();
  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      createdAt: Date.now(),
      nowPlaying: null,
      queue: [],
      history: [],
      subscribers: new Set(),
      guestCount: 0,
      locked: false,
      maxPerGuest: 0, // 0 = unlimited
      hostPin: null, // Host admin PIN
      singerStats: {}, // { [name]: { songsSung: 0, cheersReceived: 0, lastSong: '' } }
    });
  }
  const room = rooms.get(code);
  // Ensure backward compatibility if room object was created prior
  if (room.locked === undefined) room.locked = false;
  if (room.maxPerGuest === undefined) room.maxPerGuest = 0;
  if (!room.singerStats) room.singerStats = {};
  return room;
}

export function getRoom(roomCode) {
  const code = (roomCode || '').toUpperCase().trim();
  return rooms.get(code) || null;
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
  // Stamp the manual order so it survives vote ties (sortQueue is
  // votes-desc, addedAt-asc — sequential stamps lock the arrangement in).
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

  if (cleanName.toLowerCase() === (item.singerName || '').toLowerCase() ||
      item.coSingers.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
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
    // Score formula: (songs sung * 100) + (cheers received * 10)
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
