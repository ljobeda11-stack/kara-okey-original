import { NextResponse } from 'next/server';
import {
  getRoom,
  clearQueue,
  setQueueLocked,
  setMaxPerGuest,
  setHostPin,
  verifyHostPin,
  removeFromQueue,
} from '@/lib/store';

export async function GET(request, { params }) {
  const code = params.code?.toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    locked: !!room.locked,
    maxPerGuest: room.maxPerGuest || 0,
    hasPin: !!room.hostPin,
    queueCount: (room.queue || []).length,
    guestCount: room.guestCount || 1,
  });
}

export async function POST(request, { params }) {
  const code = params.code?.toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action, pin } = body;

    // PIN protection check if room has a PIN set and the action is administrative
    if (room.hostPin && action !== 'verify_pin') {
      if (!verifyHostPin(code, pin)) {
        return NextResponse.json(
          { success: false, error: 'Invalid host PIN.' },
          { status: 403 }
        );
      }
    }

    if (action === 'verify_pin') {
      const isValid = verifyHostPin(code, pin);
      return NextResponse.json({ success: isValid, valid: isValid });
    }

    if (action === 'set_pin') {
      setHostPin(code, body.newPin);
      return NextResponse.json({ success: true, hasPin: !!body.newPin });
    }

    if (action === 'clear_queue') {
      clearQueue(code);
      return NextResponse.json({ success: true, message: 'Queue cleared.' });
    }

    if (action === 'toggle_lock') {
      const locked = setQueueLocked(code, body.locked !== undefined ? body.locked : !room.locked);
      return NextResponse.json({ success: true, locked });
    }

    if (action === 'set_max_per_guest') {
      const maxPerGuest = setMaxPerGuest(code, body.maxPerGuest);
      return NextResponse.json({ success: true, maxPerGuest });
    }

    if (action === 'remove_song') {
      if (!body.queueId) {
        return NextResponse.json({ success: false, error: 'queueId is required.' }, { status: 400 });
      }
      removeFromQueue(code, body.queueId);
      return NextResponse.json({ success: true, message: 'Song removed from queue.' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('Host controls error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
