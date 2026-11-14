export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="#2A4A68" strokeWidth="1.6" />
      <path d="M16 3.5v4M16 24.5v4M3.5 16h4M24.5 16h4" stroke="#2A4A68" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 9.5v13M9.5 16h13" stroke="#42D9F5" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.4" fill="#22C55E" />
    </svg>
  );
}
