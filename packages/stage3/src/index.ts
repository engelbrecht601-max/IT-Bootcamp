import type { Claim } from "./claim.js";

export type { Claim } from "./claim.js";

/**
 * Stage 3: Schadenbewertung.
 * Ermittelt die Höhe des ersatzfähigen Schadens.
 *
 * Regeln: schreibt nur in `claim.stage3`, hängt genau einen Trace-Eintrag an, löscht nie Felder.
 * Übergabe an: Regulierung (Gruppe 4).
 */
export function run(claim: Claim): Claim {
  throw new Error(`Stage 3 ist noch nicht implementiert (${claim.claimId}).`);
}
