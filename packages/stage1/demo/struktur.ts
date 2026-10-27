// Struktur eines Vorgangs: ein Claim, vier Schreibtische. Zeigt den Envelope aus dem Contract,
// wem welcher Block gehört und wie die drei Musterfälle durch die vier Stage-Grenzen wandern.
// Alles vom Mock-Server, nichts von Hand gepflegt.
// Start im Repo-Root: PORT=4200 node --import tsx packages/stage1/demo/struktur.ts
import { createServer } from "node:http";
import { MOCK, mock, esc, json, pill, page, offline, type Tone } from "./shared.js";

const PORT = Number(process.env.PORT ?? 4200);
const BOUNDARIES = ["1-2", "2-3", "3-4", "4-ende"] as const;
const TEST_CASES = ["standardfall", "grenzfall", "ablehnungskandidat"] as const;

const STAGES = [
  { block: "stage1", group: "Gruppe 1", stage: "Schadenaufnahme", frage: "Was ist passiert, und ist die Meldung vollständig?", next: "Deckungsprüfung" },
  { block: "stage2", group: "Gruppe 2", stage: "Deckungsprüfung", frage: "Besteht Versicherungsschutz für diesen Schaden?", next: "Schadenbewertung" },
  { block: "stage3", group: "Gruppe 3", stage: "Schadenbewertung", frage: "Wie hoch ist der ersatzfähige Schaden?", next: "Regulierung" },
  { block: "stage4", group: "Gruppe 4", stage: "Regulierung", frage: "Wird gezahlt, abgelehnt oder verglichen?", next: "Endzustand" },
] as const;

type Claim = Record<string, any>;
type Listed = { claimId: string; boundary: string; testCase: string; currentStage: number; href: string };

/** Löst `$ref` auf die `$defs` des Contracts auf, damit die Feldtabellen Typ und Text zeigen. */
function resolve(schema: any, node: any): any {
  if (!node?.$ref) return node;
  const key = node.$ref.replace("#/$defs/", "");
  return { ...schema.$defs[key], ...node, $ref: undefined };
}

const typeOf = (node: any): string => {
  if (node.enum) return node.enum.join(" | ");
  if (node.type === "array") return `Liste von ${node.items?.type ?? "Objekt"}`;
  return node.format ? `${node.type} (${node.format})` : (node.type ?? "?");
};

/** Eine Feldzeile, verschachtelte Objekte und Listen eine Ebene tief mit aufgeklappt. */
function fieldRows(schema: any, node: any, prefix = ""): string {
  const required: string[] = node.required ?? [];
  return (Object.entries(node.properties ?? {}) as [string, any][])
    .map(([name, raw]) => {
      const field = resolve(schema, raw);
      const nested = field.type === "array" ? resolve(schema, field.items ?? {}) : field;
      const row = `<tr><td class="mono"${prefix ? ' style="padding-left:22px"' : ""}>${esc(prefix + name)}</td>
        <td>${required.includes(name) ? '<span class="y">ja</span>' : '<span class="muted">nein</span>'}</td>
        <td class="mono muted">${esc(typeOf(field))}</td>
        <td class="muted">${esc(field.description ?? "")}</td></tr>`;
      // Nur eine Ebene tief: tiefer verschachtelt ist der Contract nicht.
      return prefix || !nested?.properties ? row : row + fieldRows(schema, nested, `${name}${field.type === "array" ? "[]" : ""}.`);
    })
    .join("");
}

/** Feldtabelle eines Blocks: Pflichtfelder zuerst erkennbar, Beschreibung direkt aus dem Contract. */
function fieldTable(schema: any, node: any): string {
  const rows = fieldRows(schema, node);
  return rows ? `<table><tr><th>Feld</th><th>Pflicht</th><th>Typ</th><th>Bedeutung</th></tr>${rows}</table>` : "";
}

const blocksOf = (claim: Claim): string[] => STAGES.map((s) => s.block).filter((b) => claim[b]);

/** Die Kernaussage eines Stage-Blocks in einer Zeile, für die Reise-Matrix. */
function headline(block: string, claim: Claim): string {
  const data = claim[block];
  if (!data) return "–";
  if (block === "stage1") return `${data.damageType}, ${data.claimedAmount !== undefined ? `${data.claimedAmount.toFixed(2)} €` : "Betrag offen"}`;
  if (block === "stage2") return String(data.coverageDecision);
  if (block === "stage3") return `${Number(data.assessedAmount).toFixed(2)} €`;
  return `${data.settlementDecision}${data.payoutAmount !== undefined ? `, ${Number(data.payoutAmount).toFixed(2)} €` : ""}`;
}

const toneOf = (claim: Claim): Tone =>
  claim.error ? "bad" : claim.stage2?.coverageDecision === "nicht gedeckt" || claim.stage4?.settlementDecision === "abgelehnt" ? "warn" : "ok";

function render(schema: any, listed: Listed[], claims: Map<string, Claim>): string {
  const pipeline = STAGES.map((s) => {
    const node = schema.properties[s.block];
    const fields = Object.keys(node.properties ?? {}).length;
    return `<div class="card" style="flex:1 1 220px">
      <h3>${esc(s.stage)} ${pill(s.group, "accent")}</h3>
      <p class="muted" style="margin:0 0 8px">${esc(s.frage)}</p>
      <dl class="kv">
        <dt>schreibt</dt><dd class="mono">${esc(s.block)}</dd>
        <dt>Felder</dt><dd>${fields} (${(node.required ?? []).length} Pflicht)</dd>
        <dt>übergibt an</dt><dd>${esc(s.next)}</dd>
      </dl></div>`;
  }).join('<div class="arrow">→</div>');

  const envelope = Object.entries(schema.properties as Record<string, any>)
    .map(([name, raw]) => {
      const node = resolve(schema, raw);
      const owner = name.startsWith("stage")
        ? STAGES.find((s) => s.block === name)!.group
        : name === "meta"
          ? "Workshop-Leitung"
          : "alle Stages";
      const tone: Tone = name === "meta" ? "warn" : name.startsWith("stage") ? "accent" as Tone : "neutral";
      const inner = name === "trace" ? resolve(schema, node.items) : node;
      return `<div class="card">
        <h3><span class="mono">${esc(name)}</span> ${pill(owner, tone)}</h3>
        <p class="muted" style="margin:0 0 8px">${esc(node.description ?? "")}${(schema.required ?? []).includes(name) ? " <b>Pflichtfeld der Akte.</b>" : ""}</p>
        ${name === "trace" ? '<p class="hint">Ein Eintrag je Bearbeitungsschritt:</p>' : ""}
        ${fieldTable(schema, inner)}
      </div>`;
    })
    .join("");

  const matrix = `<div class="scroll"><table>
    <tr><th>Musterfall</th>${BOUNDARIES.map((b) => `<th>nach ${esc(b === "4-ende" ? "Stage 4" : `Stage ${b[0]}`)}<br><span class="muted mono">${esc(b)}</span></th>`).join("")}</tr>
    ${TEST_CASES.map((name) => {
      const cells = BOUNDARIES.map((b) => {
        const claim = claims.get(`${b}/${name}`);
        if (!claim) return '<td class="muted">–</td>';
        const last = claim.trace.at(-1);
        return `<td>
          <div class="chips">${blocksOf(claim).map((block) => pill(block, block === "stage1" ? "accent" : "ok")).join("")}</div>
          <div>${esc(headline(blocksOf(claim).at(-1) ?? "", claim))}</div>
          <div class="muted mono">currentStage ${claim.meta.currentStage} · ${esc(last?.action ?? "–")}</div>
        </td>`;
      }).join("");
      const end = claims.get(`4-ende/${name}`)!;
      return `<tr><td><b>${esc(name)}</b><br><span class="mono muted">${esc(end.claimId)}</span><br>${pill(headline("stage4", end), toneOf(end))}</td>${cells}</tr>`;
    }).join("")}
  </table></div>`;

  const timelines = TEST_CASES.map((name) => {
    const claim = claims.get(`4-ende/${name}`)!;
    return `<div class="card">
      <h3>${esc(name)} ${pill(claim.claimId, "neutral")}</h3>
      <table>${claim.trace
        .map(
          (t: any) => `<tr><td class="mono">${esc(t.stage)}</td><td>${pill(t.action, t.action === "abgebrochen" ? "bad" : "ok")}</td>
            <td class="mono muted">${esc(String(t.at).slice(0, 16).replace("T", " "))}</td>
            <td>${esc(t.note ?? "")}</td></tr>`,
        )
        .join("")}</table>
      <details><summary>Akte im Endzustand</summary><pre>${json(claim)}</pre></details>
    </div>`;
  }).join("");

  return page(
    "Case-Struktur · ein Vorgang, vier Schreibtische",
    `Contract ${esc(schema["x-contractVersion"])} und ${listed.length} Akten vom Mock-Server <code>${esc(MOCK)}</code>.
     Jede Stage schreibt nur ihren Block, hängt einen Trace-Eintrag an und löscht nie Felder.`,
    `<h2>Der Weg der Akte</h2>
     <div class="flow">${pipeline}</div>
     <h2>Der Envelope</h2>
     <p class="hint">Alle Felder und Texte aus <code>/schema</code>. <code>meta</code> gehört niemandem: Änderungen entscheidet die Workshop-Leitung.</p>
     <div class="grid">${envelope}</div>
     <h2>Die drei Musterfälle an jeder Grenze</h2>
     <p class="hint">Dieselbe Akte, vier Schnappschüsse. Pro Grenze kommt genau ein Block dazu.</p>
     ${matrix}
     <h2>Protokoll im Endzustand</h2>
     <div class="grid">${timelines}</div>`,
  );
}

createServer(async (_req, res) => {
  try {
    const [schema, listed] = await Promise.all([mock<any>("/schema"), mock<Listed[]>("/claims")]);
    const wanted = listed.filter((c) => BOUNDARIES.includes(c.boundary as any) && TEST_CASES.includes(c.testCase as any));
    const claims = new Map(
      await Promise.all(wanted.map(async (c) => [`${c.boundary}/${c.testCase}`, await mock<Claim>(c.href)] as const)),
    );
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(render(schema, listed, claims));
  } catch (e) {
    res.writeHead(e instanceof Error && /HTTP|fetch/.test(e.message) ? 502 : 500, { "content-type": "text/html; charset=utf-8" });
    res.end(offline(e));
  }
}).listen(PORT, () => console.log(`Case-Struktur läuft auf http://localhost:${PORT}/ (Mock: ${MOCK})`));
