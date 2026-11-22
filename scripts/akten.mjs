#!/usr/bin/env node
// Legt die Musterakten eines Arbeitsplatzes passend zu seinem Zuschnitt bereit: pnpm akten
// Läuft automatisch, sobald die Gruppe gestartet ist und die Aufteilung feststeht.
//
//   akten/eingang/   was bei diesem Arbeitsplatz ankommt (bei der Schadenaufnahme: die Meldung ohne Block stage1)
//   akten/ziel/      so sieht eine Akte aus, wenn dieser Arbeitsplatz fertig ist
//   akten/LIESMICH.md
//
// Bei zusammengelegten Stages gilt der Eingang des ersten und das Ziel des letzten Tasks.
// akten/ ist eine Sicht für Menschen und wird nicht versioniert. Tests lesen weiter aus fixtures/.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { boundariesFor, deskTitle } from "./lib/desks.mjs";
import { loadFixtures } from "./lib/fixtures.mjs";
import { ROOT, die, session } from "./lib/session.mjs";

/** Akten einer Grenze. "eingang" ist die Meldung von außen: Akte 1-2 ohne den Block der Schadenaufnahme. */
export function claimsAt(boundary, fixtures) {
  if (boundary !== "eingang") return fixtures.filter((f) => f.boundary === boundary);
  return fixtures
    .filter((f) => f.boundary === "1-2")
    .map((f) => {
      const { stage1, ...rest } = structuredClone(f.claim);
      return { ...f, boundary, claim: { ...rest, meta: { ...rest.meta, currentStage: 1 }, trace: [] } };
    });
}

export function writeAkten(desk, root = ROOT, fixtures = loadFixtures(join(root, "fixtures"))) {
  const dir = join(root, "akten");
  rmSync(dir, { recursive: true, force: true });
  const { input, output } = boundariesFor(desk.tasks);
  const put = (kind, boundaries) => {
    for (const b of boundaries) {
      // Mehrere Grenzen (Oberfläche) bekommen je einen Unterordner, eine einzelne liegt direkt im Ordner.
      const target = boundaries.length > 1 ? join(dir, kind, b) : join(dir, kind);
      mkdirSync(target, { recursive: true });
      for (const f of claimsAt(b, fixtures)) writeFileSync(join(target, `${f.testCase}.json`), JSON.stringify(f.claim, null, 2) + "\n");
    }
  };
  put("eingang", input);
  put("ziel", output);
  const lines = [
    `# Musterakten für ${desk.persons.join(" & ")}: ${deskTitle(desk)}`,
    "",
    "Drei erfundene Vorgänge: Standardfall, Grenzfall, Ablehnungskandidat.",
    "",
    input.length ? `- \`eingang/\`: so kommt die Akte bei dir an (${input.join(", ")}).` : "- Du bekommst keine Akte als Eingang, du erzeugst die Meldung.",
    output.length ? `- \`ziel/\`: so sieht sie aus, wenn dein Arbeitsplatz fertig ist (${output.join(", ")}). Eine mögliche Lösung, nicht die einzig richtige.` : "- Ein Ziel als Akte gibt es nicht: Du zeigst die Akten an.",
    "",
    "Dieser Ordner ist nur zum Ansehen. Tests lesen aus `fixtures/`.",
  ];
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "LIESMICH.md"), lines.join("\n") + "\n");
  return { input, output };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { desk } = session();
  if (!desk) die("Diese Sitzung gehört zu keinem Arbeitsplatz.");
  const { input, output } = writeAkten(desk);
  console.log(`✓ Musterakten in akten/: Eingang ${input.join(", ") || "–"}, Ziel ${output.join(", ") || "–"}`);
}
