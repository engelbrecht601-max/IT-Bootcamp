// Anmeldung und Start einer Gruppe. Jede Person gibt nur ihren Vornamen ein. Wenn alle da sind,
// bestätigt eine Person "start": Erst dann steht die Kopfzahl fest, die Aufteilung wird berechnet,
// jede Person bekommt ihren Arbeitsstand, und die Musterakten werden passend bereitgelegt.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitIdentity, writeTeam } from "./tasks.mjs";
import { assignDesks, cleanName, desksDir, mainRoot, nameProblem, readState, slug, teamFromDesks, withLock, writeState } from "./desks.mjs";

const same = (a, b) => cleanName(a).toLowerCase() === cleanName(b).toLowerCase();

/** Ist der Name schon in der Anmeldeliste? Gibt den gespeicherten Namen zurück. */
export function registered(name, dir) {
  return readState(dir).lobby.find((p) => same(p.name, name))?.name;
}

/**
 * Trägt einen Namen in die Anmeldeliste ein. Gibt den gespeicherten Namen zurück.
 * Steht der Name schon in der Liste, gilt das als dieselbe Person in einem weiteren Terminal.
 * Ob das stimmt, fragt scripts/start.mjs vorher nach (registered).
 */
export function register(name, dir) {
  const clean = cleanName(name);
  const problem = nameProblem(clean);
  if (problem) throw new Error(problem);
  return withLock("state", () => {
    const state = readState(dir);
    if (state.started) throw new Error("Die Gruppe ist schon gestartet.");
    const known = state.lobby.find((p) => same(p.name, clean));
    if (known) return known.name;
    state.lobby.push({ name: clean, at: new Date().toISOString() });
    writeState(state, dir);
    return clean;
  }, dir);
}

export function unregister(name, dir) {
  withLock("state", () => {
    const state = readState(dir);
    if (state.started) return;
    state.lobby = state.lobby.filter((p) => !same(p.name, name));
    writeState(state, dir);
  }, dir);
}

/** Arbeitsplatz einer Person nach dem Start. */
export function deskOf(state, name) {
  return state.desks.find((d) => d.persons.some((p) => same(p, name)));
}

/** Setzt eine Person nachträglich als Tandem an einen bestehenden Arbeitsplatz. */
export function joinDesk(name, deskSlug, dir) {
  return withLock("state", () => {
    const state = readState(dir);
    const desk = state.desks.find((d) => d.slug === deskSlug);
    if (!desk) throw new Error("Diesen Arbeitsplatz gibt es nicht.");
    if (!desk.persons.some((p) => same(p, name))) desk.persons.push(cleanName(name));
    writeState(state, dir);
    return desk;
  }, dir);
}

/**
 * Startet die Gruppe: Aufteilung berechnen, team.json committen, pro Arbeitsplatz einen Branch und
 * einen Arbeitsstand anlegen. Läuft genau einmal; ein zweiter Aufruf gibt den bestehenden Stand zurück.
 */
export function startGroup({ root, group = process.env.BOOTCAMP_GROUP, dir, desksRoot = desksDir() } = {}) {
  const main = mainRoot(root);
  return withLock("state", () => {
    const state = readState(dir);
    if (state.started) return state;
    if (!state.lobby.length) throw new Error("Es ist noch niemand angemeldet.");
    const desks = assignDesks(state.lobby.map((p) => p.name));
    const git = (args, env = {}) => execFileSync("git", args, { cwd: main, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } }).trim();

    // team.json zuerst, damit jeder Arbeitsstand die Aufteilung schon enthält.
    writeTeam(teamFromDesks(desks, group), join(main, "team.json"));
    const id = gitIdentity(group ? `Gruppe ${group}` : "Gruppe", undefined, process.env.DOMAIN || "localhost");
    const ident = { GIT_AUTHOR_NAME: id.name, GIT_AUTHOR_EMAIL: id.email, GIT_COMMITTER_NAME: id.name, GIT_COMMITTER_EMAIL: id.email };
    git(["add", "--", "team.json"]);
    if (spawnSync("git", ["diff", "--cached", "--quiet", "--", "team.json"], { cwd: main }).status !== 0) {
      git(["commit", "--quiet", "--only", "-m", `chore(team): ${desks.length} desks for ${state.lobby.length} people`, "--", "team.json"], ident);
    }

    mkdirSync(desksRoot, { recursive: true });
    for (const desk of desks) {
      desk.branch = `desk/gruppe${group ?? 0}/${desk.slug}`;
      desk.worktree = join(desksRoot, desk.slug);
      if (existsSync(desk.worktree)) continue;
      const exists = spawnSync("git", ["show-ref", "--verify", "--quiet", `refs/heads/${desk.branch}`], { cwd: main }).status === 0;
      git(exists ? ["worktree", "add", "--quiet", desk.worktree, desk.branch] : ["worktree", "add", "--quiet", "-b", desk.branch, desk.worktree, "HEAD"]);
    }
    const next = { ...state, group: group ? Number(group) : undefined, started: new Date().toISOString(), desks };
    writeState(next, dir);
    return next;
  }, dir);
}

/** Macht einen Arbeitsstand arbeitsfähig: Abhängigkeiten, Einstellungen, Contract, Musterakten. Beliebig oft aufrufbar. */
export function prepareDesk(desk, { group = process.env.BOOTCAMP_GROUP, log = () => {} } = {}) {
  const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: desk.worktree, encoding: "utf8", ...opts });
  if (!existsSync(join(desk.worktree, "node_modules"))) {
    log("Arbeitsplatz wird eingerichtet (einmalig, etwa eine halbe Minute) …");
    if (run("pnpm", ["install", "--frozen-lockfile", "--offline"]).status !== 0) {
      const res = run("pnpm", ["install", "--frozen-lockfile"]);
      if (res.status !== 0) throw new Error(`Abhängigkeiten ließen sich nicht installieren:\n${res.stderr}`);
    }
  }
  const settings = join(desk.worktree, ".claude", "settings.local.json");
  if (!existsSync(settings)) run(process.execPath, ["scripts/group-setup.mjs", String(group ?? 1), "--force"]);
  run(process.execPath, ["scripts/contracts-build.mjs"]);
  run(process.execPath, ["scripts/akten.mjs"], { env: { ...process.env, BOOTCAMP_DESK: desk.slug } });
  run(process.execPath, ["scripts/seed-claude.mjs", desk.worktree]);
  return desk;
}

export { slug, writeFileSync };
