'use client';

import { ListMusic, ThumbsUp, Trash2, Mic, Clock } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

export default function QueueSidebar({ queue = [], roomCode, onRemoveSong }) {
  return (
    <aside
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '20px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-glass)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={20} color="var(--neon-purple)" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>
            Song Queue
          </h3>
        </div>
        <span className="badge-neon">{queue.length} UPCOMING</span>
      </div>

      {/* Queue List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingRight: '4px',
          marginBottom: '16px',
        }}
      >
        {queue.length === 0 ? (
          <div
            style={{
              padding: '30px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            <p style={{ marginBottom: '8px' }}>Queue is empty!</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Scan the QR code below on your phone to add the next song!
            </p>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.queueId || index}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {/* Position Number */}
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: index === 0 ? 'var(--neon-pink)' : 'var(--text-dim)',
                  width: '24px',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                #{index + 1}
              </div>

              {/* Thumbnail */}
              <img
                src={item.thumbnail}
                alt={item.title}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />

              {/* Title & Singer info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#ffffff',
                  }}
                >
                  {item.title}
                </h4>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  <span style={{ color: 'var(--neon-purple)', fontWeight: 600 }}>
                    🎤 {item.singerName || 'Guest'}
                  </span>
                  <span>•</span>
                  <span>{item.duration}</span>
                </div>
              </div>

              {/* Votes & Remove button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {item.votes > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--neon-amber)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <ThumbsUp size={11} /> {item.votes}
                  </span>
                )}

                {onRemoveSong && (
                  <button
                    onClick={() => onRemoveSong(item.queueId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    title="Remove from queue"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Code footer */}
      <div style={{ flexShrink: 0 }}>
        <QRCodeDisplay roomCode={roomCode} size={130} />
      </div>
    </aside>
  );
}
