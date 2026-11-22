#!/usr/bin/env node
// Der einzige Einstieg für Teilnehmende. Läuft von selbst in jedem neuen Terminal (siehe
// deploy/workspace-entrypoint.sh) und lässt sich mit "start" wieder aufrufen.
//
// 1. Vorname eingeben. 2. Warten, bis alle am Tisch angemeldet sind; eine Person tippt "start".
// 3. Das Setup verteilt die Aufgaben nach Kopfzahl und öffnet für jede Person Claude an ihrem
//    Arbeitsplatz. Mehr gibt es im Terminal nicht zu tippen.
//
//   node scripts/start.mjs            anmelden bzw. zurück an den eigenen Arbeitsplatz
//   node scripts/start.mjs --status   Anmeldeliste und Aufteilung zeigen
//   node scripts/start.mjs --reset    (Workshop-Leitung) Anmeldeliste leeren, solange nicht gestartet
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { TASKS } from "./lib/tasks.mjs";
import { deskPackages, deskTitle, planFor, readState, writeState } from "./lib/desks.mjs";
import { deskOf, joinDesk, prepareDesk, register, startGroup } from "./lib/lobby.mjs";
import { identityEnv, ROOT } from "./lib/session.mjs";

const group = process.env.BOOTCAMP_GROUP;
const args = new Set(process.argv.slice(2));
const say = (s = "") => console.log(s);
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

if (args.has("--status")) {
  printStatus(readState());
  process.exit(0);
}
if (args.has("--reset")) {
  const state = readState();
  if (state.started) {
    console.error("✗ Die Gruppe ist schon gestartet. Die Aufteilung bleibt, wie sie ist.");
    process.exit(1);
  }
  writeState({ ...state, lobby: [] });
  say("✓ Anmeldeliste geleert.");
  process.exit(0);
}

// In einer Claude-Sitzung gibt es nichts anzumelden (ein Terminal, das Claude selbst öffnet).
if (process.env.CLAUDECODE) process.exit(0);

const rl = createInterface({ input: process.stdin, output: process.stdout });
let pending = null;
const ask = (q) =>
  new Promise((res) => {
    pending = res;
    rl.question(q, (a) => {
      pending = null;
      res(a.trim());
    });
  });
rl.on("close", () => pending?.(null));

try {
  await main();
} catch (err) {
  console.error(`\n✗ ${err.message}\nBitte die Workshop-Leitung holen. Neu versuchen: start`);
  process.exit(1);
}

async function main() {
  say(bold(`\nWillkommen${group ? ` in Gruppe ${group}` : ""}.`));
  let state = readState();
  let me;

  if (!state.started) {
    say("Ihr baut zusammen eine Schadenabwicklung. Jede Person bekommt eine Station.\n");
    while (!me) {
      const name = await ask("Wie heißt du (Vorname)? ");
      if (name === null) return;
      try {
        me = register(name);
      } catch (err) {
        state = readState();
        if (state.started) break;
        say(`  ${err.message}`);
      }
    }
    state = await lobby(me);
    if (!state) return;
  }

  let desk = me ? deskOf(state, me) : undefined;
  while (!desk) {
    say("\nDie Gruppe arbeitet schon. Wer bist du?");
    state.desks.forEach((d, i) => say(`  ${i + 1}  ${d.persons.join(" & ")} · ${deskTitle(d)}`));
    const a = await ask("Nummer eingeben (oder deinen Vornamen, wenn du neu dazukommst): ");
    if (a === null) return;
    const n = Number(a);
    if (Number.isInteger(n) && state.desks[n - 1]) desk = state.desks[n - 1];
    else if (a) {
      desk = deskOf(state, a);
      if (!desk) {
        say(`\n${a}, du kommst neu dazu. Zu wem setzt du dich? Ihr arbeitet dann zu zweit an einer Station.`);
        const m = Number(await ask("Nummer: "));
        if (state.desks[m - 1]) desk = joinDesk(a, state.desks[m - 1].slug);
      }
    }
  }
  rl.close();
  work(desk);
}

/** Warteraum: zeigt, wer angemeldet ist, bis eine Person "start" bestätigt. */
async function lobby(me) {
  let shown = "";
  const show = (state) => {
    const names = state.lobby.map((p) => p.name);
    const key = names.join("|");
    if (key === shown) return;
    shown = key;
    const plan = planFor(names.length);
    say(`\nAngemeldet (${names.length}): ${names.join(", ")}`);
    say(`So würde aufgeteilt: ${plan.map((tasks, i) => `${names[i]} → ${tasks.map((t) => TASKS[t].name).join(" + ")}`).join(" · ")}`);
    if (names.length > plan.length) say(`Ab der siebten Person arbeitet ihr zu zweit an einer Station.`);
    say(`Sind alle da? Dann tippt ${bold("eine")} Person ${bold("start")} und drückt Enter. Alle anderen warten einfach.`);
  };
  for (;;) {
    let state = readState();
    if (state.started) return state;
    show(state);
    const timer = setInterval(() => {
      const s = readState();
      if (s.started) {
        clearInterval(timer);
        pending?.("__started__");
        pending = null;
      } else show(s);
    }, 1500);
    const a = await ask("> ");
    clearInterval(timer);
    if (a === null) return null;
    if (a === "__started__") return readState();
    if (/^start$/i.test(a)) {
      state = readState();
      if (state.started) return state;
      const names = state.lobby.map((p) => p.name);
      const ok = await ask(`${names.length} Person(en): ${names.join(", ")}. Sind das alle? (j/n) `);
      if (ok === "__started__") return readState();
      if (/^j/i.test(ok ?? "")) {
        say("Aufgaben werden verteilt …");
        return startGroup({ root: ROOT, group });
      }
    }
  }
}

/** Öffnet Claude am Arbeitsplatz. Nach /exit geht es mit Enter wieder hinein; eine nackte Shell sieht niemand. */
function work(desk) {
  prepareDesk(desk, { group, log: say });
  const title = deskTitle(desk);
  for (;;) {
    say(`\n${bold(`${desk.persons.join(" & ")}: ${title}`)}`);
    say(`Ab jetzt sprichst du mit Claude. Wenn du nicht weiterweißt, tippe ${bold("/weiter")}.\n`);
    const res = spawnSync("claude", ["--append-system-prompt", systemPrompt(desk, title), "/weiter"], {
      stdio: "inherit",
      cwd: desk.worktree,
      env: {
        ...process.env,
        BOOTCAMP_DESK: desk.slug,
        ...(group ? { BOOTCAMP_GROUP: group } : {}),
        // Lange Verläufe kosten das gemeinsame Kontingent: früh zusammenfassen. Die harte Grenze setzt der Hook.
        CLAUDE_CODE_AUTO_COMPACT_WINDOW: process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || "100000",
        ...identityEnv(desk, group),
      },
    });
    if (res.error) throw new Error(`Claude ließ sich nicht starten: ${res.error.message}`);
    const again = spawnSync("bash", ["-c", 'read -r -p "Sitzung beendet. Enter = weiterarbeiten, x = Terminal verlassen: " a; echo "$a"'], { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" });
    if (/^x/i.test(again.stdout.trim())) return;
  }
}

function systemPrompt(desk, title) {
  return (
    `Du arbeitest mit ${desk.persons.join(" und ")} am Arbeitsplatz "${title}" (${deskPackages(desk).map((p) => `packages/${p}/`).join(", ")}). ` +
    `Die Person ist Fachfrau oder Fachmann für Versicherung und hat noch nie programmiert. ` +
    `Der Ablauf ist fest: Die Person tippt /weiter, du rufst pnpm next auf und führst genau den einen Schritt aus, den es nennt. ` +
    `Halte dich an die Regeln in CLAUDE.md, vor allem an "So sprichst du mit der Person".`
  );
}

function printStatus(state) {
  if (!state.started) {
    say(`Noch nicht gestartet. Angemeldet (${state.lobby.length}): ${state.lobby.map((p) => p.name).join(", ") || "–"}`);
    return;
  }
  say(`Gestartet ${state.started}`);
  for (const d of state.desks) say(`  ${d.persons.join(" & ").padEnd(18)} ${deskTitle(d).padEnd(34)} ${d.worktree}`);
}
