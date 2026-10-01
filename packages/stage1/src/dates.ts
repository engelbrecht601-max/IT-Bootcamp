/** Prüft ein Datum im Format JJJJ-MM-TT auf Existenz (kein 2026-02-30). */
export function isIsoDate(value: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Kalendertag (UTC) eines Zeitpunkts als JJJJ-MM-TT, oder null bei ungültigem Zeitpunkt. */
export function dayOf(timestamp: string): string | null {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/** Addiert Kalendermonate; fehlt der Tag im Zielmonat, gilt der Monatsletzte (31.08. + 6 → 28./29.02.). */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}
