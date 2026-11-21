#!/usr/bin/env node
// Geführter Einstieg für Teilnehmende: was ihr baut, wie die Tasks zusammenhängen, wie ihr euch
// eintragt, wie ihr arbeitet, was geht und was nicht, wo es Hilfe gibt.
//
//   tutorial              ganzes Tutorial (im Terminal des Arbeitsplatzes; sonst: pnpm tutorial)
//   tutorial 5            direkt zu Kapitel 5
//   tutorial --auto       beim Öffnen eines Terminals (aus ~/.bashrc): solange noch Tasks frei sind,
//                         Begrüßung mit Angebot zum Tutorial, danach nur ein kurzer Hinweis
//   tutorial --banner     nur der kurze Hinweis
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { TASKS, ROOT, readTeam } from "./lib/tasks.mjs";

const color = !process.env.NO_COLOR && process.stdout.isTTY;
const sgr = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const b = sgr("1");
const dim = sgr("2");
const cyan = sgr("36");
const green = sgr("32");
const red = sgr("31");
const yellow = sgr("33");

/** Alles, was die Texte über die Umgebung wissen müssen. */
export function context(env = process.env, team = readTeam()) {
  const group = env.BOOTCAMP_GROUP || team?.group || "N";
  const domain = env.DOMAIN || "localhost";
  const tasks = team?.tasks ?? {};
  const free = Object.keys(TASKS).map(Number).filter((n) => !tasks[n]);
  return { group, domain, tasks, free, app: `https://app-gruppe${group}.${domain}` };
}

export function teamStatus(ctx) {
  return Object.entries(TASKS).map(([n, t]) => {
    const who = ctx.tasks[n] ? green(ctx.tasks[n]) : yellow("frei");
    return `  [${n}] ${t.name.padEnd(17)} packages/${t.pkg.padEnd(7)} ${who}`;
  });
}

export function banner(ctx) {
  const lines = [`${b(`Workshop-Arbeitsplatz Gruppe ${ctx.group}`)}`];
  if (ctx.free.length) {
    lines.push(`Noch frei: ${ctx.free.map((n) => `${n} ${TASKS[n].name}`).join(", ")}.`);
    lines.push(`Eintragen: ${cyan("pnpm desk <Task> <Vorname>")} · Einstieg: ${cyan("tutorial")}`);
  } else {
    lines.push(`Eigene Session: ${cyan("pnpm desk <Task>")} · Interview: ${cyan("pnpm interview <Task>")} · Hilfe: ${cyan("tutorial")}`);
  }
  return lines.join("\n");
}

export function welcome(ctx) {
  return [
    "",
    cyan("╭──────────────────────────────────────────────────────────╮"),
    cyan("│") + b(`  Willkommen am Arbeitsplatz von Gruppe ${ctx.group}`.padEnd(58)) + cyan("│"),
    cyan("╰──────────────────────────────────────────────────────────╯"),
    "",
    "Das Tutorial führt dich in etwa fünf Minuten durch den Workshop:",
    "was ihr baut, wie du dir deinen Task nimmst, wie ihr mit Claude Code",
    "arbeitet und was in dieser Umgebung geht und was nicht.",
    "",
  ].join("\n");
}

/** Die Kapitel. Kapitel 3 trägt ein, Kapitel 7 startet die Session; der Text steht trotzdem hier. */
export function chapters(ctx) {
  return [
    {
      title: "Worum es geht",
      body: [
        "Ihr baut als Gruppe eine Schadensabwicklung für die Gebäudehaftpflicht:",
        "ein Mockup mit erfundenen Daten, kein echtes System.",
        "",
        `${b("Lernziel")} ist agentic Coding mit Claude Code und Requirements Engineering.`,
        "Fertig werden ist nicht das Ziel. Gut erfragte, aufgeschriebene und",
        "getestete Anforderungen sind es.",
        "",
        "Ihr seid fünf Personen an einem Arbeitsplatz. Jede öffnet ihn in einem",
        "eigenen Browser-Tab und arbeitet in ihrem eigenen Terminal, alle im selben",
        "Projektordner. Claude Code ist schon angemeldet, ihr müsst euch nirgends",
        "einloggen.",
      ],
    },
    {
      title: "Die fünf Tasks und wie sie zusammenhängen",
      body: [
        "Eine Schadenakte (Claim) wandert durch vier Stufen:",
        "",
        `  Schadenmeldung`,
        `     ▼`,
        `  [1] Schadenaufnahme    ${dim("nimmt die Meldung auf, legt den Vorgang an")}`,
        `     ▼`,
        `  [2] Deckungsprüfung    ${dim("besteht Versicherungsschutz?")}`,
        `     ▼`,
        `  [3] Schadenbewertung   ${dim("wie hoch ist der ersatzfähige Schaden?")}`,
        `     ▼`,
        `  [4] Regulierung        ${dim("schließt den Vorgang gegenüber den Beteiligten ab")}`,
        `     ▼`,
        `  Endzustand`,
        "",
        `  [5] Oberfläche         ${dim("zeigt den Vorgang über alle vier Stufen")}`,
        "",
        `• Jede Stufe ergänzt nur ${b("ihren eigenen Block")} (stage1 … stage4) und hängt`,
        "  einen Trace-Eintrag an. Wie die Akte aussieht, legt der Contract fest:",
        "  contracts/claim.schema.json, gleich für alle und schreibgeschützt.",
        `• ${b("Niemand wartet auf den Vorgänger.")} Für jede Übergabe gibt es Musterakten in`,
        "  fixtures/1-2, 2-3, 3-4, 4-ende: Standardfall, Grenzfall, Ablehnungskandidat.",
        `• ${b("Übergaben sprecht ihr direkt ab:")} Was braucht Task 2 von Task 1? Ihr sitzt`,
        "  am selben Tisch.",
      ],
    },
    {
      title: "Deinen Task übernehmen",
      register: true,
      body: [
        "Jede Person übernimmt genau einen Task. Seid ihr weniger als fünf, nimmt",
        "jemand zwei (dann zwei Terminals). Erst eintragen, dann bauen: Ohne Eintrag",
        "schreibt Claude in keinem Package.",
        "",
        "So sieht es in eurer Gruppe gerade aus:",
        "",
        ...teamStatus(ctx),
        "",
        `Eintragen geht jederzeit auch von Hand: ${cyan("pnpm desk <Task> <Vorname>")}`,
      ],
    },
    {
      title: "So arbeitet ihr",
      body: [
        `  1. ${b("Interview")}      Fachperson eures Tasks befragen`,
        `                    ${cyan("pnpm interview <Task>")} im zweiten Terminal`,
        `                    oder in Claude: ${cyan("/interview <Task> <Frage>")}`,
        `  2. ${b("Aufschreiben")}   in requirements.md: ID, User Story, Gegeben/Wenn/Dann`,
        `  3. ${cyan("/spec <ID>")}      Tests aus den Akzeptanzkriterien schreiben lassen`,
        `  4. ${cyan("/implement <ID>")} umsetzen, bis die Tests grün sind`,
        `  5. ${cyan("/verify <ID>")}    jemand anderes prüft, nicht wer gebaut hat`,
        `  6. ${b("Commit")}         ${cyan("pnpm check")} grün, dann nur das eigene Package:`,
        `                    ${cyan("git add packages/<eures> && git commit -m \"…\"")}`,
        "",
        "• Die Fachperson schreibt euch keine Anforderungen. Ihr müsst gezielt fragen.",
        "• IDs: T<Task>-REQ-<NNN>, z. B. T2-REQ-003. Ohne ID kein Code.",
        `• Fehlt ein Feld im Contract: ${cyan("/contract-change <ID> <was fehlt>")}`,
        "• Die Schritte 3 bis 6 erledigt Claude mit euch. Ihr entscheidet, Claude baut.",
      ],
    },
    {
      title: "Was geht und was nicht",
      body: [
        b("Geht:"),
        `  ${green("✓")} alles lesen, auch die Packages der anderen`,
        `  ${green("✓")} im eigenen Package schreiben (über eure Claude-Session)`,
        `  ${green("✓")} ${cyan("pnpm check")}, ${cyan("pnpm test")}, ${cyan("pnpm test:req <ID>")}, ${cyan("pnpm run doctor")}`,
        `  ${green("✓")} Musterakten per HTTP: ${cyan("pnpm mock-server")} (einmal pro Gruppe), dann`,
        `      ${ctx.app}/mock/claims`,
        `  ${green("✓")} Oberfläche (Task 5): Dev-Server auf Port 5173, sichtbar unter`,
        `      ${ctx.app}`,
        `  ${green("✓")} committen, nur das eigene Package`,
        "",
        b("Geht nicht:"),
        `  ${red("✗")} fremde Packages oder contracts/ ändern ${dim("→ Contract: /contract-change")}`,
        `  ${red("✗")} git add -A, git commit -a ${dim("→ nehmen die halbe Arbeit der anderen mit")}`,
        `  ${red("✗")} git push ${dim("→ die Workshop-Leitung sammelt eure Arbeit am Ende ein")}`,
        `  ${red("✗")} Force-Push, git reset --hard, --no-verify`,
        `  ${red("✗")} eigene Claude-Anmeldung ${dim("→ nicht nötig, läuft über den Server")}`,
        "",
        dim("Tipp: pnpm doctor ohne run ist ein eingebauter pnpm-Befehl. Unser Check heißt pnpm run doctor."),
      ],
    },
    {
      title: "Wenn ihr nicht weiterwisst",
      body: [
        `${b("Claude fragen.")} In eurer Session einfach fragen, zum Beispiel:`,
        `  „Was ist mein nächster Schritt?“`,
        `  „Erklär mir, was Task 3 von uns braucht.“`,
        `  „Warum ist pnpm check rot?“`,
        "Claude kennt das Projekt und seine Regeln. Ohne eigene Session startet",
        `${cyan("claude")} eine Fragerunde, die in keinem Package schreibt.`,
        "",
        `${b("Dieses Tutorial")} gibt es jederzeit wieder: ${cyan("tutorial")}, ein Kapitel direkt mit`,
        `${cyan("tutorial 5")}. Umgebung prüfen: ${cyan("pnpm run doctor")}.`,
        "",
        `${b("Die Workshop-Leitung")} ist im Raum. Hand heben oder ansprechen, vor allem wenn`,
        "  • ein Check rot ist und ihr nicht versteht, warum,",
        "  • ein Contract-Antrag an die Leitung eskaliert wird,",
        "  • der Arbeitsplatz hängt oder etwas Seltsames passiert.",
      ],
    },
    {
      title: "Los geht's",
      start: true,
      body: [
        "Deine nächsten Schritte:",
        "",
        `  1. Claude-Session starten: ${cyan("pnpm desk <Task>")}`,
        `  2. Als Erstes fragen: „Lies packages/<euer Package>/CLAUDE.md und erklär mir meinen Task.“`,
        `  3. Zweites Terminal öffnen (＋ oben rechts im Terminal-Bereich) und`,
        `     ${cyan("pnpm interview <Task>")} für das Gespräch mit eurer Fachperson.`,
        "",
        "Viel Spaß!",
      ],
    },
  ];
}

function prompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("SIGINT", () => {
    console.log("");
    process.exit(130);
  });
  // Eingabe zu Ende (Strg+D, Terminal geschlossen): beenden statt auf eine Antwort zu warten.
  rl.on("close", () => {
    if (!rl.done) process.exit(0);
  });
  rl.finish = () => {
    rl.done = true;
    rl.close();
  };
  return rl;
}

function render(ch, i, total) {
  const head = `${dim(`Kapitel ${i + 1} von ${total}`)}  ${b(ch.title)}`;
  return `\n${cyan("─".repeat(64))}\n${head}\n${cyan("─".repeat(64))}\n\n${ch.body.join("\n")}\n`;
}

async function registerStep(rl, state) {
  let ctx = context();
  if (!ctx.free.length) {
    console.log(dim("\nAlle Tasks sind vergeben. Deine Session startest du mit pnpm desk <Task>."));
    return;
  }
  const t = (await rl.question(`\nWelchen Task übernimmst du? ${dim(`(${ctx.free.join(", ")} · Enter = später)`)} `)).trim();
  if (!t) return;
  if (!TASKS[t]) return console.log(red(`Task ${t} gibt es nicht. Später: pnpm desk <Task> <Vorname>`));
  if (ctx.tasks[t]) {
    console.log(yellow(`Task ${t} hat schon ${ctx.tasks[t]}.`) + " Wenn das du bist, passt alles.");
    state.task = t;
    return;
  }
  const name = (await rl.question("Dein Vorname: ")).trim();
  if (!name) return console.log(dim("Kein Name, nichts eingetragen."));
  const res = spawnSync(process.execPath, [`${ROOT}scripts/desk.mjs`, t, name, "--kein-start"], { stdio: "inherit", cwd: ROOT });
  if (res.status === 0) state.task = t;
  else console.log(red("Eintragen hat nicht geklappt, siehe oben. Bei Fragen: Workshop-Leitung."));
}

async function startStep(rl, state) {
  if (!state.task) {
    console.log(dim("Du bist noch nicht eingetragen: pnpm desk <Task> <Vorname>"));
    return;
  }
  const pkg = `packages/${TASKS[state.task].pkg}`;
  console.log(`\nDein Task: ${b(`${state.task} ${TASKS[state.task].name}`)}, dein Package: ${b(pkg)}.`);
  console.log(`Erste Frage an Claude: „Lies ${pkg}/CLAUDE.md und erklär mir meinen Task.“`);
  const a = (await rl.question(`\nClaude-Session jetzt starten? ${dim("[J/n]")} `)).trim().toLowerCase();
  if (a === "" || a === "j" || a === "ja" || a === "y") {
    rl.finish();
    state.closed = true;
    spawnSync(process.execPath, [`${ROOT}scripts/desk.mjs`, state.task], { stdio: "inherit", cwd: ROOT });
  } else {
    console.log(`Später mit ${cyan(`pnpm desk ${state.task}`)}.`);
  }
}

export async function run(startAt = 0) {
  const rl = prompt();
  const state = {};
  const list = chapters(context());
  let i = Math.max(0, Math.min(startAt, list.length - 1));
  try {
    while (i < list.length) {
      console.log(render(list[i], i, list.length));
      if (list[i].register) await registerStep(rl, state);
      if (list[i].start) {
        await startStep(rl, state);
        break;
      }
      const a = (await rl.question(dim("\n[Enter] weiter · [z] zurück · [q] beenden  "))).trim().toLowerCase();
      if (a === "q") break;
      i = a === "z" ? Math.max(0, i - 1) : i + 1;
    }
  } catch {
    // Strg+C / Strg+D: einfach beenden
  } finally {
    if (!state.closed) rl.finish();
  }
  if (!state.closed) console.log(`\n${banner(context())}\n`);
}

async function auto() {
  if (!process.stdin.isTTY || !process.stdout.isTTY || process.env.CLAUDECODE) return;
  const ctx = context();
  if (!ctx.free.length) return console.log(`${banner(ctx)}\n`);
  console.log(welcome(ctx));
  const rl = prompt();
  let a = "s";
  try {
    a = (await rl.question(`${b("[Enter]")} Tutorial starten · ${b("[s]")} überspringen  `)).trim().toLowerCase();
  } catch {}
  rl.finish();
  if (a === "") return run();
  console.log(`\n${banner(ctx)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === "--auto") await auto();
  else if (arg === "--banner") console.log(banner(context()));
  else await run(arg && /^\d+$/.test(arg) ? Number(arg) - 1 : 0);
}
