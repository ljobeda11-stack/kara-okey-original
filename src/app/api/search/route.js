import { NextResponse } from 'next/server';
import { PLAYLISTS, DEFAULT_PLAYLIST_NAME } from '@/lib/karaokePlaylists';
import { resolvePlaylist } from '@/lib/karaokeResolver';
import { searchYouTubeKaraoke } from '@/lib/youtubeSearch';
import { filterEmbeddable } from '@/lib/youtubeEmbeddable';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  // Empty query: serve the first curated karaoke playlist (real YouTube
  // karaoke videos). The guest UI normally uses /api/playlists instead,
  // but this keeps the endpoint useful on its own.
  if (!query) {
    let results = [];
    try {
      results = await resolvePlaylist(DEFAULT_PLAYLIST_NAME);
    } catch (e) {
      results = [];
    }
    return NextResponse.json({
      success: true,
      source: 'youtube',
      category: PLAYLISTS[0].name,
      results,
    });
  }

  // 1. Direct YouTube link or ID parsing
  // Matches: youtube.com/watch?v=ID or youtu.be/ID or plain 11-char ID
  const ytMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/) ||
                  (query.length === 11 && query.match(/^[a-zA-Z0-9_-]{11}$/) ? [null, query] : null);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return NextResponse.json({
      success: true,
      source: 'custom-url',
      results: [
        {
          id: videoId,
          title: `Custom Track (${videoId})`,
          artist: 'YouTube Karaoke',
          channel: 'YouTube Karaoke',
          duration: 'Custom',
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          category: 'Custom URL',
          source: 'youtube',
        },
      ],
    });
  }

  // 2. Live YouTube karaoke search — keyless scrape, then verified through
  // the embeddability probe so the guest never sees a song the TV cannot play
  // (embedding-disabled uploads answer HTTP 401 on oEmbed).
  let live = [];
  try {
    const raw = await searchYouTubeKaraoke(query, { limit: 24 });
    live = await filterEmbeddable(raw, { keep: 15, allowUnknown: true, concurrency: 6 });
  } catch (e) {
    live = [];
  }

  // 4. Optional YouTube Data API top-up (only if key configured AND live failed)
  if (live.length < 3 && process.env.YOUTUBE_API_KEY) {
    try {
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(
        query + ' karaoke lyrics'
      )}&type=video&videoEmbeddable=true&key=${process.env.YOUTUBE_API_KEY}`;
      const res = await fetch(ytUrl);
      if (res.ok) {
        const data = await res.json();
        const apiResults = (data.items || [])
          .filter((item) => item.id?.videoId)
          .map((item) => ({
            id: item.id.videoId,
            title: String(item.snippet.title || '').replace(/(&quot;|&#39;|&amp;)/g, ''),
            artist: item.snippet.channelTitle,
            channel: item.snippet.channelTitle,
            duration: 'Karaoke',
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            category: 'YouTube Karaoke',
            source: 'youtube',
          }));
        const seen = new Set(live.map((s) => s.id));
        for (const s of apiResults) {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            live.push(s);
          }
        }
      }
    } catch (e) {}
  }

  // De-dupe by video id, karaoke-flagged results first.
  const seen = new Set();
  const results = [];
  for (const s of live) {
    if (!s || !s.id || seen.has(s.id)) continue;
    seen.add(s.id);
    results.push(s);
  }

  return NextResponse.json({
    success: true,
    source: results.length > 0 ? 'live' : 'none',
    query,
    results,
  });
}
