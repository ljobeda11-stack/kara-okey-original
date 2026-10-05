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
      // Test private put & get
      try {
        const putPriv = await put(`rooms-priv/${code}.json`, JSON.stringify({ priv: true, time: Date.now() }), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        debug.putPrivUrl = putPriv.url;
        const getPriv = await get(`rooms-priv/${code}.json`, {
          access: 'private',
          useCache: false,
        });
        if (getPriv && getPriv.stream) {
          const text = await new Response(getPriv.stream).text();
          debug.privResult = JSON.parse(text);
        }
      } catch (errPriv) {
        debug.privError = { message: errPriv.message, stack: errPriv.stack };
      }
    } catch (e) {
      blobPutError = { message: e.message, stack: e.stack, name: e.name };
    }
  }

  debug.blobPutError = blobPutError;
  debug.blobResult = blobResult;

  return NextResponse.json({ success: true, debug });
}
