'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ParticleBackground from '@/components/shared/ParticleBackground';
import Toast from '@/components/shared/Toast';
import VideoPlayer from '@/components/host/VideoPlayer';
import StageOverlay, { computeTitleVisible } from '@/components/host/StageOverlay';
import IdleScreen from '@/components/host/IdleScreen';
import CelebrationOverlay, { randomPraise } from '@/components/host/CelebrationOverlay';
import SongTransition from '@/components/host/SongTransition';
import HostControlsPanel from '@/components/host/HostControlsPanel';
import useAutoFullscreen from '@/hooks/useAutoFullscreen';
import { preloadEffects, unlockAudio } from '@/lib/sounds';
import { Settings } from 'lucide-react';

export default function HostPage() {
  const [roomCode, setRoomCode] = useState('');
  const [nowPlaying, setNowPlaying] = useState(null);
  const [queue, setQueue] = useState([]);
  const [guestCount, setGuestCount] = useState(1);
  const [toastMessage, setToastMessage] = useState('');
  const [celebration, setCelebration] = useState(null);
  const [cheers, setCheers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [transitionSong, setTransitionSong] = useState(null);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);

  const nowPlayingRef = useRef(null);
  const queueRef = useRef([]);
  const celebrationTimerRef = useRef(null);
  const leaderboardRef = useRef([]);

  // Keep refs of current song and queue
  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // The leaderboard is read through a ref by celebrateSong so its callback can
  // stay referentially stable: unstable deps used to tear down and reopen the
  // SSE connection on every stats update.
  useEffect(() => {
    leaderboardRef.current = leaderboard;
  }, [leaderboard]);

  useEffect(() => {
    return () => clearTimeout(celebrationTimerRef.current);
  }, []);

  // Warm the real CC0 reaction recordings so the very first cheer already plays
  // the crowd instead of the synthesized fallback.
  useEffect(() => {
    preloadEffects();
  }, []);

  // Unlock TV audio on first click/keypress (browsers block sound before gesture)
  const handleUnlockAudio = useCallback(() => {
    unlockAudio();
    preloadEffects();
  }, []);

  // Auto fullscreen while a song is on the stage
  const isStageLive = !!nowPlaying;
  const goFullscreen = useAutoFullscreen(isStageLive);

  useEffect(() => {
    const onGesture = () => {
      handleUnlockAudio();
      goFullscreen();
    };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [handleUnlockAudio, goFullscreen]);

  const handleCheerShown = useCallback((cheerId) => {
    setCheers((prev) => prev.filter((c) => c.id !== cheerId));
  }, []);

  // "Now singing" card: visible for the first 10s of each song and for 10s
  // around its middle, hidden in between so the lyrics stay clear. The state
  // only changes at those two window edges (see computeTitleVisible), so the
  // 500ms progress ticks never thrash the TV with re-renders.
  const [titleVisible, setTitleVisible] = useState(true);
  const handleVideoProgress = useCallback(({ currentTime, duration }) => {
    const next = computeTitleVisible(currentTime, duration);
    setTitleVisible((prev) => (prev === next ? prev : next));
  }, []);

  // A new song means the card is due again from second zero.
  useEffect(() => {
    setTitleVisible(true);
  }, [nowPlaying?.queueId, nowPlaying?.id]);

  // Post-song celebration
  const celebratedRef = useRef(new Set());
  const celebrateSong = useCallback((song) => {
    if (!song) return;
    const id = song.queueId || song.id;
    if (id) {
      if (celebratedRef.current.has(id)) return;
      if (celebratedRef.current.size > 200) celebratedRef.current.clear();
      celebratedRef.current.add(id);
    }

    const coSingers = Array.isArray(song.coSingers) ? song.coSingers : [];
    const allSingers = [song.singerName, ...coSingers].filter(Boolean).join(' & ');

    // Calculate rank text from the leaderboard, read through a ref so this
    // callback stays referentially stable (an unstable celebrateSong used to
    // restart the SSE stream on every stats update).
    let rankText = null;
    const board = leaderboardRef.current || [];
    const cleanSinger = (song.singerName || '').trim().toLowerCase();
    const stat = board.find(
      (s) => (s.singerName || '').trim().toLowerCase() === cleanSinger
    );
    if (stat) {
      const rank = board.indexOf(stat) + 1;
      rankText = `🏆 Rank #${rank} tonight! (${stat.songsSung} song${stat.songsSung > 1 ? 's' : ''})`;
    }

    setCelebration({
      key: Date.now(),
      text: randomPraise(),
      title: song.title,
      singer: allSingers || 'Guest',
      rankText,
    });
    clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => setCelebration(null), 4200);
  }, []);

  // 1. Initialize or load room
  useEffect(() => {
    let cancelled = false;
    async function initRoom() {
      try {
        const savedCode = localStorage.getItem('karaokey_host_room');
        if (savedCode) {
          // Check if room is active
          const res = await fetch(`/api/room/${savedCode}`);
          if (!cancelled && res.ok) {
            const data = await res.json();
            setRoomCode(savedCode);
            setNowPlaying(data.room.nowPlaying);
            setQueue(data.room.queue || []);
            setGuestCount(data.room.guestCount || 1);
            loadLeaderboard(savedCode);
            return;
          }
          localStorage.removeItem('karaokey_host_room');
        }

        // Create fresh room
        const createRes = await fetch('/api/room/create', { method: 'POST' });
        if (!createRes.ok) throw new Error(`Room creation failed (${createRes.status})`);
        const createData = await createRes.json();
        if (cancelled) return;
        if (createData.success) {
          setRoomCode(createData.code);
          localStorage.setItem('karaokey_host_room', createData.code);
          loadLeaderboard(createData.code);
        } else {
          setToastMessage(createData.error || 'Could not create a room. Retrying…');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error initializing room:', err);
          setToastMessage('Connection error — is the server running?');
        }
      }
    }

    async function loadLeaderboard(code) {
      try {
        const res = await fetch(`/api/room/${code}/stats`);
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      } catch (e) {}
    }

    initRoom();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Connect to Server-Sent Events (SSE) for instant real-time synchronization
  useEffect(() => {
    if (!roomCode) return;

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
          if (payload.data.addedItem) {
            setToastMessage(`🎤 ${payload.data.addedItem.singerName} queued "${payload.data.addedItem.title}"!`);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('now_playing_updated', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const nextSong = payload.data.nowPlaying;
          const prevSong = nowPlayingRef.current;
          if (
            prevSong &&
            nextSong &&
            (prevSong.queueId || prevSong.id) !== (nextSong.queueId || nextSong.id)
          ) {
            celebrateSong(prevSong);
          }
          setNowPlaying(nextSong);
          if (payload.data.queue) setQueue(payload.data.queue);
        } catch (err) {}
      });

      eventSource.addEventListener('cheer', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const cheer = payload.data;
          if (cheer && cheer.id) {
            setCheers((prev) => [...prev.slice(-5), cheer]);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('stats_updated', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data?.leaderboard) {
            setLeaderboard(payload.data.leaderboard);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('guest_count', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data.guestCount) setGuestCount(payload.data.guestCount);
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
  }, [roomCode, celebrateSong]);

  // 3. Smart HTTP Polling Fallback (guarantees cross-instance sync on Vercel Serverless)
  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/room/${roomCode}`, { cache: 'no-store' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          // A "synthetic" room is a placeholder another serverless instance
          // fabricated for a code it had never seen. Applying one would wipe
          // the live song off the TV (idle screen, then autoplay again in a
          // loop), so ignore those snapshots entirely.
          if (data.success && data.room && !data.room.synthetic) {
            const nextSong = data.room.nowPlaying;
            const prevSong = nowPlayingRef.current;
            if (
              prevSong &&
              nextSong &&
              (prevSong.queueId || prevSong.id) !== (nextSong.queueId || nextSong.id)
            ) {
              celebrateSong(prevSong);
            }
            setNowPlaying(nextSong);
            if (data.room.queue) setQueue(data.room.queue);
            if (data.room.guestCount) setGuestCount(data.room.guestCount);
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomCode, celebrateSong]);


  // 3. Skip to next song — with post-song celebration for the finished track
  const executeSkip = useCallback(
    async (opts = {}) => {
      if (!roomCode) return;
      const finished = nowPlayingRef.current;
      try {
        const res = await fetch(`/api/room/${roomCode}/skip`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setNowPlaying(data.nowPlaying);
          setQueue(data.queue || []);
          celebrateSong(finished);
          if (data.nowPlaying && !opts.silent) {
            setToastMessage(`Now playing: ${data.nowPlaying.title}`);
          }
        }
      } catch (err) {
        console.error('Error skipping:', err);
      }
    },
    [roomCode, celebrateSong]
  );

  // Trigger song transition countdown before starting the next song
  const handleNaturalSongEnd = useCallback(() => {
    const nextInQueue = queueRef.current[0];
    if (nextInQueue) {
      setTransitionSong(nextInQueue);
    } else {
      executeSkip({ silent: true });
    }
  }, [executeSkip]);

  const handleTransitionComplete = useCallback(() => {
    setTransitionSong(null);
    executeSkip({ silent: true });
  }, [executeSkip]);

  // Refresh queue helper for HostControlsPanel
  const handleRefreshRoom = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/room/${roomCode}`);
      const data = await res.json();
      if (data.success && data.room && !data.room.synthetic) {
        setQueue(data.room.queue || []);
        setNowPlaying(data.room.nowPlaying);
      }
    } catch (e) {}
  }, [roomCode]);

  // ===== TV STAGE =====
  if (nowPlaying) {
    return (
      <main className="tv-theater-root">
        {/* Animated Countdown Transition between songs */}
        {transitionSong && (
          <SongTransition
            nextSong={transitionSong}
            onComplete={handleTransitionComplete}
            durationSeconds={5}
          />
        )}

        <VideoPlayer
          key={nowPlaying.queueId || nowPlaying.id}
          song={nowPlaying}
          fill
          onSongEnd={handleNaturalSongEnd}
          onSkip={() => executeSkip()}
          onProgress={handleVideoProgress}
        />

        <StageOverlay
          song={nowPlaying}
          roomCode={roomCode}
          guestCount={guestCount}
          nextSong={queue[0] || null}
          titleVisible={titleVisible}
        />

        <CelebrationOverlay
          celebration={celebration}
          cheers={cheers}
          onCheerShown={handleCheerShown}
        />

        <Toast message={toastMessage} onClose={() => setToastMessage('')} />

        {/* Subtle Host Controls Trigger Gear in bottom right */}
        <button
          onClick={() => setIsHostControlsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 65,
            background: 'rgba(8, 8, 20, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--border-glass)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            opacity: 0.45,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.45')}
          title="Host Admin Controls"
        >
          <Settings size={18} />
        </button>

        <HostControlsPanel
          isOpen={isHostControlsOpen}
          onClose={() => setIsHostControlsOpen(false)}
          roomCode={roomCode}
          queue={queue}
          guestCount={guestCount}
          onRefreshQueue={handleRefreshRoom}
        />
      </main>
    );
  }

  // ===== ENTRY SCREEN =====
  return (
    <main
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(10px, 2vh, 24px) clamp(16px, 3vw, 40px)',
        overflow: 'hidden',
      }}
    >
      <ParticleBackground />

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      <CelebrationOverlay
        celebration={celebration}
        cheers={cheers}
        onCheerShown={handleCheerShown}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IdleScreen
          roomCode={roomCode}
          onOpenHostControls={() => setIsHostControlsOpen(true)}
          leaderboard={leaderboard}
        />
      </div>

      <HostControlsPanel
        isOpen={isHostControlsOpen}
        onClose={() => setIsHostControlsOpen(false)}
        roomCode={roomCode}
        queue={queue}
        guestCount={guestCount}
        onRefreshQueue={handleRefreshRoom}
      />
    </main>
  );
}
