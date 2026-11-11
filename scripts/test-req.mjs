#!/usr/bin/env node
// Führt nur die Tests einer Anforderung aus: pnpm test:req G2-REQ-003
// Beim Bauen läuft nur der eigene Ausschnitt; die volle Suite läuft mit pnpm check vor dem Push.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const id = process.argv[2] ?? "";
const m = /^G([1-5])-REQ-[0-9]{3}$/.exec(id);
if (!m) {
  console.error("Aufruf: pnpm test:req G<N>-REQ-<NNN>");
  process.exit(64);
}
const pkg = m[1] === "5" ? "ui" : `stage${m[1]}`;
const dir = `packages/${pkg}/src`;
if (!existsSync(dir)) {
  console.error(`✗ ${dir} fehlt`);
  process.exit(1);
}
const res = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-name-pattern", `\\[${id}\\]`, `${dir}/**/*.test.ts`],
  { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" },
);
process.stdout.write(res.stdout);
const matched = res.stdout.split("\n").filter((l) => /^\s*(not )?ok \d+ - \[/.test(l) && l.includes(`[${id}]`));
if (matched.length === 0) {
  console.error(`✗ Kein Test mit [${id}] im Namen gefunden.`);
  process.exit(1);
}
process.exit(res.status ?? 1);
