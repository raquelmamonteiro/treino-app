import type { LifeAppStateV1, QuickCheckId } from "../types";
import type { ModuleId } from "../types";
import { computeDailyScore } from "../lib/dailyScore";

const ROWS: {
  key: QuickCheckId;
  label: string;
  module: ModuleId;
  directToggle?: boolean;
}[] = [
  { key: "no_smoke", label: "🚭 Não fumei", module: "tabagismo", directToggle: true },
  { key: "gut_ok", label: "💩 Intestino ok", module: "saude", directToggle: true },
  { key: "food_ok", label: "🥗 Alimentação", module: "alimentacao" },
  { key: "skincare_am", label: "☀️ Skin AM", module: "beleza" },
  { key: "skincare_pm", label: "🌙 Skin PM", module: "beleza" },
  { key: "treino", label: "🏋️ Treino", module: "treino" },
  { key: "reading", label: "📖 Leitura", module: "leitura" },
  { key: "supplements", label: "💊 Suplem.", module: "alimentacao" },
  { key: "vision_board", label: "🌟 Vision Board", module: "visionboard" },
];

export function DerivedQuickPanel({
  life,
  today,
  treinoLog,
  onOpenModule,
  onToggleDirect,
}: {
  life: LifeAppStateV1;
  today: string;
  treinoLog: unknown[] | undefined;
  onOpenModule: (m: ModuleId) => void;
  onToggleDirect: (id: "no_smoke" | "gut_ok") => void;
}) {
  const { lines } = computeDailyScore(life, treinoLog, today);
  const map = new Map(lines.map((l) => [l.key, l.ok] as const));

  const keyToScore: Partial<Record<QuickCheckId, boolean>> = {
    skincare_am: map.get("skincare_am"),
    skincare_pm: map.get("skincare_pm"),
    food_ok: map.get("food_ok"),
    no_smoke: map.get("no_smoke"),
    reading: map.get("reading"),
    treino: map.get("workout"),
    supplements: map.get("supplements"),
    gut_ok: map.get("gut_ok"),
    vision_board: map.get("vision_board"),
  };

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Checks de hoje</h2>
      <p className="mb-3 text-xs text-[#4a4260]">🚭 e intestino marcam com 1 toque; os outros abrem o módulo (check vem dos dados).</p>
      <div className="grid grid-cols-2 gap-2">
        {ROWS.map((row) => {
          const on = !!keyToScore[row.key];
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => {
                if (row.directToggle) onToggleDirect(row.key as "no_smoke" | "gut_ok");
                else onOpenModule(row.module);
              }}
              className={`min-h-[52px] rounded-2xl border px-3 py-3 text-left text-sm font-bold transition ${
                on
                  ? "border-[#22c55e55] bg-[#22c55e22] text-[#86efac]"
                  : "border-[#1f1b2e] bg-[#13101e] text-[#b0a8c4] active:bg-[#1a1528]"
              }`}
            >
              <span className="mr-1">{on ? "✅" : "❌"}</span>
              {row.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
