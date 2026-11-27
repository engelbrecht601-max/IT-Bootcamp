import { test } from "node:test";
import assert from "node:assert/strict";
import { hasOpenFence, parseRequirements, setField } from "./requirements.mjs";

const DOC = `# Anforderungen Task 2

## Vorlage

\`\`\`markdown
### T2-REQ-001: Kurzer Titel

- **User Story:** Als …
- **Status:** offen
- **Verifiziert:** –
\`\`\`

## Anforderungen

### T2-REQ-001: Vertragslaufzeit prüfen

- **User Story:** Als Sachbearbeiterin möchte ich …
- **Akzeptanzkriterien:**
  1. Gegeben …, wenn …, dann …
  2. Gegeben …, wenn …, dann …
- **Status:** offen
- **Quelle:** Interview vom 2026-11-27
- **Umgesetzt in:** –
- **Verifiziert:** –

### T2-REQ-002: Eigenschaden

- **User Story:** Als …
- **Akzeptanzkriterien:**
  1. Gegeben …
- **Status:** \`spezifiziert\`

## Offene Fragen an die Fachperson

- **Status:** dieser Abschnitt ist keine Anforderung
`;

test("die Vorlage im Codeblock ist keine Anforderung", () => {
  const reqs = parseRequirements(DOC);
  assert.deepEqual(reqs.map((r) => [r.id, r.status, r.criteria]), [["T2-REQ-001", "offen", 2], ["T2-REQ-002", "spezifiziert", 1]]);
  assert.equal(reqs[0].title, "Vertragslaufzeit prüfen");
});

test("Status wird in der Anforderung gesetzt, nie in der Vorlage und nie im Abschnitt danach", () => {
  const out = setField(DOC, "T2-REQ-001", "Status", "verifiziert");
  assert.equal(parseRequirements(out)[0].status, "verifiziert");
  assert.equal(out.match(/\*\*Status:\*\* offen/g).length, 1, "die Vorlage bleibt auf offen");
  assert.match(out, /dieser Abschnitt ist keine Anforderung/);
  assert.equal(parseRequirements(setField(out, "T2-REQ-002", "Status", "umgesetzt"))[1].status, "umgesetzt");
});

test("fehlt die Zeile, wird sie in der Anforderung ergänzt", () => {
  const out = setField(DOC, "T2-REQ-002", "Verifiziert", "2026-11-27, pnpm test:req grün");
  const section = out.slice(out.indexOf("### T2-REQ-002"), out.indexOf("## Offene Fragen"));
  assert.match(section, /- \*\*Verifiziert:\*\* 2026-11-27, pnpm test:req grün/);
  assert.equal(parseRequirements(out).length, 2);
});

test("unbekannte ID und offener Codeblock fallen auf", () => {
  assert.throws(() => setField(DOC, "T2-REQ-009", "Status", "offen"), /steht nicht in der requirements.md/);
  assert.equal(hasOpenFence(DOC), false);
  const broken = DOC.replace("- **Verifiziert:** –\n```", "- **Verifiziert:** –");
  assert.equal(hasOpenFence(broken), true);
  assert.equal(parseRequirements(broken).length, 0, "hinter einem offenen Codeblock wird nichts erkannt");
});

test("Status und Verifiziert ändert nur pnpm req, neue Anforderungen beginnen offen", async () => {
  const { statusEditProblem } = await import("./requirements.mjs");
  const doc = (status, verified = "–", extra = "") =>
    `# Anforderungen\n\n## Anforderungen\n### T1-REQ-001: Meldung\n\n- **Akzeptanzkriterien:**\n  1. Gegeben a, wenn b, dann c\n- **Status:** ${status}\n- **Verifiziert:** ${verified}\n${extra}`;
  const second = (status) => `\n### T1-REQ-002: Zweite\n\n- **Status:** ${status}\n- **Verifiziert:** –\n`;
  assert.equal(statusEditProblem(doc("offen"), doc("offen").replace("dann c", "dann d")), null);
  assert.equal(statusEditProblem(doc("offen"), doc("offen", "–", second("offen"))), null);
  assert.match(statusEditProblem(doc("offen"), doc("spezifiziert")), /pnpm req/);
  assert.match(statusEditProblem(doc("offen"), doc("offen", "–", second("spezifiziert"))), /beginnt mit/);
  assert.match(statusEditProblem(doc("umgesetzt"), doc("umgesetzt", "2026-11-27, alles gut")), /Prüfer/);
  assert.equal(statusEditProblem("", doc("offen")), null);
  assert.match(statusEditProblem("", doc("spezifiziert")), /beginnt mit/);
});
