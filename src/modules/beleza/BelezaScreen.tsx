import { useState } from "react";
import type { LifeAppStateV1, SkinCareRoutine } from "../../types";
import { todayISO } from "../../lib/dates";
import { BELEZA_AGENDA, agendaLineStatus, formatAgendaSubtitle, type BelezaAgendaId } from "../../lib/belezaAgenda";

function RoutineBlock({
  title,
  emoji,
  items,
  onComplete,
  done,
}: {
  title: string;
  emoji: string;
  items: SkinCareRoutine[];
  onComplete: () => void;
  done: boolean;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  const allChecked = items.length > 0 && items.every((i) => checked[i.id]);

  return (
    <div className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">
          {emoji} {title}
        </h2>
        {done && <span className="text-[#22c55e]">✅ Feito</span>}
      </div>
      <ol className="space-y-2">
        {items.map((it, idx) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => toggle(it.id)}
              className={`flex w-full min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${
                checked[it.id] ? "border-[#22c55e55] bg-[#22c55e18]" : "border-[#2a2535] bg-[#161321]"
              }`}
            >
              <span>{checked[it.id] ? "✅" : "☐"}</span>
              <span>
                <span className="font-bold">{idx + 1}.</span> {it.label}
                {it.product ? <span className="text-[#6b6280]"> — {it.product}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={!allChecked || done}
        onClick={onComplete}
        className="mt-4 min-h-[44px] w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14] disabled:opacity-40"
      >
        Concluir rotina
      </button>
    </div>
  );
}

export default function BelezaScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const today = todayISO();
  const log = life.beleza.log[today] || {};
  const agenda = life.beleza.agendaLastDone || {};

  function completeAm() {
    setLife((p) => ({
      ...p,
      beleza: {
        ...p.beleza,
        log: {
          ...p.beleza.log,
          [today]: { ...p.beleza.log[today], am: true },
        },
      },
    }));
  }

  function completePm() {
    setLife((p) => ({
      ...p,
      beleza: {
        ...p.beleza,
        log: {
          ...p.beleza.log,
          [today]: { ...p.beleza.log[today], pm: true },
        },
      },
    }));
  }

  function setAgendaDate(id: BelezaAgendaId, iso: string) {
    setLife((p) => ({
      ...p,
      beleza: {
        ...p.beleza,
        agendaLastDone: { ...p.beleza.agendaLastDone, [id]: iso },
      },
    }));
  }

  function markAgendaToday(id: BelezaAgendaId) {
    setAgendaDate(id, today);
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c0a14] px-4 pb-28 pt-4">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black text-[#ede9f7]">Beleza</h1>
      <p className="mb-6 text-sm text-[#6b6280]">Skin care e agendamentos de salão.</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Agendamentos</h2>
        <p className="mb-4 text-xs leading-relaxed text-[#4a4260]">
          Indica a <strong>última vez</strong> que fizeste cada cuidado; o app calcula a próxima data ideal.
        </p>
        <ul className="space-y-3">
          {BELEZA_AGENDA.map((row) => {
            const last = agenda[row.id];
            const st = agendaLineStatus(last, row.intervalDays, today);
            const warn = st.overdue || (st.daysUntil != null && st.daysUntil <= 3 && st.daysUntil >= 0);
            return (
              <li
                key={row.id}
                className={`rounded-2xl border p-4 ${
                  st.overdue
                    ? "border-[#f8717144] bg-[#f8717110]"
                    : warn
                      ? "border-[#fbbf2444] bg-[#fbbf2410]"
                      : "border-[#1f1b2e] bg-[#13101e]"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#ede9f7]">
                      {row.emoji} {row.label}
                    </p>
                    <p className="text-[11px] text-[#a78bfa]">{row.hint}</p>
                  </div>
                  {st.overdue && <span className="shrink-0 text-xs font-bold text-[#fca5a5]">Atraso</span>}
                </div>
                <p className="mb-3 text-xs leading-relaxed text-[#b0a8c4]">{formatAgendaSubtitle(st)}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[10px] text-[#6b6280]">Última vez</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm text-[#ede9f7]"
                      value={last || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setLife((p) => {
                            const next = { ...p.beleza.agendaLastDone };
                            delete next[row.id];
                            return { ...p, beleza: { ...p.beleza, agendaLastDone: next } };
                          });
                        } else setAgendaDate(row.id, v);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => markAgendaToday(row.id)}
                    className="min-h-[44px] shrink-0 rounded-xl border border-[#a78bfa] bg-[#a78bfa22] px-4 text-sm font-bold text-[#c4b5fd]"
                  >
                    Fiz hoje
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Skin care</h2>
      <RoutineBlock title="Manhã" emoji="🌅" items={life.beleza.morning} onComplete={completeAm} done={!!log.am} />
      <RoutineBlock title="Noite" emoji="🌙" items={life.beleza.night} onComplete={completePm} done={!!log.pm} />
    </div>
  );
}
