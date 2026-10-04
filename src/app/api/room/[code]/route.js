import { NextResponse } from 'next/server';
import { getRoom } from '@/lib/store';

export async function GET(request, { params }) {
  const code = params.code?.toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    room: {
      code: room.code,
      nowPlaying: room.nowPlaying,
      queue: room.queue,
      history: room.history,
      guestCount: room.guestCount,
    },
  });
}
