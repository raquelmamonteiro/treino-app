import { useMemo } from "react";
import type { LifeAppStateV1 } from "../../types";
import { todayISO, addDays } from "../../lib/dates";
import { WaterWidget } from "../../components/WaterWidget";

function monthMatrix(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return { days, lastDay: last.getDate() };
}

const ML_OPTIONS = [150, 200, 250, 300, 350, 400, 500] as const;

export default function HidratacaoScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const today = todayISO();
  const ym = today.slice(0, 7);
  const meta = life.hidratacao.metaCopos;
  const ml = life.hidratacao.mlPerCopo;

  const { days } = useMemo(() => monthMatrix(ym), [ym]);

  const streakMeta = useMemo(() => {
    let s = 0;
    let d = today;
    for (let i = 0; i < 400; i++) {
      const n = life.hidratacao.coposByDate[d] ?? 0;
      if (n < meta) break;
      s++;
      d = addDays(d, -1);
    }
    return s;
  }, [life.hidratacao.coposByDate, meta, today]);

  const mlOptionsSorted = useMemo(() => {
    const set = new Set<number>([...ML_OPTIONS, ml]);
    return Array.from(set).sort((a, b) => a - b);
  }, [ml]);

  function bumpMeta(delta: number) {
    setLife((p) => ({
      ...p,
      hidratacao: {
        ...p.hidratacao,
        metaCopos: Math.max(4, Math.min(20, p.hidratacao.metaCopos + delta)),
      },
    }));
  }

  function cellClass(d: number): string {
    const iso = `${ym}-${String(d).padStart(2, "0")}`;
    const n = life.hidratacao.coposByDate[iso] ?? 0;
    if (iso > today) {
      return "border border-dashed border-[#2a2535] bg-[#13101e]/50 text-[#4a4260] opacity-80";
    }
    if (n === 0 && iso < today) {
      return "border-[#2a2535] bg-[#161321] text-[#6b6280]";
    }
    if (n >= meta) return "border-[#22c55e] bg-[#22c55e44] text-[#ede9f7]";
    if (n >= meta * 0.5) return "border-[#eab308] bg-[#eab30833] text-[#ede9f7]";
    return "border-[#ef4444] bg-[#ef444422] text-[#ede9f7]";
  }

  return (
    <div className="min-h-dvh bg-[#0c0a14] px-4 pb-28 pt-4 text-[#ede9f7]">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]" aria-label="Voltar ao painel">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black">Hidratação 💧</h1>
      <p className="mb-4 text-sm text-[#6b6280]">
        Meta: {meta} copos ({((meta * ml) / 1000).toFixed(1)} L) · {ml} ml/copo
      </p>

      <section className="mb-4 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Meta diária</p>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[#b0a8c4]">N.º de copos</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Menos copos na meta"
              onClick={() => bumpMeta(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1f1b2e] bg-[#161321] text-lg font-bold text-[#a78bfa] disabled:opacity-40"
              disabled={meta <= 4}
            >
              −
            </button>
            <span className="min-w-[2ch] text-center text-xl font-black tabular-nums">{meta}</span>
            <button
              type="button"
              aria-label="Mais copos na meta"
              onClick={() => bumpMeta(1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1f1b2e] bg-[#161321] text-lg font-bold text-[#a78bfa] disabled:opacity-40"
              disabled={meta >= 20}
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="hidrat-ml" className="mb-2 block text-sm text-[#b0a8c4]">
            ml por copo
          </label>
          <select
            id="hidrat-ml"
            value={ml}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLife((p) => ({
                ...p,
                hidratacao: { ...p.hidratacao, mlPerCopo: v },
              }));
            }}
            className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2.5 text-sm text-[#ede9f7]"
          >
            {mlOptionsSorted.map((opt) => (
              <option key={opt} value={opt}>
                {opt} ml
              </option>
            ))}
          </select>
        </div>
      </section>

      <WaterWidget life={life} today={today} setLife={setLife} />

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 font-bold">Streak na meta</p>
        <p className="text-3xl font-black text-[#22c55e]">{streakMeta} dia(s)</p>
      </section>

      <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-3 font-bold">Calendário — {ym}</p>
        <p className="mb-3 flex flex-wrap gap-3 text-[10px] text-[#6b6280]">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded bg-[#22c55e]" /> Meta
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded bg-[#eab308]" /> &gt;50%
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded bg-[#ef4444]" /> &lt;50%
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded border border-dashed border-[#4a4260] bg-[#13101e]" /> Futuro
          </span>
        </p>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-[#6b6280]">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((x) => (
            <div key={x}>{x}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) =>
            d == null ? (
              <div key={`e${i}`} />
            ) : (
              <div
                key={d}
                title={
                  `${ym}-${String(d).padStart(2, "0")}: ${life.hidratacao.coposByDate[`${ym}-${String(d).padStart(2, "0")}`] ?? 0} copos`
                }
                className={`flex aspect-square items-center justify-center rounded-lg text-xs font-bold ${cellClass(d)}`}
              >
                {d}
              </div>
            ),
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#4a4260]">
          Dias futuros estão tracejados. Regista copos acima — o calendário atualiza ao guardar.
        </p>
      </section>
    </div>
  );
}
