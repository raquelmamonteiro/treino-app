import { useMemo, useState } from "react";
import type { LifeAppStateV1, MetaCategoria, MetaItem, MetaProgressoTipo } from "../../types";

const CATS: MetaCategoria[] = ["Saude", "Carreira", "Financeiro", "Pessoal", "Educacao", "Fitness"];

function newId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MetasScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const [showDone, setShowDone] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<MetaCategoria>("Saude");
  const [deadline, setDeadline] = useState(() => new Date().toISOString().slice(0, 10));
  const [ptype, setPtype] = useState<MetaProgressoTipo>("checkbox");
  const [target, setTarget] = useState("30");
  const [current, setCurrent] = useState("0");

  const active = useMemo(() => life.metas.items.filter((m) => !m.done), [life.metas.items]);
  const done = useMemo(() => life.metas.items.filter((m) => m.done), [life.metas.items]);

  function addMeta() {
    if (!title.trim()) return;
    const item: MetaItem = {
      id: newId(),
      title: title.trim(),
      category: cat,
      deadline,
      progressType: ptype,
      done: false,
      subtasks: [],
    };
    if (ptype === "numerico") {
      item.target = Math.max(1, parseInt(target, 10) || 1);
      item.current = Math.max(0, parseInt(current, 10) || 0);
    }
    setLife((p) => ({ ...p, metas: { items: [...p.metas.items, item] } }));
    setTitle("");
    setCreating(false);
  }

  function toggleDone(id: string) {
    setLife((p) => ({
      ...p,
      metas: {
        items: p.metas.items.map((m) => (m.id === id ? { ...m, done: !m.done } : m)),
      },
    }));
  }

  function patchMeta(id: string, patch: Partial<MetaItem>) {
    setLife((p) => ({
      ...p,
      metas: { items: p.metas.items.map((m) => (m.id === id ? { ...m, ...patch } : m)) },
    }));
  }

  function progressPct(m: MetaItem): number {
    if (m.progressType === "checkbox") return m.done ? 100 : 0;
    const t = m.target ?? 1;
    const c = m.current ?? 0;
    return Math.min(100, Math.round((c / t) * 100));
  }

  function deleteMeta(id: string) {
    if (!confirm("Apagar esta meta?")) return;
    setLife((p) => ({ ...p, metas: { items: p.metas.items.filter((x) => x.id !== id) } }));
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c0a14] px-4 pb-28 pt-4 text-[#ede9f7]">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Metas 🎯</h1>
        <button
          type="button"
          onClick={() => setCreating(!creating)}
          className="rounded-2xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] px-4 py-2 text-sm font-bold text-[#0c0a14]"
        >
          + Nova
        </button>
      </div>

      {creating && (
        <div className="mb-6 space-y-3 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da meta"
            className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm"
          />
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as MetaCategoria)}
            className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm"
          >
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="block text-xs text-[#6b6280]">
            Prazo
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPtype("checkbox")}
              className={`flex-1 rounded-xl border py-2 text-xs font-bold ${
                ptype === "checkbox" ? "border-[#a78bfa] bg-[#a78bfa22]" : "border-[#2a2535]"
              }`}
            >
              Checkbox
            </button>
            <button
              type="button"
              onClick={() => setPtype("numerico")}
              className={`flex-1 rounded-xl border py-2 text-xs font-bold ${
                ptype === "numerico" ? "border-[#a78bfa] bg-[#a78bfa22]" : "border-[#2a2535]"
              }`}
            >
              Numérico
            </button>
          </div>
          {ptype === "numerico" && (
            <div className="flex gap-2">
              <input
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Atual"
                className="flex-1 rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 py-2 text-sm"
              />
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Meta"
                className="flex-1 rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 py-2 text-sm"
              />
            </div>
          )}
          <button type="button" onClick={addMeta} className="w-full rounded-xl bg-[#22c55e] py-3 font-bold text-[#0c0a14]">
            Criar
          </button>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6280]">Ativas</h2>
        {active.map((m) => (
          <MetaCard
            key={m.id}
            m={m}
            pct={progressPct(m)}
            onToggleDone={() => toggleDone(m.id)}
            onPatch={(patch) => patchMeta(m.id, patch)}
            onDelete={() => deleteMeta(m.id)}
          />
        ))}
        {active.length === 0 && <p className="text-sm text-[#4a4260]">Sem metas ativas.</p>}
      </section>

      <section className="mt-8">
        <button
          type="button"
          onClick={() => setShowDone(!showDone)}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-3 text-left text-sm font-bold"
        >
          Concluídas ({done.length})
          <span>{showDone ? "▲" : "▼"}</span>
        </button>
        {showDone && (
          <ul className="space-y-2 opacity-70">
            {done.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-xl border border-[#2a2535] px-3 py-2 text-sm">
                <span className="line-through">{m.title}</span>
                <button type="button" onClick={() => toggleDone(m.id)} className="text-[#a78bfa]">
                  reabrir
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetaCard({
  m,
  pct,
  onToggleDone,
  onPatch,
  onDelete,
}: {
  m: MetaItem;
  pct: number;
  onToggleDone: () => void;
  onPatch: (patch: Partial<MetaItem>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{m.title}</p>
          <p className="text-[10px] text-[#6b6280]">
            {m.category} · até {m.deadline}
          </p>
        </div>
        <button type="button" onClick={onToggleDone} className="text-xs font-bold text-[#22c55e]">
          ✓
        </button>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#1f1b2e]">
        <div className="h-full rounded-full bg-[#a78bfa]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mb-2 text-xs text-[#6b6280]">{pct}%</p>
      {m.progressType === "numerico" && (
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => onPatch({ current: Math.max(0, (m.current ?? 0) - 1) })}
            className="rounded-lg border border-[#2a2535] px-3 py-1"
          >
            −
          </button>
          <span className="text-sm">
            {m.current ?? 0} / {m.target ?? 1}
          </span>
          <button
            type="button"
            onClick={() => onPatch({ current: Math.min(m.target ?? 1, (m.current ?? 0) + 1) })}
            className="rounded-lg border border-[#2a2535] px-3 py-1"
          >
            +
          </button>
        </div>
      )}
      <button type="button" onClick={onDelete} className="text-xs text-[#ef4444]">
        Apagar
      </button>
    </div>
  );
}
