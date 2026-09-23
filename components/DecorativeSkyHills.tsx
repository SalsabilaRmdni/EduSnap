export default function DecorativeSkyHills({ withSchool = false }: { withSchool?: boolean }) {
  return (
    <div className="w-full overflow-hidden pointer-events-none select-none relative">
      <svg
        viewBox="0 0 1200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
        preserveAspectRatio="none"
      >
        {/* Back Hill (Lighter Green) */}
        <path
          d="M0 80C180 40 380 90 600 60C820 30 1020 70 1200 50V160H0V80Z"
          fill="#86EFAC"
        />

        {/* Front Hill (Vibrant Fresh Grass Green) */}
        <path
          d="M0 100C160 70 320 120 540 85C760 50 980 95 1200 75V160H0V100Z"
          fill="#4ADE80"
        />

        {/* Rolling Foreground (Deep Grass Accent) */}
        <path
          d="M0 130C200 110 400 135 700 115C1000 95 1100 125 1200 120V160H0V130Z"
          fill="#22C55E"
        />

        {/* Cute Little Bushes & Flowers along the hills */}
        {/* Left Flowers */}
        <circle cx="60" cy="115" r="5" fill="#FBBF24" />
        <circle cx="56" cy="112" r="3" fill="#FFFFFF" />
        <circle cx="64" cy="112" r="3" fill="#FFFFFF" />
        <circle cx="60" cy="108" r="3" fill="#FFFFFF" />
        <circle cx="60" cy="118" r="3" fill="#FFFFFF" />

        <circle cx="120" cy="135" r="4.5" fill="#F472B6" />
        <circle cx="116" cy="132" r="2.5" fill="#FFFFFF" />
        <circle cx="124" cy="132" r="2.5" fill="#FFFFFF" />
        <circle cx="120" cy="128" r="2.5" fill="#FFFFFF" />
        <circle cx="120" cy="138" r="2.5" fill="#FFFFFF" />

        {/* Middle Flowers */}
        <circle cx="580" cy="125" r="5" fill="#FBBF24" />
        <circle cx="640" cy="140" r="4" fill="#A855F7" />

        {/* Right Flowers */}
        <circle cx="1050" cy="110" r="5" fill="#FBBF24" />
        <circle cx="1120" cy="130" r="4.5" fill="#F472B6" />
      </svg>
    </div>
  );
}
