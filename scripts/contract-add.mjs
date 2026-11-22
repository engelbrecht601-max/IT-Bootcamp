#!/usr/bin/env node
// Contract-Felder ohne Antrag, Subagent und Eskalation: pnpm contracts:add <entwurf.json | ->
//
// Entwurf: { "requirementId": "T2-REQ-001", "rationale": "<ein Satz>", "fragment": { "properties": { "stage2": { "properties": { … } } } } }
// Statt requirementId geht auch { "wish": "W3", "task": 2, … }, wenn das Feld einen Wunsch erfüllt.
//
// Das Skript entscheidet sofort und allein:
//   - neues Feld oder neuer Enum-Wert im eigenen Block  → angelegt, gilt sofort für die ganze Gruppe
//   - Pflichtfeld                                       → wird als optionales Feld angelegt
//   - Feld im Block eines anderen Arbeitsplatzes        → wird als Wunsch an diesen Arbeitsplatz geschickt
//   - meta, trace, error, bestehende Felder ändern      → abgelehnt, mit dem Weg, der stattdessen geht
// Niemand wartet auf die Workshop-Leitung. Die Ausgabe beginnt mit ANGELEGT, WUNSCH, HINWEIS oder ABGELEHNT.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { TASKS, UI_TASKS } from "./lib/tasks.mjs";
import { classify, compose, loadPatches, readJson } from "./lib/contract.mjs";
import { addWish, answerWish, mainRoot, withLock } from "./lib/desks.mjs";
import { taskOfId } from "./lib/requirements.mjs";
import { ROOT, die, git, identityEnv, session } from "./lib/session.mjs";
import { pull } from "./sync.mjs";

const STAGE_OF = { stage1: 1, stage2: 2, stage3: 3, stage4: 4 };
const NOBODY = {
  meta: "meta gehört niemandem und bleibt, wie es ist. Was du festhalten willst, kommt als Feld in deinen eigenen Block.",
  trace: "Der Trace hat eine feste Form: genau ein Eintrag pro Stage, Freitext in note. Mehr Angaben gehören als Feld in deinen eigenen Block.",
  error: "Der error-Block hat eine feste Form (stage, code, message). Den Grund schreibst du in message, alles Weitere in deinen eigenen Block.",
};

const arg = process.argv[2];
if (!arg) die("Aufruf: pnpm contracts:add <entwurf.json | ->", 64);
let draft;
try {
  draft = JSON.parse(readFileSync(arg === "-" ? 0 : arg, "utf8"));
} catch (err) {
  die(`Der Entwurf ist kein gültiges JSON: ${err.message}`, 64);
}

const { desk, state, admin } = session();
if (!desk && !admin) die("Diese Sitzung gehört zu keinem Arbeitsplatz.");
const task = draft.wish ? Number(draft.task) : taskOfId(draft.requirementId);
if (!TASKS[task]) die(draft.wish ? "Bei einem Wunsch gehört task (1–4) in den Entwurf." : `requirementId "${draft.requirementId}" ist keine Anforderungs-ID.`, 64);
if (desk && !desk.tasks.includes(task)) die(`Task ${task} gehört nicht zu deinem Arbeitsplatz.`);
const requirementId = draft.wish ? `T${task}-REQ-000` : draft.requirementId;
const rationale = String(draft.rationale ?? "").trim();
if (!rationale) die("rationale fehlt: ein Satz, wofür das Feld gebraucht wird.", 64);
const blocks = draft.fragment?.properties;
if (!blocks || typeof blocks !== "object") die('fragment muss die Form { "properties": { "stage<N>": { "properties": { … } } } } haben.', 64);

const out = [];
const rejected = [];
const own = {};
let wishes = 0;
const person = desk?.persons.join(" & ") ?? "Workshop-Leitung";
const ownerOf = (t) => state?.desks.find((d) => d.tasks.includes(t));

for (const [block, frag] of Object.entries(blocks)) {
  const fields = Object.keys(frag?.properties ?? {}).join(", ") || "(ohne Feld)";
  if (NOBODY[block]) {
    rejected.push(`${block}: ${NOBODY[block]}`);
  } else if (!(block in STAGE_OF)) {
    rejected.push(`${block} ist kein Block des Contracts. Es gibt stage1 bis stage4.`);
  } else if (STAGE_OF[block] !== task || UI_TASKS.includes(task)) {
    // Fremder Block: Das Feld kann nur der Arbeitsplatz anlegen, dem der Block gehört.
    const to = STAGE_OF[block];
    if (desk?.tasks.includes(to)) {
      rejected.push(`${block} gehört zu deinem eigenen Arbeitsplatz. Stell den Entwurf mit einer Anforderung aus Task ${to}.`);
    } else {
      addWish({ from: person, fromDesk: desk?.slug ?? "leitung", toTask: to, text: `${rationale} (gewünscht in ${block}: ${fields})` });
      wishes++;
      out.push(`WUNSCH: ${block}.${fields} gehört ${ownerOf(to)?.persons.join(" & ") ?? `Task ${to}`} (${TASKS[to].name}). Der Wunsch liegt dort, die Antwort erscheint von selbst. Bis dahin: das Feld lesen, wenn es da ist, und sonst ohne weiterarbeiten.`);
    }
  } else {
    const clean = structuredClone(frag);
    if ("required" in clean) {
      delete clean.required;
      out.push(`HINWEIS: Pflichtfelder gibt es nicht, ${block}.${fields} ist als optionales Feld angelegt. Ob es gesetzt ist, prüft deine Anforderung im Test.`);
    }
    own[block] = clean;
  }
}

if (Object.keys(own).length) {
  const main = mainRoot(ROOT);
  const requirementsText = existsSync(join(ROOT, "packages", TASKS[task].pkg, "requirements.md"))
    ? readFileSync(join(ROOT, "packages", TASKS[task].pkg, "requirements.md"), "utf8")
    : "";
  try {
    withLock("merge", () => {
      const patchDir = join(main, "contracts", "patches");
      mkdirSync(patchDir, { recursive: true });
      const schema = compose(readJson(join(main, "contracts", "claim.base.schema.json")), loadPatches(patchDir));
      const prefix = `T${task}-CR-`;
      const taken = readdirSync(patchDir).filter((f) => f.startsWith(prefix)).map((f) => Number(f.slice(prefix.length, -5)));
      const id = `${prefix}${String(Math.max(0, ...taken) + 1).padStart(3, "0")}`;
      const request = { id, task, requirementId, rationale, fragment: { properties: own } };
      const verdict = classify(schema, request, { requirementsText, skipRequirementCheck: Boolean(draft.wish) });
      if (verdict.decision === "reject") {
        rejected.push(...verdict.reasons);
        return;
      }
      const now = new Date().toISOString();
      const patch = { ...request, ...(draft.wish ? { wish: draft.wish } : {}), requestedAt: now, status: "freigegeben", approvedAt: now, approvedBy: "auto", decisionNote: verdict.reasons.join("; ") };
      const file = join(patchDir, `${id}.json`);
      writeFileSync(file, JSON.stringify(patch, null, 2) + "\n");
      const build = spawnSync(process.execPath, ["scripts/contracts-build.mjs"], { cwd: main, encoding: "utf8" });
      if (build.status !== 0) {
        rmSync(file);
        spawnSync(process.execPath, ["scripts/contracts-build.mjs"], { cwd: main, stdio: "ignore" });
        rejected.push(`Das Feld würde die Musterakten ungültig machen:\n${`${build.stdout}${build.stderr}`.trim().split("\n").slice(-6).join("\n")}`);
        return;
      }
      git(["add", "--", `contracts/patches/${id}.json`], { cwd: main });
      git(["commit", "--quiet", "--only", "-m", `feat(contract): ${id} ${Object.keys(own).join(", ")} for ${requirementId}`, "--", `contracts/patches/${id}.json`], {
        cwd: main,
        env: desk ? identityEnv(desk) : {},
      });
      const added = Object.entries(own).flatMap(([b, f]) => Object.keys(f.properties ?? {}).map((k) => `${b}.${k}`));
      out.unshift(`ANGELEGT: ${added.join(", ")} (${id}). Das Feld gilt ab sofort für die ganze Gruppe.`);
      if (draft.wish) {
        const wish = answerWish(draft.wish, `Angelegt: ${added.join(", ")}`);
        out.push(`Wunsch ${wish.id} von ${wish.from} ist damit beantwortet.`);
      }
    });
    if (desk && !rejected.length) pull(desk);
  } catch (err) {
    die(err.message);
  }
}

if (out.length) console.log(out.join("\n"));
if (rejected.length) {
  console.error(`ABGELEHNT:\n  - ${rejected.join("\n  - ")}\nZulässig ist ein neues Feld im eigenen Block: englischer Name in camelCase, deutsche description, Objekte mit "additionalProperties": false.`);
  process.exit(3);
}
process.exit(wishes && !Object.keys(own).length ? 4 : 0);
