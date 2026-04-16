import type { AlimentacaoState, MealSlot } from "../types";
import { addDays } from "./dates";

const SLOTS: MealSlot[] = ["cafe", "lanche_am", "almoco", "lanche_pm", "jantar", "ceia"];

function hasGluten(meals: AlimentacaoState["meals"][string] | undefined): boolean {
  if (!meals) return false;
  return Object.values(meals).some((m) => m?.brokenTags?.some((t) => /glúten|gluten/i.test(t)));
}

function hasSugar(meals: AlimentacaoState["meals"][string] | undefined): boolean {
  if (!meals) return false;
  return Object.values(meals).some((m) => m?.brokenTags?.some((t) => /açúcar|acucar/i.test(t)));
}

function hasAlcohol(meals: AlimentacaoState["meals"][string] | undefined): boolean {
  if (!meals) return false;
  return Object.values(meals).some((m) => m?.brokenTags?.some((t) => /álcool|alcool/i.test(t)));
}

/** Dias seguidos (até hoje) sem a tag na refeição — pára se o dia não tiver nenhuma refeição registada. */
export function streakClean(
  meals: AlimentacaoState["meals"],
  today: string,
  kind: "gluten" | "sugar" | "alcohol",
): number {
  const fn = kind === "gluten" ? hasGluten : kind === "sugar" ? hasSugar : hasAlcohol;
  let s = 0;
  let d = today;
  for (let i = 0; i < 500; i++) {
    const day = meals[d];
    const anyReg = day && SLOTS.some((slot) => day[slot]?.score || day[slot]?.jejum);
    if (!anyReg) break;
    if (fn(day)) break;
    s++;
    d = addDays(d, -1);
  }
  return s;
}
