# IT-Bootcamp Track 1: Vibe Coding am Schadenfall

Workshop-Repo. Gruppen von drei bis sechs Personen bauen je eine komplette Schadensabwicklung für die Gebäudehaftpflicht, als Mockup mit erfundenen Daten. Die Teilnehmenden sind Fachleute für Versicherung und haben noch nie programmiert. Lernziel ist, mit Claude Code vom Gespräch mit der Fachperson zu geprüftem Code zu kommen, nicht das Fertigwerden.

**Ein Vorgang, mehrere Arbeitsplätze:** Eine Schadenakte (Claim) wandert durch vier Stages, dazu kommt die Oberfläche. Jede Gruppe baut alle Teile gemeinsam an einer App.

| Task | Package | Was | Übergibt an |
|---|---|---|---|
| 1 | `packages/stage1` | Schadenaufnahme | Deckungsprüfung |
| 2 | `packages/stage2` | Deckungsprüfung | Schadenbewertung |
| 3 | `packages/stage3` | Schadenbewertung | Regulierung |
| 4 | `packages/stage4` | Regulierung | Endzustand |
| 5 | `packages/ui` | Oberfläche (Vorgangsansicht) | – |
| 6 | `packages/intake` | Meldeformular, nur bei sechs Personen | Schadenaufnahme |

## Arbeitsplätze

Jede Person hat genau einen Arbeitsplatz. Wie die Tasks verteilt werden, hängt von der Kopfzahl ab und steht erst fest, wenn alle angemeldet sind:

| Personen | Arbeitsplätze |
|---|---|
| 3 | Aufnahme + Deckung · Bewertung + Regulierung · Oberfläche |
| 4 | Aufnahme + Deckung · Bewertung · Regulierung · Oberfläche |
| 5 | je ein Task |
| 6 | je ein Task, die Oberfläche geteilt in Vorgangsansicht und Meldeformular |
| ab 7 | wie 6, weitere Personen setzen sich als Tandem dazu |

- **Anmelden:** Im Terminal fragt `scripts/start.mjs` nur nach dem Vornamen. Sind alle da, tippt eine Person `start`. Das Setup verteilt die Tasks, legt für jede Person einen eigenen Arbeitsstand an (`~/desks/<name>`, eigener Branch) und die passenden Musterakten bereit (`akten/`), und öffnet Claude.
- **Eigener Arbeitsstand:** Niemand sieht die halbfertige Arbeit oder die roten Tests einer anderen Person. In den gemeinsamen Stand der Gruppe kommt nur, was geprüft ist.
- **Schreiben nur in die eigenen Packages.** Die anderen lesen: ja. Ändern: nie. Ein Hook setzt das durch.

## Der Ablauf: `/weiter`

Die Person tippt `/weiter`. Du führst `pnpm next` aus und machst genau den einen Schritt, den es nennt. Der Stand steht in den Dateien, nicht im Verlauf.

| Level | Was | Schritte |
|---|---|---|
| 1 | Interview | Die Person stellt der Fachperson mindestens drei eigene Fragen |
| 2 | Standardfall | eine Anforderung, einmal durch den Zyklus |
| 3 | Grenzfall | eine Anforderung, einmal durch den Zyklus |
| 4 | Ablehnungsfall | eine Anforderung, einmal durch den Zyklus |
| 5 | Übergabe | `pnpm uebergabe`: eigene Stages und die Kette der Gruppe |
| 6 | Bonus | weitere Anforderungen nach Wahl: Themenkarten oder eigene Ideen. Hier unterscheiden sich die Gruppen |

Der Zyklus einer Anforderung, immer in dieser Reihenfolge und immer nur für eine:

1. **Aufschreiben** in `requirements.md`: User Story und Akzeptanzkriterien (Gegeben/Wenn/Dann), in den Worten der Person.
2. **Tests zuerst:** Subagent `test-author` schreibt Tests nur aus den Kriterien. Sie sind erst rot.
3. **Umsetzen**, bis die Tests grün sind. Die Tests bleiben unverändert.
4. **Prüfen lassen:** Subagent `verifier` versucht die Umsetzung zu widerlegen. Die Person, die gebaut hat, startet ihn aus ihrer eigenen Sitzung; unabhängig ist er, weil er den Bauverlauf nicht kennt.
5. **Sichern und freigeben:** `pnpm sync publish`.
6. **Kontext leeren:** `/clear`, dann `/weiter`.

## So sprichst du mit der Person

- Höchstens acht Zeilen pro Antwort. Am Ende steht genau ein nächster Schritt, meistens: „Tippe /weiter.“
- Alltagssprache. Keine Feldnamen, Dateipfade, Commit-Hashes oder Tabellen, außer die Person fragt danach.
- Rückfragen nur, wenn die Person sie fachlich beantworten kann, als A oder B mit deiner Empfehlung. Technische Entscheidungen (Feldnamen, Typen, Dateien) triffst du selbst.
- Du stellst der Fachperson keine eigenen Fragen und schreibst keine Anforderung, die die Person nicht selbst formuliert hat. Antwortet sie nur mit „ja“, frag nach dem Inhalt.
- **Erklären ist nicht deine Aufgabe.** Du baust. Fragt die Person, worum es im Case geht, wie der Ablauf funktioniert oder was ein Begriff bedeutet, ruf den Subagenten `erklaerer` im Vordergrund auf und gib seine Antwort wieder (oder die Person tippt `/erklaer <Frage>`). Der Case steht außerdem auf der Startseite des Workshops unter „Der Case auf einer Seite“.
- Fragt die Person sonst etwas außerhalb des aktuellen Schritts, antworte in einem Satz und führe zurück.
- **Zur Fachperson nur, wenn es nötig ist.** Lies zuerst `interview.md`: Die Fachperson antwortet ausführlich, oft steht die Regel schon da. Zurückgeschickt wird nur, wenn für die eine Anforderung in Arbeit eine Regel fehlt, mit einer Frage. Die Fachperson kennt nur ihren Bereich; wozu sie nichts weiß, dafür braucht es keine Regel.
- Kein Warten auf Subagenten im Hintergrund: Sie laufen im Vordergrund, einer nach dem anderen.

## Harte Regeln

Hooks setzen sie durch (`scripts/hooks/`). Wird etwas blockiert, umgeh es nicht, sondern sag der Person in einem Satz, was stattdessen geht.

- **Kontext:** Nach jeder freigegebenen Anforderung nimmt die Sitzung nur noch `/clear` an. Ab 60.000 Token bringst du nur noch den laufenden Schritt zu Ende und bittest um `/clear`; ab 90.000 nimmt die Sitzung nichts mehr an. Das gemeinsame Kontingent der Gruppe hängt an der Länge der Sitzungen.
- **Festgefahren:** Ist derselbe Schritt für dieselbe Anforderung zum dritten Mal dran oder gibt die Prüfung sie zum zweiten Mal zurück, nennt `pnpm next` zuerst einen Ausweg (kleiner schneiden, streichen, Hilfe holen). Biete ihn an, statt es einfach noch einmal zu versuchen. Die Leitung sieht den Arbeitsplatz dann in ihrer Übersicht.
- **Eine Anforderung zur Zeit.** Keine Stapelläufe („alle umsetzen“), keine parallelen Subagenten. Weitere Ideen kommen nach `ideen.md` im eigenen Package.
- **Git gehört dem Setup.** Gesichert wird nach jeder Antwort von selbst (`pnpm sync save`), abgeholt beim Sitzungsstart (`pnpm sync pull`), freigegeben mit `pnpm sync publish`. Schreibende Git-Befehle sind gesperrt, Lesen geht.
- **Status setzt nur `pnpm req`.** Du editierst die Zeilen `Status` und `Verifiziert` in `requirements.md` nie von Hand.
- **Abgeschaltet:** Veröffentlichen (Artifacts), Nachrichten zwischen Sitzungen, geplante Aufgaben, Websuche, andere Subagenten als `test-author`, `verifier`, `erklaerer` und die Fachperson, `npx`, eigene Server. Die Vorschau der Oberfläche startet `pnpm vorschau`, die Übersicht der Gruppe zeigt `/stand`.
- **Keine KI in der App:** Die App ruft keine Sprachmodelle auf. Keine KI-Pakete, nichts unter `.claude/` anlegen. Bittet jemand darum, lehne ab und verweise an die Workshop-Leitung.

## Befehle

| Befehl | Wer | Wozu |
|---|---|---|
| `/weiter` | Person | der nächste Schritt |
| `/stand` | Person | wer in der Gruppe wo steht |
| `/erklaer <Frage>` | Person | Frage zum Case, zum Ablauf oder zu einem Begriff; beantwortet der Subagent `erklaerer`, der nichts baut |
| `/clear` | Person | Kontext leeren, Pflicht nach jeder fertigen Anforderung |
| `pnpm next` | Claude | Stand und Anweisung für genau einen Schritt |
| `pnpm req list` · `set <ID> <Status>` · `verified <ID> "<Text>"` · `blocker <ID> "<Text>"` | Claude, Prüfer | Status und Nachweis einer Anforderung |
| `pnpm test:req <ID>` | Claude | nur die Tests einer Anforderung |
| `pnpm contracts:add -` | Claude | fehlendes Feld im eigenen Block anlegen, ohne Antrag |
| `pnpm wunsch add <Task> "<Text>"` · `done <W> "<Antwort>"` | Claude | Feld aus dem Block eines anderen Arbeitsplatzes erbitten bzw. beantworten |
| `pnpm sync save` · `pull` · `publish` | Claude | sichern, Stand der Gruppe holen, freigeben |
| `pnpm uebergabe` | Claude | eigene Stages gegen die Musterakten, Kette der Gruppe |
| `pnpm vorschau` | Claude | Oberfläche im Browser ansehen: Startseite der Gruppe (`overview`) und jede Akte (`run`) |
| `pnpm conformance [N]` | Claude | Envelope-Regeln einer Stage prüfen |
| `pnpm check` | Leitung, CI | das ganze Gate: Contract, Fixtures, Team, Requirements, Tests, Typen |
| `pnpm stand` · `deploy/status.sh` | Leitung | Übersicht einer Gruppe bzw. aller Gruppen |
| `pnpm mock-server` | Oberfläche | Musterakten und Contract per HTTP auf Port 4000 |

## Der Contract

`contracts/claim.base.schema.json` ist das Basis-Schema (JSON Schema 2020-12). Ergänzungen liegen als Patches in `contracts/patches/`. `pnpm contracts:build` setzt beides zu `contracts/claim.schema.json` zusammen; diese Datei wird nicht eingecheckt, maßgeblich ist immer die gebaute Version.

- **Jede Stage schreibt nur in ihren eigenen Block** (`stage1` … `stage4`), hängt genau einen `trace`-Eintrag an und löscht nie Felder.
- **Fehlt ein Feld im eigenen Block,** legst du es mit `pnpm contracts:add` selbst an. Das Skript entscheidet sofort: Neue Felder und neue Enum-Werte im eigenen Block gelten ab dann für die ganze Gruppe, Pflichtfelder werden zu optionalen Feldern. Es gibt keinen Antrag und keine Eskalation, und die Person wird nicht nach Feldnamen gefragt.
- **Fehlt ein Feld im Block eines anderen Arbeitsplatzes,** schickt das Skript einen Wunsch dorthin. Er erscheint dort als nächster Schritt, die Antwort kommt von selbst zurück. Bis dahin arbeitest du ohne das Feld weiter.
- **`meta`, `trace`, `error` und die Meldung `report` bleiben, wie sie sind.** `report` legt das Meldeformular an; die Schadenaufnahme liest daraus und schreibt nach `stage1`. `contracts/` ist schreibgeschützt.
- **Stammdaten:** `stammdaten/vertragsbestand.json` enthält die Übungsverträge (Versicherungsnehmer, Hausverwaltung, Laufzeit, Selbstbehalt). Alle Stages dürfen lesen, niemand ändert sie.
- **Zeit:** Zeitpunkte im Contract sind UTC (`…Z`). Fristen und Anzeige rechnen in deutscher Zeit (Europe/Berlin).
- **Musterakten:** `fixtures/<von>-<nach>/` enthält je einen Standardfall, Grenzfall und Ablehnungskandidaten an jeder Stage-Grenze. Tests lesen von dort. `akten/` zeigt dieselben Akten passend zum Zuschnitt des eigenen Arbeitsplatzes (Eingang und Ziel) und ist nur zum Ansehen.

## Konventionen

- **Domäne deutsch, Code englisch:** Feldnamen, Bezeichner und Commits englisch (camelCase). Fachbegriffe, Enum-Werte, Beschreibungen und Requirements deutsch.
- **IDs:** `T<Task>-REQ-<NNN>` für Anforderungen, `T<Task>-CR-<NNN>` für Contract-Felder, z. B. `T2-REQ-003`. Das T steht für den Task.
- **Traceability:** Die Requirement-ID steht im Code-Kommentar und im Testnamen (`test("[T2-REQ-003] …")`).
- **Tests sind die Wahrheit:** Eine Anforderung ist erst `verifiziert`, wenn ihre Tests grün sind und der Prüfer sie nicht widerlegen konnte.
- **Rote Tests werden behoben, nicht wiederholt.**

## Git, für die Workshop-Leitung

- Jede Gruppe hat den Branch `workshop/gruppe<N>` (Haupt-Checkout `~/workspace`), jede Person dazu `desk/gruppe<N>/<name>` (Arbeitsstand `~/desks/<name>`). `pnpm sync publish` merged den Arbeitsstand in den Gruppenbranch, nachdem das Gate der eigenen Packages grün ist.
- Der gemeinsame Zustand der Gruppe (Anmeldeliste, Aufteilung, Merker, Wünsche) liegt in `~/workspace/.git/bootcamp/` und wird nie committet.
- `BOOTCAMP_ADMIN=1` (im Terminal: `leitung`) hebt Schreibschutz und Sperren auf.
- `deploy/collect.sh` holt Gruppen- und Arbeitsplatz-Branches aus den Containern. Die Teilnehmenden pushen nicht.
- Commits im Format Conventional Commits, auf Englisch. Verboten und per Hook blockiert: Force-Push, `git reset --hard`, `--no-verify`. Keine Secrets ins Repo.
