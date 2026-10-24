type PipoMarkProps = {
  className?: string;
  title?: string;
};

/** Small original mango mark. Expressive poses come later. */
export function PipoMark({ className, title = "Pipo" }: PipoMarkProps) {
  return (
    <span draggable={false} className="contents">
    <svg
      viewBox="0 0 80 80"
      className={className}
      role="img"
      aria-label={title}
    >
      <circle cx="40" cy="46" r="24" fill="#FFB02E" />
      <ellipse cx="30" cy="36" rx="7" ry="5" fill="#FFD98A" />
      <ellipse cx="46" cy="20" rx="8" ry="5" transform="rotate(-30 46 20)" fill="#2E8C28" />
      <circle cx="32" cy="44" r="3.2" fill="#4A2C18" />
      <circle cx="48" cy="44" r="3.2" fill="#4A2C18" />
      <circle cx="24" cy="50" r="3" fill="#FF8C96" />
      <circle cx="56" cy="50" r="3" fill="#FF8C96" />
      <path
        d="M32 54c2.5 4 13.5 4 16 0"
        fill="none"
        stroke="#4A2C18"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
    </span>
  );
}
