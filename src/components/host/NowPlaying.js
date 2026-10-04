'use client';

import { Mic, Music, User } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

export default function NowPlaying({ song, isPlaying = true }) {
  if (!song) return null;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        boxShadow: 'var(--glow-purple)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        {/* Animated pulsating Disc/Mic thumbnail */}
        <div
          style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            overflow: 'hidden',
            flexShrink: 0,
            border: '2px solid var(--neon-purple)',
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
          }}
        >
          <img
            src={song.thumbnail}
            alt={song.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Music size={22} color="#ffffff" />
          </div>
        </div>

        {/* Song & Singer Details */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--neon-pink)',
                fontWeight: 700,
              }}
            >
              ✦ NOW PERFORMING
            </span>

            <span className="badge-singer">
              <Mic size={12} />
              <span>Singer: {song.singerName || 'Guest'}</span>
            </span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.02em',
            }}
          >
            {song.title}
          </h2>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{song.artist}</span>
            <span>•</span>
            <span style={{ color: 'var(--text-dim)' }}>{song.duration}</span>
          </p>
        </div>
      </div>

      {/* Dynamic Sound Visualizer */}
      <div style={{ flexShrink: 0 }}>
        <AudioVisualizer isPlaying={isPlaying} barCount={20} />
      </div>
    </div>
  );
}
