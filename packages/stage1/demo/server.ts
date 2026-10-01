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

function requirements() {
  const text = readFileSync(join(PKG, "requirements.md"), "utf8");
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
    if (url.pathname.endsWith("/api/requirements")) return send(requirements());
    if (url.pathname.endsWith("/api/tests")) return send(tests());
    return send(page, "text/html");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(String(e));
  }
}).listen(PORT, () => console.log(`Demo Gruppe 1 läuft auf http://localhost:${PORT}/`));
