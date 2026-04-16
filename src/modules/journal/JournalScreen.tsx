import { useMemo, useState } from "react";
import type { LifeAppStateV1, JournalEntry } from "../../types";
import { todayISO } from "../../lib/dates";

const MOODS = ["😫", "😢", "😐", "😊", "🤩"];
const TAGS = ["Pessoal", "Trabalho", "Reflexão", "Ideia", "Gratidão"];

function newId() {
  return `j-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function JournalScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const [view, setView] = useState<"list" | "new">("list");
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<number | null>(null);

  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [text, setText] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [b3, setB3] = useState("");
  const [selTags, setSelTags] = useState<Record<string, boolean>>({});

  const sorted = useMemo(() => {
    let e = [...life.journal.entries];
    if (q.trim()) {
      const qq = q.toLowerCase();
      e = e.filter((x) => x.text.toLowerCase().includes(qq));
    }
    if (tagFilter) e = e.filter((x) => x.tags.includes(tagFilter));
    if (moodFilter != null) e = e.filter((x) => x.mood === moodFilter);
    e.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return e;
  }, [life.journal.entries, q, tagFilter, moodFilter]);

  function toggleTag(t: string) {
    setSelTags((s) => ({ ...s, [t]: !s[t] }));
  }

  function save() {
    const today = todayISO();
    const entry: JournalEntry = {
      id: newId(),
      date: today,
      createdAt: new Date().toISOString(),
      mood,
      text: text.trim(),
      boas: b1 || b2 || b3 ? ([b1.trim(), b2.trim(), b3.trim()] as [string, string, string]) : undefined,
      tags: TAGS.filter((t) => selTags[t]),
    };
    setLife((p) => ({
      ...p,
      journal: { entries: [entry, ...p.journal.entries] },
    }));
    setText("");
    setB1("");
    setB2("");
    setB3("");
    setSelTags({});
    setMood(3);
    setView("list");
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c0a14] px-4 pb-28 pt-4 text-[#ede9f7]">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Journal 📝</h1>
        {view === "list" ? (
          <button
            type="button"
            onClick={() => setView("new")}
            className="rounded-2xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] px-4 py-2 text-sm font-bold text-[#0c0a14]"
          >
            + Nova
          </button>
        ) : (
          <button type="button" onClick={() => setView("list")} className="text-sm font-bold text-[#a78bfa]">
            Lista
          </button>
        )}
      </div>

      {view === "list" && (
        <>
          <div className="mb-4 space-y-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar no texto..."
              className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={tagFilter ?? ""}
                onChange={(e) => setTagFilter(e.target.value || null)}
                className="rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 py-2 text-xs"
              >
                <option value="">Todas as tags</option>
                {TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={moodFilter ?? ""}
                onChange={(e) => setMoodFilter(e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 py-2 text-xs"
              >
                <option value="">Todo humor</option>
                {MOODS.map((e, i) => (
                  <option key={e} value={i + 1}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="space-y-3">
            {sorted.map((en) => (
              <li key={en.id} className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-2xl">{MOODS[en.mood - 1]}</span>
                  <span className="text-xs text-[#6b6280]">{en.date}</span>
                </div>
                <p className="line-clamp-4 text-sm text-[#b0a8c4]">{en.text || "(sem texto)"}</p>
                {en.tags.length > 0 && (
                  <p className="mt-2 text-[10px] text-[#a78bfa]">{en.tags.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
          {sorted.length === 0 && <p className="text-center text-sm text-[#4a4260]">Nenhuma entrada.</p>}
        </>
      )}

      {view === "new" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-[#6b6280]">Humor</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((e, i) => {
                const v = (i + 1) as 1 | 2 | 3 | 4 | 5;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMood(v)}
                    className={`min-h-[48px] min-w-[48px] rounded-2xl border text-2xl ${
                      mood === v ? "border-[#a78bfa] bg-[#a78bfa33]" : "border-[#2a2535] bg-[#161321]"
                    }`}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-[#6b6280]">Texto livre</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-[#1f1b2e] bg-[#161321] p-3 text-sm outline-none"
              placeholder="Como foi o dia?"
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-[#6b6280]">3 coisas boas (opcional)</p>
            <input
              value={b1}
              onChange={(e) => setB1(e.target.value)}
              className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm"
              placeholder="1."
            />
            <input
              value={b2}
              onChange={(e) => setB2(e.target.value)}
              className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm"
              placeholder="2."
            />
            <input
              value={b3}
              onChange={(e) => setB3(e.target.value)}
              className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm"
              placeholder="3."
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-[#6b6280]">Tags</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    selTags[t] ? "border-[#a78bfa] bg-[#a78bfa33]" : "border-[#2a2535] text-[#b0a8c4]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14]"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
