// MVP Gruppe 1: zeigt, was die Schadenaufnahme mit den heute umgesetzten Anforderungen tut.
// Eingangsakte, Zielakte und Contract kommen vom Mock-Server, die Logik aus src/.
// Start im Repo-Root: PORT=4100 node --import tsx packages/stage1/demo/mvp.ts
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { run } from "../src/index.js";
import type { Claim, Report } from "../src/claim.js";
import { normalizePolicyNumber } from "../src/normalize.js";
import { validate as validateReport } from "../src/validate.js";
import { classifyDamage, isUnknownDamageType } from "../src/classify.js";
import { isLateReport, ownDamageFlag, POSSIBLE_OWN_DAMAGE } from "../src/flags.js";
import { addMonths, dayOf } from "../src/dates.js";
import { MOCK, mock, esc, json, pill, page, offline, type Tone } from "./shared.js";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 4100);
const CASES = ["standardfall", "grenzfall", "ablehnungskandidat"] as const;
const FIELDS = ["policyNumber", "incidentDate", "reportedAt", "damageType", "description", "claimedAmount"] as const;

const report = (name: string): Report => JSON.parse(readFileSync(join(PKG, "fixtures", "eingang", `${name}.json`), "utf8"));

/** Deterministischer Bearbeitungszeitpunkt: der Meldezeitpunkt, sonst ein fester Ersatzwert. */
function processedAt(r: Report): Date {
  const parsed = r.reportedAt ? Date.parse(r.reportedAt) : NaN;
  return Number.isNaN(parsed) ? new Date("2026-11-05T09:00:00Z") : new Date(parsed);
}

/** Eingangsakte wie in der Conformance: Zielakte des Mock-Servers ohne stage1, leerer Trace, Stage 1. */
function inputClaim(target: Claim): Claim {
  const { stage1, ...rest } = structuredClone(target) as Claim;
  return { ...rest, meta: { ...rest.meta, currentStage: 1 }, trace: [] };
}

type Case = {
  name: string;
  report: Report;
  target: Claim;
  output: Claim;
  valid: boolean;
  errors: string[];
  diff: { field: string; actual: unknown; expected: unknown; same: boolean }[];
  rules: { req: string; text: string; tone: Tone }[];
};

function buildCase(name: string, target: Claim, validate: (c: unknown) => boolean): Case {
  const r = report(name);
  const output = run(inputClaim(target), r, processedAt(r));
  const valid = validate(output);
  const errors = ((validate as any).errors ?? []).map((e: any) => `${e.instancePath || "/"} ${e.message}`);
  const stage1 = output.stage1;
  const diff = stage1
    ? [
        ...FIELDS.map((f) => ({ field: f, actual: (stage1 as any)[f], expected: (target.stage1 as any)?.[f] })),
        { field: "claimant.name", actual: stage1.claimant.name, expected: (target.stage1 as any)?.claimant?.name },
      ].map((d) => ({ ...d, same: JSON.stringify(d.actual) === JSON.stringify(d.expected) }))
    : [];
  return { name, report: r, target, output, valid, errors, diff, rules: rulesOf(r, output) };
}

/** Welche Anforderung an dieser Meldung sichtbar gearbeitet hat; dieselben Funktionen wie in run(). */
function rulesOf(r: Report, output: Claim): { req: string; text: string; tone: Tone }[] {
  const rules: { req: string; text: string; tone: Tone }[] = [];
  const normalized = r.policyNumber ? normalizePolicyNumber(r.policyNumber) : null;
  if (normalized && normalized !== r.policyNumber)
    rules.push({ req: "G1-REQ-002", text: `Nummer korrigiert: „${r.policyNumber}“ → ${normalized}`, tone: "warn" });

  const problems = validateReport(r);
  if (problems.length) rules.push({ req: "G1-REQ-001/010", text: `Rückfrage: ${problems.map((p) => p.code).join(", ")}`, tone: "bad" });

  const facts = r.personInjured === true || r.propertyDamaged === true || (r.personInjured === false && r.propertyDamaged === false);
  const damageType = classifyDamage(r);
  if (damageType)
    rules.push({
      req: "G1-REQ-004",
      text: facts
        ? `${damageType} aus den Fakten abgeleitet (Person verletzt: ${fmt(r.personInjured)}, Sache beschädigt: ${fmt(r.propertyDamaged)})`
        : `${damageType}, so wie vom Kunden genannt`,
      tone: facts && r.damageType && r.damageType !== damageType ? "warn" : "ok",
    });
  if (isUnknownDamageType(r)) rules.push({ req: "G1-REQ-010", text: `Schadenart laut Kunde unbekannt: „${r.damageType}“`, tone: "warn" });

  if (r.incidentDate && r.reportedAt && dayOf(r.reportedAt) && /^\d{4}-\d{2}-\d{2}$/.test(r.incidentDate)) {
    const late = isLateReport(r.incidentDate, r.reportedAt);
    rules.push({
      req: "G1-REQ-006",
      text: `Spätmeldung: ${late ? "ja" : "nein"} (Grenze ${addMonths(r.incidentDate, 6)}, gemeldet ${dayOf(r.reportedAt)})`,
      tone: late ? "warn" : "ok",
    });
  }
  const own = ownDamageFlag(r);
  if (own)
    rules.push({
      req: "G1-REQ-007",
      text: own === POSSIBLE_OWN_DAMAGE ? `Möglicher Eigenschaden: „${r.claimantName}“ ist Versicherungsnehmer oder Hausverwaltung` : "Eigenschaden nicht prüfbar: kein Versicherungsnehmer angegeben",
      tone: "warn",
    });
  rules.push({
    req: "G1-REQ-008",
    text: output.error ? `Abbruch, currentStage bleibt ${output.meta.currentStage}` : `Übergabe an Stage ${output.meta.currentStage}, genau ein Trace-Eintrag`,
    tone: output.error ? "bad" : "ok",
  });
  return rules;
}

const fmt = (v: boolean | undefined) => (v === undefined ? "–" : v ? "ja" : "nein");

/** Anforderungen aus requirements.md mit Status und Anzahl der Tests, die ihre ID im Namen tragen. */
function requirements() {
  const text = readFileSync(join(PKG, "requirements.md"), "utf8").replace(/```[\s\S]*?```/g, "");
  const tests = readdirSync(join(PKG, "src"))
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => readFileSync(join(PKG, "src", f), "utf8"))
    .join("\n");
  return text.split(/^### /m).slice(1).flatMap((block) => {
    const head = /^(G1-REQ-\d{3}):\s*(.*)$/m.exec(block);
    if (!head) return [];
    const status = /\*\*Status:\*\*\s*(\S+)/.exec(block)?.[1] ?? "?";
    const files = /\*\*Umgesetzt in:\*\*\s*(.*)$/m.exec(block)?.[1] ?? "–";
    const count = tests.split(`[${head[1]}]`).length - 1;
    return [{ id: head[1], title: head[2], status, files, count }];
  });
}

/** Proben: eine Meldung, ein geänderter Wert, damit jeder Pfad einmal sichtbar wird. */
function probes(target: Claim, validate: (c: unknown) => boolean) {
  const base = report("standardfall");
  const variants: { label: string; change: Partial<Report>; drop?: (keyof Report)[] }[] = [
    { label: "ohne Versicherungsscheinnummer", change: {}, drop: ["policyNumber"] },
    { label: "Nummer einer fremden Sparte (XY-4711023)", change: { policyNumber: "XY-4711023" } },
    { label: "Schadentag „Mitte Dezember“", change: { incidentDate: "Mitte Dezember" } },
    { label: "Schadentag nach dem Meldetag", change: { incidentDate: "2026-11-04" } },
    { label: "Meldezeitpunkt „gestern“", change: { reportedAt: "gestern" } },
    { label: "ohne Telefon und E-Mail", change: {}, drop: ["claimantPhone", "claimantEmail"] },
    { label: "ohne Schadenart und ohne Fakten", change: {}, drop: ["damageType", "personInjured", "propertyDamaged"] },
    { label: "Schadenart „Unfall“, Mensch verletzt", change: { damageType: "Unfall" as any, personInjured: true } },
    { label: "Anspruchsteller ist der Versicherungsnehmer", change: { claimantName: "Eigentümergemeinschaft Lindenstraße 12" } },
    { label: "Schadentag 10 Monate vor der Meldung", change: { incidentDate: "2026-01-03" } },
    { label: "ohne Versicherungsnehmer", change: {}, drop: ["policyholderName"] },
  ];
  return variants.map(({ label, change, drop }) => {
    const r: Report = { ...base, ...change };
    for (const key of drop ?? []) delete r[key];
    const output = run(inputClaim(target), r, processedAt(r));
    return {
      label,
      aborted: Boolean(output.error),
      code: output.error?.code ?? "–",
      note: output.trace.at(-1)?.note ?? "",
      stage: output.meta.currentStage,
      valid: validate(output),
    };
  });
}

function render(schema: any, cases: Case[], probeRows: ReturnType<typeof probes>, claimCount: number): string {
  const reqs = requirements();
  const done = reqs.filter((r) => r.status === "verifiziert").length;

  const reqTable = `<div class="scroll"><table>
    <tr><th>ID</th><th>Anforderung</th><th>Status</th><th>Umgesetzt in</th><th>Tests</th></tr>
    ${reqs
      .map(
        (r) => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.title)}</td>
          <td>${pill(r.status, r.status === "verifiziert" ? "ok" : r.status === "spezifiziert" ? "warn" : "neutral")}</td>
          <td class="muted">${esc(r.files.replace(/`/g, ""))}</td>
          <td class="mono">${r.count}</td></tr>`,
      )
      .join("")}
  </table></div>`;

  const caseCards = cases
    .map((c) => {
      const stage1 = c.output.stage1;
      const last = c.output.trace.at(-1)!;
      const flags = stage1?.flags;
      return `<div class="card">
      <h3>${esc(c.name)} ${c.output.error ? pill("abgebrochen", "bad") : pill("erfasst → Stage 2", "ok")}</h3>
      <dl class="kv">
        <dt>Akte</dt><dd class="mono">${esc(c.output.claimId)}</dd>
        <dt>Eingang</dt><dd>${esc(c.report.channel ?? "–")}, gemeldet ${esc(dayOf(c.report.reportedAt ?? "") ?? "–")}</dd>
        <dt>Anspruchsteller</dt><dd>${esc(c.report.claimantName ?? "–")}</dd>
        <dt>Forderung</dt><dd>${stage1?.claimedAmount !== undefined ? esc(stage1.claimedAmount.toFixed(2)) + " €" : "nicht genannt"}</dd>
        <dt>Schadenart</dt><dd>${esc(stage1?.damageType ?? "–")}</dd>
      </dl>
      <p class="hint" style="margin-top:10px">Regeln, die hier gegriffen haben:</p>
      <div class="chips">${c.rules.map((r) => pill(`${r.req}`, r.tone)).join("")}</div>
      <table>${c.rules.map((r) => `<tr><td class="mono muted">${esc(r.req)}</td><td>${esc(r.text)}</td></tr>`).join("")}</table>
      <p class="hint" style="margin-top:10px">Markierungen für die Deckungsprüfung:</p>
      ${
        flags?.length
          ? `<div class="chips">${flags.map((f) => pill(`${f.type}: ${f.reason}`, "warn")).join("")}</div>`
          : `<p class="muted">Feld <code>stage1.flags</code> ${flags ? "ist leer" : "noch nicht gesetzt"} – G1-REQ-011 ist spezifiziert, aber nicht umgesetzt. Bis dahin steht alles im Freitext der Trace-<code>note</code>:</p>`
      }
      <p class="mono">${esc(last.note ?? "")}</p>
      ${c.output.error ? `<p class="x mono">${esc(c.output.error.code)}: ${esc(c.output.error.message)}</p>` : ""}
      <p class="hint" style="margin-top:10px">Gegen den Contract: ${c.valid ? '<span class="y">valide</span>' : `<span class="x">invalide</span> ${esc(c.errors.join("; "))}`}
        · gegen die Zielakte <code>/claims/1-2/${esc(c.name)}</code>: ${
          c.diff.every((d) => d.same) ? '<span class="y">alle Felder gleich</span>' : `<span class="x">${c.diff.filter((d) => !d.same).length} abweichend</span>`
        }</p>
      ${
        c.diff.some((d) => !d.same)
          ? `<table>${c.diff.filter((d) => !d.same).map((d) => `<tr><td class="mono">${esc(d.field)}</td><td class="x">${esc(JSON.stringify(d.actual))}</td><td class="muted">statt ${esc(JSON.stringify(d.expected))}</td></tr>`).join("")}</table>`
          : ""
      }
      <details><summary>Eingangsmeldung und Ergebnis als JSON</summary>
        <p class="hint">Eingangsmeldung (ungeprüft, wie vom Kunden):</p><pre>${json(c.report)}</pre>
        <p class="hint">Akte für die Deckungsprüfung:</p><pre>${json(c.output)}</pre>
      </details>
    </div>`;
    })
    .join("");

  const probeTable = `<div class="scroll"><table>
    <tr><th>Geänderte Angabe</th><th>Ergebnis</th><th>Fehlercode</th><th>Stage</th><th>Notiz im Trace</th><th>Contract</th></tr>
    ${probeRows
      .map(
        (p) => `<tr><td>${esc(p.label)}</td>
          <td>${p.aborted ? pill("Rückfrage", "bad") : pill("erfasst", "ok")}</td>
          <td class="mono">${esc(p.code)}</td><td class="mono">${p.stage}</td>
          <td class="muted">${esc(p.note)}</td>
          <td>${p.valid ? '<span class="y">valide</span>' : '<span class="x">invalide</span>'}</td></tr>`,
      )
      .join("")}
  </table></div>`;

  return page(
    "Gruppe 1 · MVP Schadenaufnahme",
    `Daten vom Mock-Server <code>${esc(MOCK)}</code> (${claimCount} Akten, Contract ${esc(schema["x-contractVersion"])}).
     Eingangsmeldung → <code>run()</code> → Akte für die Deckungsprüfung. ${done} von ${requirements().length} Anforderungen verifiziert.`,
    `<h2>Was die Schadenaufnahme heute kann</h2>
     <p class="hint">Status und Testzahl aus <code>requirements.md</code> und den Testdateien, nicht gepflegt von Hand.</p>
     ${reqTable}
     <h2>Die drei Musterfälle durch die Stage</h2>
     <p class="hint">Eingangsakte und Zielakte kommen aus <code>/claims/1-2/&lt;fall&gt;</code>, geprüft wird gegen <code>/schema</code>.</p>
     <div class="grid">${caseCards}</div>
     <h2>Das Regelwerk an einer Meldung</h2>
     <p class="hint">Immer der Standardfall, ein Wert geändert. So sieht man Rückfrage (Regel 1) und Erfassen mit Hinweis (Regel 2) nebeneinander.</p>
     ${probeTable}`,
  );
}

createServer(async (_req, res) => {
  try {
    const [schema, list] = await Promise.all([mock<any>("/schema"), mock<any[]>("/claims")]);
    const ajv = new (Ajv as any)({ strict: false, allErrors: true });
    (addFormats as any)(ajv);
    const validate = ajv.compile(schema);
    const targets = await Promise.all(CASES.map((name) => mock<Claim>(`/claims/1-2/${name}`)));
    const cases = CASES.map((name, i) => buildCase(name, targets[i], validate));
    const body = render(schema, cases, probes(targets[0], validate), list.length);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch (e) {
    res.writeHead(e instanceof Error && /HTTP|fetch/.test(e.message) ? 502 : 500, { "content-type": "text/html; charset=utf-8" });
    res.end(offline(e));
  }
}).listen(PORT, () => console.log(`MVP Gruppe 1 läuft auf http://localhost:${PORT}/ (Mock: ${MOCK})`));
