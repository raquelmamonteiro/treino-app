import type { Despesa, DespesaCategoria } from "../types";

function prevMonthYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function totalDespesasMes(despesas: Despesa[], ym: string): number {
  return despesas.filter((x) => x.date.startsWith(ym)).reduce((a, x) => a + x.amount, 0);
}

export function despesasPorCategoria(despesas: Despesa[], ym: string): Record<DespesaCategoria, number> {
  const cat = {} as Record<DespesaCategoria, number>;
  const keys: DespesaCategoria[] = [
    "Moradia",
    "Mercado",
    "Transporte",
    "Saude",
    "Beleza",
    "Roupas",
    "Assinaturas",
    "Lazer",
    "Educacao",
    "Outros",
  ];
  keys.forEach((k) => {
    cat[k] = 0;
  });
  for (const d of despesas) {
    if (!d.date.startsWith(ym)) continue;
    cat[d.category] = (cat[d.category] || 0) + d.amount;
  }
  return cat;
}

export function top3Despesas(despesas: Despesa[], ym: string): Despesa[] {
  return [...despesas].filter((x) => x.date.startsWith(ym)).sort((a, b) => b.amount - a.amount).slice(0, 3);
}

/** Categorias com gasto maior que no mês anterior (mesmo valor absoluto). */
export function categoriasComAlertaSubida(
  despesas: Despesa[],
  ym: string,
): { category: DespesaCategoria; atual: number; anterior: number }[] {
  const prev = prevMonthYm(ym);
  const a = despesasPorCategoria(despesas, ym);
  const b = despesasPorCategoria(despesas, prev);
  const out: { category: DespesaCategoria; atual: number; anterior: number }[] = [];
  (Object.keys(a) as DespesaCategoria[]).forEach((k) => {
    if (a[k] > b[k] && a[k] > 0) out.push({ category: k, atual: a[k], anterior: b[k] });
  });
  return out.sort((x, y) => y.atual - x.atual).slice(0, 4);
}

export { prevMonthYm };
