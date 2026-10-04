'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Maximize, Play, Pause, SkipForward } from 'lucide-react';

let ytApiPromise = null;

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof prev === 'function') prev();
      } catch (e) {}
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        ytApiPromise = null;
        reject(new Error('Failed to load YouTube API'));
      };
      document.head.appendChild(tag);
    }
    setTimeout(() => {
      if (!(window.YT && window.YT.Player)) {
        ytApiPromise = null;
        reject(new Error('YouTube API load timeout'));
      }
    }, 15000);
  });
  return ytApiPromise;
}

// Tell the server a video is unplayable (embed disabled / removed) so it gets
// blacklisted and replaced inside the cached playlists — fire and forget.
function reportUnplayable(videoId) {
  if (!videoId || typeof fetch !== 'function') return;
  try {
    fetch('/api/unplayable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {}
}

export default function VideoPlayer({ song, onSongEnd, onSkip, fill = false }) {
  const wrapperRef = useRef(null);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const onSongEndRef = useRef(onSongEnd);
  const readyTimerRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const skipTimerRef = useRef(null);
  const watchdogRef = useRef(null);
  const startedRef = useRef(false);
  const erroredRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [awaitingUnmute, setAwaitingUnmute] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    onSongEndRef.current = onSongEnd;
  }, [onSongEnd]);

  // TV stage: the small play/skip/mute chrome auto-hides and reappears on
  // pointer movement, so the video fills the screen with no taps needed.
  useEffect(() => {
    if (!fill) return undefined;
    const reveal = () => {
      setShowControls(true);
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500);
    };
    reveal();
    window.addEventListener('pointermove', reveal);
    window.addEventListener('pointerdown', reveal);
    return () => {
      window.removeEventListener('pointermove', reveal);
      window.removeEventListener('pointerdown', reveal);
      clearTimeout(controlsTimerRef.current);
    };
  }, [fill]);

  useEffect(() => {
    clearTimeout(readyTimerRef.current);
    clearTimeout(watchdogRef.current);
    clearTimeout(skipTimerRef.current);
    startedRef.current = false;
    erroredRef.current = false;
    setIsPlaying(true);
    setIsMuted(false);
    setLoadError('');
    setAwaitingUnmute(false);
  }, [song?.id]);

  useEffect(() => {
    if (!song || !song.id) return;

    let cancelled = false;

    // Watchdog: some embed-hostile videos fail silently (no player error is
    // fired, but playback never starts). If this song has not actually begun
    // playing within 9s, report it as unplayable and let the queue advance to
    // the next (verified) karaoke version instead of hanging on a black screen.
    clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (cancelled || startedRef.current || erroredRef.current) return;
      let state = null;
      try {
        state = playerRef.current?.getPlayerState?.();
      } catch (e) {}
      if (state === 1 || startedRef.current) return;
      erroredRef.current = true;
      reportUnplayable(song.id);
      setLoadError('This karaoke track would not start — swapping to another version…');
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = setTimeout(() => {
        if (!cancelled && onSongEndRef.current) onSongEndRef.current();
      }, 2200);
    }, 9000);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !wrapperRef.current) return;
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {}
          playerRef.current = null;
        }
        // YT.Player REPLACES its mount node with an iframe, so always
        // create a fresh disposable node inside the wrapper.
        if (mountRef.current) {
          try {
            mountRef.current.remove();
          } catch (e) {}
        }
        const mount = document.createElement('div');
        mount.style.width = '100%';
        mount.style.height = '100%';
        wrapperRef.current.prepend(mount);
        mountRef.current = mount;

        const player = new YT.Player(mount, {
          videoId: song.id,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              try {
                const p = event.target;
                // Ensure sound is on, then force playback (autoplay path).
                // First queued song must start by itself — no play click needed.
                try {
                  p.unMute();
                } catch (e) {}
                try {
                  p.setVolume(100);
                } catch (e) {}
                try {
                  p.playVideo();
                } catch (e) {}
                // playVideo() is fire-and-forget (returns nothing), so detect
                // a browser autoplay block by checking state shortly after.
                clearTimeout(readyTimerRef.current);
                readyTimerRef.current = setTimeout(() => {
                  if (cancelled) return;
                  let state = null;
                  try {
                    state = p.getPlayerState?.();
                  } catch (e) {}
                  // 1 = PLAYING. Anything else means the browser blocked
                  // autoplay with sound → muted autoplay + tap-for-sound UI.
                  if (state !== 1) {
                    try {
                      p.mute();
                      p.playVideo();
                    } catch (e) {}
                    setIsMuted(true);
                    setAwaitingUnmute(true);
                  }
                }, 2500);
              } catch (e) {}
              setIsPlaying(true);
              setIsMuted(false);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              // YT.PlayerState.ENDED is 0
              if (event.data === 0) {
                if (onSongEndRef.current) onSongEndRef.current();
              } else if (event.data === 1) {
                setIsPlaying(true);
                startedRef.current = true;
                // If playback started with sound (e.g. unmuted via the
                // YouTube controls), the tap-for-sound overlay is obsolete.
                try {
                  if (!event.target.isMuted?.()) setAwaitingUnmute(false);
                } catch (e) {}
              } else if (event.data === 2) {
                setIsPlaying(false);
              }
            },
            onError: (event) => {
              if (cancelled) return;
              // YT iframe error codes:
              //   2  -> bad / removed video
              //   5  -> HTML5 player error
              //   100-> video not found / private / removed
              //   101/150 -> the owner disabled playback in embedded players
              // 101/150 are the classic "playlist shows a song, TV shows a
              // black box" failure — report them so the server blacklists the
              // video and swaps in a playable replacement.
              const code = event?.data;
              const fatal = code === 101 || code === 150 || code === 100 || code === 2 || code === 5;
              if (fatal) {
                erroredRef.current = true;
                reportUnplayable(song.id);
                setLoadError('This video blocked embedded playback — swapping to another karaoke version…');
              } else {
                setLoadError('Playback hiccup — retrying…');
              }
              clearTimeout(skipTimerRef.current);
              skipTimerRef.current = setTimeout(() => {
                if (!cancelled && onSongEndRef.current) onSongEndRef.current();
              }, fatal ? 2200 : 4000);
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the YouTube player. Check your connection.');
      });

    return () => {
      cancelled = true;
      clearTimeout(readyTimerRef.current);
      clearTimeout(watchdogRef.current);
      clearTimeout(skipTimerRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      if (mountRef.current) {
        try {
          mountRef.current.remove();
        } catch (e) {}
        mountRef.current = null;
      }
    };
  }, [song?.id]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {}
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {}
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('karaoke-stage-container');
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen?.().catch((err) => console.log(err));
    } else {
      document.exitFullscreen?.().catch((err) => console.log(err));
    }
  };

  if (!song) return null;

  return (
    <div
      id="karaoke-stage-container"
      style={
        fill
          ? {
              position: 'fixed',
              inset: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 40,
              overflow: 'hidden',
              background: '#000000',
            }
          : {
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: '#000000',
              border: '1px solid var(--border-glass)',
              boxShadow: 'var(--glow-purple)',
            }
      }
    >
      {/* YouTube IFrame target: wrapper persists, inner mount node is disposable */}
      <div
        ref={wrapperRef}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />
      {loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: '0.95rem',
            padding: '24px',
            textAlign: 'center',
            zIndex: 5,
          }}
        >
          {loadError}
        </div>
      )}

      {awaitingUnmute && !loadError && (
        <button
          onClick={() => {
            try {
              playerRef.current?.unMute?.();
              playerRef.current?.setVolume?.(100);
              playerRef.current?.playVideo?.();
            } catch (e) {}
            setIsMuted(false);
            setAwaitingUnmute(false);
          }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: 'rgba(0,0,0,0.55)',
            border: 'none',
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '2.4rem' }}>🔊</span>
          <span>Tap for sound</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            (browser started the video muted — one tap restores audio)
          </span>
        </button>
      )}

      {/* Floating Stage Controls Overlay (auto-hides on the TV stage) */}
      <div
        style={{
          position: 'absolute',
          bottom: fill ? '18px' : '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
          background: 'rgba(10, 10, 26, 0.75)',
          backdropFilter: 'blur(10px)',
          padding: '6px 10px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-glass)',
          opacity: fill && !showControls ? 0 : 1,
          pointerEvents: fill && !showControls ? 'none' : 'auto',
          transition: 'opacity 0.4s ease',
        }}
      >
        <button
          onClick={togglePlay}
          className="btn-icon"
          style={{ width: '34px', height: '34px' }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={onSkip}
          className="btn-icon"
          style={{ width: '34px', height: '34px' }}
          title="Skip to next song"
        >
          <SkipForward size={16} />
        </button>
        <button
          onClick={toggleMute}
          className="btn-icon"
          style={{ width: '34px', height: '34px' }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="btn-icon"
          style={{ width: '34px', height: '34px' }}
          title="Fullscreen TV Stage"
        >
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
}
