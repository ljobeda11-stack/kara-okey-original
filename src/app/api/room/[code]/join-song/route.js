import { NextResponse } from 'next/server';
import { getRoom, joinSong } from '@/lib/store';

export async function POST(request, { params }) {
  const code = params.code?.toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { queueId, singerName } = body;

    if (!queueId) {
      return NextResponse.json(
        { success: false, error: 'queueId is required.' },
        { status: 400 }
      );
    }

    if (!singerName || !singerName.trim()) {
      return NextResponse.json(
        { success: false, error: 'singerName is required.' },
        { status: 400 }
      );
    }

    const result = joinSong(code, queueId, singerName.trim());
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      item: result.item,
    });
  } catch (err) {
    console.error('Join song error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
