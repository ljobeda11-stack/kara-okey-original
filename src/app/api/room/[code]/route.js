import { NextResponse } from 'next/server';
import { hydrateRoom, resolveRoomCode } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const code = await resolveRoomCode(request, params);

  if (!code) {
    return NextResponse.json({ success: false, error: 'Room code is required' }, { status: 400 });
  }

  const room = await hydrateRoom(code);

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
      // true => this instance invented an empty placeholder for a code it does
      // not actually know; clients must never treat it as the live room state.
      synthetic: room.synthetic === true,
    },
  });
}
