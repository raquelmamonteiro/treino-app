import { useState } from "react";
import type { LifeAppStateV1 } from "../types";
import { loadLifeState, saveLifeState } from "../lib/lifeStorage";

export function SettingsTab({
  life,
  setLife,
  theme,
  setTheme,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  function exportJson() {
    const data = loadLifeState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `raquel-life-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Exportação pronta.");
    setTimeout(() => setMsg(null), 2500);
  }

  function importJson(f: File | null) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result)) as LifeAppStateV1;
        if (parsed.v !== 1) throw new Error("versão");
        saveLifeState(parsed);
        setMsg("Importado. Recarregue a página.");
      } catch {
        setMsg("Ficheiro inválido.");
      }
      setTimeout(() => setMsg(null), 3000);
    };
    r.readAsText(f);
  }

  const w = life.wearable;

  function connectTerra(label: string) {
    setLife((p) => ({
      ...p,
      wearable: {
        ...p.wearable,
        provider: "terra",
        connectedLabel: label,
        lastSyncISO: new Date().toISOString(),
      },
    }));
    setMsg("Modo demo: ligação simulada. Configure Terra API no backend para dados reais.");
    setTimeout(() => setMsg(null), 4000);
  }

  function disconnect() {
    setLife((p) => ({
      ...p,
      wearable: {
        ...p.wearable,
        provider: "none",
        connectedLabel: undefined,
        lastSyncISO: undefined,
      },
    }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black">Configurações</h1>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-sm font-bold text-[#c4b5fd]">Hidratação</p>
        <label className="mb-2 block text-xs text-[#6b6280]">Meta diária (copos)</label>
        <input
          type="number"
          min={4}
          max={16}
          value={life.hidratacao.metaCopos}
          onChange={(e) =>
            setLife((p) => ({
              ...p,
              hidratacao: { ...p.hidratacao, metaCopos: Math.max(1, parseInt(e.target.value, 10) || 8) },
            }))
          }
          className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
        />
        <label className="mb-2 block text-xs text-[#6b6280]">Ml por copo</label>
        <input
          type="number"
          min={100}
          max={500}
          step={50}
          value={life.hidratacao.mlPerCopo}
          onChange={(e) =>
            setLife((p) => ({
              ...p,
              hidratacao: { ...p.hidratacao, mlPerCopo: Math.max(50, parseInt(e.target.value, 10) || 250) },
            }))
          }
          className="w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-[#ede9f7]"
        />
      </div>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-sm font-bold text-[#c4b5fd]">⌚ Relógio (Terra API)</p>
        <p className="mb-3 text-xs text-[#6b6280]">
          Integração recomendada: crie conta em tryterra.co, configure webhook no Supabase e ligue a API key. Aqui simula
          ligação para testar UI.
        </p>
        {w.provider === "terra" && w.connectedLabel ? (
          <>
            <p className="mb-2 text-sm text-[#86efac]">
              🟢 {w.connectedLabel}
              {w.lastSyncISO && (
                <span className="block text-xs text-[#6b6280]">Último sync: {new Date(w.lastSyncISO).toLocaleString("pt-BR")}</span>
              )}
            </p>
            <button type="button" onClick={disconnect} className="mb-4 text-sm font-bold text-[#f59e0b]">
              Desligar
            </button>
          </>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => connectTerra("Garmin Forerunner (demo)")}
              className="min-h-[44px] rounded-xl border border-[#2a2535] bg-[#161321] font-bold text-[#ede9f7]"
            >
              Conectar Garmin
            </button>
            <button
              type="button"
              onClick={() => connectTerra("Apple Watch (demo)")}
              className="min-h-[44px] rounded-xl border border-[#2a2535] bg-[#161321] font-bold text-[#ede9f7]"
            >
              Conectar Apple Watch
            </button>
          </div>
        )}
        <div className="space-y-2 text-sm">
          {(
            [
              ["pullSleep", "Puxar sono automaticamente"],
              ["pullCalories", "Puxar calorias de treino"],
              ["pullSteps", "Puxar passos"],
              ["pullRestingHr", "Puxar FC em repouso"],
            ] as const
          ).map(([k, lab]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={!!w[k]}
                onChange={(e) => setLife((p) => ({ ...p, wearable: { ...p.wearable, [k]: e.target.checked } }))}
                className="h-4 w-4 accent-[#a78bfa]"
              />
              {lab}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-sm font-bold text-[#c4b5fd]">Tema</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`min-h-[44px] flex-1 rounded-xl border px-4 py-2 font-bold ${
              theme === "dark" ? "border-[#a78bfa] bg-[#1a1528] text-[#ede9f7]" : "border-[#1f1b2e] text-[#6b6280]"
            }`}
          >
            Escuro
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`min-h-[44px] flex-1 rounded-xl border px-4 py-2 font-bold ${
              theme === "light" ? "border-[#a78bfa] bg-[#1a1528] text-[#ede9f7]" : "border-[#1f1b2e] text-[#6b6280]"
            }`}
          >
            Claro
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-2 text-sm font-bold text-[#c4b5fd]">Dados (vida)</p>
        <p className="mb-3 text-xs text-[#6b6280]">Backup do painel — treino continua na sua própria sincronização.</p>
        <button
          type="button"
          onClick={exportJson}
          className="mb-2 min-h-[44px] w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] py-3 font-bold text-[#0c0a14]"
        >
          Exportar JSON
        </button>
        <label className="block min-h-[44px] w-full cursor-pointer rounded-xl border border-[#2a2535] py-3 text-center font-bold text-[#b0a8c4]">
          Importar JSON
          <input type="file" accept="application/json" className="hidden" onChange={(e) => importJson(e.target.files?.[0] || null)} />
        </label>
        {msg && <p className="mt-2 text-center text-sm text-[#a78bfa]">{msg}</p>}
      </div>

      <p className="text-center text-xs text-[#4a4260]">Raquel — Gestão de Vida · dados no dispositivo + Supabase (treino)</p>
    </div>
  );
}
