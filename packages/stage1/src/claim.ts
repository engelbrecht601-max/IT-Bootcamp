// Der Claim-Envelope, wie ihn diese Gruppe sieht. Maßgeblich ist contracts/claim.schema.json;
// dieser Typ wird von der Gruppe mitgepflegt, wenn ihr Block durch Änderungsanträge wächst.

export type StageNumber = 1 | 2 | 3 | 4;

export interface TraceEntry {
  stage: StageNumber;
  at: string;
  action: "erfasst" | "geprüft" | "bewertet" | "reguliert" | "abgebrochen";
  note?: string;
}

export type DamageType = "Personenschaden" | "Sachschaden" | "Vermögensschaden";

/**
 * G1-REQ-009: Eingangsmeldung (Rohmeldung), wie sie per Telefon oder Formular ankommt.
 * Alle Angaben sind ungeprüft und dürfen fehlen; Stage 1 prüft, korrigiert und bricht gegebenenfalls ab.
 */
export interface Report {
  channel?: "Telefon" | "Formular";
  policyNumber?: string;
  incidentDate?: string;
  reportedAt?: string;
  description?: string;
  claimantName?: string;
  claimantPhone?: string;
  claimantEmail?: string;
  damageType?: DamageType;
  personInjured?: boolean;
  propertyDamaged?: boolean;
  policyholderName?: string;
  propertyManagerName?: string;
  claimedAmount?: number;
}

/** Block stage1 laut Contract, inklusive der Felder aus G1-CR-001. */
export interface Stage1 {
  completedAt: string;
  policyNumber: string;
  incidentDate: string;
  reportedAt: string;
  damageType: DamageType;
  description: string;
  claimant: { name: string };
  claimantPhone?: string;
  claimantEmail?: string;
  claimedAmount?: number;
}

export interface Claim {
  claimId: string;
  meta: {
    contractVersion: string;
    createdAt: string;
    currentStage: StageNumber;
    testCase?: "Standardfall" | "Grenzfall" | "Ablehnungskandidat";
  };
  trace: TraceEntry[];
  error?: { stage: StageNumber; code: string; message: string };
  stage1?: Stage1;
  stage2?: Record<string, unknown>;
  stage3?: Record<string, unknown>;
  stage4?: Record<string, unknown>;
}
