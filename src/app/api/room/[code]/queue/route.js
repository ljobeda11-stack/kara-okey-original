import { NextResponse } from 'next/server';
import { getOrCreateRoom, getRoom, addSongToQueue, removeFromQueue, resolveRoomCode } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const code = await resolveRoomCode(request, params);
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    nowPlaying: room.nowPlaying,
    queue: room.queue,
    locked: room.locked,
    maxPerGuest: room.maxPerGuest,
  });
}

export async function POST(request, { params }) {
  const code = await resolveRoomCode(request, params);
  try {
    const body = await request.json();
    const { song, singerName, mode, coSingers } = body;

    if (!song || !song.id || !song.title) {
      return NextResponse.json(
        { success: false, error: 'Song details (id, title) are required.' },
        { status: 400 }
      );
    }

    const result = addSongToQueue(code, song, singerName, {
      mode: mode || song.mode,
      coSingers: coSingers || song.coSingers,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.item,
      isNowPlaying: result.isNowPlaying,
    });
  } catch (err) {
    console.error('Queue POST error:', err);
    return NextResponse.json({ success: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const code = await resolveRoomCode(request, params);
  const { searchParams } = new URL(request.url);
  let queueId = searchParams.get('queueId');

  if (!queueId) {
    try {
      const body = await request.json();
      queueId = body.queueId;
    } catch (e) {}
  }

  if (!queueId) {
    return NextResponse.json(
      { success: false, error: 'queueId parameter is required.' },
      { status: 400 }
    );
  }

  const updatedQueue = removeFromQueue(code, queueId);
  if (updatedQueue === null) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, queue: updatedQueue });
}
