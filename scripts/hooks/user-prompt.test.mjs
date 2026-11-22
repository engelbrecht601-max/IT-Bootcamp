import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HARD_LIMIT, SOFT_LIMIT, contextTokens, decide } from "./user-prompt.mjs";

const desk = { persons: ["Anna"], tasks: [2], slug: "anna" };
const status = (flags = {}) => ({ flags, line: "Level 2 von 6 (Standardfall) · T2-REQ-001 · Schritt: umsetzen", next: { hints: [], id: "T2-REQ-001" }, wishes: { answered: [] } });
const ask = (prompt, extra = {}) => decide({ prompt, desk, status: status(), group: "1", ...extra });

test("Terminal-Befehle im Chat werden abgefangen (Eingaben vom 21.11.)", () => {
  for (const p of ["pnpm desk 2 nils", "pnbm desk 4", "cpnpm interview 3", "pnpm check", "cd/home/node/workspace", "git push", "npx getdesign@latest add sap"]) {
    assert.match(ask(p).block ?? "", /Terminal-Befehl.*\/weiter/, p);
  }
  assert.match(ask("clear").block, /\/clear/);
  assert.match(ask("weiter").block, /\/weiter/);
});

test("normale Sätze bleiben nicht hängen", () => {
  for (const p of ["Start das Interview", "Claude, was heißt das?", "Git ist mir neu, was passiert da?", "Was passiert, wenn die Meldung elf Monate zu spät kommt?", "/weiter", "/stand"]) {
    assert.equal(ask(p).block, undefined, p);
  }
});

test("nach einer fertigen Anforderung geht nur noch /clear", () => {
  const must = { status: status({ mustClear: true }) };
  assert.match(ask("/weiter", must).block, /\/clear/);
  assert.match(ask("mach bitte noch schnell die nächste", must).block, /\/clear/);
  assert.deepEqual(ask("/clear", must), {});
  assert.deepEqual(ask("/exit", must), {});
});

test("harte Grenze für den Kontext, davor ein Hinweis an Claude", () => {
  assert.match(ask("hallo", { contextTokens: HARD_LIMIT }).block, /voll.*\/clear/);
  assert.deepEqual(ask("/clear", { contextTokens: HARD_LIMIT * 2 }), {});
  assert.match(ask("hallo", { contextTokens: SOFT_LIMIT }).context, /\[Kontext\].*\/clear/);
  assert.doesNotMatch(ask("hallo", { contextTokens: SOFT_LIMIT - 1 }).context, /\[Kontext\]/);
});

test("jede Eingabe bekommt den Stand mit; Stapelwünsche und Abwege eine Regel dazu", () => {
  assert.match(ask("wie geht es weiter?").context, /^\[Workshop-Stand\] Anna · Deckungsprüfung · Level 2/);
  for (const p of ["Yes, implementiere alles", "kannst du alle restlichen tasks implementieren?", "verify T2-REQ-004,T2-REQ-005", "arbeite alles automatisch durch und erledige es"]) {
    assert.match(ask(p).context, /genau eine Anforderung/, p);
  }
  assert.doesNotMatch(ask("Welche Angaben brauchen Sie alle?").context, /\[Regel\]/);
  assert.match(ask("mach T2-REQ-003").context, /In Arbeit ist T2-REQ-001/);
  for (const p of ["visualisier mir meine arbeit per port forwarding", "committe meinen stand", "bau mir ein dashboard"]) {
    assert.match(ask(p).context, /macht das Setup von selbst/, p);
  }
});

test("ohne Arbeitsplatz: im Workshop gesperrt, lokal und für die Leitung offen", () => {
  assert.match(decide({ prompt: "hallo", group: "1" }).block, /keinem Arbeitsplatz/);
  assert.deepEqual(decide({ prompt: "hallo" }), {});
  assert.deepEqual(decide({ prompt: "pnpm check", group: "1", admin: true }), {});
});

test("Kontextgröße kommt aus der letzten Antwort der Hauptsitzung", () => {
  const file = join(mkdtempSync(join(tmpdir(), "transcript-")), "s.jsonl");
  const line = (usage, extra = {}) => JSON.stringify({ type: "assistant", message: { usage }, ...extra });
  writeFileSync(file, [
    line({ input_tokens: 10, cache_read_input_tokens: 1000, cache_creation_input_tokens: 5 }),
    JSON.stringify({ type: "user", message: { content: "x" } }),
    line({ input_tokens: 20, cache_read_input_tokens: 90000, cache_creation_input_tokens: 500 }),
    line({ input_tokens: 1, cache_read_input_tokens: 1 }, { isSidechain: true }),
  ].join("\n") + "\n");
  assert.equal(contextTokens(file), 90520);
  assert.equal(contextTokens(join(tmpdir(), "gibt-es-nicht.jsonl")), 0);
  assert.equal(contextTokens(undefined), 0);
});
