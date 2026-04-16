import { useMemo, useState } from "react";
import type { LifeAppStateV1, TemaPendenteStatus, TemaPrioridade } from "../../types";
import { todayISO } from "../../lib/dates";
import { horasEstudoMes, horasEstudoSemanaAtual, studyStreak } from "../../lib/estudoStats";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `e-${Date.now()}`;
}

const TAGS = ["Medicina", "Programação", "MBA", "Inglês", "Outro"];

export default function EstudoScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const E = life.estudo;
  const today = todayISO();
  const ym = today.slice(0, 7);

  const [tema, setTema] = useState("");
  const [horas, setHoras] = useState("1");
  const [tags, setTags] = useState<string[]>([]);
  const [date, setDate] = useState(today);

  const [tTitulo, setTTitulo] = useState("");
  const [tPri, setTPri] = useState<TemaPrioridade>("media");

  const hMes = useMemo(() => horasEstudoMes(E.sessoes, ym), [E.sessoes, ym]);
  const hSem = useMemo(() => horasEstudoSemanaAtual(E.sessoes), [E.sessoes]);
  const streak = useMemo(() => studyStreak(E.sessoes), [E.sessoes]);
  const meta = E.metaHorasSemana;

  const sessoesMes = useMemo(
    () => [...E.sessoes].filter((s) => s.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date)),
    [E.sessoes, ym],
  );

  function toggleTag(t: string) {
    setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));
  }

  function addSessao() {
    const h = Math.max(0, parseFloat(String(horas).replace(",", ".")) || 0);
    if (!tema.trim() || h <= 0) return;
    setLife((p) => ({
      ...p,
      estudo: {
        ...p.estudo,
        sessoes: [
          ...p.estudo.sessoes,
          { id: newId(), date, tema: tema.trim(), horas: h, tags: tags.length ? tags : ["Outro"] },
        ],
      },
    }));
    setTema("");
    setHoras("1");
    setTags([]);
  }

  function addTemaPendente() {
    if (!tTitulo.trim()) return;
    setLife((p) => ({
      ...p,
      estudo: {
        ...p.estudo,
        temas: [
          ...p.estudo.temas,
          { id: newId(), titulo: tTitulo.trim(), status: "pendente", prioridade: tPri },
        ],
      },
    }));
    setTTitulo("");
  }

  function patchTema(id: string, patch: Partial<{ status: TemaPendenteStatus; prioridade: TemaPrioridade }>) {
    setLife((p) => ({
      ...p,
      estudo: {
        ...p.estudo,
        temas: p.estudo.temas.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      },
    }));
  }

  function delTema(id: string) {
    setLife((p) => ({
      ...p,
      estudo: { ...p.estudo, temas: p.estudo.temas.filter((t) => t.id !== id) },
    }));
  }

  const pctSem = meta > 0 ? Math.min(100, Math.round((hSem / meta) * 100)) : 0;

  return (
    <div className="min-h-dvh bg-[#0c0a14] px-4 pb-28 pt-4">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black text-[#ede9f7]">📚 Estudo</h1>
      <p className="mb-6 text-sm text-[#6b6280]">Horas, temas e meta semanal.</p>

      <div className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Resumo</p>
        <p className="text-2xl font-black text-[#c4b5fd]">{hMes.toFixed(1)} h este mês</p>
        <p className="mt-1 text-sm text-[#6b6280]">
          Semana: {hSem.toFixed(1)} h / meta {meta} h · Streak {streak > 0 ? `${streak} dia${streak === 1 ? "" : "s"}` : "—"}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#161321]">
          <div className="h-full rounded-full bg-[#a78bfa]" style={{ width: `${pctSem}%` }} />
        </div>
        <label className="mt-4 mb-1 block text-xs text-[#5c5475]">Meta horas / semana</label>
        <input
          inputMode="numeric"
          className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
          value={meta}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(",", ".")) || 0;
            setLife((p) => ({ ...p, estudo: { ...p.estudo, metaHorasSemana: Math.max(1, v) } }));
          }}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Nova sessão</p>
        <label className="mb-1 block text-xs text-[#5c5475]">Data</label>
        <input
          type="date"
          className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
          placeholder="Tema / matéria"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
        />
        <label className="mb-1 block text-xs text-[#5c5475]">Horas</label>
        <input
          inputMode="decimal"
          className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
        />
        <p className="mb-2 text-xs text-[#5c5475]">Tags</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={`min-h-[36px] rounded-xl border px-3 text-xs font-bold ${
                tags.includes(t) ? "border-[#a78bfa] bg-[#1a1528]" : "border-[#1f1b2e] text-[#6b6280]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={addSessao}
          className="min-h-[48px] w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14]"
        >
          Registar sessão
        </button>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Sessões (mês)</p>
        <ul className="space-y-2">
          {sessoesMes.map((s) => (
            <li key={s.id} className="rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm">
              <span className="text-[#6b6280]">{s.date}</span> · <span className="font-bold text-[#ede9f7]">{s.tema}</span> · {s.horas}h ·{" "}
              {s.tags.join(", ")}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Temas pendentes</p>
        <div className="mb-3 flex gap-2">
          <input
            className="min-h-[44px] flex-1 rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 text-[#ede9f7]"
            placeholder="Novo tema"
            value={tTitulo}
            onChange={(e) => setTTitulo(e.target.value)}
          />
          <select
            className="rounded-xl border border-[#1f1b2e] bg-[#161321] px-2 text-sm text-[#ede9f7]"
            value={tPri}
            onChange={(e) => setTPri(e.target.value as TemaPrioridade)}
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
        <button
          type="button"
          onClick={addTemaPendente}
          className="mb-4 min-h-[44px] w-full rounded-xl border border-[#2a2535] font-bold text-[#c4b5fd]"
        >
          Adicionar tema
        </button>
        <ul className="space-y-2">
          {E.temas.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-[#ede9f7]">{t.titulo}</span>
                <button type="button" className="text-xs text-[#ef4444]" onClick={() => delTema(t.id)}>
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["pendente", "andamento", "concluido"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patchTema(t.id, { status: s })}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                      t.status === s ? "border-[#a78bfa] bg-[#1a1528]" : "border-[#1f1b2e] text-[#6b6280]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
