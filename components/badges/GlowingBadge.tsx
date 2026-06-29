'use client';

// Continuous solid color blocks (no gaps, no gradient blend)
const GLOW_RINGS: Record<string, string> = {
  gold_mastery:    'conic-gradient(from 0deg, #FBBF24 0deg, #FBBF24 36deg, #F59E0B 36deg, #F59E0B 72deg, #FBBF24 72deg, #FBBF24 108deg, #F59E0B 108deg, #F59E0B 144deg, #FBBF24 144deg, #FBBF24 180deg, #F59E0B 180deg, #F59E0B 216deg, #FBBF24 216deg, #FBBF24 252deg, #F59E0B 252deg, #F59E0B 288deg, #FBBF24 288deg, #FBBF24 324deg, #F59E0B 324deg, #F59E0B 360deg)',
  platinum_scholar:'conic-gradient(from 0deg, #E2E8F0 0deg, #E2E8F0 36deg, #94A3B8 36deg, #94A3B8 72deg, #E2E8F0 72deg, #E2E8F0 108deg, #94A3B8 108deg, #94A3B8 144deg, #E2E8F0 144deg, #E2E8F0 180deg, #94A3B8 180deg, #94A3B8 216deg, #E2E8F0 216deg, #E2E8F0 252deg, #94A3B8 252deg, #94A3B8 288deg, #E2E8F0 288deg, #E2E8F0 324deg, #94A3B8 324deg, #94A3B8 360deg)',
  quantum_catalyst:'conic-gradient(from 0deg, #4ADE80 0deg, #4ADE80 36deg, #10B981 36deg, #10B981 72deg, #4ADE80 72deg, #4ADE80 108deg, #10B981 108deg, #10B981 144deg, #4ADE80 144deg, #4ADE80 180deg, #10B981 180deg, #10B981 216deg, #4ADE80 216deg, #4ADE80 252deg, #10B981 252deg, #10B981 288deg, #4ADE80 288deg, #4ADE80 324deg, #10B981 324deg, #10B981 360deg)',
  aspirants_path:  'conic-gradient(from 0deg, #CD853F 0deg, #CD853F 30deg, #A0522D 30deg, #A0522D 60deg, #8B4513 60deg, #8B4513 90deg, #CD853F 90deg, #CD853F 120deg, #A0522D 120deg, #A0522D 150deg, #8B4513 150deg, #8B4513 180deg, #CD853F 180deg, #CD853F 210deg, #A0522D 210deg, #A0522D 240deg, #8B4513 240deg, #8B4513 270deg, #CD853F 270deg, #CD853F 300deg, #A0522D 300deg, #A0522D 330deg, #8B4513 330deg, #8B4513 360deg)',
  scholars_ascent: 'conic-gradient(from 0deg, #60A5FA 0deg, #60A5FA 36deg, #2563EB 36deg, #2563EB 72deg, #60A5FA 72deg, #60A5FA 108deg, #2563EB 108deg, #2563EB 144deg, #60A5FA 144deg, #60A5FA 180deg, #2563EB 180deg, #2563EB 216deg, #60A5FA 216deg, #60A5FA 252deg, #2563EB 252deg, #2563EB 288deg, #60A5FA 288deg, #60A5FA 324deg, #2563EB 324deg, #2563EB 360deg)',
  cosmic_catalyst: 'conic-gradient(from 0deg, #F472B6 0deg, #F472B6 60deg, #A78BFA 60deg, #A78BFA 120deg, #60A5FA 120deg, #60A5FA 180deg, #4ADE80 180deg, #4ADE80 240deg, #FBBF24 240deg, #FBBF24 300deg, #FB923C 300deg, #FB923C 360deg)',
};

const GLOW_IDS = new Set(Object.keys(GLOW_RINGS));

function glowGradient(badgeId: string): string {
  return GLOW_RINGS[badgeId] || GLOW_RINGS.gold_mastery;
}

export function GlowingBadge({
  badgeId, src, alt, size, earned, rounded = 6,
}: {
  badgeId: string; src: string; alt: string; size: number; earned: boolean; rounded?: number;
}) {
  const glow = earned && GLOW_IDS.has(badgeId);
  const ringSize = Math.round(size * 1.45);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {glow && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: ringSize, height: ringSize,
          borderRadius: '50%',
          background: glowGradient(badgeId),
          animation: 'glowRingSpin 3s linear infinite',
          willChange: 'transform',
          mask: 'radial-gradient(circle, transparent 40%, #000 40%, #000 52%, transparent 52%)',
          WebkitMask: 'radial-gradient(circle, transparent 40%, #000 40%, #000 52%, transparent 52%)',
          zIndex: 0,
        }} />
      )}
      <img src={src} alt={alt}
        style={{
          position: 'relative', zIndex: 1,
          width: size, height: size, borderRadius: rounded,
          filter: earned ? 'none' : 'grayscale(1)',
          opacity: earned ? 1 : 0.5,
          display: 'block',
        }} />
      {glow && (
        <style>{`
          @keyframes glowRingSpin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}</style>
      )}
    </div>
  );
}
