// Demo für Gruppe 1: zeigt den Durchlauf Eingangsmeldung → run() → Akte und den Stand der Anforderungen.
// Start im Repo-Root: node --import tsx packages/stage1/demo/server.ts  (Port per PORT, Standard 4000)
// Alle Links sind relativ, damit die Seite auch hinter dem code-server-Proxy (/proxy/4000/) funktioniert.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { run, type Claim, type Report } from "../src/index.js";
import { normalizePolicyNumber } from "../src/normalize.js";
import { validate as validateReport } from "../src/validate.js";
import { classifyDamage, isUnknownDamageType } from "../src/classify.js";
import { isLateReport, ownDamageFlag, POSSIBLE_OWN_DAMAGE } from "../src/flags.js";
import { addMonths, dayOf } from "../src/dates.js";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(PKG, "..", "..");
const CASES = ["standardfall", "grenzfall", "ablehnungskandidat"] as const;
const PORT = Number(process.env.PORT ?? 4000);

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

function validator() {
  const ajv = new (Ajv as any)({ strict: false, allErrors: true });
  (addFormats as any)(ajv);
  return ajv.compile(readJson(join(ROOT, "contracts", "claim.schema.json")));
}

function inputClaim(name: string): Claim {
  const { stage1, ...rest } = readJson(join(ROOT, "fixtures", "1-2", `${name}.json`));
  return { ...rest, meta: { ...rest.meta, currentStage: 1 }, trace: [] };
}

function process1(name: string, report: Report) {
  const validate = validator();
  const output = run(inputClaim(name), report);
  const valid = validate(output);
  const target = readJson(join(ROOT, "fixtures", "1-2", `${name}.json`));
  const fields = ["policyNumber", "incidentDate", "reportedAt", "damageType", "description", "claimedAmount"] as const;
  const diff = output.stage1
    ? [...fields.map((f) => [f, (output.stage1 as any)[f], target.stage1[f]]), ["claimant.name", output.stage1.claimant.name, target.stage1.claimant.name]]
        .map(([field, actual, expected]) => ({ field, actual, expected, same: JSON.stringify(actual) === JSON.stringify(expected) }))
    : [];
  return { output, valid, errors: validate.errors ?? [], diff };
}

type Step = { title: string; state: "ok" | "warn" | "bad" | "skip"; lines: string[] };

// Erklärt für den Spielplatz, was jeder Schritt von run() mit der Meldung macht.
// Nutzt dieselben Funktionen wie run(), damit Erklärung und Ergebnis nicht auseinanderlaufen.
function explain(report: Report, output: Claim): Step[] {
  const steps: Step[] = [];
  const raw = report.policyNumber;
  const normalized = typeof raw === "string" && raw.trim() ? normalizePolicyNumber(raw) : null;
  steps.push({
    title: "1 Normalisieren",
    state: !raw?.trim() ? "skip" : normalized ? (normalized === raw ? "ok" : "warn") : "bad",
    lines: !raw?.trim() ? ["Keine Versicherungsscheinnummer angegeben."]
      : normalized === raw ? [`„${raw}“ ist bereits korrekt.`]
      : normalized ? [`„${raw}“ → „${normalized}“ (stillschweigend korrigiert, G1-REQ-002)`]
      : [`„${raw}“ ist auch nach Korrektur nicht GH- plus sieben Ziffern.`],
  });

  const problems = validateReport(report);
  steps.push({
    title: "2 Prüfen (Rückfrage, falls etwas fehlt)",
    state: problems.length ? "bad" : "ok",
    lines: problems.length ? problems.map((p) => `${p.code}: ${p.message}`) : ["Pflichtangaben, Kontakt, Versicherungsschein und Schadentag in Ordnung."],
  });

  const damageType = classifyDamage(report);
  const facts = report.personInjured === true || report.propertyDamaged === true || (report.personInjured === false && report.propertyDamaged === false);
  const unknown = isUnknownDamageType(report);
  const overridden = facts && report.damageType && !unknown && report.damageType !== damageType;
  steps.push({
    title: "3 Einordnen",
    state: damageType === null ? "bad" : overridden || unknown ? "warn" : "ok",
    lines: damageType === null ? ["SCHADENART_UNKLAR: weder Schadenart vom Kunden noch Fakten (Person verletzt / Sache beschädigt)."]
      : facts ? [`${damageType}, abgeleitet aus den Fakten (Person verletzt: ${fmt(report.personInjured)}, Sache beschädigt: ${fmt(report.propertyDamaged)}).`,
          ...(overridden ? [`Kundenangabe „${report.damageType}“ überstimmt: die Fakten entscheiden (G1-REQ-004).`] : []),
          ...(unknown ? [`Kundenangabe „${report.damageType}“ ist keine der drei Schadenarten: Hinweis in der note (G1-REQ-010, Regel 2).`] : [])]
      : [`${damageType}, so wie vom Kunden genannt (keine Fakten angegeben).`],
  });

  const lines: string[] = [];
  let late = false, own = false;
  if (report.incidentDate && report.reportedAt && dayOf(report.reportedAt) && /^\d{4}-\d{2}-\d{2}$/.test(report.incidentDate)) {
    late = isLateReport(report.incidentDate, report.reportedAt);
    lines.push(`Spätmeldung: ${late ? "ja" : "nein"}. Grenze ${addMonths(report.incidentDate, 6)}, gemeldet am ${dayOf(report.reportedAt)}.`);
  } else lines.push("Spätmeldung: nicht prüfbar (Schadentag oder Meldezeitpunkt fehlt).");
  const ownFlag = ownDamageFlag(report);
  own = ownFlag !== null;
  lines.push(ownFlag === POSSIBLE_OWN_DAMAGE ? `Möglicher Eigenschaden: ja, Anspruchsteller „${report.claimantName}“ ist Versicherungsnehmer oder Hausverwaltung.`
    : ownFlag ? "Eigenschaden nicht prüfbar: kein Versicherungsnehmer angegeben (G1-REQ-007, Variante B)."
    : "Möglicher Eigenschaden: nein.");
  steps.push({ title: "4 Markieren", state: late || own ? "warn" : "ok", lines });

  const last = output.trace.at(-1)!;
  steps.push({
    title: "5 Übergeben",
    state: output.error ? "bad" : "ok",
    lines: output.error
      ? [`Abgebrochen mit ${output.error.code}. Kein Block stage1, currentStage bleibt ${output.meta.currentStage}.`]
      : [`Erfasst, Übergabe an Stage ${output.meta.currentStage}. Trace-note: „${last.note ?? ""}“`],
  });
  // run() bricht nach Schritt 2 bzw. 3 ab; die späteren Schritte zeigen wir nur zur Information.
  const skipped = problems.length ? steps.slice(2, 4) : damageType === null ? steps.slice(3, 4) : [];
  for (const s of skipped) {
    s.state = "skip";
    s.lines.unshift("Nicht ausgeführt, weil vorher abgebrochen wurde. Nur zur Info:");
  }
  return steps;
}

const fmt = (v: boolean | undefined) => (v === undefined ? "–" : v ? "ja" : "nein");

function requirements() {
  const text = readFileSync(join(PKG, "requirements.md"), "utf8").replace(/```[\s\S]*?```/g, ""); // Vorlage im Codeblock ignorieren
  return text.split(/^### /m).slice(1).flatMap((s) => {
    const m = /^(G1-REQ-\d{3}):\s*(.*)$/m.exec(s);
    const status = /\*\*Status:\*\*\s*(\S+)/.exec(s)?.[1] ?? "?";
    return m ? [{ id: m[1], title: m[2], status }] : [];
  });
}

function tests() {
  const res = spawnSync(process.execPath, ["--import", "tsx", "--test", "--test-reporter=tap", join(PKG, "src", "*.test.ts")], { cwd: ROOT, encoding: "utf8" });
  const lines = res.stdout.split("\n");
  const results = lines.flatMap((l) => {
    const m = /^(not ok|ok) \d+ - (\[G1-REQ-\d{3}\].*)$/.exec(l);
    return m ? [{ ok: m[1] === "ok", name: m[2] }] : [];
  });
  return { results, pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length };
}

const page = readFileSync(join(PKG, "demo", "index.html"), "utf8");

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  const send = (body: unknown, type = "application/json") => {
    res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  try {
    if (url.pathname.endsWith("/api/cases")) {
      return send(CASES.map((name) => {
        const report = readJson(join(PKG, "fixtures", "eingang", `${name}.json`));
        return { name, report, ...process1(name, report) };
      }));
    }
    if (url.pathname.endsWith("/api/run") && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { name, report } = JSON.parse(body);
          send({ name, report, ...process1(CASES.includes(name) ? name : "standardfall", report) });
        } catch (e) {
          send({ failure: String(e) });
        }
      });
      return;
    }
    if (url.pathname.endsWith("/api/play") && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { report } = JSON.parse(body);
          const validate = validator();
          const output = run(inputClaim("standardfall"), report);
          send({ output, valid: validate(output), errors: validate.errors ?? [], steps: explain(report, output) });
        } catch (e) {
          send({ failure: String(e) });
        }
      });
      return;
    }
    if (url.pathname.endsWith("/api/requirements")) return send(requirements());
    if (url.pathname.endsWith("/api/tests")) return send(tests());
    return send(page, "text/html");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(String(e));
  }
}).listen(PORT, () => console.log(`Demo Gruppe 1 läuft auf http://localhost:${PORT}/`));
