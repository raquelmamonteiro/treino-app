import type { Session } from "@supabase/supabase-js";
import { storage } from "./storage";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export const TREINO_SK = "raquel-treino-v7";
const META_KEY = `${TREINO_SK}-meta`;

/** Registo semanal de corpo — foto opcional (data URL), medidas e estimativas gravadas no momento. */
export type BodyWeeklyEntry = {
  date: string;
  photoDataUrl?: string | null;
  pesoKg?: number | null;
  /** Dobras cutâneas (mm): Jackson & Pollock 3 sítios mulheres */
  dobraTricepsMm?: number | null;
  dobraSuprailiacaMm?: number | null;
  dobraCoxaMm?: number | null;
  /** Fita métrica (cm) */
  cinturaCm?: number | null;
  quadrilCm?: number | null;
  bracoCm?: number | null;
  coxaCm?: number | null;
  /** Opcional — fórmula Navy (com altura no perfil) */
  pescocoCm?: number | null;
  /** Calculado ao guardar */
  bfJacksonPct?: number | null;
  bfNavyPct?: number | null;
  gorduraKg?: number | null;
  magroKg?: number | null;
};

export type TreinoData = {
  sd: string;
  qi: number;
  ew: Record<string, number>;
  log: unknown[];
  ach: string[];
  /** Idade e altura para JP e Navy */
  profile?: { age: number; heightCm: number };
  bodyWeekly?: BodyWeeklyEntry[];
};

function td(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function initTreinoData(): TreinoData {
  return { sd: td(), qi: 0, ew: {}, log: [], ach: [], profile: { age: 30, heightCm: 165 }, bodyWeekly: [] };
}

/** Garante campos novos em dados antigos ou parciais. */
export function normalizeTreinoData(d: TreinoData): TreinoData {
  return {
    ...d,
    profile: d.profile?.age && d.profile?.heightCm ? d.profile : { age: 30, heightCm: 165 },
    bodyWeekly: Array.isArray(d.bodyWeekly) ? d.bodyWeekly : [],
  };
}

function isEmptyState(d: TreinoData | null | undefined): boolean {
  if (!d) return true;
  const hasLog = Array.isArray(d.log) && d.log.length > 0;
  const hasQi = typeof d.qi === "number" && d.qi > 0;
  const hasEw = d.ew && Object.keys(d.ew).length > 0;
  return !hasLog && !hasQi && !hasEw;
}

async function readLocal(): Promise<{ data: TreinoData | null; savedAt: number }> {
  const raw = await storage.get(TREINO_SK);
  const meta = await storage.get(META_KEY);
  const savedAt = meta?.value ? parseInt(meta.value, 10) || 0 : 0;
  if (!raw?.value) return { data: null, savedAt };
  try {
    return { data: JSON.parse(raw.value) as TreinoData, savedAt };
  } catch {
    return { data: null, savedAt };
  }
}

async function writeLocal(data: TreinoData, savedAt: number): Promise<void> {
  await storage.set(TREINO_SK, JSON.stringify(data));
  await storage.set(META_KEY, String(savedAt));
}

async function upsertRemote(userId: string, payload: TreinoData): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("treino_data").upsert(
    { user_id: userId, payload, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) console.warn("[treino] Supabase upsert:", error.message);
}

/**
 * Garante sessão Supabase sem pedir e-mail: login anónimo (ativar em Authentication → Providers → Anonymous).
 */
async function ensureAnonymousSession(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
): Promise<{ session: Session | null; errorNote: string | null }> {
  const { data: first } = await sb.auth.getSession();
  if (first.session) return { session: first.session, errorNote: null };

  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error) return { session: null, errorNote: error.message };
  if (signed.session) return { session: signed.session, errorNote: null };

  const { data: again } = await sb.auth.getSession();
  return {
    session: again.session ?? null,
    errorNote: again.session ? null : "Sessão na nuvem indisponível.",
  };
}

export type LoadTreinoStateResult = {
  data: TreinoData;
  session: Session | null;
  /** Quando o Supabase está configurado mas não há sessão (ex.: login anónimo desativado no projeto). */
  syncNote?: string;
};

/**
 * Carrega estado: local + remoto (se Supabase e sessão).
 * Conflito: vence o mais recente (meta local vs updated_at remoto).
 */
export async function loadTreinoState(): Promise<LoadTreinoStateResult> {
  const local = await readLocal();
  const sb = getSupabase();

  if (!sb || !isSupabaseConfigured()) {
    if (local.data) return { data: normalizeTreinoData(local.data), session: null };
    const fresh = initTreinoData();
    await writeLocal(fresh, Date.now());
    return { data: fresh, session: null };
  }

  const { session, errorNote } = await ensureAnonymousSession(sb);

  if (!session) {
    const syncNote =
      errorNote ??
      "Não foi possível iniciar sessão na nuvem — os dados ficam só neste aparelho.";
    if (local.data) return { data: normalizeTreinoData(local.data), session: null, syncNote };
    const fresh = initTreinoData();
    await writeLocal(fresh, Date.now());
    return { data: fresh, session: null, syncNote };
  }

  const { data: row, error } = await sb
    .from("treino_data")
    .select("payload, updated_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[treino] select:", error.message);
    if (local.data) return { data: normalizeTreinoData(local.data), session };
    const fresh = initTreinoData();
    await writeLocal(fresh, Date.now());
    return { data: fresh, session };
  }

  const remotePayload = row?.payload as TreinoData | undefined;
  const remoteTime = row?.updated_at ? new Date(row.updated_at).getTime() : 0;

  if (!row || !remotePayload || isEmptyState(remotePayload)) {
    if (local.data && !isEmptyState(local.data)) {
      const merged = normalizeTreinoData(local.data);
      await upsertRemote(session.user.id, merged);
      await writeLocal(merged, Date.now());
      return { data: merged, session };
    }
    const fresh = local.data && !isEmptyState(local.data) ? normalizeTreinoData(local.data) : initTreinoData();
    await upsertRemote(session.user.id, fresh);
    await writeLocal(fresh, Date.now());
    return { data: fresh, session };
  }

  if (!local.data || local.savedAt === 0) {
    const merged = normalizeTreinoData(remotePayload);
    await writeLocal(merged, remoteTime);
    return { data: merged, session };
  }

  if (remoteTime > local.savedAt) {
    const merged = normalizeTreinoData(remotePayload);
    await writeLocal(merged, remoteTime);
    return { data: merged, session };
  }

  const mergedLocal = normalizeTreinoData(local.data);
  await upsertRemote(session.user.id, mergedLocal);
  await writeLocal(mergedLocal, Date.now());
  return { data: mergedLocal, session };
}

/** Persiste local + nuvem (se logado). */
export async function persistTreinoData(data: TreinoData): Promise<void> {
  const ts = Date.now();
  await writeLocal(data, ts);
  const sb = getSupabase();
  if (!sb) return;
  const { data: sessionData } = await sb.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return;
  await upsertRemote(uid, data);
}
