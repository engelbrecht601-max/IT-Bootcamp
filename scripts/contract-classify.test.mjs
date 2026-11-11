import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, compose, deepMerge, readJson, BASE_SCHEMA } from "./lib/contract.mjs";

const base = readJson(BASE_SCHEMA);
const reqText = "| G2-REQ-001 | ... |\n| G1-REQ-004 | ... |";

function request(overrides = {}) {
  return {
    id: "G2-CR-001",
    group: 2,
    requirementId: "G2-REQ-001",
    rationale: "Die Deckungsprüfung braucht den Selbstbehalt.",
    fragment: {
      properties: {
        stage2: {
          properties: {
            deductible: { description: "Selbstbehalt laut Vertrag.", type: "number", minimum: 0 },
          },
        },
      },
    },
    ...overrides,
  };
}
const run = (r) => classify(base, r, { requirementsText: reqText });

test("additives optionales Feld im eigenen Block wird freigegeben", () => {
  assert.equal(run(request()).decision, "approve");
});

test("Feld in fremdem Block wird abgelehnt", () => {
  const r = request({ fragment: { properties: { stage3: { properties: { foo: { description: "x", type: "string" } } } } } });
  assert.equal(run(r).decision, "reject");
});

test("Änderung eines bestehenden Felds wird abgelehnt", () => {
  const r = request({ fragment: { properties: { stage2: { properties: { reasoning: { description: "neu", type: "array" } } } } } });
  assert.equal(run(r).decision, "reject");
});

test("Erweiterung eines bestehenden Enums wird eskaliert", () => {
  const r = request({ fragment: { properties: { stage2: { properties: { coverageDecision: { enum: ["teilweise gedeckt"] } } } } } });
  assert.equal(run(r).decision, "escalate");
});

test("Änderungen an meta werden eskaliert", () => {
  const r = request({ fragment: { properties: { meta: { properties: { priority: { description: "x", type: "string" } } } } } });
  assert.equal(run(r).decision, "escalate");
});

test("neues Pflichtfeld wird eskaliert", () => {
  const r = request();
  r.fragment.properties.stage2.required = ["deductible"];
  assert.equal(run(r).decision, "escalate");
});

test("Reject schlägt Escalate", () => {
  const r = request({
    fragment: {
      properties: {
        meta: { properties: { x: { description: "x", type: "string" } } },
        stage1: { properties: { y: { description: "y", type: "string" } } },
      },
    },
  });
  assert.equal(run(r).decision, "reject");
});

test("neuer geteilter Top-Level-Block wird abgelehnt", () => {
  const r = request({ fragment: { properties: { shared: { type: "object" } } } });
  assert.equal(run(r).decision, "reject");
});

test("Formfehler werden abgelehnt", () => {
  assert.equal(run(request({ id: "CR-1" })).decision, "reject");
  assert.equal(run(request({ group: 3 })).decision, "reject");
  assert.equal(run(request({ requirementId: "G2-REQ-999" })).decision, "reject");
  assert.equal(run(request({ requirementId: "G1-REQ-004" })).decision, "reject");
  assert.equal(run(request({ rationale: " " })).decision, "reject");
});

test("Feldname muss camelCase sein, Beschreibung Pflicht, Objekte geschlossen", () => {
  const field = (name, def) => request({ fragment: { properties: { stage2: { properties: { [name]: def } } } } });
  assert.equal(run(field("Selbstbehalt", { description: "x", type: "number" })).decision, "reject");
  assert.equal(run(field("deductible", { type: "number" })).decision, "reject");
  assert.equal(run(field("limits", { description: "x", type: "object", properties: {} })).decision, "reject");
  assert.equal(
    run(field("limits", { description: "x", type: "object", additionalProperties: false, properties: {} })).decision,
    "approve",
  );
});

test("compose erhöht pro Patch die Minor-Version und lehnt ungültige Patches ab", () => {
  const p = { ...request(), approvedAt: "2026-11-20T10:00:00Z" };
  const built = compose(base, [p]);
  assert.equal(built["x-contractVersion"], "1.1.0");
  assert.ok(built.properties.stage2.properties.deductible);
  assert.throws(() => compose(base, [{ ...p, group: 3, id: "G3-CR-001" }]));
});

test("deepMerge ist additiv", () => {
  assert.deepEqual(deepMerge({ a: { b: 1 }, r: ["x"] }, { a: { c: 2 }, r: ["y"] }), { a: { b: 1, c: 2 }, r: ["x", "y"] });
});
