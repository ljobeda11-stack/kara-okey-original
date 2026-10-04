import { NextResponse } from 'next/server';
import { generateRoomCode, getOrCreateRoom } from '@/lib/store';

export async function POST() {
  const code = generateRoomCode();
  const room = getOrCreateRoom(code);

  return NextResponse.json({
    success: true,
    code: room.code,
    room: {
      code: room.code,
      createdAt: room.createdAt,
      guestCount: room.guestCount,
      nowPlaying: room.nowPlaying,
      queue: room.queue,
    },
  });
}
