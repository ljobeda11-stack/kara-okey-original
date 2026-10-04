'use client';

import { useState, useEffect } from 'react';
import { Mic, Disc3, Sparkles } from 'lucide-react';

export default function SongTransition({ nextSong, onComplete, durationSeconds = 5 }) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, onComplete]);

  if (!nextSong) return null;

  const coSingers = Array.isArray(nextSong.coSingers) ? nextSong.coSingers : [];
  const allSingers = [nextSong.singerName, ...coSingers].filter(Boolean).join(' & ');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'radial-gradient(circle at 50% 50%, rgba(30, 20, 60, 0.95) 0%, rgba(5, 5, 16, 0.98) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* Background glowing rings */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          boxShadow: '0 0 100px rgba(168, 85, 247, 0.2)',
          pointerEvents: 'none',
          animation: 'pulseRing 3s infinite ease-in-out',
        }}
      />

      {/* Top Banner */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 20px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(236, 72, 153, 0.2)',
          border: '1px solid var(--neon-pink)',
          color: 'var(--neon-pink)',
          fontSize: '0.9rem',
          fontWeight: 800,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '24px',
          boxShadow: 'var(--glow-pink)',
        }}
      >
        <Sparkles size={16} />
        <span>Next Up on Stage</span>
      </div>

      {/* Album Artwork & Details */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '800px',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '3px solid var(--neon-purple)',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)',
          }}
        >
          <img
            src={nextSong.thumbnail}
            alt={nextSong.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            textShadow: '0 0 30px rgba(255, 255, 255, 0.4)',
          }}
        >
          {nextSong.title}
        </h1>

        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          {nextSong.artist}
        </p>

        {/* Singer Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 24px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--grad-primary)',
            color: '#ffffff',
            fontSize: '1.1rem',
            fontWeight: 800,
            boxShadow: 'var(--glow-purple)',
            marginTop: '8px',
          }}
        >
          <Mic size={18} />
          <span>Starring: {allSingers || 'Guest Singer'}</span>
        </div>
      </div>

      {/* Giant Countdown Number */}
      <div
        key={secondsLeft}
        style={{
          marginTop: '36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'countPop 0.8s ease-out',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #06b6d4 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.7))',
            lineHeight: 1,
          }}
        >
          {secondsLeft}
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '6px' }}>
          STARTING IN
        </span>
      </div>

      <style>{`
        @keyframes countPop {
          0% { transform: scale(1.4); opacity: 0.3; }
          40% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
