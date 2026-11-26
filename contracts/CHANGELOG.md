# Contract-Changelog

Änderungen am Basis-Contract. Felder, die eine Gruppe im Workshop mit `pnpm contracts:add` anlegt, stehen als Patches in `contracts/patches/`.

## 1.1.0 · Basis nach dem Workshop vom 21.11.2026

Felder, auf die alle Gruppen gewartet haben, sind jetzt von Anfang an da:

- Neuer Block `report`: die Meldung, wie sie eingegangen ist (`receivedAt`, `channel`, `answers`). Gehört keiner Stage, die Schadenaufnahme liest daraus.
- `stage1`: `claimant.contact`, `costEstimate` (Kostenvoranschlag, getrennt von der Forderung), `damagedItem`, `injury`, `lossOfEarnings`.
- `stage2`: `coverageDecision` kennt „unter Vorbehalt“, neu sind `deductible` (Selbstbehalt) und `hints` (Hinweise an die Bewertung).
- `stage3`: `provisional` (vorläufige Bewertung) und `calculation` (die Rechnung in einem Satz).
- `stage4`: `settlementDecision` kennt „in Freigabe“.

Eigene Felder bleiben Übung der Gruppen, etwa Spätmeldung und möglicher Eigenschaden (Stage 1), Haftungsquote und Gutachter (Stage 3), Empfänger, Ablehnungsschreiben und Regress (Stage 4).

## 1.0.0 · Basis

- Basis-Contract mit `meta`, `trace`, `error` und den Blöcken `stage1` bis `stage4`.
