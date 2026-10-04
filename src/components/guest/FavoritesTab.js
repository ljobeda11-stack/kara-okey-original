'use client';

import { Star, Music } from 'lucide-react';
import SongCard from './SongCard';

export default function FavoritesTab({
  favorites = [],
  onQueueSong,
  onToggleFavorite,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Star size={20} color="var(--neon-amber)" fill="var(--neon-amber)" />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
          Your Favorite Songs ({favorites.length})
        </h3>
      </div>

      {favorites.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Star size={36} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
            No favorites yet
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Tap the star icon next to any song in Search to save it here for fast access!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {favorites.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onQueue={onQueueSong}
              isFavorite={true}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
