import { useEffect } from 'react';

const pieces = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: 6 + (index % 14) * 6.6,
  delay: (index % 7) * 40,
  rotation: (index % 2 === 0 ? -1 : 1) * (12 + (index % 5) * 7),
  duration: 1200 + (index % 5) * 140
}));

const CelebrationOverlay = ({
  active,
  title,
  message,
  variant = 'task',
  duration = 2300,
  onDone
}) => {
  useEffect(() => {
    if (!active) return undefined;

    const timer = window.setTimeout(() => {
      if (onDone) onDone();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [active, duration, onDone]);

  if (!active) return null;

  return (
    <div aria-live="polite" className={`celebration-overlay celebration-${variant}`} role="status">
      <div className="celebration-burst" aria-hidden="true">
        <span className="celebration-core" />
        <span className="celebration-ring celebration-ring-a" />
        <span className="celebration-ring celebration-ring-b" />
      </div>

      <div className="celebration-ribbons" aria-hidden="true">
        {pieces.map((piece) => (
          <span
            className="celebration-piece"
            key={piece.id}
            style={{
              '--piece-left': `${piece.left}%`,
              '--piece-delay': `${piece.delay}ms`,
              '--piece-rotation': `${piece.rotation}deg`,
              '--piece-duration': `${piece.duration}ms`
            }}
          />
        ))}
      </div>

      <div className="celebration-card">
        <p className="celebration-title">{title}</p>
        <p className="celebration-message">{message}</p>
      </div>
    </div>
  );
};

export default CelebrationOverlay;
