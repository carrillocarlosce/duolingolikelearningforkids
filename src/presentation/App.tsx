"use client";

import { useEffect, useState } from "react";
import { getLessonPath, type LessonPathItem } from "@/application/get-lesson-path";
import { loadLearnerState } from "@/application/load-learner-state";
import type { AppServices } from "@/application/ports";
import { recordLessonResult } from "@/application/record-lesson-result";
import { createAppServices, todayIsoDate } from "@/composition/create-services";
import { completedLessonIds, type Profile } from "@/domain/progress";
import { XP_READ } from "@/domain/scoring";
import { copy } from "@/presentation/i18n";
import { PipoMark } from "@/presentation/components/PipoMark";
import { LessonMap } from "@/presentation/screens/LessonMap";
import { LessonReader } from "@/presentation/screens/LessonReader";

export function App() {
  const [services, setServices] = useState<AppServices | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nodes, setNodes] = useState<LessonPathItem[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createAppServices().then(async (next) => {
      const loaded = await loadLearnerState(next.progress, todayIsoDate());
      if (cancelled) return;
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

  async function finishLesson(id: string) {
    if (!services || saving) return;
    setSaving(true);
    try {
      await recordLessonResult(services.progress, {
        lessonId: id,
        xpAwarded: XP_READ,
        attemptXp: XP_READ,
        stars: 1,
        today: todayIsoDate(),
      });
      const loaded = await loadLearnerState(services.progress, todayIsoDate());
      setProfile(loaded.profile);
      setNodes(getLessonPath(completedLessonIds(loaded.progress)));
      setLessonId(null);
      setToast(copy[loaded.profile.uiLang].saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {toast ? (
        <p className="fixed top-3 left-1/2 z-40 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-2xl bg-leaf px-4 py-3 text-center text-lg font-bold text-white shadow-[0_4px_0_#3f9a00]">
          {toast}
        </p>
      ) : null}
      {selected ? (
        <LessonReader
          lesson={selected}
          t={t}
          saving={saving}
          onBack={() => setLessonId(null)}
          onFinish={() => void finishLesson(selected.id)}
        />
      ) : (
        <>
          {!services.persistent ? (
            <p className="mx-auto max-w-xl px-4 pt-4 text-center text-base font-semibold">{t.notSaved}</p>
          ) : null}
          <LessonMap nodes={nodes} t={t} onSelect={setLessonId} />
        </>
      )}
    </>
  );
}
