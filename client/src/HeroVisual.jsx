/** Full-bleed abstract listening-room visual for the home hero */
export default function HeroVisual() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="heroWash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a2420" />
          <stop offset="55%" stopColor="#0c1210" />
          <stop offset="100%" stopColor="#141c18" />
        </linearGradient>
        <linearGradient id="heroSignal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#c8f542" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#c8f542" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="heroGlow" cx="70%" cy="35%" r="45%">
          <stop offset="0%" stopColor="#c8f542" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#c8f542" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="900" fill="url(#heroWash)" />
      <rect width="800" height="900" fill="url(#heroGlow)" />

      {/* soft rings like speaker / vinyl */}
      <g opacity="0.35" fill="none" stroke="#c8f542" strokeWidth="1.2">
        <circle cx="560" cy="320" r="70" />
        <circle cx="560" cy="320" r="120" />
        <circle cx="560" cy="320" r="180" />
        <circle cx="560" cy="320" r="250" opacity="0.5" />
      </g>
      <circle cx="560" cy="320" r="28" fill="#c8f542" opacity="0.9" />
      <circle cx="560" cy="320" r="10" fill="#0c1210" />

      {/* waveform bars across lower hero */}
      <g transform="translate(48 560)">
        {[
          40, 70, 110, 85, 140, 95, 160, 75, 130, 100, 170, 90, 120, 65, 150, 80, 145, 55, 100, 72,
          135, 88, 155, 60, 115,
        ].map((h, i) => (
          <rect
            key={i}
            x={i * 28}
            y={180 - h}
            width="14"
            height={h}
            rx="4"
            fill="url(#heroSignal)"
            opacity={0.55 + (i % 5) * 0.08}
          >
            <animate
              attributeName="height"
              values={`${h};${Math.min(180, h + 35)};${h}`}
              dur={`${1.2 + (i % 4) * 0.25}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              values={`${180 - h};${180 - Math.min(180, h + 35)};${180 - h}`}
              dur={`${1.2 + (i % 4) * 0.25}s`}
              repeatCount="indefinite"
            />
          </rect>
        ))}
      </g>

      {/* grain-ish dots */}
      {Array.from({ length: 40 }).map((_, i) => (
        <circle
          key={`d${i}`}
          cx={(i * 97) % 800}
          cy={(i * 53) % 900}
          r={(i % 3) + 0.6}
          fill="#c8f542"
          opacity={0.08 + (i % 5) * 0.02}
        />
      ))}
    </svg>
  );
}
