'use client';

import { useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message || !onClose) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        borderRadius: 'var(--radius-full)',
        background: 'rgba(15, 16, 38, 0.95)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isSuccess ? 'var(--neon-purple)' : 'var(--neon-rose)'}`,
        boxShadow: isSuccess ? 'var(--glow-purple)' : '0 0 25px rgba(244, 63, 94, 0.3)',
        color: '#ffffff',
        fontSize: '0.9rem',
        fontWeight: 500,
        animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} color="var(--neon-green)" />
      ) : (
        <AlertCircle size={18} color="var(--neon-rose)" />
      )}
      <span>{message}</span>
      <Sparkles size={14} color="var(--neon-pink)" />
    </div>
  );
}
