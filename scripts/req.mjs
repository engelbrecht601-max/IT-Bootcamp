#!/usr/bin/env node
// Status und Nachweise einer Anforderung. Einziger Weg, sie zu ändern: Claude editiert diese Zeilen
// nicht von Hand.
//
//   pnpm req list                          Anforderungen des eigenen Arbeitsplatzes mit Status
//   pnpm req set <ID> spezifiziert         Tests mit der ID existieren (dürfen rot sein)
//   pnpm req set <ID> umgesetzt <Dateien>  Tests der ID sind grün
//   pnpm req verified <ID> "<Beobachtung>" Tests grün, unabhängig geprüft
//   pnpm req blocker <ID> "<Blocker>"      Prüfung hat etwas gefunden; Status bleibt umgesetzt
//   pnpm req set <ID> gestrichen           Anforderung wird nicht gebaut
//   pnpm req set <ID> offen                zurück auf Anfang (Kriterien geändert)
import { spawnSync } from "node:child_process";
import { TASKS } from "./lib/tasks.mjs";
import { STATUS, readRequirements, taskOfId, writeField } from "./lib/requirements.mjs";
import { readFlags, updateFlags } from "./lib/desks.mjs";
import { ROOT, die, session } from "./lib/session.mjs";

const [cmd, id, ...rest] = process.argv.slice(2);
const { desk, admin } = session();

if (cmd === "list") {
  const tasks = desk?.tasks ?? Object.keys(TASKS).map(Number);
  for (const t of tasks) {
    for (const r of readRequirements(ROOT, TASKS[t].pkg)) console.log(`${r.id}  ${(r.status ?? "?").padEnd(13)} ${r.title}`);
  }
  process.exit(0);
}

const task = taskOfId(id);
if (!task) die(`"${id ?? ""}" ist keine Anforderungs-ID. Beispiel: T2-REQ-001`, 64);
if (desk && !admin && !desk.tasks.includes(task)) die(`${id} gehört nicht zu deinem Arbeitsplatz.`);
const req = readRequirements(ROOT, TASKS[task].pkg).find((r) => r.id === id);
if (!req) die(`${id} steht nicht in packages/${TASKS[task].pkg}/requirements.md.`);

const tests = () => spawnSync(process.execPath, ["scripts/test-req.mjs", id], { cwd: ROOT, encoding: "utf8" });
const today = new Date().toISOString().slice(0, 10);
const note = rest.join(" ").replace(/\s+/g, " ").trim();

try {
  if (cmd === "set") {
    const status = rest[0];
    if (!STATUS.includes(status)) die(`Status muss einer von ${STATUS.join(", ")} sein.`, 64);
    if (status === "verifiziert") die(`Verifiziert setzt nur die Prüfung: pnpm req verified ${id} "<Beobachtung>"`);
    if (status === "spezifiziert") {
      if (/Kein Test mit/.test(tests().stderr ?? "")) die(`Für ${id} gibt es noch keinen Test mit [${id}] im Namen.`);
    }
    if (status === "umgesetzt") {
      const res = tests();
      if (res.status !== 0) die(`Die Tests von ${id} sind nicht grün. Erst grün, dann umgesetzt.\n${tail(res)}`);
      const files = rest.slice(1).join(" ").trim();
      if (files) writeField(ROOT, id, "Umgesetzt in", files);
    }
    writeField(ROOT, id, "Status", status);
    console.log(`✓ ${id}: ${status}`);
  } else if (cmd === "verified") {
    if (!note) die(`Beobachtung fehlt: pnpm req verified ${id} "<was geprüft wurde>"`, 64);
    if (req.status !== "umgesetzt") die(`${id} hat Status ${req.status}. Geprüft wird nur, was umgesetzt ist.`);
    const res = tests();
    if (res.status !== 0) die(`Die Tests von ${id} sind nicht grün, also nicht verifiziert.\n${tail(res)}`);
    writeField(ROOT, id, "Verifiziert", `${today}, ${note}`);
    writeField(ROOT, id, "Status", "verifiziert");
    console.log(`✓ ${id}: verifiziert`);
  } else if (cmd === "blocker") {
    if (!note) die(`Blocker fehlt: pnpm req blocker ${id} "<Blocker in einem Satz>"`, 64);
    writeField(ROOT, id, "Verifiziert", `nein, ${today}: ${note}`);
    // Wiederholte Blocker derselben Anforderung zählen: Beim zweiten bietet /weiter einen Ausweg an.
    if (desk) {
      const blockers = { ...(readFlags(desk.slug).blockers ?? {}) };
      blockers[id] = (blockers[id] ?? 0) + 1;
      updateFlags(desk.slug, { blockers });
    }
    console.log(`✓ ${id}: Blocker notiert, Status bleibt ${req.status}`);
  } else {
    die("Aufruf: pnpm req list | set <ID> <Status> | verified <ID> <Text> | blocker <ID> <Text>", 64);
  }
} catch (err) {
  die(err.message);
}

/** Die Zeilen, die sagen, was rot ist: fehlgeschlagene Tests und ihre Meldung, ohne Stacktrace. */
function tail(res) {
  const lines = `${res.stdout ?? ""}${res.stderr ?? ""}`.split("\n");
  const hits = lines.filter((l) => /^\s*not ok |^\s*(error|expected|actual):|✗/.test(l)).map((l) => l.trim());
  return (hits.length ? hits : lines.filter(Boolean).slice(-8)).slice(0, 12).join("\n");
}
