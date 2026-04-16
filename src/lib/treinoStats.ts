/** Conta treinos de ginásio no mês YYYY-MM (Brasil). */
export function countGymWorkoutsInMonth(log: unknown[] | undefined, ym: string): number {
  const prefix = ym.length === 7 ? ym : ym.slice(0, 7);
  return (log || []).filter((e) => {
    if (!e || typeof e !== "object") return false;
    const x = e as { type?: string; date?: string };
    if (x.type !== "workout" && x.type !== "quick") return false;
    return x.date && String(x.date).startsWith(prefix);
  }).length;
}

export function hasWorkoutToday(log: unknown[] | undefined, today: string): boolean {
  return (log || []).some((e) => {
    if (!e || typeof e !== "object") return false;
    const x = e as { type?: string; date?: string };
    return (x.type === "workout" || x.type === "quick" || x.type === "home") && x.date === today;
  });
}
