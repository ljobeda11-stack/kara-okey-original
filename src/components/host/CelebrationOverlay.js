'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { playEffect, unlockAudio } from '@/lib/sounds';

// Listens for live "cheer" events + plays a post-song celebration.
// Renders floating emoji popups; exposes nothing visually otherwise.
const EMOJI = {
  cheer: '👏',
  horn: '📯',
  wow: '😮',
  applause: '🎉',
  laugh: '😂',
  whistle: '🎶',
};

const PRAISE = [
  'WOW! Amazing! 🤩',
  'Incredible performance! 🔥',
  'The crowd goes wild! 👏',
  'Superstar energy! ⭐',
  'Bravo! Bravo! 🎤',
  'Encore! Encore! 🎶',
  'Absolutely crushed it! 💥',
];

export default function CelebrationOverlay({ celebration, cheers = [], onCheerShown }) {
  const shownRef = useRef(new Set());
  const timersRef = useRef([]);

  // Unlock Web Audio on first interaction so cheers can play loud on the TV
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // Post-song celebration: fanfare + confetti + praise banner
  useEffect(() => {
    if (!celebration) return;
    const timers = [];
    try {
      playEffect('applause');
      timers.push(setTimeout(() => playEffect('cheer'), 600));
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b', '#22c55e'],
      });
      timers.push(
        setTimeout(() => {
          try {
            confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
            confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
          } catch (e) {}
        }, 700)
      );
    } catch (e) {}
    timersRef.current.push(...timers);
    return () => timers.forEach(clearTimeout);
  }, [celebration]);

  // Incoming guest cheers: play sound + confetti pop, then dismiss.
  // Tracks shown ids in a ref so re-renders never replay a cheer, and
  // keeps its timers in a ref so removing one cheer from the props array
  // never cancels the ones still queued to play.
  useEffect(() => {
    if (!cheers || cheers.length === 0) return;
    const pending = cheers.filter((c) => c.id && !shownRef.current.has(c.id));
    if (pending.length === 0) return;
    // Keep the seen-set from growing forever during a long party
    if (shownRef.current.size > 200) shownRef.current.clear();
    pending.forEach((cheer, i) => {
      shownRef.current.add(cheer.id);
      const t = setTimeout(() => {
        try {
          playEffect(cheer.effectId);
          confetti({
            particleCount: 40,
            spread: 70,
            startVelocity: 35,
            origin: { x: 0.2 + Math.random() * 0.6, y: 0.75 },
            colors: ['#a855f7', '#ec4899', '#06b6d4'],
          });
        } catch (e) {}
        if (onCheerShown) onCheerShown(cheer.id);
      }, i * 180);
      timersRef.current.push(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheers]);

  return (
    <>
      {/* Post-song praise banner */}
      {celebration && (
        <div
          key={celebration.key}
          style={{
            position: 'fixed',
            top: '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9000,
            textAlign: 'center',
            pointerEvents: 'none',
            animation: 'celebratePop 4s ease forwards',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 20%, #f59e0b 60%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 24px rgba(245, 158, 11, 0.6))',
            }}
          >
            {celebration.text}
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            🎤 {celebration.singer} just rocked “{celebration.title}”
          </div>
          {celebration.rankText && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                padding: '4px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(245, 158, 11, 0.25)',
                border: '1px solid var(--neon-amber)',
                color: 'var(--neon-amber)',
                fontSize: '0.9rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
              }}
            >
              <span>{celebration.rankText}</span>
            </div>
          )}
        </div>
      )}

      {/* Floating guest cheer emojis */}
      {cheers.map((cheer) => (
        <div
          key={cheer.id}
          style={{
            position: 'fixed',
            bottom: '12%',
            left: `${15 + (cheer.id.charCodeAt(6) % 70)}%`,
            zIndex: 9000,
            fontSize: '3rem',
            pointerEvents: 'none',
            animation: 'cheerFloat 2.2s ease-out forwards',
            filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.7))',
          }}
        >
          {EMOJI[cheer.effectId] || '🎉'}
          <div
            style={{
              fontSize: '0.7rem',
              color: '#fff',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '9999px',
              padding: '2px 8px',
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            {cheer.fromName}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes celebratePop {
          0% { opacity: 0; transform: translateX(-50%) scale(0.6); }
          10% { opacity: 1; transform: translateX(-50%) scale(1.08); }
          16% { transform: translateX(-50%) scale(1); }
          80% { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(1.05) translateY(-20px); }
        }
        @keyframes cheerFloat {
          0% { opacity: 0; transform: translateY(30px) scale(0.5) rotate(-8deg); }
          15% { opacity: 1; transform: translateY(0) scale(1.2) rotate(5deg); }
          100% { opacity: 0; transform: translateY(-160px) scale(1) rotate(-5deg); }
        }
      `}</style>
    </>
  );
}

export function randomPraise() {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}
