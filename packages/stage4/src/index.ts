import type { Claim } from "./claim.js";

export type { Claim } from "./claim.js";

/**
 * Stage 4: Regulierung.
 * Schließt den Vorgang gegenüber den Beteiligten ab.
 *
 * Regeln: schreibt nur in `claim.stage4`, hängt genau einen Trace-Eintrag an, löscht nie Felder.
 * Übergabe an: Endzustand der Akte (UI, Gruppe 5).
 */
export function run(claim: Claim): Claim {
  throw new Error(`Stage 4 ist noch nicht implementiert (${claim.claimId}).`);
}
