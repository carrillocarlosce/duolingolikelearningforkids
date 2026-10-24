import type { Direction, Lang } from "@/domain/language";
import { MAX_HEARTS } from "@/domain/scoring";

export interface Profile {
  xp: number;
  hearts: number;
  streak: number;
  /** Last local day a lesson was finished, YYYY-MM-DD. */
  lastActiveDate: string | null;
  /** Local day the heart counter was last set, YYYY-MM-DD. */
  heartsDate: string | null;
  uiLang: Lang;
  sound: boolean;
  direction: Direction;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  bestStars: number;
  bestXp: number;
  timesCompleted: number;
}

export function freshProfile(today: string): Profile {
  return {
    xp: 0,
    hearts: MAX_HEARTS,
    streak: 0,
    lastActiveDate: null,
    heartsDate: today,
    uiLang: "es",
    sound: true,
    direction: "en",
  };
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
