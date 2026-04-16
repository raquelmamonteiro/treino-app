/** Estado persistido do app de vida (exceto treino — usa treinoSync). */
export type QuickCheckId =
  | "skincare_am"
  | "skincare_pm"
  | "food_ok"
  | "no_smoke"
  | "reading"
  | "treino"
  | "supplements"
  | "gut_ok"
  | "vision_board";

/** Checks usados no score (total 100 pts). */
export type ScoreCheckKey =
  | "no_smoke"
  | "workout"
  | "food_ok"
  | "skincare_am"
  | "skincare_pm"
  | "water"
  | "supplements"
  | "reading"
  | "sleep_7h"
  | "gut_ok"
  | "vision_board"
  | "no_gluten"
  | "no_sugar";

export type VisionBoardGradientId = "purple" | "green" | "blue" | "pink" | "gold" | "dark";

export type VisionBoardItem = {
  id: string;
  type: "photo" | "quote";
  imageBase64?: string;
  caption?: string;
  text?: string;
  author?: string;
  gradientId?: VisionBoardGradientId;
  category: string;
  tags: string[];
  order: number;
  createdAt: string;
};

export type VisionBoardState = {
  items: VisionBoardItem[];
  settings: {
    secondsPerCard: 3 | 5 | 8 | 10;
    shuffle: boolean;
    showCategories: boolean;
  };
  /** Registo opcional do ritual por dia */
  viewLog: Record<string, boolean>;
};

export type QuickChecksDay = Partial<Record<QuickCheckId, boolean>>;

export type TabagismoState = {
  /** Início da tentativa atual (ISO date) */
  quitStartDate: string;
  cigarettesPerDay: number;
  packPrice: number;
  /** Histórico de tentativas: { start, end?: relapse date } */
  attempts: { start: string; end?: string; note?: string }[];
  /** Registros "tive vontade" — ISO timestamps */
  cravings: string[];
};

export type SkinCareRoutine = {
  id: string;
  label: string;
  product: string;
};

/** Última vez que fez cada cuidado (YYYY-MM-DD) — ver `BELEZA_AGENDA` */
export type BelezaAgendaLastDone = Partial<
  Record<"manicure" | "corte" | "sobrancelha" | "pintar_cabelo" | "clarear_braco", string>
>;

export type BelezaState = {
  morning: SkinCareRoutine[];
  night: SkinCareRoutine[];
  /** date -> manhã completa, noite completa */
  log: Record<string, { am?: boolean; pm?: boolean }>;
  /** Agendamentos: manicure, corte, sobrancelha, pintar cabelo, clarear braço */
  agendaLastDone: BelezaAgendaLastDone;
};

export type MealSlot = "cafe" | "lanche_am" | "almoco" | "lanche_pm" | "jantar" | "ceia";

export type MealScore = "saudavel" | "media" | "ruim";

export type MealEntry = {
  /** Se true, não comeu neste horário (jejum intermitente / saltou a refeição). */
  jejum?: boolean;
  score?: MealScore;
  note?: string;
  brokenTags?: string[];
};

export type SuplementoConfig = {
  id: string;
  name: string;
  slot: "manha" | "almoco" | "noite";
};

export type AlimentacaoState = {
  streakGlutenFree: number;
  streakSugarFree: number;
  streakAlcoholFree: number;
  lastGlutenBreak?: string;
  lastSugarBreak?: string;
  lastAlcoholBreak?: string;
  recordGluten?: number;
  recordSugar?: number;
  recordAlcohol?: number;
  /** legado — mantido na migração */
  daily: Record<
    string,
    {
      ateBem?: boolean;
      note?: string;
      tags?: string[];
      glutenOk?: boolean;
      sugarOk?: boolean;
      alcoholOk?: boolean;
    }
  >;
  /** refeições por dia */
  meals: Record<string, Partial<Record<MealSlot, MealEntry>>>;
  supplementsList: SuplementoConfig[];
  /** date -> suppId -> feito */
  supplementChecks: Record<string, Record<string, boolean>>;
};

export type BookType = "physical" | "audiobook" | "kindle";

export type LeituraState = {
  currentTitle: string;
  bookType: BookType;
  pageCurrent: number;
  pageTotal: number | null;
  /** minutos lidos por dia (YYYY-MM-DD) */
  dailyMinutes: Record<string, number>;
  dailyGoalMinutes: number;
  wishlist: { id: string; title: string }[];
};

export type ConsultaItem = {
  id: string;
  label: string;
  /** intervalo entre consultas (ex.: 365 anual, 7 semanal) */
  frequencyDays: number;
  lastVisit?: string;
  notes?: string;
};

export type SaudeState = {
  consultas: ConsultaItem[];
};

export type PlantaoTipo = "diurno" | "noturno";

export type PlantaoEntry = {
  id: string;
  date: string;
  local: string;
  tipo: PlantaoTipo;
  horas: number;
  /** Valor total recebido pelo plantão (R$) — entrada principal no app */
  valorTotal: number;
  /** R$/h derivado: valorTotal / horas (produtividade financeira) */
  valorHora: number;
};

export type ProdutividadeDay = {
  nota1a5?: number;
  tags?: string[];
};

export type ErroLogCategoria = "Clínico" | "Administrativo" | "Comunicação" | "Técnico";

export type ErroLogEntry = {
  id: string;
  date: string;
  descricao: string;
  aprendizado: string;
  evitar: string;
  categoria: ErroLogCategoria;
};

export type TrabalhoState = {
  defaultValorHora: number;
  defaultLocal: string;
  plantoes: PlantaoEntry[];
  produtividade: Record<string, ProdutividadeDay>;
  erros: ErroLogEntry[];
};

export type DespesaCategoria =
  | "Moradia"
  | "Mercado"
  | "Transporte"
  | "Saude"
  | "Beleza"
  | "Roupas"
  | "Assinaturas"
  | "Lazer"
  | "Educacao"
  | "Outros";

export type Despesa = {
  id: string;
  date: string;
  amount: number;
  category: DespesaCategoria;
  note?: string;
};

export type FinancasState = {
  despesas: Despesa[];
  /** Meta de poupança mensal (R$) */
  metaEconomiaMensal: number;
};

export type EstudoSessao = {
  id: string;
  date: string;
  tema: string;
  horas: number;
  tags: string[];
};

export type TemaPendenteStatus = "pendente" | "andamento" | "concluido";
export type TemaPrioridade = "alta" | "media" | "baixa";

export type TemaPendente = {
  id: string;
  titulo: string;
  status: TemaPendenteStatus;
  prioridade: TemaPrioridade;
};

export type EstudoState = {
  sessoes: EstudoSessao[];
  temas: TemaPendente[];
  metaHorasSemana: number;
};

export type SonoDayLog = {
  sleepHour?: number;
  wakeHour?: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  hoursComputed?: number;
  wearableHours?: number;
  wearableScore?: number;
};

export type SonoState = {
  log: Record<string, SonoDayLog>;
};

export type HidratacaoState = {
  coposByDate: Record<string, number>;
  metaCopos: number;
  mlPerCopo: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  createdAt: string;
  mood: 1 | 2 | 3 | 4 | 5;
  text: string;
  boas?: [string, string, string];
  tags: string[];
};

export type JournalState = {
  entries: JournalEntry[];
};

export type MetaCategoria = "Saude" | "Carreira" | "Financeiro" | "Pessoal" | "Educacao" | "Fitness";

export type MetaProgressoTipo = "checkbox" | "numerico";

export type MetaItem = {
  id: string;
  title: string;
  category: MetaCategoria;
  deadline: string;
  progressType: MetaProgressoTipo;
  current?: number;
  target?: number;
  done: boolean;
  subtasks?: { id: string; label: string; done: boolean }[];
};

export type MetasState = {
  items: MetaItem[];
};

/** Tarefas pendentes (lista principal). */
export type TodoActiveItem = {
  id: string;
  text: string;
  createdAt: string;
};

/** Tarefa concluída — vai para o histórico. */
export type TodoDoneItem = {
  id: string;
  text: string;
  createdAt: string;
  completedAt: string;
};

export type TodosState = {
  active: TodoActiveItem[];
  done: TodoDoneItem[];
};

export type WearableState = {
  provider: "none" | "terra";
  connectedLabel?: string;
  lastSyncISO?: string;
  pullSleep: boolean;
  pullCalories: boolean;
  pullSteps: boolean;
  pullRestingHr: boolean;
};

/** Navegação para módulos a partir da home e checks derivados. */
export type ModuleId =
  | "treino"
  | "alimentacao"
  | "beleza"
  | "tabagismo"
  | "saude"
  | "trabalho"
  | "financas"
  | "estudo"
  | "leitura"
  | "sono"
  | "hidratacao"
  | "journal"
  | "metas"
  | "visionboard"
  | "todos";

export type LifeAppStateV1 = {
  v: 1;
  quickChecks: Record<string, QuickChecksDay>;
  tabagismo: TabagismoState;
  beleza: BelezaState;
  alimentacao: AlimentacaoState;
  leitura: LeituraState;
  saude: SaudeState;
  trabalho: TrabalhoState;
  financas: FinancasState;
  estudo: EstudoState;
  sono: SonoState;
  hidratacao: HidratacaoState;
  journal: JournalState;
  metas: MetasState;
  todos: TodosState;
  wearable: WearableState;
  visionBoard: VisionBoardState;
  /** score 0–100 por dia (histórico gráfico) */
  dailyScoreByDate: Record<string, number>;
};
