'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Globe } from 'lucide-react';

export default function QRCodeDisplay({ roomCode, size = 160, compact = false }) {
  const canvasRef = useRef(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    if (!roomCode || typeof window === 'undefined') return;

    let isMounted = true;
    setQrError('');

    async function resolveJoinUrl() {
      let baseOrigin = window.location.origin;

      // If viewing on localhost/127.0.0.1, auto-detect the real network IP for phones!
      if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      ) {
        try {
          const res = await fetch('/api/network-ip');
          if (res.ok) {
            const data = await res.json();
            if (data.ip && data.ip !== 'localhost') {
              baseOrigin = `http://${data.ip}:${window.location.port || 3000}`;
            }
          }
        } catch (e) {
          // Fall back to origin
        }
      }

      if (!isMounted) return;

      const url = `${baseOrigin}/join/${roomCode}`;
      setJoinUrl(url);

      if (canvasRef.current) {
        try {
          await QRCode.toCanvas(canvasRef.current, url, {
            width: size,
            margin: 1,
            color: {
              dark: '#ffffff',
              light: '#0a0a1a',
            },
          });
        } catch (error) {
          console.error('QR code generation error:', error);
          if (isMounted) setQrError('Could not render QR code. Use the room code above.');
        }
      }
    }

    resolveJoinUrl();

    return () => {
      isMounted = false;
    };
  }, [roomCode, size]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: compact ? '10px' : '16px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--glow-purple)',
        backdropFilter: compact ? 'blur(12px)' : undefined,
      }}
    >
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          padding: '6px',
          background: '#0a0a1a',
          border: '1px solid rgba(168, 85, 247, 0.4)',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '8px' }} />
        {qrError && (
          <p style={{ fontSize: '0.75rem', color: 'var(--neon-rose)', marginTop: '8px' }}>{qrError}</p>
        )}
      </div>

      {compact ? (
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--neon-cyan)',
            }}
          >
            <Smartphone size={12} />
            <span>Scan to join &amp; sing</span>
          </span>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--neon-purple)',
              letterSpacing: '0.16em',
            }}
          >
            {roomCode}
          </span>
        </div>
      ) : (
        <div style={{ marginTop: '12px', textAlign: 'center', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '4px',
            }}
          >
            <Smartphone size={14} color="var(--neon-pink)" />
            <span>Scan with phone camera</span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--neon-purple)',
              letterSpacing: '0.15em',
              marginBottom: '6px',
            }}
          >
            ROOM: {roomCode}
          </div>

          {joinUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                wordBreak: 'break-all',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Globe size={11} color="var(--neon-cyan)" />
              <span>{joinUrl}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
