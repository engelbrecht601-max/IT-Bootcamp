#!/usr/bin/env node
// PreToolUse-Hook für Claude Code. Setzt die Workshop-Regeln mechanisch durch, statt sie nur zu erbitten:
// - contracts/ ist schreibgeschützt; der einzige Schreibweg ist pnpm contracts:add
// - eine Session am Arbeitsplatz (BOOTCAMP_DESK, gesetzt vom Start-Skript) schreibt nur in die Packages
//   ihrer Tasks; im Gruppen-Arbeitsplatz ohne Arbeitsplatz schreibt niemand in packages/
// - Git gehört dem Setup: Sichern, Abholen und Freigeben laufen über pnpm sync. Schreibende Git-Befehle
//   sind am Arbeitsplatz gesperrt (kein add, commit, reset, push, merge …)
// - Werkzeuge, die vom Auftrag wegführen oder das Kontingent leeren, sind abgeschaltet: Veröffentlichen
//   (Artifact), Nachrichten zwischen Sessions, geplante Aufgaben, Websuche, freie Subagenten,
//   eigene Server und npx; Subagenten nur mit run_in_background: false (sonst startet Claude Code sie im Hintergrund)
// - keine KI im Produkt: nichts unter .claude/ anlegen und keine KI-Pakete installieren
// Workshop-Leitung setzt BOOTCAMP_ADMIN=1, um contracts/ und fremde Packages direkt zu bearbeiten.
// Exit-Code 2 blockiert den Aufruf; die Meldung auf stderr sieht Claude.
import { resolve, relative, sep } from "node:path";
import { TASKS, taskNumber } from "../lib/tasks.mjs";
import { currentDesk, readState } from "../lib/desks.mjs";

const ROOT = resolve(process.env.CLAUDE_PROJECT_DIR ?? new URL("../../", import.meta.url).pathname);
const PACKAGES = Object.values(TASKS).map((t) => t.pkg);
const NO_CLAUDE_DIR = ".claude/ gehört der Workshop-Leitung: keine eigenen Subagenten, Befehle oder Einstellungen. Die App enthält keine KI-Agenten.";
// Pakete, mit denen eine App Sprachmodelle aufruft oder Agenten baut.
const AI_PACKAGES = /^(@anthropic-ai\/.+|openai|@openai\/.+|langchain|@langchain\/.+|ai|@ai-sdk\/.+|ollama|@google\/(generative-ai|genai)|cohere-ai|@mistralai\/.+|llamaindex|@llamaindex\/.+|@huggingface\/.+)$/;
const NO_DESK = "Diese Sitzung gehört zu keinem Arbeitsplatz und darf nichts schreiben. Die Person tippt /exit, öffnet ein neues Terminal und meldet sich dort mit ihrem Vornamen an.";
const GIT_OFF = "Git übernimmt das Setup. Sichern: pnpm sync save. Stand der Gruppe holen: pnpm sync pull. Fertige Anforderung freigeben: pnpm sync publish. Lesen geht weiter (git status, git diff, git log).";
const OFF = "ist im Workshop abgeschaltet. Bleib beim aktuellen Schritt (pnpm next zeigt ihn) und sag der Person in einem Satz, dass das hier nicht geht.";
// Werkzeuge, die am Samstag vom Auftrag weggeführt oder das gemeinsame Kontingent geleert haben.
const BLOCKED_TOOLS = /^(Artifact|ArtifactData|ArtifactComments|SendMessage|ListAgents|CronCreate|CronDelete|CronList|ScheduleWakeup|RemoteTrigger|PushNotification|WebSearch|WebFetch|EnterWorktree|ExitWorktree|Workflow|TeamCreate|TeamDelete|mcp__.*)$/;
const ALLOWED_AGENTS = /^(test-author|verifier|persona-[a-z0-9]+)$/;
const GIT_WRITE = /(^|[;&|(]\s*)git\s+(?:-C\s+\S+\s+)?(add|commit|push|pull|fetch|merge|rebase|reset|checkout|switch|stash|restore|worktree|branch|cherry-pick|revert|clean|rm|mv|tag|apply|am|config|remote|init|clone)\b/;

/**
 * Prüft einen Tool-Aufruf. Gibt eine Meldung zurück, wenn er blockiert wird, sonst null.
 * ctx.tasks: Tasks des Arbeitsplatzes (oder ctx.task für einen einzelnen), ctx.group: Gruppen-Arbeitsplatz
 * gesetzt, ctx.admin: Workshop-Leitung.
 */
export function check(input, ctx = fromEnv()) {
  const admin = Boolean(ctx.admin);
  const tasks = admin ? [] : [...(ctx.tasks ?? []), ctx.task].map(taskNumber).filter(Boolean);
  // Im Gruppen-Arbeitsplatz ohne Arbeitsplatz gehört der Session kein Package.
  const locked = !admin && !tasks.length && Boolean(ctx.group);
  const desk = tasks.length > 0 || locked;
  const { tool_name: tool, tool_input: args = {} } = input;
  if (desk) {
    if (BLOCKED_TOOLS.test(tool ?? "")) return `${tool} ${OFF}`;
    if (tool === "Agent" || tool === "Task") {
      const type = String(args.subagent_type ?? "");
      if (!ALLOWED_AGENTS.test(type)) return `Der Subagent "${type || "ohne Typ"}" ${OFF} Erlaubt sind nur test-author, verifier und die Fachperson.`;
      // Claude Code startet Subagenten sonst im Hintergrund und übernimmt eine Korrektur durch den Hook dafür nicht.
      if (!foreground(args)) return "Subagenten laufen im Vordergrund: Ruf ihn noch einmal auf, diesmal mit run_in_background: false. Der Person sagst du dazu nichts.";
      return null;
    }
  }
  if (tool === "Bash") return checkBash(String(args.command ?? ""), { tasks, locked, admin });
  // Der Hook sieht jetzt alle Werkzeuge; Pfadregeln gelten nur für die, die schreiben. Lesen bleibt überall erlaubt.
  if (!/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool ?? "")) return null;
  const file = args.file_path ?? args.notebook_path;
  if (!file || admin) return null;
  return checkPath(relative(ROOT, resolve(ROOT, file)), { tasks, locked });
}

/**
 * Korrigiert einen erlaubten Aufruf, statt ihn zu blockieren. Gibt das geänderte tool_input zurück oder null.
 * Claude Code startet Subagenten von sich aus im Hintergrund, wenn run_in_background nicht ausdrücklich false
 * ist. check() blockiert solche Aufrufe; diese Korrektur ist nur die zweite Absicherung (Claude Code 2.1.285
 * übernimmt sie für Subagenten nicht).
 */
export function adjust(input, ctx = fromEnv()) {
  const admin = Boolean(ctx.admin);
  const tasks = admin ? [] : [...(ctx.tasks ?? []), ctx.task].map(taskNumber).filter(Boolean);
  if (!tasks.length && !(ctx.group && !admin)) return null;
  const { tool_name: tool, tool_input: args = {} } = input;
  if ((tool === "Agent" || tool === "Task") && args.run_in_background !== false) return { ...args, run_in_background: false };
  return null;
}

/** Claude übergibt den Schalter mal als Wahrheitswert, mal als Text. */
const foreground = (args) => args.run_in_background === false || String(args.run_in_background).toLowerCase() === "false";

function fromEnv(env = process.env) {
  let tasks = [];
  try {
    tasks = currentDesk(readState(), env, ROOT)?.tasks ?? [];
  } catch {}
  return { tasks, task: env.BOOTCAMP_TASK, group: env.BOOTCAMP_GROUP, admin: env.BOOTCAMP_ADMIN === "1" };
}

const ownPackages = (tasks) => tasks.map((t) => TASKS[t].pkg);
const ownText = (tasks) => ownPackages(tasks).map((p) => `packages/${p}/`).join(" und ");

function checkPath(rel, { tasks, locked }) {
  const parts = rel.split(sep);
  if (parts[0] === "contracts") {
    return "contracts/ ist schreibgeschützt. Ein fehlendes Feld legt pnpm contracts:add an.";
  }
  // .claude/tmp/ ist Ablage für Entwürfe, alles andere unter .claude/ bleibt zu.
  if (parts[0] === ".claude" && parts[1] !== "tmp" && (tasks.length || locked)) return NO_CLAUDE_DIR;
  if (parts[0] === "packages" && parts[1]) {
    if (locked) return NO_DESK;
    if (tasks.length && !ownPackages(tasks).includes(parts[1])) return `Dieser Arbeitsplatz schreibt nur in ${ownText(tasks)}, nicht in packages/${parts[1]}/.`;
    // Status und Nachweise setzt nur pnpm req; requirements.md selbst bleibt editierbar (neue Anforderungen, Kriterien).
  } else if (tasks.length && parts[0] !== ".claude" && parts[0] !== ".." && !rel.startsWith("akten")) {
    // Am Arbeitsplatz entsteht alles im eigenen Package: keine Dashboards oder Übergabe-Dateien an der Wurzel.
    if (!rel.startsWith("/") && parts[0] !== "tmp") return `Dieser Arbeitsplatz schreibt nur in ${ownText(tasks)}. Ideen und Notizen gehören nach ideen.md im eigenen Package.`;
  }
  return null;
}

function checkBash(cmd, { tasks, locked, admin }) {
  const task = tasks[0];
  // Nur die erste Zeile jedes Befehls zählt, damit Heredoc-Inhalte keine Fehlalarme auslösen.
  const lines = cmd.split("\n").filter((l) => !/^\s*(#|$)/.test(l));
  const first = lines.slice(0, 1).concat(lines.filter((l) => /^\s*(git|rm|mv|cp|tee|touch|sed)\b/.test(l)));
  const text = first.join("\n");
  if (/git\s+push\b[^;&|\n]*\s(--force\b|--force-with-lease\b|-f\b)/.test(text)) return "Force-Push ist verboten: die ganze Gruppe arbeitet auf einem Branch.";
  if (/git\s+reset\b[^;&|\n]*--hard/.test(text)) return "git reset --hard ist verboten: es verwirft Arbeit ohne Rückfrage.";
  if (/git\b[^;&|\n]*--no-verify\b/.test(text)) return "--no-verify umgeht das Gate pnpm check und ist verboten.";
  if (!admin && writesTo(text, "contracts/")) {
    return "contracts/ ist schreibgeschützt. Ein fehlendes Feld legt pnpm contracts:add an.";
  }
  if (task || locked) {
    if (GIT_WRITE.test(text)) return GIT_OFF;
    if (/(^|[;&|(]\s*)(npx|pnpm\s+dlx|bunx)\b/.test(text)) return `npx ${OFF}`;
    if (/\bhttp\.server\b|\bhttp-server\b|\bcreateServer\s*\(|(^|[;&|(]\s*)(serve|live-server|vite)\b/.test(text)) {
      return "Eigene Server gibt es im Workshop nicht. Die Vorschau der Oberfläche startet pnpm vorschau.";
    }
    if (/(^|[;&|(]\s*)(curl|wget)\s[^\n]*https?:\/\/(?!localhost|127\.0\.0\.1)/.test(text)) return `Zugriff aufs Internet ${OFF}`;
    if (writesTo(text, ".claude/(?!tmp/)")) return NO_CLAUDE_DIR;
    const pkg = aiPackage(text);
    if (pkg) return `${pkg} ist ein KI-Paket. Die App enthält keine KI-Agenten und ruft keine Sprachmodelle auf; KI ist euer Werkzeug, nicht Teil des Produkts. Fragen dazu: Workshop-Leitung.`;
    const own = ownPackages(tasks);
    const other = PACKAGES.find((pkg) => !own.includes(pkg) && writesTo(text, `packages/${pkg}/`));
    if (other) return locked ? NO_DESK : `Dieser Arbeitsplatz schreibt nur in ${ownText(tasks)}.`;
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
    const input = JSON.parse(raw || "{}");
    const reason = check(input);
    if (reason) {
      console.error(reason);
      process.exit(2);
    }
    const updated = adjust(input);
    if (updated) {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow", updatedInput: updated } }));
    }
  });
}
