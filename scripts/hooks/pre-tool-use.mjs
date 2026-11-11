#!/usr/bin/env node
// PreToolUse-Hook für Claude Code. Setzt die Workshop-Regeln mechanisch durch, statt sie nur zu erbitten:
// - contracts/ ist schreibgeschützt; der einzige Schreibweg ist pnpm contracts:request / contracts:decide
// - mit BOOTCAMP_GROUP (1–5, aus settings.local.json) schreibt eine Gruppe nur in ihr eigenes Package
// - kein Force-Push, kein reset --hard, kein Umgehen des Pre-Push-Gates
// Workshop-Leitung setzt BOOTCAMP_ADMIN=1, um contracts/ und fremde Packages direkt zu bearbeiten.
// Exit-Code 2 blockiert den Aufruf; die Meldung auf stderr sieht Claude.
import { resolve, relative, sep } from "node:path";

const ROOT = resolve(process.env.CLAUDE_PROJECT_DIR ?? new URL("../../", import.meta.url).pathname);
const OWN_PACKAGE = { 1: "stage1", 2: "stage2", 3: "stage3", 4: "stage4", 5: "ui" };

export function check(input, group = process.env.BOOTCAMP_GROUP, admin = process.env.BOOTCAMP_ADMIN === "1") {
  if (admin) group = undefined;
  const { tool_name: tool, tool_input: args = {} } = input;
  if (tool === "Bash") return checkBash(String(args.command ?? ""), group, admin);
  const file = args.file_path ?? args.notebook_path;
  if (!file || admin) return null;
  return checkPath(relative(ROOT, resolve(ROOT, file)), group);
}

function checkPath(rel, group) {
  const parts = rel.split(sep);
  if (parts[0] === "contracts") {
    return "contracts/ ist schreibgeschützt. Änderungswünsche laufen über /contract-change.";
  }
  if (group && parts[0] === "packages" && parts[1] && parts[1] !== OWN_PACKAGE[group]) {
    return `Gruppe ${group} schreibt nur in packages/${OWN_PACKAGE[group]}/, nicht in packages/${parts[1]}/.`;
  }
  return null;
}

function checkBash(cmd, group, admin) {
  // Nur die erste Zeile jedes Befehls zählt, damit Heredoc-Inhalte keine Fehlalarme auslösen.
  const lines = cmd.split("\n").filter((l) => !/^\s*(#|$)/.test(l));
  const first = lines.slice(0, 1).concat(lines.filter((l) => /^\s*(git|rm|mv|cp|tee|touch|sed)\b/.test(l)));
  const text = first.join("\n");
  if (/git\s+push\b[^;&|\n]*\s(--force\b|--force-with-lease\b|-f\b)/.test(text)) return "Force-Push ist verboten: alle arbeiten auf main.";
  if (/git\s+reset\b[^;&|\n]*--hard/.test(text)) return "git reset --hard ist verboten: es verwirft Arbeit ohne Rückfrage.";
  if (/git\b[^;&|\n]*--no-verify\b/.test(text)) return "--no-verify umgeht das Gate pnpm check und ist verboten.";
  if (!admin && writesTo(text, "contracts/")) {
    return "contracts/ ist schreibgeschützt. Nur pnpm contracts:request und contracts:decide schreiben dorthin.";
  }
  if (group) {
    const other = Object.entries(OWN_PACKAGE).find(([g, pkg]) => g !== String(group) && writesTo(text, `packages/${pkg}/`));
    if (other) return `Gruppe ${group} schreibt nur in packages/${OWN_PACKAGE[group]}/.`;
  }
  return null;
}

// Ein Hook ist eine Bremse, keine Garantie: Inline-Skripte kann er nicht durchschauen.
// Die Garantie gibt pnpm check (lehnt unzulässige Patches ab) vor jedem Push.
function writesTo(text, dir) {
  const target = `["']?[^\\s;&|"']*${dir.replace("/", "\\/")}`;
  return (
    new RegExp(`>>?\\s*${target}`).test(text) ||
    new RegExp(`\\btee\\s+(-a\\s+)?${target}`).test(text) ||
    new RegExp(`\\b(rm|mv|cp|touch|sed\\s+-i)\\b[^;&|\\n]*\\s${target}`).test(text)
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    const reason = check(JSON.parse(raw || "{}"));
    if (reason) {
      console.error(reason);
      process.exit(2);
    }
  });
}
