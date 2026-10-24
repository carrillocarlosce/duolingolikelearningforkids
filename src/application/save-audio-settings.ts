import type { ProgressRepository } from "@/application/ports";
import type { AudioLevels } from "@/domain/audio-settings";
import { withAudioSettings, type Profile } from "@/domain/progress";

/** Clamp the sliders, remember them, and return the profile the screen should show. */
export async function saveAudioSettings(
  repo: ProgressRepository,
  profile: Profile,
  patch: Partial<AudioLevels>,
): Promise<Profile> {
  const next = withAudioSettings(profile, patch);
  await repo.saveProfile(next);
  return next;
}
