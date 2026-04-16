import type { EstudoSessao } from "../types";
import { addDays, todayISO, mondayThisWeekISO } from "./dates";

/** Horas no mês YYYY-MM. */
export function horasEstudoMes(sessoes: EstudoSessao[], ym: string): number {
  return sessoes.filter((s) => s.date.startsWith(ym)).reduce((a, s) => a + s.horas, 0);
}

/** Horas desde segunda (SP) até hoje. */
export function horasEstudoSemanaAtual(sessoes: EstudoSessao[]): number {
  const start = mondayThisWeekISO();
  const t = todayISO();
  return sessoes.filter((s) => s.date >= start && s.date <= t).reduce((a, s) => a + s.horas, 0);
}

export function lastStudyDate(sessoes: EstudoSessao[]): string | null {
  if (!sessoes.length) return null;
  return [...sessoes].sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null;
}

export function studyStreak(sessoes: EstudoSessao[]): number {
  const byDay = new Set(sessoes.map((s) => s.date).filter(Boolean));
  let streak = 0;
  let d = todayISO();
  let first = true;
  for (let i = 0; i < 400; i++) {
    if (byDay.has(d)) {
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
