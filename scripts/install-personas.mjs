#!/usr/bin/env node
// Spielt die Interview-Personas als Claude-Code-Subagenten nach ~/.claude/agents ein, also außerhalb des Repos.
// Die Personas kennen die versteckten Anforderungen und liegen deshalb im privaten Lösungsrepo, nie hier.
//
//   pnpm personas:install <quelle>      Quelle: Ordner oder Git-URL mit einem Unterordner personas/
//   PERSONAS_SRC=<quelle> pnpm personas:install
//
// Auf dem Workshop-Server setzt der Container-Start PERSONAS_SRC (mit Token, nur serverseitig).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export const PERSONAS = ["persona-stage1", "persona-stage2", "persona-stage3", "persona-stage4", "persona-ui"];
export const TARGET = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "agents");

export function installed() {
  return PERSONAS.filter((p) => existsSync(join(TARGET, `${p}.md`)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2] ?? process.env.PERSONAS_SRC;
  if (!src) {
    console.error("✗ Keine Quelle. Aufruf: pnpm personas:install <ordner|git-url> oder PERSONAS_SRC setzen.");
    process.exit(64);
  }
  let dir = src;
  let tmp;
  if (/^(https?:\/\/|git@)/.test(src)) {
    tmp = mkdtempSync(join(tmpdir(), "personas-"));
    execFileSync("git", ["clone", "--depth", "1", "--quiet", src, tmp], { stdio: ["ignore", "ignore", "inherit"] });
    dir = tmp;
  }
  if (existsSync(join(dir, "personas"))) dir = join(dir, "personas");

  mkdirSync(TARGET, { recursive: true });
  const found = readdirSync(dir).filter((f) => PERSONAS.includes(f.replace(/\.md$/, "")));
  for (const f of found) cpSync(join(dir, f), join(TARGET, f));
  if (tmp) rmSync(tmp, { recursive: true, force: true });

  const missing = PERSONAS.filter((p) => !found.includes(`${p}.md`));
  console.log(`✓ ${found.length} Persona(s) nach ${TARGET} eingespielt`);
  if (missing.length) {
    console.error(`✗ Fehlen in der Quelle: ${missing.join(", ")}`);
    process.exit(1);
  }
}
