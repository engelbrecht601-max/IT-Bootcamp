import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

// Initialize Ajv validator
// strict: false allows custom keywords like x-contractVersion and x-patches
const ajv = new (Ajv as any)({ strict: false });
(addFormats as any)(ajv);

// Load the schema
const schemaContent = readFileSync("./contracts/claim.schema.json", "utf-8");
const schema = JSON.parse(schemaContent);
const validate = ajv.compile(schema);

// Load test fixtures from the common starting situation (fixtures/1-2/)
const standardfallFixture: Claim = JSON.parse(
  readFileSync("./fixtures/1-2/standardfall.json", "utf-8")
);

const grenzfallFixture: Claim = JSON.parse(
  readFileSync("./fixtures/1-2/grenzfall.json", "utf-8")
);

const ablehnungskandidatFixture: Claim = JSON.parse(
  readFileSync("./fixtures/1-2/ablehnungskandidat.json", "utf-8")
);

// Load input reports (Eingangsmeldung)
const standardfallReport: Report = JSON.parse(
  readFileSync("./packages/stage1/fixtures/eingang/standardfall.json", "utf-8")
);

const grenzfallReport: Report = JSON.parse(
  readFileSync("./packages/stage1/fixtures/eingang/grenzfall.json", "utf-8")
);

const ablehnungskandidatReport: Report = JSON.parse(
  readFileSync("./packages/stage1/fixtures/eingang/ablehnungskandidat.json", "utf-8")
);

/**
 * Helper function to create input claim from fixture.
 * Following "Gemeinsame Ausgangslage":
 * - Input claim is fixtures/1-2/<name> without stage1 block
 * - Empty trace array
 * - meta.currentStage: 1
 */
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

/**
 * Helper function to create an input claim with a foreign block (e.g., stage2)
 * to test immutability of foreign blocks.
 */
function createInputClaimWithForeignBlock(fixture: Claim): Claim {
  const claim = createInputClaim(fixture);
  // Add a fake stage2 block to test immutability
  return {
    ...claim,
    stage2: {
      completedAt: "2026-11-03T09:00:00Z",
      coverageDecision: "gedeckt",
    },
  };
}

test("[G1-REQ-008] Gegeben eine vollständige Meldung, dann ist die Akte valide gegen das Schema", () => {
  // Test all three test cases to ensure schema compliance
  const testCases = [
    { fixture: standardfallFixture, report: standardfallReport, now: new Date("2026-11-03T08:40:00Z") },
    { fixture: grenzfallFixture, report: grenzfallReport, now: new Date("2026-11-04T14:30:00Z") },
    {
      fixture: ablehnungskandidatFixture,
      report: ablehnungskandidatReport,
      now: new Date("2026-11-05T10:00:00Z"),
    },
  ];

  for (const { fixture, report, now } of testCases) {
    const inputClaim = createInputClaim(fixture);
    const result = run(inputClaim, report, now);

    // Validate result against schema using Ajv
    const isValid = validate(result);
    if (!isValid) {
      console.error("Validation errors:", validate.errors);
    }
    assert.ok(isValid, `Claim should be valid against schema. Errors: ${JSON.stringify(validate.errors)}`);

    // Ensure stage1 block exists and contains required fields
    assert.ok(result.stage1, "stage1 block should exist");
    assert.ok(result.stage1.completedAt, "completedAt should be set");
    assert.ok(result.stage1.policyNumber, "policyNumber should be set");
    assert.ok(result.stage1.incidentDate, "incidentDate should be set");
    assert.ok(result.stage1.reportedAt, "reportedAt should be set");
    assert.ok(result.stage1.damageType, "damageType should be set");
    assert.ok(result.stage1.description, "description should be set");
    assert.ok(result.stage1.claimant, "claimant should be set");
    assert.ok(result.stage1.claimant.name, "claimant.name should be set");

    // Ensure required envelope fields exist
    assert.ok(result.claimId, "claimId should exist");
    assert.ok(result.meta, "meta should exist");
    assert.ok(result.trace, "trace should exist");
  }
});

test("[G1-REQ-008] Gegeben eine Akte mit n Trace-Einträgen, dann hat sie danach genau n+1 Einträge, der letzte hat stage: 1, und kein bestehender Eintrag ist verändert", () => {
  // Test with zero existing entries
  let inputClaim = createInputClaim(standardfallFixture);
  let result = run(inputClaim, standardfallReport, new Date("2026-11-03T08:40:00Z"));
  assert.equal(result.trace.length, 1, "Should have exactly 1 trace entry (0 existing + 1 new)");
  assert.equal(result.trace[0].stage, 1, "New trace entry should have stage: 1");

  // Test with one existing entry
  inputClaim = createInputClaim(standardfallFixture);
  const existingEntry = {
    stage: 1 as const,
    at: "2026-11-03T08:00:00Z",
    action: "erfasst" as const,
    note: "Existing entry",
  };
  inputClaim.trace = [existingEntry];
  result = run(inputClaim, standardfallReport, new Date("2026-11-03T08:40:00Z"));
  assert.equal(result.trace.length, 2, "Should have exactly 2 trace entries (1 existing + 1 new)");
  assert.equal(result.trace[result.trace.length - 1].stage, 1, "Last trace entry should have stage: 1");
  // Ensure existing entry is not modified
  assert.deepEqual(result.trace[0], existingEntry, "Existing trace entry should not be modified");

  // Test with multiple existing entries
  inputClaim = createInputClaim(standardfallFixture);
  const entry1 = {
    stage: 1 as const,
    at: "2026-11-03T07:00:00Z",
    action: "erfasst" as const,
    note: "First",
  };
  const entry2 = {
    stage: 1 as const,
    at: "2026-11-03T08:00:00Z",
    action: "erfasst" as const,
    note: "Second",
  };
  inputClaim.trace = [entry1, entry2];
  result = run(inputClaim, standardfallReport, new Date("2026-11-03T08:40:00Z"));
  assert.equal(result.trace.length, 3, "Should have exactly 3 trace entries (2 existing + 1 new)");
  assert.equal(result.trace[result.trace.length - 1].stage, 1, "Last trace entry should have stage: 1");
  // Ensure no existing entries are modified
  assert.deepEqual(result.trace[0], entry1, "First existing entry should not be modified");
  assert.deepEqual(result.trace[1], entry2, "Second existing entry should not be modified");
});

test("[G1-REQ-008] Gegeben eine vollständige Meldung, dann sind stage1.completedAt und at des neuen Trace-Eintrags gesetzt und gleich", () => {
  const now = new Date("2026-11-03T08:40:00Z");
  const inputClaim = createInputClaim(standardfallFixture);
  const result = run(inputClaim, standardfallReport, now);

  // Check that stage1.completedAt is set
  assert.ok(result.stage1, "stage1 block should exist");
  assert.ok(result.stage1.completedAt, "stage1.completedAt should be set");

  // Check that the trace entry's at is set
  const lastEntry = result.trace[result.trace.length - 1];
  assert.ok(lastEntry.at, "Trace entry's at should be set");

  // Check that they are equal
  assert.equal(
    result.stage1.completedAt,
    lastEntry.at,
    "stage1.completedAt should equal trace entry's at"
  );

  // Verify the timestamp matches the input 'now'
  assert.equal(result.stage1.completedAt, now.toISOString(), "completedAt should match the input 'now'");
});

test("[G1-REQ-008] Gegeben eine Akte, dann sind alle Felder außerhalb von stage1, trace, error und meta.currentStage unverändert", () => {
  // Test with a simple case (no foreign blocks)
  let inputClaim = createInputClaim(standardfallFixture);
  const originalClaimId = inputClaim.claimId;
  const originalContractVersion = inputClaim.meta.contractVersion;
  const originalCreatedAt = inputClaim.meta.createdAt;
  const originalTestCase = inputClaim.meta.testCase;

  let result = run(inputClaim, standardfallReport, new Date("2026-11-03T08:40:00Z"));

  // Check that envelope fields outside modifiable set are unchanged
  assert.equal(result.claimId, originalClaimId, "claimId should not be modified");
  assert.equal(result.meta.contractVersion, originalContractVersion, "meta.contractVersion should not be modified");
  assert.equal(result.meta.createdAt, originalCreatedAt, "meta.createdAt should not be modified");
  assert.equal(result.meta.testCase, originalTestCase, "meta.testCase should not be modified");

  // Check that currentStage IS changed (to 2)
  assert.equal(result.meta.currentStage, 2, "meta.currentStage should be changed to 2");

  // Ensure no unexpected fields were added
  const allowedRootKeys = new Set(["claimId", "meta", "trace", "error", "stage1"]);
  for (const key of Object.keys(result)) {
    assert.ok(allowedRootKeys.has(key), `Unexpected root key "${key}" found in result`);
  }

  // Test with a claim that has existing foreign blocks to ensure they are preserved
  inputClaim = createInputClaimWithForeignBlock(standardfallFixture);
  const originalStage2 = JSON.parse(JSON.stringify(inputClaim.stage2));

  result = run(inputClaim, standardfallReport, new Date("2026-11-03T08:40:00Z"));

  // Check that foreign block (stage2) is unchanged
  assert.deepEqual(
    result.stage2,
    originalStage2,
    "Foreign block (stage2) should not be modified"
  );

  // Also verify that stage1 is not present in input but is created in output
  assert.ok(!createInputClaim(standardfallFixture).stage1, "Input should not have stage1");
  assert.ok(result.stage1, "Output should have stage1");
});

test("[G1-REQ-008] Gegeben eine Eingangsakte, dann wird sie nicht mutiert", () => {
  // This test ensures that the input claim object itself is not mutated
  const inputClaim = createInputClaim(standardfallFixture);
  const inputClaimDeepCopy = JSON.parse(JSON.stringify(inputClaim));

  // Call run()
  run(inputClaim, standardfallReport, new Date("2026-11-03T08:40:00Z"));

  // Verify that inputClaim is identical to its deep copy (i.e., not mutated)
  assert.deepEqual(
    inputClaim,
    inputClaimDeepCopy,
    "Input claim should not be mutated by run()"
  );
});
