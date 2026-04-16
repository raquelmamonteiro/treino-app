import { addDays, daysBetween, todayISO } from "./dates";
import type { ConsultaItem } from "../types";

export type ConsultaStatus = {
  id: string;
  label: string;
  nextDue: string | null;
  daysUntil: number | null;
  overdue: boolean;
  neverVisited: boolean;
};

/** Próxima data prevista = última visita + frequência; sem visita → null. */
export function nextDueDate(c: ConsultaItem): string | null {
  if (!c.lastVisit) return null;
  return addDays(c.lastVisit, c.frequencyDays);
}

export function consultaStatus(c: ConsultaItem, today = todayISO()): ConsultaStatus {
  const next = nextDueDate(c);
  if (!c.lastVisit) {
    return { id: c.id, label: c.label, nextDue: null, daysUntil: null, overdue: false, neverVisited: true };
  }
  if (!next) {
    return { id: c.id, label: c.label, nextDue: null, daysUntil: null, overdue: false, neverVisited: false };
  }
  const diff = daysBetween(today, next);
  return {
    id: c.id,
    label: c.label,
    nextDue: next,
    daysUntil: diff,
    overdue: diff < 0,
    neverVisited: false,
  };
}

/** Ordem: atrasados primeiro, depois por data mais próxima. */
export function sortConsultasForHome(list: ConsultaItem[]): ConsultaStatus[] {
  const t = todayISO();
  return list.map((c) => consultaStatus(c, t)).sort((a, b) => {
    if (a.neverVisited && !b.neverVisited) return -1;
    if (!a.neverVisited && b.neverVisited) return 1;
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    const da = a.daysUntil ?? 9999;
    const db = b.daysUntil ?? 9999;
    return da - db;
  });
}
