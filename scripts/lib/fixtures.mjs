// Lädt die Musterakten aus fixtures/<grenze>/<testfall>.json.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

export const FIXTURES = new URL("../../fixtures/", import.meta.url).pathname;

/** Alle Akten als { boundary, testCase, claim }, frisch von der Platte gelesen. */
export function loadFixtures(dir = FIXTURES) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((b) => statSync(join(dir, b)).isDirectory())
    .sort()
    .flatMap((boundary) =>
      readdirSync(join(dir, boundary))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => ({
          boundary,
          testCase: f.slice(0, -5),
          claim: JSON.parse(readFileSync(join(dir, boundary, f), "utf8")),
        })),
    );
}
