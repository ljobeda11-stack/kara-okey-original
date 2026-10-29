'use client';

import Logo from '@/components/shared/Logo';
import { Mic, Radio, Users } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';

export default function GuestHeader({ roomCode, singerName, onEditName, connectionMode = 'connected', rotationMode = 'off' }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8, 8, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Logo size="sm" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ConnectionStatus mode={connectionMode} />

        {rotationMode === 'fair' && (
          <div
            title="Fair rotation enabled — singers take turns"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.45)',
              color: '#c084fc',
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            <Users size={10} />
            <span>Rotation ON</span>
          </div>
        )}

        <button
          onClick={onEditName}
          className="badge-singer"
          style={{ border: 'none', cursor: 'pointer', background: 'rgba(236, 72, 153, 0.15)' }}
        >
          <Mic size={12} />
          <span>{singerName || 'Set Name'}</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: 'var(--neon-green)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <Radio size={12} className="pulse-glow" />
          <span>{roomCode}</span>
        </div>
      </div>
    </header>
  );
}
