// Der Claim-Envelope, wie ihn diese Gruppe sieht. Maßgeblich ist contracts/claim.schema.json;
// dieser Typ wird von der Gruppe mitgepflegt, wenn ihr Block durch Änderungsanträge wächst.

export type StageNumber = 1 | 2 | 3 | 4;

export interface TraceEntry {
  stage: StageNumber;
  at: string;
  action: "erfasst" | "geprüft" | "bewertet" | "reguliert" | "abgebrochen";
  note?: string;
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
  stage1?: Record<string, unknown>;
  stage2?: Record<string, unknown>;
  stage3?: Record<string, unknown>;
  stage4?: Record<string, unknown>;
}
