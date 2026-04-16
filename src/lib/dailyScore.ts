import type { LifeAppStateV1, ScoreCheckKey } from "../types";
import { addDays } from "./dates";
import {
  deriveFoodOk,
  deriveGutOk,
  deriveNoGluten,
  deriveNoSmoke,
  deriveNoSugar,
  deriveReading,
  deriveSkincareAm,
  deriveSkincarePm,
  deriveSupplementsOk,
  deriveSleep7h,
  deriveVisionBoard,
  deriveWaterOk,
  deriveWorkout,
} from "./deriveChecks";

/** Total = 100 pontos. */
export const SCORE_ITEMS: { key: ScoreCheckKey; label: string; points: number }[] = [
  { key: "no_smoke", label: "Não fumou", points: 20 },
  { key: "workout", label: "Treinou", points: 15 },
  { key: "food_ok", label: "Alimentação", points: 13 },
  { key: "skincare_am", label: "SC manhã", points: 5 },
  { key: "skincare_pm", label: "SC noite", points: 5 },
  { key: "water", label: "Água (meta)", points: 8 },
  { key: "supplements", label: "Suplementos", points: 5 },
  { key: "reading", label: "Leitura", points: 8 },
  { key: "sleep_7h", label: "Sono 7h+", points: 8 },
  { key: "gut_ok", label: "Intestino", points: 3 },
  { key: "vision_board", label: "Vision Board", points: 5 },
  { key: "no_gluten", label: "Sem glúten", points: 3 },
  { key: "no_sugar", label: "Sem açúcar", points: 2 },
];

export type ScoreLine = { key: ScoreCheckKey; label: string; points: number; ok: boolean };

export function computeDailyScore(
  life: LifeAppStateV1,
  treinoLog: unknown[] | undefined,
  today: string,
): { total: number; max: number; lines: ScoreLine[] } {
  const checks: Record<ScoreCheckKey, boolean> = {
    no_smoke: deriveNoSmoke(life, today),
    workout: deriveWorkout(treinoLog, today),
    food_ok: deriveFoodOk(life, today),
    skincare_am: deriveSkincareAm(life, today),
    skincare_pm: deriveSkincarePm(life, today),
    water: deriveWaterOk(life, today),
    supplements: deriveSupplementsOk(life, today),
    reading: deriveReading(life, today),
    sleep_7h: deriveSleep7h(life, today),
    gut_ok: deriveGutOk(life, today),
    vision_board: deriveVisionBoard(life, today),
    no_gluten: deriveNoGluten(life, today),
    no_sugar: deriveNoSugar(life, today),
  };

  let total = 0;
  const max = SCORE_ITEMS.reduce((a, x) => a + x.points, 0);
  const lines: ScoreLine[] = SCORE_ITEMS.map((row) => {
    const ok = checks[row.key];
    if (ok) total += row.points;
    return { key: row.key, label: row.label, points: row.points, ok };
  });

  return { total, max, lines };
}

export function scoreRingColor(pct: number): string {
  if (pct >= 90) return "#a78bfa";
  if (pct > 70) return "#22c55e";
  if (pct > 40) return "#eab308";
  return "#ef4444";
}

export function scoreStreakOver80(life: LifeAppStateV1, today: string): number {
  let streak = 0;
  let d = today;
  for (let i = 0; i < 400; i++) {
    const s = life.dailyScoreByDate[d];
    if (s == null || s < 80) break;
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}
