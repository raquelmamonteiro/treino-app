import { storage } from "./storage";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export const TREINO_SK = "raquel-treino-v7";
const META_KEY = `${TREINO_SK}-meta`;

export type TreinoData = {
  sd: string;
  qi: number;
  ew: Record<string, number>;
  log: unknown[];
  ach: string[];
};

function td(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function initTreinoData(): TreinoData {
  return { sd: td(), qi: 0, ew: {}, log: [], ach: [] };
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
 * Carrega estado: local + remoto (se Supabase e sessão).
 * Conflito: vence o mais recente (meta local vs updated_at remoto).
 */
export async function loadTreinoState(): Promise<{ data: TreinoData; session: import("@supabase/supabase-js").Session | null }> {
  const local = await readLocal();
  const sb = getSupabase();

  if (!sb || !isSupabaseConfigured()) {
    if (local.data) return { data: local.data, session: null };
    const fresh = initTreinoData();
    await writeLocal(fresh, Date.now());
    return { data: fresh, session: null };
  }

  const { data: sessionData } = await sb.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    if (local.data) return { data: local.data, session: null };
    const fresh = initTreinoData();
    await writeLocal(fresh, Date.now());
    return { data: fresh, session: null };
  }

  const { data: row, error } = await sb
    .from("treino_data")
    .select("payload, updated_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[treino] select:", error.message);
    if (local.data) return { data: local.data, session };
    const fresh = initTreinoData();
    await writeLocal(fresh, Date.now());
    return { data: fresh, session };
  }

  const remotePayload = row?.payload as TreinoData | undefined;
  const remoteTime = row?.updated_at ? new Date(row.updated_at).getTime() : 0;

  if (!row || !remotePayload || isEmptyState(remotePayload)) {
    if (local.data && !isEmptyState(local.data)) {
      await upsertRemote(session.user.id, local.data);
      await writeLocal(local.data, Date.now());
      return { data: local.data, session };
    }
    const fresh = local.data && !isEmptyState(local.data) ? local.data : initTreinoData();
    await upsertRemote(session.user.id, fresh);
    await writeLocal(fresh, Date.now());
    return { data: fresh, session };
  }

  if (!local.data || local.savedAt === 0) {
    await writeLocal(remotePayload, remoteTime);
    return { data: remotePayload, session };
  }

  if (remoteTime > local.savedAt) {
    await writeLocal(remotePayload, remoteTime);
    return { data: remotePayload, session };
  }

  await upsertRemote(session.user.id, local.data);
  await writeLocal(local.data, Date.now());
  return { data: local.data, session };
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
