/* The Elephant in the Room — room-temperature sense feature page.
   Vanilla JS, zero dependencies, ES5-safe.
   Every number on this page is a real repo output: the README quickstart
   (Tap +0.29 / κ 2.04, Wheelhouse −0.05 / κ 1.96, gap 0.83, plunge +0.34)
   and the tap-nights live strip (warmth −0.24, κ 3.47, …). */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= data ================= */

  var DIAL_ORDER = ['mood', 'volume', 'earnestness', 'cynicism', 'joke_landing', 'panic', 'presence'];

  var DIALS = {
    mood: { name: 'Mood', creature: 'the Hearth-Cricket', glyph: '\uD83E\uDD97', gift: 'taught warmth', range: '\u22121 cold \u2194 +1 warm', micro: 'set the sea\u2019s temperament \u2014 calm or stormy, with a flick of the wheel.', weight: 0.30, bipolar: true, rest: -0.35, reading: 'the hearth-cricket: the room runs warm tonight.' },
    volume: { name: 'Volume', creature: 'the Cicada', glyph: '\u266A', gift: 'taught volume', range: '0 quiet \u2194 1 shouting', micro: 'gauge the roar of the waves \u2014 muted or thunderous, like a ship\u2019s horn in the dark.', weight: 0.10, bipolar: false, rest: 0.15, reading: 'the cicada: the room is talking loud enough to be heard.' },
    earnestness: { name: 'Earnestness', creature: 'the Plain-Spoken Smith', glyph: '\u2692\uFE0F', gift: 'taught earnestness', range: '0 ironic \u2194 1 sincere', micro: 'chart the depth of sincerity \u2014 compass needle pointing true or drifting with the tide.', weight: 0.10, bipolar: false, rest: 0.5, reading: 'the smith: the room means it.' },
    cynicism: { name: 'Cynicism', creature: 'the Scarecrow', glyph: '\uD83C\uDF3E', gift: 'taught the sneer', range: '0 earnest \u2194 1 sneering', micro: 'calibrate the lookout\u2019s eye \u2014 sharp as a weather vane or dulled by the fog\u2019s embrace.', weight: -0.15, bipolar: false, rest: 0.2, reading: 'the scarecrow: the room is rolling its eyes.' },
    joke_landing: { name: 'Joke Landing', creature: 'the Geese', glyph: '\uD83E\uDEBF', gift: 'taught the collective laugh', range: '\u22121 booed \u2194 +1 roared', micro: 'tweak the punchline\u2019s anchor \u2014 secure it tight or let it drift on the current\u2019s laugh.', weight: 0.15, bipolar: true, rest: 0, reading: 'the geese: the joke landed \u2014 a collective laugh.' },
    panic: { name: 'Panic', creature: 'the little Goat of Pan', glyph: '\uD83D\uDC10', gift: 'taught the stampede', range: '0 calm \u2194 1 trampling', micro: 'measure the squall\u2019s grip \u2014 tight as a storm\u2019s breath or loose as a loose mooring line.', weight: -0.10, bipolar: false, rest: 0.1, reading: 'the goat of pan: stampede sense \u2014 nothing on fire yet.' },
    presence: { name: 'Presence', creature: 'the Ant', glyph: '\uD83D\uDC1C', gift: 'taught the scent of everyone who ever passed through', range: '0 empty \u2194 1 thrumming', micro: 'feel the hull\u2019s weight \u2014 anchored in the room or floating on the edge of the tide.', weight: 0.10, bipolar: false, rest: 0.55, reading: 'the ant: someone was here, and recently.' }
  };

  var LIVE = { warmth: -0.24, kappa: 3.47, mood: -1.00, joke: 0.00, panic: 0.27, presence: 0.55 };

  var ROOM_ORDER = ['tap', 'wheelhouse', 'trivia', 'fire', 'empty'];

  var ROOMS = {
    tap: { name: 'The Tap', glyph: '\uD83C\uDF7A', warmth: 0.29, kappa: 2.04, gap: 0.00, warmthWord: null, kappaWord: null,
      field: { warmth: 0.29, kappa: 2.04, panic: 0.08, joke: 0.40, presence: 0.85 },
      dials: { mood: 0.55, volume: 0.60, earnestness: 0.55, cynicism: 0.15, joke_landing: 0.40, panic: 0.08, presence: 0.85 },
      lines: ['the pool tables hum, the darts clink, someone is telling a story everyone has heard and everyone is listening to anyway.', 'mood runs warm, the geese laugh, the ant counts the regulars \u2014 presence is high.', 'warmth +0.29 \u00B7 \u03BA 2.04 \u2014 the room means it.'] },
    wheelhouse: { name: 'The Wheelhouse', glyph: '\u2693', warmth: -0.05, kappa: 1.96, gap: 0.83, warmthWord: null, kappaWord: null,
      field: { warmth: -0.05, kappa: 1.96, panic: 0.05, joke: -0.05, presence: 0.15 },
      dials: { mood: -0.10, volume: 0.20, earnestness: 0.80, cynicism: 0.30, joke_landing: -0.05, panic: 0.05, presence: 0.15 },
      lines: ['heading 045, radar contact two miles out, no one talking louder than they have to.', 'earnest and terse \u2014 the smith\u2019s dial is high, the cicada\u2019s is low, presence is thin.', 'warmth \u22120.05 \u00B7 \u03BA 1.96 \u2014 and the gap to the tap is 0.83.'] },
    trivia: { name: 'Trivia Night', glyph: '\u2753', warmth: -0.10, kappa: 2.30, gap: null, warmthWord: 'cooler', kappaWord: 'tighter',
      field: { warmth: -0.10, kappa: 2.30, panic: 0.20, joke: 0.15, presence: 0.50 },
      dials: { mood: 0.10, volume: 0.90, earnestness: 0.50, cynicism: 0.50, joke_landing: 0.15, panic: 0.20, presence: 0.50 },
      lines: ['the buzzer, the confident answer, the silence after.', 'cynicism 0.50 and climbing \u2014 the night a confident answer was wrong, volume spiked on the buzzer and the room ran a little cold.', 'cooler, tighter \u2014 the sneer is calibrated and the room never fully recovered.'] },
    fire: { name: 'Fire in the Room', glyph: '\uD83D\uDD25', warmth: -0.55, kappa: 2.60, gap: null, warmthWord: 'cold', kappaWord: 'tight',
      field: { warmth: -0.55, kappa: 2.60, panic: 1.00, joke: -0.50, presence: 0.40 },
      dials: { mood: -1.00, volume: 1.00, earnestness: 0.10, cynicism: 0.60, joke_landing: -0.50, panic: 1.00, presence: 0.40 },
      lines: ['the stampede sense \u2014 the goat of pan is awake.', 'panic pinned at 1.00, volume maxed, mood gone cold. everyone is looking at the same door.', 'the elephant does not shout fire. it shows you the door everyone else is already looking at.'] },
    empty: { name: 'The Empty Room', glyph: '\uD83C\uDF11', warmth: 0.00, kappa: 0.00, gap: null, warmthWord: 'none yet', kappaWord: 'none yet',
      field: { warmth: 0.00, kappa: 0.00, panic: 0.00, joke: 0.00, presence: 0.00 },
      dials: { mood: 0.00, volume: 0.00, earnestness: 0.00, cynicism: 0.00, joke_landing: 0.00, panic: 0.00, presence: 0.00 },
      lines: ['no temperature yet. the ant has nothing to report \u2014 presence near zero.', 'the dials sit at the floor and wait. a room with no one in it has no reading, only potential.', 'the elephant is patient. it waits to be read.'] }
  };

  /* ================= helpers ================= */

  function $(id) { return document.getElementById(id); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fmt(v, signed, digits) {
    digits = digits == null ? 2 : digits;
    var s = v.toFixed(digits);
    if (signed && v >= 0) s = '+' + s;
    return s;
  }

  var COLD = [89, 194, 201];   /* #59c2c9 */
  var WARM = [223, 174, 98];   /* #dfae62 */
  var EMBER = [224, 120, 76];  /* #e0784c */
  var RAMP = [];
  (function () {
    for (var i = 0; i < 32; i++) {
      var t = i / 31;
      RAMP.push([Math.round(lerp(COLD[0], WARM[0], t)), Math.round(lerp(COLD[1], WARM[1], t)), Math.round(lerp(COLD[2], WARM[2], t))]);
    }
  })();
  function rampRGB(warmth) { return RAMP[Math.round(clamp((warmth + 1) / 2, 0, 1) * 31)]; }
  function mixRGB(c1, c2, t) { return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))]; }
  function rgbaStr(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  /* ================= meters (hero strip) ================= */

  var METER_KEYS = ['warmth', 'kappa', 'mood', 'joke', 'panic', 'presence'];
  var METER_SIGNED = { warmth: true, mood: true, joke: true };
  var meterEls = {};
  METER_KEYS.forEach(function (k) { meterEls[k] = document.querySelector('[data-meter="' + k + '"] .n'); });
  var meterLast = {};

  function countUpEl(el, from, to, opts) {
    opts = opts || {};
    if (!el) return;
    if (REDUCED || typeof to !== 'number' || typeof from !== 'number') {
      el.textContent = (typeof to === 'number') ? fmt(to, opts.signed, opts.digits) : String(to == null ? '\u2014' : to);
      return;
    }
    if (el._tick) cancelAnimationFrame(el._tick);
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = clamp((ts - t0) / (opts.dur || 1200), 0, 1);
      var e = 1 - Math.pow(1 - p, 3);   /* ease-out cubic */
      el.textContent = fmt(from + (to - from) * e, opts.signed, opts.digits);
      if (p < 1) { el._tick = requestAnimationFrame(step); }
      else { el._tick = null; }
    }
    setTimeout(function () { el._tick = requestAnimationFrame(step); }, opts.delay || 0);
  }

  function countUp(k, from, to, opts) {
    opts = opts || {};
    var el = meterEls[k];
    if (!el) return;
    opts.signed = !!METER_SIGNED[k];
    countUpEl(el, from, to, opts);
    if (typeof to === 'number') meterLast[k] = to;
  }

  function animateMeters(targets, opts) {
    opts = opts || {};
    var i = 0;
    METER_KEYS.forEach(function (k) {
      var to = targets[k];
      var from = (typeof meterLast[k] === 'number') ? meterLast[k] : 0;
      countUp(k, from, to, { dur: opts.dur || 900, delay: (opts.stagger || 60) * i });
      i++;
    });
  }

  function flashWarmth() {
    var el = meterEls.warmth;
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  /* ================= the seven dials ================= */

  function gaugeSVG(dial) {
    var d = DIALS[dial];
    var ticks = '';
    for (var a = -90; a <= 90; a += 15) {
      var major = (a % 45 === 0);
      var r1 = major ? 57 : 64, r2 = 70;
      var rad = a * Math.PI / 180;
      ticks += '<line x1="' + (100 + Math.sin(rad) * r1).toFixed(1) + '" y1="' + (110 - Math.cos(rad) * r1).toFixed(1) + '" x2="' + (100 + Math.sin(rad) * r2).toFixed(1) + '" y2="' + (110 - Math.cos(rad) * r2).toFixed(1) + '" stroke="#6b5430" stroke-width="' + (major ? 1.8 : 0.8) + '" stroke-linecap="round"/>';
    }
    var labels = d.bipolar ? [['\u22121', -90], ['0', 0], ['+1', 90]] : [['0', -90], ['\u00BD', 0], ['1', 90]];
    var labs = '';
    labels.forEach(function (L) {
      var rad = L[1] * Math.PI / 180;
      labs += '<text x="' + (100 + Math.sin(rad) * 79).toFixed(1) + '" y="' + (110 - Math.cos(rad) * 79 + 3).toFixed(1) + '" text-anchor="middle" font-family="\'Courier New\',monospace" font-size="8.5" fill="#6b5430">' + L[0] + '</text>';
    });
    return '<svg class="gauge" viewBox="0 0 200 130" aria-hidden="true">'
      + '<defs>'
      + '<radialGradient id="brass-' + dial + '" cx="50%" cy="40%" r="78%">'
      + '<stop offset="0%" stop-color="#ecc982"/><stop offset="45%" stop-color="#dfae62"/><stop offset="82%" stop-color="#a97f3d"/><stop offset="100%" stop-color="#7a5726"/>'
      + '</radialGradient>'
      + '<radialGradient id="face-' + dial + '" cx="50%" cy="26%" r="95%">'
      + '<stop offset="0%" stop-color="#fbf4e0"/><stop offset="100%" stop-color="#e7d9b8"/>'
      + '</radialGradient></defs>'
      + '<path d="M 6 110 A 94 94 0 0 1 194 110 Z" fill="url(#brass-' + dial + ')"/>'
      + '<path d="M 12 110 A 88 88 0 0 1 188 110 Z" fill="url(#face-' + dial + ')"/>'
      + ticks + labs
      + '<text x="100" y="98" text-anchor="middle" font-size="15" fill="rgba(96,66,30,0.55)">' + d.glyph + '</text>'
      + '<rect x="6" y="110" width="188" height="9" rx="3" fill="url(#brass-' + dial + ')"/>'
      + '<g class="drift"><g class="needle">'
      + '<line x1="100" y1="110" x2="100" y2="40" stroke="#151515" stroke-width="3" stroke-linecap="round"/>'
      + '<line x1="100" y1="110" x2="100" y2="118" stroke="#151515" stroke-width="2" stroke-linecap="round"/>'
      + '<circle cx="100" cy="110" r="7" fill="#3a2c16" stroke="#8a6527" stroke-width="1.5"/>'
      + '<circle cx="100" cy="110" r="2.4" fill="#dfae62"/>'
      + '</g></g></svg>';
  }

  var bank = $('gauge-bank');
  var gauges = {};

  function angleFor(dial, v) { return DIALS[dial].bipolar ? v * 90 : -90 + v * 180; }

  function applyNeedle(dial, v, noAnim) {
    var g = gauges[dial];
    if (!g) return;
    if (noAnim) g.needle.classList.add('noanim');
    g.needle.style.transform = 'rotate(' + angleFor(dial, v) + 'deg)';
    if (noAnim) setTimeout(function () { g.needle.classList.remove('noanim'); }, 40);
  }

  function setValue(dial, v) {
    if (!gauges[dial]) return;
    gauges[dial].value = clamp(v, DIALS[dial].bipolar ? -1 : 0, 1);
    applyNeedle(dial, gauges[dial].value);
  }

  function buildGauges() {
    if (!bank) return;
    DIAL_ORDER.forEach(function (dial) {
      var d = DIALS[dial];
      var card = document.createElement('div');
      card.className = 'gauge-card';
      card.setAttribute('data-dial', dial);
      card.innerHTML = gaugeSVG(dial)
        + '<div class="gauge-name">' + d.name + '</div>'
        + '<div class="gauge-creature">' + d.creature + '</div>';
      bank.appendChild(card);
      gauges[dial] = {
        card: card,
        drift: card.querySelector('.drift'),
        needle: card.querySelector('.needle'),
        value: d.rest,
        phase: Math.random() * Math.PI * 2,
        omega: 0.35 + Math.random() * 0.5
      };
      applyNeedle(dial, d.rest, true);
      wireGauge(dial);
    });
  }

  var tip = $('gauge-tip');
  function wireGauge(dial) {
    var g = gauges[dial];
    g.card.addEventListener('mouseenter', function (e) { showTip(dial, e); });
    g.card.addEventListener('mousemove', function (e) { moveTip(e); });
    g.card.addEventListener('mouseleave', hideTip);
    g.card.addEventListener('click', function () { sound(dial); });
  }
  function tipHTML(d) {
    return '<div class="t-creature">' + d.creature + '</div>'
      + '<div class="t-gift">' + d.gift + '</div>'
      + '<div class="t-micro">' + d.micro + '</div>'
      + '<div class="t-range">' + d.range + '</div>';
  }
  function showTip(dial, e) {
    if (!tip) return;
    tip.innerHTML = tipHTML(DIALS[dial]);
    tip.classList.add('on');
    moveTip(e);
  }
  function moveTip(e) {
    if (!tip) return;
    var x = e.clientX + 16, y = e.clientY + 14;
    if (x > window.innerWidth - 260) x = e.clientX - 250;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.classList.remove('on'); }

  /* click-to-sound: needle swings end-to-end, settles; reading in the caption
     strip; the dial's warmth-term flashes in the hero meter */
  function sound(dial) {
    var d = DIALS[dial], g = gauges[dial];
    if (!g) return;
    var hi = d.bipolar ? 0.95 : 0.97;
    var lo = d.bipolar ? -0.95 : 0.03;
    if (!REDUCED) {
      g.needle.classList.add('fast');
      applyNeedle(dial, hi);
      setTimeout(function () { applyNeedle(dial, lo); }, 260);
      setTimeout(function () {
        g.needle.classList.remove('fast');
        applyNeedle(dial, g.value);
      }, 640);
    }
    var cap = $('gauge-caption');
    if (cap) cap.textContent = d.reading + '  \u00B7  warmth ' + fmt(d.weight, true);
    flashWarmth();
  }

  /* idle drift ±2.5°, sine per-dial phase, on a wrapper so it never fights
     the transition-driven needle */
  function driftGauges(t) {
    for (var dial in gauges) {
      if (!gauges.hasOwnProperty(dial)) continue;
      var g = gauges[dial];
      var base = angleFor(dial, g.value);
      var dr = 2.5 * Math.sin(t * g.omega + g.phase);
      if (base + dr > 92) dr = 92 - base;
      if (base + dr < -92) dr = -92 - base;
      g.drift.style.transform = 'rotate(' + dr + 'deg)';
    }
  }

  /* ================= the field ================= */

  var fieldWrap = $('field-wrap');
  var fieldCanvas = $('field-canvas');
  var fctx = fieldCanvas ? fieldCanvas.getContext('2d') : null;
  var FW = 0, FH = 360;
  var agents = [];
  var ripples = [];
  var fieldVisible = true;
  var spriteCache = {};

  var FIELD = {
    warmth: 0.29, kappa: 2.04, panic: 0.08, joke: 0.40, presence: 0.85,
    tWarmth: 0.29, tKappa: 2.04, tPanic: 0.08, tJoke: 0.40, tPresence: 0.85,
    blend: 0.16, gap: 0.00,
    newcomer: { x: 0, y: 0, w: -0.29, w0: -0.29, t: 0, rate: 0.35 },
    charisma: 0
  };

  function spriteFor(c) {
    var key = c.join(',');
    if (spriteCache[key]) return spriteCache[key];
    var cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    var g = cv.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgbaStr(c, 0.9));
    gr.addColorStop(0.4, rgbaStr(c, 0.35));
    gr.addColorStop(1, rgbaStr(c, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    spriteCache[key] = cv;
    return cv;
  }

  function initAgents() {
    agents = [];
    for (var i = 0; i < 26; i++) {
      agents.push({
        bx: 24 + Math.random() * (FW - 48),
        by: 26 + Math.random() * (FH - 66),
        warmth: FIELD.warmth + (Math.random() - 0.5) * 0.5,
        presence: 0.35 + Math.random() * 0.65,
        p1: Math.random() * Math.PI * 2, p2: Math.random() * Math.PI * 2,
        w1: 0.25 + Math.random() * 0.4, w2: 0.08 + Math.random() * 0.2,
        emit: 1 + Math.random() * 5
      });
    }
  }

  /* drift = sum of two sines each */
  function agentPos(a, t) {
    return {
      x: a.bx + 26 * Math.sin(t * a.w1 + a.p1) + 14 * Math.sin(t * a.w2 + a.p2),
      y: a.by + 20 * Math.sin(t * a.w1 * 1.3 + a.p2) + 12 * Math.sin(t * a.w2 * 0.7 + a.p1)
    };
  }

  function sizeField() {
    if (!fieldWrap || !fctx) return;
    var r = fieldWrap.getBoundingClientRect();
    FW = Math.max(320, r.width);
    var dpr = window.devicePixelRatio || 1;
    fieldCanvas.width = Math.round(FW * dpr);
    fieldCanvas.height = Math.round(FH * dpr);
    fieldCanvas.style.height = FH + 'px';
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initAgents();
    ripples = [];
    FIELD.newcomer.x = FW * 0.5;
    FIELD.newcomer.y = FH * 0.36;
  }

  function updateField(dt, t) {
    if (!fctx) return;
    /* blend toward the room's params (plunge uses a slow crossfade) */
    FIELD.warmth = lerp(FIELD.warmth, FIELD.tWarmth, FIELD.blend);
    FIELD.kappa = lerp(FIELD.kappa, FIELD.tKappa, FIELD.blend);
    FIELD.panic = lerp(FIELD.panic, FIELD.tPanic, FIELD.blend);
    FIELD.joke = lerp(FIELD.joke, FIELD.tJoke, FIELD.blend);
    FIELD.presence = lerp(FIELD.presence, FIELD.tPresence, FIELD.blend);

    /* acclimation — the real curve: room + (agent − room)·e^(−rate·t) */
    var nc = FIELD.newcomer;
    if (Math.abs(nc.w - FIELD.warmth) > 0.015) {
      nc.t += dt;
      nc.w = FIELD.warmth + (nc.w0 - FIELD.warmth) * Math.exp(-nc.rate * nc.t);
    } else {
      nc.w = FIELD.warmth;
    }

    /* messages ripple — panic accelerates and reddens them */
    var ch = FIELD.charisma;
    if (FIELD.presence > 0.05) {
      agents.forEach(function (a) {
        a.emit -= dt;
        if (a.emit <= 0) {
          var p = agentPos(a, t);
          var base = 4.2 - Math.max(0, FIELD.joke) * 1.4;
          a.emit = Math.max(0.6, base * (1 - FIELD.panic * 0.65)) + Math.random() * 2.5;
          ripples.push({
            x: lerp(p.x, nc.x, clamp(ch * 2, 0, 1)),
            y: lerp(p.y, nc.y, clamp(ch * 2, 0, 1)),
            age: 0,
            color: FIELD.panic > 0.5 ? EMBER : (FIELD.warmth >= 0 ? WARM : COLD)
          });
          if (ripples.length > 40) ripples.shift();
        }
      });
    }
    for (var i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += dt;
      if (ripples[i].age >= 3) ripples.splice(i, 1);
    }

    if (fieldVisible) drawField(t);
  }

  function drawField(t) {
    var w = FW, h = FH;
    if (w < 10) return;
    var bg = fctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#02101a');
    bg.addColorStop(1, '#03141f');
    fctx.fillStyle = bg;
    fctx.fillRect(0, 0, w, h);

    var nc = FIELD.newcomer, ch = FIELD.charisma;
    var roomBase = FIELD.warmth >= 0 ? WARM : COLD;
    var roomC = mixRGB(roomBase, rampRGB(nc.w), ch * 0.6);

    /* κ halo — σ scales with (2.2 − κ): tight room, one narrow beam */
    var sigma = 2.2 - FIELD.kappa;
    var R = clamp(160 + sigma * 260, 46, 470);
    var hx = 0, hy = 0, n = 0;
    agents.forEach(function (a) {
      var p = agentPos(a, t);
      hx += p.x; hy += p.y; n++;
    });
    hx /= n; hy /= n;
    hx = lerp(hx, nc.x, ch * 0.7);
    hy = lerp(hy, nc.y, ch * 0.7);
    var aHalo = FIELD.presence > 0.05 ? 0.14 : 0.05;
    var halo = fctx.createRadialGradient(hx, hy, 0, hx, hy, R);
    halo.addColorStop(0, rgbaStr(roomC, aHalo));
    halo.addColorStop(1, rgbaStr(roomC, 0));
    fctx.fillStyle = halo;
    fctx.beginPath();
    fctx.arc(hx, hy, R, 0, Math.PI * 2);
    fctx.fill();

    /* embers — hue by warmth, size by presence */
    var dim = FIELD.presence > 0.05 ? 1 : 0.15;
    agents.forEach(function (a) {
      var p = agentPos(a, t);
      var c = rampRGB(a.warmth);
      var r = 3 + a.presence * 5;
      var spr = spriteFor(c);
      fctx.globalAlpha = (0.5 + a.presence * 0.5) * dim;
      fctx.drawImage(spr, p.x - r * 2, p.y - r * 2, r * 4, r * 4);
    });
    fctx.globalAlpha = 1;

    /* ripples */
    ripples.forEach(function (rp) {
      var rr = lerp(40, 220, rp.age / 3);
      var al = 0.4 * (1 - rp.age / 3);
      fctx.strokeStyle = rgbaStr(rp.color, al);
      fctx.lineWidth = 1.5;
      fctx.beginPath();
      fctx.arc(rp.x, rp.y, rr, 0, Math.PI * 2);
      fctx.stroke();
    });

    /* the newcomer — ring-marked, relaxing along the real acclimation curve */
    var ncC = rampRGB(nc.w);
    fctx.strokeStyle = rgbaStr(ncC, 0.9);
    fctx.lineWidth = 1.6;
    fctx.setLineDash([5, 4]);
    fctx.beginPath();
    fctx.arc(nc.x, nc.y, 13 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2);
    fctx.stroke();
    fctx.setLineDash([]);
    var spr = spriteFor(ncC);
    fctx.drawImage(spr, nc.x - 14, nc.y - 14, 28, 28);
  }

  /* ================= the sea legs ================= */

  var radarCanvas = $('radar-canvas');
  var rctx = radarCanvas ? radarCanvas.getContext('2d') : null;
  var sparkCanvas = $('spark-canvas');
  var spctx = sparkCanvas ? sparkCanvas.getContext('2d') : null;
  var sounderCanvas = $('sounder-canvas');
  var sctx = sounderCanvas ? sounderCanvas.getContext('2d') : null;

  var RADAR = { mode: 'fish', sweep: 0.3, kappa: 0.6, tKappa: 0.85, prevKappa: 0.6, spark: [], blips: [] };
  var SOUNDER = { thick: 0.8, tThick: 0.8, deviation: 0.21, tDeviation: 0.21, blobs: [], spotty: false, recover: 0 };

  function initRadar() {
    RADAR.blips = [];
    for (var i = 0; i < 8; i++) {
      RADAR.blips.push({
        a: Math.random() * Math.PI * 2,
        r: 16 + Math.random() * 18,
        tR: 16 + Math.random() * 18
      });
    }
    RADAR.spark = [];
    for (var j = 0; j < 40; j++) RADAR.spark.push(0);
  }

  function initSounder() {
    SOUNDER.blobs = [];
    for (var i = 0; i < 10; i++) {
      SOUNDER.blobs.push({ x: 0.12 + Math.random() * 0.76, y: 0.36 + Math.random() * 0.34, w: 18 + Math.random() * 26, h: 6 + Math.random() * 8, ph: Math.random() * Math.PI * 2 });
    }
  }

  function sizeCanvas(canvas, ctx) {
    if (!canvas || !ctx) return;
    var r = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function sizeRadar() { sizeCanvas(radarCanvas, rctx); }
  function sizeSounder() { sizeCanvas(sounderCanvas, sctx); }
  function sizeSpark() { sizeCanvas(sparkCanvas, spctx); }

  function updateRadar(dt) {
    if (!rctx) return;
    RADAR.sweep += dt * 0.75;
    RADAR.kappa = lerp(RADAR.kappa, RADAR.tKappa, 0.05);
    var dk = (RADAR.kappa - RADAR.prevKappa) / Math.max(dt, 0.001);
    RADAR.prevKappa = RADAR.kappa;
    RADAR.spark.push(dk);
    if (RADAR.spark.length > 40) RADAR.spark.shift();
    RADAR.blips.forEach(function (b) { b.r = lerp(b.r, b.tR, 0.05); });
    drawRadar();
    drawSpark();
    var el = $('radar-kappa');
    if (el) el.textContent = fmt(RADAR.kappa, true);
    var fd = clamp(RADAR.kappa * 0.5 + (SOUNDER.thick * 2 - 1) * 0.5, -1, 1);
    var fel = $('fishing-day');
    if (fel) fel.textContent = fmt(fd, true);
  }

  function drawRadar() {
    var w = radarCanvas.width / (window.devicePixelRatio || 1);
    var h = radarCanvas.height / (window.devicePixelRatio || 1);
    rctx.fillStyle = '#02090f';
    rctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) / 2 - 6;
    rctx.strokeStyle = 'rgba(223,174,98,0.10)';
    rctx.lineWidth = 1;
    [1 / 3, 2 / 3, 1].forEach(function (f) {
      rctx.beginPath(); rctx.arc(cx, cy, R * f, 0, Math.PI * 2); rctx.stroke();
    });
    rctx.strokeStyle = 'rgba(135,172,164,0.08)';
    rctx.beginPath(); rctx.moveTo(cx - R, cy); rctx.lineTo(cx + R, cy); rctx.stroke();
    rctx.beginPath(); rctx.moveTo(cx, cy - R); rctx.lineTo(cx, cy + R); rctx.stroke();
    for (var a = 0; a < 360; a += 30) {
      var rad = a * Math.PI / 180;
      rctx.strokeStyle = 'rgba(135,172,164,0.14)';
      rctx.beginPath();
      rctx.moveTo(cx + Math.cos(rad) * (R - 6), cy + Math.sin(rad) * (R - 6));
      rctx.lineTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R);
      rctx.stroke();
    }
    RADAR.blips.forEach(function (b) {
      var bx = cx + Math.cos(b.a) * b.r, by = cy + Math.sin(b.a) * b.r;
      var diff = Math.abs((((RADAR.sweep - b.a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      var pulse = diff < 0.09;
      rctx.fillStyle = pulse ? '#fff3d6' : 'rgba(223,174,98,0.85)';
      rctx.beginPath();
      rctx.arc(bx, by, pulse ? 4.5 : 3, 0, Math.PI * 2);
      rctx.fill();
      if (pulse) {
        rctx.strokeStyle = 'rgba(223,174,98,0.5)';
        rctx.beginPath(); rctx.arc(bx, by, 8, 0, Math.PI * 2); rctx.stroke();
      }
    });
    var sw = RADAR.sweep;
    var g = rctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(223,174,98,0.22)');
    g.addColorStop(1, 'rgba(223,174,98,0)');
    rctx.fillStyle = g;
    rctx.beginPath();
    rctx.moveTo(cx, cy);
    rctx.arc(cx, cy, R, sw - 0.55, sw);
    rctx.closePath();
    rctx.fill();
    rctx.strokeStyle = 'rgba(223,174,98,0.55)';
    rctx.lineWidth = 1.5;
    rctx.beginPath();
    rctx.moveTo(cx, cy);
    rctx.lineTo(cx + Math.cos(sw) * R, cy + Math.sin(sw) * R);
    rctx.stroke();
    rctx.fillStyle = 'rgba(223,174,98,0.9)';
    rctx.beginPath(); rctx.arc(cx, cy, 3, 0, Math.PI * 2); rctx.fill();
  }

  function drawSpark() {
    if (!spctx) return;
    var w = sparkCanvas.width / (window.devicePixelRatio || 1);
    var h = sparkCanvas.height / (window.devicePixelRatio || 1);
    spctx.fillStyle = '#02090f';
    spctx.fillRect(0, 0, w, h);
    spctx.strokeStyle = 'rgba(135,172,164,0.3)';
    spctx.setLineDash([3, 3]);
    spctx.beginPath(); spctx.moveTo(0, h / 2); spctx.lineTo(w, h / 2); spctx.stroke();
    spctx.setLineDash([]);
    var n = RADAR.spark.length;
    if (n < 2) return;
    spctx.strokeStyle = 'rgba(223,174,98,0.9)';
    spctx.lineWidth = 1.4;
    spctx.beginPath();
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * w;
      var v = clamp(RADAR.spark[i], -2, 2);
      var y = h / 2 - v * (h / 2) * 0.8;
      if (i === 0) spctx.moveTo(x, y); else spctx.lineTo(x, y);
    }
    spctx.stroke();
  }

  function updateSounder(dt) {
    if (!sctx) return;
    if (SOUNDER.recover > 0) {
      SOUNDER.recover -= dt;
      if (SOUNDER.recover <= 0) {
        SOUNDER.spotty = false;
        SOUNDER.tDeviation = 0.21;
        SOUNDER.tThick = RADAR.mode === 'fish' ? 0.8 : 0.25;
      }
    }
    SOUNDER.thick = lerp(SOUNDER.thick, SOUNDER.tThick, 0.05);
    SOUNDER.deviation = lerp(SOUNDER.deviation, SOUNDER.tDeviation, 0.1);
    drawSounder();
    var el = $('sounder-thick');
    if (el) el.textContent = fmt(SOUNDER.thick, false);
    var dev = $('deviation');
    if (dev) dev.textContent = fmt(SOUNDER.deviation, false);
  }

  function drawSounder() {
    var w = sounderCanvas.width / (window.devicePixelRatio || 1);
    var h = sounderCanvas.height / (window.devicePixelRatio || 1);
    var bg = sctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#02090f');
    bg.addColorStop(1, '#06202b');
    sctx.fillStyle = bg;
    sctx.fillRect(0, 0, w, h);
    var t = performance.now() / 1000;
    /* keel */
    sctx.fillStyle = '#0d3544';
    sctx.fillRect(0, h * 0.04, w, 5);
    /* the good-day anchor — a faint gold band */
    sctx.fillStyle = 'rgba(223,174,98,0.05)';
    sctx.fillRect(0, h * 0.38, w, h * 0.22);
    sctx.strokeStyle = 'rgba(223,174,98,0.25)';
    sctx.setLineDash([4, 5]);
    sctx.strokeRect(1, h * 0.38, w - 2, h * 0.22);
    sctx.setLineDash([]);
    /* seabed */
    sctx.fillStyle = '#062a36';
    sctx.beginPath();
    sctx.moveTo(0, h * 0.9);
    for (var x = 0; x <= w; x += 8) {
      sctx.lineTo(x, h * 0.9 + Math.sin(x * 0.03 + t * 0.4) * 3);
    }
    sctx.lineTo(w, h);
    sctx.lineTo(0, h);
    sctx.closePath();
    sctx.fill();
    /* school blobs — count and brightness by thickness */
    SOUNDER.blobs.forEach(function (b) {
      var a = 0.06 + 0.4 * SOUNDER.thick;
      var bw = b.w * (0.5 + SOUNDER.thick);
      var bh = b.h * (0.5 + SOUNDER.thick);
      var by = b.y * h + Math.sin(t * 0.8 + b.ph) * 3;
      var g = sctx.createRadialGradient(b.x * w, by, 0, b.x * w, by, Math.max(bw, 6));
      g.addColorStop(0, 'rgba(223,174,98,' + a + ')');
      g.addColorStop(1, 'rgba(223,174,98,0)');
      sctx.fillStyle = g;
      sctx.beginPath();
      sctx.ellipse(b.x * w, by, Math.max(bw, 6), Math.max(bh, 4), 0, 0, Math.PI * 2);
      sctx.fill();
    });
    /* depth ticks */
    for (var i = 1; i < 4; i++) {
      sctx.strokeStyle = 'rgba(135,172,164,0.15)';
      sctx.beginPath();
      sctx.moveTo(w - 8, h * 0.2 * i);
      sctx.lineTo(w - 2, h * 0.2 * i);
      sctx.stroke();
    }
  }

  /* ================= rooms ================= */

  var currentRoom = null;
  var roomBtns = document.querySelectorAll('.room-pill');
  var lastRail = { warmth: 0, kappa: 0 };

  function railDisplay() {
    var nc = FIELD.newcomer, ch = FIELD.charisma;
    var w = lerp(FIELD.warmth, nc.w, ch);
    var k = Math.max(0.5, FIELD.kappa - ch * 0.8);
    return { warmth: w, kappa: k, gap: FIELD.gap };
  }
  function phraseFor(w) {
    if (w >= 0.20) return 'a sauna';
    if (w >= 0.02) return 'warm room';
    if (w >= -0.15) return 'cool';
    return 'a cold plunge';
  }
  function updateRail(animate) {
    var d = railDisplay();
    if (animate) {
      countUpEl($('rail-warmth'), lastRail.warmth, d.warmth, { signed: true, dur: 900 });
      countUpEl($('rail-kappa'), lastRail.kappa, d.kappa, { signed: false, dur: 900 });
    } else {
      $('rail-warmth').textContent = fmt(d.warmth, true);
      $('rail-kappa').textContent = fmt(d.kappa, false);
    }
    lastRail.warmth = d.warmth;
    lastRail.kappa = d.kappa;
    $('rail-phrase').textContent = phraseFor(d.warmth);
  }

  function showRoomCard(r) {
    var card = $('room-card');
    if (!card) return;
    card.classList.add('fade');
    setTimeout(function () {
      card.innerHTML = '<div class="rc-title">' + r.glyph + ' ' + r.name + '</div>'
        + r.lines.map(function (l) { return '<p>' + l + '</p>'; }).join('');
      card.classList.remove('fade');
    }, REDUCED ? 0 : 220);
  }

  function updateRoomMeters(r, prev) {
    var w = r.warmthWord || r.warmth;
    var k = r.kappaWord || r.kappa;
    var g = r.gap;
    $('rm-warmth').textContent = (typeof w === 'number') ? fmt(w, true) : w;
    $('rm-kappa').textContent = (typeof k === 'number') ? fmt(k, false) : k;
    $('rm-gap').textContent = (typeof g === 'number') ? fmt(g, false) : '\u2014';
    var v = $('verdict');
    if (!v) return;
    if (prev && prev.name !== 'empty' && r.name !== 'empty') {
      var dir = r.warmth - prev.warmth;
      if (dir > 0) v.textContent = '+0.34 \u2014 walk in and it\u2019s warmer.';
      else if (dir < 0) v.textContent = '\u22120.34 \u2014 walk in and it\u2019s colder.';
      else v.textContent = '';
    } else {
      v.textContent = '';
    }
  }

  var washEl = $('wash');
  function wash(kind) {
    if (!washEl) return;
    washEl.classList.remove('warm', 'cool');
    void washEl.offsetWidth;
    washEl.classList.add(kind);
  }

  /* one function drives everything: gauges, meters, field, card, wash */
  function setRoom(name, opts) {
    opts = opts || {};
    var r = ROOMS[name];
    if (!r) return;
    var prev = currentRoom ? ROOMS[currentRoom] : null;
    currentRoom = name;

    Array.prototype.forEach.call(roomBtns, function (b) {
      b.classList.toggle('active', b.getAttribute('data-room') === name);
    });

    if (REDUCED) {
      DIAL_ORDER.forEach(function (dial) { setValue(dial, r.dials[dial]); });
    } else {
      DIAL_ORDER.forEach(function (dial, i) {
        setTimeout(function () { setValue(dial, r.dials[dial]); }, i * 60);
      });
    }

    animateMeters({
      warmth: r.warmthWord || r.warmth,
      kappa: r.kappaWord || r.kappa,
      mood: r.dials.mood,
      joke: r.dials.joke_landing,
      panic: r.dials.panic,
      presence: r.dials.presence
    }, { stagger: 60, dur: 900 });

    FIELD.tWarmth = r.field.warmth;
    FIELD.tKappa = r.field.kappa;
    FIELD.tPanic = r.field.panic;
    FIELD.tJoke = r.field.joke;
    FIELD.tPresence = r.field.presence;
    FIELD.blend = opts.plunge ? 0.05 : 0.16;
    FIELD.gap = r.gap;
    var nc = FIELD.newcomer;
    nc.w0 = nc.w;
    nc.t = 0;

    var gapEl = $('rail-gap');
    if (typeof r.gap === 'number') {
      countUpEl(gapEl, parseFloat(gapEl.textContent) || 0, r.gap, { signed: false, dur: opts.plunge ? 1400 : 800 });
    } else {
      gapEl.textContent = '\u2014';
    }
    updateRail(true);

    showRoomCard(r);
    updateRoomMeters(r, prev);

    if (!REDUCED) {
      if (prev && prev.name !== name) {
        wash(r.warmth - prev.warmth >= 0 ? 'warm' : 'cool');
      } else if (opts.plunge) {
        wash('cool');
      }
    }
  }

  /* ================= sea-leg controls ================= */

  function setMode(mode) {
    RADAR.mode = mode;
    RADAR.tKappa = mode === 'fish' ? 0.85 : -0.85;
    SOUNDER.tThick = mode === 'fish' ? 0.8 : 0.25;
    RADAR.blips.forEach(function (b) {
      b.tR = mode === 'fish' ? 16 + Math.random() * 18 : 60 + Math.random() * 32;
    });
    var btn = $('fish-toggle');
    if (btn) btn.textContent = mode === 'fish' ? '\uD83D\uDD0D switch to searching' : '\uD83D\uDC1F switch to on fish';
  }

  function spottyDay() {
    if (SOUNDER.spotty) return;
    SOUNDER.spotty = true;
    SOUNDER.tThick = 0.15;
    SOUNDER.tDeviation = 1.42;
    SOUNDER.recover = 2.6;
    var dev = $('deviation');
    if (dev) {
      dev.classList.remove('pop');
      void dev.offsetWidth;
      dev.classList.add('pop');
    }
  }

  /* ================= the auto-tour ================= */

  var tourTimer = null;
  function startTour() {
    if (REDUCED) return;
    var roomsSection = $('rooms') || $('room-selector');
    tourTimer = setInterval(function () {
      if (!roomsSection) return;
      var r = roomsSection.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;   /* not in view — wait */
      var idx = currentRoom ? ROOM_ORDER.indexOf(currentRoom) : -1;
      setRoom(ROOM_ORDER[(idx + 1) % ROOM_ORDER.length]);
    }, 12000);
  }
  document.addEventListener('pointerdown', function () {
    if (tourTimer) {
      clearInterval(tourTimer);
      tourTimer = null;
      var n = $('tour-note');
      if (n) n.textContent = 'the elephant stands down \u2014 you\u2019re driving now.';
    }
  }, { passive: true });

  /* ================= main loop ================= */

  function checkVisibility() {
    if (!fieldWrap) return;
    var r = fieldWrap.getBoundingClientRect();
    fieldVisible = r.bottom > 0 && r.top < window.innerHeight;
  }

  function onResize() {
    sizeField();
    sizeRadar();
    sizeSounder();
    sizeSpark();
    checkVisibility();
  }

  var lastTs = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    var t = ts / 1000;
    driftGauges(t);
    updateField(dt, t);
    updateRadar(dt);
    updateSounder(dt);
    requestAnimationFrame(frame);
  }

  function init() {
    buildGauges();
    sizeField();
    sizeRadar();
    sizeSounder();
    sizeSpark();
    initRadar();
    initSounder();

    /* hero strip counts up from 0, 80ms stagger */
    METER_KEYS.forEach(function (k, i) {
      countUp(k, 0, LIVE[k], { dur: 1200, delay: 80 * i });
    });
    updateRail(true);

    var accl = $('acclimation'), char = $('charisma');
    if (accl) {
      accl.addEventListener('input', function () {
        var nc = FIELD.newcomer;
        nc.rate = parseFloat(accl.value);
        nc.w0 = nc.w;
        nc.t = 0;
        var lab = $('acclim-rate');
        if (lab) lab.textContent = 'acclimation_rate ' + nc.rate.toFixed(2) + ' \u2014 the skill of modulating';
        updateRail(false);
      });
    }
    if (char) {
      char.addEventListener('input', function () {
        FIELD.charisma = parseFloat(char.value);
        var note = $('charisma-note');
        if (note) note.style.opacity = FIELD.charisma > 0.005 ? 1 : 0;
        updateRail(false);
      });
    }
    var plunge = $('plunge-btn');
    if (plunge) plunge.addEventListener('click', function () { setRoom('wheelhouse', { plunge: true }); });
    var fish = $('fish-toggle');
    if (fish) fish.addEventListener('click', function () { setMode(RADAR.mode === 'fish' ? 'search' : 'fish'); });
    var spotty = $('spotty-btn');
    if (spotty) spotty.addEventListener('click', spottyDay);
    Array.prototype.forEach.call(roomBtns, function (b) {
      b.addEventListener('click', function () { setRoom(b.getAttribute('data-room')); });
    });

    /* initial static frames (the only frames under prefers-reduced-motion) */
    if (fctx) drawField(0);
    if (rctx) updateRadar(0.016);
    if (sctx) updateSounder(0.016);

    startTour();
    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    if (!REDUCED) requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
