'use client';

export default function MascotImage({ size = 'md', className = '', floating = true }) {
  const sizeMap = {
    sm: { width: 48, height: 48 },
    md: { width: 96, height: 96 },
    lg: { width: 140, height: 140 },
    hero: { width: 220, height: 220 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`${floating ? 'float-animation' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))',
      }}
    >
      <img
        src="/images/okey-mascot.png"
        alt="OKEY Karaoke Mascot"
        width={currentSize.width}
        height={currentSize.height}
        style={{
          objectFit: 'contain',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}
