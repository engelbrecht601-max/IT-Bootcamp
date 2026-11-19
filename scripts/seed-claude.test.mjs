import { test } from "node:test";
import assert from "node:assert/strict";
import { authMode, seed, configPath } from "./seed-claude.mjs";

test("Anmeldung: API-Key vor Abo-Token, leere Werte zählen nicht", () => {
  assert.equal(authMode({ ANTHROPIC_API_KEY: "sk-ant-x", CLAUDE_CODE_OAUTH_TOKEN: "tok" }), "api");
  assert.equal(authMode({ ANTHROPIC_API_KEY: "", CLAUDE_CODE_OAUTH_TOKEN: "tok" }), "abo");
  assert.equal(authMode({ ANTHROPIC_API_KEY: "  ", CLAUDE_CODE_OAUTH_TOKEN: "" }), "keine");
  assert.equal(authMode({}), "keine");
});

test("Onboarding und Ordner-Vertrauen werden gesetzt, Bestehendes bleibt", () => {
  const before = { theme: "dark", projects: { "/home/node/workspace": { allowedTools: ["x"] }, "/other": { a: 1 } } };
  const after = seed(before, { workspaces: ["/home/node/workspace"] });
  assert.equal(after.hasCompletedOnboarding, true);
  assert.equal(after.theme, "dark");
  assert.deepEqual(after.projects["/home/node/workspace"], { allowedTools: ["x"], hasTrustDialogAccepted: true });
  assert.deepEqual(after.projects["/other"], { a: 1 });
  assert.equal(before.hasCompletedOnboarding, undefined, "Eingabe bleibt unverändert");
});

test("API-Key wird über seine letzten 20 Zeichen freigegeben, auch nach früherer Ablehnung", () => {
  const key = "sk-ant-api03-" + "a".repeat(30) + "ENDE1234567890abcdef";
  const after = seed({ customApiKeyResponses: { approved: ["alt"], rejected: ["ENDE1234567890abcdef"] } }, { apiKey: key });
  assert.deepEqual(after.customApiKeyResponses, { approved: ["alt", "ENDE1234567890abcdef"], rejected: [] });
  const twice = seed(after, { apiKey: key });
  assert.deepEqual(twice.customApiKeyResponses.approved, ["alt", "ENDE1234567890abcdef"], "idempotent");
});

test("ohne API-Key (Abo-Token) keine Key-Freigabe", () => {
  assert.equal(seed({}, { apiKey: undefined }).customApiKeyResponses, undefined);
});

test("Konfigurationspfad folgt CLAUDE_CONFIG_DIR", () => {
  assert.equal(configPath({ CLAUDE_CONFIG_DIR: "/cfg" }), "/cfg/.claude.json");
  assert.match(configPath({}), /\.claude\.json$/);
});
