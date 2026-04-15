/**
 * Estimativas de composição corporal consolidadas na literatura:
 * - Jackson & Pollock, 3 dobras cutâneas (mulheres): tríceps + supra-ilíaca + coxa (mm) + idade → densidade → % gordura (equação de Siri).
 * - U.S. Navy (circunferências): pescoço, cintura, quadril, altura — fórmula oficial em polegadas (convertemos a partir de cm).
 *
 * Referências: ACSM / equações publicadas por Jackson & Pollock; instruções Navy para composição.
 */

/** Soma das 3 dobras (mm) + idade (anos) → % gordura corporal (Siri a partir da densidade JP). */
export function bodyFatPercentJacksonPollockFemale3(sumSkinfoldMm: number, ageYears: number): number | null {
  if (!isFinite(sumSkinfoldMm) || sumSkinfoldMm <= 0) return null;
  if (!isFinite(ageYears) || ageYears < 18 || ageYears > 80) return null;
  const x = sumSkinfoldMm;
  const density =
    1.0994921 - 0.0009929 * x + 0.0000023 * x * x - 0.0001392 * ageYears;
  if (!isFinite(density) || density < 0.95 || density > 1.12) return null;
  const bf = 495 / density - 450;
  if (!isFinite(bf) || bf < 5 || bf > 60) return null;
  return Math.round(bf * 10) / 10;
}

/** Circunferências em cm → % gordura (fórmula Navy feminina, medições convertidas para polegadas). */
export function bodyFatPercentNavyFemale(heightCm: number, neckCm: number, waistCm: number, hipCm: number): number | null {
  if (![heightCm, neckCm, waistCm, hipCm].every((v) => typeof v === "number" && isFinite(v) && v > 0)) return null;
  if (waist + hip <= neck) return null;
  const hi = heightCm / 2.54;
  const ne = neckCm / 2.54;
  const wa = waistCm / 2.54;
  const hp = hipCm / 2.54;
  const denom = 1.29579 - 0.35004 * Math.log10(wa + hp - ne) + 0.221 * Math.log10(hi);
  if (!isFinite(denom) || denom <= 0) return null;
  const bf = 495 / denom - 450;
  if (!isFinite(bf) || bf < 5 || bf > 60) return null;
  return Math.round(bf * 10) / 10;
}

export function fatMassKg(bodyWeightKg: number, bodyFatPercent: number): number | null {
  if (!isFinite(bodyWeightKg) || bodyWeightKg <= 0) return null;
  if (!isFinite(bodyFatPercent)) return null;
  return Math.round(((bodyWeightKg * bodyFatPercent) / 100) * 10) / 10;
}

export function leanMassKg(bodyWeightKg: number, bodyFatPercent: number): number | null {
  const fm = fatMassKg(bodyWeightKg, bodyFatPercent);
  if (fm === null) return null;
  return Math.round((bodyWeightKg - fm) * 10) / 10;
}
