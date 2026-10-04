'use client';

import { useMemo } from 'react';

export default function ParticleBackground() {
  const notes = ['♪', '♫', '♬', '♩', '✦', '🎤'];

  const particles = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      char: notes[i % notes.length],
      left: `${(i * 6.25 + 3)}%`,
      top: `${(i * 13) % 90 + 5}%`,
      size: `${14 + (i % 4) * 8}px`,
      duration: `${7 + (i % 6) * 3}s`,
      delay: `${(i % 5) * 1.5}s`,
      opacity: 0.08 + (i % 3) * 0.05,
    }));
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        background: 'var(--grad-mesh)',
      }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            fontSize: p.size,
            color: p.id % 2 === 0 ? 'var(--neon-purple)' : 'var(--neon-pink)',
            opacity: p.opacity,
            userSelect: 'none',
            animation: `floatMascot ${p.duration} ease-in-out infinite alternate`,
            animationDelay: p.delay,
            filter: 'blur(0.5px)',
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
