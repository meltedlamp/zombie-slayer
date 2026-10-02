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
    const plan = { moan: 6, snarl: 4, brute: 3, hiss: 3 };
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
    Narrator: { pitch: 0.86, rate: 0.9, prefer: "female", slot: 0 },
    Mara: { pitch: 1.0, rate: 0.98, prefer: "female", slot: 1 },
    June: { pitch: 1.28, rate: 1.06, prefer: "female", slot: 0 },
    Harris: { pitch: 1.06, rate: 1.02, prefer: "male", slot: 0 },
    Ellis: { pitch: 0.68, rate: 0.86, prefer: "male", slot: 1 },
    Nedra: { pitch: 0.98, rate: 0.9, prefer: "female", slot: 1 },
    Ian: { pitch: 0.84, rate: 0.74, prefer: "male", slot: 0 },
    Cal: { pitch: 0.74, rate: 0.82, prefer: "male", slot: 1 },
    Owen: { pitch: 0.62, rate: 0.86, prefer: "male", slot: 0 },
    Ruth: { pitch: 1.16, rate: 0.76, prefer: "female", slot: 1 },
    Pete: { pitch: 0.8, rate: 0.98, prefer: "male", slot: 1 },
    Voss: { pitch: 0.54, rate: 0.78, prefer: "male", slot: 0 },
  };

  function pickVoice(cast) {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;
    const en = voices.filter((v) => /^en/i.test(v.lang));
    const pool = en.length ? en : voices;
    const female = /zira|heera|samantha|victoria|karen|moira|fiona|susan|linda|hazel|aria|jenny|sara|libby|female/i;
    const male = /david|mark|ravi|guy|george|daniel|alex|fred|ryan|eric|male/i;
    const matched = pool.filter((v) => (cast.prefer === "female" ? female : male).test(v.name));
    const list = matched.length ? matched : pool;
    return list[(cast.slot || 0) % list.length] || null;
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
        filter.frequency.value = 220;
        const a = this.ctx.createOscillator();
        const b = this.ctx.createOscillator();
        a.type = "sine";
        b.type = "triangle";
        a.frequency.value = 55;
        b.frequency.value = 82;
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
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    },

    speak(text, who, opts) {
      opts = opts || {};
      const clean = String(text || "").replace(/\s+/g, " ").trim();
      if (!clean || this.muted || !window.speechSynthesis) return;
      this.lineText = clean;
      const castName = CAST[who] ? who : (who ? "Mara" : "Narrator");
      const interrupt = opts.replace !== false && (this.busy || this.queue.length);
      if (opts.replace !== false) {
        this.token += 1;
        this.queue = [];
        this.busy = false;
      } else if (!this.token) this.token = 1;
      const token = this.token;
      this.queue.push({ text: clean, who: castName, token, done: false });
      if (interrupt) {
        window.speechSynthesis.cancel();
        clearTimeout(this.speakTimer);
        this.speakTimer = setTimeout(() => { if (token === this.token) this.pumpSpeak(); }, 40);
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
      const cast = CAST[item.who] || CAST.Narrator;
      const u = new SpeechSynthesisUtterance(item.text);
      u.pitch = cast.pitch;
      u.rate = cast.rate;
      u.volume = 1;
      u.lang = "en-US";
      const voice = pickVoice(cast);
      if (voice) u.voice = voice;
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
      if (!this.droneGain || this.muted) return;
      const target = 0.012 + Math.max(0, Math.min(1, amount)) * 0.05;
      this.droneGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
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
      if (this.activeVoices >= 2) return false;
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
    window.speechSynthesis.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
  }
})(window);
