#!/usr/bin/env node
// Der nächste Schritt des eigenen Arbeitsplatzes: pnpm next
// /weiter ruft dieses Skript auf und führt genau die Anweisung aus, die es ausgibt.
import { instructions } from "./lib/instructions.mjs";
import { deskTitle, markWishesSeen, updateFlags } from "./lib/desks.mjs";
import { stuckInfo, trackAttempt } from "./lib/steps.mjs";
import { deskStatus, die, session } from "./lib/session.mjs";

const { desk } = session();
if (!desk) die("Diese Sitzung gehört zu keinem Arbeitsplatz. Die Person tippt /exit und öffnet ein neues Terminal.");
const { next, line, wishes, flags } = deskStatus(desk);
// Wie oft war genau dieser Schritt schon dran? Beim dritten Anlauf bietet die Anweisung einen Ausweg an,
// und die Übersicht der Leitung (deploy/status.sh) zeigt den Arbeitsplatz als festgefahren.
const attempt = trackAttempt(flags.attempt, next);
const stuck = stuckInfo({ ...flags, attempt }, next);
updateFlags(desk.slug, { attempt: attempt ?? null, stuck: stuck ? { step: next.step, id: next.id, ...stuck, since: flags.stuck?.since ?? new Date().toISOString() } : null });
console.log(`ARBEITSPLATZ: ${desk.persons.join(" & ")} · ${deskTitle(desk)}`);
console.log(`STAND: ${line}`);
for (const h of next.hints) console.log(`HINWEIS: ${h}`);
for (const w of wishes.answered) console.log(`ANTWORT auf deinen Wunsch ${w.id} (${w.text}): ${w.answer}`);
markWishesSeen(wishes.answered.map((w) => w.id));
console.log(`\n${instructions(next, desk, { stuck, verified: flags.published?.length ?? 0 })}`);
