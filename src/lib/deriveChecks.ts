import type { LifeAppStateV1, MealScore, MealSlot } from "../types";
import { computeSleepHoursNight } from "./sleepMath";

const MEALS: MealSlot[] = ["cafe", "lanche_am", "almoco", "lanche_pm", "jantar", "ceia"];

function slotMealRegistered(entry: { score?: MealScore; jejum?: boolean } | undefined): boolean {
  return !!(entry?.jejum || entry?.score);
}

export function deriveFoodOk(life: LifeAppStateV1, today: string): boolean {
  const m = life.alimentacao.meals[today];
  if (!m) return false;
  const registered = MEALS.filter((s) => slotMealRegistered(m[s]));
  if (registered.length < 4) return false;
  return registered.every((s) => {
    const e = m[s]!;
    if (e.jejum) return true;
    if (!e.score) return false;
    return e.score === "saudavel" || e.score === "media";
  });
}

export function deriveSupplementsOk(life: LifeAppStateV1, today: string): boolean {
  const list = life.alimentacao.supplementsList;
  if (!list.length) return false;
  const ch = life.alimentacao.supplementChecks[today] || {};
  return list.every((s) => ch[s.id] === true);
}

export function deriveSkincareAm(life: LifeAppStateV1, today: string): boolean {
  return !!life.beleza.log[today]?.am;
}

export function deriveSkincarePm(life: LifeAppStateV1, today: string): boolean {
  return !!life.beleza.log[today]?.pm;
}

export function deriveReading(life: LifeAppStateV1, today: string): boolean {
  return (life.leitura.dailyMinutes[today] ?? 0) > 0;
}

export function deriveWorkout(treinoLog: unknown[] | undefined, today: string): boolean {
  return (treinoLog || []).some((e: unknown) => {
    if (!e || typeof e !== "object") return false;
    const x = e as { date?: string; type?: string };
    return x.date === today && (x.type === "workout" || x.type === "quick" || x.type === "home");
  });
}

export function deriveWaterOk(life: LifeAppStateV1, today: string): boolean {
  const n = life.hidratacao.coposByDate[today] ?? 0;
  return n >= life.hidratacao.metaCopos;
}

export function getSleepHours(life: LifeAppStateV1, today: string): number | null {
  const L = life.sono.log[today];
  if (!L) return null;
  if (L.wearableHours != null && L.wearableHours > 0) return L.wearableHours;
  if (L.sleepHour != null && L.wakeHour != null) {
    const h = computeSleepHoursNight(today, L.sleepHour, L.wakeHour);
    return h > 0 ? h : L.hoursComputed ?? null;
  }
  return L.hoursComputed ?? null;
}

export function deriveSleep7h(life: LifeAppStateV1, today: string): boolean {
  const h = getSleepHours(life, today);
  return h != null && h >= 7;
}

/** `no_smoke` e `gut_ok`: toggles diretos na home (default não marcado = sem pontos). */
export function deriveNoSmoke(life: LifeAppStateV1, today: string): boolean {
  return life.quickChecks[today]?.no_smoke === true;
}

export function deriveGutOk(life: LifeAppStateV1, today: string): boolean {
  return life.quickChecks[today]?.gut_ok === true;
}

export function deriveVisionBoard(life: LifeAppStateV1, today: string): boolean {
  return life.quickChecks[today]?.vision_board === true || life.visionBoard.viewLog[today] === true;
}

function dayHasGlutenBreak(life: LifeAppStateV1, day: string): boolean {
  const m = life.alimentacao.meals[day];
  if (!m) return false;
  return Object.values(m).some((e) => e?.brokenTags?.some((t) => /glúten|gluten/i.test(t)));
}

function dayHasSugarBreak(life: LifeAppStateV1, day: string): boolean {
  const m = life.alimentacao.meals[day];
  if (!m) return false;
  return Object.values(m).some((e) => e?.brokenTags?.some((t) => /açúcar|acucar/i.test(t)));
}

/** Pelo menos uma refeição registada e nenhuma com glúten marcado. */
export function deriveNoGluten(life: LifeAppStateV1, today: string): boolean {
  const m = life.alimentacao.meals[today];
  if (!m || !MEALS.some((s) => slotMealRegistered(m[s]))) return false;
  return !dayHasGlutenBreak(life, today);
}

/** Pelo menos uma refeição registada e nenhuma com açúcar marcado. */
export function deriveNoSugar(life: LifeAppStateV1, today: string): boolean {
  const m = life.alimentacao.meals[today];
  if (!m || !MEALS.some((s) => slotMealRegistered(m[s]))) return false;
  return !dayHasSugarBreak(life, today);
}
