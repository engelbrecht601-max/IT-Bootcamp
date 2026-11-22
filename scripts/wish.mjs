#!/usr/bin/env node
// Wünsche zwischen Arbeitsplätzen: "Ich brauche von dir ein Feld." Ersetzt Antrag, Eskalation und
// Handover-Dateien. Der Wunsch erscheint beim Arbeitsplatz, dem der Task gehört, als nächster Schritt.
//
//   pnpm wunsch add <Task 1–4> "<was gebraucht wird und wofür>"
//   pnpm wunsch done <W-Nummer> "<Antwort: Feldname oder warum nicht>"
//   pnpm wunsch list
import { TASKS, taskNumber } from "./lib/tasks.mjs";
import { addWish, answerWish, readWishes } from "./lib/desks.mjs";
import { die, session } from "./lib/session.mjs";

const [cmd, a, ...rest] = process.argv.slice(2);
const { desk, state } = session();
const text = rest.join(" ").replace(/\s+/g, " ").trim();
const owner = (task) => state?.desks.find((d) => d.tasks.includes(task));

try {
  if (cmd === "add") {
    const task = taskNumber(a);
    if (!task || task > 4) die("Aufruf: pnpm wunsch add <Task 1–4> \"<was gebraucht wird>\"", 64);
    if (!text) die("Der Wunsch braucht einen Satz: was fehlt und wofür.", 64);
    if (!desk) die("Diese Sitzung gehört zu keinem Arbeitsplatz.");
    if (desk.tasks.includes(task)) die(`Task ${task} gehört dir selbst. Das Feld legst du mit pnpm contracts:add an.`);
    const wish = addWish({ from: desk.persons.join(" & "), fromDesk: desk.slug, toTask: task, text });
    console.log(`✓ Wunsch ${wish.id} liegt bei ${owner(task)?.persons.join(" & ") ?? `Task ${task}`} (${TASKS[task].name}). Die Antwort erscheint hier von selbst. Bis dahin ohne das Feld weiterarbeiten.`);
  } else if (cmd === "done") {
    if (!text) die("Die Antwort braucht einen Satz: Feldname oder warum es das Feld nicht gibt.", 64);
    const wish = answerWish(a, text);
    console.log(`✓ Wunsch ${wish.id} beantwortet. ${wish.from} sieht die Antwort beim nächsten Schritt.`);
  } else if (cmd === "list") {
    for (const w of readWishes()) console.log(`${w.id}  ${w.from} → ${TASKS[w.toTask].name}: ${w.text}${w.answer ? `\n    Antwort: ${w.answer}` : "\n    (offen)"}`);
  } else die("Aufruf: pnpm wunsch add | done | list", 64);
} catch (err) {
  die(err.message);
}
