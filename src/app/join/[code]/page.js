'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import GuestHeader from '@/components/guest/GuestHeader';
import BottomNav from '@/components/guest/BottomNav';
import SearchTab from '@/components/guest/SearchTab';
import QueueTab from '@/components/guest/QueueTab';
import FavoritesTab from '@/components/guest/FavoritesTab';
import ProfileTab from '@/components/guest/ProfileTab';
import CheerPanel from '@/components/guest/CheerPanel';
import NowPlayingBar from '@/components/guest/NowPlayingBar';
import UpNextAlert from '@/components/guest/UpNextAlert';
import Toast from '@/components/shared/Toast';
import ParticleBackground from '@/components/shared/ParticleBackground';
import { Sparkles, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function GuestPage({ params }) {
  const routeParams = useParams();

  // Safely extract room code from useParams(), params prop, or window location
  const extractCode = () => {
    const raw = routeParams?.code || params?.code || '';
    if (typeof raw === 'string' && raw.trim()) return raw.trim().toUpperCase();
    if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim().toUpperCase();
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/join\/([^/?#]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]).trim().toUpperCase();
    }
    return '';
  };

  const [roomCode, setRoomCode] = useState(extractCode());
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
  const [upNextSong, setUpNextSong] = useState(null);
  const alertedRef = useRef(new Set());

  // Connection state: 'connected' | 'reconnecting' | 'offline'
  const [connectionMode, setConnectionMode] = useState('connected');
  // Ref keeps the latest value accessible inside the poll closure
  // without restarting the interval on every mode transition.
  const connectionModeRef = useRef(connectionMode);
  connectionModeRef.current = connectionMode;

  const [rotationMode, setRotationMode] = useState('off');

  // Keep room code up to date if router resolves later
  useEffect(() => {
    const c = extractCode();
    if (c && c !== roomCode) {
      setRoomCode(c);
    }
    // Also unwrap params if it's a Promise in Next.js 14.2+
    Promise.resolve(params).then((p) => {
      const code = p?.code || routeParams?.code;
      if (code && typeof code === 'string' && code.trim().toUpperCase() !== roomCode) {
        setRoomCode(code.trim().toUpperCase());
      }
    });
  }, [routeParams, params]);

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

    // Fetch initial room data (only once roomCode is determined)
    async function loadRoom() {
      if (!roomCode || roomCode.length < 2) return;
      try {
        const res = await fetch(`/api/room/${roomCode}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success && data.room) {
          if (!data.room.synthetic) {
            setNowPlaying(data.room.nowPlaying);
            setQueue(data.room.queue || []);
            setRoomError(null);
          } else {
            // Room is synthetic on this instance, retry in 1.2s before showing error
            setTimeout(async () => {
              if (cancelled) return;
              try {
                const retryRes = await fetch(`/api/room/${roomCode}`, { cache: 'no-store' });
                const retryData = await retryRes.json();
                if (retryRes.ok && retryData.success && retryData.room && !retryData.room.synthetic) {
                  setNowPlaying(retryData.room.nowPlaying);
                  setQueue(retryData.room.queue || []);
                  setRoomError(null);
                }
              } catch (err) {}
            }, 1200);
          }
        } else {
          // Attempt retry after 1s before locking out
          setTimeout(async () => {
            if (cancelled) return;
            try {
              const retryRes = await fetch(`/api/room/${roomCode}`, { cache: 'no-store' });
              const retryData = await retryRes.json();
              if (retryRes.ok && retryData.success && retryData.room) {
                if (!retryData.room.synthetic) {
                  setNowPlaying(retryData.room.nowPlaying);
                  setQueue(retryData.room.queue || []);
                  setRoomError(null);
                }
              } else {
                setRoomError(data.error || 'Room not found');
              }
            } catch (err) {
              setRoomError('Could not connect to karaoke room');
            }
          }, 1200);
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

      eventSource.addEventListener('open', () => {
        if (!closed) setConnectionMode('connected');
      });

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

      eventSource.addEventListener('room_settings_updated', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data.rotationMode !== undefined) setRotationMode(payload.data.rotationMode);
        } catch (err) {}
      });

      eventSource.onerror = () => {
        try {
          eventSource.close();
        } catch (e) {}
        clearTimeout(reconnectTimer);
        setConnectionMode('reconnecting');
        reconnectTimer = setTimeout(connectSSE, 4000);
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

  // 3. Smart HTTP Polling Fallback (runs every 2.5s for seamless multi-instance sync on Vercel)
  useEffect(() => {
    if (!roomCode || roomError) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/room/${roomCode}`, { cache: 'no-store' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data.success && data.room && !data.room.synthetic) {
            setNowPlaying(data.room.nowPlaying);
            setQueue(data.room.queue || []);
            if (connectionModeRef.current === 'reconnecting') setConnectionMode('connected');
          } else if (!cancelled && res.status !== 404) {
            setConnectionMode('offline');
          }
        } else if (!cancelled && res.status === 404) {
          setRoomError('Room not found');
        }
      } catch (e) {
        if (!cancelled) setConnectionMode('offline');
      }
    };

    const interval = setInterval(poll, 2500);
    // Initial poll to set initial state
    poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomCode, roomError, connectionMode]);

  // Check if current user is #1 in queue ("You're Up Next!" alert)
  useEffect(() => {
    if (!queue || queue.length === 0 || !singerName) return;
    const firstSong = queue[0];
    const cleanCurrent = singerName.trim().toLowerCase();
    const isOwner = (firstSong.singerName || '').trim().toLowerCase() === cleanCurrent;
    const isCoSinger = (firstSong.coSingers || []).some(
      (s) => s.trim().toLowerCase() === cleanCurrent
    );

    if ((isOwner || isCoSinger) && firstSong.queueId && !alertedRef.current.has(firstSong.queueId)) {
      alertedRef.current.add(firstSong.queueId);
      setUpNextSong(firstSong);
    }
  }, [queue, singerName]);

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
            mode: song.mode || 'solo',
            coSingers: song.coSingers || [],
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

          const modeText = song.mode === 'duet' ? ' (Duet)' : song.mode === 'group' ? ' (Group)' : '';
          setToastMessage(`🎤 "${song.title}"${modeText} added to queue!`);
          setQueuedHistory((prev) => [song, ...prev]);

          // Optimistically update local state immediately so user sees their song right away
          if (data.isNowPlaying && data.item) {
            setNowPlaying(data.item);
          } else if (data.item) {
            setQueue((prev) => {
              if (prev.some((q) => q.queueId === data.item.queueId)) return prev;
              return [...prev, data.item];
            });
          }

          // Refresh room in background (ignoring synthetic empty placeholders)
          fetch(`/api/room/${roomCode}`, { cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.room && !d.room.synthetic) {
                setQueue(d.room.queue || []);
                setNowPlaying(d.room.nowPlaying);
              }
            })
            .catch(() => {});
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
      // Optimistic toggle for instant UI response
      setVotedQueueIds((prev) => {
        const next = new Set(prev);
        if (next.has(queueId)) {
          next.delete(queueId);
        } else {
          next.add(queueId);
        }
        return next;
      });
      setQueue((prev) =>
        prev.map((item) => {
          if (item.queueId !== queueId) return item;
          const isVoted = votedQueueIds.has(queueId);
          const newVotes = isVoted ? Math.max(0, (item.votes || 0) - 1) : (item.votes || 0) + 1;
          return { ...item, votes: newVotes };
        })
      );

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
        if (data.success && data.queue) {
          setQueue(data.queue);
        }
      } catch (err) {
        console.error('Error voting:', err);
      }
    },
    [roomCode, voterId, votedQueueIds]
  );

  // Guest removes own song from queue
  const handleRemoveSong = useCallback(
    async (queueId, title) => {
      setQueue((prev) => prev.filter((q) => q.queueId !== queueId));
      try {
        const res = await fetch(`/api/room/${roomCode}/queue?queueId=${encodeURIComponent(queueId)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          setToastMessage(`Removed "${title}" from queue.`);
        } else {
          setToastMessage(data.error || 'Could not remove song.');
        }
      } catch (err) {
        setToastMessage('Failed to remove song.');
      }
    },
    [roomCode]
  );

  // Guest joins an open Duet or Group song
  const handleJoinSong = useCallback(
    async (queueId) => {
      try {
        const res = await fetch(`/api/room/${roomCode}/join-song`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueId,
            singerName,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          try {
            confetti({
              particleCount: 40,
              spread: 50,
              origin: { y: 0.7 },
              colors: ['#06b6d4', '#ec4899', '#a855f7'],
            });
          } catch (e) {}
          setToastMessage('You joined the performance! 🎤');
        } else {
          setToastMessage(data.error || 'Could not join song.');
        }
      } catch (err) {
        setToastMessage('Could not join song. Try again.');
      }
    },
    [roomCode, singerName]
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
            Room "{roomCode || 'unknown'}" is either inactive or expired. Make sure you scanned the latest QR code on the TV!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
            <button
              onClick={() => {
                setRoomError(null);
                if (roomCode) {
                  fetch(`/api/room/${roomCode}`)
                    .then((r) => r.json())
                    .then((d) => {
                      if (d.success && d.room) {
                        setNowPlaying(d.room.nowPlaying);
                        setQueue(d.room.queue || []);
                      } else {
                        setRoomError('Room not found');
                      }
                    })
                    .catch(() => setRoomError('Could not connect'));
                }
              }}
              className="btn-accent"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <RefreshCw size={16} />
              <span>Retry Connecting</span>
            </button>
            <Link
              href="/"
              className="btn-primary"
              style={{ width: '100%', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} />
              <span>Go to Host Screen</span>
            </Link>
          </div>
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
        paddingBottom: nowPlaying ? '140px' : '80px', // Extra room when NowPlayingBar is visible
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <ParticleBackground />

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Up Next Alert Notification */}
      <UpNextAlert song={upNextSong} onClose={() => setUpNextSong(null)} />

      {/* Header */}
      <GuestHeader
        roomCode={roomCode}
        singerName={singerName}
        onEditName={() => setActiveTab('profile')}
        connectionMode={connectionMode}
        rotationMode={rotationMode}
      />

      {/* Main Tab Content */}
      <div style={{ flex: 1, padding: '16px', zIndex: 10 }}>
        {activeTab === 'search' && (
          <SearchTab
            onQueueSong={handleQueueSong}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            queuedSongIds={new Set(queue.map((q) => q.id))}
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
              onRemoveSong={handleRemoveSong}
              currentSingerName={singerName}
              onJoinSong={handleJoinSong}
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
            roomCode={roomCode}
          />
        )}
      </div>

      {/* Persistent Mini "Now Playing" Bar pinned above BottomNav */}
      <NowPlayingBar
        nowPlaying={nowPlaying}
        onSkip={handleGuestSkip}
        roomCode={roomCode}
        singerName={singerName}
        onOpenQueue={() => setActiveTab('queue')}
      />

      {/* Mobile Sticky Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        queueCount={queue.length}
      />
    </main>
  );
}
