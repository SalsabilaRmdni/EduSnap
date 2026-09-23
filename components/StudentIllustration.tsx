export default function StudentIllustration({
  variant = "waving",
  className = "w-32 h-32",
}: {
  variant?: "waving" | "blackboard" | "avatar";
  className?: string;
}) {
  if (variant === "avatar") {
    return (
      <div className={`relative rounded-full overflow-hidden border-2 border-amber-300 bg-amber-100 p-1 ${className}`}>
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Hair */}
          <path d="M20 32C18 16 30 10 40 10C50 10 62 16 60 32C60 32 55 24 40 24C25 24 20 32 20 32Z" fill="#1E293B" />
          {/* Face */}
          <circle cx="40" cy="42" r="18" fill="#FDE68A" />
          {/* Eyes */}
          <circle cx="34" cy="40" r="2.5" fill="#0F172A" />
          <circle cx="46" cy="40" r="2.5" fill="#0F172A" />
          <path d="M37 47C38 49 42 49 43 47" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="30" cy="44" rx="3" ry="1.5" fill="#F472B6" />
          <ellipse cx="50" cy="44" rx="3" ry="1.5" fill="#F472B6" />
          {/* Shirt */}
          <path d="M22 75C22 60 30 55 40 55C50 55 58 60 58 75H22Z" fill="#3B82F6" />
        </svg>
      </div>
    );
  }

  if (variant === "blackboard") {
    return (
      <div className={`relative inline-block ${className} select-none`}>
        <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Wooden Blackboard Frame */}
          <rect x="80" y="15" width="145" height="90" rx="8" fill="#78350F" stroke="#92400E" strokeWidth="4" />
          {/* Green Board */}
          <rect x="86" y="21" width="133" height="78" rx="4" fill="#15803D" />
          {/* Math Equation Chalk text "5 + 3 = ?" */}
          <text x="110" y="68" fill="#FEF08A" fontFamily="monospace, sans-serif" fontSize="26" fontWeight="bold" letterSpacing="2">
            5 + 3 = ?
          </text>
          {/* Floating Stars */}
          <path d="M210 18L212 23L217 25L212 27L210 32L208 27L203 25L208 23L210 18Z" fill="#FDE047" />
          <path d="M225 75L226 79L230 80L226 82L225 86L223 82L219 80L223 79L225 75Z" fill="#FDE047" />

          {/* Cute Boy Standing on the Left */}
          {/* Boy Body */}
          <path d="M22 135C22 105 32 90 52 90C72 90 82 105 82 135H22Z" fill="#3B82F6" />
          {/* Boy Head */}
          <ellipse cx="52" cy="62" rx="22" ry="24" fill="#FDE68A" />
          {/* Hair */}
          <path d="M30 52C28 32 40 25 52 25C64 25 76 32 74 52C74 52 68 42 52 42C36 42 30 52 30 52Z" fill="#1E293B" />
          {/* Ears */}
          <ellipse cx="29" cy="62" rx="4" ry="6" fill="#FDE68A" />
          <ellipse cx="75" cy="62" rx="4" ry="6" fill="#FDE68A" />
          {/* Face */}
          <circle cx="44" cy="60" r="3.5" fill="#0F172A" />
          <circle cx="60" cy="60" r="3.5" fill="#0F172A" />
          <ellipse cx="38" cy="67" rx="4" ry="2" fill="#F472B6" />
          <ellipse cx="66" cy="67" rx="4" ry="2" fill="#F472B6" />
          <path d="M48 72C50 76 54 76 56 72" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" fill="#FCA5A5" />

          {/* Boy Arm Pointing to Blackboard */}
          <path d="M68 95C78 90 92 78 100 68" stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" />
          <circle cx="102" cy="66" r="4" fill="#FDE68A" />
        </svg>
      </div>
    );
  }

  // Variant "waving" (for Student Dashboard greeting)
  return (
    <div className={`relative inline-block ${className} select-none`}>
      <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Soft Background Accent */}
        <circle cx="70" cy="70" r="60" fill="#E0F2FE" />
        <path d="M22 35L24 40L29 42L24 44L22 49L20 44L15 42L20 40L22 35Z" fill="#FDE047" />

        {/* Boy Body */}
        <path d="M35 140C35 110 46 95 70 95C94 95 105 110 105 140H35Z" fill="#3B82F6" />

        {/* Boy Head */}
        <ellipse cx="70" cy="65" rx="26" ry="28" fill="#FDE68A" />
        {/* Hair */}
        <path d="M44 52C42 28 56 20 70 20C84 20 98 28 96 52C96 52 88 40 70 40C52 40 44 52 44 52Z" fill="#1E293B" />
        {/* Ears */}
        <ellipse cx="43" cy="65" rx="4" ry="6" fill="#FDE68A" />
        <ellipse cx="97" cy="65" rx="4" ry="6" fill="#FDE68A" />

        {/* Face */}
        <circle cx="60" cy="63" r="4" fill="#0F172A" />
        <circle cx="80" cy="63" r="4" fill="#0F172A" />
        <ellipse cx="53" cy="70" rx="5" ry="2.5" fill="#F472B6" />
        <ellipse cx="87" cy="70" rx="5" ry="2.5" fill="#F472B6" />
        <path d="M65 77C67 82 73 82 75 77" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" fill="#FCA5A5" />

        {/* Waving Hand (Right Hand raised) */}
        <path d="M95 105C108 95 118 80 115 65" stroke="#FDE68A" strokeWidth="7" strokeLinecap="round" />
        <circle cx="116" cy="62" r="6" fill="#FDE68A" />
      </svg>
    </div>
  );
}
