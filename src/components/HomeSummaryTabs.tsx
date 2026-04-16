import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LifeAppStateV1, ModuleId } from "../types";
import {
  buildMonthSummary,
  buildPreviousWeekSummary,
  buildThisWeekSummary,
  bestWeekInMonth,
  prevMonthYm,
  worstDayInMonth,
  type PeriodSummary,
} from "../lib/homeSummary";
import { todayISO, addDays, mondayThisWeekISO } from "../lib/dates";
import { deriveFoodOk } from "../lib/deriveChecks";

function diffArrow(cur: number | null, prev: number | null, isPct = true): { text: string; color: string } {
  if (cur == null || prev == null) return { text: "—", color: "text-[#6b6280]" };
  const d = cur - prev;
  if (Math.abs(d) < 0.5) return { text: "—", color: "text-[#6b6280]" };
  const sign = d > 0 ? "▲" : "▼";
  const abs = Math.abs(Math.round(d));
  const color = d > 0 ? "text-[#22c55e]" : "text-[#ef4444]";
  return { text: `${sign} ${isPct ? `${abs}%` : `${abs}`}`, color };
}

function foodDots(life: LifeAppStateV1, start: string, end: string): string {
  let out = "";
  let d = start;
  for (let i = 0; i < 8; i++) {
    if (d > end) break;
    const ok = deriveFoodOk(life, d);
    const any =
      life.alimentacao.meals[d] && Object.values(life.alimentacao.meals[d]).some((x) => x?.score || x?.jejum);
    if (!any) out += "⬜";
    else if (ok) out += "🟢";
    else out += "🟡";
    if (d === end) break;
    d = addDays(d, 1);
  }
  return out || "—";
}

export function HomeSummaryTabs({
  life,
  treinoLog,
  onOpenModule,
}: {
  life: LifeAppStateV1;
  treinoLog: unknown[] | undefined;
  onOpenModule: (m: ModuleId) => void;
}) {
  const today = todayISO();
  const ym = today.slice(0, 7);
  const [tab, setTab] = useState<"week" | "month">("week");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const k = `home-summary-collapsed-${today}`;
    setExpanded(sessionStorage.getItem(k) !== "1");
  }, [today]);

  function toggleCollapsed() {
    const next = !expanded;
    setExpanded(next);
    sessionStorage.setItem(`home-summary-collapsed-${today}`, next ? "0" : "1");
  }

  const weekCur = useMemo(() => buildThisWeekSummary(life, treinoLog, today), [life, treinoLog, today]);
  const weekPrev = useMemo(() => buildPreviousWeekSummary(life, treinoLog, today), [life, treinoLog, today]);
  const monthCur = useMemo(() => buildMonthSummary(life, treinoLog, ym, today), [life, treinoLog, ym, today]);
  const monthPrevYm = prevMonthYm(ym);
  const monthPrev = useMemo(() => {
    const [py, pm] = monthPrevYm.split("-").map(Number);
    const lastD = new Date(py, pm, 0).getDate();
    const endIso = `${monthPrevYm}-${String(lastD).padStart(2, "0")}`;
    return buildMonthSummary(life, treinoLog, monthPrevYm, endIso);
  }, [life, treinoLog, monthPrevYm]);

  const mon = mondayThisWeekISO();
  const sun = addDays(mon, 6);
  const weekLabel = `${formatShort(mon)} — ${formatShort(sun)}`;

  const worst = useMemo(() => worstDayInMonth(life, ym, today), [life, ym, today]);
  const bestW = useMemo(() => bestWeekInMonth(life, ym, today), [life, ym, today]);

  const scoreCmp = diffArrow(weekCur.avgScore, weekPrev.avgScore);

  const warnScore =
    weekCur.avgScore != null &&
    weekPrev.avgScore != null &&
    weekPrev.avgScore > 0 &&
    weekCur.avgScore < weekPrev.avgScore * 0.8;

  return (
    <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
      <button type="button" onClick={toggleCollapsed} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-black text-[#ede9f7]">📊 Resumo</span>
        <span className="text-[#a78bfa]">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <>
          <div className="mt-3 flex rounded-xl border border-[#2a2535] p-1 text-xs font-bold">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 ${tab === "week" ? "bg-[#a78bfa33] text-[#ede9f7]" : "text-[#6b6280]"}`}
              onClick={() => setTab("week")}
            >
              Esta semana
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 ${tab === "month" ? "bg-[#a78bfa33] text-[#ede9f7]" : "text-[#6b6280]"}`}
              onClick={() => setTab("month")}
            >
              Este mês
            </button>
          </div>

          {tab === "week" && (
            <WeekPanel
              label={weekLabel}
              cur={weekCur}
              prev={weekPrev}
              scoreCmp={scoreCmp}
              warnScore={warnScore}
              onOpenModule={onOpenModule}
              dots={foodDots(life, mon, today < sun ? today : sun)}
            />
          )}
          {tab === "month" && (
            <MonthPanel
              ym={ym}
              cur={monthCur}
              prev={monthPrev}
              worst={worst}
              bestW={bestW}
              onOpenModule={onOpenModule}
            />
          )}
        </>
      )}
    </section>
  );
}

function formatShort(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function WeekPanel({
  label,
  cur,
  prev,
  scoreCmp,
  warnScore,
  onOpenModule,
  dots,
}: {
  label: string;
  cur: PeriodSummary;
  prev: PeriodSummary;
  scoreCmp: { text: string; color: string };
  warnScore: boolean;
  onOpenModule: (m: ModuleId) => void;
  dots: string;
}) {
  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-xs text-[#6b6280]">
        {label}
        {warnScore && <span className="ml-2 text-[#f87171]">⚠️</span>}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          <p className="text-[10px] text-[#6b6280]">Score médio</p>
          <p className="text-lg font-black text-[#ede9f7]">{cur.avgScore != null ? `${cur.avgScore}%` : "—"}</p>
          <div className={`text-[10px] ${scoreCmp.color}`}>{scoreCmp.text}</div>
        </div>
        <MetricTap label="Treinos" value={`${cur.workouts}`} sub={<span className="text-[#6b6280]">vs {prev.workouts}</span>} onClick={() => onOpenModule("treino")} />
        <MetricTap
          label="Alimentação"
          value={`${cur.healthyDays}/${cur.dayCount}`}
          sub={<span className="truncate text-[10px]">{dots}</span>}
          onClick={() => onOpenModule("alimentacao")}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <MiniStat label="🚭" text={`${cur.smokeFreeDays} dias`} onClick={() => onOpenModule("tabagismo")} />
        <MiniStat label="📖" text={`${Math.round(cur.readingMinutes / 60)}h lido`} onClick={() => onOpenModule("leitura")} />
        <MiniStat label="😴" text={cur.avgSleep != null ? `${cur.avgSleep}h média` : "—"} onClick={() => onOpenModule("sono")} />
        <MiniStat label="🧴" text={`${cur.skincareDays}/${cur.dayCount}`} onClick={() => onOpenModule("beleza")} />
        <MiniStat label="💧" text={`${cur.waterGoalDays}/${cur.dayCount} meta`} onClick={() => onOpenModule("hidratacao")} />
        <MiniStat label="🌟" text={`${cur.visionBoardDays}/${cur.dayCount} VB`} onClick={() => onOpenModule("visionboard")} />
      </div>
      {cur.totalExpenses > 0 && (
        <p className="text-xs text-[#6b6280]">
          💰 Gastos (semana): R${" "}
          {cur.totalExpenses.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
        </p>
      )}
    </div>
  );
}

function MonthPanel({
  ym,
  cur,
  prev,
  worst,
  bestW,
  onOpenModule,
}: {
  ym: string;
  cur: PeriodSummary;
  prev: PeriodSummary;
  worst: { date: string; score: number } | null;
  bestW: { label: string; avg: number } | null;
  onOpenModule: (m: ModuleId) => void;
}) {
  const [y, m] = ym.split("-").map(Number);
  const title = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const scoreDiff = diffArrow(cur.avgScore, prev.avgScore);
  const lastDay = new Date(y, m, 0).getDate();
  const pctBar = cur.avgScore != null ? cur.avgScore : 0;
  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-xs font-bold capitalize text-[#a78bfa]">{title}</p>
      <button type="button" onClick={() => onOpenModule("treino")} className="w-full text-left">
        <p className="text-xs text-[#6b6280]">Score médio</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#ede9f7]">{cur.avgScore != null ? `${cur.avgScore}%` : "—"}</span>
          <span className={`text-xs ${scoreDiff.color}`}>{scoreDiff.text} vs mês ant.</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1f1b2e]">
          <div className="h-full rounded-full bg-[#a78bfa]" style={{ width: `${pctBar}%` }} />
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button type="button" onClick={() => onOpenModule("treino")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          🏋️ {cur.workouts} treinos
        </button>
        <button type="button" onClick={() => onOpenModule("alimentacao")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          🥗 {cur.healthyDays}/{cur.dayCount} dias ok
        </button>
        <button type="button" onClick={() => onOpenModule("tabagismo")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          🚭 {cur.smokeFreeDays} dias
        </button>
        <button type="button" onClick={() => onOpenModule("leitura")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          📖 {Math.round(cur.readingMinutes / 60)}h leitura
        </button>
        <button type="button" onClick={() => onOpenModule("beleza")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          🧴 {cur.skincareDays}/{lastDay} SC
        </button>
        <button type="button" onClick={() => onOpenModule("hidratacao")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          💧 {cur.waterGoalDays}/{lastDay} água
        </button>
        <button type="button" onClick={() => onOpenModule("financas")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          💰 R${" "}
          {cur.totalExpenses.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
        </button>
        <button type="button" onClick={() => onOpenModule("sono")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          😴 {cur.avgSleep != null ? `${cur.avgSleep}h` : "—"} sono
        </button>
        <button type="button" onClick={() => onOpenModule("visionboard")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          🌟 {cur.visionBoardDays}/{lastDay} VB
        </button>
        <button type="button" onClick={() => onOpenModule("estudo")} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
          📚 {cur.studyHours.toFixed(1)}h estudo
        </button>
      </div>
      {bestW && (
        <p className="text-xs text-[#6b6280]">
          Melhor semana: dias {bestW.label} (score {bestW.avg}%)
        </p>
      )}
      {worst && (
        <p className="text-xs text-[#f87171]">
          Pior dia: {formatShort(worst.date)} (score {worst.score}%)
        </p>
      )}
    </div>
  );
}

function MetricTap({
  label,
  value,
  sub,
  onClick,
}: {
  label: string;
  value: string;
  sub: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-left">
      <p className="text-[10px] text-[#6b6280]">{label}</p>
      <p className="text-lg font-black text-[#ede9f7]">{value}</p>
      <div className="text-[10px]">{sub}</div>
    </button>
  );
}

function MiniStat({ label, text, onClick }: { label: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 py-2 text-left">
      <span className="mr-1">{label}</span>
      <span className="text-[#b0a8c4]">{text}</span>
    </button>
  );
}
