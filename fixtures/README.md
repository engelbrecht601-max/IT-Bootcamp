# Musterakten

Drei erfundene Vorgänge, abgelegt als Schnappschuss an jeder Stage-Grenze. Jede Akte trägt die Meldung (`report`), so wie sie eingegangen ist; die Verträge dazu stehen in `stammdaten/vertragsbestand.json`. Jeder Task entwickelt gegen seinen Eingang, ohne auf den vorherigen Task zu warten. `pnpm contracts:build` validiert alle Akten gegen den gebauten Contract.

| Ordner | Zustand | Eingang für |
|---|---|---|
| `1-2/` | nach der Schadenaufnahme | Task 2 |
| `2-3/` | nach der Deckungsprüfung | Task 3 |
| `3-4/` | nach der Schadenbewertung | Task 4 |
| `4-ende/` | abgeschlossen | Task 5, Integration |

| Datei | Vorgang | Verlauf |
|---|---|---|
| `standardfall.json` | Dachziegel fällt bei Sturm auf das Auto des Nachbarn; Formular, Kostenvoranschlag 2.340 € | gedeckt → 2.340 € − 250 € Selbstbehalt = 2.090 € → Zahlung |
| `grenzfall.json` | Paketzusteller bricht sich auf vereistem Gehweg das Handgelenk; Brief vom Anwalt elf Monate später, Winterdienst an Mieter übertragen | unter Vorbehalt → 3.000 € × 50 % − 250 € = 1.250 € → Zahlung, Regress geprüft |
| `ablehnungskandidat.json` | Rohrbruch in der selbst genutzten Wohnung; die Hausverwaltung des Versicherungsnehmers meldet telefonisch (Eigenschaden) | nicht gedeckt → 0 € → Ablehnung |

`pnpm akten` legt daraus für jeden Arbeitsplatz eine Sicht an, passend zu seinem Zuschnitt: `akten/eingang/` und `akten/ziel/`. Bei zusammengelegten Stages gilt der Eingang der ersten und das Ziel der letzten Stage; die Schadenaufnahme bekommt die Meldung ohne den Block `stage1`. Das passiert von selbst, sobald die Gruppe gestartet ist. `akten/` ist nur zum Ansehen und wird nicht versioniert, Tests lesen aus `fixtures/`.

Die Akten zeigen eine mögliche Lösung, nicht die richtige. Was eine Stage im Grenzfall tun soll, klärt die Person des Tasks im Interview mit der Fachperson.
