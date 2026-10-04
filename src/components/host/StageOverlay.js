'use client';

import { Mic, Users, SkipForward } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

// In-video overlay for the TV stage. Nothing is clickable — the phone is the
// remote.
//
// LEFT  : the neon "now singing" card. It is deliberately compact and only
//         pops up for the first 10 seconds of a song and again for 10 seconds
//         around the middle, so the karaoke lyrics are never covered while
//         people are actually singing.
// RIGHT : the join QR code only (small, top-right corner) so latecomers can
//         always scan and join without the overlay sitting on top of the
//         lyrics. The mascot mark is intentionally not drawn during playback.
const BAR_COUNT = 14;
const TITLE_WINDOW = 10; // seconds the "now singing" card stays on screen

// Pure helper: the host page feeds VideoPlayer's progress through this so the
// card only toggles at the two windows instead of re-rendering every tick.
export function computeTitleVisible(currentTime = 0, duration = 0) {
  const t = Number.isFinite(currentTime) ? currentTime : 0;
  if (t < TITLE_WINDOW) return true; // entry window: 0-10s
  const d = Number.isFinite(duration) ? duration : 0;
  if (d > TITLE_WINDOW * 2) {
    const middle = d / 2;
    // middle window: 10s centred on the halfway point of the song
    if (t >= middle - TITLE_WINDOW / 2 && t < middle + TITLE_WINDOW / 2) return true;
  }
  return false;
}

export default function StageOverlay({
  song,
  roomCode,
  guestCount = 1,
  nextSong,
  titleVisible = true,
}) {
  return (
    <div
      className="stage-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '14px',
        padding: 'clamp(8px, 1.4vh, 18px) clamp(12px, 1.6vw, 24px)',
        pointerEvents: 'none',
      }}
    >
      {/* LEFT: compact neon card — pops in at the entry + middle windows only */}
      <div
        className="neon-overlay-panel"
        style={{
          ...panelStyle,
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {/* Equalizer bars */}
          <div className="stage-eq" aria-hidden="true" style={{ height: '20px', gap: '2px' }}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <span
                key={i}
                className="stage-eq-bar"
                style={{
                  width: '3px',
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
              gap: '5px',
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--neon-pink)',
            }}
          >
            <Mic size={11} />
            Now singing
          </span>
        </div>

        <h2
          className="neon-title"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
            marginTop: '7px',
            maxWidth: '46vw',
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
            gap: '7px',
            marginTop: '6px',
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
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(6, 182, 212, 0.25)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              <Users size={10} />
              <span>{song?.mode === 'duet' ? 'DUET' : 'GROUP'}</span>
            </span>
          )}
          {song?.artist && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{song.artist}</span>
          )}
          <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
            <Users size={11} style={{ verticalAlign: '-2px' }} /> {guestCount} connected
          </span>
          {nextSong && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.68rem',
                color: 'var(--neon-cyan)',
                fontWeight: 600,
                maxWidth: '30vw',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <SkipForward size={11} />
              Up next: {nextSong.title}
            </span>
          )}
        </div>
      </div>

      {/* RIGHT: join QR only — small, top-right corner, never covers the lyrics */}
      <div style={{ flexShrink: 0 }}>
        <QRCodeDisplay roomCode={roomCode} size={104} compact />
      </div>
    </div>
  );
}

const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  padding: '11px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'rgba(8, 8, 20, 0.68)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(168, 85, 247, 0.45)',
  boxShadow: 'var(--glow-purple)',
  maxWidth: '48vw',
  transformOrigin: 'top left',
};
