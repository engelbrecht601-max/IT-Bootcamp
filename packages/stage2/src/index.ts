import type { Claim } from "./claim.js";

export type { Claim } from "./claim.js";

/**
 * Stage 2: Deckungsprüfung.
 * Prüft, ob für den gemeldeten Schaden Versicherungsschutz besteht.
 *
 * Regeln: schreibt nur in `claim.stage2`, hängt genau einen Trace-Eintrag an, löscht nie Felder.
 * Übergabe an: Schadenbewertung (Gruppe 3).
 */
export function run(claim: Claim): Claim {
  throw new Error(`Stage 2 ist noch nicht implementiert (${claim.claimId}).`);
}
