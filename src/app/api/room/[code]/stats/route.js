import { NextResponse } from 'next/server';
import { getRoom, getSingerLeaderboard } from '@/lib/store';

export async function GET(request, { params }) {
  const code = params.code?.toUpperCase();
  const room = getRoom(code);

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
