import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "./pre-tool-use.mjs";

const edit = (file_path) => ({ tool_name: "Edit", tool_input: { file_path } });
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

test("Edits in contracts/ werden blockiert", () => {
  assert.ok(check(edit("contracts/claim.base.schema.json")));
  assert.ok(check(edit("contracts/patches/G1-CR-001.json")));
  assert.equal(check(edit("packages/stage1/src/index.ts")), null);
});

test("mit BOOTCAMP_GROUP nur das eigene Package", () => {
  assert.equal(check(edit("packages/stage2/src/index.ts"), "2"), null);
  assert.ok(check(edit("packages/stage3/src/index.ts"), "2"));
  assert.ok(check(bash("echo x > packages/stage1/src/a.ts"), "2"));
  assert.equal(check(bash("cat packages/stage1/src/index.ts"), "2"), null);
});

test("Shell-Schreibzugriffe auf contracts/ werden blockiert, Lesen und die Skripte nicht", () => {
  assert.ok(check(bash("echo '{}' > contracts/requests/G1-CR-001.json")));
  assert.ok(check(bash("rm contracts/patches/G1-CR-001.json")));
  assert.ok(check(bash("sed -i s/a/b/ contracts/claim.base.schema.json")));
  assert.equal(check(bash("cat contracts/claim.schema.json")), null);
  assert.equal(check(bash("pnpm contracts:decide G1-CR-001")), null);
});

test("gefährliche Git-Befehle werden blockiert", () => {
  assert.ok(check(bash("git push --force origin main")));
  assert.ok(check(bash("git push -f")));
  assert.ok(check(bash("git reset --hard HEAD~1")));
  assert.ok(check(bash("git push --no-verify")));
  assert.equal(check(bash("git push origin main")), null);
});

test("Heredoc-Inhalte und Lesezugriffe lösen keinen Alarm aus", () => {
  assert.equal(check(bash("python3 - <<'EOF'\nprint('a > b in contracts/x')\nEOF")), null);
  assert.equal(check(bash("grep -r foo contracts/ > /tmp/out.txt")), null);
  assert.equal(check(bash("cat <<'EOF' > README.md\nnie git push --force\nEOF")), null);
  assert.ok(check(bash("cd x && cp a.json ./contracts/patches/")));
});

test("BOOTCAMP_ADMIN hebt den Schreibschutz auf, aber nicht die Git-Regeln", () => {
  assert.equal(check(edit("contracts/claim.base.schema.json"), undefined, true), null);
  assert.equal(check(edit("packages/stage3/src/index.ts"), "2", true), null);
  assert.ok(check(bash("git reset --hard"), undefined, true));
});
