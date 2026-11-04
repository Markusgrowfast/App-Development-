/*
 * BreathEngine – Atem-Taktgeber der App "Atemzeit".
 *
 * Eine Übung besteht aus Phasen (ein / halten / aus …), die in Runden wiederholt werden.
 * Die Engine baut daraus eine flache Liste von Schritten und spielt sie zeitgenau ab.
 */
(function (global) {
  'use strict';

  // Ziel-"Füllstand" der Lunge (0 = leer, 1 = voll) je Phasentyp.
  // hold/holdOut behalten den aktuellen Stand.
  var DEFAULT_TO = { in: 1, out: 0, rest: 0.35, prep: 0 };

  function buildSteps(ex) {
    var steps = [];
    var rounds = ex.rounds || 1;
    var reps = ex.reps || 1;

    steps.push({
      type: 'prep',
      secs: ex.prepSecs != null ? ex.prepSecs : 4,
      label: 'Gleich geht’s los',
      sub: ex.prepText || 'Mach es dir bequem',
      round: 0, rounds: rounds, rep: 0, reps: reps
    });

    for (var r = 1; r <= rounds; r++) {
      var cue = null;
      if (ex.cues && ex.cues.length) {
        var ci = Math.floor((r - 1) / (ex.cueEvery || 1));
        cue = ex.cues[Math.min(ex.cues.length - 1, ci)];
      }
      for (var k = 1; k <= reps; k++) {
        for (var i = 0; i < ex.phases.length; i++) {
          var p = ex.phases[i];
          steps.push(Object.assign({}, p, {
            round: r, rounds: rounds, rep: k, reps: reps, cue: cue, phaseIndex: i
          }));
        }
      }
      if (ex.rest && (r < rounds || ex.restAfterLast)) {
        steps.push({
          type: 'rest', secs: ex.rest.secs, label: ex.rest.label, sub: ex.rest.sub,
          round: r, rounds: rounds, rep: reps, reps: reps, cue: cue
        });
      }
    }

    var level = 0;
    steps.forEach(function (s) {
      s.from = level;
      if (s.to == null) s.to = (s.type in DEFAULT_TO) ? DEFAULT_TO[s.type] : level;
      level = s.to;
    });
    return steps;
  }

  function totalSecs(steps) {
    return steps.reduce(function (sum, s) { return sum + s.secs; }, 0);
  }

  // Sanftes Ein- und Ausblenden der Bewegung
  function ease(p) { return 0.5 - 0.5 * Math.cos(Math.PI * p); }

  function Session(exercise, handlers) {
    this.steps = buildSteps(exercise);
    this.total = totalSecs(this.steps);
    this.h = handlers || {};
    this.running = false;
    this.finished = false;
    this._raf = null;
    this._tick = this._tick.bind(this);
  }

  Session.prototype.start = function () {
    this.idx = 0;
    this.stepStart = performance.now();
    this.doneSecs = 0; // Summe der abgeschlossenen Schritte
    this.running = true;
    this._enter(true);
    this._raf = requestAnimationFrame(this._tick);
  };

  Session.prototype._enter = function (live) {
    if (this.h.onStep) this.h.onStep(this.steps[this.idx], this.idx, live);
  };

  Session.prototype._tick = function (now) {
    if (!this.running) return;
    var st = this.steps[this.idx];
    var el = (now - this.stepStart) / 1000;

    while (el >= st.secs) {
      this.stepStart += st.secs * 1000;
      this.doneSecs += st.secs;
      this.idx++;
      if (this.idx >= this.steps.length) { this._finish(); return; }
      st = this.steps[this.idx];
      el = (now - this.stepStart) / 1000;
      // "live" nur, wenn wir den Schritt gerade erst betreten (nicht beim Aufholen)
      this._enter(el < 0.35);
    }

    var p = Math.min(1, el / st.secs);
    var level = st.from + (st.to - st.from) * ease(p);
    if (this.h.onFrame) {
      this.h.onFrame({
        step: st,
        level: level,
        phaseRemaining: Math.max(0, st.secs - el),
        elapsed: this.doneSecs + el,
        remaining: Math.max(0, this.total - this.doneSecs - el)
      });
    }
    this._raf = requestAnimationFrame(this._tick);
  };

  Session.prototype.pause = function () {
    if (!this.running || this.finished) return;
    this.running = false;
    this.pausedAt = performance.now();
    cancelAnimationFrame(this._raf);
  };

  Session.prototype.resume = function () {
    if (this.running || this.finished) return;
    this.stepStart += performance.now() - this.pausedAt;
    this.running = true;
    this._raf = requestAnimationFrame(this._tick);
  };

  Session.prototype.stop = function () {
    this.running = false;
    this.finished = true;
    cancelAnimationFrame(this._raf);
  };

  Session.prototype._finish = function () {
    this.running = false;
    this.finished = true;
    if (this.h.onDone) this.h.onDone();
  };

  global.BreathEngine = { buildSteps: buildSteps, totalSecs: totalSecs, Session: Session };
})(window);
