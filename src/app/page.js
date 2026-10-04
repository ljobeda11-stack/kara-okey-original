'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ParticleBackground from '@/components/shared/ParticleBackground';
import Toast from '@/components/shared/Toast';
import VideoPlayer from '@/components/host/VideoPlayer';
import StageOverlay from '@/components/host/StageOverlay';
import IdleScreen from '@/components/host/IdleScreen';
import CelebrationOverlay, { randomPraise } from '@/components/host/CelebrationOverlay';
import useAutoFullscreen from '@/hooks/useAutoFullscreen';
import { unlockAudio } from '@/lib/sounds';

export default function HostPage() {
  const [roomCode, setRoomCode] = useState('');
  const [nowPlaying, setNowPlaying] = useState(null);
  const [queue, setQueue] = useState([]);
  const [guestCount, setGuestCount] = useState(1);
  const [toastMessage, setToastMessage] = useState('');
  const [celebration, setCelebration] = useState(null);
  const [cheers, setCheers] = useState([]);
  const nowPlayingRef = useRef(null);
  const celebrationTimerRef = useRef(null);

  // Keep a ref of the current song so skip/auto-advance can celebrate it
  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  useEffect(() => {
    return () => clearTimeout(celebrationTimerRef.current);
  }, []);

  // Unlock TV audio on first click/keypress (browsers block sound before gesture)
  const handleUnlockAudio = useCallback(() => {
    unlockAudio();
  }, []);

  // Auto fullscreen while a song is on the stage: entered by itself the
  // moment playback starts, re-asserted on every interaction, and re-entered
  // if anything drops out of fullscreen — so the overlay + join QR stay up.
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

  // Post-song celebration (host skip, natural end, OR a guest skip from
  // their phone). Deduped by song id so the host + SSE paths never
  // celebrate the same finished song twice.
  const celebratedRef = useRef(new Set());
  const celebrateSong = useCallback((song) => {
    if (!song) return;
    const id = song.queueId || song.id;
    if (id) {
      if (celebratedRef.current.has(id)) return;
      if (celebratedRef.current.size > 200) celebratedRef.current.clear();
      celebratedRef.current.add(id);
    }
    setCelebration({
      key: Date.now(),
      text: randomPraise(),
      title: song.title,
      singer: song.singerName || 'Guest',
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
            return;
          }
          // Saved code is stale — drop it so we create a fresh room below
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
          // Song changed to a different track → celebrate the one that
          // just finished (covers guest-initiated skips too).
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
        // Reconnect after 3s
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

  // 3. Skip to next song — with post-song celebration for the finished track
  const handleSkip = useCallback(
    async (opts = {}) => {
      if (!roomCode) return;
      const finished = nowPlayingRef.current;
      try {
        const res = await fetch(`/api/room/${roomCode}/skip`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setNowPlaying(data.nowPlaying);
          setQueue(data.queue || []);
          // Celebrate the song that just ended (natural end or manual skip)
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

  // ===== TV STAGE =====
  // While a song is playing the main screen becomes a full screen YouTube
  // karaoke stage with a neon overlay (music animation + join QR code).
  // Nothing has to be tapped here — every control lives on the guest phone.
  if (nowPlaying) {
    return (
      <main className="tv-theater-root">
        <VideoPlayer
          key={nowPlaying.queueId || nowPlaying.id}
          song={nowPlaying}
          fill
          onSongEnd={() => handleSkip({ silent: true })}
          onSkip={() => handleSkip()}
        />

        <StageOverlay
          song={nowPlaying}
          roomCode={roomCode}
          guestCount={guestCount}
          nextSong={queue[0] || null}
        />

        <CelebrationOverlay
          celebration={celebration}
          cheers={cheers}
          onCheerShown={handleCheerShown}
        />

        <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      </main>
    );
  }

  // ===== ENTRY SCREEN =====
  // App name + logo beside one big QR code + how-it-works. Locked to the
  // viewport height so a 16:9 TV shows everything with no scrolling.
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
        <IdleScreen roomCode={roomCode} />
      </div>
    </main>
  );
}

