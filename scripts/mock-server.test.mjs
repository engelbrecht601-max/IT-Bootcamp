import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "./mock-server.mjs";

test("GET /claims listet alle Musterakten", () => {
  const [status, body] = handle("GET", "/claims");
  assert.equal(status, 200);
  assert.ok(body.length >= 3);
  assert.ok(body.every((c) => c.href.startsWith("/claims/")));
});

test("eine Akte per Grenze und Testfall", () => {
  const [status, body] = handle("GET", "/claims/1-2/standardfall");
  assert.equal(status, 200);
  assert.equal(body.claimId, "SCH-2026-00101");
});

test("per claimId kommt der neueste Stand", () => {
  const [status, body] = handle("GET", "/claims/SCH-2026-00101");
  assert.equal(status, 200);
  const newest = Math.max(...handle("GET", "/claims")[1].filter((c) => c.claimId === "SCH-2026-00101").map((c) => c.currentStage));
  assert.equal(body.meta.currentStage, newest);
});

test("unbekannte Pfade und Schreibversuche", () => {
  assert.equal(handle("GET", "/claims/9-9/nix")[0], 404);
  assert.equal(handle("GET", "/foo")[0], 404);
  assert.equal(handle("POST", "/claims")[0], 405);
  assert.equal(handle("OPTIONS", "/claims")[0], 204);
});
