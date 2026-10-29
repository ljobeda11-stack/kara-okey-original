'use client';

// Compact connection status indicator for the guest header.
// Shows green dot when SSE is connected, amber when reconnecting,
// and red when both SSE and polling are unavailable.
export default function ConnectionStatus({ mode }) {
  // mode: 'connected' | 'reconnecting' | 'offline'
  const colors = {
    connected: { bg: 'rgba(34, 197, 94, 0.25)', border: 'rgba(34, 197, 94, 0.5)', dot: '#22c55e', label: 'Connected' },
    reconnecting: { bg: 'rgba(234, 179, 8, 0.2)', border: 'rgba(234, 179, 8, 0.45)', dot: '#eab308', label: 'Reconnecting…' },
    offline: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.45)', dot: '#ef4444', label: 'Offline' },
  };
  const style = colors[mode] || colors.offline;

  return (
    <div
      title={style.label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: 'var(--radius-full)',
        background: style.bg,
        border: `1px solid ${style.border}`,
        fontSize: '0.7rem',
        fontWeight: 600,
        color: style.dot,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: style.dot,
          boxShadow: `0 0 4px ${style.dot}`,
          animation: mode === 'reconnecting' ? 'pulse-glow 1.2s ease-in-out infinite' : 'none',
        }}
      />
      <span>{style.label}</span>
    </div>
  );
}
