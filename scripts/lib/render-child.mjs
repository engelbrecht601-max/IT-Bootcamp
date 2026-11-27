// Rendert eine Ansicht in einem frischen Prozess, damit die Vorschau immer den aktuellen Code zeigt.
//   node --import tsx scripts/lib/render-child.mjs ui <akte.json>
//   node --import tsx scripts/lib/render-child.mjs overview          (Startseite: alle Musterakten auf einmal)
//   node --import tsx scripts/lib/render-child.mjs form
//   node --import tsx scripts/lib/render-child.mjs submit '<json der Formularangaben>'
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadFixtures } from "./fixtures.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const load = (pkg) => import(pathToFileURL(join(ROOT, `packages/${pkg}/src/index.ts`)).href);
const [kind, arg] = process.argv.slice(2);

const STATES = { "1-2": "nach der Schadenaufnahme", "2-3": "nach der Deckungsprüfung", "3-4": "nach der Schadenbewertung", "4-ende": "abgeschlossen" };
/** Alle Musterakten für die Startseite der Gruppe, mit der Adresse ihrer Detailansicht. */
export function overviewEntries(fixtures = loadFixtures(join(ROOT, "fixtures"))) {
  return fixtures.map((f) => ({ claim: f.claim, href: `akte/${f.boundary}/${f.testCase}`, state: STATES[f.boundary] ?? f.boundary }));
}

try {
  if (kind === "ui") process.stdout.write(String((await load("ui")).run(JSON.parse(readFileSync(arg, "utf8")))));
  else if (kind === "overview") {
    const ui = await load("ui");
    if (typeof ui.overview !== "function") throw new Error("Die Startseite ist noch nicht implementiert (overview fehlt in packages/ui/src/index.ts).");
    process.stdout.write(String(ui.overview(overviewEntries())));
  } else if (kind === "form") process.stdout.write(String((await load("intake")).run()));
  else if (kind === "submit") process.stdout.write(JSON.stringify((await load("intake")).submit(JSON.parse(arg)), null, 2));
  else throw new Error(`Unbekannte Ansicht ${kind}`);
} catch (err) {
  process.stderr.write(String(err?.message ?? err));
  process.exit(1);
}
