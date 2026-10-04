'use client';

import { useEffect, useState } from 'react';
import {
  Disc3,
  Mic,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Volume2,
  Sparkles,
  Users,
} from 'lucide-react';
import { playEffect, preloadEffects } from '@/lib/sounds';

export default function NowPlayingBar({
  nowPlaying,
  onSkip,
  roomCode,
  singerName,
  onOpenQueue,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Pre-decode the reaction recordings so the first quick-cheer tap plays the
  // real crowd instead of the synthesized fallback.
  useEffect(() => {
    preloadEffects();
  }, []);

  if (!nowPlaying) return null;

  const coSingers = Array.isArray(nowPlaying.coSingers) ? nowPlaying.coSingers : [];
  const allSingers = [nowPlaying.singerName, ...coSingers].filter(Boolean).join(' & ');

  const handleQuickCheer = (effectId) => {
    try {
      playEffect(effectId);
    } catch (e) {}

    if (roomCode) {
      fetch(`/api/room/${roomCode}/cheer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectId,
          fromName: singerName || 'Guest',
        }),
      }).catch(() => {});
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '68px', // Positioned directly above BottomNav (which is ~60px + margin)
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '576px',
        zIndex: 45,
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(15, 17, 38, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), var(--glow-purple)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Mini Bar View */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          cursor: 'pointer',
        }}
      >
        {/* Animated Spinning Record / Thumbnail */}
        <div
          style={{
            position: 'relative',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--neon-pink)',
            flexShrink: 0,
            boxShadow: 'var(--glow-pink)',
          }}
        >
          <img
            src={nowPlaying.thumbnail}
            alt={nowPlaying.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              animation: 'spinRecord 8s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '35%',
              background: '#080814',
              borderRadius: '50%',
              border: '1px solid var(--neon-pink)',
            }}
          />
        </div>

        {/* Song Info with Marquee effect */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'var(--neon-pink)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--neon-green)',
                boxShadow: '0 0 8px var(--neon-green)',
              }}
            />
            <span>Now Playing on TV</span>
          </div>

          <div
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#ffffff',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              marginTop: '1px',
            }}
          >
            {nowPlaying.title}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginTop: '1px',
            }}
          >
            <span style={{ color: 'var(--neon-purple)', fontWeight: 600 }}>
              🎤 {allSingers || 'Guest Singer'}
            </span>
            <span>•</span>
            <span>{nowPlaying.artist}</span>
          </div>
        </div>

        {/* Quick Expand Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Controls Drawer */}
      {isExpanded && (
        <div
          style={{
            padding: '12px 14px 14px',
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(10, 10, 26, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Quick Hype / Cheer Buttons */}
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                marginBottom: '6px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Sparkles size={11} color="var(--neon-amber)" />
              <span>Hype the Stage</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[
                { id: 'applause', label: '👏 Clap' },
                { id: 'cheer', label: '🎉 Cheer' },
                { id: 'horn', label: '📯 Horn' },
                { id: 'wow', label: '😮 Wow' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleQuickCheer(btn.id)}
                  style={{
                    padding: '7px 4px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-glass)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Row: Skip & Open Queue */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {onOpenQueue && (
              <button
                onClick={onOpenQueue}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View Full Queue
              </button>
            )}

            {onSkip && (
              <button
                onClick={onSkip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--grad-accent)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: 'var(--glow-pink)',
                }}
              >
                <SkipForward size={13} />
                <span>Skip Song</span>
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spinRecord {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
