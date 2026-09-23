export default function SchoolIllustration({ className = "w-48 h-32" }: { className?: string }) {
  return (
    <div className={`relative inline-block ${className} select-none`}>
      <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        {/* Ground / Grass Base */}
        <ellipse cx="120" cy="155" rx="110" ry="18" fill="#86EFAC" />
        <ellipse cx="120" cy="158" rx="90" ry="10" fill="#4ADE80" />

        {/* Trees on Left and Right */}
        {/* Left Tree */}
        <rect x="24" y="95" width="8" height="35" rx="3" fill="#B45309" />
        <circle cx="28" cy="85" r="20" fill="#22C55E" />
        <circle cx="36" cy="80" r="14" fill="#4ADE80" />
        <circle cx="20" cy="82" r="12" fill="#16A34A" />

        {/* Right Tree */}
        <rect x="208" y="95" width="8" height="35" rx="3" fill="#B45309" />
        <circle cx="212" cy="85" r="20" fill="#22C55E" />
        <circle cx="204" cy="80" r="14" fill="#4ADE80" />
        <circle cx="220" cy="82" r="12" fill="#16A34A" />

        {/* Main School Building Walls (Warm Pastel Yellow / Orange) */}
        <rect x="55" y="75" width="130" height="65" rx="8" fill="#FEF08A" stroke="#F59E0B" strokeWidth="3" />

        {/* Central Entrance Tower (Slightly taller) */}
        <rect x="95" y="55" width="50" height="85" rx="6" fill="#FDE047" stroke="#F59E0B" strokeWidth="3" />

        {/* Left Wing Roof (Orange Tile) */}
        <path d="M48 78L120 40L120 45L52 82Z" fill="#F97316" />
        <path d="M46 76L102 48H52L46 76Z" fill="#EA580C" />

        {/* Right Wing Roof */}
        <path d="M192 78L120 40L120 45L188 82Z" fill="#F97316" />
        <path d="M194 76L138 48H188L194 76Z" fill="#EA580C" />

        {/* Center Tower Triangular Roof (Red/Orange) */}
        <polygon points="120,20 85,55 155,55" fill="#EF4444" stroke="#B91C1C" strokeWidth="3" />

        {/* Flag Pole on Roof */}
        <line x1="120" y1="20" x2="120" y2="4" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
        {/* Indonesian Flag (Red & White) */}
        <rect x="120" y="4" width="16" height="5" fill="#EF4444" />
        <rect x="120" y="9" width="16" height="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />

        {/* Clock in Central Tower */}
        <circle cx="120" cy="40" r="8" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2" />
        <line x1="120" y1="40" x2="120" y2="35" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="120" y1="40" x2="123" y2="40" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />

        {/* Windows (Left Wing) */}
        <rect x="68" y="88" width="16" height="18" rx="4" fill="#93C5FD" stroke="#3B82F6" strokeWidth="2" />
        <line x1="76" y1="88" x2="76" y2="106" stroke="#3B82F6" strokeWidth="1.5" />
        <line x1="68" y1="97" x2="84" y2="97" stroke="#3B82F6" strokeWidth="1.5" />

        {/* Windows (Right Wing) */}
        <rect x="156" y="88" width="16" height="18" rx="4" fill="#93C5FD" stroke="#3B82F6" strokeWidth="2" />
        <line x1="164" y1="88" x2="164" y2="106" stroke="#3B82F6" strokeWidth="1.5" />
        <line x1="156" y1="97" x2="172" y2="97" stroke="#3B82F6" strokeWidth="1.5" />

        {/* Arched School Entrance Door */}
        <path d="M108 140V105C108 98 132 98 132 105V140H108Z" fill="#92400E" stroke="#78350F" strokeWidth="2" />
        <path d="M110 140V107C110 101 130 101 130 107V140H110Z" fill="#B45309" />
        <circle cx="114" cy="122" r="2" fill="#FDE047" />

        {/* Cute Little Bushes in Front */}
        <circle cx="48" cy="142" r="10" fill="#22C55E" />
        <circle cx="58" cy="144" r="8" fill="#16A34A" />
        <circle cx="182" cy="144" r="8" fill="#16A34A" />
        <circle cx="192" cy="142" r="10" fill="#22C55E" />

        {/* Little Yellow & Pink Flowers */}
        <circle cx="36" cy="146" r="3" fill="#FBBF24" />
        <circle cx="44" cy="149" r="2" fill="#EC4899" />
        <circle cx="198" cy="148" r="3" fill="#FBBF24" />
        <circle cx="206" cy="145" r="2" fill="#EC4899" />
      </svg>
    </div>
  );
}
