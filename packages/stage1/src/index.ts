import type { Claim } from "./claim.js";

export type { Claim } from "./claim.js";

/**
 * Stage 1: Schadenaufnahme.
 * Nimmt die Schadenmeldung auf und legt die Grunddaten des Vorgangs an.
 *
 * Regeln: schreibt nur in `claim.stage1`, hängt genau einen Trace-Eintrag an, löscht nie Felder.
 * Übergabe an: Deckungsprüfung (Gruppe 2).
 */
export function run(claim: Claim): Claim {
  throw new Error(`Stage 1 ist noch nicht implementiert (${claim.claimId}).`);
}
