/*
 * AtemMusic – live erzeugte Chill-out-Untermalung (Web Audio, keine Audiodateien).
 * Ebenen: weiche Akkord-Flächen, tiefer Grundton, mitatmendes Meeresrauschen, vereinzelte Klangtropfen, Hall.
 * Alles ist auf den Grundton der binauralen Klangebene gestimmt (Standard: A = 430 Hz).
 * Einstellungen: js/content.js → music
 */
(function (global) {
  'use strict';

  function hz(base, semis) { return base * Math.pow(2, semis / 12); }

  // Künstlicher Hall: Rauschen mit abklingender Hüllkurve als Impulsantwort
  function impulse(ctx, secs, decay) {
    var len = Math.floor(ctx.sampleRate * secs);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Rosa-ähnliches Rauschen (weicher als weißes Rauschen) für das Meer
  function pinkNoise(ctx, secs) {
    var len = Math.floor(ctx.sampleRate * secs);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }

  var M = {
    n: null,

    start: function (ctx, cfg, opts) {
      this.stop(0);
      if (!ctx || !cfg) return;
      opts = opts || {};
      var t = ctx.currentTime;
      var n = { ctx: ctx, cfg: cfg, chord: 0, nextChordAt: t + 0.05, nextChimeAt: t + (cfg.chimeFirst || 6), paused: false, lastBreath: 0 };

      // Ausgang: Master → Kompressor (schützt vor Übersteuerung) → Lautsprecher
      n.comp = ctx.createDynamicsCompressor();
      n.comp.threshold.value = -18; n.comp.ratio.value = 3;
      n.comp.connect(ctx.destination);
      n.master = ctx.createGain();
      n.master.gain.setValueAtTime(0.0001, t);
      n.master.gain.exponentialRampToValueAtTime(cfg.volume, t + (cfg.fadeIn || 6));
      n.master.connect(n.comp);

      // Hall
      n.reverb = ctx.createConvolver();
      n.reverb.buffer = impulse(ctx, cfg.reverbSecs || 4, 2.5);
      n.wet = ctx.createGain(); n.wet.gain.value = cfg.reverbMix != null ? cfg.reverbMix : 0.7;
      n.reverb.connect(n.wet); n.wet.connect(n.master);

      // Akkord-Flächen laufen durch einen weichen Tiefpass, der sich langsam öffnet und schließt
      n.padFilter = ctx.createBiquadFilter();
      n.padFilter.type = 'lowpass'; n.padFilter.frequency.value = 850; n.padFilter.Q.value = 0.4;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
      var lfoDepth = ctx.createGain(); lfoDepth.gain.value = 300;
      lfo.connect(lfoDepth); lfoDepth.connect(n.padFilter.frequency); lfo.start(t);
      n.padBus = ctx.createGain(); n.padBus.gain.value = 1;
      n.padBus.connect(n.padFilter);
      n.padFilter.connect(n.master);
      n.padFilter.connect(n.reverb);
      n.sources = [lfo];

      // Meeresrauschen
      if (cfg.waves) {
        var src = ctx.createBufferSource();
        src.buffer = pinkNoise(ctx, 6); src.loop = true;
        n.waveFilter = ctx.createBiquadFilter();
        n.waveFilter.type = 'lowpass'; n.waveFilter.frequency.value = 500; n.waveFilter.Q.value = 0.3;
        n.waveGain = ctx.createGain(); n.waveGain.gain.value = cfg.waves * 0.3;
        src.connect(n.waveFilter); n.waveFilter.connect(n.waveGain);
        n.waveGain.connect(n.master); n.waveGain.connect(n.reverb);
        src.start(t);
        n.sources.push(src);
      }

      this.n = n;
      if (!opts.manual) {
        var self = this;
        n.timer = setInterval(function () { self.schedule(ctx.currentTime + 1); }, 250);
        this.schedule(t + 1);
      }
    },

    // Plant Akkorde und Klangtropfen bis zum Zeitpunkt "until" (für Live-Betrieb und Vorab-Rendering)
    schedule: function (until) {
      var n = this.n; if (!n) return;
      var cfg = n.cfg;
      while (n.nextChordAt < until) {
        this._chord(cfg.chords[n.chord % cfg.chords.length], n.nextChordAt, cfg.chordSecs);
        n.chord++;
        n.nextChordAt += cfg.chordSecs;
      }
      while (cfg.chimes && n.nextChimeAt < until) {
        this._chime(n.nextChimeAt);
        n.nextChimeAt += (cfg.chimeEvery || 4) + Math.random() * (cfg.chimeJitter || 5);
      }
    },

    _chord: function (semis, at, len) {
      var n = this.n, ctx = n.ctx, cfg = n.cfg;
      var base = cfg.base / 2; // eine Oktave unter dem Grundton
      var attack = cfg.attack || 3, release = cfg.release || 5;
      var end = at + len + release;
      var env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(1, at + attack);
      env.gain.setValueAtTime(1, at + len);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      env.connect(n.padBus);
      var voice = cfg.pad || 0.03;
      semis.forEach(function (s) {
        [-7, 7].forEach(function (cents) { // zwei leicht verstimmte Stimmen = weicher Chorus
          var o = ctx.createOscillator(); var g = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = hz(base, s); o.detune.value = cents;
          g.gain.value = voice;
          o.connect(g); g.connect(env); o.start(at); o.stop(end + 0.1);
        });
      });
      // tiefer, weicher Grundton des Akkords
      if (cfg.sub) {
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = hz(base / 2, semis[0]);
        g.gain.value = cfg.sub;
        o.connect(g); g.connect(env); o.start(at); o.stop(end + 0.1);
      }
    },

    _chime: function (at) {
      var n = this.n, ctx = n.ctx, cfg = n.cfg;
      var scale = cfg.chimeScale;
      var s = scale[Math.floor(Math.random() * scale.length)];
      var o = ctx.createOscillator(); var g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz(cfg.base, s);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(cfg.chimes, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 3.5);
      var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.connect(g);
      var out = g;
      if (pan) { pan.pan.value = Math.random() * 1.2 - 0.6; g.connect(pan); out = pan; }
      out.connect(n.reverb);
      var dry = ctx.createGain(); dry.gain.value = 0.35; out.connect(dry); dry.connect(n.master);
      o.start(at); o.stop(at + 3.6);
    },

    // Meeresrauschen folgt dem Atem: Einatmen = Welle rollt heran, Ausatmen = Welle zieht sich zurück
    breathe: function (level, at) {
      var n = this.n; if (!n || n.paused || !n.waveGain) return;
      var t = at != null ? at : n.ctx.currentTime;
      if (at == null && t - n.lastBreath < 0.12) return;
      n.lastBreath = t;
      n.waveGain.gain.setTargetAtTime(n.cfg.waves * (0.2 + 0.8 * level), t, 0.3);
      n.waveFilter.frequency.setTargetAtTime(350 + 1100 * level, t, 0.3);
    },

    pause: function () {
      var n = this.n; if (!n) return;
      n.paused = true;
      n.master.gain.setTargetAtTime(0.0001, n.ctx.currentTime, 0.4);
    },

    resume: function () {
      var n = this.n; if (!n) return;
      n.paused = false;
      n.master.gain.setTargetAtTime(n.cfg.volume, n.ctx.currentTime, 0.8);
    },

    stop: function (fade) {
      var n = this.n; if (!n) return;
      this.n = null;
      clearInterval(n.timer);
      var ctx = n.ctx, t = ctx.currentTime, f = Math.max(fade == null ? 2 : fade, 0.05);
      try {
        n.master.gain.cancelScheduledValues(t);
        n.master.gain.setValueAtTime(Math.max(n.master.gain.value, 0.0001), t);
        n.master.gain.exponentialRampToValueAtTime(0.0001, t + f);
        n.sources.forEach(function (s) { s.stop(t + f + 0.1); });
      } catch (e) { /* bereits beendet */ }
      setTimeout(function () { try { n.master.disconnect(); n.comp.disconnect(); } catch (e) {} }, (f + 6) * 1000);
    }
  };

  global.AtemMusic = M;
})(window);
