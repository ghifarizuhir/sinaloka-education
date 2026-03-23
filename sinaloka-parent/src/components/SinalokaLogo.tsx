export function SinalokaLogo({ size = 32 }: { size?: number }) {
  // Gradient ID must be unique per instance to avoid conflicts
  const gradId = `sinaloka-grad-${size}`;

  // At small sizes (≤32), hide small stars and dots for clarity
  const showSmallDetails = size > 32;
  const showStar = size > 16;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-label="Sinaloka logo"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      {/* Teal rounded square */}
      <rect width="512" height="512" rx="112" fill={`url(#${gradId})`} />
      {/* Asymmetric book stack, slightly rotated */}
      <g transform="translate(256, 270) rotate(-3) translate(-256, -270)">
        <rect x="72" y="308" width="368" height="52" rx="10" fill="#F59E0B" opacity="0.9" />
        <rect x="92" y="254" width="328" height="52" rx="10" fill="rgba(255,255,255,0.4)" />
        <rect x="112" y="200" width="288" height="52" rx="10" fill="rgba(255,255,255,0.25)" />
      </g>
      {/* Star accents */}
      {showStar && (
        <g fill="#FDE68A">
          <polygon points="0,-14 4,-4 14,-4 6,3 8,14 0,8 -8,14 -6,3 -14,-4 -4,-4" transform="translate(256, 120) scale(1.6)" />
          {showSmallDetails && (
            <>
              <polygon points="0,-10 3,-3 10,-3 4,2 6,10 0,5 -6,10 -4,2 -10,-3 -3,-3" transform="translate(152, 160) scale(0.9)" />
              <polygon points="0,-10 3,-3 10,-3 4,2 6,10 0,5 -6,10 -4,2 -10,-3 -3,-3" transform="translate(365, 148) scale(0.7)" />
            </>
          )}
        </g>
      )}
      {/* Decorative dots */}
      {showSmallDetails && (
        <>
          <circle cx="190" cy="138" r="4" fill="rgba(255,255,255,0.25)" />
          <circle cx="328" cy="130" r="3" fill="rgba(255,255,255,0.2)" />
        </>
      )}
    </svg>
  );
}
