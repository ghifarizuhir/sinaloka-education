import type { CSSProperties } from 'react';

/* ─── Star SVG used as floating decoration (echoes the logo's star motif) ─── */
export function Star({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor">
      <polygon points="10,0 13,7 20,7 14,12 16,20 10,15 4,20 6,12 0,7 7,7" />
    </svg>
  );
}

/* ─── Stacked-book decoration (echoes the logo's layered-pages motif) ─── */
export function BookStack({ className, barCount = 3 }: { className?: string; barCount?: number }) {
  return (
    <div className={className}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-md"
          style={{
            width: `${110 - i * 14}px`,
            height: '8px',
            marginLeft: `${i * 8}px`,
            marginBottom: i < barCount - 1 ? '5px' : 0,
            opacity: 0.55 - i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Full teal background with dot grid, ambient meshes, floating elements, and shimmer ─── */
export function TealBrandBackground() {
  return (
    <>
      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a5951] via-[#0f766e] to-[#14b8a6]" />
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Ambient color meshes */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse at 15% 85%, rgba(245,158,11,0.14) 0%, transparent 50%)',
            'radial-gradient(ellipse at 85% 10%, rgba(20,184,166,0.25) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      {/* Floating stars */}
      <Star className="absolute top-[14%] right-[19%] w-5 h-5 text-amber-300/25"
            style={{ animation: 'login-float 5s ease-in-out infinite' }} />
      <Star className="absolute top-[38%] left-[11%] w-3.5 h-3.5 text-amber-200/20"
            style={{ animation: 'login-float 7s ease-in-out 1s infinite' }} />
      <Star className="absolute bottom-[24%] right-[26%] w-4 h-4 text-amber-300/15"
            style={{ animation: 'login-float 6s ease-in-out 0.5s infinite' }} />
      <Star className="absolute bottom-[52%] left-[28%] w-2.5 h-2.5 text-white/10"
            style={{ animation: 'login-float 5.5s ease-in-out 2s infinite' }} />

      {/* Book stacks */}
      <div className="absolute bottom-[7%] left-[7%] -rotate-6"
           style={{ animation: 'login-float-slow 8s ease-in-out infinite', '--login-rotate': '-6deg' } as CSSProperties}>
        <BookStack className="opacity-[0.09]" />
      </div>
      <div className="absolute top-[9%] left-[5%] rotate-12"
           style={{ animation: 'login-float-slow 9s ease-in-out 1s infinite', '--login-rotate': '12deg' } as CSSProperties}>
        <BookStack className="opacity-[0.06]" barCount={2} />
      </div>

      {/* Shimmer line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(253,230,138,0.3), transparent)',
          animation: 'login-shimmer 4s ease-in-out infinite',
        }}
      />
    </>
  );
}
