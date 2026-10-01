# Contract-Changelog

Gepflegt von `pnpm contracts:decide` (über den Subagenten `contract-guard`). Nicht von Hand bearbeiten.

## 1.0.0 · Basis

- Basis-Contract mit `meta`, `trace`, `error` und den Blöcken `stage1` bis `stage4`.

## 1.1.0 · G1-CR-001

- Requirement: G1-REQ-005
- Im Block stage1 fehlen Telefonnummer und E-Mail-Adresse des Anspruchstellers, damit später jemand nachfragen kann. Mindestens eine der beiden Angaben liegt bei jeder erfassten Meldung vor.
- Freigegeben von contract-classify am 2026-10-01: additive Änderung im eigenen Block
