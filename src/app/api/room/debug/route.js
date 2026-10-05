import { NextResponse } from 'next/server';
import { isCloudStoreEnabled, syncRoomToCloud, hydrateRoom, getOrCreateRoom } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') || 'TEST').toUpperCase();

  const debug = {
    hasRedisUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL),
    hasRedisToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
    hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    blobTokenLength: (process.env.BLOB_READ_WRITE_TOKEN || '').length,
    isCloudStoreEnabled: isCloudStoreEnabled(),
  };

  // Test Blob put directly
  let blobPutError = null;
  let blobGetError = null;
  let blobResult = null;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put, get } = await import('@vercel/blob');
      const putRes = await put(`karaokey-rooms/${code}.json`, JSON.stringify({ test: 123, time: Date.now() }), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      });
      debug.putUrl = putRes.url;

      const getRes = await get(`karaokey-rooms/${code}.json`, {
        access: 'public',
        useCache: false,
      });
      if (getRes && getRes.stream) {
        const text = await new Response(getRes.stream).text();
        blobResult = JSON.parse(text);
      }
    } catch (e) {
      blobPutError = { message: e.message, stack: e.stack, name: e.name };
    }
  }

  debug.blobPutError = blobPutError;
  debug.blobResult = blobResult;

  return NextResponse.json({ success: true, debug });
}
