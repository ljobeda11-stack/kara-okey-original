import { NextResponse } from 'next/server';
import { advanceQueue, resolveRoomCode } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const code = await resolveRoomCode(request, params);
  const result = advanceQueue(code);

  if (!result) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    nowPlaying: result.nowPlaying,
    queue: result.queue,
  });
}
