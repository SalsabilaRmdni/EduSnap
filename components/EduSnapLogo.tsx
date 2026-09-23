export default function EduSnapLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSizes = {
    sm: "text-xl",
    md: "text-2xl sm:text-3xl",
    lg: "text-3xl sm:text-4xl",
  };

  return (
    <div className={`inline-flex items-center font-black tracking-tight select-none ${textSizes[size]}`}>
      <span className="text-blue-600 drop-shadow-xs">Edu</span>
      <span className="text-amber-500 drop-shadow-xs">Snap</span>
    </div>
  );
}
