import { NextResponse } from 'next/server';
import { getRoom, resolveRoomCode } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const code = await resolveRoomCode(request, params);

  if (!code) {
    return NextResponse.json({ success: false, error: 'Room code is required' }, { status: 400 });
  }

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
      locked: !!room.locked,
      maxPerGuest: room.maxPerGuest || 0,
    },
  });
}
