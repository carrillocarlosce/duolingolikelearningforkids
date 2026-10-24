import type { LessonPathItem } from "@/application/get-lesson-path";
import type { Direction } from "@/domain/language";
import type { Copy } from "@/presentation/i18n";
import { PipoMark } from "@/presentation/components/PipoMark";

const directions: Direction[] = ["en-es", "es-en", "en", "es"];

const offsets = [-76, -24, 76, 28];

type LessonMapProps = {
  nodes: LessonPathItem[];
  t: Copy;
  direction: Direction;
  onDirection: (direction: Direction) => void;
  onSelect: (id: string) => void;
};

export function LessonMap({ nodes, t, direction, onDirection, onSelect }: LessonMapProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-16 pt-6">
      <header className="rounded-[2rem] bg-white px-5 py-5 shadow-[0_8px_0_rgba(255,255,255,0.65)]">
        <div className="flex items-center gap-4">
          <PipoMark className="size-20 shrink-0" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky">{t.unitLabel}</p>
            <h1 className="text-3xl font-bold leading-tight text-ink">
              Let&apos;s go to the market!
            </h1>
            <p className="mt-1 text-lg font-semibold text-leaf-dark">{t.hello}</p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-lg leading-snug text-ink">
          {t.challenge}
        </p>
        <p className="mt-4 text-sm font-bold uppercase tracking-wide text-sky">{t.practiceHow}</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {directions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={direction === option}
              onClick={() => onDirection(option)}
              className={[
                "rounded-2xl px-1 py-3 text-sm font-bold",
                direction === option ? "bg-leaf text-white" : "bg-cream text-ink",
              ].join(" ")}
            >
              {option === "en-es" ? "EN→ES" : option === "es-en" ? "ES→EN" : option.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-2xl" aria-hidden="true">
          🍎 🥛 🍕 🥗 🍦
        </p>
      </header>

      <section className="relative mt-8" aria-label={t.pathLabel}>
        <div
          className="pointer-events-none absolute bottom-10 left-1/2 top-6 w-3 -translate-x-1/2 rounded-full bg-white/80"
          aria-hidden="true"
        />
        <ol className="relative flex flex-col gap-3">
          {nodes.map((node, index) => {
            const offset = offsets[index % offsets.length] ?? 0;
            return (
              <li key={node.id} className="flex justify-center">
                <div
                  className="flex w-40 flex-col items-center"
                  style={{ transform: `translateX(${offset}px)` }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(node.id)}
                    aria-current={node.current ? "step" : undefined}
                    className={[
                      "relative grid size-24 place-items-center rounded-full border-4 bg-white text-5xl shadow-[0_6px_0_#e5e5e5]",
                      "transition active:translate-y-1 active:shadow-none",
                      node.current
                        ? "border-leaf bob"
                        : node.completed
                          ? "border-sun"
                          : node.unlocked
                            ? "border-sky"
                            : "border-slate-200",
                    ].join(" ")}
                  >
                    <span aria-hidden="true">{node.emoji}</span>
                    <span className="sr-only">
                      {node.title.en}. {node.title.es}.
                      {node.current ? ` ${t.startHere}` : ""}
                      {!node.unlocked ? ` ${t.locked}` : ""}
                      {node.completed ? ` ${t.done}` : ""}
                    </span>
                    {node.completed ? (
                      <span
                        className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-sun text-lg font-bold text-ink"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    ) : !node.unlocked ? (
                      <span
                        className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-slate-400 text-base text-white"
                        aria-hidden="true"
                      >
                        🔒
                      </span>
                    ) : null}
                    {node.current ? (
                      <span className="absolute -top-3 rounded-full bg-leaf px-2 py-0.5 text-xs font-bold text-white">
                        {t.startHere}
                      </span>
                    ) : null}
                  </button>
                  <p className="mt-2 text-center text-base font-bold leading-tight text-ink">
                    {node.title.es}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
