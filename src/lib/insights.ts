import type { LifeAppStateV1 } from "../types";
import { addDays, todayISO, daysBetween } from "./dates";
import { getSleepHours } from "./deriveChecks";

export type Insight = {
  id: string;
  title: string;
  description: string;
  type: "positive" | "warning" | "info";
  module: string;
};

function negativeWorkoutFeedback(e: { fb?: { tags?: string[]; note?: string } }): boolean {
  const t = `${(e.fb?.tags || []).join(" ")} ${e.fb?.note || ""}`;
  return /😓|😴|💤|Pesado|Sem energia|Desconforto/i.test(t);
}

export function generateInsights(life: LifeAppStateV1, treinoLog: unknown[] | undefined): Insight[] {
  const out: Insight[] = [];
  const t = todayISO();

  const daysSober = Math.max(0, daysBetween(life.tabagismo.quitStartDate, t));
  const pack = life.tabagismo.packPrice;
  const cigs = life.tabagismo.cigarettesPerDay;
  const saved = daysSober * cigs * (pack / 20);
  out.push({
    id: "tab-save",
    title: `~R$ ${saved.toFixed(0)} não gastos em maços`,
    description: `${daysSober} dia(s) na tentativa atual.`,
    type: "positive",
    module: "tabagismo",
  });

  const log = (treinoLog || []) as { date?: string; type?: string; fb?: { tags?: string[]; note?: string } }[];
  let badSleepWorkout = 0;
  let badSleepNeg = 0;
  for (let i = 0; i < 21; i++) {
    const d = addDays(t, -i);
    const h = getSleepHours(life, d);
    if (h == null || h >= 6) continue;
    const w = log.find((e) => e.date === d && (e.type === "workout" || e.type === "quick"));
    if (!w) continue;
    badSleepWorkout++;
    if (negativeWorkoutFeedback(w)) badSleepNeg++;
  }
  if (badSleepWorkout >= 2 && badSleepNeg / badSleepWorkout >= 0.5) {
    out.push({
      id: "sleep-wo",
      title: "Sono e treino",
      description: `Em dias com menos de 6h de sono, ${Math.round((badSleepNeg / badSleepWorkout) * 100)}% dos treinos tiveram feedback mais pesado.`,
      type: "warning",
      module: "sono",
    });
  }

  const streak80 = (() => {
    let s = 0;
    let d = t;
    for (let i = 0; i < 60; i++) {
      const sc = life.dailyScoreByDate[d];
      if (sc == null || sc < 80) break;
      s++;
      d = addDays(d, -1);
    }
    return s;
  })();
  if (streak80 >= 7) {
    out.push({
      id: "score-streak",
      title: "🔥 7+ dias com score ≥80%",
      description: "Consistência forte nos hábitos rastreados.",
      type: "positive",
      module: "geral",
    });
  }

  const glutenTags = ["Glúten", "gluten"];
  let glutenDays = 0;
  let gutBadNext = 0;
  for (let i = 1; i < 21; i++) {
    const prev = addDays(t, -i);
    const day = addDays(prev, 1);
    const meals = life.alimentacao.meals[prev];
    if (!meals) continue;
    const ateGluten = Object.values(meals).some((m) => m?.brokenTags?.some((x) => glutenTags.some((g) => x.includes(g))));
    if (!ateGluten) continue;
    glutenDays++;
    if (life.quickChecks[day]?.gut_ok === false) gutBadNext++;
  }
  if (glutenDays >= 3 && gutBadNext / glutenDays >= 0.4) {
    out.push({
      id: "gluten-gut",
      title: "Glúten e intestino",
      description: "Em vários dias após glúten, o check “intestino ok” foi marcado como não.",
      type: "warning",
      module: "alimentacao",
    });
  }

  return out.slice(0, 8);
}
