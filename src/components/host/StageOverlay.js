'use client';

import { Mic, Users, SkipForward } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

// In-video overlay for the TV stage: neon music animation + song info on the
// left, join QR code on the right. Nothing is clickable — the phone is the
// remote.
//
// The overlay (and especially the QR code) is ALWAYS visible during playback:
// latecomers walking into the room must be able to scan and join at any
// second without waiting for a fade cycle or touching the TV.
const BAR_COUNT = 26;

export default function StageOverlay({ song, roomCode, guestCount = 1, nextSong }) {
  return (
    <div
      className="stage-overlay stage-overlay-visible"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '18px',
        padding: 'clamp(10px, 1.8vh, 22px) clamp(14px, 2vw, 28px)',
        pointerEvents: 'none',
        opacity: 1,
      }}
    >
      {/* LEFT: neon music animation + song / singer / up next */}
      <div className="neon-overlay-panel" style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Equalizer bars */}
          <div className="stage-eq" aria-hidden="true">
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <span
                key={i}
                className="stage-eq-bar"
                style={{
                  animationDelay: `${((i * 0.11) % 1.1).toFixed(2)}s`,
                  animationDuration: `${(0.6 + ((i % 5) * 0.14)).toFixed(2)}s`,
                }}
              />
            ))}
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--neon-pink)',
            }}
          >
            <Mic size={13} />
            Now singing
          </span>
        </div>

        <h2
          className="neon-title"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.9rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            marginTop: '10px',
            maxWidth: '62vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {song?.title}
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '8px',
          }}
        >
          <span className="badge-singer">
            <Mic size={12} />
            <span>{[song?.singerName, ...(song?.coSingers || [])].filter(Boolean).join(' & ') || 'Guest'}</span>
          </span>
          {song?.mode && song?.mode !== 'solo' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 9px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(6, 182, 212, 0.25)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              <Users size={11} />
              <span>{song?.mode === 'duet' ? 'DUET' : 'GROUP'}</span>
            </span>
          )}
          {song?.artist && (
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{song.artist}</span>
          )}
          <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            <Users size={12} style={{ verticalAlign: '-2px' }} /> {guestCount} connected
          </span>
          {nextSong && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.82rem',
                color: 'var(--neon-cyan)',
                fontWeight: 600,
                maxWidth: '40vw',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <SkipForward size={12} />
              Up next: {nextSong.title}
            </span>
          )}
        </div>
      </div>

      {/* RIGHT: app logo beside the join QR — permanently on screen */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '12px 14px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(8, 8, 20, 0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          boxShadow: 'var(--glow-cyan)',
        }}
      >
        <LogoMark size={76} />
        <QRCodeDisplay roomCode={roomCode} size={150} compact />
      </div>
    </div>
  );
}

// Small neon mascot mark kept next to the QR so the app identity stays on screen
// during the whole song.
function LogoMark({ size = 76 }) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(10, 10, 26, 0.9) 100%)',
        boxShadow: 'var(--glow-purple), 0 0 25px rgba(236, 72, 153, 0.4)',
        border: '1px solid rgba(168, 85, 247, 0.6)',
        padding: '3px',
      }}
    >
      <img
        src="/images/okey-mascot.png"
        alt="KARA-OKEY Mascot"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  padding: '16px 20px',
  borderRadius: 'var(--radius-lg)',
  background: 'rgba(8, 8, 20, 0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(168, 85, 247, 0.45)',
  boxShadow: 'var(--glow-purple)',
  maxWidth: '64vw',
};
