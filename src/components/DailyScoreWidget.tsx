import { useMemo } from "react";
import type { LifeAppStateV1, ScoreCheckKey, ModuleId } from "../types";
import { computeDailyScore, scoreRingColor } from "../lib/dailyScore";

const NAV: Partial<Record<ScoreCheckKey, ModuleId | null>> = {
  no_smoke: "tabagismo",
  workout: "treino",
  food_ok: "alimentacao",
  skincare_am: "beleza",
  skincare_pm: "beleza",
  water: "hidratacao",
  supplements: "alimentacao",
  reading: "leitura",
  sleep_7h: "sono",
  gut_ok: "saude",
  vision_board: "visionboard",
  no_gluten: "alimentacao",
  no_sugar: "alimentacao",
};

/** Rótulos curtos para caber em 3 colunas no telemóvel */
const SHORT_LABEL: Partial<Record<ScoreCheckKey, string>> = {
  no_smoke: "Sem fumar",
  workout: "Treino",
  food_ok: "Alimentação",
  skincare_am: "Skin manhã",
  skincare_pm: "Skin noite",
  water: "Água",
  supplements: "Supl.",
  reading: "Leitura",
  sleep_7h: "Sono 7h+",
  gut_ok: "Intestino",
  vision_board: "Vis. board",
  no_gluten: "Sem glúten",
  no_sugar: "Sem açúcar",
};

export function DailyScoreWidget({
  life,
  today,
  treinoLog,
  onOpenModule,
}: {
  life: LifeAppStateV1;
  today: string;
  treinoLog: unknown[] | undefined;
  onOpenModule: (m: ModuleId) => void;
}) {
  const { total, max, lines } = useMemo(
    () => computeDailyScore(life, treinoLog, today),
    [life, treinoLog, today],
  );
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  const color = scoreRingColor(pct);
  const arc = `${(pct / 100) * 264} 264`;

  return (
    <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-3">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1f1b2e" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={arc}
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6280]">Score do dia</p>
          <p className="text-2xl font-black leading-tight text-[#ede9f7]">{pct}%</p>
          <p className="text-[10px] text-[#5c5475]">
            {total}/{max} pts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {lines.map((row) => {
          const nav = NAV[row.key];
          const label = SHORT_LABEL[row.key] ?? row.label;
          return (
            <button
              key={row.key}
              type="button"
              disabled={nav === undefined}
              title={`${row.label} · ${row.points} pts`}
              onClick={() => nav && onOpenModule(nav)}
              className={`flex min-h-[44px] items-center justify-between gap-1 rounded-lg border px-1.5 py-1.5 text-left ${
                nav ? "border-[#1f1b2e] bg-[#161321] active:bg-[#1a1528]" : "cursor-default border-[#1f1b2e]/80 bg-[#161321]/80"
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight text-[#b0a8c4]">
                {label}
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center text-sm leading-none ${
                  row.ok ? "font-bold text-[#22c55e]" : "text-[#3f3a52]"
                }`}
                aria-hidden
              >
                {row.ok ? "✓" : "·"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
