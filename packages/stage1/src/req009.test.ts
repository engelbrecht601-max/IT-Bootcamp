import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";
import { readFileSync, existsSync } from "node:fs";

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

// Helper function to create input claim from fixture
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

test("[G1-REQ-009] Gegeben die Musterakten in fixtures/1-2/, dann gibt es zu jeder eine Eingangsmeldung unter packages/stage1/fixtures/eingang/ mit gleichem Dateinamen", () => {
  // Test that for each test case (standardfall, grenzfall, ablehnungskandidat),
  // both the expected claim and input report fixtures exist
  const testCases = ["standardfall.json", "grenzfall.json", "ablehnungskandidat.json"];

  for (const testCase of testCases) {
    const expectedClaimPath = `./fixtures/1-2/${testCase}`;
    const inputReportPath = `./packages/stage1/fixtures/eingang/${testCase}`;

    assert.ok(
      existsSync(expectedClaimPath),
      `Expected claim fixture should exist at ${expectedClaimPath}`
    );
    assert.ok(
      existsSync(inputReportPath),
      `Input report fixture should exist at ${inputReportPath}`
    );

    // Verify both are valid JSON and can be loaded
    const expectedClaim = loadExpectedClaim(testCase);
    const inputReport = loadInputReport(testCase);

    assert.ok(
      expectedClaim,
      `Expected claim fixture should be valid JSON: ${testCase}`
    );
    assert.ok(
      inputReport,
      `Input report fixture should be valid JSON: ${testCase}`
    );

    // Expected claim should have stage1 block
    assert.ok(
      expectedClaim.stage1,
      `Expected claim should have stage1 block: ${testCase}`
    );
  }
});

test("[G1-REQ-009] Gegeben die Eingangsmeldung standardfall.json, dann stimmen policyNumber, incidentDate, reportedAt, damageType, description, claimant.name und claimedAmount im Block stage1 mit der Musterakte überein", () => {
  const inputReport = loadInputReport("standardfall.json");
  const expectedClaim = loadExpectedClaim("standardfall.json");
  const inputClaim = createInputClaim(expectedClaim);
  const now = new Date(expectedClaim.trace[0].at);

  const result = run(inputClaim, inputReport, now);

  // Verify that stage1 exists
  assert.ok(result.stage1, "stage1 block should exist after processing");

  // Verify that expected claim also has stage1 for comparison
  assert.ok(expectedClaim.stage1, "expected claim should have stage1 block");

  // Now we can safely access stage1 properties
  const resultStage1 = result.stage1;
  const expectedStage1 = expectedClaim.stage1;

  // Verify each field from AK3 matches the expected output
  assert.equal(
    resultStage1.policyNumber,
    expectedStage1.policyNumber,
    "policyNumber should match expected claim"
  );

  assert.equal(
    resultStage1.incidentDate,
    expectedStage1.incidentDate,
    "incidentDate should match expected claim"
  );

  assert.equal(
    resultStage1.reportedAt,
    expectedStage1.reportedAt,
    "reportedAt should match expected claim"
  );

  assert.equal(
    resultStage1.damageType,
    expectedStage1.damageType,
    "damageType should match expected claim"
  );

  assert.equal(
    resultStage1.description,
    expectedStage1.description,
    "description should match expected claim"
  );

  assert.equal(
    resultStage1.claimant.name,
    expectedStage1.claimant.name,
    "claimant.name should match expected claim"
  );

  assert.equal(
    resultStage1.claimedAmount,
    expectedStage1.claimedAmount,
    "claimedAmount should match expected claim"
  );
});

test("[G1-REQ-009] Gegeben die Eingangsmeldung grenzfall.json, dann stimmen policyNumber, incidentDate, reportedAt, damageType, description, claimant.name und claimedAmount im Block stage1 mit der Musterakte überein", () => {
  const inputReport = loadInputReport("grenzfall.json");
  const expectedClaim = loadExpectedClaim("grenzfall.json");
  const inputClaim = createInputClaim(expectedClaim);
  const now = new Date(expectedClaim.trace[0].at);

  const result = run(inputClaim, inputReport, now);

  // Verify that stage1 exists
  assert.ok(result.stage1, "stage1 block should exist after processing");
  assert.ok(expectedClaim.stage1, "expected claim should have stage1 block");

  const resultStage1 = result.stage1;
  const expectedStage1 = expectedClaim.stage1;

  // Verify each field from AK3 matches the expected output
  assert.equal(
    resultStage1.policyNumber,
    expectedStage1.policyNumber,
    "policyNumber should match expected claim"
  );

  assert.equal(
    resultStage1.incidentDate,
    expectedStage1.incidentDate,
    "incidentDate should match expected claim"
  );

  assert.equal(
    resultStage1.reportedAt,
    expectedStage1.reportedAt,
    "reportedAt should match expected claim"
  );

  assert.equal(
    resultStage1.damageType,
    expectedStage1.damageType,
    "damageType should match expected claim"
  );

  assert.equal(
    resultStage1.description,
    expectedStage1.description,
    "description should match expected claim"
  );

  assert.equal(
    resultStage1.claimant.name,
    expectedStage1.claimant.name,
    "claimant.name should match expected claim"
  );

  // claimedAmount is optional and not present in grenzfall
  assert.equal(
    resultStage1.claimedAmount,
    expectedStage1.claimedAmount,
    "claimedAmount should match expected claim (may be undefined)"
  );
});

test("[G1-REQ-009] Gegeben die Eingangsmeldung ablehnungskandidat.json, dann stimmen policyNumber, incidentDate, reportedAt, damageType, description, claimant.name und claimedAmount im Block stage1 mit der Musterakte überein", () => {
  const inputReport = loadInputReport("ablehnungskandidat.json");
  const expectedClaim = loadExpectedClaim("ablehnungskandidat.json");
  const inputClaim = createInputClaim(expectedClaim);
  const now = new Date(expectedClaim.trace[0].at);

  const result = run(inputClaim, inputReport, now);

  // Verify that stage1 exists
  assert.ok(result.stage1, "stage1 block should exist after processing");
  assert.ok(expectedClaim.stage1, "expected claim should have stage1 block");

  const resultStage1 = result.stage1;
  const expectedStage1 = expectedClaim.stage1;

  // Verify each field from AK3 matches the expected output
  assert.equal(
    resultStage1.policyNumber,
    expectedStage1.policyNumber,
    "policyNumber should match expected claim"
  );

  assert.equal(
    resultStage1.incidentDate,
    expectedStage1.incidentDate,
    "incidentDate should match expected claim"
  );

  assert.equal(
    resultStage1.reportedAt,
    expectedStage1.reportedAt,
    "reportedAt should match expected claim"
  );

  assert.equal(
    resultStage1.damageType,
    expectedStage1.damageType,
    "damageType should match expected claim"
  );

  assert.equal(
    resultStage1.description,
    expectedStage1.description,
    "description should match expected claim"
  );

  assert.equal(
    resultStage1.claimant.name,
    expectedStage1.claimant.name,
    "claimant.name should match expected claim"
  );

  assert.equal(
    resultStage1.claimedAmount,
    expectedStage1.claimedAmount,
    "claimedAmount should match expected claim"
  );
});

test("[G1-REQ-009] Gegeben die Eingangsmeldung standardfall.json mit Abweichung policyNumber: 'gh 4711023', dann korrigiert Stage 1 zu 'GH-4711023'", () => {
  const inputReport = loadInputReport("standardfall.json");
  const expectedClaim = loadExpectedClaim("standardfall.json");
  const inputClaim = createInputClaim(expectedClaim);
  const now = new Date(expectedClaim.trace[0].at);

  // Verify the input fixture contains the deviation as expected
  assert.equal(
    inputReport.policyNumber,
    "gh 4711023",
    "Input fixture should have lowercase policyNumber with space"
  );

  const result = run(inputClaim, inputReport, now);

  // Verify that run() corrects the policyNumber
  assert.ok(result.stage1, "stage1 block should exist after processing");
  assert.equal(
    result.stage1.policyNumber,
    "GH-4711023",
    "policyNumber should be normalized to uppercase with hyphen"
  );
});

test("[G1-REQ-009] Gegeben eine Eingangsmeldung mit allen definierten Feldern, dann akzeptiert Stage 1 sie ohne Fehler und verarbeitet sie", () => {
  // Create a report with all defined fields from AK1
  const completeReport: Report = {
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Test description",
    claimantName: "Test Claimant",
    claimantPhone: "0171 2345678",
    claimantEmail: "test@example.com",
    damageType: "Sachschaden",
    personInjured: false,
    propertyDamaged: true,
    policyholderName: "Test Policyholder",
    propertyManagerName: "Test Manager",
    claimedAmount: 1000.0,
  };

  const expectedClaim = loadExpectedClaim("standardfall.json");
  const inputClaim = createInputClaim(expectedClaim);
  const now = new Date("2026-11-03T08:40:00Z");

  // Should not throw an error
  const result = run(inputClaim, completeReport, now);

  // Should have created stage1 block
  assert.ok(result.stage1, "stage1 block should be created");

  // Should have added trace entry
  assert.ok(
    result.trace.length > 0,
    "trace should have at least one entry"
  );
});
