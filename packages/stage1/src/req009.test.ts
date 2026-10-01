import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";
import { readFileSync, existsSync } from "node:fs";

/**
 * G1-REQ-009: Eingangsmeldung (Rohmeldung)
 *
 * Tests for the input report structure and processing. The Report interface
 * defines the shape of raw input from phone or form, before validation or
 * normalization. These tests verify that:
 * - The Report type includes all required fields with correct types
 * - Fixture files exist for all test cases
 * - Processing produces the expected stage1 output fields
 * - Input deviations are handled correctly
 */

// Load the test fixtures
function loadInputReport(filename: string): Report {
  return JSON.parse(
    readFileSync(`./packages/stage1/fixtures/eingang/${filename}`, "utf-8")
  );
}

function loadExpectedClaim(filename: string): Claim {
  return JSON.parse(
    readFileSync(`./fixtures/1-2/${filename}`, "utf-8")
  );
}

// Helper function to create input claim from fixture without stage1 block
function createInputClaim(fixture: Claim): Claim {
  const { stage1, ...rest } = fixture;
  return {
    ...rest,
    trace: [],
    meta: {
      ...rest.meta,
      currentStage: 1,
    },
  };
}

// AK1: Gegeben eine Eingangsmeldung, dann hat sie folgende Angaben...
test("[G1-REQ-009] AK1: Report-Typ hat alle erforderlichen Felder mit korrekten Datentypen", () => {
  // Create a complete report that demonstrates all field types from AK1
  const completeReport: Report = {
    // Texte als Zeichenkette (strings)
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Schadenbeschreibung",
    claimantName: "Max Mustermann",
    claimantPhone: "0171 2345678",
    claimantEmail: "max@example.com",
    damageType: "Sachschaden",
    policyholderName: "Versicherungsnehmer",
    propertyManagerName: "Hausverwaltung",
    // Ja/Nein-Werte als Boolesche Werte
    personInjured: true,
    propertyDamaged: false,
    // Zahl für geforderter Betrag
    claimedAmount: 2340.0,
  };

  // Verify all fields exist and have correct types
  assert.equal(typeof completeReport.channel, "string");
  assert.equal(typeof completeReport.policyNumber, "string");
  assert.equal(typeof completeReport.incidentDate, "string");
  assert.equal(typeof completeReport.reportedAt, "string");
  assert.equal(typeof completeReport.description, "string");
  assert.equal(typeof completeReport.claimantName, "string");
  assert.equal(typeof completeReport.claimantPhone, "string");
  assert.equal(typeof completeReport.claimantEmail, "string");
  assert.equal(typeof completeReport.damageType, "string");
  assert.equal(typeof completeReport.policyholderName, "string");
  assert.equal(typeof completeReport.propertyManagerName, "string");
  assert.equal(typeof completeReport.personInjured, "boolean");
  assert.equal(typeof completeReport.propertyDamaged, "boolean");
  assert.equal(typeof completeReport.claimedAmount, "number");

  // Verify enums have expected values
  assert.ok(completeReport.channel, "channel should be defined");
  assert.ok(
    ["Telefon", "Formular"].includes(completeReport.channel!),
    "channel should be 'Telefon' or 'Formular'"
  );
  assert.ok(completeReport.damageType, "damageType should be defined");
  assert.ok(
    ["Personenschaden", "Sachschaden", "Vermögensschaden"].includes(completeReport.damageType!),
    "damageType should be one of the three damage types"
  );
});

// AK1b: Fields marked as optional can be omitted
test("[G1-REQ-009] AK1: Optionale Felder können fehlen", () => {
  // Minimal valid report with only mandatory fields (plus one contact method)
  const minimalReport: Report = {
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Schadenbeschreibung",
    claimantName: "Max Mustermann",
    claimantPhone: "0171 2345678",
    // All other fields omitted
  };

  // Should be valid TypeScript (no compilation error)
  assert.ok(minimalReport.policyNumber);
  assert.equal(minimalReport.damageType, undefined);
  assert.equal(minimalReport.personInjured, undefined);
  assert.equal(minimalReport.policyholderName, undefined);
});

// AK2: Gegeben die Musterakten in fixtures/1-2/, dann gibt es zu jeder eine Eingangsmeldung...
test("[G1-REQ-009] AK2: Für jede Musterakte existiert eine Eingangsmeldung mit gleichem Dateinamen", () => {
  const testCases = ["standardfall.json", "grenzfall.json", "ablehnungskandidat.json"];

  for (const testCase of testCases) {
    const expectedClaimPath = `./fixtures/1-2/${testCase}`;
    const inputReportPath = `./packages/stage1/fixtures/eingang/${testCase}`;

    assert.ok(
      existsSync(expectedClaimPath),
      `Musterakte sollte existieren: ${expectedClaimPath}`
    );
    assert.ok(
      existsSync(inputReportPath),
      `Eingangsmeldung sollte existieren: ${inputReportPath}`
    );

    // Verify both are valid JSON and can be loaded
    const expectedClaim = loadExpectedClaim(testCase);
    const inputReport = loadInputReport(testCase);

    assert.ok(expectedClaim, `Musterakte sollte valid JSON sein: ${testCase}`);
    assert.ok(inputReport, `Eingangsmeldung sollte valid JSON sein: ${testCase}`);
  }
});

// AK3: Gegeben eine dieser Eingangsmeldungen, wenn Stage 1 sie verarbeitet,
// dann stimmen policyNumber, incidentDate, reportedAt, damageType, description,
// claimant.name und claimedAmount im Block stage1 mit der Musterakte überein.
test("[G1-REQ-009] AK3: Standardfall – stage1-Felder stimmen mit Musterakte überein", () => {
  const inputReport = loadInputReport("standardfall.json");
  const expectedClaim = loadExpectedClaim("standardfall.json");
  const inputClaim = createInputClaim(expectedClaim);

  assert.ok(expectedClaim.trace[0]?.at, "Expected claim should have trace entry");
  const now = new Date(expectedClaim.trace[0].at);

  const result = run(inputClaim, inputReport, now);

  assert.ok(result.stage1, "stage1 block sollte nach Verarbeitung existieren");
  assert.ok(expectedClaim.stage1, "Expected claim should have stage1 block");

  const resultStage1 = result.stage1;
  const expectedStage1 = expectedClaim.stage1;

  // Verify each field mentioned in AK3
  assert.equal(resultStage1.policyNumber, expectedStage1.policyNumber);
  assert.equal(resultStage1.incidentDate, expectedStage1.incidentDate);
  assert.equal(resultStage1.reportedAt, expectedStage1.reportedAt);
  assert.equal(resultStage1.damageType, expectedStage1.damageType);
  assert.equal(resultStage1.description, expectedStage1.description);
  assert.equal(resultStage1.claimant.name, expectedStage1.claimant.name);
  assert.equal(resultStage1.claimedAmount, expectedStage1.claimedAmount);
});

test("[G1-REQ-009] AK3: Grenzfall – stage1-Felder stimmen mit Musterakte überein", () => {
  const inputReport = loadInputReport("grenzfall.json");
  const expectedClaim = loadExpectedClaim("grenzfall.json");
  const inputClaim = createInputClaim(expectedClaim);

  assert.ok(expectedClaim.trace[0]?.at, "Expected claim should have trace entry");
  const now = new Date(expectedClaim.trace[0].at);

  const result = run(inputClaim, inputReport, now);

  assert.ok(result.stage1, "stage1 block sollte nach Verarbeitung existieren");
  assert.ok(expectedClaim.stage1, "Expected claim should have stage1 block");

  const resultStage1 = result.stage1;
  const expectedStage1 = expectedClaim.stage1;

  // Verify each field mentioned in AK3
  assert.equal(resultStage1.policyNumber, expectedStage1.policyNumber);
  assert.equal(resultStage1.incidentDate, expectedStage1.incidentDate);
  assert.equal(resultStage1.reportedAt, expectedStage1.reportedAt);
  assert.equal(resultStage1.damageType, expectedStage1.damageType);
  assert.equal(resultStage1.description, expectedStage1.description);
  assert.equal(resultStage1.claimant.name, expectedStage1.claimant.name);
  // claimedAmount is optional; grenzfall does not have it
  assert.equal(resultStage1.claimedAmount, expectedStage1.claimedAmount);
});

test("[G1-REQ-009] AK3: Ablehnungskandidat – stage1-Felder stimmen mit Musterakte überein", () => {
  const inputReport = loadInputReport("ablehnungskandidat.json");
  const expectedClaim = loadExpectedClaim("ablehnungskandidat.json");
  const inputClaim = createInputClaim(expectedClaim);

  assert.ok(expectedClaim.trace[0]?.at, "Expected claim should have trace entry");
  const now = new Date(expectedClaim.trace[0].at);

  const result = run(inputClaim, inputReport, now);

  assert.ok(result.stage1, "stage1 block sollte nach Verarbeitung existieren");
  assert.ok(expectedClaim.stage1, "Expected claim should have stage1 block");

  const resultStage1 = result.stage1;
  const expectedStage1 = expectedClaim.stage1;

  // Verify each field mentioned in AK3
  assert.equal(resultStage1.policyNumber, expectedStage1.policyNumber);
  assert.equal(resultStage1.incidentDate, expectedStage1.incidentDate);
  assert.equal(resultStage1.reportedAt, expectedStage1.reportedAt);
  assert.equal(resultStage1.damageType, expectedStage1.damageType);
  assert.equal(resultStage1.description, expectedStage1.description);
  assert.equal(resultStage1.claimant.name, expectedStage1.claimant.name);
  assert.equal(resultStage1.claimedAmount, expectedStage1.claimedAmount);
});

// AK4: Gegeben die Eingangsmeldung standardfall.json, dann enthält sie mindestens
// eine Abweichung, die Stage 1 korrigieren muss
test("[G1-REQ-009] AK4: Standardfall enthält Abweichung – policyNumber wird normalisiert", () => {
  const inputReport = loadInputReport("standardfall.json");
  const expectedClaim = loadExpectedClaim("standardfall.json");

  // Verify the input fixture contains the deviation as expected
  assert.equal(
    inputReport.policyNumber,
    "gh 4711023",
    "Eingangsmeldung sollte den fehlerhaften policyNumber haben"
  );

  const inputClaim = createInputClaim(expectedClaim);
  const now = new Date(expectedClaim.trace[0].at);
  const result = run(inputClaim, inputReport, now);

  // Verify that run() corrects the policyNumber
  assert.ok(result.stage1, "stage1 block sollte existieren");
  assert.equal(
    result.stage1.policyNumber,
    "GH-4711023",
    "policyNumber sollte zu Großbuchstaben mit Bindestrich normalisiert werden"
  );
});

// AK4b: Verify that grenzfall and ablehnungskandidat also have a valid structure
// but may not require corrections
test("[G1-REQ-009] AK4: Grenzfall und Ablehnungskandidat sind gültige Eingangsmeldungen", () => {
  const testCases = ["grenzfall.json", "ablehnungskandidat.json"];

  for (const testCase of testCases) {
    const inputReport = loadInputReport(testCase);
    const expectedClaim = loadExpectedClaim(testCase);
    const inputClaim = createInputClaim(expectedClaim);

    assert.ok(expectedClaim.trace[0]?.at, `Expected claim should have trace entry for ${testCase}`);
    const now = new Date(expectedClaim.trace[0].at);

    // Should process without throwing an error
    const result = run(inputClaim, inputReport, now);

    assert.ok(result.stage1, `stage1 block sollte für ${testCase} existieren`);
    assert.equal(result.meta.currentStage, 2, `currentStage sollte für ${testCase} 2 sein`);
  }
});
