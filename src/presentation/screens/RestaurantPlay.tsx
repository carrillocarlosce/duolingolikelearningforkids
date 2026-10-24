"use client";

import { useEffect, useState } from "react";
import type { SoundEffectsPort, SpeechSynthPort } from "@/application/ports";
import { vocabulary } from "@/domain/content/vocabulary";
import type { Direction, Lang } from "@/domain/language";
import {
  menuSentence,
  menuVerdict,
  readRestaurant,
  restaurantAnswerLang,
  restaurantName,
  type RestaurantPlan,
} from "@/domain/restaurant";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import { LanguageBadge } from "@/presentation/components/LanguageBadge";
import { PipoMark } from "@/presentation/components/PipoMark";
import type { Copy } from "@/presentation/i18n";

type Step = "name" | "menu" | "done";

const cue: Record<Lang, { name: string; menu: string }> = {
  en: { name: "Name it in English", menu: "Menu in English" },
  es: { name: "Ponle nombre en español", menu: "Menú en español" },
};

type RestaurantPlayProps = {
  direction: Direction;
  uiLang: Lang;
  saved: RestaurantPlan | null;
  t: Copy;
  speech: SpeechSynthPort;
  sound: SoundEffectsPort;
  onExit: () => void;
  onSave: (plan: RestaurantPlan) => void;
};

export function RestaurantPlay({
  direction,
  uiLang,
  saved,
  t,
  speech,
  sound,
  onExit,
  onSave,
}: RestaurantPlayProps) {
  const answerLang = restaurantAnswerLang(direction);
  const otherLang: Lang = answerLang === "en" ? "es" : "en";
  const [step, setStep] = useState<Step>(saved ? "done" : "name");
  const [nameId, setNameId] = useState<string | null>(saved?.nameItemId ?? null);
  const [menuIds, setMenuIds] = useState<string[]>(() => (saved ? [...saved.menuIds] : []));
  const [hint, setHint] = useState<"short" | "treats" | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const nameItem = vocabulary.find((item) => item.id === nameId) ?? null;
  const helper = uiLang === answerLang ? null : answerLang === "en" ? t.answerInEnglish : t.answerInSpanish;
  const nameText = nameItem ? restaurantName(nameItem, answerLang) : null;
  const otherNameText = nameItem ? restaurantName(nameItem, otherLang) : null;
  const menuText = menuIds.length === 3 ? menuSentence(menuIds, answerLang) : null;
  const otherMenuText = menuIds.length === 3 ? menuSentence(menuIds, otherLang) : null;

  function pickName(id: string) {
    sound.play("select");
    setNameId(id);
  }

  function pickMenu(id: string) {
    setHint(null);
    if (menuIds.includes(id)) {
      sound.play("select");
      setMenuIds(menuIds.filter((item) => item !== id));
      return;
    }
    if (menuIds.length >= 3) {
      sound.play("wrong");
      return;
    }
    sound.play("select");
    setMenuIds([...menuIds, id]);
  }

  function checkMenu() {
    if (!nameId) {
      setStep("name");
      return;
    }
    const verdict = menuVerdict(menuIds);
    if (verdict === "short") {
      setHint("short");
      sound.play("wrong");
      return;
    }
    const plan = readRestaurant({ nameItemId: nameId, menuIds });
    if (!plan) {
      setHint("treats");
      sound.play("wrong");
      return;
    }
    setHint(null);
    setStep("done");
    sound.play("correct");
    window.setTimeout(() => sound.play("fanfare"), 450);
    onSave(plan);
  }

  return (
    <div
      className={[
        "mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-5",
        step === "done" ? "pb-10" : "pb-56",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => {
          sound.play("button");
          onExit();
        }}
        className="btn-3d btn-soft w-fit bg-white px-5 py-3 text-lg text-ink"
      >
        {t.back}
      </button>

      <header className="mt-4 flex items-center gap-4">
        <PipoMark className={step === "done" ? "size-20 shrink-0 bob" : "size-20 shrink-0"} />
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-sky">{t.restaurantForMom}</p>
          <h1 className="text-3xl font-bold leading-tight">{t.restaurant}</h1>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-3" data-restaurant-step={step}>
        {step === "name" ? (
          <>
            <LanguageBadge lang={answerLang} label={cue[answerLang].name} speech={speech} spoken={nameText} helper={helper} />
            <LanguageBadge lang={otherLang} label={cue[otherLang].name} speech={speech} spoken={otherNameText} />
          </>
        ) : null}
        {step === "menu" && nameText ? (
          <p lang={answerLang} className="rounded-2xl bg-white px-4 py-3 text-lg font-bold leading-snug">
            {nameText}
          </p>
        ) : null}
        {step === "menu" ? (
          <p
            className="text-center text-2xl font-bold"
            aria-label={`${menuIds.length} / 3 ${t.restaurantCount}`}
          >
            {menuIds.length} / 3
          </p>
        ) : null}
        {step === "done" && nameItem ? (
          <>
            <h2 className="text-center text-3xl font-bold text-leaf-dark">{t.restaurantHealthy}</h2>
            <LanguageBadge lang="en" label={cue.en.name} speech={speech} spoken={restaurantName(nameItem, "en")} />
            <LanguageBadge lang="es" label={cue.es.name} speech={speech} spoken={restaurantName(nameItem, "es")} />
            <LanguageBadge lang="en" label={cue.en.menu} speech={speech} spoken={menuSentence(menuIds, "en")} />
            <LanguageBadge lang="es" label={cue.es.menu} speech={speech} spoken={menuSentence(menuIds, "es")} />
            <ul className="flex flex-col gap-2">
              {menuIds.map((id) => {
                const item = vocabulary.find((food) => food.id === id);
                if (!item) return null;
                return (
                  <li key={id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2">
                    <span className="text-4xl" aria-hidden="true" draggable={false}>
                      {item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p lang="en" className="text-lg font-bold leading-tight">
                        {item.en}
                      </p>
                      <p lang="es" className="text-base font-semibold leading-tight text-ink/70">
                        {item.es}
                      </p>
                    </div>
                    <button
                      type="button"
                      lang="en"
                      aria-label={`${t.restaurantHear} ${item.en}`}
                      onClick={() => {
                        sound.play("button");
                        speech.speak(item.en, "en", SPEECH_RATE_NORMAL);
                      }}
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-cream text-2xl"
                    >
                      <span aria-hidden="true" draggable={false}>
                        🇺🇸
                      </span>
                    </button>
                    <button
                      type="button"
                      lang="es"
                      aria-label={`${t.restaurantHear} ${item.es}`}
                      onClick={() => {
                        sound.play("button");
                        speech.speak(item.es, "es", SPEECH_RATE_NORMAL);
                      }}
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-cream text-2xl"
                    >
                      <span aria-hidden="true" draggable={false}>
                        🇵🇪
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-center text-base font-semibold text-ink/70">{t.restaurantSaved}</p>
            <button
              type="button"
              onClick={() => {
                sound.play("button");
                onExit();
              }}
              className="btn-3d btn-leaf w-full bg-leaf py-4 text-xl text-white"
            >
              {t.back}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.play("button");
                setHint(null);
                setStep("name");
              }}
              className="btn-3d btn-soft w-full bg-white py-4 text-xl"
            >
              {t.restaurantChange}
            </button>
          </>
        ) : null}
      </div>

      {step !== "done" ? (
        <>
          <p className="mt-5 text-sm font-bold uppercase tracking-wide text-sky">
            {step === "name" ? t.restaurantNameStep : t.restaurantMenuStep}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {vocabulary.map((item) => {
              const selected = step === "name" ? nameId === item.id : menuIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={[
                    "relative rounded-2xl bg-white shadow-[0_4px_0_#e5e5e5]",
                    selected ? "ring-4 ring-leaf" : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    data-food-id={item.id}
                    aria-pressed={selected}
                    onClick={() => (step === "name" ? pickName(item.id) : pickMenu(item.id))}
                    className="flex min-h-24 w-full flex-col items-center px-2 pt-3 pb-2"
                  >
                    <span className="text-4xl" aria-hidden="true" draggable={false}>
                      {item.emoji}
                    </span>
                    <span lang={answerLang} className="mt-1 text-center text-base font-bold leading-tight">
                      {item[answerLang]}
                    </span>
                    <span lang={otherLang} className="text-center text-xs font-semibold leading-tight text-ink/60">
                      {item[otherLang]}
                    </span>
                  </button>
                  <button
                    type="button"
                    lang={answerLang}
                    aria-label={`${t.restaurantHear} ${item[answerLang]}`}
                    onClick={() => {
                      sound.play("button");
                      speech.speak(item[answerLang], answerLang, SPEECH_RATE_NORMAL);
                    }}
                    className="absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-cream text-lg"
                  >
                    <span aria-hidden="true" draggable={false}>
                      🔊
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          {step === "menu" ? (
            <div className="mt-4 flex flex-col gap-3">
              <LanguageBadge
                lang={answerLang}
                label={cue[answerLang].menu}
                speech={speech}
                spoken={menuText}
                helper={helper}
              />
              <LanguageBadge lang={otherLang} label={cue[otherLang].menu} speech={speech} spoken={otherMenuText} />
            </div>
          ) : null}
        </>
      ) : null}

      {step === "done" ? null : (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-white/95 px-4 py-3 shadow-[0_-4px_0_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex w-full max-w-xl flex-col">
            {hint && step === "menu" ? (
              <p role="status" className="mb-3 rounded-2xl bg-sun px-4 py-3 text-lg font-bold leading-snug">
                {hint === "short" ? t.restaurantHintShort : t.restaurantHintTreats}
              </p>
            ) : null}
            {step === "name" ? (
              <button
                type="button"
                disabled={!nameId}
                onClick={() => {
                  sound.play("button");
                  setStep("menu");
                }}
                className="btn-3d btn-leaf w-full bg-leaf py-4 text-xl text-white disabled:bg-slate-300 disabled:opacity-70"
              >
                {t.continue}
              </button>
            ) : null}
            {step === "menu" ? (
              <button type="button" onClick={checkMenu} className="btn-3d btn-leaf w-full bg-leaf py-4 text-xl text-white">
                {t.check}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
