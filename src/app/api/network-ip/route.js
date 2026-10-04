import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        // Prefer Wi-Fi or Ethernet interfaces
        localIp = net.address;
        break;
      }
    }
    if (localIp !== 'localhost') break;
  }

  return NextResponse.json({
    ip: localIp,
    port: 3000,
  });
}
