import { NextResponse } from 'next/server';
import {
  reorderQueue,
  resolveRoomCode,
  hydrateRoom,
  syncRoomToCloud,
  verifyHostPin,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const code = await resolveRoomCode(request, params);
  try {
    const body = await request.json().catch(() => ({}));
    const { orderedQueueIds, pin } = body;

    if (!Array.isArray(orderedQueueIds)) {
      return NextResponse.json(
        { success: false, error: 'orderedQueueIds array is required.' },
        { status: 400 }
      );
    }

    const room = await hydrateRoom(code);
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    // Require host PIN for reorder if one is set
    if (room.hostPin && !verifyHostPin(code, pin)) {
      return NextResponse.json({ success: false, error: 'Invalid host PIN.' }, { status: 403 });
    }

    const queue = reorderQueue(code, orderedQueueIds);
    if (queue === null) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    await syncRoomToCloud(code);
    return NextResponse.json({ success: true, queue });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
