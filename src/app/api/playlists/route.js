import { NextResponse } from 'next/server';
import { PLAYLISTS, getPlaylistSummaries, getPlaylistByName } from '@/lib/karaokePlaylists';
import { resolvePlaylist } from '@/lib/karaokeResolver';

export const dynamic = 'force-dynamic';

// GET /api/playlists            -> metadata + songs of the first playlist
// GET /api/playlists?meta=1     -> metadata only (instant, no YouTube calls)
// GET /api/playlists?category=X -> metadata + real YouTube karaoke songs of X
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const summaries = getPlaylistSummaries();

  if (searchParams.get('meta') === '1' || searchParams.get('meta') === 'true') {
    return NextResponse.json({
      success: true,
      source: 'youtube',
      playlists: summaries,
      category: null,
      songs: [],
    });
  }

  const requested = searchParams.get('category');
  const playlist = getPlaylistByName(requested) || PLAYLISTS[0];

  let songs = [];
  try {
    songs = await resolvePlaylist(playlist.name);
  } catch (e) {
    songs = [];
  }

  return NextResponse.json({
    success: true,
    source: 'youtube',
    category: playlist.name,
    description: playlist.description,
    emoji: playlist.emoji,
    playlists: summaries,
    songs,
  });
}
