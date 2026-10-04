// Keyless embeddability probe.
//
// YouTube's public oEmbed endpoint answers 200 only for videos whose owner
// allows them to be shown in an embedded player — which is exactly what
// decides whether a song actually plays inside our karaoke iframe.
//  - 200            -> embeddable (playable)
//  - 401 / 403      -> owner disabled embedding  (NOT playable here)
//  - 400 / 404 / 410-> deleted / private / age-restricted (not playable)
//  - anything else  -> unknown (transient); we do not punish the video
//
// The old official-MV playlists died of exactly this: the videos existed,
// but embedding was disabled, so the TV showed a black "unavailable" box.
// Every id we surface is now verified with this probe before it reaches any
// screen. Results are cached in globalThis (24h yes / 6h no / 60s unknown)
// and in-flight probes are de-duplicated.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const OK_TTL_MS = 24 * 60 * 60 * 1000; // embeddable — re-check daily
const BAD_TTL_MS = 6 * 60 * 60 * 1000; // embedding disabled — retry in 6h
const UNKNOWN_TTL_MS = 60 * 1000; // probe hiccup — retry within a minute

if (!globalThis._karaokeEmbedCache) globalThis._karaokeEmbedCache = new Map();
if (!globalThis._karaokeEmbedInflight) globalThis._karaokeEmbedInflight = new Map();
const cache = globalThis._karaokeEmbedCache;
const inflight = globalThis._karaokeEmbedInflight;

export function markUnembeddable(videoId) {
  if (!videoId) return;
  cache.set(videoId, { ok: false, at: Date.now(), ttl: BAD_TTL_MS });
}

function probeOnce(videoId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  const url =
    'https://www.youtube.com/oembed?url=' +
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`) +
    '&format=json';
  return fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal })
    .then((res) => {
      if (res.status === 200) return true;
      if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410) {
        return false;
      }
      // 429 / 5xx / anything unexpected: transient — do not punish the video.
      return null;
    })
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}

/** true = embeddable, false = blocked/removed, null = could not determine. */
export async function isEmbeddable(videoId) {
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return false;
  const now = Date.now();
  const hit = cache.get(videoId);
  if (hit && now - hit.at < hit.ttl) return hit.ok;
  if (inflight.has(videoId)) return inflight.get(videoId);

  const job = probeOnce(videoId)
    .then((ok) => {
      const ttl = ok === true ? OK_TTL_MS : ok === false ? BAD_TTL_MS : UNKNOWN_TTL_MS;
      cache.set(videoId, { ok, at: Date.now(), ttl });
      if (cache.size > 2000) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
      }
      return ok;
    })
    .finally(() => inflight.delete(videoId));

  inflight.set(videoId, job);
  return job;
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

/**
 * Keep only the songs confirmed embeddable (playable in the iframe).
 *   opts.first  -> stop at the first playable song (rank order preserved)
 *   opts.keep   -> max results to return (default 15)
 *   opts.allowUnknown -> when nothing is confirmed OK but some probes were
 *                        inconclusive, fall back to the top unknown song so
 *                        the app still works if YouTube probes are down.
 * When every verdict is "unknown" (probe outage) the original order is kept
 * so we never serve an empty playlist because of a transient failure.
 */
export async function filterEmbeddable(songs, opts = {}) {
  const list = (Array.isArray(songs) ? songs : []).filter((s) => s && s.id);
  if (list.length === 0) return [];

  const keep = opts.keep == null ? 15 : opts.keep;
  const queue = list.slice(0, Math.max(keep, opts.probeCap || 24));

  if (opts.first) {
    let firstUnknown = null;
    for (let i = 0; i < queue.length; i += 4) {
      const batch = queue.slice(i, i + 4);
      const verdicts = await mapWithLimit(batch, 4, (s) => isEmbeddable(s.id));
      for (let j = 0; j < batch.length; j++) {
        if (verdicts[j] === true) return [batch[j]];
        if (verdicts[j] == null && !firstUnknown) firstUnknown = batch[j];
      }
    }
    return opts.allowUnknown && firstUnknown ? [firstUnknown] : [];
  }

  const verdicts = await mapWithLimit(queue, opts.concurrency || 6, (s) => isEmbeddable(s.id));
  const passed = [];
  const unknown = [];
  queue.forEach((s, idx) => {
    if (verdicts[idx] === true) passed.push(s);
    else if (verdicts[idx] == null) unknown.push(s);
  });
  if (passed.length) return passed.slice(0, keep);
  return opts.allowUnknown ? unknown.slice(0, keep) : [];
}
