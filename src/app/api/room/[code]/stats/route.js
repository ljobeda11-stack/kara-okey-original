import { NextResponse } from 'next/server';
import { getRoom, getSingerLeaderboard, resolveRoomCode, hydrateRoom } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const code = await resolveRoomCode(request, params);
  const room = await hydrateRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  const leaderboard = getSingerLeaderboard(code);

  return NextResponse.json({
    success: true,
    roomCode: code,
    leaderboard,
  });
}
