# Anforderungen Task 5: Oberfläche

Zeigt Sachbearbeitenden den Vorgang über alle vier Stages hinweg.

Diese Datei ist Auftrag, Testvorlage und Nachweis zugleich. `pnpm check` prüft ihr Format.

## Regeln

- Jede Anforderung hat eine ID `T5-REQ-NNN`, fortlaufend ab `T5-REQ-001`. Eine ID wird nie neu vergeben, auch nicht nach dem Streichen.
- Akzeptanzkriterien stehen als Gegeben/Wenn/Dann da, so konkret, dass ein Test sie wörtlich prüfen kann.
- Die ID steht im Code-Kommentar an der Stelle, die die Anforderung umsetzt, und im Namen des Tests, der sie prüft: `test("[T5-REQ-001] …")`.
- Ab Status `umgesetzt` braucht jede Anforderung mindestens einen Test mit ihrer ID, sonst schlägt `pnpm check` fehl.
- Status und `Verifiziert` setzt nur `pnpm req`, niemand von Hand. Geprüft wird von einem unabhängigen Prüfer (Subagent `verifier`), den ihr aus eurer eigenen Sitzung startet.
- Es ist immer nur eine Anforderung in Arbeit. Weitere Ideen stehen in `ideen.md`.
- Auslegungsentscheidungen, die beim Bauen fallen, kommen als Zitatblock direkt unter die Anforderung.
- Fehlt ein Feld im Contract, legt Claude es mit `pnpm contracts:add` an und nennt dabei eine ID aus dieser Datei.

Status: `offen` → `spezifiziert` → `umgesetzt` → `verifiziert`, oder `gestrichen`.

## Vorlage

```markdown
### T5-REQ-001: Kurzer Titel

- **User Story:** Als Sachbearbeiter:in möchte ich …, damit …
- **Akzeptanzkriterien:**
  1. Gegeben …, wenn …, dann …
- **Status:** offen
- **Quelle:** Interview vom …
- **Umgesetzt in:** –
- **Verifiziert:** –
```

## Anforderungen

<!-- Hier die Anforderungen nach der Vorlage eintragen. -->

## Offene Fragen an die Fachperson

- 
