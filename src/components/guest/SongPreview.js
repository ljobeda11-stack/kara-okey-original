'use client';

import { X, Mic, Plus, Check, Star } from 'lucide-react';

export default function SongPreview({
  song,
  isOpen,
  onClose,
  onQueue,
  isQueued,
  isFavorite,
  onToggleFavorite,
}) {
  if (!isOpen || !song) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 5, 16, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(15, 17, 38, 0.98)',
          border: '1px solid var(--border-glow)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          boxShadow: 'var(--glow-purple), 0 -10px 40px rgba(0,0,0,0.8)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          animation: 'slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle pill */}
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255, 255, 255, 0.2)',
            alignSelf: 'center',
            marginBottom: '4px',
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--neon-green)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ▶ Karaoke Audio Preview
            </div>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#ffffff',
                marginTop: '2px',
                maxWidth: '360px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {song.title}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{song.artist}</p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Embedded YouTube Preview Player */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-glass)',
            background: '#000000',
          }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${song.id}?autoplay=1&playsinline=1&rel=0`}
            title={song.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(song)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                color: isFavorite ? 'var(--neon-amber)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Favorite"
            >
              <Star size={20} fill={isFavorite ? 'var(--neon-amber)' : 'none'} />
            </button>
          )}

          <button
            onClick={() => {
              if (onQueue) onQueue(song);
              onClose();
            }}
            disabled={isQueued}
            className="btn-primary"
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isQueued ? (
              <>
                <Check size={18} />
                <span>Already in Queue</span>
              </>
            ) : (
              <>
                <Mic size={18} />
                <span>Sing This Version!</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
