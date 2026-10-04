'use client';

export default function AudioVisualizer({ isPlaying = true, barCount = 18 }) {
  return (
    <div
      className={`visualizer-container ${!isPlaying ? 'visualizer-paused' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        height: '36px',
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="visualizer-bar"
          style={{
            animationDelay: `${(i * 0.08) % 1}s`,
            height: isPlaying ? '60%' : '15%',
          }}
        />
      ))}
    </div>
  );
}
