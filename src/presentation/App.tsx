"use client";

import { useEffect, useMemo, useState } from "react";
import { getLessonPath, type LessonPathItem } from "@/application/get-lesson-path";
import { createAppServices } from "@/composition/create-services";
import type { Lang } from "@/domain/language";
import { copy } from "@/presentation/i18n";
import { LessonDetail } from "@/presentation/screens/LessonDetail";
import { LessonMap } from "@/presentation/screens/LessonMap";

export function App() {
  const services = useMemo(() => createAppServices(), []);
  const [lang, setLang] = useState<Lang>("es");
  const [nodes, setNodes] = useState<LessonPathItem[]>(() => getLessonPath([]));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([services.progress.getCompletedLessonIds(), services.progress.getProfile()]).then(
      ([ids, profile]) => {
        if (cancelled) return;
        setNodes(getLessonPath(ids));
        setLang(profile.uiLang);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [services]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const t = copy[lang];

  return (
    <>
      <LessonMap nodes={nodes} t={t} onSelect={setSelectedId} />
      {selected ? <LessonDetail lesson={selected} t={t} onClose={() => setSelectedId(null)} /> : null}
    </>
  );
}
