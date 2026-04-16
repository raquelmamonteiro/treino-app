const TZ_BR = "America/Sao_Paulo";

export function todayISO(): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_BR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = p.find((x) => x.type === "year")?.value;
  const m = p.find((x) => x.type === "month")?.value;
  const d = p.find((x) => x.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export function formatLongPt(iso?: string): string {
  const base = iso ? `${iso}T12:00:00` : new Date().toISOString();
  try {
    return new Date(base).toLocaleDateString("pt-BR", {
      timeZone: TZ_BR,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function daysBetween(a: string, b: string): number {
  const A = new Date(a + "T12:00:00").getTime();
  const B = new Date(b + "T12:00:00").getTime();
  return Math.floor((B - A) / 86400000);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoFromMsBR(ms: number): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_BR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  return `${p.find((x) => x.type === "year")?.value}-${p.find((x) => x.type === "month")?.value}-${p.find((x) => x.type === "day")?.value}`;
}

/** Segunda-feira da semana corrente (fuso São Paulo), YYYY-MM-DD. */
export function mondayThisWeekISO(): string {
  const noon = new Date(todayISO() + "T15:00:00.000Z").getTime();
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ_BR, weekday: "short" });
  let ms = noon;
  for (let i = 0; i < 7; i++) {
    if (fmt.format(new Date(ms)) === "Mon") return isoFromMsBR(ms);
    ms -= 86400000;
  }
  return todayISO();
}
