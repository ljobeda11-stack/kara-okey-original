import { NextResponse } from 'next/server';
import { evictVideo } from '@/lib/karaokeResolver';

export const dynamic = 'force-dynamic';

// POST /api/unplayable { videoId }
// The TV player calls this when YouTube reports 101/150 (embedding disabled)
// or 100/2 (removed/invalid). The video is blacklisted and every cached
// playlist containing it is dropped, so the next resolve replaces it.
export async function POST(request) {
  let videoId = '';
  try {
    const body = await request.json();
    videoId = String(body?.videoId || '');
  } catch (e) {
    videoId = '';
  }
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ success: false, error: 'bad videoId' }, { status: 400 });
  }
  evictVideo(videoId);
  return NextResponse.json({ success: true });
}
