'use client';

import { useState } from 'react';
import { EFFECTS, playEffect } from '@/lib/sounds';

export default function CheerPanel({ roomCode, singerName, compact = false }) {
  const [cooldown, setCooldown] = useState(false);

  const sendCheer = async (effectId) => {
    // Always play local feedback instantly (even if TV is unreachable)
    try {
      playEffect(effectId);
    } catch (e) {}
    if (!roomCode || cooldown) return;
    // Short throttle so guests can spam the soundboard but not flood SSE
    setCooldown(true);
    setTimeout(() => setCooldown(false), 400);
    try {
      await fetch(`/api/room/${roomCode}/cheer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effectId, fromName: singerName }),
      });
    } catch (e) {}
  };

  return (
    <div
      className="glass-panel"
      style={{ padding: compact ? '14px' : '18px 16px' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700 }}>
          🎉 Hype the Stage!
        </h4>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          Tap to spam — TV plays it loud!
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {EFFECTS.map((fx) => (
          <button
            key={fx.id}
            onClick={() => sendCheer(fx.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '12px 6px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${fx.color}55`,
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.92)';
              e.currentTarget.style.background = `${fx.color}44`;
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{fx.emoji}</span>
            <span>{fx.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
