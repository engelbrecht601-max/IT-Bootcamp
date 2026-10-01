import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";
import { readFileSync } from "node:fs";

// Load the test fixtures
const standardfallFixture: Claim = JSON.parse(
  readFileSync("./fixtures/1-2/standardfall.json", "utf-8")
);

const standardfallReport: Report = JSON.parse(
  readFileSync("./packages/stage1/fixtures/eingang/standardfall.json", "utf-8")
);

// Helper function to create input claim
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

test("[G1-REQ-008] Gegeben eine vollständige Meldung, dann ist die Akte valide gegen das Schema", () => {
  const inputClaim = createInputClaim(standardfallFixture);
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(inputClaim, standardfallReport, now);

  // Verify required fields for stage1 block
  assert.ok(result.stage1, "stage1 block should exist");
  assert.ok(result.stage1.completedAt, "completedAt should be set");
  assert.ok(result.stage1.policyNumber, "policyNumber should be set");
  assert.ok(result.stage1.incidentDate, "incidentDate should be set");
  assert.ok(result.stage1.reportedAt, "reportedAt should be set");
  assert.ok(result.stage1.damageType, "damageType should be set");
  assert.ok(result.stage1.description, "description should be set");
  assert.ok(result.stage1.claimant, "claimant should be set");
  assert.ok(result.stage1.claimant.name, "claimant.name should be set");

  // Verify required fields for claim envelope
  assert.ok(result.claimId, "claimId should exist");
  assert.ok(result.meta, "meta should exist");
  assert.ok(result.trace, "trace should exist");
});

test("[G1-REQ-008] Gegeben eine Akte mit n Trace-Einträgen, dann hat sie danach genau n+1 Einträge, der letzte hat stage: 1, und kein bestehender Eintrag ist verändert", () => {
  // Create input claim with one existing trace entry
  const inputClaim = createInputClaim(standardfallFixture);
  const existingTraceEntry = {
    stage: 1 as const,
    at: "2026-11-03T08:00:00Z",
    action: "erfasst" as const,
    note: "Existing entry",
  };
  inputClaim.trace = [existingTraceEntry];

  const now = new Date("2026-11-03T08:40:00Z");
  const result = run(inputClaim, standardfallReport, now);

  // Check that we have exactly n+1 entries
  assert.equal(
    result.trace.length,
    2,
    "Should have exactly 2 trace entries (1 existing + 1 new)"
  );

  // Check that the last entry has stage: 1
  const lastEntry = result.trace[result.trace.length - 1];
  assert.equal(lastEntry.stage, 1, "Last trace entry should have stage: 1");

  // Check that the existing entry is not modified
  assert.deepEqual(
    result.trace[0],
    existingTraceEntry,
    "Existing trace entry should not be modified"
  );
});

test("[G1-REQ-008] Gegeben eine vollständige Meldung, dann sind stage1.completedAt und at des neuen Trace-Eintrags gesetzt und gleich", () => {
  const inputClaim = createInputClaim(standardfallFixture);
  const now = new Date("2026-11-03T08:40:00Z");

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
});

test("[G1-REQ-008] Gegeben eine Akte, dann sind alle Felder außerhalb von stage1, trace, error und meta.currentStage unverändert", () => {
  const inputClaim = createInputClaim(standardfallFixture);
  // Store the original values of fields outside the modifiable set
  const originalClaimId = inputClaim.claimId;
  const originalCreatedAt = inputClaim.meta.createdAt;
  const originalContractVersion = inputClaim.meta.contractVersion;
  const originalTestCase = inputClaim.meta.testCase;

  const now = new Date("2026-11-03T08:40:00Z");
  const result = run(inputClaim, standardfallReport, now);

  // Check that claimId is unchanged
  assert.equal(
    result.claimId,
    originalClaimId,
    "claimId should not be modified"
  );

  // Check that meta.createdAt is unchanged
  assert.equal(
    result.meta.createdAt,
    originalCreatedAt,
    "meta.createdAt should not be modified"
  );

  // Check that meta.contractVersion is unchanged
  assert.equal(
    result.meta.contractVersion,
    originalContractVersion,
    "meta.contractVersion should not be modified"
  );

  // Check that meta.testCase is unchanged
  assert.equal(
    result.meta.testCase,
    originalTestCase,
    "meta.testCase should not be modified"
  );

  // Ensure no unexpected fields were added to the result
  const allowedKeys = new Set(["claimId", "meta", "trace", "error", "stage1"]);
  for (const key of Object.keys(result)) {
    assert.ok(
      allowedKeys.has(key),
      `Unexpected key "${key}" found in result`
    );
  }
});
