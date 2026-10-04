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
    });
  }
  return rooms.get(code);
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

export function addSongToQueue(roomCode, song, singerName = 'Guest Singer') {
  const room = getOrCreateRoom(roomCode);

  const queueItem = {
    queueId: 'q_' + Math.random().toString(36).substring(2, 9),
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration || '3:30',
    thumbnail: song.thumbnail || `https://img.youtube.com/vi/${song.id}/hqdefault.jpg`,
    singerName: singerName.trim() || 'Guest Singer',
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
    room.history.unshift(room.nowPlaying);
    if (room.history.length > 20) room.history.pop();
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

// Helper: sort queue descending by votes, then ascending by addedAt timestamp
function sortQueue(queue) {
  queue.sort((a, b) => {
    if (b.votes !== a.votes) {
      return b.votes - a.votes;
    }
    return a.addedAt - b.addedAt;
  });
}
