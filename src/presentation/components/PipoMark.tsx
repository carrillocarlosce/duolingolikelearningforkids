export type PipoMood = "idle" | "happy" | "oops" | "cheer";

type PipoMarkProps = {
  className?: string;
  title?: string;
  mood?: PipoMood;
};

const motion: Record<PipoMood, string> = {
  idle: "",
  happy: "pipo-pop",
  oops: "shake",
  cheer: "pipo-cheer",
};

/** Original mango. The mouth and the bounce follow the answer. */
export function PipoMark({ className, title = "Pipo", mood = "idle" }: PipoMarkProps) {
  const pleased = mood === "happy" || mood === "cheer";
  return (
    <span draggable={false} className="contents">
    <svg
      viewBox="0 0 80 80"
      className={[className, motion[mood]].filter(Boolean).join(" ")}
      role="img"
      aria-label={title}
      data-mood={mood}
    >
      <circle cx="40" cy="46" r="24" fill="#FFB02E" />
      <ellipse cx="30" cy="36" rx="7" ry="5" fill="#FFD98A" />
      <ellipse cx="46" cy="20" rx="8" ry="5" transform="rotate(-30 46 20)" fill="#2E8C28" />
      {pleased ? (
        <>
          <path d="M27 45c2.2-3.2 6.2-3.2 8.2 0" fill="none" stroke="#4A2C18" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M45 45c2.2-3.2 6.2-3.2 8.2 0" fill="none" stroke="#4A2C18" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="32" cy="44" r="3.2" fill="#4A2C18" />
          <circle cx="48" cy="44" r="3.2" fill="#4A2C18" />
        </>
      )}
      <circle cx="24" cy="50" r="3" fill="#FF8C96" />
      <circle cx="56" cy="50" r="3" fill="#FF8C96" />
      <path
        d={mood === "oops" ? "M32 58c2.4-3.6 13.6-3.6 16 0" : pleased ? "M30 52c3.2 6.4 16.8 6.4 20 0" : "M32 54c2.5 4 13.5 4 16 0"}
        fill="none"
        stroke="#4A2C18"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
    </span>
  );
}
