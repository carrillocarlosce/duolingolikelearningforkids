import type { Lang } from "@/domain/language";

export const copy = {
  es: {
    unitLabel: "Unidad 7",
    hello: "¡Hola! Vamos al mercado",
    challenge:
      "James necesita un nombre para el restaurante de su mamá y un menú rico y saludable.",
    pathLabel: "Camino de lecciones",
    startHere: "Empieza aquí",
    done: "Lista",
    locked: "Cerrada",
    close: "Cerrar",
    inThisLesson: "En esta lección",
    lockedNote: "Puedes mirar de qué se trata. Se abre cuando terminas la lección anterior.",
    currentNote: "Esta es tu lección de ahora.",
    doneNote: "Ya terminaste esta lección. Puedes volver a mirarla.",
    loading: "Pipo está abriendo el mercado…",
  },
  en: {
    unitLabel: "Unit 7",
    hello: "Hi! Let's go to the market",
    challenge:
      "James needs a new name for his mom's restaurant and a yummy, healthy menu.",
    pathLabel: "Lesson path",
    startHere: "Start here",
    done: "Done",
    locked: "Locked",
    close: "Close",
    inThisLesson: "In this lesson",
    lockedNote: "You can peek. It opens when you finish the lesson before it.",
    currentNote: "This is your lesson right now.",
    doneNote: "You finished this lesson. You can look again.",
    loading: "Pipo is opening the market…",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type Copy = (typeof copy)[Lang];
