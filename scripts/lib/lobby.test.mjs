import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState } from "./desks.mjs";
import { deskOf, joinDesk, register, startGroup, unregister } from "./lobby.mjs";
import { save } from "../sync.mjs";

function repo() {
  const base = mkdtempSync(join(tmpdir(), "bootcamp-lobby-"));
  const root = join(base, "workspace");
  mkdirSync(join(root, "packages/stage1/src"), { recursive: true });
  writeFileSync(join(root, "packages/stage1/src/index.ts"), "export {};\n");
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init", "-q", "-b", "workshop/gruppe7");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@localhost");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, git, dir: join(base, "state"), desksRoot: join(base, "desks") };
}

test("anmelden: jeder Name einmal, Groß- und Kleinschreibung egal, abmelden geht vor dem Start", () => {
  const { dir } = repo();
  assert.equal(register("  Anna ", dir), "Anna");
  assert.equal(register("anna", dir), "Anna");
  register("Ben", dir);
  unregister("BEN", dir);
  assert.deepEqual(readState(dir).lobby.map((p) => p.name), ["Anna"]);
  assert.throws(() => register("   ", dir), /Vornamen/);
});

test("start: Aufteilung nach Kopfzahl, team.json im Gruppenbranch, ein Arbeitsstand pro Person", () => {
  const { root, git, dir, desksRoot } = repo();
  assert.throws(() => startGroup({ root, group: "7", dir, desksRoot }), /niemand angemeldet/);
  for (const n of ["Anna", "Ben", "Cem"]) register(n, dir);
  const state = startGroup({ root, group: "7", dir, desksRoot });

  assert.deepEqual(state.desks.map((d) => d.tasks), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "team.json"), "utf8")), { group: 7, tasks: { 1: "Anna", 2: "Anna", 3: "Ben", 4: "Ben", 5: "Cem" } });
  assert.match(git("log", "--oneline", "-1"), /chore\(team\): 3 desks for 3 people/);
  for (const desk of state.desks) {
    assert.equal(desk.branch, `desk/gruppe7/${desk.slug}`);
    assert.ok(existsSync(join(desk.worktree, "team.json")), "der Arbeitsstand enthält die Aufteilung schon");
    assert.equal(execFileSync("git", ["branch", "--show-current"], { cwd: desk.worktree, encoding: "utf8" }).trim(), desk.branch);
  }
  assert.equal(git("status", "--porcelain"), "", "der Haupt-Checkout bleibt sauber");

  // Ein zweiter Start ändert nichts mehr; Nachzügler setzen sich als Tandem dazu.
  assert.equal(startGroup({ root, group: "7", dir, desksRoot }).started, state.started);
  assert.throws(() => register("Dana", dir), /schon gestartet/);
  assert.equal(deskOf(state, "ben").slug, "ben");
  assert.deepEqual(joinDesk("Dana", "cem", dir).persons, ["Cem", "Dana"]);
  assert.equal(deskOf(readState(dir), "dana").slug, "cem");
});

test("sichern: nur die eigenen Packages landen auf dem eigenen Branch, mit dem Namen der Person", () => {
  const { root, dir, desksRoot } = repo();
  register("Anna", dir);
  register("Ben", dir);
  const [anna] = startGroup({ root, group: "7", dir, desksRoot }).desks;
  assert.equal(save(anna, undefined, anna.worktree), false, "nichts geändert, nichts zu sichern");
  writeFileSync(join(anna.worktree, "packages/stage1/src/index.ts"), "export const x = 1;\n");
  mkdirSync(join(anna.worktree, "packages/ui"), { recursive: true });
  writeFileSync(join(anna.worktree, "packages/ui/fremd.txt"), "gehört Ben\n");
  assert.equal(save(anna, undefined, anna.worktree), true);
  const log = execFileSync("git", ["log", "-1", "--format=%an|%s", "--name-only"], { cwd: anna.worktree, encoding: "utf8" });
  assert.match(log, /^Anna/);
  assert.match(log, /packages\/stage1\/src\/index\.ts/);
  assert.doesNotMatch(log, /fremd\.txt/);
  assert.equal(execFileSync("git", ["log", "--oneline", "workshop/gruppe7..HEAD"], { cwd: anna.worktree, encoding: "utf8" }).trim().split("\n").length, 1, "der Gruppenbranch bekommt davon nichts mit");
});
