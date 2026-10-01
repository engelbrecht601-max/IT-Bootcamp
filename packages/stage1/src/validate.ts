import { normalizePolicyNumber } from "./normalize.js";
import { dayOf, isIsoDate } from "./dates.js";
import type { Report } from "./claim.js";

export interface Problem {
  code: string;
  message: string;
}

// G1-REQ-001, G1-REQ-009: Ohne diese Angaben legt Stage 1 keinen Vorgang an.
const REQUIRED = ["policyNumber", "incidentDate", "reportedAt", "description", "claimantName", "policyholderName"] as const;

/** Prüft die Eingangsmeldung und sammelt alle Probleme; die Reihenfolge bestimmt den Fehlercode. */
export function validate(report: Report): Problem[] {
  const problems: Problem[] = [];
  const missing = REQUIRED.filter((field) => isBlank(report[field]));
  if (missing.length) {
    // G1-REQ-001: die Meldung nennt alle fehlenden Felder
    problems.push({ code: "PFLICHTANGABE_FEHLT", message: `Pflichtangabe fehlt: ${missing.join(", ")}` });
  }
  // G1-REQ-005: Telefonnummer oder E-Mail-Adresse, eines von beiden reicht
  if (isBlank(report.claimantPhone) && isBlank(report.claimantEmail)) {
    problems.push({ code: "KONTAKT_FEHLT", message: "Kontakt fehlt: claimantPhone oder claimantEmail angeben" });
  }
  // G1-REQ-002
  if (!isBlank(report.policyNumber) && normalizePolicyNumber(report.policyNumber!) === null) {
    problems.push({ code: "VERSICHERUNGSSCHEIN_UNGUELTIG", message: `Versicherungsscheinnummer ungültig: ${report.policyNumber}` });
  }
  // G1-REQ-003: Der Schadentag liegt nicht nach dem Tag der Meldung.
  if (!isBlank(report.incidentDate) && !isBlank(report.reportedAt)) {
    const reportedDay = dayOf(report.reportedAt!);
    if (!isIsoDate(report.incidentDate!) || reportedDay === null || report.incidentDate! > reportedDay) {
      problems.push({ code: "SCHADENTAG_UNGUELTIG", message: `Schadentag ungültig: ${report.incidentDate}` });
    }
  }
  return problems;
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
}
