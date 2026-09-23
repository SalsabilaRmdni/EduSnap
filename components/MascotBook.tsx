export default function MascotBook({ className = "w-32 h-32 sm:w-40 sm:h-40" }: { className?: string }) {
  return (
    <div className={`relative inline-block ${className} select-none`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Glow / Sparkles behind */}
        <circle cx="100" cy="95" r="75" fill="#E0F2FE" fillOpacity="0.4" />
        <path d="M40 40L43 48L51 51L43 54L40 62L37 54L29 51L37 48L40 40Z" fill="#FDE047" />
        <path d="M165 35L167 41L173 43L167 45L165 51L163 45L157 43L163 41L165 35Z" fill="#FDE047" />
        <circle cx="35" cy="85" r="3" fill="#F59E0B" />
        <circle cx="170" cy="115" r="3.5" fill="#38BDF8" />
        <circle cx="45" cy="130" r="3" fill="#EC4899" />

        {/* Backpack on the left/back */}
        <path
          d="M48 90C45 80 48 70 58 68C68 66 74 72 75 82C75 92 70 102 60 104C50 106 48 98 48 90Z"
          fill="#10B981"
        />
        <path
          d="M52 74C56 73 60 76 62 80C64 84 63 90 59 92"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="58" cy="88" r="4" fill="#F59E0B" />

        {/* Book Body (Outer Cover - Blue with curved spine) */}
        <rect
          x="55"
          y="45"
          width="90"
          height="115"
          rx="18"
          transform="rotate(-4 100 100)"
          fill="#6366F1"
        />
        {/* Book Back spine */}
        <path
          d="M54 52C54 44 60 38 68 38H136C144 38 150 44 150 52V148C150 156 144 162 136 162H68C60 162 54 156 54 148V52Z"
          fill="#3B82F6"
          stroke="#1E40AF"
          strokeWidth="4"
        />

        {/* Inner Pages (White/Cream) */}
        <path
          d="M62 46C62 42 66 39 70 39H142C146 39 150 42 150 46V152C150 156 146 159 142 159H70C66 159 62 156 62 152V46Z"
          fill="#F8FAFC"
        />
        <path
          d="M66 50C66 45 70 42 75 42H137C142 42 146 45 146 50V146C146 151 142 154 137 154H75C70 154 66 151 66 146V50Z"
          fill="#60A5FA"
        />

        {/* Page trim lines on the right */}
        <path d="M148 48V150" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <path d="M151 52V146" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

        {/* Yellow Bookmark Ribbon */}
        <path
          d="M85 38V65L92 58L99 65V38H85Z"
          fill="#FBBF24"
          stroke="#D97706"
          strokeWidth="2"
        />

        {/* Cute Mascot Face */}
        {/* Left Eye */}
        <ellipse cx="88" cy="94" rx="7" ry="9" fill="#0F172A" />
        <circle cx="86" cy="90" r="3" fill="#FFFFFF" />
        <circle cx="91" cy="97" r="1.5" fill="#FFFFFF" />

        {/* Right Eye */}
        <ellipse cx="122" cy="92" rx="7" ry="9" fill="#0F172A" />
        <circle cx="120" cy="88" r="3" fill="#FFFFFF" />
        <circle cx="125" cy="95" r="1.5" fill="#FFFFFF" />

        {/* Blushing Cheeks (Pink) */}
        <ellipse cx="78" cy="103" rx="7" ry="4" fill="#F472B6" fillOpacity="0.8" />
        <ellipse cx="132" cy="101" rx="7" ry="4" fill="#F472B6" fillOpacity="0.8" />

        {/* Big Happy Smiling Mouth */}
        <path
          d="M97 104C97 104 105 116 114 115C121 114 122 104 122 104"
          stroke="#0F172A"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="#EF4444"
        />

        {/* Left Arm (Relaxed) */}
        <path
          d="M62 108C50 115 48 122 55 128C60 132 66 124 67 116"
          fill="#3B82F6"
          stroke="#1D4ED8"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Right Arm (Waving & Holding Yellow Star) */}
        <path
          d="M142 98C152 92 160 85 162 76C164 68 155 72 146 86"
          fill="#3B82F6"
          stroke="#1D4ED8"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Star in Hand */}
        <g transform="translate(155, 48) scale(0.9)">
          <path
            d="M20 0L26 13L40 15L30 25L32 39L20 32L8 39L10 25L0 15L14 13L20 0Z"
            fill="#FBBF24"
            stroke="#D97706"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Star Face */}
          <circle cx="16" cy="18" r="2" fill="#0F172A" />
          <circle cx="24" cy="18" r="2" fill="#0F172A" />
          <path d="M18 23C19 25 21 25 22 23" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Cute Feet */}
        <ellipse cx="85" cy="162" rx="10" ry="7" fill="#1D4ED8" />
        <ellipse cx="125" cy="160" rx="10" ry="7" fill="#1D4ED8" />
      </svg>
    </div>
  );
}
