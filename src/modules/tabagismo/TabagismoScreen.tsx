import { useMemo, useState } from "react";
import type { LifeAppStateV1 } from "../../types";
import { todayISO, daysBetween } from "../../lib/dates";

const MILESTONES = [
  { days: 1, label: "1 dia", tip: "Primeiro passo dado." },
  { days: 3, label: "3 dias", tip: "Nicotina em queda no sangue." },
  { days: 7, label: "1 semana", tip: "Circulação a melhorar." },
  { days: 14, label: "2 semanas", tip: "Função pulmonar em subida." },
  { days: 30, label: "1 mês", tip: "Tosse e falta de ar diminuem." },
  { days: 90, label: "3 meses", tip: "Ritmo cardíaco mais estável." },
  { days: 365, label: "1 ano", tip: "Risco cardíaco cai ~50%." },
];

const TIPS = [
  "Respire fundo 10 vezes.",
  "Beba um copo de água.",
  "Caminhe 5 minutos.",
  "Ligue a alguém por 2 minutos.",
];

export default function TabagismoScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const today = todayISO();
  const [tip, setTip] = useState<string | null>(null);

  const { days, hours, totalHours } = useMemo(() => {
    const start = new Date(life.tabagismo.quitStartDate + "T00:00:00").getTime();
    const now = Date.now();
    const ms = Math.max(0, now - start);
    const th = ms / 3600000;
    const d = Math.floor(th / 24);
    const h = Math.floor(th % 24);
    return { days: d, hours: h, totalHours: th };
  }, [life.tabagismo.quitStartDate]);

  const hue = useMemo(() => {
    if (days < 1) return "#ef4444";
    if (days < 7) return "#f97316";
    if (days < 30) return "#eab308";
    return "#22c55e";
  }, [days]);

  const savedMoney = useMemo(() => {
    const cigs = life.tabagismo.cigarettesPerDay;
    const pack = life.tabagismo.packPrice;
    const perCig = pack / 20;
    return Math.round(totalHours / 24) * cigs * perCig;
  }, [life.tabagismo, totalHours]);

  const yearProj = useMemo(() => {
    const cigs = life.tabagismo.cigarettesPerDay;
    const pack = life.tabagismo.packPrice;
    return Math.round(365 * cigs * (pack / 20));
  }, [life.tabagismo]);

  function recordCraving() {
    setLife((p) => ({
      ...p,
      tabagismo: {
        ...p.tabagismo,
        cravings: [...p.tabagismo.cravings, new Date().toISOString()],
      },
    }));
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    setTimeout(() => setTip(null), 4000);
  }

  function relapse() {
    if (!confirm("Registar recaída? O contador recomeça — o histórico fica guardado.")) return;
    setLife((p) => {
      const prev = { ...p.tabagismo };
      const attempts = [...prev.attempts];
      const last = attempts[attempts.length - 1];
      if (last && !last.end) last.end = today;
      attempts.push({ start: today });
      const qc = { ...(p.quickChecks[today] || {}), no_smoke: false };
      return {
        ...p,
        tabagismo: {
          ...prev,
          quitStartDate: today,
          attempts,
        },
        quickChecks: { ...p.quickChecks, [today]: qc },
      };
    });
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c0a14] px-4 pb-28 pt-4 text-[#ede9f7]">
      <button type="button" onClick={onBack} className="mb-4 min-h-[44px] text-[#a78bfa]">
        ← Painel
      </button>

      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[#6b6280]">Sem fumar</p>
        <p className="mt-2 text-6xl font-black tabular-nums" style={{ color: hue }}>
          {days}
          <span className="text-3xl text-[#6b6280]">d</span> {hours}
          <span className="text-3xl text-[#6b6280]">h</span>
        </p>
        <p className="mt-2 text-xs text-[#4a4260]">Desde {life.tabagismo.quitStartDate}</p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="text-sm text-[#6b6280]">Economia estimada</p>
        <p className="text-2xl font-black text-[#c4b5fd]">
          R$ {savedMoney.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <p className="mt-1 text-xs text-[#4a4260]">~R$ {yearProj.toLocaleString("pt-BR")} num ano se mantiver</p>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b6280]">Marcos</p>
        <ul className="space-y-2">
          {MILESTONES.map((m) => {
            const ok = days >= m.days;
            return (
              <li
                key={m.days}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${ok ? "border-[#22c55e44] bg-[#22c55e11]" : "border-[#1f1b2e] opacity-50"}`}
              >
                <span>{ok ? "✅" : "○"}</span>
                <div>
                  <p className="font-bold">{m.label}</p>
                  <p className="text-xs text-[#6b6280]">{m.tip}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={recordCraving}
          className="min-h-[48px] rounded-2xl border border-[#a78bfa44] bg-[#1a1528] py-3 font-bold text-[#c4b5fd]"
        >
          Tive vontade agora
        </button>
        {tip && <p className="text-center text-sm text-[#a78bfa]">{tip}</p>}

        <button type="button" onClick={relapse} className="min-h-[48px] rounded-2xl border border-[#ef444444] py-3 text-sm font-bold text-[#f87171]">
          Fumei hoje — registar recaída
        </button>
      </div>

      <p className="mt-6 text-center text-xs italic text-[#4a4260]">Cada tentativa conta. Recomeçar é parte do caminho.</p>
    </div>
  );
}
