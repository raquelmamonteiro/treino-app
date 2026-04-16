import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Remove aspas, espaços e quebras que vêm do copy-paste do .env */
function sanitizeEnv(s: string | undefined): string {
  if (!s) return "";
  return s
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .replace(/\u200b/g, "");
}

function sanitizeUrl(raw: string | undefined): string | null {
  let u = sanitizeEnv(raw);
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  u = u.replace(/\/+$/, "");
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const resolvedUrl = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const resolvedKey = sanitizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(resolvedUrl && resolvedKey.length > 30);
}

/** Se o .env existe mas está mal formatado (antes de conseguir ligar ao servidor). */
export function getSupabaseConfigProblem(): string | null {
  const ru = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const rk = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  if (!ru && !rk) return null;
  if (!ru) return "Falta VITE_SUPABASE_URL no .env.local (Supabase → Project Settings → API → Project URL).";
  if (!rk) return "Falta VITE_SUPABASE_ANON_KEY no .env.local.";
  if (!resolvedUrl) return "VITE_SUPABASE_URL inválido. Deve ser https://xxxx.supabase.co (sem aspas nem espaços a mais).";
  if (!resolvedKey || resolvedKey.length < 30) return "VITE_SUPABASE_ANON_KEY parece cortada — copia outra vez a chave anon completa (uma linha só).";
  return null;
}

/** Cliente só existe com variáveis de ambiente válidas. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(resolvedUrl!, resolvedKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });
  }
  return client;
}

/** Mensagem amigável para TypeError: Failed to fetch / NetworkError */
export function formatSupabaseNetworkError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  if (low.includes("fetch") || low.includes("network") || low.includes("load failed")) {
    return [
      "Não foi possível ligar ao Supabase (rede bloqueada ou URL errada).",
      "Confirma: 1) Projeto ativo no dashboard; 2) .env.local com URL https://…supabase.co e chave anon completas; 3) Reiniciar npm run dev após editar .env; 4) Desativar extensão de bloqueio de anúncios/rastreio nesta página; 5) Se usas outro PC ou telemóvel, testa no mesmo Wi‑Fi.",
    ].join(" ");
  }
  return msg;
}
