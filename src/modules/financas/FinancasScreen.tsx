import { useMemo, useState } from "react";
import type { DespesaCategoria, LifeAppStateV1 } from "../../types";
import { todayISO } from "../../lib/dates";
import {
  totalDespesasMes,
  despesasPorCategoria,
  top3Despesas,
  categoriasComAlertaSubida,
  prevMonthYm,
} from "../../lib/financasStats";
import { parseDespesasFromCSV } from "../../lib/csvDespesas";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `d-${Date.now()}`;
}

const CATS: DespesaCategoria[] = [
  "Moradia",
  "Mercado",
  "Transporte",
  "Saude",
  "Beleza",
  "Roupas",
  "Assinaturas",
  "Lazer",
  "Educacao",
  "Outros",
];

type Sec = "dash" | "gastos" | "meta";

export default function FinancasScreen({
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
  const prevYm = prevMonthYm(ym);
  const F = life.financas;

  const [sec, setSec] = useState<Sec>("dash");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState<DespesaCategoria>("Mercado");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const total = useMemo(() => totalDespesasMes(F.despesas, ym), [F.despesas, ym]);
  const totalPrev = useMemo(() => totalDespesasMes(F.despesas, prevYm), [F.despesas, prevYm]);
  const porCat = useMemo(() => despesasPorCategoria(F.despesas, ym), [F.despesas, ym]);
  const top3 = useMemo(() => top3Despesas(F.despesas, ym), [F.despesas, ym]);
  const alertas = useMemo(() => categoriasComAlertaSubida(F.despesas, ym), [F.despesas, ym]);

  const meta = F.metaEconomiaMensal;
  const progressPct = meta > 0 ? Math.min(100, Math.round((total / meta) * 100)) : 0;

  const listaMes = useMemo(
    () => [...F.despesas].filter((d) => d.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date)),
    [F.despesas, ym],
  );

  function addDespesa() {
    const raw = parseFloat(String(amount).replace(/\./g, "").replace(",", "."));
    if (!isFinite(raw) || raw <= 0) return;
    setLife((p) => ({
      ...p,
      financas: {
        ...p.financas,
        despesas: [
          ...p.financas.despesas,
          { id: newId(), date, amount: raw, category: cat, note: note.trim() || undefined },
        ],
      },
    }));
    setAmount("");
    setNote("");
  }

  function remove(id: string) {
    setLife((p) => ({
      ...p,
      financas: { ...p.financas, despesas: p.financas.despesas.filter((x) => x.id !== id) },
    }));
  }

  function onCsvFile(f: File | null) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const text = String(r.result);
        const rows = parseDespesasFromCSV(text);
        if (!rows.length) {
          setImportMsg("Nenhuma linha válida.");
          return;
        }
        setLife((p) => {
          const novos = rows.map((row) => ({
            id: newId(),
            date: row.date,
            amount: row.amount,
            category: "Outros" as DespesaCategoria,
            note: `CSV: ${row.note}`,
          }));
          return {
            ...p,
            financas: { ...p.financas, despesas: [...p.financas.despesas, ...novos] },
          };
        });
        setImportMsg(`${rows.length} linha(s) importada(s) como “Outros”.`);
      } catch {
        setImportMsg("Erro ao ler ficheiro.");
      }
      setTimeout(() => setImportMsg(null), 4000);
    };
    r.readAsText(f);
  }

  const tabs: { id: Sec; label: string }[] = [
    { id: "dash", label: "Resumo" },
    { id: "gastos", label: "Gastos" },
    { id: "meta", label: "Meta" },
  ];

  return (
    <div className="min-h-dvh bg-[#0c0a14] px-4 pb-28 pt-4">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>
      <h1 className="mb-2 text-2xl font-black text-[#ede9f7]">💰 Finanças</h1>
      <p className="mb-4 text-sm text-[#6b6280]">Gastos, resumo e importação CSV simples.</p>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setSec(x.id)}
            className={`min-h-[44px] shrink-0 rounded-xl border px-4 text-sm font-bold ${
              sec === x.id ? "border-[#a78bfa] bg-[#1a1528] text-[#ede9f7]" : "border-[#1f1b2e] text-[#6b6280]"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {sec === "dash" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="text-xs uppercase tracking-wider text-[#6b6280]">Gasto total (mês)</p>
            <p className="text-3xl font-black text-[#f59e0b]">
              R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-[#6b6280]">
              Mês anterior: R$ {totalPrev.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{" "}
              {totalPrev > 0 ? (
                <span className={total > totalPrev ? "text-[#ef4444]" : "text-[#22c55e]"}>
                  ({total > totalPrev ? "+" : ""}
                  {(((total - totalPrev) / totalPrev) * 100).toFixed(0)}%)
                </span>
              ) : (
                total > 0 && <span className="text-[#6b6280]"> (sem dados mês ant.)</span>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Por categoria</p>
            <ul className="space-y-2 text-sm">
              {CATS.map((c) =>
                porCat[c] > 0 ? (
                  <li key={c} className="flex justify-between border-b border-[#1f1b2e]/60 pb-2">
                    <span className="text-[#b0a8c4]">{c}</span>
                    <span className="font-bold text-[#ede9f7]">R$ {porCat[c].toFixed(2)}</span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>

          {top3.length > 0 && (
            <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Top 3 gastos</p>
              <ul className="space-y-2 text-sm">
                {top3.map((d) => (
                  <li key={d.id} className="flex justify-between">
                    <span className="truncate text-[#b0a8c4]">{d.note || d.category}</span>
                    <span className="font-bold text-[#ede9f7]">R$ {d.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alertas.length > 0 && (
            <div className="rounded-2xl border border-[#f59e0b44] bg-[#f59e0b12] p-4">
              <p className="mb-2 text-xs font-bold text-[#fcd34d]">Alertas (vs mês anterior)</p>
              <ul className="space-y-1 text-xs text-[#fde68a]">
                {alertas.map((a) => (
                  <li key={a.category}>
                    {a.category}: R$ {a.atual.toFixed(0)} vs R$ {a.anterior.toFixed(0)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {sec === "gastos" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Novo gasto</p>
            <label className="mb-1 block text-xs text-[#5c5475]">Data</label>
            <input
              type="date"
              className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <label className="mb-1 block text-xs text-[#5c5475]">Valor (R$)</label>
            <input
              inputMode="decimal"
              className="mb-2 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="mb-2 text-xs text-[#5c5475]">Categoria</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`min-h-[36px] rounded-xl border px-2 text-[11px] font-bold ${
                    cat === c ? "border-[#a78bfa] bg-[#1a1528]" : "border-[#1f1b2e] text-[#6b6280]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
              placeholder="Nota opcional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              onClick={addDespesa}
              className="min-h-[48px] w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] font-bold text-[#0c0a14]"
            >
              Registar
            </button>
          </div>

          <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Importar CSV</p>
            <p className="mb-2 text-xs text-[#4a4260]">
              Formato: data (AAAA-MM-DD ou DD/MM/AAAA), valor, descrição. Separador ; ou vírgula.
            </p>
            <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#2a2535] text-sm text-[#a78bfa]">
              Escolher ficheiro .csv
              <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => onCsvFile(e.target.files?.[0] || null)} />
            </label>
            {importMsg && <p className="mt-2 text-center text-sm text-[#a78bfa]">{importMsg}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b6280]">Este mês</p>
            <ul className="space-y-2">
              {listaMes.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-2 rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm">
                  <div>
                    <span className="text-[#6b6280]">{d.date}</span>
                    <p className="font-bold text-[#ede9f7]">
                      {d.category} · R$ {d.amount.toFixed(2)}
                    </p>
                    {d.note && <p className="text-xs text-[#6b6280]">{d.note}</p>}
                  </div>
                  <button type="button" className="text-xs text-[#ef4444]" onClick={() => remove(d.id)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {sec === "meta" && (
        <div className="space-y-4 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
          <p className="text-sm text-[#6b6280]">
            Teto de referência para gastos do mês (alerta quando ultrapassar).
          </p>
          <label className="mb-1 block text-xs text-[#5c5475]">Teto mensal de gastos (R$)</label>
          <input
            inputMode="numeric"
            className="mb-4 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
            value={meta}
            onChange={(e) => {
              const v = parseFloat(e.target.value.replace(",", ".")) || 0;
              setLife((p) => ({ ...p, financas: { ...p.financas, metaEconomiaMensal: Math.max(0, v) } }));
            }}
          />
          <p className="mb-2 text-xs text-[#6b6280]">Progresso do gasto atual vs meta</p>
          <div className="h-3 overflow-hidden rounded-full bg-[#161321]">
            <div
              className={`h-full rounded-full transition-all ${progressPct > 100 ? "bg-[#ef4444]" : "bg-[#22c55e]"}`}
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
          <p className="text-center text-sm text-[#ede9f7]">
            {progressPct}% da meta · R$ {total.toFixed(0)} / R$ {meta.toFixed(0)}
          </p>
          {progressPct > 100 && (
            <p className="text-center text-xs text-[#f59e0b]">Acima da meta — revista categorias no resumo.</p>
          )}
        </div>
      )}
    </div>
  );
}
