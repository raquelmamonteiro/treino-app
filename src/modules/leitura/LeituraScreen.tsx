import { useMemo, useState } from "react";
import type { BookType, LifeAppStateV1 } from "../../types";
import { todayISO } from "../../lib/dates";
import { readingStreak, totalReadingMinutesInMonth } from "../../lib/readingStats";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `w-${Date.now()}`;
}

export default function LeituraScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const t = todayISO();
  const ym = t.slice(0, 7);
  const L = life.leitura;
  const todayMin = L.dailyMinutes[t] ?? 0;

  const [wishDraft, setWishDraft] = useState("");

  const streak = useMemo(() => readingStreak(L.dailyMinutes), [L.dailyMinutes]);
  const monthMin = useMemo(() => totalReadingMinutesInMonth(L.dailyMinutes, ym), [L.dailyMinutes, ym]);

  function patchLeitura(patch: Partial<LifeAppStateV1["leitura"]>) {
    setLife((p) => ({ ...p, leitura: { ...p.leitura, ...patch } }));
  }

  function addMinutes(n: number) {
    if (n <= 0) return;
    setLife((p) => {
      const cur = p.leitura.dailyMinutes[t] ?? 0;
      return {
        ...p,
        leitura: {
          ...p.leitura,
          dailyMinutes: { ...p.leitura.dailyMinutes, [t]: cur + n },
        },
      };
    });
  }

  function addWish() {
    const title = wishDraft.trim();
    if (!title) return;
    patchLeitura({
      wishlist: [...L.wishlist, { id: newId(), title }],
    });
    setWishDraft("");
  }

  const types: { id: BookType; label: string }[] = [
    { id: "physical", label: "Livro físico" },
    { id: "kindle", label: "Kindle" },
    { id: "audiobook", label: "Audiobook" },
  ];

  return (
    <div className="min-h-dvh bg-[#0c0a14] px-4 pb-28 pt-4">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black text-[#ede9f7]">📖 Leitura</h1>
      <p className="mb-6 text-sm text-[#6b6280]">Livro atual, meta diária e minutos.</p>

      <div className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Livro atual</p>
        <label className="mb-2 block text-xs text-[#5c5475]">Título</label>
        <input
          className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-3 text-[#ede9f7] outline-none"
          value={L.currentTitle}
          onChange={(e) => patchLeitura({ currentTitle: e.target.value })}
          placeholder="Nome do livro"
        />
        <p className="mb-2 text-xs text-[#5c5475]">Formato</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {types.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => patchLeitura({ bookType: x.id })}
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-bold ${
                L.bookType === x.id ? "border-[#a78bfa] bg-[#1a1528] text-[#ede9f7]" : "border-[#1f1b2e] text-[#6b6280]"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#5c5475]">Página</label>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7] outline-none"
              value={L.pageCurrent || ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                patchLeitura({ pageCurrent: v === "" ? 0 : Math.max(0, parseInt(v, 10) || 0) });
              }}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#5c5475]">Total págs.</label>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7] outline-none"
              value={L.pageTotal ?? ""}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value.trim();
                patchLeitura({ pageTotal: v === "" ? null : Math.max(0, parseInt(v, 10) || 0) });
              }}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6b6280]">Hoje</p>
          <p className="text-2xl font-black text-[#c4b5fd]">
            {todayMin} <span className="text-sm font-bold text-[#6b6280]">min</span>
          </p>
        </div>
        <p className="mb-3 text-xs text-[#5c5475]">
          Meta: {L.dailyGoalMinutes} min/dia · Streak: {streak > 0 ? `${streak} dia${streak === 1 ? "" : "s"}` : "—"}
        </p>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 25].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => addMinutes(n)}
              className="min-h-[44px] min-w-[72px] rounded-xl border border-[#a78bfa44] bg-[#1d1735] px-3 py-2 text-sm font-bold text-[#c4b5fd] active:bg-[#2a2540]"
            >
              +{n} min
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs text-[#5c5475]">Meta diária (minutos)</label>
        <input
          inputMode="numeric"
          className="mt-1 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7] outline-none"
          value={L.dailyGoalMinutes}
          onChange={(e) => patchLeitura({ dailyGoalMinutes: Math.max(1, parseInt(e.target.value, 10) || 20) })}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Este mês</p>
        <p className="text-3xl font-black text-[#a78bfa]">
          {monthMin} <span className="text-lg text-[#6b6280]">min</span>
        </p>
      </div>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Quero ler</p>
        <div className="mb-3 flex gap-2">
          <input
            className="min-h-[44px] flex-1 rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 text-[#ede9f7] outline-none"
            value={wishDraft}
            onChange={(e) => setWishDraft(e.target.value)}
            placeholder="Título"
            onKeyDown={(e) => e.key === "Enter" && addWish()}
          />
          <button
            type="button"
            onClick={addWish}
            className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] px-4 font-bold text-[#0c0a14]"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {L.wishlist.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm"
            >
              <span>{w.title}</span>
              <button
                type="button"
                className="text-[#ef4444]"
                onClick={() => patchLeitura({ wishlist: L.wishlist.filter((x) => x.id !== w.id) })}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
