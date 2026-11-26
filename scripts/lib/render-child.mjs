// Rendert eine Ansicht in einem frischen Prozess, damit die Vorschau immer den aktuellen Code zeigt.
//   node --import tsx scripts/lib/render-child.mjs ui <akte.json>
//   node --import tsx scripts/lib/render-child.mjs form
//   node --import tsx scripts/lib/render-child.mjs submit '<json der Formularangaben>'
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../../", import.meta.url).pathname;
const load = (pkg) => import(pathToFileURL(join(ROOT, `packages/${pkg}/src/index.ts`)).href);
const [kind, arg] = process.argv.slice(2);

try {
  if (kind === "ui") process.stdout.write(String((await load("ui")).run(JSON.parse(readFileSync(arg, "utf8")))));
  else if (kind === "form") process.stdout.write(String((await load("intake")).run()));
  else if (kind === "submit") process.stdout.write(JSON.stringify((await load("intake")).submit(JSON.parse(arg)), null, 2));
  else throw new Error(`Unbekannte Ansicht ${kind}`);
} catch (err) {
  process.stderr.write(String(err?.message ?? err));
  process.exit(1);
}
