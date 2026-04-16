import { useMemo, useState } from "react";
import type { LifeAppStateV1, TodoDoneItem } from "../../types";

function newId() {
  return `td-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export default function TodosScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const [panel, setPanel] = useState<"active" | "history">("active");
  const [draft, setDraft] = useState("");

  const sortedDone = useMemo(() => {
    return [...life.todos.done].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  }, [life.todos.done]);

  function add() {
    const text = draft.trim();
    if (!text) return;
    const createdAt = new Date().toISOString();
    setLife((p) => ({
      ...p,
      todos: {
        active: [{ id: newId(), text, createdAt }, ...p.todos.active],
        done: p.todos.done,
      },
    }));
    setDraft("");
  }

  function complete(id: string) {
    setLife((p) => {
      const item = p.todos.active.find((x) => x.id === id);
      if (!item) return p;
      const done: TodoDoneItem = {
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
        completedAt: new Date().toISOString(),
      };
      return {
        ...p,
        todos: {
          active: p.todos.active.filter((x) => x.id !== id),
          done: [done, ...p.todos.done],
        },
      };
    });
  }

  function removeActive(id: string) {
    setLife((p) => ({
      ...p,
      todos: { ...p.todos, active: p.todos.active.filter((x) => x.id !== id) },
    }));
  }

  function removeDone(id: string) {
    if (!confirm("Remover esta entrada do histórico?")) return;
    setLife((p) => ({
      ...p,
      todos: { ...p.todos, done: p.todos.done.filter((x) => x.id !== id) },
    }));
  }

  return (
    <div className="min-h-dvh bg-[#0c0a14] px-4 pb-28 pt-4 text-[#ede9f7]">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>

      <h1 className="mb-1 text-2xl font-black">Tarefas ✅</h1>
      <p className="mb-6 text-sm text-[#6b6280]">Marque como feito — a tarefa vai para o histórico.</p>

      <div className="mb-6 flex rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-1">
        <button
          type="button"
          onClick={() => setPanel("active")}
          className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
            panel === "active" ? "bg-[#a78bfa33] text-[#c4b5fd]" : "text-[#6b6280]"
          }`}
        >
          A fazer ({life.todos.active.length})
        </button>
        <button
          type="button"
          onClick={() => setPanel("history")}
          className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
            panel === "history" ? "bg-[#a78bfa33] text-[#c4b5fd]" : "text-[#6b6280]"
          }`}
        >
          Histórico ({life.todos.done.length})
        </button>
      </div>

      {panel === "active" && (
        <>
          <div className="mb-4 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="O que precisa fazer?"
              className="min-h-[48px] flex-1 rounded-xl border border-[#1f1b2e] bg-[#161321] px-4 text-sm text-[#ede9f7] outline-none placeholder:text-[#4a4260]"
            />
            <button
              type="button"
              onClick={add}
              disabled={!draft.trim()}
              className="shrink-0 rounded-xl bg-linear-to-r from-[#a78bfa] to-[#7c3aed] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Adicionar
            </button>
          </div>

          {life.todos.active.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#2a2535] bg-[#13101e]/80 py-10 text-center text-sm text-[#5c5475]">
              Nada pendente. Adicione uma tarefa acima.
            </p>
          ) : (
            <ul className="space-y-2">
              {life.todos.active.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-2xl border border-[#1f1b2e] bg-[#13101e] px-3 py-3"
                >
                  <input
                    type="checkbox"
                    title="Marcar como feito"
                    aria-label={`Concluir: ${t.text}`}
                    className="mt-1.5 h-5 w-5 shrink-0 cursor-pointer rounded border-[#2a2535] bg-[#161321] accent-[#22c55e]"
                    onChange={() => complete(t.id)}
                  />
                  <p className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-snug text-[#ede9f7]">{t.text}</p>
                  <button
                    type="button"
                    title="Apagar"
                    onClick={() => removeActive(t.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-[#6b6280] hover:text-[#f87171]"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {panel === "history" && (
        <>
          {sortedDone.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#2a2535] bg-[#13101e]/80 py-10 text-center text-sm text-[#5c5475]">
              Ainda não há tarefas concluídas.
            </p>
          ) : (
            <ul className="space-y-2">
              {sortedDone.map((t) => (
                <li
                  key={t.id}
                  className="rounded-2xl border border-[#22c55e22] bg-[#22c55e0d] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-[#ede9f7] line-through opacity-90">{t.text}</p>
                      <p className="mt-1.5 text-xs text-[#6b6280]">
                        Concluída em {formatWhen(t.completedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Remover do histórico"
                      onClick={() => removeDone(t.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-[#6b6280] hover:text-[#f87171]"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
