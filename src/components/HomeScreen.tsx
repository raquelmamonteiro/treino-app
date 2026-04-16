import { useMemo } from "react";
import type { LifeAppStateV1, ModuleId } from "../types";
import { DerivedQuickPanel } from "./DerivedQuickPanel";
import { WaterWidget } from "./WaterWidget";
import { InsightsSection } from "./InsightsSection";
import { HomeSummaryTabs } from "./HomeSummaryTabs";
import { todayISO, formatLongPt, daysBetween } from "../lib/dates";
import { appUsageStreak } from "../lib/appStreak";
import { buildReminders } from "../lib/reminders";
import { countGymWorkoutsInMonth } from "../lib/treinoStats";
import { totalReadingMinutesInMonth } from "../lib/readingStats";
import { sortConsultasForHome } from "../lib/saudeHelpers";
import { totalDespesasMes } from "../lib/financasStats";
import { FILA_LABELS } from "../lib/treinoFilaLabels";
import { getSleepHours, deriveVisionBoard } from "../lib/deriveChecks";
import type { TreinoData } from "../lib/treinoSync";

export type { ModuleId };

const GRID: { id: ModuleId; emoji: string; label: string }[] = [
  { id: "treino", emoji: "🏋️", label: "Treino" },
  { id: "alimentacao", emoji: "🥗", label: "Alimentação" },
  { id: "beleza", emoji: "🧴", label: "Beleza" },
  { id: "tabagismo", emoji: "🚭", label: "Tabagismo" },
  { id: "visionboard", emoji: "🌟", label: "Vision Board" },
  { id: "sono", emoji: "😴", label: "Sono" },
  { id: "hidratacao", emoji: "💧", label: "Água" },
  { id: "journal", emoji: "📝", label: "Journal" },
  { id: "todos", emoji: "✅", label: "Tarefas" },
  { id: "metas", emoji: "🎯", label: "Metas" },
  { id: "saude", emoji: "🩺", label: "Saúde" },
  { id: "trabalho", emoji: "💼", label: "Trabalho" },
  { id: "financas", emoji: "💰", label: "Finanças" },
  { id: "estudo", emoji: "📚", label: "Estudo" },
  { id: "leitura", emoji: "📖", label: "Leitura" },
];

export function HomeScreen({
  life,
  setLife,
  treinoLog,
  treinoData,
  onOpenModule,
  onOpenSettings,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  treinoLog: unknown[] | undefined;
  treinoData: TreinoData | null;
  onOpenModule: (id: ModuleId) => void;
  onOpenSettings: () => void;
}) {
  const today = todayISO();
  const ym = today.slice(0, 7);
  const hour = new Date().getHours();

  const treinosMes = useMemo(() => countGymWorkoutsInMonth(treinoLog, ym), [treinoLog, ym]);

  const tabDays = useMemo(() => Math.max(0, daysBetween(life.tabagismo.quitStartDate, today)), [life.tabagismo.quitStartDate, today]);

  const skinDays = useMemo(() => {
    let n = 0;
    for (const [d, v] of Object.entries(life.beleza.log)) {
      if (!d.startsWith(ym)) continue;
      if (v?.am || v?.pm) n++;
    }
    return n;
  }, [life.beleza.log, ym]);

  const reminders = useMemo(() => buildReminders(life).slice(0, 8), [life]);

  const appStreak = useMemo(() => appUsageStreak(life.quickChecks), [life.quickChecks]);

  const readMonthMin = useMemo(() => totalReadingMinutesInMonth(life.leitura.dailyMinutes, ym), [life.leitura.dailyMinutes, ym]);

  const nextConsultaLine = useMemo(() => {
    const s = sortConsultasForHome(life.saude.consultas)[0];
    if (!s) return null;
    if (s.neverVisited) return `${s.label} — registe após a consulta`;
    if (s.overdue) return `${s.label} · retorno atrasado`;
    if (s.daysUntil != null) return `${s.label} · ~${s.daysUntil} dia(s)`;
    return s.label;
  }, [life.saude.consultas]);

  const gastoMes = useMemo(() => totalDespesasMes(life.financas.despesas, ym), [life.financas.despesas, ym]);

  const sleepHours = useMemo(() => getSleepHours(life, today), [life, today]);
  const sleepQ = life.sono.log[today]?.quality;

  const qi = treinoData?.qi ?? 0;
  const nextLabel = FILA_LABELS[qi % FILA_LABELS.length];

  const topMetas = useMemo(() => {
    return life.metas.items
      .filter((m) => !m.done)
      .slice()
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 3);
  }, [life.metas.items]);

  function metaPct(m: (typeof topMetas)[0]): number {
    if (m.done) return 100;
    if (m.progressType === "checkbox") return 0;
    const t = m.target ?? 1;
    const c = m.current ?? 0;
    return Math.min(100, Math.round((c / t) * 100));
  }

  function toggleDirect(id: "no_smoke" | "gut_ok") {
    setLife((p) => {
      const day = { ...(p.quickChecks[today] || {}) };
      day[id] = !day[id];
      return { ...p, quickChecks: { ...p.quickChecks, [today]: day } };
    });
  }

  const wearableBadge =
    life.wearable.provider === "terra" && life.wearable.connectedLabel
      ? `🔗 ${life.wearable.connectedLabel}`
      : null;

  const vbDone = useMemo(() => deriveVisionBoard(life, today), [life, today]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black tracking-tight text-[#ede9f7]">Oi, Raquel</p>
          <p className="mt-1 capitalize text-[#6b6280]">{formatLongPt(today)}</p>
          {appStreak > 0 && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#f59e0b44] bg-[#f59e0b18] px-3 py-1 text-sm font-bold text-[#fcd34d]">
              🔥 {appStreak} dia{appStreak === 1 ? "" : "s"} seguidos
            </p>
          )}
          {wearableBadge && (
            <p className="mt-2 text-xs font-bold text-[#86efac]">{wearableBadge}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#1f1b2e] bg-[#13101e] text-xl active:bg-[#1a1528]"
          aria-label="Configurações"
        >
          ⚙️
        </button>
      </header>

      <HomeSummaryTabs life={life} treinoLog={treinoLog} onOpenModule={onOpenModule} />

      <DerivedQuickPanel
        life={life}
        today={today}
        treinoLog={treinoLog}
        onOpenModule={onOpenModule}
        onToggleDirect={toggleDirect}
      />

      <WaterWidget life={life} today={today} setLife={setLife} />

      {!vbDone && (
        <section className="mb-6 rounded-2xl border border-[#a78bfa44] bg-[#a78bfa10] p-4">
          <p className="mb-2 text-sm font-bold text-[#ede9f7]">🌟 Seu Vision Board está esperando</p>
          <p className="mb-3 text-xs text-[#b0a8c4]">Complete o ritual diário para ganhar pontos no score.</p>
          <button
            type="button"
            onClick={() => onOpenModule("visionboard")}
            className="w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] py-3 text-sm font-bold text-[#0c0a14]"
          >
            Ver agora →
          </button>
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6280]">Sono</h2>
          <button type="button" onClick={() => onOpenModule("sono")} className="text-xs font-bold text-[#a78bfa]">
            Abrir →
          </button>
        </div>
        {sleepHours != null ? (
          <p className="text-lg font-black text-[#c4b5fd]">
            ~{sleepHours} h
            {sleepQ != null && <span className="ml-2 text-2xl">{["😫", "😴", "😐", "😊", "🤩"][sleepQ - 1]}</span>}
          </p>
        ) : (
          <p className="text-sm text-[#6b6280]">Sem registo ainda — toque para adicionar.</p>
        )}
      </section>

      <InsightsSection life={life} treinoLog={treinoLog} onOpenModule={onOpenModule} />

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Próximo treino</h2>
        <p className="mb-3 font-bold text-[#ede9f7]">{nextLabel}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenModule("treino")}
            className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14]"
          >
            Abrir treino
          </button>
        </div>
      </section>

      {hour >= 20 && (
        <section className="mb-6 rounded-2xl border border-[#a78bfa44] bg-[#a78bfa12] p-4">
          <p className="mb-2 font-bold text-[#ede9f7]">Quer registrar como foi o dia?</p>
          <button
            type="button"
            onClick={() => onOpenModule("journal")}
            className="w-full rounded-xl border border-[#a78bfa] py-2 text-sm font-bold text-[#a78bfa]"
          >
            Abrir journal
          </button>
        </section>
      )}

      {topMetas.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6280]">Metas em foco</h2>
            <button type="button" onClick={() => onOpenModule("metas")} className="text-xs font-bold text-[#a78bfa]">
              Ver todas
            </button>
          </div>
          <ul className="space-y-2">
            {topMetas.map((m) => (
              <li key={m.id} className="rounded-2xl border border-[#1f1b2e] bg-[#161321] px-3 py-2">
                <p className="truncate text-sm font-bold">{m.title}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1f1b2e]">
                  <div className="h-full rounded-full bg-[#a78bfa]" style={{ width: `${metaPct(m)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Lembretes</h2>
        {reminders.length === 0 ? (
          <p className="rounded-2xl border border-[#1f1b2e] bg-[#161321] px-3 py-4 text-center text-sm text-[#4a4260]">Nada urgente por agora.</p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id} className="flex gap-3 rounded-2xl border border-[#1f1b2e] bg-[#161321] px-3 py-3">
                <span className="text-xl">{r.emoji}</span>
                <div>
                  <p className="font-bold text-[#ede9f7]">{r.title}</p>
                  <p className="text-xs text-[#6b6280]">{r.subtitle}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Resumo do mês</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <div className="min-w-[140px] shrink-0 rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-3 py-3">
            <p className="text-[10px] text-[#6b6280]">🏋️ Treinos</p>
            <p className="text-lg font-black text-[#c4b5fd]">{treinosMes}</p>
          </div>
          <div className="min-w-[140px] shrink-0 rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-3 py-3">
            <p className="text-[10px] text-[#6b6280]">🚭 Sem fumar</p>
            <p className="text-lg font-black text-[#22c55e]">{tabDays} d</p>
          </div>
          <div className="min-w-[140px] shrink-0 rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-3 py-3">
            <p className="text-[10px] text-[#6b6280]">🧴 Skin</p>
            <p className="text-lg font-black text-[#a78bfa]">{skinDays}</p>
          </div>
          <div className="min-w-[140px] shrink-0 rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-3 py-3">
            <p className="text-[10px] text-[#6b6280]">📚 Leitura</p>
            <p className="text-lg font-black text-[#c4b5fd]">{readMonthMin} min</p>
          </div>
          <div className="min-w-[140px] shrink-0 rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-3 py-3">
            <p className="text-[10px] text-[#6b6280]">💰 Gastos</p>
            <p className="text-lg font-black text-[#f59e0b]">
              R$ {gastoMes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="min-w-[140px] shrink-0 rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-3 py-3">
            <p className="text-[10px] text-[#6b6280]">🩺 Consulta</p>
            <p className="text-xs font-bold leading-snug text-[#ede9f7]">{nextConsultaLine ?? "—"}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Módulos</h2>
        <div className="grid grid-cols-3 gap-2">
          {GRID.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpenModule(m.id)}
              className="flex min-h-[88px] flex-col items-center justify-center rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-2 text-center text-[11px] font-bold leading-tight active:bg-[#1a1528]"
            >
              <span className="mb-1 text-2xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
