import type { DamageType, Report } from "./claim.js";

const DAMAGE_TYPES: readonly DamageType[] = ["Personenschaden", "Sachschaden", "Vermögensschaden"];

/** G1-REQ-010: Nennt der Kunde etwas, das keine der drei Schadenarten ist? */
export function isUnknownDamageType(report: Report): boolean {
  return report.damageType !== undefined && !DAMAGE_TYPES.includes(report.damageType);
}

// G1-REQ-004: Entscheidend sind die Fakten, Rangfolge Person vor Sache vor Vermögen.
// Die Angabe des Kunden zählt nur, wenn die Fakten fehlen. Fehlt beides, ist die Schadenart unklar (null).
export function classifyDamage(report: Report): DamageType | null {
  if (report.personInjured === true) return "Personenschaden";
  if (report.propertyDamaged === true) return "Sachschaden";
  if (report.personInjured === false && report.propertyDamaged === false) return "Vermögensschaden";
  if (report.damageType && DAMAGE_TYPES.includes(report.damageType)) return report.damageType;
  return null;
}
