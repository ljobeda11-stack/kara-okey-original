'use client';

import { Sparkles, Mic2 } from 'lucide-react';

export default function Logo({ size = 'md', showTagline = false }) {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: isSmall ? '6px' : '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isSmall ? '32px' : isLarge ? '56px' : '40px',
            height: isSmall ? '32px' : isLarge ? '56px' : '40px',
            borderRadius: isSmall ? '8px' : '14px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(10, 10, 26, 0.9) 100%)',
            boxShadow: 'var(--glow-purple), 0 0 20px rgba(236, 72, 153, 0.35)',
            border: '1px solid rgba(168, 85, 247, 0.6)',
            overflow: 'hidden',
            padding: '2px',
            flexShrink: 0,
          }}
        >
          <img
            src="/images/okey-mascot.png"
            alt="KARA-OKEY Mascot"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: isSmall ? '1.1rem' : isLarge ? '2.4rem' : '1.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 30%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
          }}
        >
          KARA-OKEY
        </span>
        <Sparkles size={isSmall ? 14 : isLarge ? 22 : 18} color="var(--neon-pink)" />
      </div>
      {showTagline && (
        <span
          style={{
            fontSize: isSmall ? '0.7rem' : '0.85rem',
            color: 'var(--text-muted)',
            marginTop: '2px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Party Karaoke System ✦ Scan to Sing
        </span>
      )}
    </div>
  );
}
