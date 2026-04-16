import { useMemo, useState } from "react";
import type { LifeAppStateV1, SonoDayLog } from "../../types";
import { todayISO, addDays, formatLongPt } from "../../lib/dates";
import { computeSleepHoursNight } from "../../lib/sleepMath";
import { getSleepHours } from "../../lib/deriveChecks";

const SLEEP_HOURS = [21, 22, 23, 0, 1, 2, 3];
const WAKE_HOURS = [5, 6, 7, 8, 9, 10];
const QEMOJI = ["😫", "😴", "😐", "😊", "🤩"];

function negativeWorkoutFeedback(e: { fb?: { tags?: string[]; note?: string } }): boolean {
  const t = `${(e.fb?.tags || []).join(" ")} ${e.fb?.note || ""}`;
  return /😓|😴|💤|Pesado|Sem energia|Desconforto/i.test(t);
}

export default function SonoScreen({
  life,
  setLife,
  onBack,
  treinoLog,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
  treinoLog: unknown[] | undefined;
}) {
  const today = todayISO();
  const L = life.sono.log[today] || {};
  const [sleepHour, setSleepHour] = useState<number | undefined>(L.sleepHour);
  const [wakeHour, setWakeHour] = useState<number | undefined>(L.wakeHour);
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5 | undefined>(L.quality);

  const hoursComputed = useMemo(() => {
    if (sleepHour == null || wakeHour == null) return null;
    return computeSleepHoursNight(today, sleepHour, wakeHour);
  }, [today, sleepHour, wakeHour]);

  const wearable = life.wearable.provider !== "none" && life.wearable.pullSleep;

  function persist(patch: Partial<SonoDayLog>) {
    setLife((p) => {
      const cur = p.sono.log[today] || {};
      const next: SonoDayLog = { ...cur, ...patch };
      if (next.sleepHour != null && next.wakeHour != null) {
        next.hoursComputed = computeSleepHoursNight(today, next.sleepHour, next.wakeHour);
      }
      return { ...p, sono: { ...p.sono, log: { ...p.sono.log, [today]: next } } };
    });
  }

  function applyQuick() {
    if (sleepHour == null || wakeHour == null) return;
    persist({ sleepHour, wakeHour, quality, hoursComputed: hoursComputed ?? undefined });
  }

  const last14 = useMemo(() => {
    const out: { date: string; h: number | null; sleepAt: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const log = life.sono.log[d];
      const h = getSleepHours(life, d);
      const sleepAt = log?.sleepHour ?? null;
      out.push({ date: d, h, sleepAt });
    }
    return out;
  }, [life, today]);

  const avgWeek = useMemo(() => {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, -i);
      const h = getSleepHours(life, d);
      if (h != null) {
        sum += h;
        n++;
      }
    }
    return n ? Math.round((sum / n) * 10) / 10 : null;
  }, [life, today]);

  const avgMonth = useMemo(() => {
    const ym = today.slice(0, 7);
    let sum = 0;
    let n = 0;
    for (const [d, v] of Object.entries(life.sono.log)) {
      if (!d.startsWith(ym)) continue;
      const h = getSleepHours(life, d);
      if (h != null) {
        sum += h;
        n++;
      }
    }
    return n ? Math.round((sum / n) * 10) / 10 : null;
  }, [life, today]);

  const streak7 = useMemo(() => {
    let s = 0;
    let d = today;
    for (let i = 0; i < 400; i++) {
      const h = getSleepHours(life, d);
      if (h == null || h < 7) break;
      s++;
      d = addDays(d, -1);
    }
    return s;
  }, [life, today]);

  const correlation = useMemo(() => {
    const log = (treinoLog || []) as { date?: string; type?: string; fb?: { tags?: string[]; note?: string } }[];
    let tot = 0;
    let neg = 0;
    for (let i = 0; i < 28; i++) {
      const d = addDays(today, -i);
      const h = getSleepHours(life, d);
      if (h == null || h >= 6) continue;
      const w = log.find((e) => e.date === d && (e.type === "workout" || e.type === "quick" || e.type === "home"));
      if (!w) continue;
      tot++;
      if (negativeWorkoutFeedback(w)) neg++;
    }
    if (tot < 2) return null;
    const pct = Math.round((neg / tot) * 100);
    return { tot, pct };
  }, [life, treinoLog, today]);

  const maxBar = useMemo(() => Math.max(1, ...last14.map((x) => x.h || 0)), [last14]);

  return (
    <div className="min-h-[100dvh] bg-[#0c0a14] px-4 pb-28 pt-4 text-[#ede9f7]">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-1 text-2xl font-black">Sono 😴</h1>
      <p className="mb-6 text-sm text-[#6b6280]">{formatLongPt(today)}</p>

      {wearable && (
        <p className="mb-4 rounded-2xl border border-[#22c55e44] bg-[#22c55e18] px-3 py-2 text-xs text-[#86efac]">
          Integração ativa: prioridade aos dados do relógio quando existirem.
        </p>
      )}

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-3 font-bold">Registo rápido (noite → manhã)</p>
        <p className="mb-2 text-xs text-[#6b6280]">Foi dormir (hora)</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {SLEEP_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                setSleepHour(h);
              }}
              className={`min-h-[40px] min-w-[48px] rounded-xl border px-2 text-sm font-bold ${
                sleepHour === h ? "border-[#a78bfa] bg-[#a78bfa33]" : "border-[#2a2535] bg-[#161321]"
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-[#6b6280]">Acordou</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {WAKE_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setWakeHour(h)}
              className={`min-h-[40px] min-w-[48px] rounded-xl border px-2 text-sm font-bold ${
                wakeHour === h ? "border-[#a78bfa] bg-[#a78bfa33]" : "border-[#2a2535] bg-[#161321]"
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-[#6b6280]">Qualidade</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {QEMOJI.map((e, i) => {
            const q = (i + 1) as 1 | 2 | 3 | 4 | 5;
            return (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={`min-h-[48px] min-w-[48px] rounded-2xl border text-2xl ${
                  quality === q ? "border-[#a78bfa] bg-[#a78bfa33]" : "border-[#2a2535] bg-[#161321]"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
        {hoursComputed != null && (
          <p className="mb-3 text-center text-lg font-black text-[#c4b5fd]">≈ {hoursComputed} h dormidas</p>
        )}
        <button
          type="button"
          onClick={applyQuick}
          className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14]"
        >
          Guardar registo de hoje
        </button>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-3">
          <p className="text-xs text-[#6b6280]">Média 7 dias</p>
          <p className="text-2xl font-black text-[#a78bfa]">{avgWeek != null ? `${avgWeek} h` : "—"}</p>
        </div>
        <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-3">
          <p className="text-xs text-[#6b6280]">Média mês</p>
          <p className="text-2xl font-black text-[#c4b5fd]">{avgMonth != null ? `${avgMonth} h` : "—"}</p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 font-bold">Horas por dia (14 dias)</p>
        <div className="flex h-32 items-end justify-between gap-1">
          {last14.map((x) => (
            <div key={x.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[#a78bfa]/80"
                style={{ height: x.h != null ? `${(x.h / maxBar) * 100}%` : "4px", minHeight: 4 }}
                title={x.h != null ? `${x.h}h` : "—"}
              />
              <span className="text-[8px] text-[#4a4260]">{x.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 font-bold">Horário em que foi dormir</p>
        <p className="mb-3 text-xs text-[#6b6280]">Cada ponto = dia (14 últimos). Mais alto = mais tarde.</p>
        <div className="relative h-32">
          {last14.map((x, i) => {
            if (x.sleepAt == null) return null;
            const y = ((24 - x.sleepAt) / 24) * 100;
            return (
              <div
                key={x.date}
                className="absolute bottom-0 w-2 rounded-full bg-[#7c3aed]"
                style={{ left: `${(i / 13) * 100}%`, height: `${Math.min(100, y)}%`, transform: "translateX(-50%)" }}
                title={`${x.sleepAt}h`}
              />
            );
          })}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="font-bold">Streak 7h+</p>
        <p className="mt-1 text-3xl font-black text-[#22c55e]">{streak7} dia(s)</p>
      </section>

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="font-bold">Correlação com treino</p>
        {correlation ? (
          <p className="mt-2 text-sm leading-relaxed text-[#b0a8c4]">
            Em dias com &lt;6h de sono, {correlation.pct}% dos {correlation.tot} treinos registados tiveram feedback mais
            pesado (😓 / sem energia).
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#6b6280]">Ainda há poucos dados cruzados — continue a registar sono e treinos.</p>
        )}
      </section>
    </div>
  );
}
