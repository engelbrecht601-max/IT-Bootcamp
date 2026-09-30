#!/usr/bin/env node
// Prüft in wenigen Sekunden, ob diese Umgebung arbeitsfähig ist.
// Fehler (✗) blockieren die Arbeit, Warnungen (!) nicht.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createRequire } from "node:module";

const ROOT = new URL("../", import.meta.url).pathname;
const require = createRequire(join(ROOT, "package.json"));
let errors = 0;
let warnings = 0;

const ok = (msg) => console.log(`✓ ${msg}`);
const fail = (msg, hint) => (errors++, console.log(`✗ ${msg}${hint ? `\n    → ${hint}` : ""}`));
const warn = (msg, hint) => (warnings++, console.log(`! ${msg}${hint ? `\n    → ${hint}` : ""}`));

function cmd(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

// Node
const wantedNode = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim();
const node = process.versions.node;
if (node === wantedNode) ok(`Node ${node}`);
else if (node.split(".")[0] === wantedNode.split(".")[0]) warn(`Node ${node}, erwartet ${wantedNode}`, "nvm use oder Devcontainer verwenden");
else fail(`Node ${node}, erwartet ${wantedNode}`, "nvm install && nvm use");

// pnpm
const wantedPnpm = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).packageManager.split("@")[1];
const pnpm = cmd("pnpm", ["--version"]);
if (!pnpm) fail("pnpm nicht gefunden", `corepack enable && corepack prepare pnpm@${wantedPnpm} --activate`);
else if (pnpm !== wantedPnpm) fail(`pnpm ${pnpm}, erwartet ${wantedPnpm}`, "corepack enable");
else ok(`pnpm ${pnpm}`);

// Abhängigkeiten
if (!existsSync(join(ROOT, "node_modules"))) fail("node_modules fehlt", "pnpm install");
else {
  const missing = ["ajv", "ajv-formats", "typescript", "tsx"].filter((m) => {
    try {
      require.resolve(`${m}/package.json`);
      return false;
    } catch {
      return true;
    }
  });
  if (missing.length) fail(`Pakete fehlen: ${missing.join(", ")}`, "pnpm install");
  else ok("Abhängigkeiten installiert");
}

// Git
if (!cmd("git", ["--version"])) fail("git nicht gefunden");
else if (!cmd("git", ["-C", ROOT, "rev-parse", "--is-inside-work-tree"])) warn("kein Git-Checkout");
else if (cmd("git", ["-C", ROOT, "config", "core.hooksPath"]) !== ".githooks") fail("Pre-Push-Gate nicht aktiv", "pnpm install (setzt core.hooksPath)");
else ok("git, Pre-Push-Gate aktiv");

// Contract
try {
  JSON.parse(readFileSync(join(ROOT, "contracts/claim.base.schema.json"), "utf8"));
  ok("Basis-Contract lesbar");
} catch (e) {
  fail(`Basis-Contract nicht lesbar: ${e.message}`);
}
if (!existsSync(join(ROOT, "contracts/claim.schema.json"))) warn("Contract noch nicht gebaut", "pnpm contracts:build");

// Claude Code
const claude = cmd("claude", ["--version"]);
if (claude) ok(`Claude Code ${claude}`);
else fail("Claude Code nicht gefunden", "npm install -g @anthropic-ai/claude-code");
if (!process.env.ANTHROPIC_API_KEY && !existsSync(join(process.env.HOME ?? "", ".claude"))) {
  warn("keine Claude-Anmeldung gefunden", "claude starten und anmelden oder ANTHROPIC_API_KEY setzen");
}

console.log(errors ? `\n${errors} Fehler, ${warnings} Warnung(en). Bitte beheben.` : `\nArbeitsfähig (${warnings} Warnung(en)).`);
process.exit(errors ? 1 : 0);
