import type { Claim } from "./claim.js";

export type { Claim } from "./claim.js";

/** Die Angaben aus dem Formular, so wie sie eingetippt wurden: Feldname → Text. */
export type FormInput = Record<string, string>;

/**
 * Task 6: Meldeformular. Diesen Task gibt es nur in Gruppen mit sechs Personen.
 * Zeigt das Formular, mit dem jemand einen Schaden meldet, als HTML.
 *
 * Regeln: kein Framework, kein eigener Server. Die Vorschau startet `pnpm vorschau`.
 */
export function run(): string {
  throw new Error("Das Meldeformular ist noch nicht implementiert.");
}

/**
 * Macht aus den Angaben des Formulars die Akte, die bei der Schadenaufnahme (Task 1) ankommt:
 * mit claimId, meta und leerem Trace, aber ohne einen Stage-Block. So sieht sie aus: `akten/ziel/`.
 */
export function submit(input: FormInput): Claim {
  throw new Error(`Die Übernahme der Meldung ist noch nicht implementiert (${Object.keys(input).length} Angaben).`);
}
