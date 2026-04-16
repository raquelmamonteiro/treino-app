/** Importação simples de CSV (banco BR ou export manual). Colunas: data, valor, descrição opcional. */

function parseBrazilianDate(s: string): string | null {
  const x = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const m = x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    return `${m[3]}-${mo}-${d}`;
  }
  return null;
}

function parseAmount(s: string): number | null {
  const t = s
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$\s*/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? Math.abs(n) : null;
}

export type LinhaImportada = { date: string; amount: number; note: string };

export function parseDespesasFromCSV(text: string): LinhaImportada[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: LinhaImportada[] = [];
  let skipHeader = true;
  for (const line of lines) {
    const parts = line.includes(";") ? line.split(";") : line.split(",");
    const cells = parts.map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 2) continue;
    const dateStr = cells[0];
    const amountStr = cells[1];
    if (skipHeader && (/data|date/i.test(dateStr) || /valor|amount/i.test(amountStr))) {
      skipHeader = false;
      continue;
    }
    skipHeader = false;
    const date = parseBrazilianDate(dateStr);
    const amount = parseAmount(amountStr);
    if (!date || amount == null) continue;
    const note = cells.slice(2).join(" ").trim() || "Importado CSV";
    out.push({ date, amount, note });
  }
  return out;
}
