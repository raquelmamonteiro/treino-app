import type {
  LifeAppStateV1,
  TabagismoState,
  BelezaState,
  AlimentacaoState,
  LeituraState,
  SaudeState,
  TrabalhoState,
  FinancasState,
  EstudoState,
  SonoState,
  HidratacaoState,
  JournalState,
  MetasState,
  TodosState,
  WearableState,
  VisionBoardState,
  PlantaoEntry,
} from "../types";
import { todayISO, addDays } from "./dates";

function migratePlantoes(list: unknown): PlantaoEntry[] {
  if (!Array.isArray(list)) return [];
  return list.map((raw) => {
    const p = raw as Partial<PlantaoEntry> & { valorTotal?: number };
    const horas = typeof p.horas === "number" ? Math.max(0, p.horas) : 0;
    const oldVh = typeof p.valorHora === "number" ? Math.max(0, p.valorHora) : 0;
    const valorTotal =
      typeof p.valorTotal === "number" && !Number.isNaN(p.valorTotal) ? Math.max(0, p.valorTotal) : horas * oldVh;
    const valorHora = horas > 0 ? Math.round((valorTotal / horas) * 100) / 100 : oldVh;
    return {
      id: String(p.id || `p-${Date.now()}-${Math.random()}`),
      date: String(p.date || todayISO()),
      local: String(p.local || ""),
      tipo: p.tipo === "noturno" ? "noturno" : "diurno",
      horas,
      valorTotal,
      valorHora,
    };
  });
}

const KEY = "raquel-life-v1";

function defaultTabagismo(): TabagismoState {
  const t = todayISO();
  const start = addDays(t, -3);
  return {
    quitStartDate: start,
    cigarettesPerDay: 10,
    packPrice: 18,
    attempts: [{ start }],
    cravings: [],
  };
}

function defaultBeleza(): BelezaState {
  return {
    morning: [
      { id: "1", label: "Limpeza", product: "" },
      { id: "2", label: "Tônico", product: "" },
      { id: "3", label: "Sérum vit. C", product: "" },
      { id: "4", label: "Hidratante", product: "" },
      { id: "5", label: "Protetor solar", product: "" },
    ],
    night: [
      { id: "n1", label: "Demaquilante", product: "" },
      { id: "n2", label: "Limpeza", product: "" },
      { id: "n3", label: "Tônico", product: "" },
      { id: "n4", label: "Retinol/ácido", product: "" },
      { id: "n5", label: "Hidratante", product: "" },
    ],
    log: {},
    agendaLastDone: {},
  };
}

function defaultAlimentacao(): AlimentacaoState {
  return {
    streakGlutenFree: 0,
    streakSugarFree: 0,
    streakAlcoholFree: 3,
    daily: {},
    meals: {},
    supplementsList: [
      { id: "s1", name: "Vitamina D", slot: "manha" },
      { id: "s2", name: "Ômega 3", slot: "almoco" },
      { id: "s3", name: "Magnésio", slot: "noite" },
    ],
    supplementChecks: {},
  };
}

function defaultLeitura(): LeituraState {
  return {
    currentTitle: "",
    bookType: "physical",
    pageCurrent: 0,
    pageTotal: null,
    dailyMinutes: {},
    dailyGoalMinutes: 20,
    wishlist: [],
  };
}

function defaultSaude(): SaudeState {
  return { consultas: [] };
}

function defaultTrabalho(): TrabalhoState {
  return {
    defaultValorHora: 80,
    defaultLocal: "",
    plantoes: [],
    produtividade: {},
    erros: [],
  };
}

function defaultFinancas(): FinancasState {
  return {
    despesas: [],
    metaEconomiaMensal: 2000,
  };
}

function defaultEstudo(): EstudoState {
  return {
    sessoes: [],
    temas: [],
    metaHorasSemana: 10,
  };
}

function defaultSono(): SonoState {
  return { log: {} };
}

function defaultHidratacao(): HidratacaoState {
  return { coposByDate: {}, metaCopos: 8, mlPerCopo: 250 };
}

function defaultJournal(): JournalState {
  return { entries: [] };
}

function defaultTodos(): TodosState {
  return { active: [], done: [] };
}

function defaultMetas(): MetasState {
  return {
    items: [
      {
        id: "m1",
        title: "30 dias sem fumar",
        category: "Saude",
        deadline: "2026-05-31",
        progressType: "numerico",
        current: 3,
        target: 30,
        done: false,
      },
      {
        id: "m2",
        title: "Ler 12 livros em 2026",
        category: "Educacao",
        deadline: "2026-12-31",
        progressType: "numerico",
        current: 0,
        target: 12,
        done: false,
      },
      {
        id: "m3",
        title: "Hip thrust 80kg",
        category: "Fitness",
        deadline: "2026-12-31",
        progressType: "checkbox",
        done: false,
      },
      {
        id: "m4",
        title: "Guardar R$ 5000 até dezembro",
        category: "Financeiro",
        deadline: "2026-12-31",
        progressType: "numerico",
        current: 0,
        target: 5000,
        done: false,
      },
    ],
  };
}

function defaultWearable(): WearableState {
  return {
    provider: "none",
    pullSleep: true,
    pullCalories: true,
    pullSteps: true,
    pullRestingHr: false,
  };
}

function defaultVisionBoard(): VisionBoardState {
  return {
    items: [],
    settings: { secondsPerCard: 5, shuffle: false, showCategories: false },
    viewLog: {},
  };
}

export function createDefaultLifeState(): LifeAppStateV1 {
  return {
    v: 1,
    quickChecks: {},
    tabagismo: defaultTabagismo(),
    beleza: defaultBeleza(),
    alimentacao: defaultAlimentacao(),
    leitura: defaultLeitura(),
    saude: defaultSaude(),
    trabalho: defaultTrabalho(),
    financas: defaultFinancas(),
    estudo: defaultEstudo(),
    sono: defaultSono(),
    hidratacao: defaultHidratacao(),
    journal: defaultJournal(),
    metas: defaultMetas(),
    todos: defaultTodos(),
    wearable: defaultWearable(),
    visionBoard: defaultVisionBoard(),
    dailyScoreByDate: {},
  };
}

function migrate(raw: unknown): LifeAppStateV1 {
  if (!raw || typeof raw !== "object") return createDefaultLifeState();
  const o = raw as Partial<LifeAppStateV1>;
  const base = createDefaultLifeState();
  return {
    v: 1,
    quickChecks: typeof o.quickChecks === "object" && o.quickChecks ? o.quickChecks : {},
    tabagismo: o.tabagismo ? { ...base.tabagismo, ...o.tabagismo } : base.tabagismo,
    beleza: o.beleza
      ? {
          morning: o.beleza.morning?.length ? o.beleza.morning : base.beleza.morning,
          night: o.beleza.night?.length ? o.beleza.night : base.beleza.night,
          log: o.beleza.log || {},
          agendaLastDone:
            o.beleza.agendaLastDone && typeof o.beleza.agendaLastDone === "object"
              ? o.beleza.agendaLastDone
              : base.beleza.agendaLastDone,
        }
      : base.beleza,
    alimentacao: o.alimentacao
      ? {
          ...base.alimentacao,
          ...o.alimentacao,
          daily: o.alimentacao.daily || {},
          meals: o.alimentacao.meals && typeof o.alimentacao.meals === "object" ? o.alimentacao.meals : {},
          supplementsList:
            Array.isArray(o.alimentacao.supplementsList) && o.alimentacao.supplementsList.length > 0
              ? o.alimentacao.supplementsList
              : base.alimentacao.supplementsList,
          supplementChecks:
            o.alimentacao.supplementChecks && typeof o.alimentacao.supplementChecks === "object"
              ? o.alimentacao.supplementChecks
              : {},
        }
      : base.alimentacao,
    leitura: o.leitura ? { ...base.leitura, ...o.leitura } : base.leitura,
    saude: o.saude && Array.isArray(o.saude.consultas) ? { consultas: o.saude.consultas } : base.saude,
    trabalho: o.trabalho
      ? {
          ...base.trabalho,
          ...o.trabalho,
          plantoes: migratePlantoes(o.trabalho.plantoes),
          produtividade:
            o.trabalho.produtividade && typeof o.trabalho.produtividade === "object"
              ? o.trabalho.produtividade
              : base.trabalho.produtividade,
          erros: Array.isArray(o.trabalho.erros) ? o.trabalho.erros : base.trabalho.erros,
        }
      : base.trabalho,
    financas: o.financas
      ? { ...base.financas, ...o.financas, despesas: Array.isArray(o.financas.despesas) ? o.financas.despesas : base.financas.despesas }
      : base.financas,
    estudo: o.estudo
      ? {
          ...base.estudo,
          ...o.estudo,
          sessoes: Array.isArray(o.estudo.sessoes) ? o.estudo.sessoes : base.estudo.sessoes,
          temas: Array.isArray(o.estudo.temas) ? o.estudo.temas : base.estudo.temas,
        }
      : base.estudo,
    sono: o.sono?.log && typeof o.sono.log === "object" ? { log: o.sono.log } : base.sono,
    hidratacao: o.hidratacao
      ? {
          coposByDate: o.hidratacao.coposByDate && typeof o.hidratacao.coposByDate === "object" ? o.hidratacao.coposByDate : {},
          metaCopos: typeof o.hidratacao.metaCopos === "number" ? o.hidratacao.metaCopos : base.hidratacao.metaCopos,
          mlPerCopo: typeof o.hidratacao.mlPerCopo === "number" ? o.hidratacao.mlPerCopo : base.hidratacao.mlPerCopo,
        }
      : base.hidratacao,
    journal: o.journal && Array.isArray(o.journal.entries) ? { entries: o.journal.entries } : base.journal,
    metas: o.metas && Array.isArray(o.metas.items) ? { items: o.metas.items } : base.metas,
    todos:
      o.todos && typeof o.todos === "object"
        ? {
            active: Array.isArray(o.todos.active) ? o.todos.active : base.todos.active,
            done: Array.isArray(o.todos.done) ? o.todos.done : base.todos.done,
          }
        : base.todos,
    wearable: o.wearable ? { ...base.wearable, ...o.wearable } : base.wearable,
    visionBoard: o.visionBoard
      ? {
          items: Array.isArray(o.visionBoard.items) ? o.visionBoard.items : [],
          settings: {
            secondsPerCard: (() => {
              const s = o.visionBoard.settings?.secondsPerCard;
              if (s === 3 || s === 5 || s === 8 || s === 10) return s;
              return base.visionBoard.settings.secondsPerCard;
            })(),
            shuffle: !!o.visionBoard.settings?.shuffle,
            showCategories: !!o.visionBoard.settings?.showCategories,
          },
          viewLog:
            o.visionBoard.viewLog && typeof o.visionBoard.viewLog === "object" ? o.visionBoard.viewLog : {},
        }
      : base.visionBoard,
    dailyScoreByDate:
      o.dailyScoreByDate && typeof o.dailyScoreByDate === "object" ? o.dailyScoreByDate : base.dailyScoreByDate,
  };
}

export function loadLifeState(): LifeAppStateV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDefaultLifeState();
    return migrate(JSON.parse(raw));
  } catch {
    return createDefaultLifeState();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveLifeState(state: LifeAppStateV1): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function scheduleSaveLifeState(state: LifeAppStateV1): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveLifeState(state);
    saveTimer = null;
  }, 500);
}
