import { useCallback, useEffect, useRef, useState } from "react";
import { Layout, type LifeTab } from "./components/Layout";
import { HomeScreen } from "./components/HomeScreen";
import { ChecksTab } from "./components/ChecksTab";
import { SummaryTab } from "./components/SummaryTab";
import { SettingsTab } from "./components/SettingsTab";
import { loadTreinoState } from "./lib/treinoSync";
import type { TreinoData } from "./lib/treinoSync";
import { loadLifeState, scheduleSaveLifeState } from "./lib/lifeStorage";
import { todayISO } from "./lib/dates";
import { computeDailyScore } from "./lib/dailyScore";
import type { LifeAppStateV1, ModuleId } from "./types";
import TreinoApp from "./modules/treino/TreinoApp";
import TabagismoScreen from "./modules/tabagismo/TabagismoScreen";
import BelezaScreen from "./modules/beleza/BelezaScreen";
import AlimentacaoScreen from "./modules/alimentacao/AlimentacaoScreen";
import LeituraScreen from "./modules/leitura/LeituraScreen";
import SaudeScreen from "./modules/saude/SaudeScreen";
import TrabalhoScreen from "./modules/trabalho/TrabalhoScreen";
import FinancasScreen from "./modules/financas/FinancasScreen";
import EstudoScreen from "./modules/estudo/EstudoScreen";
import SonoScreen from "./modules/sono/SonoScreen";
import HidratacaoScreen from "./modules/hidratacao/HidratacaoScreen";
import JournalScreen from "./modules/journal/JournalScreen";
import MetasScreen from "./modules/metas/MetasScreen";
import VisionBoardScreen from "./modules/visionboard/VisionBoardScreen";
import TodosScreen from "./modules/todos/TodosScreen";

export default function App() {
  const [life, setLifeInner] = useState<LifeAppStateV1>(() => loadLifeState());
  const [tab, setTab] = useState<LifeTab>("home");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return localStorage.getItem("treino-theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [treinoData, setTreinoData] = useState<TreinoData | null>(null);
  const [module, setModule] = useState<ModuleId | null>(null);
  const treinoRef = useRef<TreinoData | null>(null);
  treinoRef.current = treinoData;

  const setLife = useCallback((fn: (p: LifeAppStateV1) => LifeAppStateV1) => {
    setLifeInner((p) => {
      let n = fn(p);
      const day = todayISO();
      const { total, max } = computeDailyScore(n, treinoRef.current?.log, day);
      const pct = max > 0 ? Math.round((total / max) * 100) : 0;
      n = { ...n, dailyScoreByDate: { ...n.dailyScoreByDate, [day]: pct } };
      scheduleSaveLifeState(n);
      return n;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("treino-theme", theme);
    } catch {
      /* ignore */
    }
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "light" ? "#ede9fe" : "#0c0a14");
  }, [theme]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { data } = await loadTreinoState();
      if (!cancel) setTreinoData(data);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void loadTreinoState().then(({ data }) => setTreinoData(data));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (module === "treino") {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0c0a14]">
        <header
          className="flex shrink-0 items-center gap-3 border-b border-[#1f1b2e] bg-[#13101e]/95 px-4 py-3 backdrop-blur-md"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            onClick={() => setModule(null)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#1f1b2e] bg-[#161321] text-lg font-bold text-[#a78bfa]"
          >
            ←
          </button>
          <span className="text-base font-black text-[#ede9f7]">Treino</span>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          <TreinoApp />
        </div>
      </div>
    );
  }

  if (module === "tabagismo") {
    return <TabagismoScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "beleza") {
    return <BelezaScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "alimentacao") {
    return <AlimentacaoScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "leitura") {
    return <LeituraScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "saude") {
    return <SaudeScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "trabalho") {
    return <TrabalhoScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "financas") {
    return <FinancasScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "estudo") {
    return <EstudoScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "sono") {
    return <SonoScreen life={life} setLife={setLife} onBack={() => setModule(null)} treinoLog={treinoData?.log} />;
  }
  if (module === "hidratacao") {
    return <HidratacaoScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "journal") {
    return <JournalScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "metas") {
    return <MetasScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "visionboard") {
    return <VisionBoardScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }
  if (module === "todos") {
    return <TodosScreen life={life} setLife={setLife} onBack={() => setModule(null)} />;
  }

  return (
    <Layout tab={tab} onTab={setTab}>
      {tab === "home" && (
        <HomeScreen
          life={life}
          setLife={setLife}
          treinoLog={treinoData?.log}
          treinoData={treinoData}
          onOpenModule={setModule}
          onOpenSettings={() => setTab("settings")}
        />
      )}
      {tab === "checks" && (
        <ChecksTab
          life={life}
          setLife={setLife}
          treinoLog={treinoData?.log}
          treinoData={treinoData}
          onOpenModule={setModule}
        />
      )}
      {tab === "summary" && <SummaryTab life={life} treinoLog={treinoData?.log} />}
      {tab === "settings" && <SettingsTab life={life} setLife={setLife} theme={theme} setTheme={setTheme} />}
    </Layout>
  );
}
