import { useMemo, useState } from "react";
import type { LifeAppStateV1, ScoreCheckKey } from "../types";
import { todayISO, daysBetween } from "../lib/dates";
import { computeDailyScore, scoreStreakOver80 } from "../lib/dailyScore";
import { countGymWorkoutsInMonth } from "../lib/treinoStats";
import { totalReadingMinutesInMonth, readingStreak } from "../lib/readingStats";
import { totalGanhoMes } from "../lib/trabalhoStats";
import { totalDespesasMes } from "../lib/financasStats";
import { horasEstudoMes } from "../lib/estudoStats";

const CHECK_EMOJI: Record<ScoreCheckKey, string> = {
  no_smoke: "🚭",
  workout: "🏋️",
  food_ok: "🥗",
  skincare_am: "☀️",
  skincare_pm: "🌙",
  water: "💧",
  supplements: "💊",
  reading: "📖",
  sleep_7h: "😴",
  gut_ok: "💩",
  vision_board: "🌟",
  no_gluten: "🌾",
  no_sugar: "🍬",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function calendarCells(year: number, month1: number): (number | null)[] {
  const first = new Date(year, month1 - 1, 1);
  const pad = (first.getDay() + 6) % 7;
  const dim = new Date(year, month1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  return cells;
}

function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function SummaryTab({
  life,
  treinoLog,
}: {
  life: LifeAppStateV1;
  treinoLog: unknown[] | undefined;
}) {
  const today = todayISO();
  const todayYm = today.slice(0, 7);
  const [ym, setYm] = useState(todayYm);

  const [cy, cm] = ym.split("-").map(Number);
  const cells = useMemo(() => calendarCells(cy, cm), [cy, cm]);
  const monthTitle = new Date(cy, cm - 1, 15).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const dayMeta = useMemo(() => {
    const dim = new Date(cy, cm, 0).getDate();
    const map: Record<string, { emojis: string; title: string }> = {};
    for (let day = 1; day <= dim; day++) {
      const iso = `${cy}-${pad2(cm)}-${pad2(day)}`;
      if (iso > today) {
        map[iso] = { emojis: "", title: "" };
        continue;
      }
      const { lines } = computeDailyScore(life, treinoLog, iso);
      const ok = lines.filter((l) => l.ok);
      map[iso] = {
        emojis: ok.map((l) => CHECK_EMOJI[l.key]).join(""),
        title: ok.map((l) => l.label).join(", "),
      };
    }
    return map;
  }, [life, treinoLog, cy, cm, today]);

  const canGoNext = ym < todayYm;

  const ymForStats = today.slice(0, 7);
  const treinos = useMemo(() => countGymWorkoutsInMonth(treinoLog, ymForStats), [treinoLog, ymForStats]);
  const tabDays = Math.max(0, daysBetween(life.tabagismo.quitStartDate, today));

  const checksMonth = useMemo(() => {
    let total = 0;
    let max = 0;
    for (const [d, day] of Object.entries(life.quickChecks)) {
      if (!d.startsWith(ymForStats)) continue;
      max += 6;
      total += Object.values(day).filter(Boolean).length;
    }
    return { total, max };
  }, [life.quickChecks, ymForStats]);

  const readMin = useMemo(() => totalReadingMinutesInMonth(life.leitura.dailyMinutes, ymForStats), [life.leitura.dailyMinutes, ymForStats]);
  const readStreak = useMemo(() => readingStreak(life.leitura.dailyMinutes), [life.leitura.dailyMinutes]);
  const ganhoPlantoes = useMemo(() => totalGanhoMes(life.trabalho.plantoes, ymForStats), [life.trabalho.plantoes, ymForStats]);
  const gastosMes = useMemo(() => totalDespesasMes(life.financas.despesas, ymForStats), [life.financas.despesas, ymForStats]);
  const hEstudo = useMemo(() => horasEstudoMes(life.estudo.sessoes, ymForStats), [life.estudo.sessoes, ymForStats]);

  const streak80 = useMemo(() => scoreStreakOver80(life, today), [life, today]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">Resumo rápido</h1>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Score do mês (calendário)</p>
        <p className="mb-2 text-[10px] leading-snug text-[#5c5475]">
          Emojis = critérios do score nesse dia (não são os toggles rápidos da Home).
        </p>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setYm((y) => shiftYm(y, -1))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1f1b2e] bg-[#161321] text-lg font-bold text-[#a78bfa]"
          >
            ‹
          </button>
          <span className="flex-1 text-center text-sm font-black capitalize text-[#ede9f7]">{monthTitle}</span>
          <button
            type="button"
            aria-label="Próximo mês"
            disabled={!canGoNext}
            onClick={() => canGoNext && setYm((y) => shiftYm(y, 1))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1f1b2e] bg-[#161321] text-lg font-bold text-[#a78bfa] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-[9px] font-bold uppercase text-[#5c5475]">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`e${idx}`} className="min-h-[72px]" />;
            }
            const iso = `${cy}-${pad2(cm)}-${pad2(day)}`;
            const isFuture = iso > today;
            const isToday = iso === today;
            const meta = dayMeta[iso] ?? { emojis: "", title: "" };
            return (
              <div
                key={iso}
                title={meta.title || undefined}
                className={`flex min-h-[72px] flex-col rounded-lg border p-1 ${
                  isToday
                    ? "border-[#a78bfa66] bg-[#a78bfa14]"
                    : isFuture
                      ? "border-[#1f1b2e]/50 bg-[#161321]/40 opacity-50"
                      : "border-[#1f1b2e] bg-[#161321]"
                }`}
              >
                <span className="text-center text-[11px] font-bold text-[#b0a8c4]">{day}</span>
                <div className="flex min-h-[40px] flex-1 flex-wrap content-start justify-center gap-px break-all text-center text-[11px] leading-none">
                  {isFuture ? (
                    <span className="text-[#3f3a52]"> </span>
                  ) : meta.emojis ? (
                    <span className="text-[10px] tracking-tight">{meta.emojis}</span>
                  ) : (
                    <span className="text-[9px] text-[#3f3a52]">·</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[9px] leading-relaxed text-[#5c5475]">
          Cada emoji = check do score nesse dia (🚭 🏋️ 🥗 ☀️ 🌙 💧 💊 📖 😴 💩 🌟 🌾 🍬).
        </p>
        <p className="mt-2 text-xs text-[#6b6280]">
          Streak &gt;80%: <span className="font-bold text-[#a78bfa]">{streak80} dia(s)</span>
        </p>
      </div>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Treinos (mês)</p>
        <p className="text-3xl font-black text-[#c4b5fd]">{treinos}</p>
      </div>
      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Sem fumar</p>
        <p className="text-3xl font-black text-[#22c55e]">{tabDays} dias</p>
      </div>
      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Toques nos checks da Home (mês)</p>
        <p className="mt-1 text-[10px] leading-snug text-[#5c5475]">
          Soma de 🚭 intestino e toggles rápidos — métrica à parte do score acima.
        </p>
        <p className="mt-2 text-3xl font-black text-[#a78bfa]">
          {checksMonth.total}
          <span className="text-lg text-[#6b6280]"> marcas</span>
        </p>
      </div>
      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Leitura (mês)</p>
        <p className="text-3xl font-black text-[#c4b5fd]">{readMin} min</p>
        <p className="mt-1 text-xs text-[#6b6280]">Streak: {readStreak > 0 ? `${readStreak} dia${readStreak === 1 ? "" : "s"}` : "—"}</p>
      </div>
      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Consultas (cadastradas)</p>
        <p className="text-3xl font-black text-[#ede9f7]">{life.saude.consultas.length}</p>
      </div>
      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Plantões — ganho (mês)</p>
        <p className="text-2xl font-black text-[#a78bfa]">
          R$ {ganhoPlantoes.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Gastos (mês)</p>
        <p className="text-2xl font-black text-[#f59e0b]">
          R$ {gastosMes.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-xs uppercase tracking-wider text-[#6b6280]">Estudo (mês)</p>
        <p className="text-3xl font-black text-[#c4b5fd]">{hEstudo.toFixed(1)} h</p>
      </div>
    </div>
  );
}
