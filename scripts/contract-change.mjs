#!/usr/bin/env node
// Einziger Schreibweg nach contracts/. Direkte Edits blockiert der PreToolUse-Hook.
//
//   pnpm contracts:request <entwurf.json>
//       Prüft einen Antrag (Requirement vorhanden, Felder noch nicht vorhanden) und legt ihn als
//       contracts/requests/G<N>-CR-<NNN>.json mit der nächsten freien Nummer an.
//
//   pnpm contracts:decide <G<N>-CR-<NNN>> [--approve-escalated "<Begründung>" --by <contract-guard|moritz>]
//       Klassifiziert den Antrag. approve → Patch anlegen, CHANGELOG ergänzen, Contract neu bauen.
//       escalate → Eintrag in ESCALATIONS.md. reject → Antrag als abgelehnt markieren.
//       Mit --approve-escalated wird ein eskalierter Antrag freigegeben. Ein reject lässt sich nie
//       überstimmen, und Änderungen an meta darf nur moritz freigeben.
import { readFileSync, writeFileSync, readdirSync, existsSync, appendFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, CONTRACTS, BASE_SCHEMA, PATCHES, readJson, loadPatches, compose, classify } from "./lib/contract.mjs";

const REQUESTS = join(CONTRACTS, "requests");
const CHANGELOG = join(CONTRACTS, "CHANGELOG.md");
const ESCALATIONS = join(CONTRACTS, "ESCALATIONS.md");
const [, , command, ...args] = process.argv;

const current = () => compose(readJson(BASE_SCHEMA), loadPatches());
const requirementsFor = (group) => {
  const file = join(ROOT, "packages", group === 5 ? "ui" : `stage${group}`, "requirements.md");
  return existsSync(file) ? readFileSync(file, "utf8") : "";
};
const save = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const die = (msg, code = 1) => {
  console.error(`✗ ${msg}`);
  process.exit(code);
};

if (command === "request") request(args[0]);
else if (command === "decide") decide(args[0], parseFlags(args.slice(1)));
else die("Aufruf: contract-change.mjs request <entwurf.json> | decide <id> [--approve-escalated <text> --by <wer>]", 64);

function request(draftPath) {
  if (!draftPath) die("Entwurfsdatei fehlt");
  const draft = readJson(draftPath);
  const group = Number(/^G([1-5])-REQ-/.exec(draft.requirementId ?? "")?.[1]);
  if (!group) die(`requirementId "${draft.requirementId}" entspricht nicht G<N>-REQ-<NNN>`);

  const prefix = `G${group}-CR-`;
  const taken = readdirSync(REQUESTS).filter((f) => f.startsWith(prefix)).map((f) => Number(f.slice(prefix.length, -5)));
  const id = `${prefix}${String(Math.max(0, ...taken) + 1).padStart(3, "0")}`;
  const req = {
    id,
    group,
    requirementId: draft.requirementId,
    rationale: draft.rationale,
    fragment: draft.fragment,
    requestedAt: new Date().toISOString(),
    status: "offen",
  };

  // Vorprüfung mit denselben Regeln wie die Entscheidung, damit Formfehler sofort auffallen.
  const result = classify(current(), req, { requirementsText: requirementsFor(group) });
  if (result.decision === "reject") die(`Antrag würde abgelehnt:\n  - ${result.reasons.join("\n  - ")}`, 3);

  save(join(REQUESTS, `${id}.json`), req);
  console.log(JSON.stringify({ id, preview: result.decision, reasons: result.reasons }, null, 2));
}

function decide(id, flags) {
  const path = join(REQUESTS, `${id}.json`);
  if (!existsSync(path)) die(`Antrag ${id} nicht gefunden`);
  const req = readJson(path);
  if (req.status !== "offen" && req.status !== "eskaliert") die(`Antrag ${id} ist bereits ${req.status}`);

  const result = classify(current(), req, { requirementsText: requirementsFor(req.group) });
  let decision = result.decision;
  let by = "contract-classify";
  let note = result.reasons.join("; ");

  if (flags["approve-escalated"] !== undefined) {
    if (decision === "reject") die(`Das Skript lehnt ${id} ab; das lässt sich nicht überstimmen: ${note}`, 3);
    if (decision !== "escalate") die(`${id} ist nicht eskaliert (${decision})`);
    if (!["contract-guard", "moritz"].includes(flags.by)) die("--by muss contract-guard oder moritz sein");
    if (flags.by === "contract-guard" && "meta" in (req.fragment?.properties ?? {})) {
      die("Änderungen an meta gibt nur Moritz frei", 2);
    }
    if (!flags["approve-escalated"].trim()) die("Begründung für die Freigabe fehlt");
    decision = "approve";
    by = flags.by;
    note = flags["approve-escalated"];
  }

  const now = new Date().toISOString();
  if (decision === "approve") {
    const patch = { ...req, status: "freigegeben", approvedAt: now, approvedBy: by, decisionNote: note };
    const patchPath = join(PATCHES, `${id}.json`);
    save(patchPath, patch);
    try {
      // Erst bauen, dann festschreiben: ein Patch, der Fixtures bricht, wird nicht freigegeben.
      execFileSync(process.execPath, [join(ROOT, "scripts/contracts-build.mjs")], { stdio: "inherit" });
    } catch {
      unlinkSync(patchPath);
      execFileSync(process.execPath, [join(ROOT, "scripts/contracts-build.mjs")], { stdio: "ignore" });
      die(`${id} bricht den Contract-Build (siehe oben) und wurde nicht freigegeben`);
    }
    save(path, { ...req, status: "freigegeben", decidedAt: now });
    const version = current()["x-contractVersion"];
    appendFileSync(CHANGELOG, `\n## ${version} · ${id}\n\n- Requirement: ${req.requirementId}\n- ${req.rationale}\n- Freigegeben von ${by} am ${now.slice(0, 10)}: ${note}\n`);
    if (req.status === "eskaliert" && existsSync(ESCALATIONS)) {
      const text = readFileSync(ESCALATIONS, "utf8").replace(`## ${id} · offen`, `## ${id} · freigegeben von ${by}`);
      writeFileSync(ESCALATIONS, text);
    }
  } else if (decision === "escalate") {
    if (req.status !== "eskaliert") {
      save(path, { ...req, status: "eskaliert", decidedAt: now });
      appendFileSync(ESCALATIONS, `\n## ${id} · offen\n\n- Gruppe ${req.group}, Requirement ${req.requirementId}\n- ${req.rationale}\n- Grund: ${note}\n`);
    }
  } else {
    save(path, { ...req, status: "abgelehnt", decidedAt: now, decisionNote: note });
  }
  console.log(JSON.stringify({ id, decision, by, reasons: note }, null, 2));
  process.exit({ approve: 0, escalate: 2, reject: 3 }[decision]);
}

function parseFlags(list) {
  const flags = {};
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith("--")) flags[list[i].slice(2)] = list[i + 1] ?? "";
    i++;
  }
  return flags;
}
