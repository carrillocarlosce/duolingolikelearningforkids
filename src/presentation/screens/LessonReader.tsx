import type { SpeechSynthPort } from "@/application/ports";
import { practiceCards, type PracticeCard } from "@/domain/content/practice-cards";
import type { LessonPathItem } from "@/application/get-lesson-path";
import { SpeakButtons } from "@/presentation/components/SpeakButtons";
import type { Copy } from "@/presentation/i18n";

type LessonReaderProps = {
  lesson: LessonPathItem;
  t: Copy;
  saving: boolean;
  actionLabel: string;
  cards?: readonly PracticeCard[];
  speech: SpeechSynthPort;
  onBack: () => void;
  onFinish: () => void;
};

export function LessonReader({ lesson, t, saving, actionLabel, cards, speech, onBack, onFinish }: LessonReaderProps) {
  const shown = cards ?? practiceCards(lesson.id);
  const note = !lesson.unlocked ? t.lockedNote : lesson.completed ? t.doneNote : t.currentNote;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-5 pb-28">
      <button
        type="button"
        onClick={onBack}
        className="btn-3d btn-soft w-fit bg-white px-5 py-3 text-lg text-ink"
      >
        {t.back}
      </button>
      <header className="mt-4 rounded-[2rem] bg-white px-5 py-5">
        <p className="text-sm font-bold uppercase tracking-wide text-sky">{t.readHeading}</p>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-5xl" aria-hidden="true" draggable={false}>
            {lesson.emoji}
          </span>
          <div>
            <h1 className="text-3xl font-bold leading-tight">{lesson.title.en}</h1>
            <p className="text-xl font-semibold text-leaf-dark">{lesson.title.es}</p>
          </div>
        </div>
        <p className="mt-4 text-lg leading-snug">{note}</p>
      </header>
      <ul className="mt-4 flex flex-col gap-3">
        {shown.map((card) => (
          <li key={card.id} className="flex items-center gap-4 rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_4px_0_#e4e4e4]">
            <span className="text-5xl" aria-hidden="true" draggable={false}>
              {card.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold leading-tight">{card.en}</p>
              <p className="text-xl font-semibold text-leaf-dark">{card.es}</p>
              <div className="mt-2">
                <SpeakButtons en={card.en} es={card.es} speech={speech} t={t} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {lesson.unlocked ? (
        <div className="fixed inset-x-0 bottom-0 z-10 px-4 pb-4">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              disabled={saving}
              onClick={onFinish}
              className="btn-3d btn-leaf w-full bg-leaf py-4 text-xl text-white disabled:opacity-70"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
