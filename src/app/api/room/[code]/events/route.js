import { NextResponse } from 'next/server';
import { addSubscriber, getRoom, resolveRoomCode, hydrateRoom } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const code = await resolveRoomCode(request, params);
  const room = await hydrateRoom(code);

  if (!code || !room) {
    return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (message) => {
        try {
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          // Client disconnected
        }
      };

      // Initial ping / connected message
      send(`event: connected\ndata: ${JSON.stringify({ roomCode: code, timestamp: Date.now() })}\n\n`);

      // Register subscriber
      const unsubscribe = addSubscriber(code, send);
      if (!unsubscribe) {
        try {
          controller.close();
        } catch (e) {}
        return;
      }

      // Keepalive interval every 20 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (err) {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 20000);

      // Cleanup when request closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
