import { useMemo, useState } from "react";
import type { ErroLogCategoria, LifeAppStateV1, PlantaoTipo } from "../../types";
import { todayISO } from "../../lib/dates";
import {
  totalGanhoMes,
  totalHorasMes,
  mediaHorasSemanaMes,
  plantoesDoMes,
  valorHoraDerivado,
} from "../../lib/trabalhoStats";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}`;
}

const PROD_TAGS = ["Plantão", "Orba", "Estudo", "Admin"];
const ERRO_CAT: ErroLogCategoria[] = ["Clínico", "Administrativo", "Comunicação", "Técnico"];

type Sec = "plantoes" | "prod" | "erros";

export default function TrabalhoScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const t = life.trabalho;
  const today = todayISO();
  const ym = today.slice(0, 7);
  const [sec, setSec] = useState<Sec>("plantoes");
  const [q, setQ] = useState("");

  const [date, setDate] = useState(today);
  const [local, setLocal] = useState(t.defaultLocal);
  const [tipo, setTipo] = useState<PlantaoTipo>("diurno");
  const [horas, setHoras] = useState("6");
  /** Valor total pago pelo plantão (R$) */
  const [valorTotal, setValorTotal] = useState("");

  const [nota, setNota] = useState<number | "">("");
  const [pTags, setPTags] = useState<string[]>([]);

  const [eDesc, setEDesc] = useState("");
  const [eApr, setEApr] = useState("");
  const [eEv, setEEv] = useState("");
  const [eCat, setECat] = useState<ErroLogCategoria>("Clínico");

  const hMes = useMemo(() => totalHorasMes(t.plantoes, ym), [t.plantoes, ym]);
  const gMes = useMemo(() => totalGanhoMes(t.plantoes, ym), [t.plantoes, ym]);
  const hSemMed = useMemo(() => mediaHorasSemanaMes(t.plantoes, ym), [t.plantoes, ym]);
  const ultimos = useMemo(() => [...plantoesDoMes(t.plantoes, ym)].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12), [t.plantoes, ym]);

  const prodToday = t.produtividade[today] || {};
  const errosF = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [...t.erros].sort((a, b) => b.date.localeCompare(a.date));
    return t.erros
      .filter(
        (e) =>
          e.descricao.toLowerCase().includes(s) ||
          e.aprendizado.toLowerCase().includes(s) ||
          e.evitar.toLowerCase().includes(s),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [t.erros, q]);

  function addPlantao() {
    const h = Math.max(0, parseFloat(String(horas).replace(",", ".")) || 0);
    const total = Math.max(0, parseFloat(String(valorTotal).replace(",", ".")) || 0);
    const loc = local.trim() || "Plantão";
    const vh = h > 0 ? Math.round((total / h) * 100) / 100 : 0;
    setLife((p) => ({
      ...p,
      trabalho: {
        ...p.trabalho,
        defaultLocal: loc,
        plantoes: [
          ...p.trabalho.plantoes,
          { id: newId(), date, local: loc, tipo, horas: h, valorTotal: total, valorHora: vh },
        ],
      },
    }));
    setValorTotal("");
  }

  function saveProd() {
    setLife((p) => ({
      ...p,
      trabalho: {
        ...p.trabalho,
        produtividade: {
          ...p.trabalho.produtividade,
          [today]: {
            nota1a5: nota === "" ? undefined : Number(nota),
            tags: pTags.length ? pTags : undefined,
          },
        },
      },
    }));
  }

  function togglePTag(tag: string) {
    setPTags((x) => (x.includes(tag) ? x.filter((y) => y !== tag) : [...x, tag]));
  }

  function addErro() {
    if (!eDesc.trim()) return;
    setLife((p) => ({
      ...p,
      trabalho: {
        ...p.trabalho,
        erros: [
          {
            id: newId(),
            date: today,
            descricao: eDesc.trim(),
            aprendizado: eApr.trim(),
            evitar: eEv.trim(),
            categoria: eCat,
          },
          ...p.trabalho.erros,
        ],
      },
    }));
    setEDesc("");
    setEApr("");
    setEEv("");
  }

  function delErro(id: string) {
    setLife((p) => ({
      ...p,
      trabalho: { ...p.trabalho, erros: p.trabalho.erros.filter((e) => e.id !== id) },
    }));
  }

  const tabs: { id: Sec; label: string }[] = [
    { id: "plantoes", label: "Plantões" },
    { id: "prod", label: "Produtividade" },
    { id: "erros", label: "Erros" },
  ];

  function goTab(s: Sec) {
    setSec(s);
    if (s === "prod") {
      const d = life.trabalho.produtividade[today];
      setNota(d?.nota1a5 ?? "");
      setPTags(d?.tags ?? []);
    }
  }

  return (
    <div className="min-h-dvh bg-[#0c0a14] px-4 pb-28 pt-4">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black text-[#ede9f7]">💼 Trabalho</h1>
      <p className="mb-4 text-sm text-[#6b6280]">Plantões, produtividade e aprendizados.</p>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => goTab(x.id)}
            className={`min-h-[44px] shrink-0 rounded-xl border px-4 text-sm font-bold ${
              sec === x.id ? "border-[#a78bfa] bg-[#1a1528] text-[#ede9f7]" : "border-[#1f1b2e] text-[#6b6280]"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {sec === "plantoes" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Este mês</p>
            <p className="text-2xl font-black text-[#c4b5fd]">{hMes.toFixed(1)} h</p>
            <p className="mt-1 text-sm text-[#6b6280]">Ganho ~ R$ {gMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            {hMes > 0 && (
              <p className="mt-1 text-xs text-[#a78bfa]">
                Média ~ R${" "}
                {(gMes / hMes).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/h (total ÷ horas no mês)
              </p>
            )}
            <p className="text-xs text-[#4a4260]">Média ~{hSemMed} h/semana (mês)</p>
          </div>
          <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Novo plantão</p>
            <label className="mb-1 block text-xs text-[#5c5475]">Data</label>
            <input
              type="date"
              className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <label className="mb-1 block text-xs text-[#5c5475]">Local</label>
            <input
              className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Hospital / serviço"
            />
            <div className="mb-2 flex gap-2">
              {(["diurno", "noturno"] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setTipo(x)}
                  className={`min-h-[40px] flex-1 rounded-xl border text-xs font-bold ${
                    tipo === x ? "border-[#a78bfa] bg-[#1a1528]" : "border-[#1f1b2e] text-[#6b6280]"
                  }`}
                >
                  {x === "diurno" ? "Diurno" : "Noturno"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[#5c5475]">Horas</label>
                <input
                  inputMode="decimal"
                  className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[#5c5475]">Valor total (R$)</label>
                <input
                  inputMode="decimal"
                  className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  placeholder="Ex: 2400"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#4a4260]">
              O valor por hora (produtividade em R$/h) é calculado automaticamente: total ÷ horas.
            </p>
            <button
              type="button"
              onClick={addPlantao}
              className="mt-4 min-h-[48px] w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14]"
            >
              Guardar plantão
            </button>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Recentes (mês)</p>
            <ul className="space-y-2">
              {ultimos.map((p) => (
                <li key={p.id} className="rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm">
                  <span className="font-bold text-[#ede9f7]">{p.date}</span> · {p.local} · {p.tipo} · {p.horas}h · R${" "}
                  {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total · ~
                  {valorHoraDerivado(p).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/h
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {sec === "prod" && (
        <div className="space-y-4 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
          <p className="text-sm text-[#6b6280]">Como foi o dia ({today})?</p>
          <p className="mb-2 text-xs text-[#5c5475]">Dia produtivo (1–5)</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-black ${
                  nota === n ? "border-[#a78bfa] bg-[#1a1528] text-[#ede9f7]" : "border-[#1f1b2e] text-[#6b6280]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs text-[#5c5475]">Tags</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {PROD_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => togglePTag(tag)}
                className={`min-h-[40px] rounded-xl border px-3 text-xs font-bold ${
                  pTags.includes(tag) ? "border-[#a78bfa] bg-[#1a1528]" : "border-[#1f1b2e] text-[#6b6280]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {prodToday.nota1a5 != null && (
            <p className="mb-2 text-xs text-[#6b6280]">Guardado: nota {prodToday.nota1a5}</p>
          )}
          <button
            type="button"
            onClick={saveProd}
            className="min-h-[48px] w-full rounded-xl bg-[#1d1735] font-bold text-[#c4b5fd]"
          >
            Guardar hoje
          </button>
        </div>
      )}

      {sec === "erros" && (
        <div className="space-y-4">
          <input
            className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-3 text-[#ede9f7]"
            placeholder="Pesquisar nos registos…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Novo registo</p>
            <textarea
              className="mb-2 min-h-[72px] w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              placeholder="O que aconteceu?"
              value={eDesc}
              onChange={(e) => setEDesc(e.target.value)}
            />
            <textarea
              className="mb-2 min-h-[56px] w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              placeholder="O que aprendi"
              value={eApr}
              onChange={(e) => setEApr(e.target.value)}
            />
            <textarea
              className="mb-2 min-h-[56px] w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              placeholder="Como evitar"
              value={eEv}
              onChange={(e) => setEEv(e.target.value)}
            />
            <div className="mb-3 flex flex-wrap gap-2">
              {ERRO_CAT.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setECat(c)}
                  className={`min-h-[36px] rounded-xl border px-2 text-[11px] font-bold ${
                    eCat === c ? "border-[#a78bfa] bg-[#1a1528]" : "border-[#1f1b2e] text-[#6b6280]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addErro}
              disabled={!eDesc.trim()}
              className="min-h-[48px] w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14] disabled:opacity-40"
            >
              Adicionar
            </button>
          </div>
          <ul className="space-y-3">
            {errosF.map((e) => (
              <li key={e.id} className="rounded-2xl border border-[#1f1b2e] bg-[#161321] p-3 text-sm">
                <div className="mb-1 flex justify-between text-xs text-[#6b6280]">
                  <span>{e.date}</span>
                  <span>{e.categoria}</span>
                </div>
                <p className="font-bold text-[#ede9f7]">{e.descricao}</p>
                {e.aprendizado && <p className="mt-1 text-[#a78bfa]">✓ {e.aprendizado}</p>}
                {e.evitar && <p className="mt-1 text-[#6b6280]">→ {e.evitar}</p>}
                <button type="button" className="mt-2 text-xs text-[#ef4444]" onClick={() => delErro(e.id)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
