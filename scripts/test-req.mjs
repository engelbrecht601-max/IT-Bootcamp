#!/usr/bin/env node
// Führt nur die Tests einer Anforderung aus: pnpm test:req T2-REQ-003
// Beim Bauen läuft nur der eigene Ausschnitt; die volle Suite läuft mit pnpm check vor dem Push.
//
// Gestartet werden nur die Testdateien, in denen die ID vorkommt, und höchstens zwei gleichzeitig.
// Am 21.11. startete jeder Aufruf alle Testdateien des Packages parallel; zwölf Prüfer auf einmal waren
// rund 200 Node-Prozesse, und der Container lief voll.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { TASKS } from "./lib/tasks.mjs";

/** Höchstens so viele Testdateien laufen gleichzeitig. */
export const CONCURRENCY = 2;

/** Testdateien unter dir, in denen [id] vorkommt. */
export function testFiles(dir, id) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) {
        if (name !== "node_modules") walk(path);
      } else if (name.endsWith(".test.ts") && readFileSync(path, "utf8").includes(`[${id}]`)) {
        out.push(path);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

function main() {
  const id = process.argv[2] ?? "";
  const m = /^T([1-6])-REQ-[0-9]{3}$/.exec(id);
  if (!m) {
    console.error("Aufruf: pnpm test:req T<N>-REQ-<NNN>");
    process.exit(64);
  }
  const dir = `packages/${TASKS[m[1]].pkg}/src`;
  if (!existsSync(dir)) {
    console.error(`✗ ${dir} fehlt`);
    process.exit(1);
  }
  const files = testFiles(dir, id).map((f) => relative(process.cwd(), f));
  if (!files.length) {
    console.error(`✗ Kein Test mit [${id}] im Namen gefunden.`);
    process.exit(1);
  }
  const res = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", `--test-concurrency=${CONCURRENCY}`, "--test-name-pattern", `\\[${id}\\]`, ...files],
    { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" },
  );
  process.stdout.write(res.stdout);
  const matched = res.stdout.split("\n").filter((l) => /^\s*(not )?ok \d+ - \[/.test(l) && l.includes(`[${id}]`));
  if (matched.length === 0) {
    console.error(`✗ Kein Test mit [${id}] im Namen gefunden.`);
    process.exit(1);
  }
  process.exit(res.status ?? 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
