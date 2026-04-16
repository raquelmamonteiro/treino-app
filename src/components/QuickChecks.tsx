import type { LifeAppStateV1, QuickCheckId } from "../types";

const ITEMS: { id: QuickCheckId; label: string; emoji: string }[] = [
  { id: "skincare_am", label: "Skin manhã", emoji: "🌅" },
  { id: "skincare_pm", label: "Skin noite", emoji: "🌙" },
  { id: "food_ok", label: "Alimentação ok", emoji: "🥗" },
  { id: "no_smoke", label: "Não fumei", emoji: "🚭" },
  { id: "reading", label: "Leitura", emoji: "📖" },
  { id: "treino", label: "Treino", emoji: "🏋️" },
];

export function QuickChecksPanel({
  life,
  today,
  onToggle,
}: {
  life: LifeAppStateV1;
  today: string;
  onToggle: (id: QuickCheckId) => void;
}) {
  const day = life.quickChecks[today] || {};
  const done = ITEMS.filter((i) => day[i.id]).length;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6280]">Checks de hoje</h2>
        <span className="text-sm font-bold text-[#a78bfa]">
          {done}/{ITEMS.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map((item) => {
          const on = !!day[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`min-h-[52px] rounded-2xl border px-3 py-3 text-left text-sm font-bold transition ${
                on
                  ? "border-[#22c55e55] bg-[#22c55e22] text-[#86efac]"
                  : "border-[#1f1b2e] bg-[#13101e] text-[#b0a8c4] active:bg-[#1a1528]"
              }`}
            >
              <span className="mr-1.5">{item.emoji}</span>
              {on ? "✅ " : "☐ "}
              {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
