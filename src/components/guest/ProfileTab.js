'use client';

import { useState } from 'react';
import { User, Check, Mic, Music, Sparkles } from 'lucide-react';
import MascotImage from '@/components/shared/MascotImage';

export default function ProfileTab({
  singerName,
  onSaveSingerName,
  queuedHistory = [],
}) {
  const [nameInput, setNameInput] = useState(singerName || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onSaveSingerName(nameInput.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Profile Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <MascotImage size="md" />

        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 800,
            marginTop: '12px',
          }}
        >
          {singerName || 'Guest Singer'}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          This name appears on the TV screen when your song plays!
        </p>

        {/* Change Name Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: '340px',
            marginTop: '16px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your stage name..."
            maxLength={20}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.85rem' }}
          >
            {savedSuccess ? <Check size={16} /> : 'Save'}
          </button>
        </form>
      </div>

      {/* Your Queued Songs History in this room */}
      <div>
        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>
          Your Queued Songs
        </h4>

        {queuedHistory.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
            }}
          >
            You haven't queued any songs yet!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queuedHistory.map((song, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                }}
              >
                <Music size={16} color="var(--neon-purple)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {song.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
