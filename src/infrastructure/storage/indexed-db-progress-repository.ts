import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ProgressRepository } from "@/application/ports";
import { freshProfile, normalizeProfile, type LessonProgress, type Profile } from "@/domain/progress";
import { localISODate } from "@/infrastructure/clock";

interface MarketDB extends DBSchema {
  profile: {
    key: string;
    value: Profile;
  };
  lessons: {
    key: string;
    value: LessonProgress;
  };
}

const PROFILE_KEY = "main";

export class IndexedDbProgressRepository implements ProgressRepository {
  private connection: Promise<IDBPDatabase<MarketDB>> | null = null;

  constructor(
    private readonly databaseName = "pipos-market",
    private readonly today: () => string = localISODate,
  ) {}

  private database(): Promise<IDBPDatabase<MarketDB>> {
    if (!this.connection) {
      this.connection = openDB<MarketDB>(this.databaseName, 1, {
        upgrade(database) {
          if (!database.objectStoreNames.contains("profile")) {
            database.createObjectStore("profile");
          }
          if (!database.objectStoreNames.contains("lessons")) {
            database.createObjectStore("lessons", { keyPath: "lessonId" });
          }
        },
      }).catch((error: unknown) => {
        this.connection = null;
        throw error;
      });
    }
    return this.connection;
  }

  async getProfile(): Promise<Profile> {
    const database = await this.database();
    const stored = await database.get("profile", PROFILE_KEY);
    if (!stored) {
      const created = freshProfile(this.today());
      await database.put("profile", created, PROFILE_KEY);
      return created;
    }
    const normalized = normalizeProfile(stored, this.today());
    if (needsLevelMigration(stored, normalized)) {
      await database.put("profile", normalized, PROFILE_KEY);
    }
    return normalized;
  }

  async saveProfile(profile: Profile): Promise<void> {
    const database = await this.database();
    await database.put("profile", normalizeProfile(profile, this.today()), PROFILE_KEY);
  }

  async getLessonProgress(): Promise<LessonProgress[]> {
    const database = await this.database();
    return database.getAll("lessons");
  }

  async saveLessonProgress(progress: LessonProgress): Promise<void> {
    const database = await this.database();
    await database.put("lessons", progress);
  }

  async reset(): Promise<void> {
    const database = await this.database();
    await database.clear("lessons");
    await database.put("profile", freshProfile(this.today()), PROFILE_KEY);
  }

  async close(): Promise<void> {
    const database = await this.database();
    database.close();
    this.connection = null;
  }
}

function needsLevelMigration(stored: Profile, normalized: Profile): boolean {
  return (
    stored.sound !== normalized.sound ||
    stored.effectsVolume !== normalized.effectsVolume ||
    stored.voiceVolume !== normalized.voiceVolume ||
    stored.voiceSpeed !== normalized.voiceSpeed ||
    stored.letterTracing !== normalized.letterTracing
  );
}
