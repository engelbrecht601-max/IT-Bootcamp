import type { Claim } from "./claim.js";

export type { Claim } from "./claim.js";

/**
 * Task 5: Oberfläche. Zeigt eine Schadenakte in jedem Zustand an, vom Mock-Server gespeist.
 * Das UI-Framework ist noch nicht entschieden; dieses Gerüst ist framework-neutral.
 *
 * Regeln: das UI liest Akten, es schreibt nie in einen Stage-Block.
 */
export function run(claim: Claim): string {
  throw new Error(`Die Oberfläche ist noch nicht implementiert (${claim.claimId}).`);
}

/** Eine Akte in der Übersicht: die Akte selbst, die Adresse ihrer Detailansicht und ihr Zustand in Worten. */
export interface OverviewEntry {
  claim: Claim;
  /** Adresse der Detailansicht dieser Akte, fertig für `<a href="…">`. */
  href: string;
  /** Zustand der Akte, z. B. "nach der Deckungsprüfung" oder "abgeschlossen". */
  state: string;
}

/**
 * Die Startseite eurer Oberfläche: bekommt alle Akten auf einmal und gibt HTML als Text zurück.
 * Hier entsteht, was nur mit mehreren Vorgängen Sinn ergibt: Liste, Karten, Filter, Zähler, euer Logo.
 * Solange diese Funktion nicht umgesetzt ist, zeigt `pnpm vorschau` eine schlichte Linkliste.
 */
export function overview(entries: OverviewEntry[]): string {
  throw new Error(`Die Startseite ist noch nicht implementiert (${entries.length} Akten).`);
}
