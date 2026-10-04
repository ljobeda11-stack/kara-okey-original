import { NextResponse } from 'next/server';
import { advanceQueue } from '@/lib/store';

export async function POST(request, { params }) {
  const code = params.code?.toUpperCase();
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
