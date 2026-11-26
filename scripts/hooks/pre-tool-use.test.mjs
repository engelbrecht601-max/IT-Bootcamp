import { test } from "node:test";
import assert from "node:assert/strict";
import { adjust, check, aiPackage } from "./pre-tool-use.mjs";

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
  assert.match(reason, /keinem Arbeitsplatz/);
  assert.match(check(bash("touch packages/ui/src/x.ts"), workspace), /keinem Arbeitsplatz/);
  assert.equal(check(edit("README.md"), workspace), null);
  assert.equal(check(bash("cat packages/stage2/src/index.ts"), workspace), null);
});

test("ohne Gruppen-Arbeitsplatz (lokal) bleibt alles außer contracts/ offen", () => {
  assert.equal(check(edit("packages/stage3/src/index.ts"), none), null);
  assert.equal(check(bash("git add -A"), none), null);
});

test("am Arbeitsplatz gehört Git dem Setup: nur lesen, schreiben über pnpm sync", () => {
  for (const cmd of ["git add -A", "git add packages/stage2", "git commit -m x", "git commit -am x", "git push", "git reset --soft HEAD~1", "cd packages/stage2 && git stash", "git -C ../x merge main", "git checkout -b neu", "git worktree add ../y"]) {
    assert.match(check(bash(cmd), desk(2)) ?? "", /pnpm sync/, cmd);
  }
  for (const cmd of ["git status --short", "git diff packages/stage2", "git log --oneline -5", "git show HEAD:team.json", "pnpm sync save", "pnpm sync publish"]) {
    assert.equal(check(bash(cmd), desk(2)), null, cmd);
  }
});

test("ein Arbeitsplatz mit zusammengelegten Stages schreibt in alle seine Packages", () => {
  const merged = { tasks: [1, 2], group: "3" };
  assert.equal(check(edit("packages/stage1/src/index.ts"), merged), null);
  assert.equal(check(edit("packages/stage2/requirements.md"), merged), null);
  assert.match(check(edit("packages/stage3/src/index.ts"), merged), /packages\/stage1\/ und packages\/stage2\//);
  assert.match(check(bash("rm packages/ui/src/index.ts"), merged), /nur in/);
});

test("am Arbeitsplatz entsteht nichts außerhalb des eigenen Packages", () => {
  assert.match(check(edit("dashboard/index.html"), desk(1)), /ideen\.md/);
  assert.match(check(edit("handover.md"), desk(1)), /ideen\.md/);
  assert.equal(check(edit("/tmp/claude-1000/scratchpad/notiz.md"), desk(1)), null, "Ablage außerhalb des Repos bleibt offen");
});

test("abgeschaltete Werkzeuge: Veröffentlichen, Nachrichten zwischen Sessions, geplante Aufgaben, Web", () => {
  for (const tool of ["Artifact", "SendMessage", "ListAgents", "CronCreate", "ScheduleWakeup", "WebSearch", "WebFetch", "EnterWorktree", "mcp__Canva__create-design"]) {
    assert.match(check({ tool_name: tool, tool_input: {} }, desk(3)) ?? "", /abgeschaltet/, tool);
    assert.equal(check({ tool_name: tool, tool_input: {} }, none), null, `${tool} lokal`);
  }
  assert.equal(check({ tool_name: "Read", tool_input: { file_path: "packages/ui/src/index.ts" } }, desk(3)), null);
});

test("Subagenten: nur Test-Autor, Prüfer und Fachperson", () => {
  const agent = (subagent_type, extra = {}) => ({ tool_name: "Agent", tool_input: { subagent_type, prompt: "x", ...extra } });
  const fg = { run_in_background: false };
  for (const type of ["test-author", "verifier", "persona-stage4", "persona-ui"]) assert.equal(check(agent(type, fg), desk(4)), null, type);
  for (const type of ["general-purpose", "Explore", "", "claude"]) assert.match(check(agent(type), desk(4)) ?? "", /abgeschaltet/, type);
  // Kein Block nach run_in_background: Claude Code entfernt den Schalter, bevor der Hook ihn sieht.
  assert.equal(check(agent("verifier"), desk(4)), null);
  assert.equal(check(agent("verifier", { run_in_background: true }), desk(4)), null);
  assert.equal(adjust(agent("verifier", { run_in_background: true }), desk(4)).run_in_background, false);
  assert.deepEqual(adjust(agent("test-author"), desk(4)), { subagent_type: "test-author", prompt: "x", run_in_background: false });
  assert.equal(adjust(agent("verifier", { run_in_background: false }), desk(4)), null);
  assert.equal(adjust(agent("verifier"), admin), null);
  assert.equal(adjust(bash("ls"), desk(4)), null);
});

test("keine eigenen Server, kein npx, kein Internet", () => {
  assert.match(check(bash("python3 -m http.server 8000"), desk(5)), /pnpm vorschau/);
  assert.match(check(bash("cd packages/ui && npx getdesign@latest add sap"), desk(5)), /abgeschaltet/);
  assert.match(check(bash("curl -s https://example.com/x.js -o x.js"), desk(5)), /abgeschaltet/);
  assert.equal(check(bash("curl -s http://localhost:4000/claims"), desk(5)), null);
  assert.equal(check(bash("pnpm vorschau"), desk(5)), null);
});

test("Shell-Schreibzugriffe auf contracts/ werden blockiert, Lesen und die Skripte nicht", () => {
  assert.ok(check(bash("echo '{}' > contracts/requests/T1-CR-001.json"), none));
  assert.ok(check(bash("rm contracts/patches/T1-CR-001.json"), none));
  assert.ok(check(bash("sed -i s/a/b/ contracts/claim.base.schema.json"), none));
  assert.equal(check(bash("cat contracts/claim.schema.json"), none), null);
  assert.equal(check(bash("echo '{}' | pnpm contracts:add -"), desk(1)), null);
});

test("gefährliche Git-Befehle werden blockiert", () => {
  assert.ok(check(bash("git push --force origin workshop/gruppe3"), none));
  assert.ok(check(bash("git push -f"), desk(1)));
  assert.ok(check(bash("git reset --hard HEAD~1"), none));
  assert.ok(check(bash("git push --no-verify"), none));
  assert.equal(check(bash("git push"), none), null, "außerhalb des Workshops bleibt ein normaler Push erlaubt");
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

test("im Gruppen-Arbeitsplatz nichts unter .claude/ anlegen", () => {
  assert.match(check(edit(".claude/agents/mein-agent.md"), desk(2)), /keine KI-Agenten/);
  assert.match(check(edit(".claude/commands/x.md"), workspace), /\.claude\//);
  assert.match(check(bash("echo x > .claude/agents/a.md"), desk(1)), /\.claude\//);
  assert.equal(check(bash("cat .claude/settings.json"), desk(1)), null);
  assert.equal(check(edit(".claude/tmp/contract-draft.json"), desk(2)), null, "Ablage für Entwürfe");
  assert.equal(check(bash("cat > .claude/tmp/contract-draft.json <<'EOF'"), desk(2)), null);
  assert.equal(check(edit(".claude/agents/a.md"), none), null, "lokal bleibt .claude/ pflegbar");
  assert.equal(check(edit(".claude/agents/a.md"), admin), null);
});

test("im Gruppen-Arbeitsplatz keine KI-Pakete installieren", () => {
  for (const cmd of ["pnpm add @anthropic-ai/sdk", "pnpm --filter @bootcamp/stage2 add openai@4", "npm i langchain",
    "cd packages/stage1 && pnpm add -D ai", "pnpm add zod @anthropic-ai/claude-agent-sdk", "yarn add @langchain/core"]) {
    assert.match(check(bash(cmd), desk(1)) ?? "", /KI-Paket/, cmd);
  }
  assert.match(check(bash("pnpm add openai"), workspace) ?? "", /KI-Paket/);
  for (const cmd of ["pnpm add zod", "pnpm add -D vitest", "pnpm install", "pnpm add aimless", "pnpm add react-ai-hooks-not"]) {
    assert.equal(check(bash(cmd), desk(1)), null, cmd);
  }
  assert.equal(check(bash("pnpm add openai"), none), null, "lokal offen");
  assert.equal(check(bash("pnpm add openai"), admin), null);
  assert.equal(aiPackage("pnpm add @ai-sdk/anthropic@1.2.0"), "@ai-sdk/anthropic");
});
