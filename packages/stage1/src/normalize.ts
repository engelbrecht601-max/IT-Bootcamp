// G1-REQ-002: Leerzeichen, Kleinbuchstaben und ein fehlender Bindestrich werden stillschweigend korrigiert.
// Liefert die Nummer im Format GH-NNNNNNN oder null, wenn sie auch korrigiert ungültig ist.
export function normalizePolicyNumber(raw: string): string | null {
  const match = /^GH-?([0-9]{7})$/.exec(raw.replace(/\s+/g, "").toUpperCase());
  return match ? `GH-${match[1]}` : null;
}
