import { classifyDamage, isUnknownDamageType } from "./classify.js";
import { LATE_REPORT, isLateReport, ownDamageFlag } from "./flags.js";
import { normalizePolicyNumber } from "./normalize.js";
import { validate, type Problem } from "./validate.js";
import type { Claim, Report, Stage1 } from "./claim.js";

export type { Claim, Report } from "./claim.js";

/**
 * Stage 1: Schadenaufnahme.
 * Nimmt die Schadenmeldung auf und legt die Grunddaten des Vorgangs an.
 *
 * Regeln: schreibt nur in `claim.stage1`, hängt genau einen Trace-Eintrag an, löscht nie Felder.
 * Übergabe an: Deckungsprüfung (Gruppe 2).
 *
 * @param claim  Eingangsakte (claimId, meta, leerer Trace)
 * @param report Eingangsmeldung nach G1-REQ-009; fehlt sie, gelten alle Angaben als fehlend
 * @param now    Zeitpunkt der Bearbeitung, für completedAt und den Trace-Eintrag
 */
export function run(claim: Claim, report: Report = {}, now: Date = new Date()): Claim {
  // G1-REQ-008: die Eingangsakte bleibt unverändert, fremde Blöcke werden mitkopiert
  const out = structuredClone(claim);
  const at = now.toISOString();

  const problems = validate(report);
  const damageType = classifyDamage(report);
  if (problems.length === 0 && damageType === null) {
    // G1-REQ-004
    problems.push({ code: "SCHADENART_UNKLAR", message: "Schadenart unklar: damageType oder personInjured/propertyDamaged angeben" });
  }
  if (problems.length) return abort(out, problems, at);

  // G1-REQ-001, G1-REQ-005, G1-REQ-009: Block stage1 aus der geprüften Meldung
  const stage1: Stage1 = {
    completedAt: at,
    policyNumber: normalizePolicyNumber(report.policyNumber!)!,
    incidentDate: report.incidentDate!,
    reportedAt: report.reportedAt!,
    damageType: damageType!,
    description: report.description!.trim(),
    claimant: { name: report.claimantName!.trim() },
  };
  if (report.claimantPhone?.trim()) stage1.claimantPhone = report.claimantPhone.trim();
  if (report.claimantEmail?.trim()) stage1.claimantEmail = report.claimantEmail.trim();
  if (typeof report.claimedAmount === "number") stage1.claimedAmount = report.claimedAmount;

  // G1-REQ-006, G1-REQ-007, G1-REQ-010: Markierungen und Hinweise für die Deckungsprüfung stehen in der note
  const flags: string[] = [];
  if (isLateReport(stage1.incidentDate, stage1.reportedAt)) flags.push(LATE_REPORT);
  const ownDamage = ownDamageFlag(report);
  if (ownDamage) flags.push(ownDamage);
  if (isUnknownDamageType(report)) flags.push(`Schadenart laut Kunde unbekannt: ${report.damageType}`);

  // G1-REQ-008: genau ein Trace-Eintrag, Übergabe an Stage 2
  out.stage1 = stage1;
  out.trace.push({ stage: 1, at, action: "erfasst", note: flags.length ? flags.join("; ") : "Meldung vollständig." });
  out.meta.currentStage = 2;
  return out;
}

// G1-REQ-001, G1-REQ-010: Abbruch als Rückfrage; der Code kommt vom ersten Problem, die Meldung nennt alle.
function abort(out: Claim, problems: Problem[], at: string): Claim {
  const message = `Bitte nachfragen: ${problems.map((p) => p.message).join("; ")}`;
  out.trace.push({ stage: 1, at, action: "abgebrochen", note: message });
  out.error = { stage: 1, code: problems[0].code, message };
  return out;
}
