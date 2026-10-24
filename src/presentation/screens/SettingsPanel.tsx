"use client";

import { useEffect } from "react";
import type { AudioLevels } from "@/domain/audio-settings";
import type { LetterTracingMode } from "@/domain/letter-tracing";
import type { Copy } from "@/presentation/i18n";

type SettingsPanelProps = {
  levels: AudioLevels;
  letterTracing: LetterTracingMode;
  tracingOn: boolean;
  t: Copy;
  onChange: (patch: Partial<AudioLevels>) => void;
  onLetterTracing: (mode: "on" | "off") => void;
  onTestEffects: () => void;
  onTestVoice: () => void;
  onClose: () => void;
};

export function SettingsPanel({
  levels,
  letterTracing,
  tracingOn,
  t,
  onChange,
  onLetterTracing,
  onTestEffects,
  onTestVoice,
  onClose,
}: SettingsPanelProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const speedLabel =
    Math.abs(levels.voiceSpeed - 1) < 0.001 ? t.speedNormal : `${levels.voiceSpeed.toFixed(2)}×`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="max-h-[100dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white px-5 pt-5 pb-8 shadow-[0_-8px_0_rgba(0,0,0,0.05)] sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky">{t.settingsForParents}</p>
            <h2 id="settings-title" className="text-3xl font-bold">
              {t.settings}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-cream text-2xl font-bold"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <button
          type="button"
          aria-pressed={levels.sound}
          onClick={() => onChange({ sound: !levels.sound })}
          className={[
            "btn-3d mt-5 min-h-16 w-full px-4 py-4 text-xl",
            levels.sound ? "btn-leaf bg-leaf text-white" : "btn-soft bg-white text-ink",
          ].join(" ")}
        >
          {levels.sound ? `🔊 ${t.soundOn}` : `🔇 ${t.soundOff}`}
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={tracingOn}
          onClick={() => onLetterTracing(tracingOn ? "off" : "on")}
          className={[
            "btn-3d mt-3 min-h-16 w-full px-4 py-4 text-xl",
            tracingOn ? "btn-leaf bg-leaf text-white" : "btn-soft bg-white text-ink",
          ].join(" ")}
        >
          {`✏️ ${t.letterTracing}: ${tracingOn ? t.letterTracingOn : t.letterTracingOff}`}
        </button>
        <p className="mt-2 text-base font-semibold text-ink/70">
          {letterTracing === "auto" ? t.letterTracingAuto : t.letterTracingHint}
        </p>

        <SliderRow
          id="effects-volume"
          label={t.effectsVolume}
          valueLabel={`${Math.round(levels.effectsVolume * 100)}%`}
          min={0}
          max={1}
          step={0.05}
          value={levels.effectsVolume}
          testLabel={t.trySound}
          onChange={(effectsVolume) => onChange({ effectsVolume })}
          onTest={onTestEffects}
        />
        <SliderRow
          id="voice-volume"
          label={t.voiceVolume}
          valueLabel={`${Math.round(levels.voiceVolume * 100)}%`}
          min={0}
          max={1}
          step={0.05}
          value={levels.voiceVolume}
          testLabel={t.trySound}
          onChange={(voiceVolume) => onChange({ voiceVolume })}
          onTest={onTestVoice}
        />
        <SliderRow
          id="voice-speed"
          label={t.voiceSpeed}
          valueLabel={speedLabel}
          min={0.8}
          max={1.2}
          step={0.05}
          value={levels.voiceSpeed}
          minCaption={t.speedSlower}
          maxCaption={t.speedFaster}
          testLabel={t.trySound}
          onChange={(voiceSpeed) => onChange({ voiceSpeed })}
          onTest={onTestVoice}
        />
      </div>
    </div>
  );
}

function SliderRow({
  id,
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  minCaption,
  maxCaption,
  testLabel,
  onChange,
  onTest,
}: {
  id: string;
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  minCaption?: string;
  maxCaption?: string;
  testLabel: string;
  onChange: (value: number) => void;
  onTest: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-xl font-bold">
          {label}
        </label>
        <p className="text-2xl font-bold text-leaf-dark">{valueLabel}</p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input
          id={id}
          className="setting-slider min-w-0 flex-1"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={valueLabel}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <button
          type="button"
          onClick={onTest}
          className="btn-3d btn-sky min-h-14 shrink-0 bg-sky px-4 text-lg text-white"
        >
          {testLabel}
        </button>
      </div>
      {minCaption && maxCaption ? (
        <div className="mt-1 flex justify-between text-sm font-bold text-ink/60">
          <span>{minCaption}</span>
          <span>{maxCaption}</span>
        </div>
      ) : null}
    </div>
  );
}
