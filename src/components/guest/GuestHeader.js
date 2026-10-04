'use client';

import Logo from '@/components/shared/Logo';
import { Mic, Radio } from 'lucide-react';

export default function GuestHeader({ roomCode, singerName, onEditName }) {
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
