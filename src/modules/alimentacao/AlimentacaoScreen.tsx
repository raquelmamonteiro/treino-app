import { useMemo, useState } from "react";
import type { LifeAppStateV1, MealEntry, MealScore, MealSlot, SuplementoConfig } from "../../types";
import { todayISO } from "../../lib/dates";
import { streakClean } from "../../lib/mealStreaks";

const MEALS: { slot: MealSlot; label: string; emoji: string }[] = [
  { slot: "cafe", label: "Café da manhã", emoji: "☀️" },
  { slot: "lanche_am", label: "Lanche da manhã", emoji: "🍎" },
  { slot: "almoco", label: "Almoço", emoji: "🍽️" },
  { slot: "lanche_pm", label: "Lanche da tarde", emoji: "🍌" },
  { slot: "jantar", label: "Jantar", emoji: "🌙" },
  { slot: "ceia", label: "Ceia", emoji: "🫖" },
];

const BROKEN_TAGS = ["Glúten", "Açúcar", "Álcool", "Fritura", "Processado", "Fast food"];

function newSuppId() {
  return `s-${Date.now()}`;
}

export default function AlimentacaoScreen({
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
  const [editing, setEditing] = useState<MealSlot | null>(null);
  const [scorePick, setScorePick] = useState<MealScore | null>(null);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newSuppName, setNewSuppName] = useState("");
  const [newSuppSlot, setNewSuppSlot] = useState<SuplementoConfig["slot"]>("manha");
  const [jejumPick, setJejumPick] = useState(false);

  const mealsToday = life.alimentacao.meals[today] || {};
  const registered = MEALS.filter((m) => mealsToday[m.slot]?.score || mealsToday[m.slot]?.jejum).length;

  const streakG = streakClean(life.alimentacao.meals, today, "gluten");
  const streakS = streakClean(life.alimentacao.meals, today, "sugar");
  const streakA = streakClean(life.alimentacao.meals, today, "alcohol");

  const recordG = Math.max(life.alimentacao.recordGluten ?? 0, streakG);
  const recordS = Math.max(life.alimentacao.recordSugar ?? 0, streakS);
  const recordA = Math.max(life.alimentacao.recordAlcohol ?? 0, streakA);

  const suppList = life.alimentacao.supplementsList;
  const suppToday = life.alimentacao.supplementChecks[today] || {};

  const adherence = useMemo(() => {
    let ok = 0;
    let total = 0;
    const [y, m] = ym.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    for (let d = 1; d <= last; d++) {
      const iso = `${ym}-${String(d).padStart(2, "0")}`;
      if (iso > today) break;
      const ch = life.alimentacao.supplementChecks[iso];
      if (!ch || !suppList.length) continue;
      total++;
      if (suppList.every((s) => ch[s.id])) ok++;
    }
    const pct = total ? Math.round((ok / total) * 100) : 0;
    return { ok, total, pct };
  }, [life.alimentacao.supplementChecks, suppList, ym, today]);

  function openEdit(slot: MealSlot) {
    const cur = mealsToday[slot];
    setEditing(slot);
    const isJ = !!cur?.jejum;
    setJejumPick(isJ);
    setScorePick(isJ ? null : cur?.score ?? null);
    setNote(cur?.note ?? "");
    setTags(cur?.brokenTags ?? []);
  }

  function toggleBroken(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function saveMeal() {
    if (!editing) return;
    if (!jejumPick && !scorePick) return;
    setLife((p) => {
      const prev = p.alimentacao;
      const entry: MealEntry = jejumPick
        ? { jejum: true, note: note.trim() || undefined }
        : {
            score: scorePick!,
            note: note.trim() || undefined,
            brokenTags: scorePick !== "saudavel" && tags.length ? tags : undefined,
          };
      const meals = {
        ...prev.meals,
        [today]: { ...prev.meals[today], [editing]: entry },
      };
      const g = streakClean(meals, today, "gluten");
      const s = streakClean(meals, today, "sugar");
      const a = streakClean(meals, today, "alcohol");
      const bt = !jejumPick && "brokenTags" in entry ? entry.brokenTags : undefined;
      return {
        ...p,
        alimentacao: {
          ...prev,
          meals,
          recordGluten: Math.max(prev.recordGluten ?? 0, g),
          recordSugar: Math.max(prev.recordSugar ?? 0, s),
          recordAlcohol: Math.max(prev.recordAlcohol ?? 0, a),
          lastGlutenBreak: g === 0 && bt?.some((x) => /glúten|gluten/i.test(x)) ? today : prev.lastGlutenBreak,
          lastSugarBreak: s === 0 && bt?.some((x) => /açúcar|acucar/i.test(x)) ? today : prev.lastSugarBreak,
          lastAlcoholBreak: a === 0 && bt?.some((x) => /álcool|alcool/i.test(x)) ? today : prev.lastAlcoholBreak,
        },
      };
    });
    setEditing(null);
  }

  function setSuppCheck(id: string, v: boolean) {
    setLife((p) => ({
      ...p,
      alimentacao: {
        ...p.alimentacao,
        supplementChecks: {
          ...p.alimentacao.supplementChecks,
          [today]: { ...(p.alimentacao.supplementChecks[today] || {}), [id]: v },
        },
      },
    }));
  }

  function addSupplement() {
    if (!newSuppName.trim()) return;
    const id = newSuppId();
    setLife((p) => ({
      ...p,
      alimentacao: {
        ...p.alimentacao,
        supplementsList: [...p.alimentacao.supplementsList, { id, name: newSuppName.trim(), slot: newSuppSlot }],
      },
    }));
    setNewSuppName("");
  }

  function removeSupplement(id: string) {
    const name = suppList.find((s) => s.id === id)?.name ?? "este suplemento";
    if (!confirm(`Remover "${name}"? O histórico de marcações deste item será apagado.`)) return;
    setLife((p) => {
      const nextChecks: Record<string, Record<string, boolean>> = {};
      for (const [d, ch] of Object.entries(p.alimentacao.supplementChecks)) {
        if (!ch || typeof ch !== "object") continue;
        const { [id]: _, ...rest } = ch;
        if (Object.keys(rest).length > 0) nextChecks[d] = rest;
      }
      return {
        ...p,
        alimentacao: {
          ...p.alimentacao,
          supplementsList: p.alimentacao.supplementsList.filter((s) => s.id !== id),
          supplementChecks: nextChecks,
        },
      };
    });
  }

  const placar = MEALS.map((m) => {
    const e = mealsToday[m.slot];
    if (e?.jejum) return "🌙";
    const sc = e?.score;
    if (!sc) return "⬜";
    if (sc === "saudavel") return "🟢";
    if (sc === "media") return "🟡";
    return "🔴";
  }).join("");

  return (
    <div className="min-h-[100dvh] bg-[#0c0a14] px-4 pb-28 pt-4 text-[#ede9f7]">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black">Alimentação 🥗</h1>
      <p className="mb-4 text-sm text-[#6b6280]">
        Hoje: {registered}/6 refeições · Placar: {placar}
      </p>

      <section className="mb-6 space-y-2">
        {MEALS.map((m) => {
          const e = mealsToday[m.slot];
          return (
            <button
              key={m.slot}
              type="button"
              onClick={() => openEdit(m.slot)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-4 py-3 text-left active:bg-[#1a1528]"
            >
              <span>
                <span className="mr-2">{m.emoji}</span>
                <span className="font-bold">{m.label}</span>
              </span>
              <span className="text-xs text-[#a78bfa]">
                {e?.jejum
                  ? "🌙 Jejum"
                  : !e?.score
                    ? "[registrar]"
                    : e.score === "saudavel"
                      ? "🟢 Saudável"
                      : e.score === "media"
                        ? "🟡 Média"
                        : "🔴"}
              </span>
            </button>
          );
        })}
      </section>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 font-bold">Refeição ou jejum</p>
            <button
              type="button"
              onClick={() => {
                setJejumPick(true);
                setScorePick(null);
              }}
              className={`mb-4 min-h-[48px] w-full rounded-xl border-2 border-dashed font-bold ${
                jejumPick ? "border-[#38bdf8] bg-[#38bdf822] text-[#7dd3fc]" : "border-[#2a2535] bg-[#161321] text-[#b0a8c4]"
              }`}
            >
              🌙 Jejum (sem esta refeição)
            </button>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-[#6b6280]">Ou qualidade da refeição</p>
            <div className="mb-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  setJejumPick(false);
                  setScorePick("saudavel");
                }}
                className={`min-h-[48px] rounded-xl font-bold ${!jejumPick && scorePick === "saudavel" ? "bg-[#22c55e] text-[#0c0a14]" : "bg-[#161321]"}`}
              >
                🟢 Saudável
              </button>
              <button
                type="button"
                onClick={() => {
                  setJejumPick(false);
                  setScorePick("media");
                }}
                className={`min-h-[48px] rounded-xl font-bold ${!jejumPick && scorePick === "media" ? "bg-[#eab308] text-[#0c0a14]" : "bg-[#161321]"}`}
              >
                🟡 Média
              </button>
              <button
                type="button"
                onClick={() => {
                  setJejumPick(false);
                  setScorePick("ruim");
                }}
                className={`min-h-[48px] rounded-xl font-bold ${!jejumPick && scorePick === "ruim" ? "bg-[#ef4444] text-[#0c0a14]" : "bg-[#161321]"}`}
              >
                🔴 Chutei o balde
              </button>
            </div>
            {!jejumPick && scorePick && scorePick !== "saudavel" && (
              <div className="mb-3">
                <p className="mb-2 text-xs text-[#6b6280]">Tags (restrição quebrada)</p>
                <div className="flex flex-wrap gap-2">
                  {BROKEN_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleBroken(t)}
                      className={`rounded-full border px-2 py-1 text-xs font-bold ${
                        tags.includes(t) ? "border-[#ef4444] bg-[#ef444422]" : "border-[#2a2535]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mb-1 text-xs text-[#6b6280]">{jejumPick ? "Nota (opcional)" : "O que comeu? (opcional)"}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mb-4 min-h-[72px] w-full rounded-xl border border-[#1f1b2e] bg-[#161321] p-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-xl border border-[#2a2535] py-3 font-bold">
                Cancelar
              </button>
              <button
                type="button"
                disabled={!jejumPick && !scorePick}
                onClick={saveMeal}
                className="flex-1 rounded-xl bg-[#a78bfa] py-3 font-bold text-[#0c0a14] disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mb-6 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6280]">Streaks</h2>
        <StreakLine label="Sem glúten" value={streakG} record={recordG} color="#a78bfa" />
        <StreakLine label="Sem açúcar" value={streakS} record={recordS} color="#f59e0b" />
        <StreakLine label="Sem álcool" value={streakA} record={recordA} color="#06b6d4" />
      </section>

      <section className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <h2 className="mb-3 font-bold">💊 Suplementos de hoje</h2>
        {suppList.length === 0 ? (
          <p className="mb-3 text-sm text-[#6b6280]">Nenhum suplemento na lista — adicione abaixo.</p>
        ) : (
          <ul className="space-y-2">
            {suppList.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!suppToday[s.id]}
                    onChange={(e) => setSuppCheck(s.id, e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#a78bfa]"
                  />
                  <span className="min-w-0 truncate">{s.name}</span>
                </label>
                <span className="shrink-0 text-[10px] capitalize text-[#6b6280]">{s.slot}</span>
                <button
                  type="button"
                  title="Remover da lista"
                  aria-label={`Remover ${s.name}`}
                  onClick={() => removeSupplement(s.id)}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-[#6b6280] hover:bg-[#2a1518] hover:text-[#f87171]"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <input
            value={newSuppName}
            onChange={(e) => setNewSuppName(e.target.value)}
            placeholder="Novo suplemento"
            className="flex-1 rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 py-2 text-sm"
          />
          <select
            value={newSuppSlot}
            onChange={(e) => setNewSuppSlot(e.target.value as SuplementoConfig["slot"])}
            className="rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 text-xs"
          >
            <option value="manha">manhã</option>
            <option value="almoco">almoço</option>
            <option value="noite">noite</option>
          </select>
        </div>
        <button type="button" onClick={addSupplement} className="mt-2 w-full rounded-xl border border-[#a78bfa] py-2 text-sm font-bold text-[#a78bfa]">
          + Adicionar suplemento
        </button>
        <p className="mt-3 text-xs text-[#6b6280]">
          Aderência este mês: {adherence.ok}/{adherence.total || 1} dias cheios ({adherence.pct}%)
        </p>
      </section>

      <MonthFoodGrid meals={life.alimentacao.meals} ym={ym} today={today} />
    </div>
  );
}

function StreakLine({ label, value, record, color }: { label: string; value: number; record: number; color: string }) {
  return (
    <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold">{label}</span>
        <span className="text-2xl font-black tabular-nums" style={{ color }}>
          {value}
          <span className="text-sm text-[#6b6280]"> dias</span>
        </span>
      </div>
      <p className="mt-1 text-xs text-[#6b6280]">Recorde: {record} dias</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1f1b2e]">
        <div className="h-full rounded-full bg-[#a78bfa]" style={{ width: `${Math.min(100, (value / 30) * 100)}%` }} />
      </div>
    </div>
  );
}

function MonthFoodGrid({ meals, ym, today }: { meals: LifeAppStateV1["alimentacao"]["meals"]; ym: string; today: string }) {
  const cells = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const out: { day: number; tone: "g" | "y" | "r" | "x" | "j" }[] = [];
    for (let d = 1; d <= last; d++) {
      const iso = `${ym}-${String(d).padStart(2, "0")}`;
      const dayMeals = meals[iso];
      let tone: "g" | "y" | "r" | "x" | "j" = "x";
      if (dayMeals) {
        const vals = Object.values(dayMeals);
        const hasAny = vals.some((e) => e?.score || e?.jejum);
        if (!hasAny) tone = "x";
        else {
          const entries = vals.filter((e) => e?.score);
          if (entries.length === 0) tone = "j";
          else {
            const anyBad = entries.some((e) => e!.score === "ruim");
            const anyMed = entries.some((e) => e!.score === "media");
            if (anyBad) tone = "r";
            else if (anyMed) tone = "y";
            else if (entries.every((e) => e!.score === "saudavel")) tone = "g";
            else tone = "y";
          }
        }
      }
      out.push({ day: d, tone });
    }
    return out;
  }, [meals, ym]);

  const bg: Record<string, string> = {
    g: "bg-[#22c55e44] border-[#22c55e]",
    y: "bg-[#eab30833] border-[#eab308]",
    r: "bg-[#ef444422] border-[#ef4444]",
    j: "bg-[#38bdf822] border-[#38bdf8]",
    x: "bg-[#161321] border-[#2a2535]",
  };

  return (
    <section className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
      <h2 className="mb-3 font-bold">Este mês — resumo</h2>
      <div className="flex flex-wrap gap-1">
        {cells.map((c) => {
          const iso = `${ym}-${String(c.day).padStart(2, "0")}`;
          const isToday = iso === today;
          return (
            <div
              key={c.day}
              className={`flex h-8 w-8 items-center justify-center rounded border text-[10px] font-bold ${bg[c.tone]} ${
                isToday ? "ring-2 ring-[#a78bfa]" : ""
              }`}
            >
              {c.day}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[#4a4260]">
        🟢 só saudável · 🟡 média · 🔴 ruim · azul só jejum · cinza sem dados
      </p>
    </section>
  );
}
