import type { PlantaoEntry } from "../types";

export function plantoesDoMes(plantoes: PlantaoEntry[], ym: string): PlantaoEntry[] {
  return plantoes.filter((p) => p.date.startsWith(ym));
}

export function totalHorasMes(plantoes: PlantaoEntry[], ym: string): number {
  return plantoesDoMes(plantoes, ym).reduce((a, p) => a + p.horas, 0);
}

/** Ganho = valor total do plantão (compatível com dados antigos só com valorHora). */
export function ganhoPlantao(p: PlantaoEntry): number {
  if (typeof p.valorTotal === "number" && !Number.isNaN(p.valorTotal)) return p.valorTotal;
  return p.horas * p.valorHora;
}

export function valorHoraDerivado(p: PlantaoEntry): number {
  if (p.horas <= 0) return 0;
  return ganhoPlantao(p) / p.horas;
}

export function totalGanhoMes(plantoes: PlantaoEntry[], ym: string): number {
  return plantoesDoMes(plantoes, ym).reduce((a, p) => a + ganhoPlantao(p), 0);
}

/** Média de horas por semana no mês (aprox.: 4.33 semanas). */
export function mediaHorasSemanaMes(plantoes: PlantaoEntry[], ym: string): number {
  const h = totalHorasMes(plantoes, ym);
  return h > 0 ? Math.round((h / 4.33) * 10) / 10 : 0;
}
