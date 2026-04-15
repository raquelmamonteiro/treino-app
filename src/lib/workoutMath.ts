/** Mesma heurística que progressão: membros superiores / halteres pequenos → passo 1,25 kg. */
const SMALL_PLATE_EXERCISE_IDS = new Set([
  "rosca-mm",
  "triceps-polia",
  "lat-raise",
  "front-raise",
  "desenv",
  "face-pull-t",
  "face-pull-sex",
  "q-cross-tri",
  "q-cross-fly",
  "q-supino-smith",
]);

export function plateStepKg(exerciseId: string): 1.25 | 2.5 {
  return SMALL_PLATE_EXERCISE_IDS.has(exerciseId) ? 1.25 : 2.5;
}

export type LogEntry = {
  type?: string;
  date?: string;
  wid?: string;
  w?: Record<string, unknown>;
  label?: string;
};

/** Volume estimado: Σ (kg × reps) por série. */
export function volumeFromWeights(
  weights: Record<string, { kg?: number[]; reps?: number[] } | unknown>,
  exerciseIds: string[],
  skipped: Set<string>,
): number {
  let v = 0;
  for (const id of exerciseIds) {
    if (skipped.has(id)) continue;
    const raw = weights[id];
    if (!raw || typeof raw !== "object" || raw === null) continue;
    const kg = Array.isArray((raw as { kg?: number[] }).kg) ? (raw as { kg: number[] }).kg : [];
    const reps = Array.isArray((raw as { reps?: number[] }).reps) ? (raw as { reps: number[] }).reps : [];
    const n = Math.max(kg.length, reps.length);
    for (let i = 0; i < n; i++) {
      const k = typeof kg[i] === "number" && !isNaN(kg[i]) ? kg[i] : 0;
      const r = typeof reps[i] === "number" && !isNaN(reps[i]) ? reps[i] : 0;
      v += k * r;
    }
  }
  return Math.round(v * 10) / 10;
}

export function weightFromLogVal(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "object" && v !== null && Array.isArray((v as { kg?: number[] }).kg)) {
    const k = (v as { kg: number[] }).kg.filter((x) => typeof x === "number" && !isNaN(x));
    if (k.length) return k[k.length - 1];
  }
  return undefined;
}

/** Texto “Última vez…” para este exercício na última sessão do mesmo treino (mesmo wid). */
export function lastSessionLineForExercise(
  log: LogEntry[] | undefined,
  wid: string,
  exId: string,
  beforeDate: string,
): string | null {
  const prev = findPreviousSameWorkout(log, wid, beforeDate);
  if (!prev) return null;
  return formatLastSessionLine(prev, exId);
}

/** Última entrada do mesmo treino (wid) antes de hoje. */
export function findPreviousSameWorkout(log: LogEntry[] | undefined, wid: string, beforeDate: string): LogEntry | null {
  const list = (log || []).filter(
    (e) =>
      (e.type === "workout" || e.type === "quick") &&
      e.wid === wid &&
      e.date &&
      String(e.date) < beforeDate,
  );
  if (!list.length) return null;
  list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return list[0];
}

export function formatLastSessionLine(entry: LogEntry | null, exId: string): string | null {
  if (!entry?.w?.[exId]) return null;
  const w = entry.w[exId];
  const kg = typeof w === "object" && w !== null && Array.isArray((w as { kg?: number[] }).kg) ? (w as { kg: number[] }).kg : [];
  const reps = typeof w === "object" && w !== null && Array.isArray((w as { reps?: number[] }).reps) ? (w as { reps: number[] }).reps : [];
  const lastK = kg.filter((x) => typeof x === "number" && x > 0).pop();
  const repStr = reps.length ? reps.map((r) => `${r}`).join("×") : "";
  if (lastK === undefined && !repStr) return null;
  const d = entry.date ? formatShortBr(String(entry.date)) : "";
  const parts: string[] = [];
  if (lastK !== undefined) parts.push(`${lastK} kg`);
  if (repStr) parts.push(repStr);
  return `Última vez: ${parts.join(" · ")}${d ? ` · ${d}` : ""}`;
}

function formatShortBr(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

/** Pontos para sparkline (últimas n sessões, peso “última série”); sempre n valores (0 = sem dado). */
export function sparkWeightsForExercise(log: LogEntry[] | undefined, exId: string, n: number): number[] {
  const entries = (log || []).filter(
    (e) => (e.type === "workout" || e.type === "quick" || e.type === "home") && e.w?.[exId] !== undefined,
  );
  entries.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const tail = entries.slice(-n);
  const pts = tail.map((e) => {
    const v = weightFromLogVal(e.w?.[exId]);
    return typeof v === "number" && !isNaN(v) ? v : 0;
  });
  while (pts.length < n) pts.unshift(0);
  return pts.slice(-n);
}

export function listPRsToday(
  log: LogEntry[] | undefined,
  weights: Record<string, { kg?: number[]; reps?: number[] }>,
  exerciseIds: string[],
  skipped: Set<string>,
  exNames: Record<string, string>,
): string[] {
  const prs: string[] = [];
  const hist = log || [];
  for (const id of exerciseIds) {
    if (skipped.has(id)) continue;
    const raw = weights[id];
    if (!raw?.kg?.length) continue;
    const todayMax = Math.max(...raw.kg.map((k) => (typeof k === "number" ? k : 0)));
    if (todayMax <= 0) continue;
    let prevMax = 0;
    for (const e of hist) {
      if (e.type !== "workout" && e.type !== "quick" && e.type !== "home") continue;
      const w = e.w?.[id];
      if (!w) continue;
      if (typeof w === "object" && w !== null && Array.isArray((w as { kg?: number[] }).kg)) {
        for (const k of (w as { kg: number[] }).kg) {
          if (typeof k === "number" && k > prevMax) prevMax = k;
        }
      }
    }
    if (todayMax > prevMax) prs.push(`${exNames[id] || id}: ${todayMax} kg (recorde)`);
  }
  return prs;
}

export type DoneSummary = {
  totalSets: number;
  volume: number;
  prs: string[];
  prevVolume: number | null;
  prevDate: string | null;
};

export function progressGymTip(
  id: string,
  log: LogEntry[] | undefined,
  cw: number,
): { tip: string; color: string; icon: string } {
  const ws: number[] = [];
  (log || []).forEach((e) => {
    if ((e.type === "workout" || e.type === "quick" || e.type === "home") && e.w?.[id] !== undefined) {
      const x = weightFromLogVal(e.w[id]);
      if (x !== undefined) ws.push(x);
    }
  });
  if (ws.length < 2) return { tip: "Continue treinando", color: "#6b6280", icon: "📊" };
  const l3 = ws.slice(-3);
  if (l3.every((w) => w === l3[0]) && l3.length >= 2) {
    const step = plateStepKg(id);
    return {
      tip: `${l3.length}x mesma carga → tente ${cw + step}kg`,
      color: "#22c55e",
      icon: "⬆️",
    };
  }
  if (ws[ws.length - 1] > ws[ws.length - 2]) return { tip: "Boa progressão! Mantenha.", color: "#a78bfa", icon: "✨" };
  if (ws[ws.length - 1] < ws[ws.length - 2]) return { tip: "Carga caiu. Dor? Ok. Senão, recupere.", color: "#f59e0b", icon: "⚠️" };
  return { tip: "Mantendo — foque na execução.", color: "#6b6280", icon: "👌" };
}

export function buildDoneSummary(
  wo: { id: string; exercises: { id: string; name: string }[] },
  weights: Record<string, { kg?: number[]; reps?: number[] }>,
  skipped: string[],
  log: LogEntry[] | undefined,
  today: string,
): DoneSummary {
  const exerciseIds = wo.exercises.map((e) => e.id);
  const exNames = Object.fromEntries(wo.exercises.map((e) => [e.id, e.name]));
  const skipSet = new Set(skipped);
  let totalSets = 0;
  for (const id of exerciseIds) {
    if (skipSet.has(id)) continue;
    const raw = weights[id];
    if (raw?.kg) totalSets += raw.kg.filter((k) => typeof k === "number" && k >= 0).length;
  }
  const volume = volumeFromWeights(weights, exerciseIds, skipSet);
  const prev = findPreviousSameWorkout(log, wo.id, today);
  let prevVolume: number | null = null;
  if (prev?.w) {
    const ids = exerciseIds.filter((id) => !skipSet.has(id));
    prevVolume = volumeFromWeights(prev.w as Record<string, { kg?: number[]; reps?: number[] }>, ids, new Set());
  }
  return {
    totalSets,
    volume,
    prs: listPRsToday(log, weights, exerciseIds, skipSet, exNames),
    prevVolume,
    prevDate: prev?.date ?? null,
  };
}
