# Musterakten

Drei erfundene Vorgänge, abgelegt als Schnappschuss an jeder Stage-Grenze. Jeder Task entwickelt gegen seinen Eingang, ohne auf den vorherigen Task zu warten. `pnpm contracts:build` validiert alle Akten gegen den gebauten Contract.

| Ordner | Zustand | Eingang für |
|---|---|---|
| `1-2/` | nach der Schadenaufnahme | Task 2 |
| `2-3/` | nach der Deckungsprüfung | Task 3 |
| `3-4/` | nach der Schadenbewertung | Task 4 |
| `4-ende/` | abgeschlossen | Task 5, Integration |

| Datei | Vorgang | Verlauf |
|---|---|---|
| `standardfall.json` | Dachziegel fällt bei Sturm auf das Auto des Nachbarn | gedeckt → 2.340 € → Zahlung |
| `grenzfall.json` | Paketzusteller stürzt auf vereistem Gehweg; Meldung elf Monate später, Winterdienst an Mieter übertragen | gedeckt mit Vorbehalt → 4.750 € → Zahlung |
| `ablehnungskandidat.json` | Rohrbruch in der selbst genutzten Wohnung des Versicherungsnehmers (Eigenschaden) | nicht gedeckt → 0 € → Ablehnung |

`pnpm akten` legt daraus für jeden Arbeitsplatz eine Sicht an, passend zu seinem Zuschnitt: `akten/eingang/` und `akten/ziel/`. Bei zusammengelegten Stages gilt der Eingang der ersten und das Ziel der letzten Stage; die Schadenaufnahme bekommt die Meldung ohne den Block `stage1`. Das passiert von selbst, sobald die Gruppe gestartet ist. `akten/` ist nur zum Ansehen und wird nicht versioniert, Tests lesen aus `fixtures/`.

Die Akten zeigen eine mögliche Lösung, nicht die richtige. Was eine Stage im Grenzfall tun soll, klärt die Person des Tasks im Interview mit der Fachperson.
