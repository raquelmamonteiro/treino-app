import { addDays, daysBetween, todayISO } from "./dates";

export const BELEZA_AGENDA = [
  { id: "manicure" as const, label: "Manicure", hint: "Semanal", emoji: "💅", intervalDays: 7 },
  { id: "corte" as const, label: "Corte de cabelo", hint: "A cada 3 meses", emoji: "✂️", intervalDays: 90 },
  { id: "sobrancelha" as const, label: "Sobrancelha", hint: "A cada 3 semanas", emoji: "👁️", intervalDays: 21 },
  { id: "pintar_cabelo" as const, label: "Pintar cabelo", hint: "A cada 10 semanas", emoji: "🎨", intervalDays: 70 },
  { id: "clarear_braco" as const, label: "Clarear pelo do braço", hint: "A cada 10 semanas", emoji: "✨", intervalDays: 70 },
];

export type BelezaAgendaId = (typeof BELEZA_AGENDA)[number]["id"];

export type AgendaLineStatus = {
  nextDue: string | null;
  /** dias até à próxima data (negativo = atrasado) */
  daysUntil: number | null;
  overdue: boolean;
};

export function agendaLineStatus(lastDone: string | undefined, intervalDays: number, today = todayISO()): AgendaLineStatus {
  if (!lastDone) return { nextDue: null, daysUntil: null, overdue: false };
  const due = addDays(lastDone, intervalDays);
  const daysUntil = daysBetween(today, due);
  return { nextDue: due, daysUntil, overdue: daysUntil < 0 };
}

export function formatAgendaSubtitle(s: AgendaLineStatus): string {
  if (s.daysUntil == null) return "Ainda sem registo — marca a última vez que fez.";
  if (s.overdue) return `Atrasado ${Math.abs(s.daysUntil)} dia(s) · próximo era ${s.nextDue}`;
  if (s.daysUntil === 0) return "Ideal: hoje ou nos próximos dias.";
  return `Próximo ~${s.nextDue} (daqui a ${s.daysUntil} dia(s))`;
}
