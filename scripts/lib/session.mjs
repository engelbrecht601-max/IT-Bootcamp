// Was ein Skript über die laufende Session wissen muss: Arbeitsstand, Gruppe, Arbeitsplatz, Stand.
import { execFileSync } from "node:child_process";
import { currentDesk, mainRoot, readFlags, readState, readWishes, wishesFor } from "./desks.mjs";
import { gitIdentity } from "./tasks.mjs";
import { nextStep, packageState, standLine } from "./steps.mjs";

/** Wurzel des Arbeitsstands, in dem dieses Skript liegt. */
export const ROOT = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");

export function session(env = process.env) {
  let state;
  try {
    state = readState();
  } catch {
    state = undefined;
  }
  const desk = state ? currentDesk(state, env, ROOT) : undefined;
  return { root: ROOT, state, desk, admin: env.BOOTCAMP_ADMIN === "1" };
}

/** Stand und nächster Schritt eines Arbeitsplatzes, gelesen aus seinem Arbeitsstand. */
export function deskStatus(desk, root = desk.worktree ?? ROOT) {
  const flags = readFlags(desk.slug);
  const wishes = wishesFor(desk, readWishes());
  const packages = desk.tasks.map((t) => packageState(root, t));
  const next = nextStep({ packages, flags, wishes: wishes.incoming });
  return { flags, wishes, packages, next, line: standLine(desk, next) };
}

export function git(args, { cwd = ROOT, env = {}, quiet = false } = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", quiet ? "ignore" : "pipe"],
    env: { ...process.env, ...env },
  }).trim();
}

/** Git-Identität eines Arbeitsplatzes als Umgebungsvariablen. */
export function identityEnv(desk, group = process.env.BOOTCAMP_GROUP) {
  const id = gitIdentity(desk.persons.join(" & "), group, process.env.DOMAIN || "localhost");
  return { GIT_AUTHOR_NAME: id.name, GIT_AUTHOR_EMAIL: id.email, GIT_COMMITTER_NAME: id.name, GIT_COMMITTER_EMAIL: id.email };
}

export function groupBranch(root = ROOT) {
  try {
    return git(["config", "--get", "bootcamp.branch"], { cwd: root, quiet: true }) || git(["branch", "--show-current"], { cwd: mainRoot(root) });
  } catch {
    return git(["branch", "--show-current"], { cwd: mainRoot(root) });
  }
}

export function die(msg, code = 1) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}
