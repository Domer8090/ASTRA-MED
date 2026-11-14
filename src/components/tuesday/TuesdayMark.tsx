/** Tuesday's mark: a small planet with one companion in orbit. */
export function TuesdayMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <circle cx="16" cy="16" r="7" className="fill-tue/20 stroke-tue" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="13.5" ry="6" transform="rotate(-24 16 16)" className="stroke-tue/70" strokeWidth="1.2" />
      <circle cx="27.4" cy="10.8" r="2.3" className="fill-tue" />
    </svg>
  );
}
