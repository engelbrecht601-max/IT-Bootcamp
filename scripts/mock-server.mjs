#!/usr/bin/env node
// Liefert der UI-Gruppe die Musterakten und den gebauten Contract über HTTP, ab Minute eins.
// Aufruf: pnpm mock-server [--port 4000]
//
//   GET /claims                      Übersicht aller Akten (Grenze, Testfall, Stage)
//   GET /claims/<grenze>/<testfall>  eine Akte, z. B. /claims/2-3/grenzfall
//   GET /claims/<claimId>            neuester Stand eines Vorgangs, z. B. /claims/SCH-2026-00101
//   GET /schema                      gebauter Contract (contracts/claim.schema.json)
//
// Dateien werden bei jeder Anfrage neu gelesen; neue Fixtures erscheinen ohne Neustart.
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { loadFixtures } from "./lib/fixtures.mjs";
import { BUILT_SCHEMA } from "./lib/contract.mjs";

const portFlag = process.argv.indexOf("--port");
const PORT = Number(portFlag > -1 ? process.argv[portFlag + 1] : process.env.MOCK_PORT ?? 4000);

export function handle(method, url) {
  if (method === "OPTIONS") return [204, null];
  if (method !== "GET") return [405, { error: "Der Mock-Server ist schreibgeschützt." }];
  const path = new URL(url, "http://localhost").pathname.replace(/\/+$/, "") || "/";
  const fixtures = loadFixtures();

  if (path === "/" || path === "/claims") {
    return [200, fixtures.map(({ boundary, testCase, claim }) => ({
      claimId: claim.claimId,
      boundary,
      testCase,
      currentStage: claim.meta.currentStage,
      href: `/claims/${boundary}/${testCase}`,
    }))];
  }
  if (path === "/schema") {
    if (!existsSync(BUILT_SCHEMA)) return [503, { error: "Contract noch nicht gebaut: pnpm contracts:build" }];
    return [200, JSON.parse(readFileSync(BUILT_SCHEMA, "utf8"))];
  }
  const byBoundary = /^\/claims\/([^/]+)\/([^/]+)$/.exec(path);
  if (byBoundary) {
    const hit = fixtures.find((f) => f.boundary === byBoundary[1] && f.testCase === byBoundary[2]);
    return hit ? [200, hit.claim] : [404, { error: `Keine Akte ${byBoundary[1]}/${byBoundary[2]}` }];
  }
  const byId = /^\/claims\/(SCH-[0-9]{4}-[0-9]{5})$/.exec(path);
  if (byId) {
    const hits = fixtures.filter((f) => f.claim.claimId === byId[1]);
    const latest = hits.sort((a, b) => a.claim.trace.length - b.claim.trace.length).at(-1);
    return latest ? [200, latest.claim] : [404, { error: `Kein Vorgang ${byId[1]}` }];
  }
  return [404, { error: "Unbekannter Pfad. Siehe GET /claims." }];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer((req, res) => {
    let status, body;
    try {
      [status, body] = handle(req.method, req.url);
    } catch (err) {
      [status, body] = [500, { error: err.message }];
    }
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end(body === null ? undefined : JSON.stringify(body, null, 2));
    console.log(`${req.method} ${req.url} → ${status}`);
  }).listen(PORT, () => console.log(`Mock-Server läuft auf http://localhost:${PORT}/claims`));
}
