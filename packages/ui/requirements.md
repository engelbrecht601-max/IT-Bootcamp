# Anforderungen Gruppe 5: Oberfläche

Zeigt Sachbearbeitenden den Vorgang über alle vier Stages hinweg.

Diese Datei ist Auftrag, Testvorlage und Nachweis zugleich. `pnpm check` prüft ihr Format.

## Regeln

- Jede Anforderung hat eine ID `G5-REQ-NNN`, fortlaufend ab `G5-REQ-001`. Eine ID wird nie neu vergeben, auch nicht nach dem Streichen.
- Akzeptanzkriterien stehen als Gegeben/Wenn/Dann da, so konkret, dass ein Test sie wörtlich prüfen kann.
- Die ID steht im Code-Kommentar an der Stelle, die die Anforderung umsetzt, und im Namen des Tests, der sie prüft: `test("[G5-REQ-001] …")`.
- Ab Status `umgesetzt` braucht jede Anforderung mindestens einen Test mit ihrer ID, sonst schlägt `pnpm check` fehl.
- `Verifiziert` trägt ein, wer die Tests gefahren hat: was beobachtet wurde, mit Befehl und Lücken. Wer baut, verifiziert nicht selbst.
- Auslegungsentscheidungen, die beim Bauen fallen, kommen als Zitatblock direkt unter die Anforderung.
- Ein Änderungsantrag an den Contract (`/contract-change`) nennt immer eine ID aus dieser Datei.

Status: `offen` → `spezifiziert` → `umgesetzt` → `verifiziert`, oder `gestrichen`.

## Vorlage

```markdown
### G5-REQ-001: Kurzer Titel

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
