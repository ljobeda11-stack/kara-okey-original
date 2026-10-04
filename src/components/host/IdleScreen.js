'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Music2, MonitorPlay, Settings, Trophy, Award, Heart } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';
import Logo from '@/components/shared/Logo';

export default function IdleScreen({ roomCode, onOpenHostControls, leaderboard = [] }) {
  // Measured from the viewport (never hardcoded) so 720p/1080p/4K TVs and
  // laptop windows all fit without scrolling.
  const [qrSize, setQrSize] = useState(240);

  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const size = Math.max(160, Math.min(280, Math.round(vh * 0.38), Math.round(vw * 0.16)));
      setQrSize(size);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const topSingers = Array.isArray(leaderboard) ? leaderboard.slice(0, 3) : [];

  return (
    <div
      className="glass-panel pulse-glow"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(10px, 2vh, 20px)',
        height: '100%',
        maxHeight: '100%',
        padding: 'clamp(14px, 2.4vh, 28px) clamp(24px, 4vw, 56px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(168, 85, 247, 0.4)',
      }}
    >
      {/* Top right Host Controls gear icon */}
      {onOpenHostControls && (
        <button
          onClick={onOpenHostControls}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-glass)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 30,
          }}
          title="Host Admin Controls"
        >
          <Settings size={20} />
        </button>
      )}

      {/* App name */}
      <div className="float-animation" style={{ display: 'flex', justifyContent: 'center' }}>
        <Logo size="lg" showTagline={true} />
      </div>

      {/* Description */}
      <p
        style={{
          maxWidth: '820px',
          fontSize: 'clamp(0.85rem, 1.5vh, 1.1rem)',
          color: 'var(--text-muted)',
          lineHeight: 1.4,
        }}
      >
        The party karaoke system for your TV. Scan the QR code with your phone, pick any song, and
        it starts playing right here in full screen — automatically!
      </p>

      {/* App logo beside the big QR code */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(18px, 3vw, 40px)',
          minHeight: 0,
        }}
      >
        <LogoMark size={qrSize} />
        <QRCodeDisplay roomCode={roomCode} size={qrSize} />
      </div>

      {/* Leaderboard or How It Works */}
      {topSingers.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            maxWidth: '680px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 800,
              color: 'var(--neon-amber)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <Trophy size={16} />
            <span>Tonight's Karaoke Superstars</span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {topSingers.map((singer, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div
                  key={singer.singerName}
                  style={{
                    flex: 1,
                    maxWidth: '180px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{medals[idx]}</span>
                  <span
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                  >
                    {singer.singerName}
                  </span>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{singer.songsSung} song{singer.songsSung > 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--neon-pink)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Heart size={10} fill="var(--neon-pink)" /> {singer.cheersReceived}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* How it works */
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(14px, 2.6vw, 34px)',
            justifyContent: 'center',
            alignItems: 'flex-start',
            maxWidth: '1120px',
          }}
        >
          <Step
            icon={<Smartphone size={17} color="var(--neon-cyan)" />}
            title="1. Scan"
            text="Point your phone camera at the QR code to join the room."
          />
          <Step
            icon={<Music2 size={17} color="var(--neon-pink)" />}
            title="2. Pick a song"
            text="Browse the YouTube karaoke playlists or search any track."
          />
          <Step
            icon={<MonitorPlay size={17} color="var(--neon-purple)" />}
            title="3. Sing"
            text="The TV goes full screen and autoplays — your phone is the remote."
          />
        </div>
      )}
    </div>
  );
}

// Mascot mark shown to the left of the QR code.
function LogoMark({ size = 260 }) {
  return (
    <div
      className="float-animation"
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '24px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, rgba(10, 10, 26, 0.85) 100%)',
        boxShadow: 'var(--glow-purple), 0 0 50px rgba(236, 72, 153, 0.45)',
        border: '1px solid rgba(168, 85, 247, 0.5)',
        padding: '6px',
      }}
    >
      <img
        src="/images/okey-mascot.png"
        alt="KARA-OKEY Mascot"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '18px',
          filter: 'drop-shadow(0 0 16px rgba(236, 72, 153, 0.6))',
        }}
      />
    </div>
  );
}

function Step({ icon, title, text }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        maxWidth: '250px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon}
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(0.82rem, 1.5vh, 0.95rem)',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          {title}
        </span>
      </div>
      <span
        style={{
          fontSize: 'clamp(0.68rem, 1.2vh, 0.8rem)',
          color: 'var(--text-dim)',
          lineHeight: 1.45,
        }}
      >
        {text}
      </span>
    </div>
  );
}