#!/usr/bin/env node
// Prüft die requirements.md aller Packages:
// - IDs haben das Format G<N>-REQ-<NNN> der eigenen Gruppe und sind eindeutig
// - jeder Eintrag hat User Story, Akzeptanzkriterien und einen gültigen Status
// - jedes umgesetzte oder verifizierte Requirement hat mindestens einen Test mit der ID im Namen
// - IDs, die im Code oder in Tests stehen, gibt es auch in der requirements.md
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const PACKAGES = { stage1: 1, stage2: 2, stage3: 3, stage4: 4, ui: 5 };
const STATUS = ["offen", "spezifiziert", "umgesetzt", "verifiziert", "gestrichen"];
const NEEDS_TEST = new Set(["umgesetzt", "verifiziert"]);
const errors = [];
let count = 0;

for (const [pkg, group] of Object.entries(PACKAGES)) {
  const dir = join(ROOT, "packages", pkg);
  const file = join(dir, "requirements.md");
  if (!existsSync(file)) {
    errors.push(`${pkg}: requirements.md fehlt`);
    continue;
  }
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, ""); // Vorlagen in Codeblöcken ignorieren
  const sections = text.split(/^### /m).slice(1);
  const defined = new Set();

  for (const section of sections) {
    const id = /^(G[0-9]-REQ-[0-9]{3})\b/.exec(section)?.[1];
    const where = `${relative(ROOT, file)}: ${section.split("\n")[0]}`;
    if (!id) {
      errors.push(`${where} → Überschrift muss mit G${group}-REQ-NNN beginnen`);
      continue;
    }
    if (!id.startsWith(`G${group}-`)) errors.push(`${where} → ID gehört nicht zu Gruppe ${group}`);
    if (defined.has(id)) errors.push(`${where} → ID doppelt vergeben`);
    defined.add(id);
    count++;

    if (!/\*\*User Story:\*\*\s*\S/.test(section)) errors.push(`${where} → User Story fehlt`);
    if (!/\*\*Akzeptanzkriterien:\*\*[\s\S]*?(Gegeben|Wenn|Dann)/i.test(section)) {
      errors.push(`${where} → Akzeptanzkriterien (Gegeben/Wenn/Dann) fehlen`);
    }
    const status = /\*\*Status:\*\*\s*([a-zäöü]+)/i.exec(section)?.[1]?.toLowerCase();
    if (!STATUS.includes(status)) errors.push(`${where} → Status muss einer von ${STATUS.join(", ")} sein`);
    if (NEEDS_TEST.has(status) && !testFiles(dir).some((f) => readFileSync(f, "utf8").includes(id))) {
      errors.push(`${where} → Status ${status}, aber kein Test mit ${id} im Namen`);
    }
  }

  for (const f of sourceFiles(dir)) {
    for (const [ref] of readFileSync(f, "utf8").matchAll(/G[0-9]-REQ-[0-9]{3}/g)) {
      if (ref.startsWith(`G${group}-`) && !defined.has(ref)) {
        errors.push(`${relative(ROOT, f)} → ${ref} steht nicht in der requirements.md`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${count} Requirement(s) geprüft`);

function sourceFiles(dir) {
  const src = join(dir, "src");
  return existsSync(src) ? walk(src).filter((f) => /\.(ts|tsx|js|mjs|vue|svelte)$/.test(f)) : [];
}
function testFiles(dir) {
  return sourceFiles(dir).filter((f) => /\.test\.[a-z]+$/.test(f));
}
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return n === "node_modules" ? [] : statSync(p).isDirectory() ? walk(p) : [p];
  });
}
