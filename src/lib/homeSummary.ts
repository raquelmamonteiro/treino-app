import type { LifeAppStateV1 } from "../types";
import { addDays, mondayThisWeekISO } from "./dates";
import { deriveFoodOk, getSleepHours } from "./deriveChecks";
import { totalDespesasMes } from "./financasStats";
import { horasEstudoMes } from "./estudoStats";

function avgScoreRange(life: LifeAppStateV1, start: string, end: string): number | null {
  let sum = 0;
  let n = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    const v = life.dailyScoreByDate[d];
    if (v != null) {
      sum += v;
      n++;
    }
    if (d === end) break;
    d = addDays(d, 1);
  }
  return n ? Math.round(sum / n) : null;
}

function countFoodOkDays(life: LifeAppStateV1, start: string, end: string): number {
  let c = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    if (deriveFoodOk(life, d)) c++;
    if (d === end) break;
    d = addDays(d, 1);
  }
  return c;
}

function countDaysInRange(start: string, end: string): number {
  return daysBetweenInclusive(start, end);
}

function daysBetweenInclusive(a: string, b: string): number {
  if (a > b) return 0;
  let n = 0;
  let d = a;
  for (let i = 0; i < 400; i++) {
    if (d > b) break;
    n++;
    if (d === b) break;
    d = addDays(d, 1);
  }
  return n;
}

function workoutsInRange(log: unknown[] | undefined, start: string, end: string): number {
  return (log || []).filter((e) => {
    if (!e || typeof e !== "object") return false;
    const x = e as { type?: string; date?: string };
    if (x.type !== "workout" && x.type !== "quick" && x.type !== "home") return false;
    const dt = x.date ? String(x.date) : "";
    return dt >= start && dt <= end;
  }).length;
}

function readingMinutesRange(life: LifeAppStateV1, start: string, end: string): number {
  let m = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    m += life.leitura.dailyMinutes[d] ?? 0;
    if (d === end) break;
    d = addDays(d, 1);
  }
  return m;
}

function smokeFreeDays(life: LifeAppStateV1, start: string, end: string): number {
  let c = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    if (life.quickChecks[d]?.no_smoke === true) c++;
    if (d === end) break;
    d = addDays(d, 1);
  }
  return c;
}

function skincareDays(life: LifeAppStateV1, start: string, end: string): number {
  let c = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    const v = life.beleza.log[d];
    if (v?.am || v?.pm) c++;
    if (d === end) break;
    d = addDays(d, 1);
  }
  return c;
}

function waterGoalDays(life: LifeAppStateV1, start: string, end: string): number {
  const meta = life.hidratacao.metaCopos;
  let c = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    if ((life.hidratacao.coposByDate[d] ?? 0) >= meta) c++;
    if (d === end) break;
    d = addDays(d, 1);
  }
  return c;
}

function visionBoardDays(life: LifeAppStateV1, start: string, end: string): number {
  let c = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    if (life.quickChecks[d]?.vision_board === true || life.visionBoard.viewLog[d] === true) c++;
    if (d === end) break;
    d = addDays(d, 1);
  }
  return c;
}

function avgSleepRange(life: LifeAppStateV1, start: string, end: string): number | null {
  let sum = 0;
  let n = 0;
  let d = start;
  for (let i = 0; i < 400; i++) {
    if (d > end) break;
    const h = getSleepHours(life, d);
    if (h != null) {
      sum += h;
      n++;
    }
    if (d === end) break;
    d = addDays(d, 1);
  }
  return n ? Math.round((sum / n) * 10) / 10 : null;
}

export type PeriodSummary = {
  label: string;
  start: string;
  end: string;
  dayCount: number;
  avgScore: number | null;
  workouts: number;
  healthyDays: number;
  smokeFreeDays: number;
  readingMinutes: number;
  skincareDays: number;
  waterGoalDays: number;
  visionBoardDays: number;
  avgSleep: number | null;
  totalExpenses: number;
  studyHours: number;
};

export function buildThisWeekSummary(life: LifeAppStateV1, treinoLog: unknown[] | undefined, today: string): PeriodSummary {
  const mon = mondayThisWeekISO();
  const sun = addDays(mon, 6);
  const end = today < sun ? today : sun;
  const dayCount = countDaysInRange(mon, end);
  return {
    label: "Esta semana",
    start: mon,
    end,
    dayCount,
    avgScore: avgScoreRange(life, mon, end),
    workouts: workoutsInRange(treinoLog, mon, end),
    healthyDays: countFoodOkDays(life, mon, end),
    smokeFreeDays: smokeFreeDays(life, mon, end),
    readingMinutes: readingMinutesRange(life, mon, end),
    skincareDays: skincareDays(life, mon, end),
    waterGoalDays: waterGoalDays(life, mon, end),
    visionBoardDays: visionBoardDays(life, mon, end),
    avgSleep: avgSleepRange(life, mon, end),
    totalExpenses: expensesRange(life, mon, end),
    studyHours: studyHoursRange(life.estudo.sessoes, mon, end),
  };
}

function studyHoursRange(sessoes: { date: string; horas: number }[], start: string, end: string): number {
  return sessoes.filter((s) => s.date >= start && s.date <= end).reduce((a, s) => a + s.horas, 0);
}

function expensesRange(life: LifeAppStateV1, start: string, end: string): number {
  return life.financas.despesas
    .filter((d) => d.date >= start && d.date <= end)
    .reduce((a, d) => a + d.amount, 0);
}

export function buildPreviousWeekSummary(life: LifeAppStateV1, treinoLog: unknown[] | undefined, today: string): PeriodSummary {
  const mon = mondayThisWeekISO();
  const prevMon = addDays(mon, -7);
  const prevSun = addDays(prevMon, 6);
  return {
    label: "Semana anterior",
    start: prevMon,
    end: prevSun,
    dayCount: 7,
    avgScore: avgScoreRange(life, prevMon, prevSun),
    workouts: workoutsInRange(treinoLog, prevMon, prevSun),
    healthyDays: countFoodOkDays(life, prevMon, prevSun),
    smokeFreeDays: smokeFreeDays(life, prevMon, prevSun),
    readingMinutes: readingMinutesRange(life, prevMon, prevSun),
    skincareDays: skincareDays(life, prevMon, prevSun),
    waterGoalDays: waterGoalDays(life, prevMon, prevSun),
    visionBoardDays: visionBoardDays(life, prevMon, prevSun),
    avgSleep: avgSleepRange(life, prevMon, prevSun),
    totalExpenses: expensesRange(life, prevMon, prevSun),
    studyHours: studyHoursRange(life.estudo.sessoes, prevMon, prevSun),
  };
}

export function buildMonthSummary(life: LifeAppStateV1, treinoLog: unknown[] | undefined, ym: string, today: string): PeriodSummary {
  const [y, m] = ym.split("-").map(Number);
  const first = `${ym}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${ym}-${String(lastDay).padStart(2, "0")}`;
  const end = today < last && ym === today.slice(0, 7) ? today : last;
  const dayCount = countDaysInRange(first, end);
  return {
    label: ym,
    start: first,
    end,
    dayCount,
    avgScore: avgScoreRange(life, first, end),
    workouts: workoutsInRange(treinoLog, first, end),
    healthyDays: countFoodOkDays(life, first, end),
    smokeFreeDays: smokeFreeDays(life, first, end),
    readingMinutes: readingMinutesRange(life, first, end),
    skincareDays: skincareDays(life, first, end),
    waterGoalDays: waterGoalDays(life, first, end),
    visionBoardDays: visionBoardDays(life, first, end),
    avgSleep: avgSleepRange(life, first, end),
    totalExpenses: totalDespesasMes(life.financas.despesas, ym),
    studyHours: horasEstudoMes(life.estudo.sessoes, ym),
  };
}

export function prevMonthYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function worstDayInMonth(life: LifeAppStateV1, ym: string, today: string): { date: string; score: number } | null {
  let worst: { date: string; score: number } | null = null;
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const cap = ym === today.slice(0, 7) ? Math.min(lastDay, parseInt(today.slice(8), 10)) : lastDay;
  for (let dom = 1; dom <= cap; dom++) {
    const d = `${ym}-${String(dom).padStart(2, "0")}`;
    const s = life.dailyScoreByDate[d];
    if (s == null) continue;
    if (!worst || s < worst.score) worst = { date: d, score: s };
  }
  return worst;
}

export function bestWeekInMonth(life: LifeAppStateV1, ym: string, today: string): { label: string; avg: number } | null {
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const cap = ym === today.slice(0, 7) ? Math.min(lastDay, parseInt(today.slice(8), 10)) : lastDay;
  let best: { label: string; avg: number } | null = null;
  let weekStart = 1;
  while (weekStart <= cap) {
    const weekEnd = Math.min(weekStart + 6, cap);
    const start = `${ym}-${String(weekStart).padStart(2, "0")}`;
    const end = `${ym}-${String(weekEnd).padStart(2, "0")}`;
    const a = avgScoreRange(life, start, end);
    if (a != null && (!best || a > best.avg)) {
      best = { label: `${weekStart}–${weekEnd}`, avg: a };
    }
    weekStart += 7;
  }
  return best;
}
