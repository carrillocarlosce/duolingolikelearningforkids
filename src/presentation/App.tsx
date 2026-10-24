"use client";

import { useEffect, useState } from "react";
import { getLessonPath, type LessonPathItem } from "@/application/get-lesson-path";
import { loadLearnerState } from "@/application/load-learner-state";
import type { AppServices } from "@/application/ports";
import { recordLessonResult } from "@/application/record-lesson-result";
import { createAppServices, todayIsoDate } from "@/composition/create-services";
import type { Direction } from "@/domain/language";
import { completedLessonIds, type Profile } from "@/domain/progress";
import { copy } from "@/presentation/i18n";
import { PipoMark } from "@/presentation/components/PipoMark";
import { LessonMap } from "@/presentation/screens/LessonMap";
import { LessonPlay } from "@/presentation/screens/LessonPlay";

export function App() {
  const [services, setServices] = useState<AppServices | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nodes, setNodes] = useState<LessonPathItem[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createAppServices().then(async (next) => {
      const loaded = await loadLearnerState(next.progress, todayIsoDate());
      if (cancelled) return;
      next.sound.setEnabled(loaded.profile.sound);
      setServices(next);
      setProfile(loaded.profile);
      setNodes(getLessonPath(completedLessonIds(loaded.progress)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (profile) document.documentElement.lang = profile.uiLang;
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const lang = profile?.uiLang ?? "es";
  const t = copy[lang];

  if (!services || !profile) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <PipoMark className="mx-auto size-28" />
          <p className="mt-4 text-2xl font-bold">{t.loading}</p>
        </div>
      </div>
    );
  }

  const selected = nodes.find((node) => node.id === lessonId) ?? null;

  async function finishLesson(id: string, summary: { xp: number; stars: 1 | 2 | 3 }) {
    if (!services || !profile) return;
    const streakBefore = profile.streak;
    const unlockedBefore = nodes.filter((node) => node.unlocked).length;
    const result = await recordLessonResult(services.progress, {
      lessonId: id,
      xpAwarded: summary.xp,
      attemptXp: summary.xp,
      stars: summary.stars,
      today: todayIsoDate(),
    });
    const progress = await services.progress.getLessonProgress();
    const nextNodes = getLessonPath(completedLessonIds(progress));
    setProfile(result.profile);
    setNodes(nextNodes);
    if (result.profile.streak > streakBefore) {
      window.setTimeout(() => services.sound.play("sparkle"), 1100);
    }
    if (nextNodes.filter((node) => node.unlocked).length > unlockedBefore) {
      window.setTimeout(() => services.sound.play("unlock"), 1500);
    }
    setToast(copy[result.profile.uiLang].saved);
  }

  async function toggleSound() {
    if (!services || !profile) return;
    const next = { ...profile, sound: !profile.sound };
    setProfile(next);
    services.sound.setEnabled(next.sound);
    await services.progress.saveProfile(next);
    if (next.sound) services.sound.play("button");
  }

  async function changeDirection(direction: Direction) {
    if (!services || !profile) return;
    const next = { ...profile, direction };
    setProfile(next);
    await services.progress.saveProfile(next);
  }

  return (
    <>
      {toast ? (
        <p className="fixed top-3 left-1/2 z-40 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-2xl bg-leaf px-4 py-3 text-center text-lg font-bold text-white shadow-[0_4px_0_#3f9a00]">
          {toast}
        </p>
      ) : null}
      {selected ? (
        <LessonPlay
          lesson={selected}
          direction={profile.direction}
          uiLang={profile.uiLang}
          t={t}
          speech={services.speech}
          recognition={services.recognition}
          sound={services.sound}
          onExit={() => setLessonId(null)}
          onFinished={(summary) => void finishLesson(selected.id, summary)}
        />
      ) : (
        <>
          {!services.persistent ? (
            <p className="mx-auto max-w-xl px-4 pt-4 text-center text-base font-semibold">{t.notSaved}</p>
          ) : null}
          <LessonMap
            nodes={nodes}
            t={t}
            direction={profile.direction}
            soundOn={profile.sound}
            onDirection={(direction) => void changeDirection(direction)}
            onSelect={setLessonId}
            onToggleSound={() => void toggleSound()}
            onPress={() => services.sound.play("button")}
          />
        </>
      )}
    </>
  );
}
