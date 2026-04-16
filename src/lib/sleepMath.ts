import { addDays } from "./dates";

/** Dormir entre 21h–3h (hora local), acordar 5h–10h no dia `today`. */
export function computeSleepHoursNight(today: string, sleepH: number, wakeH: number): number {
  const yesterday = addDays(today, -1);
  const sleepIso = sleepH >= 21 ? `${yesterday}T${String(sleepH).padStart(2, "0")}:00:00` : `${today}T${String(sleepH).padStart(2, "0")}:00:00`;
  const wakeIso = `${today}T${String(wakeH).padStart(2, "0")}:00:00`;
  const a = new Date(sleepIso).getTime();
  const b = new Date(wakeIso).getTime();
  const h = (b - a) / 3600000;
  return Math.max(0, Math.round(h * 10) / 10);
}
