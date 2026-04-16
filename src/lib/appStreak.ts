import type { QuickChecksDay } from "../types";
import { addDays, todayISO } from "./dates";

/** Dias seguidos com pelo menos um quick check marcado (hoje pode ainda estar vazio — continua a contar desde ontem). */
export function appUsageStreak(quickChecks: Record<string, QuickChecksDay>): number {
  let streak = 0;
  let d = todayISO();
  let first = true;
  for (let i = 0; i < 500; i++) {
    const day = quickChecks[d];
    const active = day && Object.values(day).some(Boolean);
    if (active) {
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
