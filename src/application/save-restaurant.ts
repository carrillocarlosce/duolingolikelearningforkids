import type { ProgressRepository } from "@/application/ports";
import { withRestaurant, type Profile } from "@/domain/progress";
import { menuVerdict } from "@/domain/restaurant";

/** Remember a healthy menu. A short menu or too many treats is left unsaved. */
export async function saveRestaurant(
  repo: ProgressRepository,
  profile: Profile,
  plan: { nameItemId: string; menuIds: readonly string[] },
): Promise<Profile> {
  if (menuVerdict(plan.menuIds) !== "healthy") return profile;
  const next = withRestaurant(profile, plan);
  if (!next.restaurant) return profile;
  await repo.saveProfile(next);
  return next;
}
