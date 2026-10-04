'use client';

import { useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import GuestHeader from '@/components/guest/GuestHeader';
import BottomNav from '@/components/guest/BottomNav';
import SearchTab from '@/components/guest/SearchTab';
import QueueTab from '@/components/guest/QueueTab';
import FavoritesTab from '@/components/guest/FavoritesTab';
import ProfileTab from '@/components/guest/ProfileTab';
import CheerPanel from '@/components/guest/CheerPanel';
import Toast from '@/components/shared/Toast';
import ParticleBackground from '@/components/shared/ParticleBackground';
import { Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GuestPage({ params }) {
  const roomCode = (params.code || '').toUpperCase();

  const [activeTab, setActiveTab] = useState('search');
  const [singerName, setSingerName] = useState('');
  const [nowPlaying, setNowPlaying] = useState(null);
  const [queue, setQueue] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [queuedHistory, setQueuedHistory] = useState([]);
  const [votedQueueIds, setVotedQueueIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState('');
  const [roomError, setRoomError] = useState(null);
  const [voterId, setVoterId] = useState('');

  // 1. Initialize guest identity and load room state
  useEffect(() => {
    let cancelled = false;
    // Unique voter ID for toggle voting
    let vId = localStorage.getItem('karaokey_voter_id');
    if (!vId) {
      vId = 'voter_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('karaokey_voter_id', vId);
    }
    setVoterId(vId);

    // Guest Singer Stage Name
    const savedName = localStorage.getItem('karaokey_singer_name');
    if (savedName) {
      setSingerName(savedName);
    } else {
      const defaultName = 'Rockstar ' + Math.floor(Math.random() * 900 + 100);
      setSingerName(defaultName);
      localStorage.setItem('karaokey_singer_name', defaultName);
    }

    // Load Favorites
    try {
      const savedFaves = JSON.parse(localStorage.getItem('karaokey_favorites') || '[]');
      if (!cancelled) setFavorites(savedFaves);
    } catch (e) {}

    // Fetch initial room data
    async function loadRoom() {
      try {
        const res = await fetch(`/api/room/${roomCode}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success && data.room) {
          setNowPlaying(data.room.nowPlaying);
          setQueue(data.room.queue || []);
        } else {
          setRoomError(data.error || 'Room not found');
        }
      } catch (err) {
        if (!cancelled) setRoomError('Could not connect to karaoke room');
      }
    }

    loadRoom();
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // 2. Real-time SSE updates for guest screen
  useEffect(() => {
    if (!roomCode || roomError) return;

    let eventSource;
    let reconnectTimer;
    let closed = false;
    function connectSSE() {
      if (closed) return;
      eventSource = new EventSource(`/api/room/${roomCode}/events`);

      eventSource.addEventListener('queue_updated', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data.queue) setQueue(payload.data.queue);
          if (payload.data.nowPlaying !== undefined) setNowPlaying(payload.data.nowPlaying);
        } catch (err) {}
      });

      eventSource.addEventListener('now_playing_updated', (e) => {
        try {
          const payload = JSON.parse(e.data);
          setNowPlaying(payload.data.nowPlaying);
          if (payload.data.queue) setQueue(payload.data.queue);
        } catch (err) {}
      });

      eventSource.onerror = () => {
        try {
          eventSource.close();
        } catch (e) {}
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectSSE, 3000);
      };
    }

    connectSSE();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      if (eventSource) {
        try {
          eventSource.close();
        } catch (e) {}
      }
    };
  }, [roomCode, roomError]);

  // 3. Queue a song
  const handleQueueSong = useCallback(
    async (song) => {
      try {
        const res = await fetch(`/api/room/${roomCode}/queue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            song,
            singerName,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          // Trigger confetti burst!
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.8 },
              colors: ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b'],
            });
          } catch (e) {}

          setToastMessage(`🎤 "${song.title}" added to queue!`);
          setQueuedHistory((prev) => [song, ...prev]);
        } else {
          setToastMessage(data.error || 'Failed to add song. Try again.');
        }
      } catch (err) {
        setToastMessage('Failed to add song. Try again.');
      }
    },
    [roomCode, singerName]
  );

  // 4. Vote for a song
  const handleVoteSong = useCallback(
    async (queueId) => {
      try {
        const res = await fetch(`/api/room/${roomCode}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueId,
            voterId,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setQueue(data.queue);
          setVotedQueueIds((prev) => {
            const next = new Set(prev);
            if (next.has(queueId)) {
              next.delete(queueId);
            } else {
              next.add(queueId);
            }
            return next;
          });
        }
      } catch (err) {
        console.error('Error voting:', err);
      }
    },
    [roomCode, voterId]
  );

  // Guest can skip to next song from their phone
  const handleGuestSkip = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${roomCode}/skip`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setNowPlaying(data.nowPlaying);
        setQueue(data.queue || []);
        if (data.nowPlaying) {
          setToastMessage(`Skipped! Now playing: ${data.nowPlaying.title}`);
        } else {
          setToastMessage('Skipped! Queue is now empty.');
        }
      } else {
        setToastMessage(data.error || 'Could not skip.');
      }
    } catch (err) {
      setToastMessage('Could not skip. Try again.');
    }
  }, [roomCode]);

  // Guest drag-reorders the shared queue
  const handleReorder = useCallback(
    async (orderedQueueIds) => {
      // Optimistic: reorder locally right away, server echoes via SSE
      setQueue((prev) => {
        const byId = new Map(prev.map((q) => [q.queueId, q]));
        const next = [];
        for (const id of orderedQueueIds) {
          const item = byId.get(id);
          if (item) {
            next.push(item);
            byId.delete(id);
          }
        }
        for (const item of prev) {
          if (byId.has(item.queueId)) next.push(item);
        }
        return next;
      });
      try {
        await fetch(`/api/room/${roomCode}/queue/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedQueueIds }),
        });
      } catch (err) {
        console.error('Error reordering:', err);
      }
    },
    [roomCode]
  );

  // 5. Toggle favorite song
  const handleToggleFavorite = useCallback((song) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      let updated;
      if (exists) {
        updated = prev.filter((s) => s.id !== song.id);
      } else {
        updated = [song, ...prev];
      }
      localStorage.setItem('karaokey_favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 6. Update singer stage name
  const handleSaveSingerName = useCallback((name) => {
    setSingerName(name);
    localStorage.setItem('karaokey_singer_name', name);
    setToastMessage(`Stage name updated to "${name}"!`);
  }, []);

  if (roomError) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <ParticleBackground />
        <div
          className="glass-panel"
          style={{
            padding: '32px 24px',
            maxWidth: '400px',
            width: '100%',
            zIndex: 10,
          }}
        >
          <AlertTriangle size={48} color="var(--neon-rose)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
            Room Not Found
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px', lineHeight: 1.5 }}>
            Room "{roomCode}" is either inactive or expired. Make sure you scanned the latest QR code on the TV!
          </p>
          <Link
            href="/"
            className="btn-primary"
            style={{ marginTop: '24px', width: '100%', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} />
            <span>Go to Host Screen</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '80px', // Space for bottom nav
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <ParticleBackground />

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Header */}
      <GuestHeader
        roomCode={roomCode}
        singerName={singerName}
        onEditName={() => setActiveTab('profile')}
      />

      {/* Main Tab Content */}
      <div style={{ flex: 1, padding: '16px', zIndex: 10 }}>
        {activeTab === 'search' && (
          <SearchTab
            onQueueSong={handleQueueSong}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeTab === 'queue' && (
          <>
            <QueueTab
              queue={queue}
              nowPlaying={nowPlaying}
              onVoteSong={handleVoteSong}
              votedQueueIds={votedQueueIds}
              onReorder={handleReorder}
              onSkip={handleGuestSkip}
            />
            <div style={{ marginTop: '16px' }}>
              <CheerPanel roomCode={roomCode} singerName={singerName} compact />
            </div>
          </>
        )}

        {activeTab === 'party' && (
          <CheerPanel roomCode={roomCode} singerName={singerName} />
        )}

        {activeTab === 'favorites' && (
          <FavoritesTab
            favorites={favorites}
            onQueueSong={handleQueueSong}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            singerName={singerName}
            onSaveSingerName={handleSaveSingerName}
            queuedHistory={queuedHistory}
          />
        )}
      </div>

      {/* Mobile Sticky Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        queueCount={queue.length}
      />
    </main>
  );
}
