"use client";

import { useEffect, useRef, useState } from "react";
import { getLessonPath, type LessonPathItem } from "@/application/get-lesson-path";
import { loadLearnerState } from "@/application/load-learner-state";
import type { AppServices } from "@/application/ports";
import { recordLessonResult } from "@/application/record-lesson-result";
import { saveRestaurant } from "@/application/save-restaurant";
import { createAppServices, todayIsoDate } from "@/composition/create-services";
import type { AudioLevels } from "@/domain/audio-settings";
import type { Direction } from "@/domain/language";
import { letterTracingEnabled, type LetterTracingMode } from "@/domain/letter-tracing";
import {
  completedLessonIds,
  withAudioSettings,
  withHeartCount,
  withRestaurant,
  type Profile,
} from "@/domain/progress";
import type { RestaurantPlan } from "@/domain/restaurant";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import { copy } from "@/presentation/i18n";
import { PipoMark } from "@/presentation/components/PipoMark";
import { LessonMap } from "@/presentation/screens/LessonMap";
import { LessonPlay } from "@/presentation/screens/LessonPlay";
import { RestaurantPlay } from "@/presentation/screens/RestaurantPlay";
import { SettingsPanel } from "@/presentation/screens/SettingsPanel";

export function App() {
  const [services, setServices] = useState<AppServices | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nodes, setNodes] = useState<LessonPathItem[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(false);
  const profileRef = useRef<Profile | null>(null);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    createAppServices().then(async (next) => {
      const loaded = await loadLearnerState(next.progress, todayIsoDate());
      if (cancelled) return;
      applyLevels(next, loaded.profile);
      setServices(next);
      setProfile(loaded.profile);
      setNodes(getLessonPath(completedLessonIds(loaded.progress)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    profileRef.current = profile;
    if (profile) document.documentElement.lang = profile.uiLang;
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const lang = profile?.uiLang ?? "es";
  const t = copy[lang];
  const coarsePhone = useCoarsePhone();

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

  function persist(next: Profile) {
    if (!services) return;
    profileRef.current = next;
    setProfile(next);
    const progress = services.progress;
    saveQueue.current = saveQueue.current
      .then(() => progress.saveProfile(next))
      .then(() => undefined)
      .catch(() => undefined);
  }

  function changeAudio(patch: Partial<AudioLevels>) {
    const current = profileRef.current;
    if (!services || !current) return;
    const next = withAudioSettings(current, patch);
    applyLevels(services, next);
    if (patch.sound === true) services.sound.play("button");
    persist(next);
  }

  function changeDirection(direction: Direction) {
    const current = profileRef.current;
    if (!current) return;
    persist({ ...current, direction });
  }

  function changeLetterTracing(mode: LetterTracingMode) {
    const current = profileRef.current;
    if (!current) return;
    persist({ ...current, letterTracing: mode });
  }

  function changeHearts(hearts: number) {
    const current = profileRef.current;
    if (!current) return;
    persist(withHeartCount(current, hearts));
  }

  function saveMenu(plan: RestaurantPlan) {
    const current = profileRef.current;
    if (!services || !current) return;
    const optimistic = withRestaurant(current, plan);
    if (!optimistic.restaurant) return;
    profileRef.current = optimistic;
    setProfile(optimistic);
    const progress = services.progress;
    const savedPlan = optimistic.restaurant;
    saveQueue.current = saveQueue.current
      .then(async () => {
        const latest = profileRef.current ?? optimistic;
        const next = await saveRestaurant(progress, latest, savedPlan);
        profileRef.current = next;
        setProfile(next);
      })
      .catch(() => undefined);
  }

  return (
    <>
      {toast ? (
        <p className="fixed top-3 left-1/2 z-40 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-2xl bg-leaf px-4 py-3 text-center text-lg font-bold text-white shadow-[0_4px_0_#3f9a00]">
          {toast}
        </p>
      ) : null}
      {restaurantOpen ? (
        <RestaurantPlay
          direction={profile.direction}
          uiLang={profile.uiLang}
          saved={profile.restaurant}
          t={t}
          speech={services.speech}
          sound={services.sound}
          onExit={() => setRestaurantOpen(false)}
          onSave={saveMenu}
        />
      ) : selected ? (
        <LessonPlay
          lesson={selected}
          direction={profile.direction}
          uiLang={profile.uiLang}
          letterTracing={letterTracingEnabled(profile.letterTracing, coarsePhone)}
          hearts={profile.hearts}
          streak={profile.streak}
          t={t}
          speech={services.speech}
          recognition={services.recognition}
          sound={services.sound}
          onExit={() => setLessonId(null)}
          onHearts={changeHearts}
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
            hearts={profile.hearts}
            xp={profile.xp}
            streak={profile.streak}
            onDirection={(direction) => void changeDirection(direction)}
            onSelect={setLessonId}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenRestaurant={() => setRestaurantOpen(true)}
            restaurantReady={profile.restaurant !== null}
            onPress={() => services.sound.play("button")}
          />
        </>
      )}
      {settingsOpen ? (
        <SettingsPanel
          levels={profile}
          letterTracing={profile.letterTracing}
          tracingOn={letterTracingEnabled(profile.letterTracing, coarsePhone)}
          t={t}
          onChange={changeAudio}
          onLetterTracing={changeLetterTracing}
          onTestEffects={() => services.sound.preview("correct")}
          onTestVoice={() => services.speech.speak(t.testWord, profile.uiLang, SPEECH_RATE_NORMAL)}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  );
}

/** Portrait phones are narrow. Landscape phones are short. A mouse stays on tracing. */
const PHONE_TRACING_QUERY =
  "(pointer: coarse) and (max-width: 720px), (pointer: coarse) and (max-height: 500px)";

function useCoarsePhone(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(PHONE_TRACING_QUERY);
    const apply = () => setCoarse(query.matches);
    const frame = requestAnimationFrame(apply);
    query.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener("change", apply);
    };
  }, []);
  return coarse;
}

function applyLevels(services: AppServices, profile: Profile) {
  services.sound.setEnabled(profile.sound);
  services.sound.setVolume(profile.effectsVolume);
  services.speech.setVolume(profile.voiceVolume);
  services.speech.setSpeed(profile.voiceSpeed);
}
