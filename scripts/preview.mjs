#!/usr/bin/env node
// Vorschau der Oberfläche im Browser: pnpm vorschau
// Zeigt jede Musterakte so, wie packages/ui sie darstellt (run(claim) liefert HTML), und, falls es
// den Task gibt, das Meldeformular aus packages/intake. Niemand muss einen eigenen Server bauen.
// Jeder Arbeitsplatz hat seinen eigenen Port (5173 + Nummer des Arbeitsplatzes), damit sich die
// Vorschauen nicht in die Quere kommen. Im Workshop öffnet ihr https://gruppe<N>.<Domain>/proxy/<Port>/.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadFixtures } from "./lib/fixtures.mjs";
import { ROOT, session } from "./lib/session.mjs";

const { desk } = session();
const port = Number(process.env.PORT ?? 5173 + (desk?.id ?? 0));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const page = (title, body) =>
  `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>` +
  `<body style="font-family:system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`;
const render = (...args) => spawnSync(process.execPath, ["--import", "tsx", "scripts/lib/render-child.mjs", ...args], { cwd: ROOT, encoding: "utf8" });
const notYet = (res) => `<p style="background:#fff3cd;padding:1rem;border-radius:.5rem">Noch nichts zu sehen: ${esc(res.stderr || "unbekannter Fehler")}</p>`;
const hasIntake = existsSync(join(ROOT, "packages/intake/src/index.ts"));

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  const send = (html, status = 200) => res.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(html);

  if (parts[0] === "akte" && parts.length === 3) {
    const file = join(ROOT, "fixtures", parts[1].replace(/[^a-z0-9-]/g, ""), `${parts[2].replace(/[^a-z0-9-]/g, "")}.json`);
    if (!existsSync(file)) return send(page("Nicht gefunden", "<p>Diese Akte gibt es nicht.</p>"), 404);
    const out = render("ui", file);
    return send(page(`${parts[2]} (${parts[1]})`, `<p><a href="../../">← alle Akten</a></p>${out.status === 0 ? out.stdout : notYet(out)}`));
  }
  if (parts[0] === "formular" && hasIntake) {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const out = render("submit", JSON.stringify(Object.fromEntries(new URLSearchParams(body))));
        send(page("Meldung", `<p><a href="./formular">← zum Formular</a></p>${out.status === 0 ? `<h2>So kommt die Meldung bei der Schadenaufnahme an</h2><pre>${esc(out.stdout)}</pre>` : notYet(out)}`));
      });
      return;
    }
    const out = render("form");
    return send(page("Meldeformular", `<p><a href="./">← Übersicht</a></p>${out.status === 0 ? out.stdout : notYet(out)}`));
  }
  const fixtures = loadFixtures(join(ROOT, "fixtures"));
  const rows = fixtures.map((f) => `<li><a href="akte/${f.boundary}/${f.testCase}">${esc(f.testCase)}</a> · Zustand ${esc(f.boundary)}</li>`).join("");
  send(page("Vorschau", `<h1>Vorschau</h1><p>Jede Musterakte in jedem Zustand, so wie die Oberfläche sie zeigt.</p><ul>${rows}</ul>${hasIntake ? '<p><a href="formular">Meldeformular</a></p>' : ""}`));
});

const where = process.env.BOOTCAMP_GROUP && process.env.DOMAIN ? `https://gruppe${process.env.BOOTCAMP_GROUP}.${process.env.DOMAIN}/proxy/${port}/` : `http://localhost:${port}/`;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`✓ Die Vorschau läuft schon: ${where}`);
    process.exit(0);
  }
  throw err;
});
server.listen(port, () => console.log(`✓ Vorschau läuft: ${where}\n  Seite im Browser neu laden zeigt immer den aktuellen Stand. Beenden mit Strg+C.`));
