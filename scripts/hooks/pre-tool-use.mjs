#!/usr/bin/env node
// PreToolUse-Hook für Claude Code. Setzt die Workshop-Regeln mechanisch durch, statt sie nur zu erbitten:
// - contracts/ ist schreibgeschützt; der einzige Schreibweg ist pnpm contracts:request / contracts:decide
// - mit BOOTCAMP_TASK (1–5, setzt pnpm desk) schreibt eine Person nur in das Package ihres Tasks
// - in einem Gruppen-Arbeitsplatz (BOOTCAMP_GROUP) ohne BOOTCAMP_TASK schreibt niemand in packages/:
//   erst mit pnpm desk <Task> <Name> eintragen
// - im geteilten Checkout stagt jede Person nur eigene Dateien (kein git add -A / commit -a)
// - kein Force-Push, kein reset --hard, kein Umgehen des Pre-Push-Gates
// - im Gruppen-Arbeitsplatz keine KI im Produkt: nichts unter .claude/ anlegen (Subagenten, Befehle)
//   und keine KI-Pakete installieren (@anthropic-ai/*, openai, langchain, ai, …)
// Workshop-Leitung setzt BOOTCAMP_ADMIN=1, um contracts/ und fremde Packages direkt zu bearbeiten.
// Exit-Code 2 blockiert den Aufruf; die Meldung auf stderr sieht Claude.
import { resolve, relative, sep } from "node:path";
import { TASKS, taskNumber } from "../lib/tasks.mjs";

const ROOT = resolve(process.env.CLAUDE_PROJECT_DIR ?? new URL("../../", import.meta.url).pathname);
const PACKAGES = Object.values(TASKS).map((t) => t.pkg);
const NO_CLAUDE_DIR = ".claude/ gehört der Workshop-Leitung: keine eigenen Subagenten, Befehle oder Einstellungen. Die App enthält keine KI-Agenten.";
// Pakete, mit denen eine App Sprachmodelle aufruft oder Agenten baut.
const AI_PACKAGES = /^(@anthropic-ai\/.+|openai|@openai\/.+|langchain|@langchain\/.+|ai|@ai-sdk\/.+|ollama|@google\/(generative-ai|genai)|cohere-ai|@mistralai\/.+|llamaindex|@llamaindex\/.+|@huggingface\/.+)$/;
const NO_DESK = "Erst eintragen und den eigenen Schreibtisch starten: pnpm desk <Task> <Vorname> (im Terminal, nicht in Claude).";

/**
 * Prüft einen Tool-Aufruf. Gibt eine Meldung zurück, wenn er blockiert wird, sonst null.
 * ctx.task: Task der Session (1–5), ctx.group: Gruppen-Arbeitsplatz gesetzt, ctx.admin: Workshop-Leitung.
 */
export function check(input, ctx = fromEnv()) {
  const admin = Boolean(ctx.admin);
  const task = admin ? undefined : taskNumber(ctx.task);
  // Im Gruppen-Arbeitsplatz ohne Schreibtisch gehört der Session kein Package.
  const locked = !admin && !task && Boolean(ctx.group);
  const { tool_name: tool, tool_input: args = {} } = input;
  if (tool === "Bash") return checkBash(String(args.command ?? ""), { task, locked, admin });
  const file = args.file_path ?? args.notebook_path;
  if (!file || admin) return null;
  return checkPath(relative(ROOT, resolve(ROOT, file)), { task, locked });
}

function fromEnv(env = process.env) {
  return { task: env.BOOTCAMP_TASK, group: env.BOOTCAMP_GROUP, admin: env.BOOTCAMP_ADMIN === "1" };
}

function checkPath(rel, { task, locked }) {
  const parts = rel.split(sep);
  if (parts[0] === "contracts") {
    return "contracts/ ist schreibgeschützt. Änderungswünsche laufen über /contract-change.";
  }
  // .claude/tmp/ ist Ablage für Entwürfe (/contract-change), alles andere unter .claude/ bleibt zu.
  if (parts[0] === ".claude" && parts[1] !== "tmp" && (task || locked)) return NO_CLAUDE_DIR;
  if (parts[0] === "packages" && parts[1]) {
    if (locked) return NO_DESK;
    const own = task && TASKS[task].pkg;
    if (own && parts[1] !== own) return `Task ${task} schreibt nur in packages/${own}/, nicht in packages/${parts[1]}/.`;
  }
  return null;
}

function checkBash(cmd, { task, locked, admin }) {
  // Nur die erste Zeile jedes Befehls zählt, damit Heredoc-Inhalte keine Fehlalarme auslösen.
  const lines = cmd.split("\n").filter((l) => !/^\s*(#|$)/.test(l));
  const first = lines.slice(0, 1).concat(lines.filter((l) => /^\s*(git|rm|mv|cp|tee|touch|sed)\b/.test(l)));
  const text = first.join("\n");
  if (/git\s+push\b[^;&|\n]*\s(--force\b|--force-with-lease\b|-f\b)/.test(text)) return "Force-Push ist verboten: die ganze Gruppe arbeitet auf einem Branch.";
  if (/git\s+reset\b[^;&|\n]*--hard/.test(text)) return "git reset --hard ist verboten: es verwirft Arbeit ohne Rückfrage.";
  if (/git\b[^;&|\n]*--no-verify\b/.test(text)) return "--no-verify umgeht das Gate pnpm check und ist verboten.";
  if (!admin && writesTo(text, "contracts/")) {
    return "contracts/ ist schreibgeschützt. Nur pnpm contracts:request und contracts:decide schreiben dorthin.";
  }
  if (task || locked) {
    if (writesTo(text, ".claude/(?!tmp/)")) return NO_CLAUDE_DIR;
    const pkg = aiPackage(text);
    if (pkg) return `${pkg} ist ein KI-Paket. Die App enthält keine KI-Agenten und ruft keine Sprachmodelle auf; KI ist euer Werkzeug, nicht Teil des Produkts. Fragen dazu: Workshop-Leitung.`;
    const own = task && TASKS[task].pkg;
    const other = PACKAGES.find((pkg) => pkg !== own && writesTo(text, `packages/${pkg}/`));
    if (other) return locked ? NO_DESK : `Task ${task} schreibt nur in packages/${own}/.`;
    // Fünf Personen teilen einen Checkout: Wer alles stagt, committet die halbe Arbeit der anderen mit.
    if (/\bgit\s+add\b[^;&|\n]*\s(-A\b|--all\b|\.(?=\s|$)|-u\b|--update\b)/.test(text) ||
        /\bgit\s+commit\b[^;&|\n]*\s(-a\b|-am\b|--all\b)/.test(text)) {
      return `Im geteilten Checkout nur eigene Dateien stagen: git add ${own ? `packages/${own}` : "<Pfad>"}, dann git commit.`;
    }
  }
  return null;
}

/** Name des ersten KI-Pakets, das ein pnpm/npm/yarn/bun add|install installieren würde, sonst null. */
export function aiPackage(text) {
  for (const segment of text.split(/[;&|\n]+/)) {
    // Optionen vor dem Verb erlauben, z. B. pnpm --filter @bootcamp/stage2 add openai
    const m = /\b(?:pnpm|npm|yarn|bun)\b.*?\s(?:add|install|i)(?=\s|$)(.*)/.exec(segment);
    if (!m) continue;
    for (const arg of m[1].trim().split(/\s+/)) {
      if (!arg || arg.startsWith("-")) continue;
      const name = arg.replace(/^(@?[^@]+)@.*$/, "$1");
      if (AI_PACKAGES.test(name)) return name;
    }
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
