import "fake-indexeddb/auto";
import { openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { recordLessonResult } from "@/application/record-lesson-result";
import { saveRestaurant } from "@/application/save-restaurant";
import { vocabulary } from "@/domain/content/vocabulary";
import { freshProfile, normalizeProfile, withRestaurant } from "@/domain/progress";
import {
  foodRole,
  menuSentence,
  menuVerdict,
  readRestaurant,
  restaurantAnswerLang,
  restaurantName,
  restaurantStorageMatches,
} from "@/domain/restaurant";
import { IndexedDbProgressRepository } from "@/infrastructure/storage/indexed-db-progress-repository";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";

const names: string[] = [];

describe("restaurant menu", () => {
  it("sorts every Unit 7 food into healthy, treat, or everyday", () => {
    const ids = (role: "healthy" | "treat" | "everyday") =>
      vocabulary.filter((item) => foodRole(item.id) === role).map((item) => item.id);
    expect(ids("healthy")).toEqual(["apple", "milk", "grapes", "salad", "fruit", "orange", "chicken"]);
    expect(ids("treat")).toEqual(["cake", "ice-cream", "hamburger", "cookies", "hot-dog"]);
    expect(ids("everyday")).toEqual(["juice", "pizza", "pasta", "sandwich"]);
  });

  it("accepts two healthy foods and at most one treat", () => {
    expect(menuVerdict(["apple", "milk"])).toBe("short");
    expect(menuVerdict(["apple", "apple", "milk"])).toBe("short");
    expect(menuVerdict(["nope", "apple", "milk"])).toBe("short");
    expect(menuVerdict(["apple", "milk", "salad"])).toBe("healthy");
    expect(menuVerdict(["apple", "milk", "cake"])).toBe("healthy");
    expect(menuVerdict(["salad", "chicken", "hot-dog"])).toBe("healthy");
    expect(menuVerdict(["apple", "juice", "milk"])).toBe("healthy");
    expect(menuVerdict(["apple", "cake", "pizza"])).toBe("too-many-treats");
    expect(menuVerdict(["cake", "cookies", "apple"])).toBe("too-many-treats");
    expect(menuVerdict(["pizza", "sandwich", "pasta"])).toBe("too-many-treats");
  });

  it("names the restaurant in the practice language and lists the menu", () => {
    const apple = vocabulary.find((item) => item.id === "apple");
    const iceCream = vocabulary.find((item) => item.id === "ice-cream");
    const sandwich = vocabulary.find((item) => item.id === "sandwich");
    const hotDog = vocabulary.find((item) => item.id === "hot-dog");
    if (!apple || !iceCream || !sandwich || !hotDog) throw new Error("missing food");

    expect(restaurantName(apple, "en")).toBe("My restaurant is called Apple");
    expect(restaurantName(apple, "es")).toBe("Mi restaurante se llama Manzana");
    expect(restaurantName(iceCream, "en")).toBe("My restaurant is called Ice Cream");
    expect(restaurantName(sandwich, "es")).toBe("Mi restaurante se llama Sándwich");
    expect(restaurantName(hotDog, "en")).toBe("My restaurant is called Hot Dog");

    expect(menuSentence(["apple", "milk", "salad"], "en")).toBe("The menu has apple, milk, and salad");
    expect(menuSentence(["apple", "milk", "salad"], "es")).toBe("El menú tiene manzana, leche y ensalada");
    expect(menuSentence(["ice-cream", "apple"], "en")).toBe("The menu has ice cream and apple");
  });

  it("follows the same answer language as the lesson direction", () => {
    expect(restaurantAnswerLang("en")).toBe("en");
    expect(restaurantAnswerLang("es-en")).toBe("en");
    expect(restaurantAnswerLang("es")).toBe("es");
    expect(restaurantAnswerLang("en-es")).toBe("es");
  });

  it("keeps a healthy plan and drops a menu that is not", () => {
    const healthy = { nameItemId: "apple", menuIds: ["apple", "milk", "salad"] };
    expect(readRestaurant(healthy)).toEqual(healthy);
    expect(readRestaurant({ nameItemId: "cake", menuIds: ["cake", "cookies", "ice-cream"] })).toBeNull();
    expect(readRestaurant({ nameItemId: "missing", menuIds: ["apple", "milk", "salad"] })).toBeNull();
    expect(readRestaurant(undefined)).toBeNull();

    const profile = freshProfile("2026-10-24");
    expect(normalizeProfile({ xp: 4 }, "2026-10-24").restaurant).toBeNull();
    expect(withRestaurant(profile, healthy).restaurant).toEqual(healthy);
    expect(withRestaurant(profile, { nameItemId: "cake", menuIds: ["cake", "cookies", "ice-cream"] }).restaurant).toBeNull();
    expect(restaurantStorageMatches(undefined, null)).toBe(true);
    expect(restaurantStorageMatches({ nameItemId: "cake", menuIds: ["cake"] }, null)).toBe(false);
    expect(restaurantStorageMatches(healthy, healthy)).toBe(true);
  });
});

describe("saved restaurant", () => {
  afterEach(async () => {
    await Promise.all(names.splice(0).map((name) => indexedDB.deleteDatabase(name)));
  });

  it("stores the menu without spending hearts, and a lesson keeps it", async () => {
    const repo = new MemoryProgressRepository(freshProfile("2026-10-24"));
    const profile = { ...(await repo.getProfile()), hearts: 4, xp: 12, streak: 2 };
    await repo.saveProfile(profile);

    const rejected = await saveRestaurant(repo, profile, {
      nameItemId: "cake",
      menuIds: ["cake", "cookies", "ice-cream"],
    });
    expect(rejected.restaurant).toBeNull();
    expect(rejected.hearts).toBe(4);
    expect((await repo.getProfile()).restaurant).toBeNull();

    const saved = await saveRestaurant(repo, profile, {
      nameItemId: "orange",
      menuIds: ["orange", "salad", "hamburger"],
    });
    expect(saved.restaurant).toEqual({
      nameItemId: "orange",
      menuIds: ["orange", "salad", "hamburger"],
    });
    expect(saved.hearts).toBe(4);
    expect(saved.xp).toBe(12);
    expect(saved.streak).toBe(2);

    const finished = await recordLessonResult(repo, {
      lessonId: "sweet-treats",
      xpAwarded: 10,
      attemptXp: 10,
      stars: 3,
      today: "2026-10-24",
    });
    expect(finished.profile.restaurant).toEqual(saved.restaurant);
    expect(finished.profile.hearts).toBe(5);
  });

  it("remembers the menu in IndexedDB and drops one that is not healthy", async () => {
    const name = `pipos-restaurant-${crypto.randomUUID()}`;
    names.push(name);
    const today = "2026-10-24";
    const repo = new IndexedDbProgressRepository(name, () => today);
    await repo.getProfile();
    await repo.close();

    const database = await openDB(name, 1);
    const base = {
      xp: 3,
      hearts: 5,
      streak: 0,
      lastActiveDate: null,
      heartsDate: today,
      uiLang: "es",
      sound: true,
      direction: "es",
      letterTracing: "auto",
    };
    await database.put(
      "profile",
      {
        ...base,
        restaurant: { nameItemId: "apple", menuIds: ["apple", "milk", "chicken"] },
      },
      "main",
    );
    database.close();

    const reopened = new IndexedDbProgressRepository(name, () => today);
    const kept = await reopened.getProfile();
    expect(kept.restaurant).toEqual({
      nameItemId: "apple",
      menuIds: ["apple", "milk", "chicken"],
    });
    expect(kept.direction).toBe("es");
    await reopened.close();

    const again = await openDB(name, 1);
    await again.put(
      "profile",
      {
        ...base,
        xp: 9,
        restaurant: { nameItemId: "cake", menuIds: ["cake", "cookies", "ice-cream"] },
      },
      "main",
    );
    again.close();

    const cleaned = new IndexedDbProgressRepository(name, () => today);
    const dropped = await cleaned.getProfile();
    expect(dropped.restaurant).toBeNull();
    expect(dropped.xp).toBe(9);
    await cleaned.close();

    const reread = new IndexedDbProgressRepository(name, () => today);
    expect((await reread.getProfile()).restaurant).toBeNull();
    await reread.close();
  });
});
