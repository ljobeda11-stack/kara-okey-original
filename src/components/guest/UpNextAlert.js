'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Sparkles, X, ChevronRight } from 'lucide-react';

export default function UpNextAlert({ song, onClose }) {
  const [visible, setVisible] = useState(false);

  // Keep the latest onClose in a ref so the parent re-rendering (which passes a
  // fresh inline callback every time) never restarts this effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Identify the specific alert. A brand-new song must trigger a fresh alert,
  // so key the effect on the song itself rather than on the callback identity.
  const songKey = song ? song.queueId || song.id || song.title || '' : null;

  useEffect(() => {
    // No song on stage: nothing to alert about (never vibrate here).
    if (!songKey) {
      setVisible(false);
      return undefined;
    }

    // A new "you're up next" alert: reveal it and buzz once.
    setVisible(true);

    // Vibrate device if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 500]);
      } catch (e) {}
    }

    // Auto-dismiss after 9 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      if (onCloseRef.current) onCloseRef.current();
    }, 9000);

    return () => clearTimeout(timer);
  }, [songKey]);

  const dismiss = () => {
    setVisible(false);
    if (onCloseRef.current) onCloseRef.current();
  };

  if (!visible || !song) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(8, 8, 20, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '28px 24px',
          textAlign: 'center',
          background: 'radial-gradient(circle at 50% 20%, rgba(236, 72, 153, 0.25) 0%, rgba(15, 17, 38, 0.95) 80%)',
          border: '2px solid var(--neon-pink)',
          boxShadow: 'var(--glow-pink), 0 0 80px rgba(236, 72, 153, 0.4)',
          borderRadius: 'var(--radius-lg)',
          animation: 'bounceInAlert 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--grad-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--glow-pink)',
            animation: 'pulseScale 1.2s infinite ease-in-out',
          }}
        >
          <Mic size={32} color="#ffffff" />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(236, 72, 153, 0.2)',
            border: '1px solid var(--neon-pink)',
            color: 'var(--neon-pink)',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          <Sparkles size={13} />
          <span>Stage Ready!</span>
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
          }}
        >
          YOU'RE UP NEXT!
        </h2>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Get ready to grab the microphone! Your song is at #1 in the queue:
        </p>

        {/* Song Card Preview */}
        <div
          style={{
            marginTop: '18px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left',
          }}
        >
          <img
            src={song.thumbnail}
            alt={song.title}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '10px',
              objectFit: 'cover',
              border: '1px solid var(--neon-pink)',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#ffffff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {song.title}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{song.artist}</p>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="btn-accent"
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '12px',
            fontSize: '0.95rem',
            fontWeight: 800,
            borderRadius: 'var(--radius-full)',
          }}
        >
          <span>I'm Ready!</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <style>{`
        @keyframes bounceInAlert {
          0% { opacity: 0; transform: scale(0.7); }
          60% { opacity: 1; transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
