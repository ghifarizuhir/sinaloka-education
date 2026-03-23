export function SinalokaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-label="Sinaloka logo"
      className="text-primary"
    >
      {/* Teal rounded square */}
      <rect width="512" height="512" rx="112" fill="currentColor" />
      {/* White diamond rotated 45° */}
      <rect
        x="176"
        y="176"
        width="160"
        height="160"
        rx="24"
        transform="rotate(45 256 256)"
        fill="white"
      />
    </svg>
  );
}
