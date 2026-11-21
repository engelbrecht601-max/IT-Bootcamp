#!/usr/bin/env node
// Der Schreibtisch einer Person: Task übernehmen und Claude Code für genau diesen Task starten.
//
//   pnpm desk                    zeigt, wer in der Gruppe welchen Task hat
//   pnpm desk <1–5> <Vorname>    trägt euch in team.json ein (einmal am Anfang) und startet Claude Code
//   pnpm desk <1–5>              startet Claude Code für einen schon eingetragenen Task
//   pnpm desk <1–5> <Name> --neu übernimmt einen Task, der schon jemand anderem gehört (nur nach Absprache)
//   --kein-start                 nur eintragen, Claude Code nicht starten
//
// Die Session bekommt BOOTCAMP_TASK (der Hook lässt dann nur Schreibzugriffe auf das eigene Package zu)
// und eure Git-Identität, damit jeder Commit zeigt, wer ihn gemacht hat. Jede Person öffnet dafür
// ein eigenes Terminal; fünf Sessions laufen parallel im selben Checkout.
import { spawnSync, execFileSync } from "node:child_process";
import { TASKS, TEAM_FILE, ROOT, taskNumber, readTeam, writeTeam, emptyTeam, assign, gitIdentity, activeTasks, countWord } from "./lib/tasks.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [taskArg, ...nameParts] = args.filter((a) => !a.startsWith("--"));
const group = process.env.BOOTCAMP_GROUP;
const die = (msg, code = 1) => {
  console.error(`✗ ${msg}`);
  process.exit(code);
};

let team = readTeam() ?? emptyTeam(group);

if (!taskArg) {
  printTeam(team);
  process.exit(0);
}

const active = activeTasks();
const task = taskNumber(taskArg);
if (!task) die(`Task muss 1 bis 5 sein. Aufruf: pnpm desk <1–5> <Vorname>`, 64);
if (!active.includes(task)) die(`Task ${task} (${TASKS[task].name}) gibt es in eurer Gruppe nicht. Eure Tasks: ${active.join(", ")}.`, 64);
const name = nameParts.join(" ");

if (name) {
  const before = team.tasks[task];
  try {
    team = assign(team, task, name, { force: flags.has("--neu") });
  } catch (err) {
    die(err.message);
  }
  if (before !== team.tasks[task]) {
    writeTeam(team);
    commitTeam(task, team.tasks[task]);
    console.log(`✓ Task ${task} (${TASKS[task].name}) gehört jetzt ${team.tasks[task]}.`);
  }
} else if (!team.tasks[task]) {
  die(`Task ${task} ist noch niemandem zugeordnet. Erst eintragen: pnpm desk ${task} <Vorname>`);
}

if (flags.has("--kein-start")) process.exit(0);

const person = team.tasks[task];
const { pkg, name: title } = TASKS[task];
const id = gitIdentity(person, group, process.env.DOMAIN || "localhost");
console.log(`\nSchreibtisch von ${person}: Task ${task} · ${title} · packages/${pkg}/`);
console.log(`Ihr schreibt nur in packages/${pkg}/. Beenden mit /exit.\n`);

const res = spawnSync(
  "claude",
  [
    "--append-system-prompt",
    `Du arbeitest mit ${person} an Task ${task} (${title}). Eigenes Package: packages/${pkg}/, ` +
      `Anforderungen mit IDs T${task}-REQ-NNN, Fachperson über /interview ${task}. ` +
      `Lies zuerst packages/${pkg}/CLAUDE.md. Die anderen ${countWord(active.length - 1)} Tasks bauen andere Personen derselben Gruppe parallel im selben Checkout: ` +
      `fremde Packages nur lesen, beim Commit nur eigene Dateien stagen (git add packages/${pkg}).`,
  ],
  {
    stdio: "inherit",
    cwd: ROOT,
    env: {
      ...process.env,
      BOOTCAMP_TASK: String(task),
      BOOTCAMP_PERSON: person,
      GIT_AUTHOR_NAME: id.name,
      GIT_AUTHOR_EMAIL: id.email,
      GIT_COMMITTER_NAME: id.name,
      GIT_COMMITTER_EMAIL: id.email,
    },
  },
);
if (res.error) die(`Claude Code ließ sich nicht starten: ${res.error.message}`);
process.exit(res.status ?? 0);

function printTeam(t) {
  console.log(group ? `Team Gruppe ${group}` : "Team");
  for (const [n, { pkg, name }] of Object.entries(TASKS)) {
    if (!activeTasks().includes(Number(n))) continue;
    console.log(`  Task ${n}  ${name.padEnd(17)} packages/${pkg.padEnd(7)} ${t.tasks[n] ?? "– frei –"}`);
  }
  const free = activeTasks().filter((n) => !t.tasks[n]);
  console.log(free.length ? `\nEintragen: pnpm desk <Task> <Vorname>` : `\nAlle Tasks vergeben. Start: pnpm desk <eure Task-Nummer>`);
}

// team.json landet sofort im Verlauf, damit die Aufteilung nachvollziehbar ist.
// Nur diese eine Datei wird committet, egal was andere gerade gestaged haben.
function commitTeam(n, who) {
  try {
    execFileSync("git", ["add", "--", TEAM_FILE], { cwd: ROOT, stdio: "ignore" });
    const id = gitIdentity(who, group, process.env.DOMAIN || "localhost");
    execFileSync("git", ["commit", "--quiet", "--only", "-m", `chore(team): task ${n} taken by ${who}`, "--", TEAM_FILE], {
      cwd: ROOT,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_NAME: id.name, GIT_AUTHOR_EMAIL: id.email, GIT_COMMITTER_NAME: id.name, GIT_COMMITTER_EMAIL: id.email },
    });
  } catch {
    console.log("! team.json ist gespeichert, aber nicht committet. Bitte später mit committen.");
  }
}
