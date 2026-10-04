import { NextResponse } from 'next/server';
import { getOrCreateRoom, getRoom, addSongToQueue, removeFromQueue } from '@/lib/store';

export async function GET(request, { params }) {
  const code = params.code?.toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    nowPlaying: room.nowPlaying,
    queue: room.queue,
  });
}

export async function POST(request, { params }) {
  const code = params.code?.toUpperCase();
  try {
    const body = await request.json();
    const { song, singerName } = body;

    if (!song || !song.id || !song.title) {
      return NextResponse.json(
        { success: false, error: 'Song details (id, title) are required.' },
        { status: 400 }
      );
    }

    const result = addSongToQueue(code, song, singerName);

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
  const code = params.code?.toUpperCase();
  const { searchParams } = new URL(request.url);
  const queueId = searchParams.get('queueId');

  if (!queueId) {
    return NextResponse.json(
      { success: false, error: 'queueId query parameter is required.' },
      { status: 400 }
    );
  }

  const updatedQueue = removeFromQueue(code, queueId);
  if (updatedQueue === null) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, queue: updatedQueue });
}
