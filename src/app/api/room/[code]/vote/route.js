import { NextResponse } from 'next/server';
import { voteForSong } from '@/lib/store';

export async function POST(request, { params }) {
  const code = params.code?.toUpperCase();
  try {
    const body = await request.json();
    const { queueId, voterId } = body;

    if (!queueId) {
      return NextResponse.json(
        { success: false, error: 'queueId is required.' },
        { status: 400 }
      );
    }

    const result = voteForSong(code, queueId, voterId || 'anon');
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Song or room not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      queue: result.queue,
      item: result.item,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
