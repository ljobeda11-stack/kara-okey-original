import { NextResponse } from 'next/server';
import { sendCheer, resolveRoomCode, hydrateRoom, syncRoomToCloud } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const code = await resolveRoomCode(request, params);
  try {
    const body = await request.json().catch(() => ({}));
    const { effectId, fromName } = body;

    if (!effectId) {
      return NextResponse.json(
        { success: false, error: 'effectId is required.' },
        { status: 400 }
      );
    }

    await hydrateRoom(code);
    const cheer = sendCheer(code, String(effectId).slice(0, 24), fromName);
    if (!cheer) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    await syncRoomToCloud(code);

    return NextResponse.json({ success: true, cheer });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
