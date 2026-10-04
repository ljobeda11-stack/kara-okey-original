import { NextResponse } from 'next/server';
import { reorderQueue, resolveRoomCode } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const code = await resolveRoomCode(request, params);
  try {
    const body = await request.json().catch(() => ({}));
    const { orderedQueueIds } = body;

    if (!Array.isArray(orderedQueueIds)) {
      return NextResponse.json(
        { success: false, error: 'orderedQueueIds array is required.' },
        { status: 400 }
      );
    }

    const queue = reorderQueue(code, orderedQueueIds);
    if (queue === null) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, queue });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
