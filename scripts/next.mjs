#!/usr/bin/env node
// Der nächste Schritt des eigenen Arbeitsplatzes: pnpm next
// /weiter ruft dieses Skript auf und führt genau die Anweisung aus, die es ausgibt.
import { instructions } from "./lib/instructions.mjs";
import { deskTitle, markWishesSeen } from "./lib/desks.mjs";
import { deskStatus, die, session } from "./lib/session.mjs";

const { desk } = session();
if (!desk) die("Diese Sitzung gehört zu keinem Arbeitsplatz. Die Person tippt /exit und öffnet ein neues Terminal.");
const { next, line, wishes } = deskStatus(desk);
console.log(`ARBEITSPLATZ: ${desk.persons.join(" & ")} · ${deskTitle(desk)}`);
console.log(`STAND: ${line}`);
for (const h of next.hints) console.log(`HINWEIS: ${h}`);
for (const w of wishes.answered) console.log(`ANTWORT auf deinen Wunsch ${w.id} (${w.text}): ${w.answer}`);
markWishesSeen(wishes.answered.map((w) => w.id));
console.log(`\n${instructions(next, desk)}`);
