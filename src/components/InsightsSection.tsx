import { useMemo } from "react";
import type { LifeAppStateV1, ModuleId } from "../types";
import { generateInsights } from "../lib/insights";

const STYLE: Record<string, string> = {
  positive: "border-[#22c55e44] bg-[#22c55e14] text-[#86efac]",
  warning: "border-[#f59e0b44] bg-[#f59e0b14] text-[#fcd34d]",
  info: "border-[#38bdf844] bg-[#38bdf814] text-[#7dd3fc]",
};

export function InsightsSection({
  life,
  treinoLog,
  onOpenModule,
}: {
  life: LifeAppStateV1;
  treinoLog: unknown[] | undefined;
  onOpenModule: (m: ModuleId) => void;
}) {
  const list = useMemo(() => generateInsights(life, treinoLog).slice(0, 3), [life, treinoLog]);

  const mapMod = (m: string): ModuleId | null => {
    if (m === "sono") return "sono";
    if (m === "alimentacao") return "alimentacao";
    if (m === "tabagismo") return "tabagismo";
    return null;
  };

  if (list.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">💡 Insights</h2>
      <ul className="space-y-2">
        {list.map((ins) => {
          const nav = mapMod(ins.module);
          return (
            <li key={ins.id}>
              <button
                type="button"
                disabled={!nav}
                onClick={() => nav && onOpenModule(nav)}
                className={`w-full rounded-2xl border px-3 py-3 text-left ${STYLE[ins.type] || STYLE.info}`}
              >
                <p className="font-bold text-[#ede9f7]">{ins.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#b0a8c4]">{ins.description}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
