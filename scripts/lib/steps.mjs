// Der Schlauch: Aus dem Stand eines Arbeitsplatzes folgt genau ein nächster Schritt.
// Reihenfolge nach gängiger Praxis: erst verstehen (Interview), dann eine Anforderung aufschreiben,
// Tests zuerst (rot), umsetzen (grün), unabhängig prüfen, sichern, Kontext leeren. Immer eine
// Anforderung zur Zeit; erst wenn sie fertig ist, kommt die nächste.
import { TASKS } from "./tasks.mjs";
import { DONE, interviewCount, readRequirements } from "./requirements.mjs";

/** So viele eigene Fragen an die Fachperson braucht ein Package, bevor Anforderungen entstehen. */
export const MIN_QUESTIONS = 3;
/** Pflichtprogramm pro Package: je eine Anforderung für diese drei Fälle, in dieser Reihenfolge. */
export const CASES = ["Standardfall", "Grenzfall", "Ablehnungskandidat"];
export const LEVELS = ["Interview", "Standardfall", "Grenzfall", "Ablehnungsfall", "Übergabe", "Bonus"];

/** Stand eines Packages: Interviewfragen und Anforderungen nach Status. */
export function packageState(root, task) {
  const pkg = TASKS[task].pkg;
  const reqs = readRequirements(root, pkg);
  return {
    task,
    pkg,
    name: TASKS[task].name,
    questions: interviewCount(root, pkg),
    reqs,
    verified: reqs.filter((r) => r.status === "verifiziert").length,
    active: reqs.filter((r) => !DONE.has(r.status)),
  };
}

/**
 * Nächster Schritt eines Arbeitsplatzes.
 * Eingabe: packages (aus packageState), flags (Merker des Arbeitsplatzes), wishes (offene Wünsche an ihn).
 * Ausgabe: { step, id?, task?, level, levelName, hints[] }.
 */
export function nextStep({ packages, flags = {}, wishes = [] }) {
  const hints = [];
  const minVerified = Math.min(...packages.map((p) => p.verified));
  const interviewing = minVerified === 0 && packages.some((p) => p.verified === 0 && p.questions < MIN_QUESTIONS);
  const level = flags.handover ? 6 : interviewing ? 1 : Math.min(minVerified + 2, 5);
  const base = { level, levelName: LEVELS[level - 1], hints };
  const published = new Set(flags.published ?? []);

  if (flags.mustClear) return { ...base, step: "clear" };
  if (wishes.length) return { ...base, step: "wunsch", wish: wishes[0] };

  // Fertig geprüft, aber noch nicht gesichert und freigegeben.
  for (const p of packages) {
    const unpublished = p.reqs.find((r) => r.status === "verifiziert" && !published.has(r.id));
    if (unpublished) return { ...base, step: "sichern", id: unpublished.id, task: p.task };
  }

  // Eine Anforderung in Arbeit geht immer vor: zu Ende bringen, bevor etwas Neues beginnt.
  const order = { umgesetzt: 0, spezifiziert: 1, offen: 2 };
  const active = packages
    .flatMap((p) => p.active.map((r) => ({ ...r, task: p.task })))
    .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || a.id.localeCompare(b.id));
  if (active.length > 1) {
    hints.push(`${active.length} Anforderungen sind angefangen. Es geht nur ${active[0].id} weiter, die anderen warten.`);
  }
  if (active.length) {
    const r = active[0];
    const step = { offen: "tests", spezifiziert: "bauen", umgesetzt: "pruefen" }[r.status] ?? "tests";
    return { ...base, step, id: r.id, task: r.task };
  }

  // Nichts in Arbeit: das Package mit dem geringsten Fortschritt ist dran (bei zusammengelegten Stages reihum).
  const target = [...packages].sort((a, b) => a.verified - b.verified || a.task - b.task)[0];
  if (target.questions < MIN_QUESTIONS) {
    return { ...base, step: "interview", task: target.task, missing: MIN_QUESTIONS - target.questions };
  }
  if (target.verified < CASES.length) {
    return { ...base, step: "anforderung", task: target.task, testCase: CASES[target.verified] };
  }
  if (!flags.handover) return { ...base, step: "uebergabe" };
  return { ...base, step: "anforderung", task: target.task, testCase: "Bonus" };
}

/** Eine Zeile für Statusanzeige und Hook. */
export function standLine(desk, next) {
  const where = next.id ?? (next.task ? TASKS[next.task].name : "");
  const label = {
    clear: "Kontext leeren (/clear)",
    wunsch: "Wunsch eines anderen Arbeitsplatzes beantworten",
    sichern: "sichern und freigeben",
    tests: "Tests schreiben",
    bauen: "umsetzen",
    pruefen: "prüfen lassen",
    interview: "Interview",
    anforderung: `Anforderung aufschreiben (${next.testCase})`,
    uebergabe: "Übergabe prüfen",
  }[next.step];
  return `Level ${next.level} von ${LEVELS.length} (${next.levelName}) · ${where ? where + " · " : ""}Schritt: ${label}`;
}
