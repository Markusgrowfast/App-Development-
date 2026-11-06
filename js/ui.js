/*
 * Oberfläche der App "Atemzeit".
 * Die Inhalte (Übungen, Texte, Sicherheitshinweise) kommen aus js/content.js.
 */
(function () {
  'use strict';

  var C = window.APP_CONTENT;
  var $ = function (s, el) { return (el || document).querySelector(s); };

  // ---------- Speicher (nur lokal auf dem Gerät) ----------
  var store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem(C.storageKey + ':' + k);
        return v == null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(C.storageKey + ':' + k, JSON.stringify(v)); } catch (e) { /* privat-Modus o. ä. */ }
    }
  };

  // Läuft die App als native Android-/iOS-App (Capacitor)?
  var NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var CAN_VIBRATE = NATIVE || !!navigator.vibrate;

  var settings = Object.assign({ sound: true, vibrate: true, binaural: true, music: true }, store.get('settings', {}));

  // ---------- Übungen registrieren ----------
  var exercises = {};
  C.sections.forEach(function (s) {
    s.exercises.forEach(function (e) { e.sectionId = s.id; exercises[e.id] = e; });
  });
  if (C.program) {
    C.program.days.forEach(function (d) {
      d.id = 'day-' + d.day;
      d.programDay = d.day;
      d.sectionId = 'program';
      exercises[d.id] = d;
    });
  }

  function withVariant(ex, vi) {
    var v = ex.variants && ex.variants[vi];
    return v ? Object.assign({}, ex, v) : ex;
  }
  function durationOf(ex, vi) {
    return BreathEngine.totalSecs(BreathEngine.buildSteps(withVariant(ex, vi || 0)));
  }
  function fmtDur(secs) {
    var m = Math.floor(secs / 60), s = Math.round(secs % 60);
    if (s === 60) { m++; s = 0; }
    if (m === 0) return s + ' Sek';
    return s >= 30 ? '~' + (m + 1) + ' Min' : '~' + m + ' Min';
  }
  function fmtClock(secs) {
    secs = Math.ceil(secs);
    return Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
  }

  // ---------- Statistik & Serie ----------
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function history() { return store.get('history', []); }
  function streak() {
    var days = {};
    history().forEach(function (h) { days[h.day] = true; });
    var n = 0, d = new Date();
    if (!days[dayKey(d)]) d.setDate(d.getDate() - 1); // heute noch nicht geübt: Serie zählt bis gestern
    while (days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- Ton & Vibration ----------
  var Cue = {
    ctx: null,
    init: function () {
      try {
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          // iPhone: Klang auch bei aktiviertem Stummschalter abspielen (Audio Session API, neuere Safari-Versionen)
          try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* nicht unterstützt */ }
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { this.ctx = null; }
    },
    tone: function (freq, dur, vol) {
      if (!this.ctx || !settings.sound) return;
      dur = dur || 0.6; vol = vol || 0.12;
      var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    },
    buzz: function (pattern) {
      if (!settings.vibrate) return;
      // In der nativen App (Android/iOS): echte Haptik über das Capacitor-Plugin
      var H = NATIVE && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (H) {
        H.impact({ style: Array.isArray(pattern) ? 'MEDIUM' : 'LIGHT' }).catch(function () {});
        return;
      }
      if (!navigator.vibrate) return;
      try { navigator.vibrate(pattern); } catch (e) { /* nicht unterstützt */ }
    }
  };
  // Signaltöne harmonisch zum Grundton der Klangebene (Quinte, Quarte, große Terz …)
  var BASE = (C.ambient && C.ambient.carrier) || 430;
  var TONES = { in: BASE * 1.5, hold: BASE * 4 / 3, holdOut: BASE * 4 / 3, out: BASE * 1.25, rest: BASE * 0.75 };

  // ---------- Klangebene: binaurale Beats ----------
  // Links Grundton, rechts Grundton + Differenz -> mit Kopfhörern entsteht ein wahrgenommener Puls (Differenzfrequenz).
  // Weitere Ebenen (z. B. Chill-out-Musik) können später hier ergänzt werden.
  var Ambient = {
    nodes: null,
    vol: 0,
    start: function (cfg) {
      this.stop(0);
      var ctx = Cue.ctx;
      if (!ctx || !cfg || !settings.binaural) return;
      var t = ctx.currentTime;
      var master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.connect(ctx.destination);

      var merger = ctx.createChannelMerger(2);
      merger.connect(master);
      var mk = function (freq, gain, channel) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.value = gain;
        o.connect(g);
        if (channel === 'both') { g.connect(merger, 0, 0); g.connect(merger, 0, 1); }
        else g.connect(merger, 0, channel);
        o.start(t);
        return o;
      };
      var oscs = [
        mk(cfg.carrier, 1, 0),                    // links
        mk(cfg.carrier + cfg.beat, 1, 1),         // rechts
        mk(cfg.carrier / 2, cfg.warmth || 0, 'both') // warmer Grundton eine Oktave tiefer
      ];
      this.vol = cfg.volume || 0.06;
      master.gain.exponentialRampToValueAtTime(this.vol * 0.85, t + (cfg.fadeIn || 4));
      this.nodes = { master: master, oscs: oscs, merger: merger, readyAt: t + (cfg.fadeIn || 4), lastT: 0 };
    },
    // leichtes Mitatmen der Lautstärke mit dem Atemkreis
    breathe: function (level) {
      var n = this.nodes;
      if (!n || this.paused) return;
      var ctx = Cue.ctx;
      // erst nach dem Einblenden, und höchstens ~8-mal pro Sekunde
      if (ctx.currentTime < n.readyAt || ctx.currentTime - n.lastT < 0.12) return;
      n.lastT = ctx.currentTime;
      n.master.gain.setTargetAtTime(this.vol * (0.75 + 0.25 * level), ctx.currentTime, 0.25);
    },
    pause: function () {
      if (!this.nodes) return;
      this.paused = true;
      this.nodes.master.gain.setTargetAtTime(0.0001, Cue.ctx.currentTime, 0.3);
    },
    resume: function () {
      if (!this.nodes) return;
      this.paused = false;
      this.nodes.readyAt = Cue.ctx.currentTime + 1.5;
      this.nodes.master.gain.setTargetAtTime(this.vol * 0.85, Cue.ctx.currentTime, 0.6);
    },
    stop: function (fade) {
      var n = this.nodes;
      if (!n) return;
      this.nodes = null;
      this.paused = false;
      var ctx = Cue.ctx;
      var f = fade == null ? 1.5 : fade;
      var t = ctx.currentTime;
      try {
        n.master.gain.cancelScheduledValues(t);
        n.master.gain.setValueAtTime(Math.max(n.master.gain.value, 0.0001), t);
        n.master.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(f, 0.05));
        n.oscs.forEach(function (o) { o.stop(t + Math.max(f, 0.05) + 0.1); });
      } catch (e) { /* bereits beendet */ }
      setTimeout(function () { try { n.master.disconnect(); } catch (e) {} }, (f + 0.5) * 1000);
    }
  };

  // ---------- Bildschirm wach halten ----------
  var wakeLock = null;
  function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () {});
      } else if (!on && wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) { /* nicht unterstützt */ }
  }

  // ---------- Navigation ----------
  var SCREENS = ['home', 'detail', 'session', 'done'];
  var screen = 'home';
  function show(name) {
    screen = name;
    SCREENS.forEach(function (n) { $('#' + n).hidden = n !== name; });
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
  }

  // ---------- Startseite ----------
  function renderHome() {
    var s = streak();
    var total = history().length;
    var stats = total
      ? '<div class="stats"><span>' + (s > 0 ? '🔥 ' + s + (s === 1 ? ' Tag' : ' Tage') + ' in Folge' : 'Schön, dass du wieder da bist') +
        '</span><span>' + total + (total === 1 ? ' Übung' : ' Übungen') + ' gesamt</span></div>'
      : '<div class="stats"><span>' + C.welcome + '</span></div>';

    var html = '<header class="app-head"><div class="brand"><span class="brand-icon">' + C.icon + '</span>' + C.appName +
      '</div><p class="tagline">' + C.tagline + '</p>' + stats + '</header>';

    if (C.program) html += renderProgram();

    C.sections.forEach(function (sec) {
      html += '<section class="group"><h2>' + sec.title + '</h2><p class="muted">' + sec.intro + '</p><div class="cards">';
      sec.exercises.forEach(function (e) {
        html += '<button class="card" data-ex="' + e.id + '"><span class="card-emoji" aria-hidden="true">' + e.emoji +
          '</span><span class="card-body"><span class="card-title">' + e.title + '</span><span class="card-sub">' + e.subtitle +
          '</span></span><span class="card-dur">' + fmtDur(durationOf(e)) + '</span></button>';
      });
      html += '</div></section>';
    });

    html += '<footer class="foot"><button class="link" data-act="safety">Sicherheitshinweise</button>' +
      '<p class="muted small">' + C.disclaimer + '</p></footer>';
    $('#home').innerHTML = html;
  }

  function renderProgram() {
    var P = C.program;
    var done = store.get('programDone', []);
    var next = P.days.find(function (d) { return done.indexOf(d.day) === -1; });
    var dots = P.days.map(function (d) {
      var cls = done.indexOf(d.day) !== -1 ? 'done' : (next && d.day === next.day ? 'next' : '');
      return '<button class="day-dot ' + cls + '" data-ex="' + d.id + '" aria-label="Tag ' + d.day + ': ' + d.title + '">' +
        (cls === 'done' ? '✓' : d.day) + '</button>';
    }).join('');
    var cta = next
      ? '<button class="primary" data-ex="' + next.id + '">Tag ' + next.day + ' starten: ' + next.title + '</button>'
      : '<p class="program-finished">' + P.finishedText + '</p><button class="secondary" data-act="resetProgram">Programm neu starten</button>';
    return '<section class="program"><h2>' + P.title + '</h2><p class="muted">' + P.intro + '</p><div class="day-row">' + dots + '</div>' + cta + '</section>';
  }

  // ---------- Detailseite ----------
  var current = null; // { ex, variant }

  function needsGate(ex) {
    return C.safety.mode === 'gate' && C.safety.gateSections.indexOf(ex.sectionId) !== -1 && !store.get('safetyAck', false);
  }

  function openExercise(id) {
    var ex = exercises[id];
    if (!ex) { goHome(); return; }
    if (needsGate(ex)) { showSafety(function () { openExercise(id); }); return; }
    current = { ex: ex, variant: Math.min(store.get('variant:' + id, 0), ex.variants ? ex.variants.length - 1 : 0) };
    renderDetail();
    show('detail');
    if (location.hash !== '#ex/' + id) history_push('#ex/' + id);
  }

  function renderDetail() {
    var ex = current.ex;
    var html = '<div class="topbar"><button class="back" data-act="home">‹ Zurück</button></div>';
    html += '<div class="hero"><span class="hero-emoji" aria-hidden="true">' + ex.emoji + '</span><h1>' +
      (ex.programDay ? 'Tag ' + ex.programDay + ': ' : '') + ex.title + '</h1><p class="muted">' + ex.subtitle +
      ' · <span id="detail-dur">' + fmtDur(durationOf(ex, current.variant)) + '</span></p></div>';
    html += '<div class="panel"><h3>Warum?</h3><p>' + ex.why + '</p></div>';
    html += '<div class="panel"><h3>So geht’s</h3><ol class="steps">' + ex.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></div>';
    if (ex.variants) {
      html += '<div class="panel"><h3>Tempo</h3><div class="seg" role="radiogroup">' + ex.variants.map(function (v, i) {
        return '<button role="radio" aria-checked="' + (i === current.variant) + '" class="' + (i === current.variant ? 'on' : '') +
          '" data-variant="' + i + '"><strong>' + v.name + '</strong><span>' + v.hint + '</span></button>';
      }).join('') + '</div></div>';
    }
    if (ex.note) html += '<div class="panel note">' + ex.note + '</div>';
    html += '<div class="toggles">' +
      (C.ambient ? '<label class="toggle"><input type="checkbox" data-setting="binaural"' + (settings.binaural ? ' checked' : '') + '> Binaural \uD83C\uDFA7</label>' : '') +
      (C.music && window.AtemMusic ? '<label class="toggle"><input type="checkbox" data-setting="music"' + (settings.music ? ' checked' : '') + '> Musik \uD83C\uDFB5</label>' : '') +
      '<label class="toggle"><input type="checkbox" data-setting="sound"' + (settings.sound ? ' checked' : '') + '> Signaltöne</label>' +
      (CAN_VIBRATE ? '<label class="toggle"><input type="checkbox" data-setting="vibrate"' + (settings.vibrate ? ' checked' : '') + '> Vibration</label>' : '') +
      '</div>';
    if (C.ambient) html += '<p class="muted small center">' + C.ambient.hint + '</p>';
    html += '<button class="primary big" data-act="start">Starten</button>';
    $('#detail').innerHTML = html;
  }

  // ---------- Übung ----------
  var session = null;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startSession() {
    var ex = withVariant(current.ex, current.variant);
    Cue.init();
    Ambient.start(Object.assign({}, C.ambient, ex.ambient));
    if (settings.music && C.music && window.AtemMusic && Cue.ctx) {
      AtemMusic.start(Cue.ctx, Object.assign({ base: BASE }, C.music, ex.music));
    }
    keepAwake(true);
    var orb = $('#orb'), num = $('#orb-num');
    $('#sess-title').textContent = current.ex.title;
    $('#pause-btn').textContent = 'Pause';
    document.body.classList.toggle('dim', !!ex.dim);
    show('session');

    session = new BreathEngine.Session(ex, {
      onStep: function (st, idx, live) {
        $('#phase-label').textContent = st.label;
        $('#phase-sub').textContent = st.sub || '';
        $('#cue').textContent = st.cue || '';
        var counter = '';
        if (st.type === 'prep') counter = '';
        else if (st.type === 'rest') counter = 'Runde ' + st.round + ' von ' + st.rounds + ' geschafft';
        else if (st.reps > 1) counter = 'Runde ' + st.round + ' von ' + st.rounds;
        else if (!ex.countdown) counter = 'Atemzug ' + st.round + ' von ' + st.rounds;
        $('#counter').textContent = counter;
        document.body.dataset.phase = st.type;

        if (!live || st.type === 'prep') return;
        // schnelle Übungen: nur Rundenwechsel signalisieren
        var roundStart = st.type === 'rest' || (st.rep === 1 && st.phaseIndex === 0);
        if (ex.quietCues && !roundStart) return;
        Cue.tone(TONES[st.type] || 440, Math.min(0.7, st.secs * 0.8));
        if (st.type === 'in') Cue.buzz(40);
        else if (st.type === 'out') Cue.buzz([20, 80, 20]);
      },
      onFrame: function (f) {
        var st = f.step;
        if (reduceMotion) orb.style.opacity = (0.35 + 0.65 * f.level).toFixed(3);
        else orb.style.transform = 'scale(' + (0.42 + 0.58 * f.level).toFixed(4) + ')';
        Ambient.breathe(f.level);
        if (window.AtemMusic) AtemMusic.breathe(f.level);
        var n;
        if (st.type === 'prep') n = Math.ceil(f.phaseRemaining);
        else if (ex.countdown) n = st.rounds - st.round + 1;
        else if (ex.orbShows === 'rep') n = st.type === 'rest' ? Math.ceil(f.phaseRemaining) : st.rep;
        else n = Math.ceil(f.phaseRemaining);
        if (num.textContent !== String(n)) num.textContent = n;
        $('#sess-remaining').textContent = fmtClock(f.remaining);
      },
      onDone: function () { finishSession(); }
    });
    session.start();
  }

  function stopSession(fade) {
    if (session) session.stop();
    session = null;
    Ambient.stop(fade);
    if (window.AtemMusic) AtemMusic.stop(fade);
    keepAwake(false);
    document.body.classList.remove('dim');
    delete document.body.dataset.phase;
  }

  function togglePause() {
    if (!session) return;
    if (session.running) { session.pause(); Ambient.pause(); if (window.AtemMusic) AtemMusic.pause(); $('#pause-btn').textContent = 'Weiter'; $('#phase-sub').textContent = 'Pausiert'; }
    else { Cue.init(); session.resume(); Ambient.resume(); if (window.AtemMusic) AtemMusic.resume(); $('#pause-btn').textContent = 'Pause'; }
  }

  var lastEntry = null;
  function finishSession() {
    var ex = current.ex;
    stopSession(4); // Klang am Ende langsam ausklingen lassen
    Cue.tone(BASE, 1.6, 0.1);
    setTimeout(function () { Cue.tone(BASE * 1.5, 2, 0.07); }, 300);

    var h = history();
    lastEntry = { day: dayKey(), ts: Date.now(), id: ex.id, mood: null };
    h.push(lastEntry);
    store.set('history', h.slice(-500));

    if (ex.programDay) {
      var done = store.get('programDone', []);
      if (done.indexOf(ex.programDay) === -1) done.push(ex.programDay);
      store.set('programDone', done);
    }

    var end = ex.endText || C.endText;
    var html = '<div class="done-wrap"><div class="done-icon" aria-hidden="true">' + C.doneIcon + '</div><h1>Geschafft</h1><p>' + end + '</p>';
    html += '<p class="mood-q">Wie fühlst du dich jetzt?</p><div class="moods">' + C.moods.map(function (m, i) {
      return '<button data-mood="' + (i + 1) + '"><span class="mood-emoji" aria-hidden="true">' + m.emoji + '</span><span>' + m.label + '</span></button>';
    }).join('') + '</div><p class="mood-thanks" id="mood-thanks" hidden>Danke! Achte mal darauf, wie sich das über die Tage verändert.</p>';
    html += '<button class="primary" data-act="home">Zur Übersicht</button></div>';
    $('#done').innerHTML = html;
    document.body.classList.toggle('night', !!ex.dim);
    show('done');
  }

  // ---------- Sicherheit ----------
  function showSafety(onAccept) {
    var S = C.safety;
    var gate = S.mode === 'gate' && onAccept;
    var html = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="safety-title"><h2 id="safety-title">' + S.title + '</h2>' +
      '<p>' + S.intro + '</p><ul>' + S.points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
    if (S.notFor) html += '<p class="warn-title">' + S.notForTitle + '</p><ul class="warn">' + S.notFor.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
    if (S.outro) html += '<p class="muted small">' + S.outro + '</p>';
    if (gate) {
      html += '<label class="check"><input type="checkbox" id="safety-check"> ' + S.checkLabel + '</label>' +
        '<div class="sheet-actions"><button class="secondary" data-act="closeSafety">Abbrechen</button>' +
        '<button class="primary" id="safety-ok" disabled>Weiter</button></div>';
    } else {
      html += '<div class="sheet-actions"><button class="primary" id="safety-ok">Verstanden</button></div>';
    }
    html += '</div>';
    var ov = $('#safety');
    ov.innerHTML = html;
    ov.hidden = false;
    var ok = $('#safety-ok');
    if (gate) $('#safety-check').addEventListener('change', function (e) { ok.disabled = !e.target.checked; });
    ok.addEventListener('click', function () {
      store.set('safetyAck', true);
      store.set('safetySeen', true);
      ov.hidden = true;
      if (onAccept) onAccept();
    });
    ok.focus();
  }

  // ---------- Routing ----------
  function history_push(hash) {
    try { history.pushState(null, '', hash); } catch (e) { location.hash = hash; }
  }
  function goHome() {
    if (screen === 'session') stopSession();
    document.body.classList.remove('night');
    if (location.hash) history_push(location.pathname + location.search);
    renderHome();
    show('home');
  }
  function route() {
    var m = /^#ex\/(.+)$/.exec(location.hash);
    if (screen === 'session') stopSession();
    document.body.classList.remove('night');
    if (m && exercises[m[1]]) openExercise(m[1]);
    else { renderHome(); show('home'); }
  }
  window.addEventListener('popstate', route);

  // ---------- Klicks ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ex],[data-act],[data-variant],[data-mood]');
    if (!t) return;
    if (t.dataset.ex) { openExercise(t.dataset.ex); return; }
    if (t.dataset.variant) {
      current.variant = +t.dataset.variant;
      store.set('variant:' + current.ex.id, current.variant);
      renderDetail();
      return;
    }
    if (t.dataset.mood) {
      if (lastEntry) {
        var h = history();
        var last = h[h.length - 1];
        if (last && last.ts === lastEntry.ts) { last.mood = +t.dataset.mood; store.set('history', h); }
      }
      document.querySelectorAll('[data-mood]').forEach(function (b) { b.classList.toggle('on', b === t); });
      $('#mood-thanks').hidden = false;
      return;
    }
    switch (t.dataset.act) {
      case 'home': goHome(); break;
      case 'start': startSession(); break;
      case 'stop': stopSession(); renderDetail(); show('detail'); break;
      case 'pause': togglePause(); break;
      case 'safety': showSafety(null); break;
      case 'closeSafety': $('#safety').hidden = true; break;
      case 'resetProgram': store.set('programDone', []); renderHome(); break;
    }
  });

  document.addEventListener('change', function (e) {
    var k = e.target.dataset && e.target.dataset.setting;
    if (!k) return;
    settings[k] = e.target.checked;
    store.set('settings', settings);
  });

  // Wenn die App in den Hintergrund geht: automatisch pausieren
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && session && session.running) togglePause();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#safety').hidden && C.safety.mode === 'gate') $('#safety').hidden = true;
    if (e.key === ' ' && screen === 'session') { e.preventDefault(); togglePause(); }
  });

  // ---------- Start ----------
  route();
  if (C.safety.mode === 'info' && !store.get('safetySeen', false)) showSafety(null);

  // Offline-Cache nur für die Web-Version; die native App hat alle Dateien schon an Bord
  if (!NATIVE && 'serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
