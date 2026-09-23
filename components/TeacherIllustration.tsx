export default function TeacherIllustration({ className = "w-36 h-36" }: { className?: string }) {
  return (
    <div className={`relative inline-block ${className} select-none`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        {/* Soft Background Circle */}
        <circle cx="80" cy="80" r="70" fill="#F3E8FF" />

        {/* Floating Stars */}
        <path d="M28 45L30 50L35 52L30 54L28 59L26 54L21 52L26 50L28 45Z" fill="#FBBF24" />
        <path d="M135 40L137 45L142 47L137 49L135 54L133 49L128 47L133 45L135 40Z" fill="#FBBF24" />
        <circle cx="25" cy="90" r="3" fill="#A855F7" />
        <circle cx="138" cy="85" r="3" fill="#38BDF8" />

        {/* Brown Hair (Back Layer) */}
        <path
          d="M48 60C45 80 44 110 55 125C65 140 95 140 105 125C116 110 115 80 112 60C110 38 50 38 48 60Z"
          fill="#5C2D13"
        />

        {/* Body & Purple Shirt */}
        <path
          d="M45 155C45 130 56 115 80 115C104 115 115 130 115 155H45Z"
          fill="#7C3AED"
        />
        {/* White Collar */}
        <path d="M72 115L80 128L88 115H72Z" fill="#FFFFFF" />

        {/* Neck */}
        <rect x="74" y="98" width="12" height="18" fill="#FCD34D" />

        {/* Face (Warm Peach) */}
        <ellipse cx="80" cy="78" rx="26" ry="28" fill="#FDE68A" />

        {/* Ears */}
        <ellipse cx="54" cy="78" rx="5" ry="7" fill="#FDE68A" />
        <ellipse cx="106" cy="78" rx="5" ry="7" fill="#FDE68A" />

        {/* Cute Bangs & Hair Front */}
        <path
          d="M52 65C58 52 70 48 80 48C90 48 102 52 108 65C108 65 98 60 88 64C78 68 62 60 52 65Z"
          fill="#451A03"
        />
        <path
          d="M50 68C48 82 50 95 53 100C54 94 56 80 56 70"
          stroke="#451A03"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M110 68C112 82 110 95 107 100C106 94 104 80 104 70"
          stroke="#451A03"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Round Glasses */}
        {/* Left Lens */}
        <circle cx="70" cy="75" r="9" stroke="#1E1B4B" strokeWidth="2.5" fill="#FFFFFF" fillOpacity="0.4" />
        {/* Right Lens */}
        <circle cx="90" cy="75" r="9" stroke="#1E1B4B" strokeWidth="2.5" fill="#FFFFFF" fillOpacity="0.4" />
        {/* Glasses Bridge */}
        <line x1="79" y1="75" x2="81" y2="75" stroke="#1E1B4B" strokeWidth="2.5" />
        {/* Glasses Temples */}
        <line x1="61" y1="74" x2="55" y2="74" stroke="#1E1B4B" strokeWidth="2" />
        <line x1="99" y1="74" x2="105" y2="74" stroke="#1E1B4B" strokeWidth="2" />

        {/* Eyes Behind Glasses */}
        <circle cx="70" cy="75" r="3.5" fill="#0F172A" />
        <circle cx="69" cy="73.5" r="1.2" fill="#FFFFFF" />
        <circle cx="90" cy="75" r="3.5" fill="#0F172A" />
        <circle cx="89" cy="73.5" r="1.2" fill="#FFFFFF" />

        {/* Eyebrows */}
        <path d="M64 64C67 62 73 62 76 64" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
        <path d="M84 64C87 62 93 62 96 64" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />

        {/* Smiling Mouth */}
        <path d="M75 90C77 94 83 94 85 90" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" fill="#FCA5A5" />

        {/* Pink Blush */}
        <ellipse cx="61" cy="85" rx="5" ry="3" fill="#F472B6" fillOpacity="0.8" />
        <ellipse cx="99" cy="85" rx="5" ry="3" fill="#F472B6" fillOpacity="0.8" />

        {/* Right Arm: Pointing Up Encouragingly */}
        <path
          d="M105 130C115 125 122 110 120 95C119 90 124 90 125 94C126 100 124 108 126 115"
          stroke="#FCD34D"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Pointing Hand */}
        <circle cx="120" cy="92" r="4" fill="#FCD34D" />
        <line x1="120" y1="92" x2="120" y2="82" stroke="#FCD34D" strokeWidth="3.5" strokeLinecap="round" />

        {/* Left Arm: Holding Blue Book */}
        <path
          d="M55 130C48 135 45 140 50 148"
          stroke="#7C3AED"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Open Book */}
        <g transform="translate(48, 125) rotate(-10)">
          <rect x="0" y="0" width="22" height="28" rx="3" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <rect x="3" y="3" width="16" height="22" rx="2" fill="#FFFFFF" />
          <line x1="6" y1="8" x2="16" y2="8" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="13" x2="16" y2="13" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="18" x2="13" y2="18" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
