import { NextResponse } from 'next/server';
import { voteForSong, resolveRoomCode, hydrateRoom, syncRoomToCloud } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const code = await resolveRoomCode(request, params);
  try {
    const body = await request.json();
    const { queueId, voterId } = body;

    if (!queueId) {
      return NextResponse.json(
        { success: false, error: 'queueId is required.' },
        { status: 400 }
      );
    }

    await hydrateRoom(code);
    const result = voteForSong(code, queueId, voterId || 'anon');
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Song or room not found.' },
        { status: 404 }
      );
    }

    await syncRoomToCloud(code);

    return NextResponse.json({
      success: true,
      queue: result.queue,
      item: result.item,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
