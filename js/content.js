/*
 * Atemzeit – Inhalte. Hier werden Übungen und Texte gepflegt, ohne die Logik anzufassen.
 *
 * Phasentypen: in (einatmen), out (ausatmen), hold (oben halten), holdOut (unten halten)
 * Optionale Felder pro Übung:
 *   rounds        Anzahl Atemzüge/Runden
 *   variants      Tempo-Varianten (überschreiben z. B. phases)
 *   cues          wechselnde Hinweise, cueEvery = alle n Runden weiter
 *   countdown     zeigt im Kreis rückwärts gezählte Atemzüge
 *   dim           gedimmter Modus (z. B. für Übungen am Abend)
 *   note          Hinweisbox auf der Detailseite
 */
window.APP_CONTENT = {
  appName: 'Atemzeit',
  icon: '\uD83C\uDF2C\uFE0F',
  doneIcon: '🌿',
  tagline: 'Einfache Atemübungen für Einsteiger',
  welcome: 'Willkommen! Starte mit „Der Seufzer“ – dauert nur 1 Minute.',
  storageKey: 'atemzeit',
  disclaimer: 'Atemzeit ist kein Medizinprodukt und ersetzt keine ärztliche oder psychotherapeutische Behandlung.',
  endText: 'Gönn dir noch einen Moment, bevor du weitermachst.',
  // Klangebene während der Übungen (pro Übung mit "ambient: {...}" überschreibbar)
  ambient: {
    carrier: 430,   // Grundton in Hz (linkes Ohr)
    beat: 6,        // Differenz in Hz: rechtes Ohr = 436 Hz -> wahrgenommener Puls von 6 Hz
    warmth: 0.35,   // Anteil des weichen Tons eine Oktave tiefer (215 Hz)
    volume: 0.06,   // Gesamtlautstärke (0–1), bewusst leise
    fadeIn: 4,      // Einblenden in Sekunden
    hint: 'Klang: sanfter binauraler Ton (430 Hz). Wirkt am besten mit Kopfhörern – bitte nicht zu laut.'
  },
  moods: [
    { emoji: '😣', label: 'noch angespannt' },
    { emoji: '😐', label: 'etwas ruhiger' },
    { emoji: '😌', label: 'entspannt' }
  ],

  safety: {
    mode: 'info',
    title: 'Kurz vorab',
    intro: 'Diese Übungen sind sanft und für Einsteiger gedacht. Damit sie dir guttun:',
    points: [
      'Atme ohne Anstrengung. Wenn ein Takt zu lang ist, wähle das Tempo „Leicht“ oder atme einfach in deinem Rhythmus.',
      'Wird dir schwindelig oder unwohl: Übung beenden und normal weiteratmen.',
      'Übe nicht beim Autofahren oder in Situationen, die deine volle Aufmerksamkeit brauchen.',
      'Bei Atemwegs- oder Herzerkrankungen, in der Schwangerschaft oder bei psychischen Erkrankungen sprich vorher mit deiner Ärztin oder deinem Arzt.'
    ],
    outro: 'Atemzeit ist kein Medizinprodukt. Bei anhaltender Angst, Panik oder Schlafproblemen hol dir bitte professionelle Hilfe.'
  },

  sections: [
    {
      id: 'calm',
      title: 'Calm Down – sofort ruhiger',
      intro: 'Für stressige Momente: vor einem Termin, nach einem Streit, wenn alles zu viel wird.',
      exercises: [
        {
          id: 'sigh',
          emoji: '😮‍💨',
          title: 'Der Seufzer',
          subtitle: 'Physiological Sigh · der schnellste Einstieg',
          why: 'Ein tiefer Seufzer mit langem Ausatmen ist ein natürlicher Weg, wie dein Körper Spannung abbaut. Viele spüren schon nach wenigen Atemzügen, dass es ruhiger wird.',
          steps: [
            'Atme durch die Nase tief ein.',
            'Kurz bevor du „voll“ bist: noch einmal kurz nachatmen – ein kleiner Schluck Luft obendrauf.',
            'Dann lang und langsam durch den Mund ausatmen, wie ein erleichterter Seufzer.'
          ],
          rounds: 5,
          phases: [
            { type: 'in', secs: 2.5, to: 0.82, label: 'Einatmen', sub: 'tief durch die Nase' },
            { type: 'in', secs: 1, to: 1, label: 'Noch ein Schluck', sub: 'kurz nachatmen' },
            { type: 'out', secs: 7, label: 'Ausatmen', sub: 'lang, durch den Mund' }
          ]
        },
        {
          id: 'exhale',
          emoji: '🌊',
          title: 'Länger aus als ein',
          subtitle: '4 Sekunden ein · 6 Sekunden aus',
          why: 'Wenn das Ausatmen länger dauert als das Einatmen, signalisiert das dem Körper: Alles ist sicher. Diese Übung kannst du überall unbemerkt machen.',
          steps: [
            'Setz dich bequem hin, Schultern locker.',
            'Durch die Nase einatmen, während der Kreis wächst.',
            'Langsam ausatmen, während er kleiner wird – durch Nase oder Mund.'
          ],
          rounds: 12,
          phases: [
            { type: 'in', secs: 4, label: 'Einatmen', sub: 'durch die Nase' },
            { type: 'out', secs: 6, label: 'Ausatmen', sub: 'langsam loslassen' }
          ],
          variants: [
            { name: 'Leicht', hint: '3 ein · 5 aus', phases: [
              { type: 'in', secs: 3, label: 'Einatmen', sub: 'durch die Nase' },
              { type: 'out', secs: 5, label: 'Ausatmen', sub: 'langsam loslassen' }
            ] },
            { name: 'Normal', hint: '4 ein · 6 aus', phases: [
              { type: 'in', secs: 4, label: 'Einatmen', sub: 'durch die Nase' },
              { type: 'out', secs: 6, label: 'Ausatmen', sub: 'langsam loslassen' }
            ] }
          ]
        },
        {
          id: 'box',
          emoji: '⬜',
          title: 'Box Breathing',
          subtitle: 'Ein · halten · aus · halten',
          why: 'Der gleichmäßige Viertakt gibt deinem Kopf etwas zu tun und bringt Ordnung in den Atem. Gut, wenn die Gedanken rasen.',
          steps: [
            'Stell dir ein Quadrat vor. Jede Seite ist ein Takt.',
            'Einatmen – oben kurz halten – ausatmen – unten kurz halten.',
            'Halten heißt: entspannt pausieren, nicht pressen.'
          ],
          rounds: 8,
          phases: [
            { type: 'in', secs: 4, label: 'Einatmen', sub: 'durch die Nase' },
            { type: 'hold', secs: 4, label: 'Halten', sub: 'locker bleiben' },
            { type: 'out', secs: 4, label: 'Ausatmen', sub: 'langsam' },
            { type: 'holdOut', secs: 4, label: 'Pause', sub: 'kurz leer bleiben' }
          ],
          variants: [
            { name: 'Leicht', hint: 'je 3 Sek', phases: [
              { type: 'in', secs: 3, label: 'Einatmen', sub: 'durch die Nase' },
              { type: 'hold', secs: 3, label: 'Halten', sub: 'locker bleiben' },
              { type: 'out', secs: 3, label: 'Ausatmen', sub: 'langsam' },
              { type: 'holdOut', secs: 3, label: 'Pause', sub: 'kurz leer bleiben' }
            ] },
            { name: 'Normal', hint: 'je 4 Sek', phases: [
              { type: 'in', secs: 4, label: 'Einatmen', sub: 'durch die Nase' },
              { type: 'hold', secs: 4, label: 'Halten', sub: 'locker bleiben' },
              { type: 'out', secs: 4, label: 'Ausatmen', sub: 'langsam' },
              { type: 'holdOut', secs: 4, label: 'Pause', sub: 'kurz leer bleiben' }
            ] }
          ]
        }
      ]
    }
  ]
};
