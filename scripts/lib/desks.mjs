// Arbeitsplätze einer Gruppe. Ein Arbeitsplatz (Desk) gehört einer Person, trägt einen oder mehrere
// Tasks und hat einen eigenen Arbeitsstand (git worktree auf eigenem Branch). Wie viele Arbeitsplätze
// es gibt und welche Tasks sie tragen, richtet sich nach der Kopfzahl der Gruppe (PLANS).
//
// Der gemeinsame Zustand der Gruppe (Anmeldeliste, Arbeitsplätze, Merker, Wünsche) liegt im
// git-Verzeichnis des Haupt-Checkouts unter bootcamp/. Dort sehen ihn alle Arbeitsstände, und er
// wird nie committet.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { TASKS } from "./tasks.mjs";

/**
 * Aufteilung der Tasks nach Kopfzahl. Jede Person bekommt genau einen Arbeitsplatz.
 * Bei weniger als fünf Personen werden benachbarte Stages zusammengelegt, bei sechs wird die
 * Oberfläche geteilt (Vorgangsansicht und Meldeformular). Die Oberfläche bleibt immer eigener Platz.
 */
export const PLANS = {
  1: [[1, 2, 3, 4, 5]],
  2: [[1, 2, 3, 4], [5]],
  3: [[1, 2], [3, 4], [5]],
  4: [[1, 2], [3], [4], [5]],
  5: [[1], [2], [3], [4], [5]],
  6: [[1], [2], [3], [4], [5], [6]],
};
export const MAX_DESKS = 6;

/** Aufteilung für n Personen. Ab der siebten Person setzt man sich als Tandem zu jemandem dazu. */
export function planFor(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error("Mindestens eine Person muss angemeldet sein");
  return PLANS[Math.min(n, MAX_DESKS)];
}

/** Name als Verzeichnis- und Branch-Bestandteil. */
export function slug(name) {
  return (
    String(name)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "person"
  );
}

export function cleanName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
}

/** Ein Vorname, höchstens mit zweitem Vornamen oder Anfangsbuchstaben: "Anna", "Anna Lena", "Jan B." */
const FIRST_NAME = /^\p{L}[\p{L}'-]*(?: \p{L}[\p{L}'-]*\.?)?$/u;

/** Prüft einen eingegebenen Vornamen. Gibt eine Erklärung zurück, wenn er nicht passt, sonst null. */
export function nameProblem(name) {
  const clean = cleanName(name);
  if (!clean) return "Bitte einen Vornamen eingeben.";
  if (clean.length > 24 || !FIRST_NAME.test(clean)) {
    return "Bitte nur den Vornamen eingeben, zum Beispiel „Biggi“. Gibt es den Namen am Tisch zweimal: Vorname und Anfangsbuchstabe, zum Beispiel „Jan B.“.";
  }
  return null;
}

/**
 * Verteilt die angemeldeten Personen in Anmelde-Reihenfolge auf die Arbeitsplätze.
 * Gibt die Arbeitsplätze zurück: { id, persons, slug, tasks }.
 */
export function assignDesks(names) {
  const people = names.map(cleanName).filter(Boolean);
  const plan = planFor(people.length);
  const used = new Set();
  const desks = plan.map((tasks, i) => {
    let s = slug(people[i]);
    while (used.has(s)) s += "x";
    used.add(s);
    return { id: i + 1, persons: [people[i]], slug: s, tasks };
  });
  // Mehr Personen als Arbeitsplätze: reihum als Tandem dazusetzen.
  people.slice(plan.length).forEach((p, i) => desks[i % desks.length].persons.push(p));
  return desks;
}

/** team.json-Form (Task → Person) aus den Arbeitsplätzen. */
export function teamFromDesks(desks, group) {
  const tasks = {};
  for (const d of desks) for (const t of d.tasks) tasks[t] = d.persons.join(" & ");
  return { ...(group ? { group: Number(group) } : {}), tasks };
}

export const deskTitle = (desk) => desk.tasks.map((t) => TASKS[t].name).join(" + ");
export const deskPackages = (desk) => desk.tasks.map((t) => TASKS[t].pkg);

/**
 * Musterakten eines Tasks: woher der Eingang kommt und welche Akten das Ziel zeigen.
 * Bei zusammengelegten Stages gilt der Eingang des ersten und das Ziel des letzten Tasks.
 */
export function boundariesFor(tasks) {
  const stages = tasks.filter((t) => t <= 4);
  if (!stages.length) {
    // Oberfläche: zeigt jeden Zustand an. Meldeformular: liefert, was die Schadenaufnahme als Eingang braucht.
    return tasks.includes(5) ? { input: ["1-2", "2-3", "3-4", "4-ende"], output: [] } : { input: [], output: ["eingang"] };
  }
  const first = Math.min(...stages);
  const last = Math.max(...stages);
  const ui = tasks.includes(5) ? ["1-2", "2-3", "3-4", "4-ende"] : [];
  return {
    input: [first === 1 ? "eingang" : `${first - 1}-${first}`, ...ui.filter((b) => b !== `${first - 1}-${first}`)],
    output: [last === 4 ? "4-ende" : `${last}-${last + 1}`],
  };
}

// ---------------------------------------------------------------------------------------------
// Zustand der Gruppe

/** Haupt-Checkout (dort liegt .git als Verzeichnis), egal aus welchem Arbeitsstand gefragt wird. */
export function mainRoot(cwd = process.cwd()) {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, encoding: "utf8" }).trim();
  return dirname(common);
}

export function stateDir(cwd = process.cwd()) {
  if (process.env.BOOTCAMP_STATE_DIR) return resolve(process.env.BOOTCAMP_STATE_DIR);
  return join(mainRoot(cwd), ".git", "bootcamp");
}

export function desksDir() {
  return resolve(process.env.BOOTCAMP_DESKS_DIR ?? join(homedir(), "desks"));
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, file);
}

export function readState(dir = stateDir()) {
  return { started: null, lobby: [], desks: [], ...readJsonFile(join(dir, "state.json"), {}) };
}

export function writeState(state, dir = stateDir()) {
  writeJsonFile(join(dir, "state.json"), state);
}

/**
 * Sperre über ein Verzeichnis, damit zwei Terminals nicht gleichzeitig starten, mergen oder
 * Contract-Nummern vergeben. Eine Sperre, die älter als zwei Minuten ist, gilt als liegen geblieben.
 */
export function withLock(name, fn, dir = stateDir()) {
  mkdirSync(dir, { recursive: true });
  const lock = join(dir, `${name}.lock`);
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      mkdirSync(lock);
      break;
    } catch {
      try {
        if (Date.now() - statSync(lock).mtimeMs > 120_000) rmSync(lock, { recursive: true, force: true });
      } catch {}
      if (Date.now() > deadline) throw new Error(`Sperre ${name} ist belegt. Bitte in einer Minute noch einmal versuchen.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
    }
  }
  try {
    return fn();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

/** Arbeitsplatz der laufenden Session: aus BOOTCAMP_DESK oder aus dem Verzeichnis des Arbeitsstands. */
export function currentDesk(state = safeState(), env = process.env, cwd = process.cwd()) {
  if (!state) return undefined;
  if (env.BOOTCAMP_DESK) return state.desks.find((d) => d.slug === env.BOOTCAMP_DESK);
  const here = resolve(cwd);
  return state.desks.find((d) => d.worktree && (here === d.worktree || here.startsWith(d.worktree + "/")));
}

function safeState() {
  try {
    return readState();
  } catch {
    return undefined;
  }
}

/** Merker eines Arbeitsplatzes (muss /clear, letzter Fortschritt, Kontextgröße, veröffentlichte IDs). */
export function readFlags(deskSlug, dir = stateDir()) {
  return { mustClear: false, published: [], ...readJsonFile(join(dir, `desk-${deskSlug}.json`), {}) };
}

export function updateFlags(deskSlug, patch, dir = stateDir()) {
  const next = { ...readFlags(deskSlug, dir), ...patch };
  writeJsonFile(join(dir, `desk-${deskSlug}.json`), next);
  return next;
}

// ---------------------------------------------------------------------------------------------
// Wünsche: Ein Arbeitsplatz braucht ein Feld aus dem Block eines anderen. Statt Antrag und Eskalation
// landet der Wunsch beim Arbeitsplatz, dem der Block gehört, und dessen Claude sieht ihn beim nächsten Schritt.

export function readWishes(dir = stateDir()) {
  return readJsonFile(join(dir, "wishes.json"), []);
}

export function addWish({ from, fromDesk, toTask, text }, dir = stateDir()) {
  return withLock("wishes", () => {
    const wishes = readWishes(dir);
    const same = wishes.find((w) => !w.answer && w.fromDesk === fromDesk && w.toTask === toTask && w.text === text);
    if (same) return same;
    const wish = { id: `W${wishes.length + 1}`, from, fromDesk, toTask, text, at: new Date().toISOString() };
    writeJsonFile(join(dir, "wishes.json"), [...wishes, wish]);
    return wish;
  }, dir);
}

export function answerWish(id, answer, dir = stateDir()) {
  return withLock("wishes", () => {
    const wishes = readWishes(dir);
    const wish = wishes.find((w) => w.id === id);
    if (!wish) throw new Error(`Wunsch ${id} gibt es nicht`);
    wish.answer = answer;
    wish.answeredAt = new Date().toISOString();
    writeJsonFile(join(dir, "wishes.json"), wishes);
    return wish;
  }, dir);
}

export function markWishesSeen(ids, dir = stateDir()) {
  if (!ids.length) return;
  withLock("wishes", () => {
    const wishes = readWishes(dir);
    for (const w of wishes) if (ids.includes(w.id)) w.seen = true;
    writeJsonFile(join(dir, "wishes.json"), wishes);
  }, dir);
}

/** Offene Wünsche an einen Arbeitsplatz und noch nicht gesehene Antworten auf eigene Wünsche. */
export function wishesFor(desk, wishes = readWishes()) {
  return {
    incoming: wishes.filter((w) => !w.answer && desk.tasks.includes(w.toTask)),
    answered: wishes.filter((w) => w.answer && !w.seen && w.fromDesk === desk.slug),
  };
}

export { existsSync };
