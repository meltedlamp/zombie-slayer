(function (root) {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function resonator() {
    let a = 0, b = 0, c = 0, y1 = 0, y2 = 0;
    return {
      set(freq, bw, sr) {
        const r = Math.exp(-Math.PI * bw / sr);
        const w = (2 * Math.PI * freq) / sr;
        b = 2 * r * Math.cos(w);
        c = -r * r;
        a = 1 - r;
      },
      step(x) {
        const y = a * x + b * y1 + c * y2;
        y2 = y1;
        y1 = y;
        return y;
      },
    };
  }

  function pitchAt(u, fStart, fEnd, shape) {
    const end = Math.max(30, fEnd);
    if (shape === "arch") {
      const peak = fStart * 1.22;
      if (u < 0.3) return fStart * Math.pow(peak / fStart, u / 0.3);
      return peak * Math.pow(end / peak, (u - 0.3) / 0.7);
    }
    if (shape === "waver") {
      const mid = (fStart + end) * 0.5;
      return mid + (fStart - mid) * Math.cos(Math.PI * u) + Math.sin(u * Math.PI * 3) * 7;
    }
    return fStart * Math.pow(end / fStart, u);
  }

  const VOICE = {
    moan: {
      dur: [1.0, 1.7], f0: [82, 112], glide: [0.7, 0.88],
      vib: [3.2, 5.2], vibDepth: [3, 8], breath: [0.16, 0.34], fry: 0.22,
      forms: [[480, 1100, 2450], [720, 1180, 2550]], bw: [80, 100, 140],
      twoSyl: 0.55, attack: 0.12, release: 0.28, shapes: ["fall", "waver", "arch"],
    },
    snarl: {
      dur: [0.34, 0.62], f0: [120, 175], glide: [0.82, 1.05],
      vib: [5.5, 8.5], vibDepth: [6, 14], breath: [0.32, 0.55], fry: 0.12,
      forms: [[520, 1650, 2500], [470, 1350, 1800]], bw: [90, 120, 160],
      twoSyl: 0.15, attack: 0.05, release: 0.22, shapes: ["arch", "fall"],
    },
    brute: {
      dur: [1.35, 2.1], f0: [46, 64], glide: [0.78, 0.9],
      vib: [2.1, 3.2], vibDepth: [1.5, 4], breath: [0.2, 0.38], fry: 0.4,
      forms: [[360, 780, 2100], [440, 900, 2200]], bw: [60, 80, 150],
      twoSyl: 0.25, attack: 0.16, release: 0.3, shapes: ["fall", "waver"],
    },
    hiss: {
      dur: [0.28, 0.48], f0: [70, 110], glide: [1.05, 1.35],
      vib: [7, 11], vibDepth: [4, 10], breath: [0.62, 0.82], fry: 0.08,
      forms: [[620, 1500, 2700], [500, 1200, 1900]], bw: [140, 160, 200],
      twoSyl: 0, attack: 0.08, release: 0.3, shapes: ["arch"],
    },
    scream: {
      dur: [0.55, 0.95], f0: [190, 280], glide: [0.72, 0.9],
      vib: [6.5, 10], vibDepth: [10, 22], breath: [0.38, 0.62], fry: 0.18,
      forms: [[780, 1750, 2900], [640, 1500, 2400]], bw: [100, 130, 170],
      twoSyl: 0.2, attack: 0.03, release: 0.38, shapes: ["fall", "arch"],
    },
  };

  function renderVoice(sr, kind, seed) {
    const rnd = mulberry32(seed);
    const spec = VOICE[kind];
    const dur = lerp(spec.dur[0], spec.dur[1], rnd());
    const n = Math.max(1, Math.floor(sr * dur));
    const data = new Float32Array(n);
    const fStart = lerp(spec.f0[0], spec.f0[1], rnd());
    const fEnd = fStart * lerp(spec.glide[0], spec.glide[1], rnd());
    const vibHz = lerp(spec.vib[0], spec.vib[1], rnd());
    const vibDep = lerp(spec.vibDepth[0], spec.vibDepth[1], rnd());
    const breath = lerp(spec.breath[0], spec.breath[1], rnd());
    const shape = spec.shapes[(rnd() * spec.shapes.length) | 0];
    const two = rnd() < spec.twoSyl;
    const res = [resonator(), resonator(), resonator(), resonator()];
    let phase = rnd();
    let lastG = 0;
    let brown = 0;
    let gurgle = 0;
    let wob = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const u = t / dur;
      let f0 = pitchAt(u, fStart, fEnd, shape);
      f0 += Math.sin(2 * Math.PI * vibHz * t) * vibDep;
      if (f0 < 30) f0 = 30;
      phase += f0 / sr;
      if (phase >= 1) {
        phase -= 1;
        if (rnd() < spec.fry) phase -= 0.3 + rnd() * 0.5;
        if (phase < -0.75) phase = -0.75;
      }
      let g = 0;
      if (phase >= 0) {
        const open = 0.38;
        if (phase < open) g = 0.5 * (1 - Math.cos(Math.PI * phase / open));
        else g = Math.cos((Math.PI * 0.5) * (phase - open) / (1 - open));
      }
      const exc = (g - lastG) * 12;
      lastG = g;
      const white = rnd() * 2 - 1;
      brown = brown * 0.97 + white * 0.03;
      if (rnd() < 0.0015) gurgle = 0.35 + rnd() * 0.6;
      gurgle *= 0.9;
      const noise = white * 0.65 + brown * 8;
      const src = exc * (1 - breath) + noise * breath + white * gurgle * 0.5;
      if ((i & 15) === 0) {
        if ((i & 63) === 0) wob = (rnd() - 0.5) * 36;
        res[0].set(lerp(spec.forms[0][0], spec.forms[1][0], u) + wob, spec.bw[0], sr);
        res[1].set(lerp(spec.forms[0][1], spec.forms[1][1], u) - wob * 0.4, spec.bw[1], sr);
        res[2].set(lerp(spec.forms[0][2], spec.forms[1][2], u), spec.bw[2], sr);
        res[3].set(lerp(190, 250, u), 70, sr);
      }
      const y = res[0].step(src) * 0.9
        + res[1].step(src) * 0.82
        + res[2].step(src) * 0.28
        + res[3].step(src) * 0.45;
      let env = 1;
      if (u < spec.attack) env = u / spec.attack;
      else if (u > 1 - spec.release) env = Math.max(0, (1 - u) / spec.release);
      env = env * env * (3 - 2 * env);
      if (two) {
        const d = (u - 0.46) / 0.055;
        env *= 1 - 0.72 * Math.exp(-d * d);
      }
      const tremor = 0.8 + 0.2 * Math.sin(2 * Math.PI * (7 + (seed % 5)) * t);
      data[i] = y * env * tremor;
    }

    let hp = 0;
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const x = data[i];
      hp = 0.995 * (hp + x - prev);
      prev = x;
      data[i] = hp;
    }
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
    if (!isFinite(peak) || peak < 1e-5) return new Float32Array(n);
    const pre = 1.35 / peak;
    let peak2 = 0;
    for (let i = 0; i < n; i++) {
      const y = Math.tanh(data[i] * pre);
      data[i] = y;
      const a = Math.abs(y);
      if (a > peak2) peak2 = a;
    }
    const gain = 0.86 / (peak2 || 1);
    const fade = Math.max(1, Math.floor(sr * 0.012));
    for (let i = 0; i < n; i++) {
      let w = 1;
      if (i < fade) w = i / fade;
      else if (i > n - fade) w = (n - i) / fade;
      data[i] *= gain * w;
    }
    return data;
  }

  function makeVoiceBank(ctx) {
    const sr = ctx.sampleRate;
    const bank = {};
    const plan = { moan: 6, snarl: 4, brute: 3, hiss: 3, scream: 2 };
    let seed = 11;
    Object.keys(plan).forEach((kind) => {
      bank[kind] = [];
      for (let i = 0; i < plan[kind]; i++) {
        const data = renderVoice(sr, kind, seed++);
        const buf = ctx.createBuffer(1, data.length, sr);
        buf.getChannelData(0).set(data);
        bank[kind].push(buf);
      }
    });
    return bank;
  }

  const CAST = {
    Narrator: { pitch: 0.96, rate: 0.91, volume: 1, prefer: "female", hints: ["aria", "sonia", "libby", "zira"], gap: 260, contour: 0.05, style: "story", breath: "open" },
    Alex: { pitch: 1.0, rate: 1.0, volume: 1, prefer: "any", hints: ["jenny", "guy", "andrew"], gap: 140, contour: 0.045, style: "plain", breath: "open" },
    Mia: { pitch: 1.12, rate: 1.05, volume: 1, prefer: "female", hints: ["jenny", "zira"], gap: 100, contour: 0.07, style: "young", breath: "open" },
    Dean: { pitch: 1.06, rate: 1.03, volume: 1, prefer: "male", hints: ["guy", "ryan", "mark"], gap: 150, contour: 0.065, style: "nervous", breath: "open" },
    Rico: { pitch: 0.9, rate: 0.98, volume: 1, prefer: "male", hints: ["david", "mark", "davis"], gap: 120, contour: 0.025, style: "blunt", breath: "tight" },
    Nora: { pitch: 1.0, rate: 0.93, volume: 1, prefer: "female", hints: ["michelle", "eva", "catherine", "zira"], gap: 200, contour: 0.05, style: "careful", breath: "open" },
    Ben: { pitch: 0.95, rate: 0.84, volume: 0.9, prefer: "male", hints: ["tony", "george", "guy"], gap: 280, contour: 0.035, style: "weak", breath: "open" },
    Sam: { pitch: 0.93, rate: 0.94, volume: 1, prefer: "male", hints: ["andrew", "christopher", "david"], gap: 180, contour: 0.03, style: "calm", breath: "open" },
    Dale: { pitch: 0.86, rate: 0.92, volume: 1, prefer: "male", hints: ["brian", "eric", "david"], gap: 160, contour: 0.02, style: "blunt", breath: "tight" },
    Helen: { pitch: 0.9, rate: 0.88, volume: 1, prefer: "female", hints: ["susan", "hazel", "sonia", "zira"], gap: 300, contour: 0.028, style: "older", breath: "open" },
    Jonah: { pitch: 1.18, rate: 0.9, volume: 0.95, prefer: "female", hints: ["ana"], gap: 220, contour: 0.055, style: "child", breath: "open" },
    Ray: { pitch: 0.88, rate: 0.99, volume: 1, prefer: "male", hints: ["fred", "daniel", "david"], gap: 90, contour: 0.015, style: "flat", breath: "tight" },
    Kane: { pitch: 0.82, rate: 0.86, volume: 0.96, prefer: "male", hints: ["davis", "brian", "david"], gap: 260, contour: 0.02, style: "low", breath: "tight" },
  };

  const ASSIGN_ORDER = ["Narrator", "Mia", "Jonah", "Helen", "Nora", "Dean", "Sam", "Rico", "Dale", "Kane", "Ben", "Ray", "Alex"];
  const FEMALE_VOICE = /zira|heera|samantha|victoria|karen|moira|fiona|susan|linda|hazel|aria|jenny|sara|libby|sonia|natasha|catherine|ana|michelle|eva|emma|ava|female|woman/i;
  const MALE_VOICE = /david|mark|ravi|guy|george|daniel|james|fred|ryan|eric|andrew|brian|davis|tony|christopher|brandon|steffan|roger|male|\bman\b/i;
  let voiceSig = "";
  const voiceByWho = new Map();
  const voiceUses = new Map();

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function currentVoices() {
    const synth = window.speechSynthesis;
    if (!synth) return [];
    const all = synth.getVoices() || [];
    const us = all.filter((v) => /^en-US/i.test(v.lang || ""));
    if (us.length) return us;
    const gb = all.filter((v) => /^en-GB/i.test(v.lang || ""));
    if (gb.length) return gb;
    const en = all.filter((v) => /^en/i.test(v.lang || "") || /english/i.test(v.name || ""));
    return en.length ? en : all.slice();
  }

  function voiceRank(v) {
    const name = v.name || "";
    let score = 0;
    if (/natural|neural/i.test(name)) score += 80;
    if (/online/i.test(name)) score += 6;
    if (/en-US/i.test(v.lang || "")) score += 24;
    else if (/en-GB/i.test(v.lang || "")) score += 14;
    else if (/^en/i.test(v.lang || "")) score += 8;
    if (/desktop/i.test(name) && !/natural|neural/i.test(name)) score -= 10;
    return score;
  }

  function genderOf(v) {
    const name = v.name || "";
    const female = FEMALE_VOICE.test(name);
    const male = MALE_VOICE.test(name);
    if (female && !male) return "female";
    if (male && !female) return "male";
    return "any";
  }

  function takeVoice(who, voice) {
    voiceByWho.set(who, voice);
    const key = voice.voiceURI || voice.name;
    voiceUses.set(key, (voiceUses.get(key) || 0) + 1);
    return voice;
  }

  function assignVoices() {
    const voices = currentVoices();
    const sig = voices.map((v) => v.voiceURI || v.name).sort().join("\n");
    if (!voices.length || (sig === voiceSig && voiceByWho.size)) return;
    voiceSig = sig;
    voiceByWho.clear();
    voiceUses.clear();
    const ranked = voices.slice().sort((a, b) => voiceRank(b) - voiceRank(a));
    function unused(list, pred) {
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        const key = v.voiceURI || v.name;
        if ((voiceUses.get(key) || 0) > 0) continue;
        if (!pred || pred(v)) return v;
      }
      return null;
    }
    ASSIGN_ORDER.forEach((name) => {
      const hints = CAST[name].hints || [];
      let found = null;
      for (let i = 0; i < hints.length && !found; i++) {
        const hint = hints[i];
        found = unused(ranked, (v) => (v.name || "").toLowerCase().indexOf(hint) !== -1);
      }
      if (found) takeVoice(name, found);
    });
    ASSIGN_ORDER.forEach((name) => {
      if (voiceByWho.has(name)) return;
      const prefer = CAST[name].prefer;
      const found = prefer === "any"
        ? unused(ranked)
        : unused(ranked, (v) => genderOf(v) === prefer);
      if (found) takeVoice(name, found);
    });
    ASSIGN_ORDER.forEach((name) => {
      if (voiceByWho.has(name)) return;
      const prefer = CAST[name].prefer;
      const pool = ranked.filter((v) => prefer === "any" || genderOf(v) === prefer || genderOf(v) === "any");
      const list = pool.length ? pool : ranked;
      let best = list[0];
      let bestN = 99;
      list.forEach((v) => {
        const n = voiceUses.get(v.voiceURI || v.name) || 0;
        if (n < bestN) { best = v; bestN = n; }
      });
      if (best) takeVoice(name, best);
    });
  }

  function shapeForSpeech(text, cast) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function breakLine(text, cast) {
    const bits = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const phrases = [];
    bits.forEach((raw) => {
      const sentence = raw.trim();
      if (!/[a-z0-9]/i.test(sentence)) return;
      const role = /\?\s*$/.test(sentence) ? "ask" : /!\s*$/.test(sentence) ? "force" : "say";
      const words = sentence.split(/\s+/).length;
      let parts = [sentence];
      const breatheAt = cast.style === "nervous" || cast.style === "weak" || cast.style === "child" ? 8 : 12;
      if (cast.breath === "open" && words > breatheAt && sentence.indexOf(",") !== -1) {
        parts = sentence.split(/,\s+/).map((p) => p.trim()).filter((p) => /[a-z0-9]/i.test(p));
      }
      parts.forEach((part, i) => {
        const last = i === parts.length - 1;
        let spoken = part;
        if (!last && !/[,.!?]$/.test(spoken)) spoken += ",";
        phrases.push({
          text: spoken,
          role: last ? role : "say",
          place: parts.length === 1 ? "fall" : (i === 0 ? "open" : (last ? "fall" : "mid")),
        });
      });
    });
    if (!phrases.length) phrases.push({ text: text, role: "say", place: "fall" });
    for (let i = 1; i < phrases.length; i++) {
      const prev = phrases[i - 1].text;
      const sentenceBreak = /[.!?]["']?$/.test(prev);
      phrases[i].wait = sentenceBreak ? cast.gap : Math.max(70, Math.round(cast.gap * 0.45));
    }
    phrases[0].wait = 0;
    return phrases;
  }

  function prosody(cast, phrase, line) {
    let pitch = cast.pitch;
    let rate = cast.rate;
    const lift = cast.contour || 0.04;
    if (phrase.role === "ask") {
      pitch += lift * 1.35;
      rate *= 0.97;
    } else if (phrase.role === "force") {
      pitch += lift * 0.45;
      rate *= cast.style === "young" ? 1.05 : 1.03;
    } else if (phrase.place === "open") {
      pitch += lift * 0.35;
      if (cast.style === "story" || cast.style === "older" || cast.style === "careful" || cast.style === "weak") rate *= 0.97;
    } else if (phrase.place === "mid") {
      pitch += lift * 0.15;
    } else {
      pitch -= lift * 0.7;
    }
    if (cast.style === "nervous" && phrase.place === "open") rate *= 1.04;
    if (phrase.role === "say" && phrase.text.split(/\s+/).length <= 2) rate *= 0.94;
    let h = 0;
    const sample = (line || "") + phrase.text;
    for (let i = 0; i < sample.length; i++) h = (h * 33 + sample.charCodeAt(i)) >>> 0;
    if (cast.style !== "flat") pitch += ((h % 5) - 2) * 0.008;
    return {
      pitch: clamp(pitch, 0.78, 1.22),
      rate: clamp(rate, 0.78, 1.15),
    };
  }

  const AudioBus = {
    ctx: null,
    master: null,
    droneGain: null,
    muted: false,
    noise: null,
    voiceBank: null,
    voiceBuilding: false,
    activeVoices: 0,
    queue: [],
    token: 0,
    busy: false,
    speaking: "",
    speakTimer: 0,
    lastError: "",

    ensure() {
      if (this.muted) return null;
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.ctx.destination);
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0.0;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 140;
        const a = this.ctx.createOscillator();
        const b = this.ctx.createOscillator();
        a.type = "sine";
        b.type = "triangle";
        a.frequency.value = 38;
        b.frequency.value = 57;
        a.connect(filter);
        b.connect(filter);
        filter.connect(this.droneGain);
        this.droneGain.connect(this.master);
        a.start();
        b.start();
        const len = this.ctx.sampleRate * 0.4;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.scheduleVoices();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.arm();
      return this.ctx;
    },

    arm() {
      if (this.armed || this.muted || !window.speechSynthesis) return;
      this.armed = true;
      const u = new SpeechSynthesisUtterance(".");
      u.volume = 0;
      u.rate = 2;
      window.speechSynthesis.speak(u);
    },

    scheduleVoices() {
      if (this.voiceBank || this.voiceBuilding || !this.ctx) return;
      this.voiceBuilding = true;
      const ctx = this.ctx;
      setTimeout(() => {
        try { this.voiceBank = makeVoiceBank(ctx); }
        catch (e) { this.voiceBank = null; }
        this.voiceBuilding = false;
      }, 30);
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.8;
      if (m) this.stopSpeak();
    },

    stopSpeak() {
      this.token += 1;
      this.queue = [];
      this.busy = false;
      this.speaking = "";
      clearTimeout(this.speakTimer);
      this.speakTimer = 0;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    },

    speak(text, who, opts) {
      opts = opts || {};
      const clean = String(text || "").replace(/\s+/g, " ").trim();
      if (!clean || this.muted || !window.speechSynthesis) return;
      this.lineText = clean;
      const castName = CAST[who] ? who : (who ? "Alex" : "Narrator");
      const cast = CAST[castName];
      assignVoices();
      const shaped = shapeForSpeech(clean, cast);
      const phrases = breakLine(shaped, cast);
      const followOn = opts.replace === false && (this.busy || this.queue.length || this.speakTimer);
      if (followOn && phrases[0]) phrases[0].wait = Math.max(phrases[0].wait || 0, Math.max(80, cast.gap || 80));
      const interrupt = opts.replace !== false && (this.busy || this.queue.length || this.speakTimer);
      if (opts.replace !== false) {
        this.token += 1;
        this.queue = [];
        this.busy = false;
        clearTimeout(this.speakTimer);
        this.speakTimer = 0;
      } else if (!this.token) this.token = 1;
      const token = this.token;
      phrases.forEach((phrase) => {
        const tune = prosody(cast, phrase, clean);
        this.queue.push({
          text: phrase.text,
          who: castName,
          token: token,
          done: false,
          pitch: tune.pitch,
          rate: tune.rate,
          volume: cast.volume,
          wait: phrase.wait || 0,
        });
      });
      if (interrupt) {
        window.speechSynthesis.cancel();
        this.speakTimer = setTimeout(() => {
          this.speakTimer = 0;
          if (token === this.token) this.pumpSpeak();
        }, 60);
      } else this.pumpSpeak();
    },

    speakSequence(lines, who) {
      (lines || []).forEach((text, i) => this.speak(text, who, { replace: i === 0 }));
    },

    pumpSpeak() {
      if (this.busy || !this.queue.length || this.muted || !window.speechSynthesis) return;
      const item = this.queue[0];
      if (item.token !== this.token) {
        this.queue.shift();
        this.pumpSpeak();
        return;
      }
      if (item.wait && !item.ready) {
        if (item.armed) return;
        item.armed = true;
        this.speakTimer = setTimeout(() => {
          this.speakTimer = 0;
          if (item.token !== this.token) return;
          item.ready = true;
          this.pumpSpeak();
        }, item.wait);
        return;
      }
      const cast = CAST[item.who] || CAST.Narrator;
      const u = new SpeechSynthesisUtterance(item.text);
      u.pitch = item.pitch || cast.pitch;
      u.rate = item.rate || cast.rate;
      u.volume = item.volume == null ? 1 : item.volume;
      const voice = voiceByWho.get(item.who) || null;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang || "en-US";
      } else u.lang = "en-US";
      this.busy = true;
      this.speaking = item.who;
      const finish = () => {
        if (item.done || item.token !== this.token) return;
        item.done = true;
        this.busy = false;
        if (this.queue[0] === item) this.queue.shift();
        if (!this.queue.length) this.speaking = "";
        this.pumpSpeak();
      };
      u.onend = finish;
      u.onerror = (ev) => {
        this.lastError = (ev && ev.error) || "error";
        if (!item.retried && this.lastError !== "interrupted" && this.lastError !== "canceled") {
          item.retried = true;
          item.done = false;
          this.busy = false;
          setTimeout(() => { if (item.token === this.token) this.pumpSpeak(); }, 50);
          return;
        }
        finish();
      };
      window.speechSynthesis.speak(u);
    },

    tension(amount) {
      if (!this.droneGain || this.muted || !this.ctx) return;
      const target = 0.02 + Math.max(0, Math.min(1, amount)) * 0.09;
      if (this._tensionTarget != null && Math.abs(this._tensionTarget - target) < 0.002) return;
      this._tensionTarget = target;
      const gain = this.droneGain.gain;
      const now = this.ctx.currentTime;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(target, now, 0.28);
    },

    heartbeat(amount) {
      const n = Math.max(0, Math.min(1, amount || 0));
      this.burst(42, 0.22, 0.1 + n * 0.16, "lowpass");
      const ctx = this.ctx;
      if (!ctx) return;
      const wait = 0.11 + (1 - n) * 0.05;
      setTimeout(() => {
        if (!this.muted) this.burst(58, 0.12, 0.05 + n * 0.08, "lowpass");
      }, wait * 1000);
    },

    burst(freq, dur, gain, type) {
      const ctx = this.ensure();
      if (!ctx || !this.noise) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = type || "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start();
      src.stop(ctx.currentTime + dur + 0.02);
    },

    swing() { this.burst(900, 0.18, 0.18, "highpass"); },
    hit() { this.burst(180, 0.16, 0.28, "lowpass"); },
    hurt() { this.burst(120, 0.28, 0.32, "lowpass"); },
    block() { this.burst(500, 0.12, 0.16, "bandpass"); },
    ui() { this.burst(1400, 0.05, 0.05, "highpass"); },

    zombie(kind, pan, volume, muff) {
      const ctx = this.ensure();
      if (!ctx || !this.voiceBank) return false;
      if (this.activeVoices >= 3) return false;
      const pool = this.voiceBank[kind] || this.voiceBank.moan;
      if (!pool || !pool.length) return false;
      const src = ctx.createBufferSource();
      src.buffer = pool[(Math.random() * pool.length) | 0];
      src.playbackRate.value = 0.9 + Math.random() * 0.22;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      const open = Math.max(0, Math.min(1, 1 - (muff || 0)));
      lp.frequency.value = 380 + open * 2600;
      const g = ctx.createGain();
      const vol = Math.max(0.001, volume || 0);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.02);
      src.connect(lp);
      let tail = lp;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan || 0));
        lp.connect(p);
        tail = p;
      }
      tail.connect(g);
      g.connect(this.master);
      this.activeVoices += 1;
      src.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); };
      src.start();
      return true;
    },
  };

  root.AudioBus = AudioBus;
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      voiceSig = "";
      voiceByWho.clear();
      voiceUses.clear();
      assignVoices();
    });
    setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth && synth.speaking && synth.paused) synth.resume();
    }, 5000);
  }
})(window);
