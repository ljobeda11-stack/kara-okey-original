'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, X, Radio } from 'lucide-react';
import SongCard from './SongCard';

// Fallbacks so the pills render instantly before /api/playlists answers.
const FALLBACK_PLAYLISTS = [
  { id: 'party-hits', name: 'Party Hits', emoji: '🎉' },
  { id: 'rock-classics', name: 'Rock Classics', emoji: '🎸' },
  { id: 'pop-ballads', name: 'Pop & Ballads', emoji: '💖' },
  { id: 'disney-showtunes', name: 'Disney & Showtunes', emoji: '🏰' },
];

export default function SearchTab({ onQueueSong, favorites = [], onToggleFavorite }) {
  const [query, setQuery] = useState('');
  const [playlists, setPlaylists] = useState(FALLBACK_PLAYLISTS);
  const [activePlaylist, setActivePlaylist] = useState(FALLBACK_PLAYLISTS[0].name);
  const [browseSongs, setBrowseSongs] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseDescription, setBrowseDescription] = useState('');
  const [searchSongs, setSearchSongs] = useState([]);
  const [searching, setSearching] = useState(false);
  const [queuedIds, setQueuedIds] = useState(new Set());

  const isSearchMode = query.trim().length > 0;

  // 1. Playlist metadata (names + emoji) — instant, no YouTube calls.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch('/api/playlists?meta=1');
        const data = await res.json();
        if (!cancel && data.success && Array.isArray(data.playlists) && data.playlists.length) {
          setPlaylists(data.playlists);
          setActivePlaylist((prev) =>
            data.playlists.some((p) => p.name === prev) ? prev : data.playlists[0].name
          );
        }
      } catch (err) {
        // keep fallbacks
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // 2. Browse mode: load the selected curated playlist (real YouTube karaoke).
  useEffect(() => {
    if (isSearchMode) return;
    let cancel = false;
    async function loadPlaylist() {
      setBrowseLoading(true);
      try {
        const res = await fetch(`/api/playlists?category=${encodeURIComponent(activePlaylist)}`);
        const data = await res.json();
        if (cancel) return;
        if (data.success) {
          setBrowseSongs(data.songs || []);
          setBrowseDescription(data.description || '');
        } else {
          setBrowseSongs([]);
        }
      } catch (err) {
        if (!cancel) setBrowseSongs([]);
      } finally {
        if (!cancel) setBrowseLoading(false);
      }
    }
    loadPlaylist();
    return () => {
      cancel = true;
    };
  }, [activePlaylist, isSearchMode]);

  // 3. Search mode: live YouTube karaoke search (debounced).
  useEffect(() => {
    if (!isSearchMode) return;
    let cancel = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (!cancel && data.success) setSearchSongs(data.results || []);
      } catch (err) {
        if (!cancel) setSearchSongs([]);
      } finally {
        if (!cancel) setSearching(false);
      }
    }, 450);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [query, isSearchMode]);

  const handleQueueClick = (song) => {
    onQueueSong(song);
    setQueuedIds((prev) => new Set([...prev, song.id]));
    setTimeout(() => {
      setQueuedIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }, 2000);
  };

  const loading = isSearchMode ? searching : browseLoading;
  const songs = isSearchMode ? searchSongs : browseSongs;
  const activeMeta = playlists.find((p) => p.name === activePlaylist) || FALLBACK_PLAYLISTS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search Input Box */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-glow)',
        }}
      >
        <Search size={18} color="var(--neon-purple)" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search song title, artist, or YouTube link..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '0.95rem',
            fontFamily: 'var(--font-body)',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Playlist pills — browse mode only (typing switches to live search) */}
      {!isSearchMode && (
        <>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            {playlists.map((pl) => {
              const isSelected = activePlaylist === pl.name;
              return (
                <button
                  key={pl.id || pl.name}
                  onClick={() => setActivePlaylist(pl.name)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    whiteSpace: 'nowrap',
                    background: isSelected ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    border: isSelected ? 'none' : '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'var(--glow-purple)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {pl.emoji ? `${pl.emoji} ` : ''}
                  {pl.name}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: 'var(--neon-green)',
              fontWeight: 600,
            }}
          >
            <Radio size={13} />
            <span>
              {activeMeta.emoji ? `${activeMeta.emoji} ` : ''}
              {activePlaylist} — real YouTube karaoke videos
            </span>
          </div>

          {browseDescription && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{browseDescription}</p>
          )}
        </>
      )}

      {/* Song List Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isSearchMode && !loading && songs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: 'var(--neon-green)',
              fontWeight: 600,
            }}
          >
            <Radio size={13} />
            <span>Live karaoke results from YouTube — lyrics with music</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            <Sparkles size={24} className="pulse-glow" color="var(--neon-purple)" />
            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
              {isSearchMode
                ? 'Searching YouTube karaoke tracks...'
                : `Loading ${activePlaylist} karaoke playlist...`}
            </p>
          </div>
        ) : songs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <p>
              {isSearchMode
                ? `No karaoke videos found for "${query}".`
                : 'No karaoke videos loaded. Check your connection and try another playlist.'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Tip: Paste any YouTube link to sing custom tracks!
            </p>
          </div>
        ) : (
          songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onQueue={handleQueueClick}
              isQueued={queuedIds.has(song.id)}
              isFavorite={favorites.some((f) => f.id === song.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))
        )}
      </div>
    </div>
  );
}
