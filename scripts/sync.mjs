#!/usr/bin/env node
// Sichern, Abholen und Freigeben für einen Arbeitsplatz. Ersetzt alle Git-Befehle der Teilnehmenden:
// Jede Person hat einen eigenen Arbeitsstand auf eigenem Branch, die Gruppe einen gemeinsamen Branch.
//
//   pnpm sync save ["<Nachricht>"]   eigene Packages auf dem eigenen Branch committen (läuft auch
//                                    automatisch nach jeder Antwort von Claude)
//   pnpm sync pull                   freigegebene Arbeit der anderen und neue Contract-Felder abholen
//   pnpm sync publish                geprüfte Anforderungen in den Gruppenbranch übernehmen. Vorher
//                                    läuft das Gate für die eigenen Packages. Danach ist /clear Pflicht.
//
// In den Gruppenbranch kommt nur, was verifiziert ist und dessen Tests grün sind. Deshalb sieht
// niemand die halbfertige Arbeit oder die roten Tests einer anderen Person.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TASKS } from "./lib/tasks.mjs";
import { deskPackages, mainRoot, readFlags, updateFlags, withLock } from "./lib/desks.mjs";
import { readRequirements } from "./lib/requirements.mjs";
import { ROOT, die, git, groupBranch, identityEnv, session } from "./lib/session.mjs";

export function save(desk, message, root = ROOT) {
  const paths = deskPackages(desk).map((p) => `packages/${p}`).filter((p) => existsSync(join(root, p)));
  if (!paths.length) return false;
  git(["add", "-A", "--", ...paths], { cwd: root });
  const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: root }).status !== 0;
  if (!staged) return false;
  const scope = deskPackages(desk).join(",");
  git(["commit", "--quiet", "-m", message || `wip(${scope}): autosave`], { cwd: root, env: identityEnv(desk) });
  return true;
}

export function pull(desk, root = ROOT) {
  save(desk, undefined, root);
  const branch = groupBranch(root);
  const res = spawnSync("git", ["merge", "--no-edit", "--quiet", branch], { cwd: root, encoding: "utf8", env: { ...process.env, ...identityEnv(desk) } });
  if (res.status !== 0) {
    spawnSync("git", ["merge", "--abort"], { cwd: root });
    throw new Error(`Abholen vom Gruppenstand ging nicht (${(res.stdout + res.stderr).trim().split("\n")[0]}). Bitte die Workshop-Leitung holen.`);
  }
  spawnSync(process.execPath, ["scripts/contracts-build.mjs"], { cwd: root, stdio: "ignore" });
}

/** Das Gate eines Arbeitsplatzes: Contract, Format der Anforderungen, Tests fertiger Anforderungen, Typen. */
export function gate(desk, root = ROOT) {
  const problems = [];
  const run = (label, cmd, args) => {
    const res = spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
    if (res.status !== 0) problems.push(`${label}:\n${`${res.stdout}${res.stderr}`.trim().split("\n").slice(-15).join("\n")}`);
  };
  run("Contract", process.execPath, ["scripts/contracts-build.mjs"]);
  run("Anforderungen", process.execPath, ["scripts/check-requirements.mjs"]);
  for (const task of desk.tasks) {
    const pkg = TASKS[task].pkg;
    const ready = readRequirements(root, pkg).filter((r) => r.status === "umgesetzt" || r.status === "verifiziert").map((r) => r.id);
    const src = join(root, "packages", pkg, "src");
    const hasTests = existsSync(src) && readdirSync(src, { recursive: true }).some((f) => String(f).endsWith(".test.ts"));
    if (ready.length && hasTests) {
      run(`Tests ${pkg}`, process.execPath, ["--import", "tsx", "--test", "--test-name-pattern", `\\[(${ready.join("|")})\\]`, `packages/${pkg}/src/**/*.test.ts`]);
    }
    run(`Typen ${pkg}`, "pnpm", ["--silent", "--filter", `@bootcamp/${pkg}`, "typecheck"]);
  }
  return problems;
}

export function publish(desk, root = ROOT) {
  const verified = desk.tasks.flatMap((t) => readRequirements(root, TASKS[t].pkg)).filter((r) => r.status === "verifiziert").map((r) => r.id);
  const before = new Set(readFlags(desk.slug).published);
  const fresh = verified.filter((id) => !before.has(id));
  if (!fresh.length) throw new Error("Es gibt keine neu verifizierte Anforderung, die freigegeben werden könnte.");
  const problems = gate(desk, root);
  if (problems.length) throw new Error(`Das Gate ist rot, deshalb noch nicht freigegeben.\n\n${problems.join("\n\n")}`);

  save(desk, `feat(${deskPackages(desk).join(",")}): ${fresh.join(", ")} verified`, root);
  pull(desk, root);
  const main = mainRoot(root);
  const branch = git(["branch", "--show-current"], { cwd: root });
  withLock("merge", () => {
    const res = spawnSync("git", ["merge", "--no-edit", "--quiet", branch], { cwd: main, encoding: "utf8", env: { ...process.env, ...identityEnv(desk) } });
    if (res.status !== 0) {
      spawnSync("git", ["merge", "--abort"], { cwd: main });
      throw new Error(`Freigeben in den Gruppenstand ging nicht (${(res.stdout + res.stderr).trim().split("\n")[0]}). Bitte die Workshop-Leitung holen.`);
    }
  });
  updateFlags(desk.slug, { published: [...new Set([...before, ...verified])], mustClear: true, lastProgressAt: new Date().toISOString() });
  return fresh;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  const { desk } = session();
  if (!desk) die("Diese Sitzung gehört zu keinem Arbeitsplatz. Neues Terminal öffnen und anmelden.");
  try {
    if (cmd === "save") console.log(save(desk, rest.join(" ")) ? "✓ gesichert" : "✓ nichts Neues zu sichern");
    else if (cmd === "pull") {
      pull(desk);
      console.log("✓ auf dem Stand der Gruppe");
    } else if (cmd === "publish") {
      const ids = publish(desk);
      console.log(`✓ ${ids.join(", ")} gesichert und für die Gruppe freigegeben.\nJETZT: Die Person tippt /clear und danach /weiter. Vorher geht nichts anderes.`);
    } else die("Aufruf: pnpm sync save | pull | publish", 64);
  } catch (err) {
    die(err.message);
  }
}
