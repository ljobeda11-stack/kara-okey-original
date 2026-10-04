'use client';

// Keeps the TV page in fullscreen by itself — the user never has to touch the
// TV. Browsers only grant requestFullscreen() once a user gesture happened on
// that page, so the request is retried on the first pointerdown/keydown and
// then periodically until it succeeds. Once granted, fullscreen is re-asserted
// whenever it gets dropped (ESC, accidental remote button, browser UI) so the
// karaoke overlay — and its join QR code — is always on screen.
import { useCallback, useEffect } from 'react';

export default function useAutoFullscreen(active = false) {
  const goFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) return;
    const elem = document.documentElement;
    if (!elem || typeof elem.requestFullscreen !== 'function') return;
    try {
      const promise = elem.requestFullscreen({ navigationUI: 'hide' });
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    } catch (e) {
      // ignore — the CSS theater stage already covers the whole viewport
    }
  }, []);

  // Retry until granted (gesture-gated browsers reject the first attempts).
  useEffect(() => {
    if (!active) return undefined;
    goFullscreen();
    const retry = setInterval(goFullscreen, 4000);
    return () => clearInterval(retry);
  }, [active, goFullscreen]);

  // Re-enter fullscreen if anything (or anyone) exits it.
  useEffect(() => {
    if (!active) return undefined;
    const onChange = () => {
      if (!document.fullscreenElement) goFullscreen();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [active, goFullscreen]);

  // Any interaction with the TV also satisfies the gesture requirement.
  useEffect(() => {
    if (!active) return undefined;
    const onGesture = () => goFullscreen();
    window.addEventListener('pointermove', onGesture);
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointermove', onGesture);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [active, goFullscreen]);

  return goFullscreen;
}
