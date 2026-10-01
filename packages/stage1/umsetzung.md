# Umsetzungsschema Gruppe 1: Schadenaufnahme

Entwurf auf Basis von `requirements.md` (G1-REQ-001 bis G1-REQ-008) und `interview.md`. Annahmen sind in Abschnitt 5 markiert und noch nicht bestätigt.

## 1. Ablauf in `run()`

```
Rohmeldung (Telefon/Formular)
        │
        ▼
┌─────────────────┐
│ 1 Normalisieren │  Versicherungsscheinnummer „gh 4711023" → „GH-4711023"   G1-REQ-002
└────────┬────────┘
         ▼
┌─────────────────┐   ein Fehler oder mehrere
│ 2 Prüfen        │ ──────────────────────────► Abbruch
│  - Pflichtangaben         G1-REQ-001         │  trace: "abgebrochen"
│  - Format VS-Nummer       G1-REQ-002         │  error: {stage:1, code, message}
│  - Schadentag ≤ Meldung   G1-REQ-003         │  currentStage bleibt 1
│  - Telefon oder E-Mail    G1-REQ-005         │
└────────┬────────┘
         ▼ alles in Ordnung
┌─────────────────┐
│ 3 Einordnen     │  Person > Sache > Vermögen                               G1-REQ-004
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4 Markieren     │  Spätmeldung (> 6 Monate)                                G1-REQ-006
│                 │  möglicher Eigenschaden                                  G1-REQ-007
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5 Übergeben     │  stage1-Block, genau 1 Trace "erfasst" mit Markierungen
│                 │  in der note, currentStage = 2, valide gegen Contract    G1-REQ-008
└─────────────────┘
```

## 2. Aufteilung im Code (`packages/stage1/src/`)

| Datei | Aufgabe | Anforderungen |
|---|---|---|
| `report.ts` | Typ `Report` für die Rohmeldung, als **einzige** Stelle, die vom offenen Eingangsformat abhängt | – |
| `normalize.ts` | `normalizePolicyNumber(raw): string \| null` | 002 |
| `validate.ts` | `validate(report): Problem[]` sammelt alle Fehler statt beim ersten abzubrechen | 001, 002, 003, 005 |
| `classify.ts` | `classifyDamage(report): DamageType` | 004 |
| `flags.ts` | `isLateReport(incident, reported)` und `isPossibleOwnDamage(...)` | 006, 007 |
| `handover.ts` | baut den Block `stage1`, den Trace-Eintrag und `meta`. Fremde Blöcke bleiben unverändert | 008 |
| `index.ts` | `run(claim)`: liest die Meldung aus der Akte und ruft der Reihe nach 1 bis 5 auf | – |

Drei Designentscheidungen:

- **Kern unabhängig vom Eingang:** Die Logik bekommt ein `Report`-Objekt, nicht die Akte. Wenn die Workshop-Leitung festlegt, wie die Meldung ankommt, ändert sich nur `index.ts` und `report.ts`. Alles andere ist heute schon baubar und testbar.
- **Uhrzeit von außen:** `run` übernimmt `now` als optionalen Parameter (Standard `new Date()`). Damit sind `completedAt` und Trace-`at` in Tests stabil.
- **Reine Funktionen:** Kein Datei- oder Netzwerkzugriff, die Eingangsakte wird nie verändert (`structuredClone`). Das hält Tests einfach und erfüllt die Regel „nie Felder löschen“.

## 3. Reihenfolge

| Schritt | Was | Voraussetzung |
|---|---|---|
| **0** | Eingangsformat mit der Workshop-Leitung klären. Danach den `Report`-Typ und das Gerüst von `run` anlegen. Anfangs fest verdrahtet: Akte rein, `erfasst` raus | – |
| **1** | **G1-REQ-008** Übergabe: zuerst das Gerüst, damit `pnpm conformance 1` von Anfang an grün läuft | 0 |
| **2** | **G1-REQ-002** VS-Nummer, **G1-REQ-003** Schadentag: reine Funktionen, sofort testbar | – |
| **3** | **G1-REQ-001** Pflichtangaben, Abbruchpfad mit `error` | 0 |
| **4** | **G1-REQ-006** Spätmeldung (Grenzfall „genau 6 Monate“) | – |
| **5** | **G1-REQ-004** Schadenart | Sabine: wie kommt „Person verletzt“ in die Meldung? |
| **6** | **G1-REQ-005** Kontakt: `/contract-change G1-REQ-005 …` **jetzt** stellen, bis zur Entscheidung lokal weiterbauen | Contract-Entscheidung |
| **7** | **G1-REQ-007** Eigenschaden | Sabine: woran erkennbar? Contract: Daten des Versicherungsnehmers |

**Pro Anforderung:** Mit `/spec` schärft ihr die Anforderung und lasst die Tests aus den Akzeptanzkriterien schreiben. `/implement` baut, bis die Tests grün sind. `/verify` übernimmt **eine andere Person** als die, die gebaut hat. Die Schritte 2 und 4 sind unabhängig und lassen sich gut auf zwei Leute aufteilen.

**Parallel dazu:**

- Die offenen Fragen an Sabine abarbeiten (siehe `requirements.md`).
- Mit Gruppe 2 klären, ob ihnen die Markierungen als Freitext in der `note` reichen oder ob es ein eigenes Feld braucht. Davon hängen 006 und 007 ab.

## 4. Absicherung

- **Unit-Tests pro Anforderung:** werden aus den Akzeptanzkriterien geschrieben; mit `pnpm test:req G1-REQ-00X` lauft ihr nur die Tests dieser Anforderung.
- **Musterakten als Referenz:** Ein Test schickt die Meldungen von Standardfall, Grenzfall und Ablehnungskandidat durch `run` und vergleicht mit `fixtures/1-2/`, Zeitstempel ausgenommen. Der Grenzfall muss als Spätmeldung markiert werden, der Ablehnungskandidat als möglicher Eigenschaden.
- **Contract:** Jede Ausgabe wird mit ajv gegen `contracts/claim.schema.json` geprüft (G1-REQ-008).
- **Integration:** `pnpm conformance 1` regelmäßig laufen lassen, nicht nur am Ende.
- **Gate:** `pnpm check` vor jedem Push, ein roter Stand wird nicht gepusht.

## 5. Annahmen (noch nicht bestätigt)

- Bei mehreren Fehlern gibt es **einen** `error`-Block: `code` vom ersten Fehler in der Prüfreihenfolge, `message` nennt alle Fehler.
- Die Markierungen stehen bis zur Klärung mit Gruppe 2 in der Trace-`note`, als „Spätmeldung“ und „möglicher Eigenschaden“, durch „; “ getrennt.
- Beim Abbruch bleibt `meta.currentStage` auf 1.

Diese Annahmen solltet ihr jeweils als Zitatblock unter die betroffene Anforderung schreiben, sobald ihr sie bestätigt habt.

## 6. Offener Blocker

`pnpm conformance` gibt Stage 1 die Akten aus `fixtures/1-2/` **ohne den Block `stage1`** und mit leerem Trace (`scripts/conformance.mjs`, `inputsFor`). Die Rohmeldung steht damit nirgends in der Eingangsakte. Wie sie in `run(claim)` ankommt, muss die Workshop-Leitung entscheiden. Mögliche Antworten:

- Die Meldung kommt als zweiter Parameter in `run`.
- Die Meldung steht vorbefüllt in `stage1` und wird von euch geprüft und ergänzt.
- Es gibt ein eigenes Eingangsfeld, beantragt per `/contract-change`.
