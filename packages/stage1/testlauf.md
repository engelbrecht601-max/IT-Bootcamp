# Testlauf Gruppe 1: Erkenntnisse für den Workshop

Stand 2026-10-01. Gruppe 1 hat Stage 1 (Schadenaufnahme) im Testlauf einmal komplett durchlaufen: Interview, Anforderungen, `/spec`, `/implement`, `/verify`, Contract-Änderung, Demo. Ergebnis: 10 Anforderungen verifiziert, 61 Tests grün. Hier steht, was dabei am Setup gehakt hat, sortiert nach Wirkung auf die echten Gruppen.

## Blocker oder hohe Reibung

### 1. Stage 1 hat keinen Eingang
- **Befund:** `pnpm conformance` gibt Stage 1 die Akten aus `fixtures/1-2/` ohne Block `stage1` und mit leerem Trace (`scripts/conformance.mjs`, `inputsFor`). Die Rohmeldung (Versicherungsscheinnummer, Hergang usw.) steht nirgends. `run(claim)` kann so nichts erfassen.
- **Auswirkung:** Gruppe 1 kann nicht ohne Architekturentscheidung anfangen. Wir haben `run(claim, report, now)` und eigene Eingangsmeldungen in `packages/stage1/fixtures/eingang/` eingeführt (G1-REQ-009). Conformance läuft nur über den Abbruchpfad.
- **Vorschlag:** Eingangsmeldungen als `fixtures/0-1/` mitliefern und den Transport festlegen, z. B. ein Feld `intake` im Envelope, das nur Stage 1 liest, oder ein zweiter Parameter für `run`. `conformance.mjs` entsprechend anpassen.

### 2. `main` ist leer, Push braucht Zugangsdaten
- **Befund:** `main` enthält nur den Initial-Commit, das Setup liegt auf `claude/server-setup`. Der erste Push scheiterte an fehlenden GitHub-Zugangsdaten im Container. Claude Code lehnt einen Push auf das gemeinsame `main` aus Sicherheitsgründen ab, selbst wenn die Gruppe zustimmt.
- **Auswirkung:** Gruppen können nicht wie in `CLAUDE.md` beschrieben auf `main` arbeiten. Wir sind auf den Branch `gruppe1` ausgewichen.
- **Vorschlag:** Vor dem Workshop `main` auf den Setup-Stand bringen, Zugangsdaten im Container vorbereiten und in `pnpm run doctor` prüfen (z. B. `git ls-remote`).

### 3. `test-author` liefert schwankende Qualität
- **Befund:**
  - Die „Gemeinsame Ausgangslage“ wurde ignoriert: eine eigene Basismeldung ohne Schadenart, die Tests waren dadurch falsch rot.
  - Testdateien hatten Typfehler (`TS18048`) und hätten `pnpm check` gebrochen.
  - Ein Test hieß „valide gegen das Schema“, prüfte aber nur einzelne Felder. Erst der Verifier hat das gefunden.
  - Ein Test zu G1-REQ-009 ist tautologisch (`typeof` auf einem selbst gebauten Literal).
  - `ajv-formats` wird nicht registriert, Datumsformate bleiben ungeprüft.
  - „0 unklare Kriterien“ wurde fast immer gemeldet.
- **Auswirkung:** Fünf Testdateien mussten neu geschrieben werden. Weil `/implement` Tests nicht ändern darf, kostet jeder Fehler eine Runde.
- **Vorschlag:**
  - Im Agenten verlangen, dass er `pnpm --filter <pkg> typecheck` laufen lässt und die gemeinsame Ausgangslage der `requirements.md` nutzt.
  - Ein Test-Helfer pro Package, z. B. `src/testkit.ts` mit `baseClaim()`, `baseReport()` und `validateClaim()`, wäre stabiler als jedes Mal neu gebaute Helfer.
  - Das Modell von `haiku` auf ein stärkeres umstellen, wenn das Budget es erlaubt.

### 4. Parallele Agenten schreiben in dieselbe Datei
- **Befund:**
  - Parallele `test-author`-Läufe brauchen eindeutige Dateinamen, sonst überschreiben sie sich. Wir haben den Dateinamen im Aufruf mitgegeben, obwohl der Agent laut Doku „nur die ID“ bekommt.
  - Parallele `verifier` schreiben `requirements.md` teils komplett neu (per Python-Skript). Bisher ging nichts verloren, das war aber Glück.
- **Vorschlag:** Den Dateinamen pro ID festlegen (`src/req<NNN>.test.ts`), damit „nur die ID“ reicht. Der `verifier` soll nur per `Edit` auf seinen eigenen Abschnitt schreiben, keine ganzen Dateien.

## Mittlere Reibung

### 5. Contract-Regeln stehen nicht in der Doku
- **Befund:** `error.code` muss `^[A-Z][A-Z0-9_]*$` erfüllen. Das steht nur im Schema. Wir haben deutsche kebab-case-Codes in die Anforderungen geschrieben und erst bei `pnpm conformance` den Fehler gesehen. Die Tests mussten danach neu geschrieben werden.
- **Vorschlag:** Envelope-Regeln (Fehlercode-Format, Trace-Aktionen, `currentStage` beim Abbruch) in `CLAUDE.md` aufnehmen. Ein Test zu G1-REQ-008 sollte ohnehin per Ajv validieren.

### 6. Der Abbruch ist fachlich eine Rückfrage
- **Befund:** Sabine kennt bei fehlenden Angaben keine Ablehnung, nur „nichts anlegen und nachfragen“. Der Contract kennt nur `erfasst` oder `abgebrochen`.
- **Auswirkung:** Gruppen müssen das selbst merken und auslegen. Wir haben „Abbruch = Rückfrage“ mit `error.message` „Bitte nachfragen: …“ festgelegt (G1-REQ-010).
- **Vorschlag:** In der Stage-1-`CLAUDE.md` erwähnen oder eine Trace-Aktion `rückfrage` vorsehen.

### 7. Die Persona sagt sehr oft „müsste ich klären“
- **Befund:** Von gut 30 Einzelfragen blieben über 20 ganz oder teilweise offen: Wortlaut der Rückfrage, Wartefrist, ungefährer Schadentag, Mindestinhalt des Hergangs, Namensgleichheit, fremde Sparte und weitere. Klar beantwortet wurden Format der Nummer, Schadenarten und Rangfolge, Sechs-Monats-Grenze, Eigenschaden, Kontaktpflicht und Forderung.
- **Auswirkung:** Gut für das Lernziel „nicht erfinden“. Ohne eine Regel wie „im Zweifel nachfragen“ (G1-REQ-010) bleiben Gruppen aber stecken.
- **Nachtrag:** Auch die Technik „nach konkreten Fällen statt nach Regeln fragen“ brachte nichts Neues. Die Persona sagt ausdrücklich, dass sie keine Fälle erfindet, und kennt nur den Paketzusteller-Fall. Ihr Wissen ist also bewusst auf wenige Regeln begrenzt.
- **Vorschlag:** Bewusst entscheiden, ob das so gewollt ist. Falls ja, den Gruppen den Umgang damit als Technik mitgeben: Grundregeln statt Einzelfälle, Annahmen markieren. Falls nein, der Persona mehr Detailwissen zu Randfällen geben.

### 8. Das Interview-Protokoll ist nicht immer wörtlich
- **Befund:** Der Subagent gab Antworten einmal als Paraphrase zurück („Sabine hat auf Deutsch geantwortet, aber der Inhalt folgt hier“), eine Schlussfrage kam nur sinngemäß. Für jede Frage muss das ganze bisherige Protokoll in den Aufruf, das wird lang.
- **Vorschlag:** Die Persona soll ihre Antwort in einem festen Rahmen zurückgeben (z. B. `ANTWORT_START … ANTWORT_ENDE`). Im letzten Interview ausprobiert: Die Antwort kam vollständig und ohne Kommentar zurück. Für lange Gespräche eher `pnpm interview <N>` empfehlen.

### 9. Die Vorlage in `requirements.md` trägt eine echte ID
- **Befund:** Die Vorlage im Codeblock heißt `### G1-REQ-001: Kurzer Titel`. Ein Skript, das nach der ersten Fundstelle von `G1-REQ-001` sucht, trifft die Vorlage statt der Anforderung. Das ist uns passiert, der Status landete in der Vorlage.
- **Vorschlag:** Die Vorlage als `G1-REQ-NNN` schreiben. `check-requirements` ignoriert Codeblöcke ohnehin.

## Kleinigkeiten

- **Port 4000:** Caddy leitet `/mock` auf Port 4000 (Mock-Server) und die App auf 5173. Unsere Demo lief auf 4000, weil kein UI-Port vereinbart war. Für Stage-Demos einen eigenen Port vorsehen.
- **Proxy-Adresse ungetestet:** Die code-server-Proxy-Adresse (`https://gruppe1.localhost:8443/proxy/<port>/`) ließ sich aus dem Container nicht prüfen.
- **`/implement` und viele Anforderungen:** `/implement` verlangt pro Anforderung ein Okay der Gruppe zum Plan. Bei vielen Anforderungen auf einmal ist das schwerfällig. Ein Sammel-Okay für mehrere IDs wäre hilfreich.
- **Was gut lief:**
  - Contract-Änderung im eigenen Block (G1-CR-001): automatisch freigegeben, sauber gebaut, Fixtures weiter valide.
  - `pnpm check` als Pre-Push-Gate.
  - Der `verifier` hat einen echten Blocker gefunden (G1-REQ-008).
