import { NextResponse } from 'next/server';
import {
  advanceQueue,
  resolveRoomCode,
  hydrateRoom,
  syncRoomToCloud,
  verifyHostPin,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const code = await resolveRoomCode(request, params);
  const room = await hydrateRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  // Require host PIN for skip if one is set
  if (room.hostPin) {
    const body = await request.json().catch(() => ({}));
    if (!verifyHostPin(code, body.pin)) {
      return NextResponse.json({ success: false, error: 'Invalid host PIN.' }, { status: 403 });
    }
  }

  const result = advanceQueue(code);

  if (!result) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  await syncRoomToCloud(code);

  return NextResponse.json({
    success: true,
    nowPlaying: result.nowPlaying,
    queue: result.queue,
  });
}
