import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

// Initialize Ajv validator for schema validation
const ajv = new (Ajv as any)({ strict: false });
(addFormats as any)(ajv);

// Load the schema
const schemaContent = readFileSync("./contracts/claim.schema.json", "utf-8");
const schema = JSON.parse(schemaContent);
const validateSchema = ajv.compile(schema);

/**
 * G1-REQ-011: Markierungen als eigenes Feld übergeben
 *
 * User Story: Als Deckungsprüfung möchte ich die Markierungen der Schadenaufnahme
 * als festes Kennzeichen mit Begründung in der Akte finden, damit ich sie sofort
 * sehe und nicht aus einem Freitext herauslesen oder selbst nachrechnen muss.
 */

function createBaseClaim(): Claim {
  return {
    claimId: "SCH-2026-00011",
    meta: {
      contractVersion: "1.2.0",
      createdAt: "2026-11-04T00:00:00Z",
      currentStage: 1,
    },
    trace: [],
  };
}

function createBaseReport(overrides: Partial<Report> = {}): Report {
  return {
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: "Jonas Albers",
    claimantPhone: "0171 2345678",
    damageType: "Sachschaden",
    policyholderName: "Eigentümergemeinschaft Lindenstraße 12",
    ...overrides,
  };
}

test("[G1-REQ-011] Gegeben Spätmeldung ohne Eigenschaden, dann flags mit Spätmeldung und Begründung", () => {
  // AC1: Gegeben eine vollständige Meldung mit Schadentag 2025-12-19,
  // Meldezeitpunkt 2026-11-04T14:05:00Z und einem claimantName,
  // der weder policyholderName noch propertyManagerName entspricht
  const claim = createBaseClaim();
  const report = createBaseReport({
    incidentDate: "2025-12-19",
    reportedAt: "2026-11-04T14:05:00Z",
    claimantName: "Emre Yıldız", // Nicht gleich Versicherungsnehmer oder Hausverwaltung
  });
  const now = new Date("2026-11-04T14:05:00Z");

  // Wenn Stage 1 sie verarbeitet
  const result = run(claim, report, now);

  // Dann ist stage1.flags genau [{ "type": "Spätmeldung", "reason": "10 volle Monate zwischen Schadentag und Meldung" }]
  assert.ok(result.stage1, "stage1 block sollte existieren");
  const expectedFlags1 = [{ type: "Spätmeldung", reason: "10 volle Monate zwischen Schadentag und Meldung" }];
  assert.deepEqual(result.stage1.flags, expectedFlags1, "flags sollte exakt dem erwarteten Array entsprechen");
});

test("[G1-REQ-011] Gegeben vollständige rechtzeitige Meldung mit claimantName gleich policyholderName, dann flags mit möglicher Eigenschaden", () => {
  // AC2: Gegeben eine vollständige, rechtzeitige Meldung mit
  // claimantName gleich policyholderName
  const claim = createBaseClaim();
  const report = createBaseReport({
    claimantName: "Eigentümergemeinschaft Lindenstraße 12",
    policyholderName: "Eigentümergemeinschaft Lindenstraße 12",
  });
  const now = new Date("2026-11-03T08:40:00Z");

  // Wenn Stage 1 sie verarbeitet
  const result = run(claim, report, now);

  // Dann ist stage1.flags genau [{ "type": "möglicher Eigenschaden",
  // "reason": "Anspruchsteller entspricht dem Versicherungsnehmer" }]
  assert.ok(result.stage1, "stage1 block sollte existieren");
  const expectedFlags2 = [{ type: "möglicher Eigenschaden", reason: "Anspruchsteller entspricht dem Versicherungsnehmer" }];
  assert.deepEqual(result.stage1.flags, expectedFlags2, "flags sollte exakt dem erwarteten Array entsprechen");
});

test("[G1-REQ-011] Gegeben claimantName gleich propertyManagerName und ungleich policyholderName, dann flags mit möglicher Eigenschaden (Hausverwaltung)", () => {
  // AC3: Gegeben eine vollständige, rechtzeitige Meldung mit
  // claimantName gleich propertyManagerName und ungleich policyholderName
  const claim = createBaseClaim();
  const report = createBaseReport({
    claimantName: "Hausverwaltung Kramer & Söhne GbR",
    propertyManagerName: "Hausverwaltung Kramer & Söhne GbR",
    policyholderName: "Dieter Kramer", // Ungleich claimantName
  });
  const now = new Date("2026-11-03T08:40:00Z");

  // Wenn Stage 1 sie verarbeitet
  const result = run(claim, report, now);

  // Dann ist stage1.flags genau [{ "type": "möglicher Eigenschaden",
  // "reason": "Anspruchsteller entspricht der Hausverwaltung" }]
  assert.ok(result.stage1, "stage1 block sollte existieren");
  const expectedFlags3 = [{ type: "möglicher Eigenschaden", reason: "Anspruchsteller entspricht der Hausverwaltung" }];
  assert.deepEqual(result.stage1.flags, expectedFlags3, "flags sollte exakt dem erwarteten Array entsprechen");
});

test("[G1-REQ-011] Gegeben ohne policyholderName und ohne propertyManagerName, dann flags mit Eigenschaden nicht prüfbar", () => {
  // AC4: Gegeben eine vollständige, rechtzeitige Meldung ohne policyholderName
  // und ohne propertyManagerName
  const claim = createBaseClaim();
  const report = createBaseReport({
    // Keine policyholderName und keine propertyManagerName
    policyholderName: undefined,
    propertyManagerName: undefined,
  });
  const now = new Date("2026-11-03T08:40:00Z");

  // Wenn Stage 1 sie verarbeitet
  const result = run(claim, report, now);

  // Dann ist stage1.flags genau [{ "type": "Eigenschaden nicht prüfbar",
  // "reason": "Versicherungsnehmer nicht angegeben" }]
  assert.ok(result.stage1, "stage1 block sollte existieren");
  const expectedFlags4 = [{ type: "Eigenschaden nicht prüfbar", reason: "Versicherungsnehmer nicht angegeben" }];
  assert.deepEqual(result.stage1.flags, expectedFlags4, "flags sollte exakt dem erwarteten Array entsprechen");
});

test("[G1-REQ-011] Gegeben ohne Eigenschaden mit personInjured: true und damageType: Unfall, dann flags mit Schadenart unklar", () => {
  // AC5: Gegeben eine vollständige, rechtzeitige Meldung ohne Eigenschaden
  // mit personInjured: true und damageType: "Unfall"
  const claim = createBaseClaim();
  // Cast to any to allow invalid damageType value
  const report = createBaseReport({
    personInjured: true,
    damageType: "Unfall" as any, // Eine unbekannte Schadenart
    policyholderName: "Versicherungsnehmer",
    claimantName: "Anderer Name", // Nicht der Versicherungsnehmer
  });
  const now = new Date("2026-11-03T08:40:00Z");

  // Wenn Stage 1 sie verarbeitet
  const result = run(claim, report, now);

  // Dann ist stage1.flags genau [{ "type": "Schadenart unklar",
  // "reason": "Kunde nannte: Unfall" }]
  assert.ok(result.stage1, "stage1 block sollte existieren");
  const expectedFlags5 = [{ type: "Schadenart unklar", reason: "Kunde nannte: Unfall" }];
  assert.deepEqual(result.stage1.flags, expectedFlags5, "flags sollte exakt dem erwarteten Array entsprechen");
});

test("[G1-REQ-011] Gegeben ohne jede Markierung, dann flags ist leere Liste", () => {
  // AC6: Gegeben eine vollständige, rechtzeitige Meldung ohne jede Markierung
  const claim = createBaseClaim();
  const report = createBaseReport({
    // Alle Bedingungen sind normal:
    // - Nicht spät (reportedAt 2026-11-03, incidentDate 2026-11-01)
    // - Kein Eigenschaden (claimantName !== policyholderName)
    // - Keine unbekannte Schadenart (damageType ist "Sachschaden")
    damageType: "Sachschaden",
  });
  const now = new Date("2026-11-03T08:40:00Z");

  // Wenn Stage 1 sie verarbeitet
  const result = run(claim, report, now);

  // Dann ist stage1.flags eine leere Liste []
  assert.ok(result.stage1, "stage1 block sollte existieren");
  const expectedFlags6: any[] = [];
  assert.deepEqual(result.stage1.flags, expectedFlags6, "flags sollte exakt dem erwarteten Array entsprechen");
});

test("[G1-REQ-011] Gegeben Spätmeldung und möglicher Eigenschaden zugleich, dann flags mit beiden in Reihenfolge und note enthält beide", () => {
  // AC7: Gegeben eine Meldung, die zugleich Spätmeldung und möglicher
  // Eigenschaden ist
  const claim = createBaseClaim();
  const report = createBaseReport({
    incidentDate: "2025-12-19", // Spätmeldung (>6 Monate)
    reportedAt: "2026-11-04T14:05:00Z",
    claimantName: "Eigentümergemeinschaft Lindenstraße 12", // Gleich policyholderName
    policyholderName: "Eigentümergemeinschaft Lindenstraße 12",
  });
  const now = new Date("2026-11-04T14:05:00Z");

  // Wenn Stage 1 sie verarbeitet
  const result = run(claim, report, now);

  // Dann enthält stage1.flags genau zwei Einträge in der Reihenfolge
  // Spätmeldung, möglicher Eigenschaden
  assert.ok(result.stage1, "stage1 block sollte existieren");
  assert.ok(Array.isArray(result.stage1.flags), "flags sollte ein Array sein");
  assert.equal(result.stage1.flags.length, 2, "flags sollte genau zwei Einträge haben");
  assert.equal(result.stage1.flags[0].type, "Spätmeldung", "erster Eintrag sollte Spätmeldung sein");
  assert.equal(
    result.stage1.flags[1].type,
    "möglicher Eigenschaden",
    "zweiter Eintrag sollte möglicher Eigenschaden sein"
  );

  // die note des neuen Trace-Eintrags enthält weiterhin Spätmeldung
  // und möglicher Eigenschaden
  assert.ok(result.trace.length > 0, "Mindestens ein Trace-Eintrag sollte existieren");
  const lastEntry = result.trace[result.trace.length - 1];
  assert.match(
    lastEntry.note ?? "",
    /Spätmeldung/,
    "note sollte 'Spätmeldung' enthalten"
  );
  assert.match(
    lastEntry.note ?? "",
    /möglicher Eigenschaden/,
    "note sollte 'möglicher Eigenschaden' enthalten"
  );

  // Die Akte ist valide gegen contracts/claim.schema.json
  const isValid = validateSchema(result);
  if (!isValid) {
    console.error("Validation errors:", validateSchema.errors);
  }
  assert.ok(isValid, `Claim sollte gegen das Schema valide sein. Fehler: ${JSON.stringify(validateSchema.errors)}`);
});
