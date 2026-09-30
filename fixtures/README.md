# Musterakten

Drei erfundene Vorgänge, abgelegt als Schnappschuss an jeder Stage-Grenze. Jede Gruppe entwickelt gegen ihren Eingang, ohne auf die Vorgänger-Gruppe zu warten. `pnpm contracts:build` validiert alle Akten gegen den gebauten Contract.

| Ordner | Zustand | Eingang für |
|---|---|---|
| `1-2/` | nach der Schadenaufnahme | Gruppe 2 |
| `2-3/` | nach der Deckungsprüfung | Gruppe 3 |
| `3-4/` | nach der Schadenbewertung | Gruppe 4 |
| `4-ende/` | abgeschlossen | Gruppe 5, Integration |

| Datei | Vorgang | Verlauf |
|---|---|---|
| `standardfall.json` | Dachziegel fällt bei Sturm auf das Auto des Nachbarn | gedeckt → 2.340 € → Zahlung |
| `grenzfall.json` | Paketzusteller stürzt auf vereistem Gehweg; Meldung elf Monate später, Winterdienst an Mieter übertragen | gedeckt mit Vorbehalt → 4.750 € → Zahlung |
| `ablehnungskandidat.json` | Rohrbruch in der selbst genutzten Wohnung des Versicherungsnehmers (Eigenschaden) | nicht gedeckt → 0 € → Ablehnung |

Die Akten zeigen eine mögliche Lösung, nicht die richtige. Was eine Stage im Grenzfall tun soll, klären die Gruppen im Interview mit der Fachperson.
