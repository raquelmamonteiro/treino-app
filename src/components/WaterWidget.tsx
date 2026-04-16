import { useMemo } from "react";
import type { LifeAppStateV1 } from "../types";

export function WaterWidget({
  life,
  today,
  setLife,
}: {
  life: LifeAppStateV1;
  today: string;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
}) {
  const meta = life.hidratacao.metaCopos;
  const ml = life.hidratacao.mlPerCopo;
  const n = life.hidratacao.coposByDate[today] ?? 0;
  const full = n >= meta;

  const liters = useMemo(() => ((Math.min(n, meta) * ml) / 1000).toFixed(2), [n, meta, ml]);

  function setCopos(c: number) {
    setLife((p) => ({
      ...p,
      hidratacao: {
        ...p.hidratacao,
        coposByDate: { ...p.hidratacao.coposByDate, [today]: Math.max(0, Math.min(meta, c)) },
      },
    }));
  }

  return (
    <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6280]">Água</h2>
        <span className={`text-sm font-black ${full ? "text-[#22c55e]" : "text-[#a78bfa]"}`}>
          {full ? "✓ Meta!" : `${n}/${meta}`}
        </span>
      </div>
      <div className="mb-2 flex justify-between gap-1">
        {Array.from({ length: meta }, (_, i) => {
          const idx = i + 1;
          const on = n >= idx;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${idx} copos`}
              onClick={() => setCopos(idx)}
              className={`flex h-10 flex-1 items-center justify-center rounded-full border-2 text-lg transition ${
                on
                  ? full
                    ? "border-[#22c55e] bg-[#22c55e33] scale-105"
                    : "border-[#a78bfa] bg-[#a78bfa33]"
                  : "border-[#2a2535] bg-[#161321] opacity-70"
              }`}
            >
              💧
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm text-[#b0a8c4]">
        <span className="font-bold text-[#ede9f7]">
          {n}/{meta} copos
        </span>{" "}
        ({liters}L)
      </p>
      {full && <p className="mt-2 animate-pulse text-center text-xs font-bold text-[#22c55e]">Dia hidratado — ótimo! ✨</p>}
    </section>
  );
}
