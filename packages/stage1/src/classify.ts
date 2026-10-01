import type { DamageType, Report } from "./claim.js";

const DAMAGE_TYPES: readonly DamageType[] = ["Personenschaden", "Sachschaden", "Vermögensschaden"];

// G1-REQ-004: Nennt der Kunde die Schadenart, wird sie übernommen. Sonst gilt die Rangfolge
// Person vor Sache vor Vermögen. Fehlen die Angaben dafür, ist die Schadenart unklar (null).
export function classifyDamage(report: Report): DamageType | null {
  if (report.damageType && DAMAGE_TYPES.includes(report.damageType)) return report.damageType;
  if (report.personInjured === true) return "Personenschaden";
  if (report.propertyDamaged === true) return "Sachschaden";
  if (report.personInjured === false && report.propertyDamaged === false) return "Vermögensschaden";
  return null;
}
