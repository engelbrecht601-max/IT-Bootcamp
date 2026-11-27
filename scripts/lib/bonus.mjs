// Themenkarten für den Bonus (Level 6). Nach dem Pflichtprogramm wählt die Person eine Karte oder
// bringt eine eigene Idee mit. Die Karten nennen ein Thema und wonach man die Fachperson fragen kann,
// nie die Regel selbst: Die kommt aus dem Interview. So bauen die Gruppen Verschiedenes.
export const BONUS_CARDS = {
  1: [
    { title: "Eilt!", text: "Manche Meldungen dürfen nicht liegen bleiben. Welche, und woran erkennt die Aufnahme sie?" },
    { title: "Wo ist es passiert?", text: "Schadenort und versichertes Gebäude passen nicht immer zusammen. Was dann?" },
    { title: "Zeugen und Polizei", text: "Was hält die Aufnahme fest, wenn jemand den Schaden gesehen hat oder die Polizei da war?" },
    { title: "Uhrzeit", text: "Bei Glätte zählt, wann genau jemand gestürzt ist. Was braucht die nächste Station dazu?" },
    { title: "Am Telefon aufgenommen", text: "Eine Mitschrift ist etwas anderes als ein Formular. Wie wird das kenntlich?" },
  ],
  2: [
    { title: "Bekannter Mangel", text: "Die lose Stufe war seit Monaten gemeldet. Ändert das etwas an der Deckung?" },
    { title: "Falsche Versicherung", text: "Hund, Öltank, Familie: Wofür ist die Gebäudehaftpflicht nicht zuständig, und wer dann?" },
    { title: "Wie viel höchstens?", text: "Gibt es eine Obergrenze je Schadenfall, und muss die Bewertung sie kennen?" },
    { title: "Glätte außerhalb der Streuzeit", text: "Wann muss überhaupt gestreut sein, und was sagt die Deckung dazu?" },
    { title: "Ablehnung mit Wegweiser", text: "Was muss in einer guten Begründung stehen, damit der Kunde weiß, wohin er sich wenden kann?" },
  ],
  3: [
    { title: "Mehr Verletzungen", text: "Die Tabelle kennt mehr als zwei Einträge. Welche, und was gilt bei mehreren Verletzungen?" },
    { title: "Sehr alte Sachen", text: "Bleibt es bei einem festen Abzug, egal wie alt etwas ist?" },
    { title: "Auto in der Werkstatt", text: "Der Wagen fehlt eine Woche. Gibt es dafür Geld?" },
    { title: "Arzt- und Behandlungskosten", text: "Was erkennt die Bewertung neben Schmerzensgeld und Verdienstausfall an?" },
    { title: "Mitverschulden", text: "Wann trägt der Geschädigte selbst einen Teil, und was gilt, wenn mehrere Kürzungen zusammenkommen?" },
  ],
  4: [
    { title: "Zahlschreiben", text: "Nicht nur Ablehnungen brauchen ein Schreiben. Was steht drin, wenn gezahlt wird?" },
    { title: "Zahlung unter Vorbehalt", text: "Was ändert sich am Schreiben, wenn die Deckung nur unter Vorbehalt bestand?" },
    { title: "Regress in Zahlen", text: "Wie viel ist bei den Mietern zu holen, und wo wird das festgehalten?" },
    { title: "Wiedervorlage", text: "Ein Vorgang geht zurück an die Bewertung. Wann schaut die Regulierung wieder drauf?" },
    { title: "Der gute Ton", text: "Wie klingt ein Ablehnungsschreiben, über das sich niemand beschwert?" },
  ],
  5: [
    { title: "Eigene Marke", text: "Name, Farben, Logo: Wie soll die Oberfläche eurer Versicherung aussehen?" },
    { title: "Suchen und sortieren", text: "Das Team sucht einen Vorgang. Wonach, und was steht oben in der Liste?" },
    { title: "Zahlen auf einen Blick", text: "Was will die Teamleitung über alle Vorgänge wissen, ohne zu zählen?" },
    { title: "Drucken", text: "Manche Akten gehen auf Papier in die Besprechung. Wie sieht das aus?" },
    { title: "Unterwegs", text: "Der Außendienst schaut am Tablet. Was muss dann anders sein?" },
  ],
  6: [
    { title: "Fehler beim Tippen abfangen", text: "Was tippen Kundinnen und Kunden am häufigsten falsch, und wie hilft das Formular schon vorher?" },
    { title: "Nur fragen, was passt", text: "Wer ein Auto meldet, braucht keine Frage nach Verletzungen. Wie führt das Formular?" },
    { title: "Bestätigung", text: "Was sieht die meldende Person nach dem Absenden, und was kann sie damit anfangen?" },
    { title: "Eigene Marke", text: "Name, Farben, Ton: Wie spricht eure Versicherung ihre Kundschaft an?" },
  ],
};

/** Karten eines Tasks, ab der `offset`-ten reihum, damit nicht immer dieselben oben stehen. */
export function bonusCards(task, offset = 0, count = 3) {
  const cards = BONUS_CARDS[task] ?? [];
  if (!cards.length) return [];
  return Array.from({ length: Math.min(count, cards.length) }, (_, i) => cards[(offset + i) % cards.length]);
}
