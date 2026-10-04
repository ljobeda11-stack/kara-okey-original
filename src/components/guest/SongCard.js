'use client';

import { Plus, Star, Check, Mic } from 'lucide-react';

export default function SongCard({
  song,
  onQueue,
  isFavorite = false,
  onToggleFavorite,
  isQueued = false,
}) {
  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: 'relative',
          width: '54px',
          height: '54px',
          borderRadius: '10px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src={song.thumbnail}
          alt={song.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {song.category && (
          <span
            style={{
              position: 'absolute',
              bottom: '2px',
              left: '2px',
              right: '2px',
              fontSize: '0.55rem',
              fontWeight: 700,
              background: 'rgba(0,0,0,0.7)',
              color: '#ffffff',
              textAlign: 'center',
              borderRadius: '2px',
              padding: '1px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {song.category}
          </span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontSize: '0.92rem',
            fontWeight: 700,
            color: '#ffffff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}
        >
          {song.title}
        </h4>
        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {song.artist}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '3px',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
          }}
        >
          <span>{song.duration}</span>
          {song.views && <span>• {song.views}</span>}
          {song.source === 'youtube' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 7px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: 'var(--neon-green)',
                fontWeight: 700,
                fontSize: '0.62rem',
                letterSpacing: '0.03em',
              }}
            >
              ▶ KARAOKE
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(song)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: isFavorite ? 'var(--neon-amber)' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isFavorite ? 'Remove Favorite' : 'Save Favorite'}
          >
            <Star size={18} fill={isFavorite ? 'var(--neon-amber)' : 'none'} />
          </button>
        )}

        <button
          onClick={() => onQueue(song)}
          disabled={isQueued}
          className={isQueued ? '' : 'btn-primary'}
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-full)',
            background: isQueued ? 'rgba(34, 197, 94, 0.2)' : undefined,
            color: isQueued ? 'var(--neon-green)' : '#ffffff',
            border: isQueued ? '1px solid var(--neon-green)' : 'none',
            cursor: isQueued ? 'default' : 'pointer',
          }}
        >
          {isQueued ? (
            <>
              <Check size={14} />
              <span>Queued</span>
            </>
          ) : (
            <>
              <Plus size={14} />
              <span>Sing!</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
