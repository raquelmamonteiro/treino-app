import { useMemo, useState } from "react";
import type { LifeAppStateV1 } from "../../types";
import { todayISO } from "../../lib/dates";
import { sortConsultasForHome } from "../../lib/saudeHelpers";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}`;
}

const PRESETS: { label: string; days: number }[] = [
  { label: "Semanal", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "Mensal", days: 30 },
  { label: "6 meses", days: 183 },
  { label: "Anual", days: 365 },
];

export default function SaudeScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const t = todayISO();
  const list = life.saude.consultas;
  const [label, setLabel] = useState("");
  const [freq, setFreq] = useState(365);

  const sorted = useMemo(() => sortConsultasForHome(list), [list]);

  function registerToday(id: string) {
    setLife((p) => ({
      ...p,
      saude: {
        ...p.saude,
        consultas: p.saude.consultas.map((c) => (c.id === id ? { ...c, lastVisit: t } : c)),
      },
    }));
  }

  function remove(id: string) {
    if (!confirm("Remover este registo?")) return;
    setLife((p) => ({
      ...p,
      saude: { ...p.saude, consultas: p.saude.consultas.filter((c) => c.id !== id) },
    }));
  }

  function add() {
    const name = label.trim();
    if (!name || freq < 1) return;
    setLife((p) => ({
      ...p,
      saude: {
        ...p.saude,
        consultas: [...p.saude.consultas, { id: newId(), label: name, frequencyDays: freq }],
      },
    }));
    setLabel("");
    setFreq(365);
  }

  function line(s: (typeof sorted)[0]): string {
    if (s.neverVisited) return "Sem data registada — use “Fiz consulta hoje” após ir.";
    if (s.nextDue == null) return "—";
    if (s.overdue) return `Atrasada há ${Math.abs(s.daysUntil ?? 0)} dia(s)`;
    if (s.daysUntil === 0) return "Hoje é o dia previsto.";
    return `Próxima ~ em ${s.daysUntil} dia(s)`;
  }

  return (
    <div className="min-h-dvh bg-[#0c0a14] px-4 pb-28 pt-4">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black text-[#ede9f7]">🩺 Saúde</h1>
      <p className="mb-6 text-sm text-[#6b6280]">Consultas regulares e próximos retornos.</p>

      <ul className="mb-6 space-y-3">
        {sorted.map((s) => (
            <li key={s.id} className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-bold text-[#ede9f7]">{s.label}</p>
                <button type="button" className="text-xs text-[#ef444488]" onClick={() => remove(s.id)}>
                  ✕
                </button>
              </div>
              <p className="mb-2 text-xs text-[#6b6280]">{line(s)}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => registerToday(s.id)}
                  className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] px-4 text-sm font-bold text-[#0c0a14]"
                >
                  Fiz consulta hoje
                </button>
              </div>
            </li>
        ))}
      </ul>

      {list.length === 0 && (
        <p className="mb-4 text-center text-sm text-[#4a4260]">Nenhuma consulta — adicione abaixo.</p>
      )}

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Nova consulta</p>
        <input
          className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-3 text-[#ede9f7] outline-none"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex.: Ginecologista"
        />
        <p className="mb-2 text-xs text-[#5c5475]">Frequência</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setFreq(p.days)}
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-bold ${
                freq === p.days ? "border-[#a78bfa] bg-[#1a1528] text-[#ede9f7]" : "border-[#1f1b2e] text-[#6b6280]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="mb-1 block text-xs text-[#5c5475]">Dias entre consultas (manual)</label>
        <input
          inputMode="numeric"
          className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7] outline-none"
          value={freq}
          onChange={(e) => setFreq(Math.max(1, parseInt(e.target.value, 10) || 30))}
        />
        <button
          type="button"
          onClick={add}
          disabled={!label.trim()}
          className="min-h-[48px] w-full rounded-xl border border-[#a78bfa55] font-bold text-[#c4b5fd] disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}
