import { readAudioLevels, type AudioLevels } from "@/domain/audio-settings";
import type { Direction, Lang } from "@/domain/language";
import { readLetterTracing, type LetterTracingMode } from "@/domain/letter-tracing";
import { readRestaurant, type RestaurantPlan } from "@/domain/restaurant";
import { MAX_HEARTS } from "@/domain/scoring";

export interface Profile extends AudioLevels {
  xp: number;
  hearts: number;
  streak: number;
  /** Last local day a lesson was finished, YYYY-MM-DD. */
  lastActiveDate: string | null;
  /** Local day the heart counter was last set, YYYY-MM-DD. */
  heartsDate: string | null;
  uiLang: Lang;
  direction: Direction;
  /** "auto" is off on a phone and on for a tablet or computer. */
  letterTracing: LetterTracingMode;
  /** Name and healthy menu for James's mom. Null until the child saves one. */
  restaurant: RestaurantPlan | null;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  bestStars: number;
  bestXp: number;
  timesCompleted: number;
}

const directions: readonly Direction[] = ["en", "es", "en-es", "es-en"];

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isDirection(value: unknown): value is Direction {
  return directions.includes(value as Direction);
}

export function freshProfile(today: string): Profile {
  return {
    xp: 0,
    hearts: MAX_HEARTS,
    streak: 0,
    lastActiveDate: null,
    heartsDate: today,
    uiLang: "es",
    direction: "en",
    letterTracing: "auto",
    restaurant: null,
    ...readAudioLevels({}),
  };
}

/**
 * Older tablets stored a profile before volume sliders existed.
 * Reading always returns levels inside the slider limits.
 */
export function normalizeProfile(input: unknown, today: string): Profile {
  const raw = input && typeof input === "object" ? (input as Partial<Profile>) : {};
  const base = freshProfile(today);
  const levels = readAudioLevels(raw);
  return {
    ...base,
    ...raw,
    xp: finiteOr(raw.xp, base.xp),
    hearts: finiteOr(raw.hearts, base.hearts),
    streak: finiteOr(raw.streak, base.streak),
    lastActiveDate: raw.lastActiveDate === undefined ? base.lastActiveDate : raw.lastActiveDate,
    heartsDate: raw.heartsDate === undefined ? base.heartsDate : raw.heartsDate,
    uiLang: raw.uiLang === "en" || raw.uiLang === "es" ? raw.uiLang : base.uiLang,
    direction: isDirection(raw.direction) ? raw.direction : base.direction,
    letterTracing: readLetterTracing(raw.letterTracing),
    ...levels,
    restaurant: readRestaurant(raw.restaurant),
  };
}

export function withRestaurant(
  profile: Profile,
  plan: { nameItemId: string; menuIds: readonly string[] } | null,
): Profile {
  if (plan === null) return { ...profile, restaurant: null };
  return { ...profile, restaurant: readRestaurant(plan) };
}

export function withAudioSettings(profile: Profile, patch: Partial<AudioLevels>): Profile {
  return normalizeProfile({ ...profile, ...patch }, profile.heartsDate ?? "1970-01-01");
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** A new local day refills hearts. The same day keeps whatever is left. */
export function rollHearts(profile: Profile, today: string): Profile {
  if (profile.heartsDate === today) return profile;
  return { ...profile, hearts: MAX_HEARTS, heartsDate: today };
}

/** Completing a lesson today continues the streak. A gap starts it over at 1. */
export function applyStreak(profile: Profile, today: string): Profile {
  if (profile.lastActiveDate === today) return profile;
  const continued = profile.lastActiveDate === addDays(today, -1);
  return {
    ...profile,
    streak: continued ? profile.streak + 1 : 1,
    lastActiveDate: today,
  };
}

export function completedLessonIds(progress: readonly LessonProgress[]): string[] {
  return progress.filter((item) => item.completed).map((item) => item.lessonId);
}
