// Resolves curated playlist entries into REAL, EMBEDDABLE (i.e. actually
// playable in our iframe) YouTube karaoke videos.
//
// Two-stage pipeline, no API key needed:
//   1. youtubeSearch.js    — keyless live search, ranks genuine karaoke
//                            uploads (on-screen lyrics + backing music) first.
//   2. youtubeEmbeddable.js — verifies each candidate via YouTube's oEmbed
//                            endpoint. Videos whose owner disabled embedding
//                            (HTTP 401 — exactly what made the old playlists
//                            unplayable on the TV) are dropped and the next
//                            ranked candidate takes its place.
//
// Results are cached per category in globalThis. When the player reports a
// video as unplayable at runtime, evictVideo() blacklists it and drops the
// affected caches so the next resolve replaces it automatically.

import { getPlaylistByName, PLAYLISTS } from './karaokePlaylists';
import { searchYouTubeKaraoke } from './youtubeSearch';
import { markUnembeddable, filterEmbeddable } from './youtubeEmbeddable';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const EMPTY_CACHE_TTL_MS = 5 * 60 * 1000; // retry empty playlists sooner
const CONCURRENCY = 4; // parallel resolutions per category

if (!globalThis._karaokePlaylistCache) globalThis._karaokePlaylistCache = new Map();
if (!globalThis._karaokePlaylistInflight) globalThis._karaokePlaylistInflight = new Map();
if (!globalThis._karaokeVideoBlacklist) globalThis._karaokeVideoBlacklist = new Map();
const cache = globalThis._karaokePlaylistCache;
const inflight = globalThis._karaokePlaylistInflight;
// videoId -> unix ms it was reported unplayable (kept for 24h)
const blacklist = globalThis._karaokeVideoBlacklist;
const BLACKLIST_TTL_MS = 24 * 60 * 60 * 1000;

function isBlacklisted(videoId) {
  const at = blacklist.get(videoId);
  if (at == null) return false;
  if (Date.now() - at > BLACKLIST_TTL_MS) {
    blacklist.delete(videoId);
    return false;
  }
  return true;
}

/**
 * Runtime eviction: called when the TV player sees an embed-disabled or
 * removed video. Blacklists the id, drops it from every cached playlist and
 * invalidates those caches so the next request resolves a replacement.
 */
export function evictVideo(videoId) {
  if (!videoId) return;
  blacklist.set(videoId, Date.now());
  markUnembeddable(videoId);
  for (const [key, entry] of cache.entries()) {
    if ((entry.songs || []).some((s) => s.id === videoId)) {
      cache.delete(key);
    }
  }
}

// "Bohemian Rhapsody (Karaoke Version) [HD] - Queen" -> "Bohemian Rhapsody - Queen"
function cleanTitle(raw) {
  const original = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!original) return '';
  let t = original;
  // Drop bracketed karaoke/quality noise anywhere in the title
  t = t.replace(
    /\s*[([{]\s*(karaoke|instrumental|with lyrics|lyrics|sing[\s-]?along|minus\s?one|backing track|no vocals|hd|4k|hq|official|video|audio|mp3|full)[^)\]}]*[)\]}]\s*/gi,
    ' '
  );
  // Drop "– Karaoke ..." style suffixes
  t = t.replace(/\s*[-–—|]\s*(karaoke|instrumental|lyrics?|sing[\s-]?along)\b.*$/gi, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/[\-–—_|,\s]+$/, '').trim();
  return t.length >= 3 ? t : original;
}

function normalizeSong(hit, playlistName, fallbackArtist) {
  if (!hit || !hit.id) return null;
  return {
    id: hit.id,
    title: cleanTitle(hit.title) || hit.title,
    artist: fallbackArtist || hit.channel || hit.artist || 'YouTube Karaoke',
    channel: hit.channel || hit.artist || 'YouTube Karaoke',
    duration: hit.duration || 'Karaoke',
    thumbnail: hit.thumbnail || `https://img.youtube.com/vi/${hit.id}/hqdefault.jpg`,
    views: hit.views || '',
    category: playlistName,
    source: 'youtube',
  };
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length).fill(null);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index], index);
      } catch (e) {
        results[index] = null;
      }
    }
  });
  await Promise.all(runners);
  return results;
}

// Resolve a single curated entry (title + artist) to a real, embeddable
// karaoke upload: walk the ranked search candidates until one is confirmed
// playable in an embed. allowUnknown keeps the app working (best candidate)
// if YouTube's probe endpoint is temporarily unreachable.
async function resolveEntry(entry, playlistName) {
  const query = `${entry.title} ${entry.artist || ''} karaoke`.trim();
  const hits = await searchYouTubeKaraoke(query, { limit: 8 });
  const candidates = (hits || []).filter((h) => h && h.id && !isBlacklisted(h.id));
  if (candidates.length === 0) return null;

  const picked = await filterEmbeddable(candidates, { first: true, allowUnknown: true });
  if (picked.length === 0) return null;
  return normalizeSong(picked[0], playlistName, entry.artist);
}

/**
 * Returns every song of a curated playlist as a real, embeddable YouTube
 * karaoke video. Never throws — falls back to a raw category search if a
 * playlist fails.
 */
export async function resolvePlaylist(name) {
  const playlist = getPlaylistByName(name) || PLAYLISTS[0];
  const key = playlist.id;
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && now - cached.at < cached.ttl) {
    const stillGood = cached.songs.filter((s) => !isBlacklisted(s.id));
    if (stillGood.length > 0) return stillGood;
    // Everything we cached has since gone unplayable — resolve fresh.
    cache.delete(key);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    const settled = await mapWithLimit(playlist.songs, CONCURRENCY, (entry) =>
      resolveEntry(entry, playlist.name)
    );

    const seen = new Set();
    let songs = [];
    for (const song of settled) {
      if (!song || seen.has(song.id) || isBlacklisted(song.id)) continue;
      seen.add(song.id);
      songs.push(song);
    }

    // Whole-playlist failure (search blocked / offline): fall back to a raw
    // karaoke search for the category itself so the screen is never empty.
    if (songs.length === 0) {
      try {
        const fallback = await searchYouTubeKaraoke(`${playlist.name} karaoke hits`, {
          limit: 12,
        });
        const candidates = (fallback || [])
          .map((hit) => normalizeSong(hit, playlist.name))
          .filter((s) => s && !isBlacklisted(s.id));
        songs = await filterEmbeddable(candidates, {
          keep: 8,
          allowUnknown: true,
          concurrency: 6,
        });
      } catch (e) {
        songs = [];
      }
    }

    cache.set(key, {
      at: Date.now(),
      ttl: songs.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS,
      songs,
    });
    return songs.slice();
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

