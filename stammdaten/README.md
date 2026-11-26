# Stammdaten

Daten, die es in der Versicherung schon gibt, bevor eine Meldung eingeht. Sie gehören zu keiner Akte und zu keinem Task. Lesen dürfen alle Stages, geändert werden sie nicht.

| Datei | Inhalt | Wer braucht das |
|---|---|---|
| `vertragsbestand.json` | Die vier Übungsverträge: Versicherungsscheinnummer, Versicherungsnehmer, Hausverwaltung, Laufzeit (`end: null` heißt unbefristet), Selbstbehalt | Deckungsprüfung (Vertrag bestand am Schadentag?), Schadenaufnahme (Meldet der Versicherungsnehmer oder seine Hausverwaltung selbst?) |

Jede andere Versicherungsscheinnummer ist im Bestand unbekannt. Die Fachpersonen kennen dieselben Verträge.
