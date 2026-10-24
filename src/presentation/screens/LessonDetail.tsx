import type { LessonPathItem } from "@/application/get-lesson-path";
import type { Copy } from "@/presentation/i18n";

type LessonDetailProps = {
  lesson: LessonPathItem;
  t: Copy;
  onClose: () => void;
};

export function LessonDetail({ lesson, t, onClose }: LessonDetailProps) {
  const note = !lesson.unlocked ? t.lockedNote : lesson.completed ? t.doneNote : t.currentNote;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-3 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-title"
        className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_8px_0_#d8d8d8]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-cream text-5xl">
            <span aria-hidden="true">{lesson.emoji}</span>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky">{t.inThisLesson}</p>
            <h2 id="lesson-title" className="text-3xl font-bold leading-tight text-ink">
              {lesson.title.en}
            </h2>
            <p className="text-xl font-semibold text-leaf-dark">{lesson.title.es}</p>
          </div>
        </div>
        <p className="mt-5 text-xl leading-snug text-ink">{lesson.blurb.es}</p>
        <p className="text-lg text-ink/70">{lesson.blurb.en}</p>
        <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-lg leading-snug">{note}</p>
        <button
          type="button"
          onClick={onClose}
          className="btn-3d mt-5 w-full bg-sky py-4 text-xl text-white"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
}
