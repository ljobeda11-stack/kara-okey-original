// Keyless live YouTube karaoke search (no API key required).
// Scrapes YouTube search HTML (ytInitialData), falls back to the public
// Innertube search endpoint. Genuine karaoke uploads (on-screen lyrics +
// backing music) are scored first; official MVs / tutorials drop out.

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

if (!globalThis._karaokeYtCache) globalThis._karaokeYtCache = new Map();
const cache = globalThis._karaokeYtCache;

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const TITLE_HINTS = [
  'karaoke', 'sing along', 'sing-along', 'minus one', 'minus-one',
  'instrumental', 'backing track', 'videoke', 'no vocals', 'without vocals',
  'lower key', 'higher key', 'karaoke version', 'with lyrics',
];
const CHANNEL_HINTS = [
  'karaoke', 'covers ph', 'coversph', 'sing king', 'karafun', 'videoke',
  'minus one', 'zoom karaoke', 'sunfly', 'karaoke ph', 'opm karaoke',
];
const NEGATIVE = [
  'reaction', 'tutorial', 'lesson', 'how to play', 'how to sing',
  'dance practice', 'interview', 'vlog', 'trailer', 'gameplay', 'podcast',
  'karaoke reaction', 'vocal cover', 'guitar cover', 'drum cover', 'piano cover',
];
const OFFICIAL = ['official music video', 'official video', 'official mv', 'official audio'];

export function isKaraokeQuery(q) {
  return /(karaoke|videoke|minus\s?one|sing[\s-]?along|instrumental|backing track)/i.test(q || '');
}

export function expandQuery(q) {
  const t = (q || '').trim();
  return isKaraokeQuery(t) ? t : `${t} karaoke`;
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
}

function runsToText(node) {
  if (!node) return '';
  if (typeof node.simpleText === 'string') return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r) => r.text || '').join('');
  return '';
}

function durationToSec(d) {
  if (!d || /live/i.test(d)) return null;
  const parts = String(d).trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  let s = 0;
  for (const n of parts) s = s * 60 + n;
  return s;
}
function viewsToNum(v) {
  if (!v) return 0;
  const m = String(v).replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
  return parseFloat(m[1]) * mult;
}

export function karaokeScore(titleRaw, channelRaw) {
  const t = String(titleRaw || '').toLowerCase();
  const c = String(channelRaw || '').toLowerCase();
  const hasHint = TITLE_HINTS.some((h) => t.includes(h));
  const hasChan = CHANNEL_HINTS.some((h) => c.includes(h));
  for (const neg of NEGATIVE) {
    if (t.includes(neg) && !hasHint) return { score: -100, keep: false };
  }
  if (OFFICIAL.some((m) => t.includes(m)) && !hasHint && !hasChan) {
    return { score: -100, keep: false };
  }
  let score = 0;
  for (const h of TITLE_HINTS) if (t.includes(h)) score += 3;
  for (const h of CHANNEL_HINTS) if (c.includes(h)) score += 4;
  if (c.includes('covers ph') || c.includes('coversph')) score += 6;
  if (/\blyrics\b/.test(t)) score += 2;
  return { score, keep: hasHint || hasChan || score >= 4 };
}

function toSong(v) {
  const id = v.videoId;
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
  const title = decodeEntities(runsToText(v.title)).replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!title) return null;
  const channel = decodeEntities(runsToText(v.ownerText)).trim() || 'YouTube Karaoke';
  const duration = runsToText(v.lengthText) || '';
  const secs = durationToSec(duration);
  if (secs === null || secs < 45 || secs > 15 * 60) return null;
  const viewsText = runsToText(v.viewCountText) || '';
  const { score, keep } = karaokeScore(title, channel);
  return {
    id,
    title,
    artist: channel,
    channel,
    duration: duration || 'Karaoke',
    views: viewsText,
    viewsNum: viewsToNum(viewsText),
    thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    category: 'YouTube Karaoke',
    source: 'youtube',
    _score: score,
    _keep: keep,
  };
}

function videosFromData(data) {
  const out = [];
  try {
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const sec of sections) {
      const items = sec?.itemSectionRenderer?.contents || [];
      for (const it of items) {
        if (it?.videoRenderer) out.push(it.videoRenderer);
      }
    }
  } catch (e) {}
  return out;
}

function extractInitialData(html) {
  const marker = 'var ytInitialData = ';
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const start = i + marker.length;
  const end = html.indexOf('</script>', start);
  if (end < 0) return null;
  let s = html.slice(start, end).trim();
  if (s.endsWith(';')) s = s.slice(0, -1);
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function searchViaHtml(q) {
  const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!res.ok) throw new Error('yt html ' + res.status);
  const html = await res.text();
  const data = extractInitialData(html);
  if (!data) throw new Error('no ytInitialData');
  return videosFromData(data).map(toSong).filter(Boolean);
}

async function searchViaInnertube(q) {
  const url = 'https://www.youtube.com/youtubei/v1/search?key=' + INNERTUBE_KEY;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        context: {
          client: { clientName: 'WEB', clientVersion: '2.20241201.00.00', hl: 'en', gl: 'US' },
        },
        query: q,
      }),
    },
    8000
  );
  if (!res.ok) throw new Error('innertube ' + res.status);
  const data = await res.json();
  return videosFromData(data).map(toSong).filter(Boolean);
}

function rankAndLimit(songs, limit) {
  const strict = songs.filter((s) => s._keep);
  const pool = strict.length >= 3 ? strict : songs;
  pool.sort((a, b) => b._score - a._score || b.viewsNum - a.viewsNum);
  const seen = new Set();
  const out = [];
  for (const s of pool) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const { _score, _keep, ...song } = s;
    out.push(song);
    if (out.length >= limit) break;
  }
  return out;
}

export async function searchYouTubeKaraoke(query, opts = {}) {
  const limit = opts.limit || 15;
  const key = String(query || '').toLowerCase().trim();
  if (!key) return [];
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.results.slice(0, limit);

  const q = expandQuery(query);
  let songs = [];
  try {
    songs = await searchViaHtml(q);
  } catch (e) {
    songs = [];
  }
  if (songs.length < 5) {
    try {
      const extra = await searchViaInnertube(q);
      const seen = new Set(songs.map((s) => s.id));
      for (const s of extra) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          songs.push(s);
        }
      }
    } catch (e) {}
  }
  songs = rankAndLimit(songs, limit);
  cache.set(key, { at: now, results: songs });
  if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  return songs;
}