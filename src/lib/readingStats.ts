import { addDays, todayISO } from "./dates";

/** Soma de minutos no mês YYYY-MM. */
export function totalReadingMinutesInMonth(dailyMinutes: Record<string, number>, ym: string): number {
  let sum = 0;
  for (const [d, m] of Object.entries(dailyMinutes)) {
    if (!d.startsWith(ym)) continue;
    const n = Number(m);
    if (Number.isFinite(n) && n > 0) sum += n;
  }
  return sum;
}

/** Dias seguidos com leitura (>0 min), permitindo hoje ainda vazio. */
export function readingStreak(dailyMinutes: Record<string, number>): number {
  let streak = 0;
  let d = todayISO();
  let first = true;
  for (let i = 0; i < 500; i++) {
    const min = dailyMinutes[d] ?? 0;
    if (min > 0) {
      streak++;
      d = addDays(d, -1);
      first = false;
    } else if (first) {
      first = false;
      d = addDays(todayISO(), -1);
    } else {
      break;
    }
  }
  return streak;
}
