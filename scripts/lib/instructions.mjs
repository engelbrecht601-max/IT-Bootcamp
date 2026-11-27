// Arbeitsanweisung für genau einen Schritt. pnpm next gibt sie aus, /weiter führt sie aus.
// Claude bekommt immer nur den Schritt zu sehen, der dran ist.
import { TASKS, UI_TASKS } from "./tasks.mjs";
import { boundariesFor } from "./desks.mjs";
import { bonusCards } from "./bonus.mjs";

const today = () => new Date().toISOString().slice(0, 10);
const END = "Danach ist dieser Schritt fertig. Sag der Person in einem Satz, was jetzt da ist, und dass sie /weiter tippt.";

function akten(task) {
  const { input, output } = boundariesFor([task]);
  const dir = (b) => (b === "eingang" ? "`akten/eingang/`" : `\`fixtures/${b}/\``);
  const parts = [];
  if (input.length) parts.push(`Eingang: ${input.map(dir).join(", ")}`);
  if (output.length) parts.push(`so sieht es danach aus: ${output.map(dir).join(", ")}`);
  return parts.join("; ");
}

/**
 * Ausweg, wenn ein Schritt sich festgefahren hat: derselbe Schritt zum dritten Mal oder zweiter Blocker.
 * Steht vor der eigentlichen Anweisung. Die Person entscheidet, Claude versucht es nicht einfach noch einmal.
 */
function wayOut(next, stuck) {
  const why = stuck.blockers >= 2 ? `Die Prüfung hat ${next.id} schon ${stuck.blockers}-mal zurückgegeben.` : `Dieser Schritt ist für ${next.id} zum ${stuck.count}. Mal dran.`;
  return `ZUERST: AUSWEG ANBIETEN. ${why}
Versuch es nicht einfach noch einmal. Sag der Person in einem Satz, woran es hängt, und biete genau diese drei Wege an (A empfohlen). Warte auf ihre Wahl:
A) Kleiner schneiden: nur das erste Akzeptanzkriterium bleibt, der Rest wandert als Idee nach ideen.md. Dann \`pnpm req set ${next.id} offen\`, und die Person tippt /weiter.
B) Streichen: \`pnpm req set ${next.id} gestrichen\`. Mit /weiter kommt eine neue, einfachere Anforderung zum selben Fall.
C) Hilfe: Die Workshop-Leitung sieht in ihrer Übersicht schon, dass es hier hängt. Die Person hebt die Hand.
Wählt die Person keinen der Wege und will es noch einmal versuchen, gilt die Anweisung darunter.

`;
}

export function instructions(next, desk, { stuck, verified = 0 } = {}) {
  const body = stepInstructions(next, desk, verified);
  return stuck && next.id ? wayOut(next, stuck) + body : body;
}

function stepInstructions(next, desk, verified) {
  const t = next.task ? TASKS[next.task] : undefined;
  const pkg = t ? `packages/${t.pkg}` : undefined;
  switch (next.step) {
    case "clear":
      return `Die letzte Anforderung ist fertig und gesichert. Sag der Person nur diesen einen Satz: "Tippe jetzt /clear und danach /weiter." Tu sonst nichts.`;

    case "interview":
      return `INTERVIEW für ${t.name} (${pkg}). Es fehlen noch ${next.missing} eigene Frage(n) der Person an die Fachperson.

1. Falls die Person neu ist: Erklär den Case nicht selbst. Sag ihr in zwei Sätzen: Die Erklärung steht auf der Startseite des Workshops unter "Der Case auf einer Seite", und Fragen zum Case oder zum Ablauf beantwortet jederzeit \`/erklaer <Frage>\`. Sag ihr außerdem einmal: Die Fachperson kennt nur ihren eigenen Arbeitsbereich und kann nur begrenzt Auskunft geben. Wozu sie nichts weiß, dafür braucht die Station keine Regel. Dann bitte sie um ihre erste Frage an die Fachperson.
2. Du stellst der Fachperson keine eigenen Fragen und formulierst keine Fragen vor. Fällt der Person nichts ein, nenn Themen, keine Sätze und keine Beispielfragen: was Pflicht ist, was im Grenzfall passiert, wann abgelehnt wird, was die nächste Station braucht.
3. Fragen ohne Bezug zur Arbeit der Station (Gehalt, Privates, Smalltalk) gibst du nicht weiter und schreibst sie nicht ins Protokoll. Sag freundlich in einem Satz, dass nur Fragen zur Arbeit zählen, und bitte um eine solche, ohne selbst eine vorzuschlagen.
4. Für jede Frage der Person: Ruf den Subagenten \`${t.persona}\` im Vordergrund auf (Parameter \`run_in_background: false\`) (ein Aufruf pro Frage, nie mehrere gleichzeitig). Gib ihm das bisherige Protokoll aus ${pkg}/interview.md und die Frage wörtlich.
5. Häng Frage und Antwort wörtlich an ${pkg}/interview.md an:
   **Gruppe:** <Frage>

   **Fachperson:** <Antwort>
6. Zeig der Person die Antwort wörtlich. Leite noch keine Anforderung ab. Die Fachperson antwortet ausführlich und nennt oft gleich, was an einer Regel dranhängt: Eine gute Frage reicht meist für eine ganze Anforderung.
Sobald genug gefragt ist, sagt \`pnpm next\` den nächsten Schritt. Weitere Fragen an die Fachperson gehen auch später jederzeit.`;

    case "anforderung": {
      const bonus = next.testCase === "Bonus";
      return `EINE ANFORDERUNG AUFSCHREIBEN für ${t.name} (${pkg}), ${bonus ? "freie Wahl (Bonus)" : `Fall: ${next.testCase}`}.
Musterakten: ${akten(next.task)}.

1. ${
        bonus
          ? `Zeig der Person diese Themenkarten, jede mit Titel und Frage, und dazu ihre eigenen Ideen aus ${pkg}/ideen.md, falls es die Datei gibt:
${bonusCards(next.task, verified).map((c) => `   - ${c.title}: ${c.text}`).join("\n")}
   Sie wählt eine Karte, eine eigene Idee oder etwas ganz anderes. Sag dazu: Im Bonus gibt es kein Richtig, hier darf eure Gruppe anders aussehen als die anderen. Die Karte nennt nur das Thema; was gilt, fragt die Person die Fachperson (Ablauf wie im Interview), dann sagt sie in ihren Worten, was die Station können soll.`
          : `Frag die Person: "Was soll im ${next.testCase} passieren?" Sie sagt es in ihren Worten.`
      }
2. Bring es in Form und trag GENAU EINE Anforderung in ${pkg}/requirements.md ein: nächste freie ID, Vorlage aus der Datei, User Story, ein bis drei Akzeptanzkriterien (Gegeben/Wenn/Dann) mit konkreten Werten aus den Musterakten, Status offen, Quelle "Interview vom ${today()}".
3. Fachliche Regeln kommen nur aus ${pkg}/interview.md. Lies das Protokoll zuerst ganz: Oft steht die Regel schon in einer früheren Antwort. Schick die Person nur dann zur Fachperson zurück, wenn genau für diese eine Anforderung eine Regel fehlt, und dann mit einer einzigen Frage (Ablauf wie im Interview). Was nur für spätere Anforderungen fehlt, kommt als Zeile unter "Offene Fragen an die Fachperson" in ${pkg}/requirements.md. Erfinde nichts.
4. Zeig der Person die Anforderung in Alltagssprache und hol ihr Okay.
5. Weitere Ideen der Person kommen als je eine Zeile nach ${pkg}/ideen.md, nicht als Anforderung. Es ist immer nur eine Anforderung in Arbeit.
${END}`;
    }

    case "tests":
      return `TESTS ZUERST für ${next.id} (${pkg}).

1. Lies den Eintrag ${next.id} in ${pkg}/requirements.md. Ist jedes Kriterium so konkret, dass ein Test es wörtlich prüfen kann? Wenn nicht, schärf es mit der Person (Werte statt "angemessen").
2. Braucht die Anforderung ein Feld, das im Contract fehlt (\`pnpm contracts:build\`, dann contracts/claim.schema.json)? Dann leg es selbst an, ohne die Person nach Feldnamen zu fragen:
   echo '{"requirementId":"${next.id}","rationale":"<ein Satz>","fragment":{"properties":{"stage${next.task}":{"properties":{"<feld>":{"description":"<deutsch>","type":"<typ>"}}}}}}' | pnpm contracts:add -
   ${UI_TASKS.includes(next.task) ? "Dieser Task hat keinen eigenen Block. Fehlt eine Angabe: `pnpm wunsch add <Task 1–4> \"<was fehlt und wofür>\"` und ohne das Feld weiterarbeiten." : "Liegt das Feld im Block einer anderen Station, schickt das Skript von selbst einen Wunsch dorthin. Dann ohne das Feld weiterarbeiten."}
3. Ruf den Subagenten \`test-author\` mit genau der ID ${next.id} im Vordergrund auf (Parameter \`run_in_background: false\`). Schreib die Tests nicht selbst.
4. \`pnpm test:req ${next.id}\`: Die Tests müssen laufen und rot sein, weil die Umsetzung fehlt. Syntax- und Importfehler lässt du den test-author beheben.
5. \`pnpm req set ${next.id} spezifiziert\`.
Sag der Person in zwei Sätzen, welche Fälle jetzt geprüft werden. ${END}`;

    case "bauen":
      return `UMSETZEN: ${next.id} (${pkg}), bis die Tests grün sind.

1. Sag der Person in höchstens zwei Sätzen, was du baust. Dann bau es, ohne auf ein Okay zu warten.
2. Nur in ${pkg}/src/. ${UI_TASKS.includes(next.task) ? "Die Oberfläche liest Akten und schreibt nie in einen Stage-Block. Keine neuen Abhängigkeiten, kein eigener Server: Die Vorschau startet `pnpm vorschau`." : "Die Stage schreibt nur in ihren eigenen Block, hängt genau einen Trace-Eintrag an und löscht nichts."} Kommentar mit der ID an der Stelle, die sie umsetzt: \`// ${next.id}: …\`.
3. Die Tests änderst du nicht. Hältst du einen Test für falsch, stopp und sag es der Person in einem Satz: Dann ist die Anforderung unklar.
4. \`pnpm test:req ${next.id}\` muss grün sein.${next.task <= 4 ? ` Danach \`pnpm conformance ${next.task}\`. Zeigt es ⚠ fehlende Angaben, sag der Person in einem Satz, welche das sind und dass die nächste Station sie vielleicht braucht. Bau sie nicht ungefragt ein: Daraus wird eine eigene Anforderung, wenn die Person das will.` : ""}
5. \`pnpm req set ${next.id} umgesetzt <geänderte Dateien>\`. Auslegungsentscheidungen kommen als Zitatblock (\`> …\`) unter die Anforderung.
${END}`;

    case "pruefen":
      return `PRÜFEN LASSEN: ${next.id} (${pkg}).

1. Ruf den Subagenten \`verifier\` mit genau der ID ${next.id} im Vordergrund auf (Parameter \`run_in_background: false\`). Er kennt den Bauverlauf nicht und versucht, die Umsetzung zu widerlegen. Er trägt sein Ergebnis selbst ein. Prüf nicht selbst.
2. Kein Blocker: Sag der Person in einem Satz, was geprüft wurde. Sie tippt /weiter.
3. Blocker: Erklär ihn in Alltagssprache und sag, was nachgebessert werden muss: die Anforderung, der Test oder der Code. Dass der Verifier etwas findet, ist sein Job, kein Fehlschlag.
   - Code: beheben, \`pnpm test:req ${next.id}\` grün, dann erneut den verifier aufrufen.
   - Test oder Anforderung: mit der Person klären, Kriterium anpassen, \`pnpm req set ${next.id} offen\`. Dann tippt die Person /weiter und der Zyklus beginnt bei den Tests.`;

    case "sichern":
      return `SICHERN UND FREIGEBEN: ${next.id} ist geprüft.

1. \`pnpm sync publish\`. Das Skript prüft die eigenen Packages, sichert und gibt die Arbeit für die Gruppe frei. Git-Befehle brauchst du nicht.
2. Grün: Sag der Person genau das: "${next.id} ist fertig und bei der Gruppe. Tippe jetzt /clear und danach /weiter."
3. Rot: Behebe, was das Gate nennt, und ruf \`pnpm sync publish\` noch einmal auf.`;

    case "wunsch": {
      const w = next.wish;
      return `WUNSCH ${w.id} von ${w.from}: ${w.text}
Ein anderer Arbeitsplatz braucht eine Angabe aus dem Block von ${TASKS[w.toTask].name}. Er wartet darauf, deshalb kommt das zuerst.

1. Gibt es die Angabe im Block stage${w.toTask} schon (contracts/claim.schema.json nach \`pnpm contracts:build\`)? Dann: \`pnpm wunsch done ${w.id} "Gibt es schon: stage${w.toTask}.<feld>"\`.
2. Fehlt sie und gehört fachlich zu dieser Station: Frag die Person in einem Satz, ob die Station das liefern kann. Wenn ja, leg das Feld an:
   echo '{"wish":"${w.id}","task":${w.toTask},"rationale":"<ein Satz>","fragment":{"properties":{"stage${w.toTask}":{"properties":{"<feld>":{"description":"<deutsch>","type":"<typ>"}}}}}}' | pnpm contracts:add -
   Schreib dazu eine Zeile nach packages/${TASKS[w.toTask].pkg}/ideen.md: Das Feld muss eine eurer Anforderungen später setzen.
3. Gehört sie nicht hierher: \`pnpm wunsch done ${w.id} "<warum nicht, und woher die Angabe stattdessen kommt>"\`.
Sag der Person in einem Satz, was entschieden ist. Sie tippt /weiter.`;
    }

    case "uebergabe":
      return `ÜBERGABE PRÜFEN. Das Pflichtprogramm dieses Arbeitsplatzes ist geschafft.

1. \`pnpm uebergabe\`. Das Skript holt den Stand der Gruppe, schickt die Musterakten durch die eigenen Stages und lässt eine Akte durch alle Stationen laufen, die schon fertig sind.
2. Erklär der Person das Ergebnis in Alltagssprache: Bis wohin kommt die Akte? Wo bricht sie ab, und liegt das an dieser Station oder an einer anderen?
3. Liegt es an dieser Station: Das ist die nächste Anforderung (Bonus). Liegt es an einer anderen: Die Person sagt es der Kollegin am Tisch.
4. Mach Lust auf den Bonus: Ab jetzt wählt die Person selbst, was ihre Station noch können soll. Es gibt Themenkarten, und hier unterscheiden sich die Gruppen.
Die Person tippt /weiter für den Bonus.`;

    default:
      return "Kein Schritt bestimmt. Bitte die Workshop-Leitung holen.";
  }
}
