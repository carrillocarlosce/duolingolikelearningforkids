import type { SentenceScene } from "@/domain/content/sentences";
import { PipoMark } from "@/presentation/components/PipoMark";

/** Mascot plus the foods, so "I like apples" is not just an apple. */
export function SentenceSceneView({ scene }: { scene: SentenceScene }) {
  const cue = scene.mascot === "like" ? "💛" : scene.mascot === "want" ? "👉" : scene.mascot === "shop" ? "🏠" : null;
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {scene.mascot ? <PipoMark className="size-20" /> : null}
      {cue ? (
        <span className="text-5xl" draggable={false}>
          {cue}
        </span>
      ) : null}
      {scene.emojis.map((emoji, index) => (
        <span key={`${emoji}-${index}`} className="text-5xl" draggable={false}>
          {emoji}
        </span>
      ))}
    </div>
  );
}
