// Liest und ändert die requirements.md eines Packages. Status und Nachweise setzt nur dieses Modul
// (über pnpm req), nie ein Sprachmodell per Texteditor: So landet nichts im Vorlagenblock und ein
// kaputter Code-Zaun fällt sofort auf.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TASKS, TASK_DIGIT } from "./tasks.mjs";

export const STATUS = ["offen", "spezifiziert", "umgesetzt", "verifiziert", "gestrichen"];
export const DONE = new Set(["verifiziert", "gestrichen"]);
export const REQ_ID = new RegExp(`^T(${TASK_DIGIT})-REQ-([0-9]{3})$`);

export const taskOfId = (id) => Number(REQ_ID.exec(id ?? "")?.[1]) || undefined;
export const requirementsFile = (root, pkg) => join(root, "packages", pkg, "requirements.md");

/** Zeilen mit der Angabe, ob sie in einem Code-Zaun liegen. */
function scan(text) {
  let fenced = false;
  return text.split("\n").map((line) => {
    const isFence = /^\s*```/.test(line);
    const inside = fenced || isFence;
    if (isFence) fenced = !fenced;
    return { line, inside };
  });
}

/** true, wenn ein Code-Zaun nicht geschlossen ist (dann verschluckt die Vorlage alle Anforderungen). */
export function hasOpenFence(text) {
  return scan(text).filter((l) => /^\s*```/.test(l.line)).length % 2 === 1;
}

/** Anforderungen einer requirements.md: { id, title, status, criteria, start, end } (Zeilenindizes). */
export function parseRequirements(text) {
  const rows = scan(text);
  const reqs = [];
  rows.forEach(({ line, inside }, i) => {
    if (inside) return;
    const m = /^### (T[0-9]-REQ-[0-9]{3})\b:?\s*(.*)$/.exec(line);
    if (m) {
      if (reqs.length) reqs.at(-1).end = i;
      reqs.push({ id: m[1], title: m[2].trim(), start: i, end: rows.length });
    } else if (/^##? /.test(line) && reqs.length && reqs.at(-1).end === rows.length) {
      reqs.at(-1).end = i;
    }
  });
  for (const r of reqs) {
    const body = rows.slice(r.start, r.end).map((l) => l.line);
    r.status = /\*\*Status:\*\*\s*`?([a-zäöü]+)/i.exec(body.join("\n"))?.[1]?.toLowerCase();
    r.criteria = body.filter((l) => /^\s+\d+\.\s/.test(l)).length;
  }
  return reqs;
}

export function readRequirements(root, pkg) {
  const file = requirementsFile(root, pkg);
  return existsSync(file) ? parseRequirements(readFileSync(file, "utf8")) : [];
}

/**
 * Setzt in der Anforderung `id` die Zeile `- **<field>:** <value>`; fehlt sie, wird sie ergänzt.
 * Gibt den neuen Text zurück. Wirft, wenn es die Anforderung nicht gibt.
 */
export function setField(text, id, field, value) {
  const req = parseRequirements(text).find((r) => r.id === id);
  if (!req) throw new Error(`${id} steht nicht in der requirements.md (außerhalb der Vorlage)`);
  const lines = text.split("\n");
  const re = new RegExp(`^(\\s*-\\s*)\\*\\*${field}:\\*\\*.*$`);
  let last = req.start;
  for (let i = req.start + 1; i < req.end; i++) {
    if (re.test(lines[i])) {
      lines[i] = lines[i].replace(re, `$1**${field}:** ${value}`);
      return lines.join("\n");
    }
    if (/^\s*-\s*\*\*[^*]+:\*\*/.test(lines[i]) || /^\s+\d+\.\s/.test(lines[i])) last = i;
  }
  lines.splice(last + 1, 0, `- **${field}:** ${value}`);
  return lines.join("\n");
}

export function writeField(root, id, field, value) {
  const pkg = TASKS[taskOfId(id)]?.pkg;
  if (!pkg) throw new Error(`"${id}" ist keine Anforderungs-ID (T<N>-REQ-<NNN>)`);
  const file = requirementsFile(root, pkg);
  writeFileSync(file, setField(readFileSync(file, "utf8"), id, field, value));
}

/** Zahl der Fragen im Interviewprotokoll eines Packages. */
export function interviewCount(root, pkg) {
  const file = join(root, "packages", pkg, "interview.md");
  if (!existsSync(file)) return 0;
  return (readFileSync(file, "utf8").match(/^\*\*Gruppe:\*\*/gm) ?? []).length;
}
