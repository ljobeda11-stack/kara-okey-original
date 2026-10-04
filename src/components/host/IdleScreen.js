'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Music2, MonitorPlay, Mic2 } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';
import Logo from '@/components/shared/Logo';

// Main-screen (TV) entry view: app name + logo beside the QR code + a short
// description + how-it-works. Everything is sized from the viewport so the
// whole screen fits a 16:9 TV with NO scrolling at all.
// No queue list, no buttons â€” the phone is the remote for everything.
export default function IdleScreen({ roomCode }) {
  // Measured from the viewport (never hardcoded) so 720p/1080p/4K TVs and
  // laptop windows all fit without scrolling.
  const [qrSize, setQrSize] = useState(260);

  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const size = Math.max(170, Math.min(300, Math.round(vh * 0.4), Math.round(vw * 0.17)));
      setQrSize(size);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div
      className="glass-panel pulse-glow"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(12px, 2.2vh, 24px)',
        height: '100%',
        maxHeight: '100%',
        padding: 'clamp(14px, 2.6vh, 30px) clamp(24px, 4vw, 56px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(168, 85, 247, 0.4)',
      }}
    >
      {/* App name */}
      <div className="float-animation" style={{ display: 'flex', justifyContent: 'center' }}>
        <Logo size="lg" showTagline={true} />
      </div>

      {/* Description */}
      <p
        style={{
          maxWidth: '820px',
          fontSize: 'clamp(0.9rem, 1.6vh, 1.15rem)',
          color: 'var(--text-muted)',
          lineHeight: 1.45,
        }}
      >
        The party karaoke system for your TV. Scan the QR code with your phone, pick any song, and
        it starts playing right here in full screen - automatically!
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

      {/* How it works â€” for the room, nobody has to touch this screen */}
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
          text="The TV goes full screen and autoplays - your phone is the remote."
        />
      </div>
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