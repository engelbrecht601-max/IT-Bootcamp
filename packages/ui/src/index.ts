import type { Claim } from "./claim.js";

export type { Claim } from "./claim.js";

/**
 * Gruppe 5: Oberfläche. Zeigt eine Schadenakte in jedem Zustand an, vom Mock-Server gespeist.
 * Das UI-Framework ist noch nicht entschieden; dieses Gerüst ist framework-neutral.
 *
 * Regeln: das UI liest Akten, es schreibt nie in einen Stage-Block.
 */
export function run(claim: Claim): string {
  throw new Error(`Die Oberfläche ist noch nicht implementiert (${claim.claimId}).`);
}
