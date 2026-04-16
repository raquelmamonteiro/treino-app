import type { LifeAppStateV1 } from "../types";
import { todayISO, daysBetween } from "./dates";
import { sortConsultasForHome } from "./saudeHelpers";
import { readingStreak } from "./readingStats";
import { lastStudyDate } from "./estudoStats";
import { BELEZA_AGENDA, agendaLineStatus, formatAgendaSubtitle } from "./belezaAgenda";

export type HomeReminder = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  urgency: "high" | "medium" | "low";
};

/** Lembretes derivados do estado (consultas, leitura, tabagismo). */
export function buildReminders(life: LifeAppStateV1): HomeReminder[] {
  const out: HomeReminder[] = [];
  const t = todayISO();

  const daysQuit = Math.max(0, daysBetween(life.tabagismo.quitStartDate, t));
  if (daysQuit === 6) {
    out.push({
      id: "tab-1w",
      emoji: "🎯",
      title: "1 semana sem fumar amanhã!",
      subtitle: "Prepare uma celebração simbólica.",
      urgency: "medium",
    });
  }

  const L = life.leitura;
  const todayMin = L.dailyMinutes[t] ?? 0;
  const rs = readingStreak(L.dailyMinutes);
  if (L.dailyGoalMinutes > 0 && todayMin < L.dailyGoalMinutes) {
    const miss = L.dailyGoalMinutes - todayMin;
    const streakRisk = rs >= 3 && todayMin === 0;
    out.push({
      id: "read-goal",
      emoji: "📖",
      title: streakRisk ? `Streak de ${rs} dias — falta ler hoje` : "Meta de leitura",
      subtitle: streakRisk
        ? `Registe pelo menos ${miss} min para manter o hábito.`
        : `Faltam ~${miss} min (meta ${L.dailyGoalMinutes} min/dia).`,
      urgency: streakRisk ? "medium" : "low",
    });
  }

  const ultEstudo = lastStudyDate(life.estudo.sessoes);
  if (ultEstudo) {
    const gap = daysBetween(ultEstudo, t);
    if (gap >= 3) {
      out.push({
        id: "estudo-gap",
        emoji: "📚",
        title: "Há dias sem registar estudo",
        subtitle: `Última sessão: ${ultEstudo}. Abra o módulo Estudo.`,
        urgency: "medium",
      });
    }
  }

  const consultas = sortConsultasForHome(life.saude.consultas).slice(0, 6);
  for (const c of consultas) {
    if (c.neverVisited) {
      out.push({
        id: `sx-${c.id}-nv`,
        emoji: "🩺",
        title: c.label,
        subtitle: "Quando for à consulta, registe a data em Saúde.",
        urgency: "low",
      });
      continue;
    }
    if (c.overdue && c.daysUntil != null) {
      out.push({
        id: `sx-${c.id}-od`,
        emoji: "⚠️",
        title: c.label,
        subtitle: `Retorno atrasado (~${Math.abs(c.daysUntil)} dia(s)).`,
        urgency: "high",
      });
      continue;
    }
    if (c.daysUntil != null && c.daysUntil <= 21 && c.daysUntil >= 0) {
      out.push({
        id: `sx-${c.id}-soon`,
        emoji: "📅",
        title: c.label,
        subtitle: c.daysUntil === 0 ? "Dia previsto para retorno." : `Retorno em ~${c.daysUntil} dia(s).`,
        urgency: c.daysUntil <= 7 ? "high" : "medium",
      });
    }
  }

  const agenda = life.beleza.agendaLastDone || {};
  for (const row of BELEZA_AGENDA) {
    const last = agenda[row.id];
    const st = agendaLineStatus(last, row.intervalDays, t);
    if (st.daysUntil == null) continue;
    if (st.overdue) {
      out.push({
        id: `bel-agenda-${row.id}`,
        emoji: row.emoji,
        title: `${row.label} em atraso`,
        subtitle: formatAgendaSubtitle(st),
        urgency: "high",
      });
    } else if (st.daysUntil <= 3) {
      out.push({
        id: `bel-soon-${row.id}`,
        emoji: row.emoji,
        title: `${row.label} — na altura`,
        subtitle: formatAgendaSubtitle(st),
        urgency: "medium",
      });
    }
  }

  const dom = new Date().getDate();
  if (dom === 1) {
    out.push({
      id: "metas-month",
      emoji: "🎯",
      title: "Revise suas metas",
      subtitle: "Atualize progresso e prazos no módulo Metas.",
      urgency: "low",
    });
  }

  return out.sort((a, b) => {
    const o = { high: 0, medium: 1, low: 2 };
    return o[a.urgency] - o[b.urgency];
  });
}

export function nextBeautyDue(life: LifeAppStateV1): string | null {
  const t = todayISO();
  const agenda = life.beleza.agendaLastDone || {};
  for (const row of BELEZA_AGENDA) {
    const st = agendaLineStatus(agenda[row.id], row.intervalDays, t);
    if (st.overdue) return `${row.emoji} ${row.label}`;
  }
  return null;
}
