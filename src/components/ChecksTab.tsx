import type { LifeAppStateV1, ModuleId } from "../types";
import { todayISO } from "../lib/dates";
import { DailyScoreWidget } from "./DailyScoreWidget";
import { WaterWidget } from "./WaterWidget";
import { deriveFoodOk, deriveSupplementsOk, deriveWorkout, getSleepHours } from "../lib/deriveChecks";
import { FILA_LABELS } from "../lib/treinoFilaLabels";
import type { TreinoData } from "../lib/treinoSync";

export function ChecksTab({
  life,
  setLife,
  treinoLog,
  treinoData,
  onOpenModule,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  treinoLog: unknown[] | undefined;
  treinoData: TreinoData | null;
  onOpenModule: (m: ModuleId) => void;
}) {
  const today = todayISO();
  const qc = life.quickChecks[today] || {};
  const foodOk = deriveFoodOk(life, today);
  const supOk = deriveSupplementsOk(life, today);
  const wo = deriveWorkout(treinoLog, today);
  const sleepH = getSleepHours(life, today);
  const water = life.hidratacao.coposByDate[today] ?? 0;

  const skin = life.beleza.log[today];
  const meals = life.alimentacao.meals[today];

  const qi = treinoData?.qi ?? 0;
  const nextLabel = FILA_LABELS[qi % FILA_LABELS.length];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black">Visão do dia</h1>
      <p className="text-sm text-[#6b6280]">Tudo o que conta para o score e hábitos — {today}</p>

      <DailyScoreWidget life={life} today={today} treinoLog={treinoLog} onOpenModule={onOpenModule} />

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Checks rápidos (toggle)</h2>
        <div className="flex flex-wrap gap-2">
          <ToggleRow
            label="Não fumei 🚭"
            on={qc.no_smoke === true}
            onToggle={() =>
              setLife((p) => {
                const d = { ...(p.quickChecks[today] || {}) };
                d.no_smoke = !d.no_smoke;
                return { ...p, quickChecks: { ...p.quickChecks, [today]: d } };
              })
            }
          />
          <ToggleRow
            label="Intestino ok 💩"
            on={qc.gut_ok === true}
            onToggle={() =>
              setLife((p) => {
                const d = { ...(p.quickChecks[today] || {}) };
                d.gut_ok = !d.gut_ok;
                return { ...p, quickChecks: { ...p.quickChecks, [today]: d } };
              })
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <button type="button" onClick={() => onOpenModule("alimentacao")} className="mb-2 w-full text-left">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6280]">Alimentação</h2>
          <p className="text-sm text-[#b0a8c4]">Alimentação ok (derivado): {foodOk ? "✅" : "❌"}</p>
          <p className="text-sm text-[#b0a8c4]">Suplementos: {supOk ? "✅" : "❌"}</p>
        </button>
        <ul className="mt-2 space-y-1 text-xs text-[#6b6280]">
          {meals &&
            ["cafe", "lanche_am", "almoco", "lanche_pm", "jantar", "ceia"].map((slot) => {
              const m = meals[slot as keyof typeof meals];
              if (!m?.score && !m?.jejum) return null;
              return (
                <li key={slot}>
                  {slot}: {m.jejum ? "jejum" : m.score}
                </li>
              );
            })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Beleza</h2>
        <p className="text-sm">Manhã: {skin?.am ? "✅" : "❌"} · Noite: {skin?.pm ? "✅" : "❌"}</p>
        <button type="button" onClick={() => onOpenModule("beleza")} className="mt-2 text-sm font-bold text-[#a78bfa]">
          Abrir beleza →
        </button>
      </section>

      <WaterWidget life={life} today={today} setLife={setLife} />

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Sono</h2>
        <p className="text-lg font-bold">{sleepH != null ? `~${sleepH} h` : "—"}</p>
        <button type="button" onClick={() => onOpenModule("sono")} className="mt-2 text-sm font-bold text-[#a78bfa]">
          Registar sono →
        </button>
      </section>

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Treino</h2>
        <p className="text-sm">Treinou hoje: {wo ? "✅" : "❌"}</p>
        <p className="mt-1 text-xs text-[#6b6280]">Próximo na fila: {nextLabel}</p>
        <button type="button" onClick={() => onOpenModule("treino")} className="mt-2 text-sm font-bold text-[#a78bfa]">
          Abrir treino →
        </button>
      </section>

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Leitura</h2>
        <p className="text-sm">Minutos hoje: {life.leitura.dailyMinutes[today] ?? 0}</p>
        <button type="button" onClick={() => onOpenModule("leitura")} className="mt-2 text-sm font-bold text-[#a78bfa]">
          Abrir leitura →
        </button>
      </section>

      <p className="text-center text-xs text-[#4a4260]">Água: {water}/{life.hidratacao.metaCopos} copos</p>
    </div>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`min-h-[48px] rounded-2xl border px-4 py-2 text-sm font-bold ${
        on ? "border-[#22c55e55] bg-[#22c55e22] text-[#86efac]" : "border-[#1f1b2e] bg-[#161321] text-[#b0a8c4]"
      }`}
    >
      {on ? "✅ " : "☐ "}
      {label}
    </button>
  );
}
