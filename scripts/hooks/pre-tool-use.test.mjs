import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "./pre-tool-use.mjs";

// Jeder Test gibt seinen Kontext explizit mit; die Umgebung eines Arbeitsplatzes darf ihn nicht färben.
const none = {};
const desk = (task) => ({ task: String(task), group: "3" });
const workspace = { group: "3" };
const admin = { admin: true, group: "3" };

const edit = (file_path) => ({ tool_name: "Edit", tool_input: { file_path } });
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

test("Edits in contracts/ werden blockiert", () => {
  assert.ok(check(edit("contracts/claim.base.schema.json"), none));
  assert.ok(check(edit("contracts/patches/T1-CR-001.json"), desk(1)));
  assert.equal(check(edit("packages/stage1/src/index.ts"), none), null);
});

test("am Schreibtisch nur das Package des eigenen Tasks", () => {
  assert.equal(check(edit("packages/stage2/src/index.ts"), desk(2)), null);
  assert.ok(check(edit("packages/stage3/src/index.ts"), desk(2)));
  assert.ok(check(edit("packages/ui/src/index.ts"), desk(2)));
  assert.equal(check(edit("packages/ui/src/index.ts"), desk(5)), null);
  assert.ok(check(bash("echo x > packages/stage1/src/a.ts"), desk(2)));
  assert.equal(check(bash("echo x > packages/stage2/src/a.ts"), desk(2)), null);
  assert.equal(check(bash("cat packages/stage1/src/index.ts"), desk(2)), null);
});

test("im Gruppen-Arbeitsplatz ohne Schreibtisch kein Schreiben in packages/", () => {
  const reason = check(edit("packages/stage2/src/index.ts"), workspace);
  assert.match(reason, /pnpm desk/);
  assert.match(check(bash("touch packages/ui/src/x.ts"), workspace), /pnpm desk/);
  assert.equal(check(edit("README.md"), workspace), null);
  assert.equal(check(bash("cat packages/stage2/src/index.ts"), workspace), null);
});

test("ohne Gruppen-Arbeitsplatz (lokal) bleibt alles außer contracts/ offen", () => {
  assert.equal(check(edit("packages/stage3/src/index.ts"), none), null);
  assert.equal(check(bash("git add -A"), none), null);
});

test("im geteilten Checkout kein git add -A und kein commit -a", () => {
  for (const cmd of ["git add -A", "git add .", "git add --all", "git add -u", "git commit -a -m x", "git commit -am x", "git add packages/stage2 && git commit --all"]) {
    assert.match(check(bash(cmd), desk(2)) ?? "", /eigene Dateien/, cmd);
  }
  assert.equal(check(bash("git add packages/stage2"), desk(2)), null);
  assert.equal(check(bash("git add ./packages/stage2/src/a.ts && git commit -m 'feat(stage2): x'"), desk(2)), null);
});

test("Shell-Schreibzugriffe auf contracts/ werden blockiert, Lesen und die Skripte nicht", () => {
  assert.ok(check(bash("echo '{}' > contracts/requests/T1-CR-001.json"), none));
  assert.ok(check(bash("rm contracts/patches/T1-CR-001.json"), none));
  assert.ok(check(bash("sed -i s/a/b/ contracts/claim.base.schema.json"), none));
  assert.equal(check(bash("cat contracts/claim.schema.json"), none), null);
  assert.equal(check(bash("pnpm contracts:decide T1-CR-001"), desk(1)), null);
});

test("gefährliche Git-Befehle werden blockiert", () => {
  assert.ok(check(bash("git push --force origin workshop/gruppe3"), none));
  assert.ok(check(bash("git push -f"), desk(1)));
  assert.ok(check(bash("git reset --hard HEAD~1"), none));
  assert.ok(check(bash("git push --no-verify"), none));
  assert.equal(check(bash("git push"), desk(1)), null);
});

test("Heredoc-Inhalte und Lesezugriffe lösen keinen Alarm aus", () => {
  assert.equal(check(bash("python3 - <<'EOF'\nprint('a > b in contracts/x')\nEOF"), none), null);
  assert.equal(check(bash("grep -r foo contracts/ > /tmp/out.txt"), none), null);
  assert.equal(check(bash("cat <<'EOF' > README.md\nnie git push --force\nEOF"), none), null);
  assert.ok(check(bash("cd x && cp a.json ./contracts/patches/"), none));
});

test("BOOTCAMP_ADMIN hebt den Schreibschutz auf, aber nicht die Git-Regeln", () => {
  assert.equal(check(edit("contracts/claim.base.schema.json"), admin), null);
  assert.equal(check(edit("packages/stage3/src/index.ts"), { ...admin, task: "2" }), null);
  assert.ok(check(bash("git reset --hard"), admin));
});
