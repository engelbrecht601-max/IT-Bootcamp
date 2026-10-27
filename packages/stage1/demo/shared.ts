// Gemeinsame Bausteine für die beiden Ansichten (mvp.ts, struktur.ts): Styles, HTML-Rahmen,
// Zugriff auf den Mock-Server. Beide Apps lesen ihre Daten dort und nie aus dem Dateisystem,
// damit sie dasselbe sehen wie Gruppe 5 und die Integration.

export const MOCK = process.env.MOCK_URL ?? "http://localhost:4000";

/** Holt eine Ressource vom Mock-Server (`/claims`, `/claims/<grenze>/<fall>`, `/schema`). */
export async function mock<T>(path: string): Promise<T> {
  const res = await fetch(`${MOCK}${path}`);
  if (!res.ok) throw new Error(`GET ${MOCK}${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const esc = (value: unknown): string =>
  String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const json = (value: unknown): string => esc(JSON.stringify(value, null, 2));

export type Tone = "ok" | "warn" | "bad" | "neutral";

export const pill = (text: string, tone: Tone = "neutral"): string =>
  `<span class="pill ${tone}">${esc(text)}</span>`;

const CSS = `
  :root { --bg:#f6f5f2; --card:#fff; --ink:#1d1d1b; --muted:#6b6a66; --line:#e3e1db; --ok:#1f7a4d; --okbg:#e5f3ec;
          --bad:#b3261e; --badbg:#fbe9e7; --warn:#8a5a00; --warnbg:#fdf1d8; --accent:#2f4f8f; --accentbg:#e8edf7; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 system-ui, sans-serif; padding:24px 16px 56px; }
  main { max-width:1180px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  h2 { font-size:16px; margin:30px 0 4px; }
  h3 { font-size:15px; margin:0 0 6px; }
  p.sub { color:var(--muted); margin:0 0 18px; }
  p.hint { color:var(--muted); margin:0 0 10px; }
  code { font-family:ui-monospace, monospace; font-size:.92em; background:#eceae4; border-radius:4px; padding:1px 4px; }
  pre { margin:0; font:12px/1.45 ui-monospace, monospace; background:#fbfaf8; border:1px solid var(--line);
        border-radius:6px; padding:8px; overflow:auto; max-height:320px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:14px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; min-width:0; }
  .card > h3 { display:flex; justify-content:space-between; gap:8px; align-items:center; }
  .pill { font-size:11px; padding:2px 8px; border-radius:99px; font-weight:600; white-space:nowrap; display:inline-block; }
  .ok { background:var(--okbg); color:var(--ok); } .bad { background:var(--badbg); color:var(--bad); }
  .warn { background:var(--warnbg); color:var(--warn); } .neutral { background:#eceae4; color:var(--muted); }
  .accent { background:var(--accentbg); color:var(--accent); }
  .chips { display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; }
  table { border-collapse:collapse; width:100%; font-size:13px; background:var(--card); }
  th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-weight:600; white-space:nowrap; }
  tr:last-child td { border-bottom:none; }
  .scroll { overflow-x:auto; border:1px solid var(--line); border-radius:10px; }
  .muted { color:var(--muted); } .mono { font-family:ui-monospace, monospace; font-size:12px; }
  .y { color:var(--ok); font-weight:600; } .x { color:var(--bad); font-weight:600; }
  details summary { cursor:pointer; color:var(--accent); margin:8px 0 4px; }
  dl.kv { display:grid; grid-template-columns:auto 1fr; gap:2px 10px; margin:0; font-size:13px; }
  dl.kv dt { color:var(--muted); } dl.kv dd { margin:0; }
  .flow { display:flex; gap:6px; flex-wrap:wrap; align-items:stretch; margin:10px 0 4px; }
  .flow .arrow { align-self:center; color:var(--muted); }
  .err { background:var(--badbg); border:1px solid var(--bad); color:var(--bad); border-radius:10px; padding:14px; }
`;

/** Vollständige Seite. Alle Links relativ, damit es auch hinter dem code-server-Proxy läuft. */
export function page(title: string, sub: string, body: string): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body><main>
<h1>${esc(title)}</h1>
<p class="sub">${sub}</p>
${body}
</main></body>
</html>`;
}

/** Erklärt, wenn der Mock-Server nicht antwortet, statt eine leere Seite zu zeigen. */
export const offline = (error: unknown): string =>
  page(
    "Mock-Server nicht erreichbar",
    `Diese Ansicht liest alles von <code>${esc(MOCK)}</code>.`,
    `<div class="err"><b>${esc(error instanceof Error ? error.message : error)}</b>
     <p>Start im Repo-Root: <code>pnpm mock-server</code>. Anderer Port: <code>MOCK_URL=http://localhost:4000</code> setzen.</p></div>`,
  );
