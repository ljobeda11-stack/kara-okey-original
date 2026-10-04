'use client';

import { SkipForward, PlusCircle, Maximize2, Users, RefreshCw } from 'lucide-react';

export default function HostControls({ onSkip, onAddDemo, guestCount = 1, roomCode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-glass)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          <Users size={16} color="var(--neon-cyan)" />
          <span style={{ color: 'var(--text-muted)' }}>Connected:</span>
          <span style={{ fontWeight: 700, color: '#ffffff' }}>{guestCount} singer{guestCount > 1 ? 's' : ''}</span>
        </div>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-glass)' }} />

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Room Code: <strong style={{ color: 'var(--neon-purple)', letterSpacing: '0.05em' }}>{roomCode}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onAddDemo}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <PlusCircle size={15} />
          <span>Quick Demo Song</span>
        </button>

        <button
          onClick={onSkip}
          className="btn-accent"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <SkipForward size={15} />
          <span>Skip Track</span>
        </button>

        {onOpenHostControls && (
          <button
            onClick={onOpenHostControls}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Host Controls"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
