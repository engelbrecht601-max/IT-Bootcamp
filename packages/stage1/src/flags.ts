import { addMonths, dayOf } from "./dates.js";
import type { Report } from "./claim.js";

export const LATE_REPORT = "Spätmeldung";
export const POSSIBLE_OWN_DAMAGE = "möglicher Eigenschaden";
export const OWN_DAMAGE_UNCHECKABLE = "Eigenschaden nicht prüfbar";

// G1-REQ-006: Spät ist eine Meldung, wenn zwischen Schadentag und Meldung mehr als sechs Monate liegen.
// Genau sechs Kalendermonate sind noch nicht spät.
export function isLateReport(incidentDate: string, reportedAt: string): boolean {
  const reportedDay = dayOf(reportedAt);
  return reportedDay !== null && reportedDay > addMonths(incidentDate, 6);
}

// G1-REQ-007: Anspruchsteller ist der Versicherungsnehmer selbst oder dessen Hausverwaltung.
export function isPossibleOwnDamage(report: Report): boolean {
  const claimant = sameName(report.claimantName);
  return claimant !== "" && [report.policyholderName, report.propertyManagerName].some((n) => sameName(n) === claimant);
}

// G1-REQ-007 (Gruppenentscheidung B): Ohne Versicherungsnehmer lässt sich ein Eigenschaden nur
// über die Hausverwaltung erkennen; sonst wird vermerkt, dass nicht geprüft werden konnte.
export function ownDamageFlag(report: Report): string | null {
  if (isPossibleOwnDamage(report)) return POSSIBLE_OWN_DAMAGE;
  return sameName(report.policyholderName) === "" ? OWN_DAMAGE_UNCHECKABLE : null;
}

function sameName(name: string | undefined): string {
  return (name ?? "").trim().toLowerCase();
}
