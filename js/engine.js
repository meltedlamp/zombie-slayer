(function (root) {
  const SAVE = "zombie-slayer-harrow-1";
  const MUTE = "zombie-slayer-muted";
  const TYPES = {
    shambler: { hp: 40, speed: 1.42, dmg: 11, windup: 0.48, range: 1.32, lean: 0.34, scale: 1, cloth: 0x3a3c36, skin: 0x6a7264 },
    runner: { hp: 28, speed: 3.05, dmg: 13, windup: 0.28, range: 1.42, lean: 0.48, scale: 0.96, cloth: 0x5c4038, skin: 0x7a655c },
    brute: { hp: 120, speed: 1.02, dmg: 20, windup: 0.62, range: 1.75, lean: 0.16, scale: 1.32, cloth: 0x2a2826, skin: 0x596056 },
    raider: { hp: 56, speed: 2.35, dmg: 13, windup: 0.36, range: 1.45, lean: 0, scale: 1, cloth: 0x4a4038, skin: 0xc4a484, human: true, gun: true },
  };
  const SPEAKER = { June: "june", Harris: "harris", Ellis: "ellis", Cal: "cal", Nedra: "nedra", Ian: "ian", Owen: "owen", Ruth: "ruth", Voss: "voss", Pete: "pete" };

  const player = {
    mesh: null, sword: null, hp: 100, stamina: 100, staminaDelay: 0,
    attack: 0, attackDur: 0.4, combo: 0, queue: false, weak: false,
    dodge: 0, dodgeDir: new THREE.Vector3(), iframe: 0, blocking: false, flinch: 0,
    flinch: 0, fall: 0,
    hitThis: new Set(),
  };

  let renderer, scene, camera, hemi, moon, amb;
  let propsRoot, actorRoot, peopleRoot, followRoot;
  let solids = [], markers = {}, points = [], peopleDefs = [], bounds = { x: 16, z: 16 };
  let lastStart = { x: 0, z: 8, yaw: 0 };
    let camDist = 5.5;
  let currentArenaId = "";
  let zombies = [];
  let allies = [];
  let bullets = [];
  let state = null;
  let mode = "title";
  let current = null;
  let whyNow = "enter";
  let yaw = 0, pitch = -0.06, time = 0, trauma = 0, titleTime = 0, titleVoice = 2.4;
  let keys = new Set();
  let rmb = false;
  let journalOpen = false;
  let modeBeforeJournal = "play";
  let cardTimer = 0;
  let winTimer = 0;
  let lookLeft = 0;
  let tipLeft = 0;
  let lines = [], lineIndex = 0, visibleChoices = [], choicesUp = false, fullLine = "", shownChars = 0, speakerNow = "";
  let voiceHold = false;
  let rain = null;
  let ash = null;
  let markerMesh = null;
  let exploreDone = false;
  let simReady = false;
  let flickerLights = [];
  let fogBase = 0x10080c;
  let heart = 1.2;
  let rim = null;

  const $ = (id) => document.getElementById(id);
  const ui = {};

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function flatVectors() {
    axisF.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    axisR.set(Math.cos(yaw), 0, -Math.sin(yaw));
    return { f: axisF, r: axisR };
  }

  function disposeObj(o) {
    o.traverse((c) => {
      if (c.geometry && !c.geometry.userData.keep) c.geometry.dispose();
      if (!c.material) return;
      const ms = Array.isArray(c.material) ? c.material : [c.material];
      ms.forEach((m) => {
        if (m.userData && m.userData.shared) return;
        if (m.map && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
        m.dispose();
      });
    });
  }

  function clearGroup(g) {
    while (g.children.length) {
      const o = g.children[0];
      g.remove(o);
      disposeObj(o);
    }
  }

  const shadowProxyGeo = new THREE.CapsuleGeometry(0.34, 0.82, 2, 5);
  shadowProxyGeo.userData.keep = true;
  const shadowProxyMat = new THREE.MeshBasicMaterial();
  shadowProxyMat.colorWrite = false;
  shadowProxyMat.depthWrite = false;
  shadowProxyMat.userData.shared = true;
  const fleshCache = new Map();
  const axisF = new THREE.Vector3();
  const axisR = new THREE.Vector3();
  const camDesired = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const camTalk = new THREE.Vector3();
  const fearColor = new THREE.Color();
  const fearHot = new THREE.Color(0x3a0808);
  let labelsShown = null;

  function matStd(color) {
    return new THREE.MeshLambertMaterial({ color });
  }

  function attachShadow(g) {
    const proxy = new THREE.Mesh(shadowProxyGeo, shadowProxyMat);
    proxy.position.y = 0.95;
    proxy.castShadow = true;
    proxy.receiveShadow = false;
    g.add(proxy);
    g.traverse((c) => {
      if (!c.isMesh || c === proxy) return;
      c.castShadow = false;
      c.receiveShadow = false;
    });
  }

  function makeLabel(text) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 512, 128);
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(56, 28, 400, 72);
    g.font = "48px Georgia";
    g.fillStyle = "#e6dccb";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(1.15, 0.28, 1);
    s.position.y = 2.28;
    s.userData.isLabel = true;
    return s;
  }

  function addPart(parent, geometry, material, x, y, z, rx, ry, rz) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) mesh.rotation.set(rx || 0, ry || 0, rz || 0);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function katanaBlade() {
    const s = new THREE.Shape();
    s.moveTo(-0.018, 0.02);
    s.lineTo(0.028, 0.02);
    s.lineTo(0.086, 0.14);
    s.lineTo(0.092, 0.46);
    s.lineTo(0.05, 0.78);
    s.lineTo(0.016, 1.0);
    s.lineTo(0.0, 1.1);
    s.lineTo(-0.012, 0.92);
    s.lineTo(-0.026, 0.5);
    s.lineTo(-0.02, 0.08);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
      curveSegments: 8,
    });
    geo.translate(0, 0, -0.01);
    return geo;
  }

  function makeSword(pivot) {
    const steel = new THREE.MeshPhongMaterial({ color: 0xd5dde4, shininess: 46, specular: 0x9aa3aa, emissive: 0x3a4248, emissiveIntensity: 0.35 });
    const darkSteel = matStd(0x2c3136, 0.4, 0.7);
    const wrap = matStd(0x2a1a12, 0.94, 0);
    const cord = matStd(0x14110f, 0.8, 0.15);
    const brass = matStd(0x6a5432, 0.38, 0.72);
    const blade = addPart(pivot, katanaBlade(), steel, 0, 0, 0, -Math.PI / 2);
    addPart(blade, new THREE.BoxGeometry(0.014, 0.78, 0.006), darkSteel, -0.004, 0.5, 0.012);
    const stain = addPart(blade, new THREE.BoxGeometry(0.03, 0.16, 0.008), matStd(0x4a1814, 0.55, 0.35), 0.02, 0.72, 0.01);
    stain.rotation.z = 0.4;
    addPart(pivot, new THREE.CylinderGeometry(0.09, 0.09, 0.028, 8), darkSteel, 0, 0, -0.01, Math.PI / 2);
    addPart(pivot, new THREE.BoxGeometry(0.05, 0.11, 0.04), darkSteel, -0.1, 0.02, -0.01);
    addPart(pivot, new THREE.BoxGeometry(0.05, 0.11, 0.04), darkSteel, 0.1, 0.02, -0.01);
    addPart(pivot, new THREE.CylinderGeometry(0.032, 0.036, 0.05, 8), brass, 0, 0, 0.02, Math.PI / 2);
    addPart(pivot, new THREE.CylinderGeometry(0.034, 0.038, 0.24, 8), wrap, 0, 0, 0.16, Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      addPart(pivot, new THREE.TorusGeometry(0.04, 0.007, 4, 8), cord, 0, 0, 0.08 + i * 0.05, 0, Math.PI / 2);
    }
    const pommel = addPart(pivot, new THREE.SphereGeometry(0.05, 8, 6), brass, 0, 0, 0.3);
    pommel.scale.set(1, 0.72, 1.2);
  }

  function hashRand(seed) {
    let s = (seed || 1) % 2147483646;
    if (s < 1) s = 1;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function fleshMaterial(hex, seed, kind) {
    const key = kind + ":" + (hex >>> 0) + ":" + ((seed || 1) % 3);
    const cached = fleshCache.get(key);
    if (cached) return cached;
    const rnd = hashRand(seed);
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    const base = new THREE.Color(hex);
    base.offsetHSL(((seed % 7) - 3) * 0.012, -0.04, ((seed % 5) - 2) * 0.03 - 0.06);
    g.fillStyle = "#" + base.getHexString();
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rnd() < 0.55
        ? "rgba(18, 24, 14, " + (0.2 + rnd() * 0.4) + ")"
        : "rgba(92, 64, 52, " + (0.12 + rnd() * 0.22) + ")";
      g.beginPath();
      g.ellipse(rnd() * size, rnd() * size, 4 + rnd() * 22, 3 + rnd() * 14, rnd() * 6, 0, Math.PI * 2);
      g.fill();
    }
    const sores = kind === "runner" ? 8 : kind === "brute" ? 14 : 10;
    for (let i = 0; i < sores; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const rad = 3 + rnd() * 10;
      const wound = g.createRadialGradient(x, y, 1, x, y, rad);
      wound.addColorStop(0, "rgba(28, 4, 4, 0.9)");
      wound.addColorStop(0.45, "rgba(110, 16, 12, 0.75)");
      wound.addColorStop(1, "rgba(70, 18, 14, 0)");
      g.fillStyle = wound;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "rgba(22, 28, 16, 0.55)";
    g.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(rnd() * size, rnd() * size);
      g.bezierCurveTo(rnd() * size, rnd() * size, rnd() * size, rnd() * size, rnd() * size, rnd() * size);
      g.stroke();
    }
    const map = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
    map.userData.shared = true;
    const skinMat = new THREE.MeshLambertMaterial({ map, color: 0xffffff });
    skinMat.userData.shared = true;
    fleshCache.set(key, skinMat);
    return skinMat;
  }

  function makeFigure(opts) {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);
    const zombie = !!opts.zombie;
    const kind = opts.kind || (zombie ? "shambler" : "human");
    let seed = opts.seed >>> 0;
    if (!seed) seed = 1 + Math.floor(Math.random() * 9000);
    const bulky = (opts.scale || 1) >= 1.2;
    const lanky = zombie && (opts.scale || 1) < 0.99;
    const broad = (opts.broad || 1) * (bulky ? 1.22 : 1);
    const skinHex = opts.skin || (zombie ? 0x6a7264 : 0xc4a484);
    const skin = zombie ? fleshMaterial(skinHex, seed, kind) : matStd(skinHex, 0.78);
    const cloth = matStd(opts.color || 0x33302c, 0.9);
    const leatherCol = new THREE.Color(opts.color || 0x33302c).lerp(new THREE.Color(zombie ? 0x14110e : 0x2a2118), zombie ? 0.72 : 0.5);
    const leather = matStd(leatherCol.getHex(), 0.84, 0.04);
    const hairMat = matStd(opts.hair || (zombie ? 0x12100e : 0x1a1614), 1);
    const metal = matStd(0x3e444a, 0.35, 0.62);
    const gore = new THREE.MeshLambertMaterial({ color: 0x5a1614, emissive: 0x2a0808, emissiveIntensity: 0.45 });
    const bone = matStd(0xc8c0b0, 0.7, 0.05);
    const armR = bulky ? 0.105 : lanky ? 0.062 : 0.078;
    const legR = bulky ? 0.135 : lanky ? 0.078 : 0.108;
    const chestW = (bulky ? 0.56 : 0.46) * broad;
    const shinMat = zombie ? skin : cloth;
    const foreMat = zombie ? skin : cloth;
    const hips = [];
    const knees = [];
    const shoulders = [];
    const elbows = [];
    const hands = [];
    const pupils = [];
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.58, -0.02);
    inner.add(headPivot);
    let eyeMat = null;

    const torso = addPart(inner, new THREE.CapsuleGeometry(0.2 * broad * (bulky ? 1.18 : 1), 0.52, 5, 8), cloth, 0, 1.16, 0.02);
    torso.scale.z = 0.82;
    addPart(inner, new THREE.BoxGeometry(0.36 * broad, 0.07, 0.22), leather, 0, 0.9, 0.04);
    addPart(inner, new THREE.BoxGeometry(0.07, 0.05, 0.03), metal, 0, 0.9, -0.09);
    addPart(inner, new THREE.BoxGeometry(0.045, 0.34, 0.025), leather, -0.07, 1.22, -0.16, 0, 0, 0.6);
    addPart(inner, new THREE.BoxGeometry(0.045, 0.34, 0.025), leather, 0.07, 1.22, -0.16, 0, 0, -0.6);
    addPart(inner, new THREE.CylinderGeometry(0.06, 0.075, 0.1, 6), skin, 0, 1.52, -0.01);
    addPart(inner, new THREE.BoxGeometry(0.15, 0.5, 0.045), cloth, -0.09, 0.7, 0.13, 0.16);
    addPart(inner, new THREE.BoxGeometry(0.15, 0.52, 0.045), cloth, 0.1, 0.68, 0.13, 0.12);

    function limbDown(parent, radius, length, material) {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 3, 6), material);
      mesh.position.y = -(length / 2 + radius);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function addLeg(side) {
      const hip = new THREE.Group();
      const drag = zombie && side > 0 && kind !== "runner";
      hip.position.set(side * (kind === "brute" ? 0.16 : 0.13), 0.9, 0.02);
      hip.rotation.z = side * (zombie ? 0.08 : 0.04);
      hip.rotation.x = zombie ? 0.2 : 0.04;
      if (drag) hip.rotation.x += kind === "brute" ? 0.12 : 0.28;
      const thighSpan = 0.42;
      const thighLen = Math.max(0.12, thighSpan - legR * 2);
      limbDown(hip, legR, thighLen, cloth);
      const knee = new THREE.Group();
      knee.position.y = -thighSpan;
      knee.rotation.x = zombie ? -0.28 : -0.16;
      if (drag) knee.rotation.x -= 0.34;
      const shinR = legR * (drag && kind === "shambler" ? 0.58 : 0.7);
      const shinSpan = 0.4;
      const shinLen = Math.max(0.12, shinSpan - shinR * 2);
      limbDown(knee, shinR, shinLen, shinMat);
      if (drag) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.042, 0.16), skin);
        foot.position.set(0, -shinSpan + 0.03, 0.03);
        foot.castShadow = true;
        knee.add(foot);
        for (let t = -1; t <= 1; t++) {
          const toe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.04), skin);
          toe.position.set(t * 0.028, -shinSpan + 0.02, -0.055);
          knee.add(toe);
        }
        addPart(knee, new THREE.BoxGeometry(0.05, 0.035, 0.03), gore, 0, -shinSpan + 0.14, 0.01);
      } else {
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.24), leather);
        boot.position.set(0, -shinSpan + 0.05, zombie ? 0.02 : -0.04);
        boot.castShadow = true;
        knee.add(boot);
        if (zombie) addPart(knee, new THREE.BoxGeometry(0.06, 0.04, 0.025), gore, 0, -shinSpan + 0.15, 0.02);
      }
      hip.add(knee);
      inner.add(hip);
      hips.push(hip);
      knees.push(knee);
    }

    addLeg(-1);
    addLeg(1);

    function addHead(geometry, material, x, y, z, rx, ry, rz) {
      return addPart(headPivot, geometry, material, x || 0, (y || 0) - 1.58, (z || 0) + 0.02, rx, ry, rz);
    }

    const head = addHead(new THREE.SphereGeometry(0.155, 10, 8), skin, 0, 1.7, -0.02);
    head.scale.set(0.92, 1.08, 0.98);
    const jaw = addHead(new THREE.BoxGeometry(0.14, zombie ? 0.055 : 0.07, 0.11), skin, 0, zombie ? 1.52 : 1.56, zombie ? -0.07 : -0.04);
    if (zombie) {
      jaw.rotation.x = 0.58;
      jaw.userData.rest = jaw.rotation.x;
      g.userData.jaw = jaw;
    }
    const brow = addHead(new THREE.BoxGeometry(0.18, 0.045, 0.08), hairMat, 0, 1.76, -0.11);
    brow.rotation.x = zombie ? 0.22 : 0.55;

    if (zombie) {
      const blood = new THREE.MeshLambertMaterial({ color: 0x6a1010, emissive: 0x3a0404, emissiveIntensity: 0.55 });
      const eyeHex = kind === "runner" ? 0xff2414 : kind === "brute" ? 0xd25a18 : 0xd6e06a;
      const emitHex = kind === "runner" ? 0xff1208 : kind === "brute" ? 0xa02808 : 0x9aaa30;
      const milk = new THREE.MeshLambertMaterial({ color: eyeHex, emissive: emitHex, emissiveIntensity: 0.9 });
      eyeMat = milk;
      const pupil = matStd(0x070606, 0.35);
      const socket = matStd(0x0a0808, 1);
      const blind = (seed % 2 === 0 ? -1 : 1);
      head.scale.set(kind === "brute" ? 0.98 : 0.86, kind === "brute" ? 1.08 : 1.18, 0.9);
      addHead(new THREE.SphereGeometry(0.042, 6, 5), socket, -0.08, 1.62, -0.05);
      addHead(new THREE.SphereGeometry(0.038, 6, 5), socket, 0.078, 1.6, -0.04);
      if (kind !== "runner") addHead(new THREE.SphereGeometry(0.055, 6, 5), blood, 0.03, 1.86, 0.02);
      for (let i = 0; i < (kind === "brute" ? 2 : 5); i++) {
        addHead(new THREE.BoxGeometry(0.01, 0.1 + (i % 3) * 0.04, 0.01), hairMat, -0.07 + (i % 3) * 0.06, 1.8, 0.05, 0.35, 0, (i - 2) * 0.18);
      }
      addHead(new THREE.BoxGeometry(0.028, 0.03, 0.04), skin, 0.012, 1.66, -0.13, 0.5);
      addHead(new THREE.BoxGeometry(0.07, 0.04, 0.025), matStd(0x120606, 1), 0, 1.575, -0.11);
      for (let i = -2; i <= 2; i++) {
        if (kind === "shambler" && i === 1) continue;
        addHead(new THREE.BoxGeometry(0.012, 0.028, 0.012), bone, i * 0.02, 1.6, -0.145);
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.02, 0.011), bone);
        lower.position.set(i * 0.018, -0.02, -0.045);
        jaw.add(lower);
      }
      const drip = addHead(new THREE.BoxGeometry(0.028, kind === "runner" ? 0.14 : 0.08, 0.012), blood, 0.01, 1.5, -0.12);
      drip.rotation.z = 0.2;
      addHead(new THREE.BoxGeometry(0.045, 0.035, 0.018), blood, blind * 0.085, 1.6, -0.12);
      [-1, 1].forEach((side) => {
        const y = 1.69 + (side < 0 ? 0.008 : -0.01);
        const missing = kind !== "runner" && side === blind;
        if (missing) {
          addHead(new THREE.SphereGeometry(0.034, 6, 5), socket, side * 0.052, y, -0.09);
          addHead(new THREE.SphereGeometry(0.012, 5, 4), blood, side * 0.052, y, -0.12);
          return;
        }
        const eye = addHead(new THREE.SphereGeometry(0.028, 8, 6), milk, side * 0.05, y, -0.12);
        eye.scale.set(1, 0.62, 0.55);
        const pupilMesh = addHead(new THREE.SphereGeometry(0.01, 8, 6), pupil, side * 0.05, y, -0.148);
        pupils.push(pupilMesh);
      });
      addPart(inner, new THREE.BoxGeometry(0.14, 0.18, 0.03), blood, 0.02, 1.18, -0.2);
      for (let i = 0; i < (kind === "brute" ? 3 : 4); i++) {
        const rib = addPart(inner, new THREE.TorusGeometry(0.05 + i * 0.006, 0.006, 3, 6, Math.PI * 0.8), bone, 0.01, 1.28 - i * 0.042, -0.19);
        rib.rotation.y = Math.PI / 2;
        rib.rotation.z = 0.25;
      }
      addPart(inner, new THREE.BoxGeometry(0.18, 0.14, 0.025), cloth, -0.08, 0.78, 0.14, 0.6, 0.2, 0.35);
      addPart(inner, new THREE.BoxGeometry(0.08, 0.2, 0.02), cloth, 0.12, 1.02, -0.16, 0.15, 0, -0.4);
      if (kind === "brute") {
        const belly = addPart(inner, new THREE.SphereGeometry(0.24, 10, 8), skin, 0.02, 0.92, 0.04);
        belly.scale.set(1.15, 0.82, 1);
        addPart(inner, new THREE.BoxGeometry(0.045, 0.18, 0.03), blood, 0.02, 0.9, -0.2);
      }
      if (kind === "runner") addPart(inner, new THREE.BoxGeometry(0.1, 0.14, 0.02), blood, -0.08, 1.28, -0.18, 0, 0, 0.35);
      inner.rotation.x = opts.lean != null ? opts.lean : (kind === "runner" ? 0.46 : kind === "brute" ? 0.16 : 0.34);
      inner.rotation.z = kind === "shambler" ? 0.05 : 0;
    } else if (opts.sword) {
      const hood = addHead(new THREE.SphereGeometry(0.19, 10, 8), leather, 0, 1.78, 0.07);
      hood.scale.set(1.02, 0.7, 0.95);
      addPart(inner, new THREE.BoxGeometry(0.18, 0.12, 0.08), leather, 0, 1.5, 0.08);
      const scar = addHead(new THREE.BoxGeometry(0.11, 0.018, 0.02), gore, -0.04, 1.69, -0.15, 0, 0, 0.7);
      scar.castShadow = false;
      const humanEyes = matStd(0x14110e, 0.35);
      const e1 = addHead(new THREE.SphereGeometry(0.028, 8, 6), humanEyes, -0.05, 1.68, -0.15);
      const e2 = addHead(new THREE.SphereGeometry(0.028, 8, 6), humanEyes, 0.05, 1.68, -0.15);
      e1.scale.y = 0.4;
      e2.scale.y = 0.4;
    } else {
      const cap = addHead(new THREE.SphereGeometry(0.16, 8, 6), hairMat, 0, 1.78, 0.02);
      cap.scale.set(0.98, 0.5, 1.02);
      addHead(new THREE.BoxGeometry(0.07, 0.14, 0.12), hairMat, -0.1, 1.66, 0.02);
      addHead(new THREE.BoxGeometry(0.07, 0.14, 0.12), hairMat, 0.1, 1.66, 0.02);
      addPart(inner, new THREE.BoxGeometry(0.2, 0.1, 0.06), leather, 0, 1.52, 0.08);
      const humanEyes = matStd(0x14110e, 0.35);
      const e1 = addHead(new THREE.SphereGeometry(0.026, 8, 6), humanEyes, -0.05, 1.68, -0.15);
      const e2 = addHead(new THREE.SphereGeometry(0.026, 8, 6), humanEyes, 0.05, 1.68, -0.15);
      e1.scale.y = 0.42;
      e2.scale.y = 0.42;
      if (opts.gun) {
        addHead(new THREE.BoxGeometry(0.16, 0.07, 0.04), leather, 0, 1.58, -0.13);
        addHead(new THREE.BoxGeometry(0.22, 0.08, 0.16), leather, 0, 1.84, 0.04);
      }
    }

    function addArm(side, spec) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * Math.max(0.28, chestW * 0.52), 1.46 - (zombie && side < 0 ? 0.07 : 0), 0);
      shoulder.rotation.z = side * (spec.splay || 0.2);
      shoulder.rotation.x = spec.pitch || 0.22;
      const upperSpan = spec.upper || 0.3;
      const upperLen = Math.max(0.1, upperSpan - armR * 2);
      limbDown(shoulder, armR, upperLen, cloth);
      const elbow = new THREE.Group();
      elbow.position.y = -upperSpan;
      elbow.rotation.x = spec.bend == null ? 0.22 : spec.bend;
      const foreR = armR * 0.84;
      const foreSpan = spec.fore || 0.28;
      const foreLen = Math.max(0.1, foreSpan - foreR * 2);
      limbDown(elbow, foreR, foreLen, foreMat);
      const hand = new THREE.Group();
      hand.position.y = -foreSpan;
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.12), zombie ? skin : leather);
      palm.castShadow = true;
      hand.add(palm);
      if (zombie) {
        const nail = matStd(0x1a1612, 0.5, 0.08);
        for (let i = 0; i < 4; i++) {
          const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.05, 2, 4), skin);
          finger.position.set((i - 1.5) * 0.022, -0.02, -0.04);
          finger.rotation.x = -1.15;
          finger.castShadow = true;
          hand.add(finger);
          const tip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 0.028), nail);
          tip.position.set(0, -0.038, -0.006);
          finger.add(tip);
        }
        if (side < 0 && kind !== "runner") {
          addPart(elbow, new THREE.BoxGeometry(0.02, 0.12, 0.016), bone, 0.02, -0.14, -0.03);
          addPart(elbow, new THREE.BoxGeometry(0.035, 0.07, 0.016), gore, 0, -0.1, -0.04);
        }
      }
      elbow.add(hand);
      shoulders.push(shoulder);
      elbows.push(elbow);
      hands.push(hand);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(armR * 1.2, 6, 5), spec.pad || leather);
      cap.castShadow = true;
      shoulder.add(cap);
      shoulder.add(elbow);
      inner.add(shoulder);
      return hand;
    }

    let toolHand = null;
    if (zombie) {
      addArm(-1, { pitch: kind === "runner" ? 0.95 : 0.62, splay: 0.32, bend: 0.5, upper: lanky ? 0.36 : 0.32, fore: lanky ? 0.34 : 0.3 });
      addArm(1, { pitch: kind === "brute" ? 0.5 : 0.78, splay: 0.14, bend: 0.36, upper: bulky ? 0.36 : 0.34, fore: 0.32 });
    } else if (opts.sword) {
      addArm(-1, { pitch: 0.16, splay: 0.22, bend: 0.18 });
      const swordHand = addArm(1, { pitch: 0.18, splay: 0.2, bend: 0.22, upper: 0.3, fore: 0.28, pad: metal });
      const pivot = new THREE.Group();
      const grip = new THREE.Group();
      makeSword(grip);
      grip.rotation.set(Math.PI / 2, 0.05, 0);
      pivot.position.set(0.0, 0.02, 0.0);
      pivot.add(grip);
      swordHand.add(pivot);
      g.userData.sword = pivot;
    } else if (opts.gun) {
      addArm(-1, { pitch: 0.24, splay: 0.28, bend: 0.16 });
      toolHand = addArm(1, { pitch: 1.25, splay: 0.08, bend: 0.2, upper: 0.28, fore: 0.26 });
      const gunMetal = matStd(0x16181a, 0.38, 0.7);
      const wood = matStd(0x3a2a1c, 0.82, 0);
      addPart(toolHand, new THREE.BoxGeometry(0.05, 0.08, 0.16), wood, 0, 0.06, 0.02);
      addPart(toolHand, new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6), gunMetal, 0, -0.22, -0.02);
      addPart(toolHand, new THREE.BoxGeometry(0.045, 0.1, 0.05), gunMetal, 0, -0.08, 0.02);
      addPart(toolHand, new THREE.BoxGeometry(0.04, 0.08, 0.06), wood, 0, -0.02, 0.05);
    } else if (opts.wrench) {
      addArm(-1, { pitch: 0.24, splay: 0.3, bend: 0.18 });
      toolHand = addArm(1, { pitch: 0.7, splay: -0.15, bend: -0.35, upper: 0.3, fore: 0.28, pad: metal });
      const iron = matStd(0x8d949a, 0.32, 0.78);
      const rust = matStd(0x6a4030, 0.62, 0.4);
      addPart(toolHand, new THREE.CylinderGeometry(0.028, 0.032, 0.42, 6), iron, 0, -0.12, 0);
      addPart(toolHand, new THREE.BoxGeometry(0.12, 0.14, 0.08), iron, 0, -0.36, 0);
      addPart(toolHand, new THREE.BoxGeometry(0.09, 0.05, 0.1), rust, 0, -0.44, 0.01);
    } else {
      addArm(-1, { pitch: 0.24, splay: 0.26, bend: 0.18 });
      addArm(1, { pitch: 0.24, splay: 0.26, bend: 0.18 });
    }

    if (opts.name) {
      const label = makeLabel(opts.name);
      g.add(label);
      g.userData.label = label;
    }
    g.userData.inner = inner;
    g.userData.cloth = cloth;
    g.userData.pid = opts.pid || "";
    g.userData.rig = {
      kind: zombie ? "zombie" : opts.sword ? "sword" : opts.gun ? "gun" : opts.wrench ? "wrench" : "human",
      inner,
      head: headPivot,
      jaw: g.userData.jaw || null,
      eyeMat,
      pupils,
      hips,
      knees,
      shoulders,
      elbows,
      hands,
      sword: g.userData.sword || null,
      rest: {
        innerX: inner.rotation.x,
        innerY: inner.rotation.y,
        innerZ: inner.rotation.z,
        hips: hips.map((h) => h.rotation.x),
        hipZ: hips.map((h) => h.rotation.z),
        knees: knees.map((k) => k.rotation.x),
        shX: shoulders.map((s) => s.rotation.x),
        shY: shoulders.map((s) => s.rotation.y),
        shZ: shoulders.map((s) => s.rotation.z),
        elX: elbows.map((e) => e.rotation.x),
      },
    };
    g.userData.anim = {
      phase: Math.random() * Math.PI * 2,
      amp: 0,
      twitch: 0,
      twitchT: Math.random() * 1.4,
      badLeg: zombie && kind !== "runner" ? 1 : (Math.random() < 0.5 ? 0 : 1),
      drag: 0.72 + Math.random() * 0.5,
      lastX: null,
      lastZ: null,
    };
    if (opts.scale) g.scale.setScalar(opts.scale);
    attachShadow(g);
    return g;
  }

  function poseJaw(rig, gulp, type, locked) {
    if (!rig.jaw || locked) return;
    const rest = rig.jaw.userData.rest || 0;
    const bite = gulp > 0.02 ? Math.max(0, Math.sin(time * (type === "brute" ? 9 : 16))) : 0;
    const idle = type === "runner" ? Math.max(0, Math.sin(time * 11)) * 0.1 : Math.max(0, Math.sin(time * 4.2)) * 0.07;
    rig.jaw.rotation.x = rest + idle + bite * 0.5 * gulp;
  }

  function poseFall(rig, t) {
    const R = rig.rest;
    const e = t * t;
    const buckle = Math.sin(Math.min(1, t * 1.35) * Math.PI * 0.5);
    rig.inner.scale.set(1, 1, 1);
    rig.inner.rotation.x = R.innerX + 0.22 * e;
    rig.inner.rotation.y = R.innerY;
    rig.inner.rotation.z = R.innerZ * (1 - t);
    rig.head.rotation.set(0.15 + 0.35 * e, 0, 0.18 * (1 - t));
    for (let i = 0; i < 2; i++) {
      rig.hips[i].rotation.x = R.hips[i] + 0.45 * buckle;
      rig.hips[i].rotation.z = R.hipZ[i];
      rig.knees[i].rotation.x = R.knees[i] - 1.15 * buckle;
      rig.shoulders[i].rotation.set(lerp(R.shX[i], 0.15, e), 0, R.shZ[i] * (1 - e));
      rig.elbows[i].rotation.x = R.elX[i] + 0.55 * (1 - e * 0.4);
      if (rig.hands[i]) rig.hands[i].rotation.x = 0.15 * (1 - e);
    }
    if (rig.jaw) rig.jaw.rotation.x = (rig.jaw.userData.rest || 0.4) + 0.42 * e;
    if (rig.sword) rig.sword.rotation.set(0.5 * e, 0.1 * e, 0.8 * e);
    if (rig.eyeMat) rig.eyeMat.emissiveIntensity = 0.9 * (1 - e);
  }

  function applyCut(rig, o) {
    const R = rig.rest;
    const u = clamp(o.cut || 0, 0, 1);
    const combo = o.combo || 0;
    const chamber = clamp(u / (combo === 1 ? 0.36 : 0.28), 0, 1);
    const through = clamp((u - (combo === 1 ? 0.3 : 0.22)) / (combo === 1 ? 0.7 : 0.78), 0, 1);
    const rs = rig.shoulders[1];
    const re = rig.elbows[1];
    const ls = rig.shoulders[0];
    const le = rig.elbows[0];
    if (combo === 1) {
      rs.rotation.x = lerp(lerp(R.shX[1], 2.35, chamber), 0.22, through);
      rs.rotation.y = lerp(0, -0.12, through);
      rs.rotation.z = lerp(R.shZ[1], 0.02, through);
      re.rotation.x = lerp(lerp(R.elX[1], 0.95, chamber), 0.12, through);
      if (rig.sword) rig.sword.rotation.set(lerp(0, -0.15, chamber) - 1.05 * through, 0.04, -0.08);
    } else if (combo === 2) {
      rs.rotation.x = lerp(lerp(R.shX[1], 0.28, chamber), 1.65, through);
      rs.rotation.y = lerp(0.25, -0.4, through);
      rs.rotation.z = lerp(R.shZ[1] + 0.15, R.shZ[1] - 0.9, through);
      re.rotation.x = lerp(lerp(R.elX[1], 1.2, chamber), 0.22, through);
      if (rig.sword) rig.sword.rotation.set(lerp(0.45, -0.3, through), 0.22 * through, 0.5 * through);
    } else {
      rs.rotation.x = lerp(lerp(R.shX[1], 0.62, chamber), 1.2, through);
      rs.rotation.y = lerp(0.7 * chamber, -0.9, through);
      rs.rotation.z = lerp(R.shZ[1] + 0.35, R.shZ[1] - 0.72, through);
      re.rotation.x = lerp(lerp(R.elX[1], 1.05, chamber), 0.28, through);
      if (rig.sword) rig.sword.rotation.set(-0.3 * through, 0.12 * Math.sin(u * Math.PI), -0.8 * through);
    }
    if (o.weak) rs.rotation.z += Math.sin(u * Math.PI * 3) * 0.1;
    const wave = Math.sin(u * Math.PI);
    ls.rotation.x = R.shX[0] + 0.3 * wave;
    ls.rotation.y = R.shY[0];
    ls.rotation.z = R.shZ[0] + 0.22 * wave;
    le.rotation.x = R.elX[0] + 0.4 * wave;
    rig.inner.rotation.y = lerp(combo === 1 ? 0.1 : 0.26, combo === 1 ? -0.08 : -0.32, through);
    rig.head.rotation.y = -rig.inner.rotation.y * 0.45;
    rig.head.rotation.x = -0.08 * wave;
  }

  function applyBlock(rig) {
    const R = rig.rest;
    const rs = rig.shoulders[1];
    const ls = rig.shoulders[0];
    rs.rotation.set(1.2, -0.42, -0.08);
    rig.elbows[1].rotation.x = 1.2;
    ls.rotation.set(0.95, 0.5, 0.32);
    rig.elbows[0].rotation.x = 1.08;
    rig.head.rotation.x = -0.06;
    rig.head.rotation.y = 0.04;
    rig.inner.rotation.x = R.innerX + 0.05;
    if (rig.sword) rig.sword.rotation.set(-0.55, 0.62, -0.28);
  }

  function applyDodge(rig, o) {
    const R = rig.rest;
    const lean = o.lean || 0;
    rig.inner.rotation.z = -lean * 0.62;
    rig.inner.rotation.x = R.innerX + 0.46;
    rig.head.rotation.set(-0.22, 0, lean * 0.28);
    for (let i = 0; i < 2; i++) {
      rig.knees[i].rotation.x = R.knees[i] - 0.9;
      rig.hips[i].rotation.x = R.hips[i] + 0.4;
      rig.shoulders[i].rotation.x = 0.85 + (i === 1 ? 0.15 : 0);
      rig.shoulders[i].rotation.z = R.shZ[i] - lean * 0.2;
      rig.elbows[i].rotation.x = 0.75;
    }
    if (rig.sword) rig.sword.rotation.set(-0.35, 0.15, -0.25);
  }

  function applyAim(rig, kick) {
    const R = rig.rest;
    rig.shoulders[1].rotation.set(R.shX[1] + kick * 0.28, R.shY[1], R.shZ[1]);
    rig.elbows[1].rotation.x = R.elX[1] + kick * 0.2;
    rig.shoulders[0].rotation.x = R.shX[0] + 0.08;
    rig.head.rotation.x = -0.05;
    rig.head.rotation.y = 0;
  }

  function applyLunge(rig, u) {
    const R = rig.rest;
    const raise = u < 0.55 ? u / 0.55 : (1 - u) / 0.45;
    const slam = u < 0.55 ? 0 : (u - 0.55) / 0.45;
    rig.shoulders[1].rotation.x = lerp(lerp(R.shX[1], 1.45, raise), 0.65, slam);
    rig.shoulders[1].rotation.y = lerp(R.shY[1], -0.2, slam);
    rig.shoulders[1].rotation.z = R.shZ[1];
    rig.elbows[1].rotation.x = lerp(R.elX[1], 0.85, raise * (1 - slam * 0.5));
    rig.inner.rotation.x = R.innerX + 0.3 * slam - 0.06 * raise;
    rig.head.rotation.x = -0.12 * raise + 0.22 * slam;
  }

  function poseHuman(rig, anim, o) {
    const R = rig.rest;
    const a = anim.amp;
    const s = Math.sin(anim.phase);
    const breathe = Math.sin(time * 1.65 + anim.phase * 0.15);
    const shift = Math.sin(time * 0.65 + anim.phase) * (1 - a);
    rig.inner.scale.set(1, 1 + breathe * 0.012, 1);
    rig.inner.rotation.x = R.innerX + breathe * 0.018;
    rig.inner.rotation.y = R.innerY + s * 0.07 * a;
    rig.inner.rotation.z = R.innerZ + s * 0.045 * a + shift * 0.035;
    rig.head.rotation.x = -s * 0.035 * a + breathe * 0.02;
    rig.head.rotation.y = Math.sin(anim.phase * 0.5) * 0.04 * a;
    rig.head.rotation.z = -s * 0.03 * a - shift * 0.04;
    for (let i = 0; i < 2; i++) {
      const swing = s * (i === 0 ? 1 : -1);
      const lift = Math.max(0, swing);
      const back = Math.max(0, -swing);
      rig.hips[i].rotation.x = R.hips[i] + swing * 0.58 * a + shift * (i === 0 ? 0.05 : -0.05);
      rig.hips[i].rotation.z = R.hipZ[i];
      rig.knees[i].rotation.x = R.knees[i] - lift * 0.9 * a - back * 0.04 * a;
      const arm = -swing;
      rig.shoulders[i].rotation.x = R.shX[i] + arm * 0.42 * a + breathe * 0.025;
      rig.shoulders[i].rotation.y = R.shY[i];
      rig.shoulders[i].rotation.z = R.shZ[i];
      rig.elbows[i].rotation.x = R.elX[i] + (arm < 0 ? 0.32 : 0.06) * a;
      if (rig.hands[i]) rig.hands[i].rotation.x = 0;
    }
    if (o.action === "cut") applyCut(rig, o);
    else if (o.action === "block") applyBlock(rig);
    else if (o.action === "dodge") applyDodge(rig, o);
    else if (o.action === "aim") applyAim(rig, o.kick || 0);
    else if (o.action === "strike") applyLunge(rig, o.strike || 0);
    else if (rig.sword) rig.sword.rotation.set(0, 0, 0);
    if (o.flinch > 0 && o.action !== "cut" && o.action !== "dodge") {
      rig.inner.rotation.x += 0.18 * o.flinch;
      rig.head.rotation.x -= 0.22 * o.flinch;
      rig.shoulders[0].rotation.z += 0.18 * o.flinch;
      rig.shoulders[1].rotation.z -= 0.18 * o.flinch;
    }
  }

  function poseZombie(rig, anim, o) {
    const R = rig.rest;
    const type = o.type || "shambler";
    const runner = type === "runner";
    const brute = type === "brute";
    const a = anim.amp;
    const phase = anim.phase;
    anim.twitchT -= o.dt || 0;
    if (anim.twitchT <= 0) {
      anim.twitchT = (runner ? 0.12 : 0.28) + Math.random() * (runner ? 0.4 : 1.5);
      anim.twitch = (Math.random() < 0.72 ? 1 : 0.35) * (Math.random() < 0.5 ? -1 : 1) * (brute ? 0.1 : 0.26);
    } else anim.twitch *= Math.exp(-(o.dt || 0) * (runner ? 16 : 8));
    const twitch = anim.twitch;
    const breathe = Math.sin(time * (runner ? 3.4 : brute ? 0.85 : 1.35) + phase);
    const s = Math.sin(phase);
    rig.inner.scale.set(1 + breathe * 0.01, 1 + breathe * 0.02, 1);
    rig.inner.rotation.x = R.innerX + (runner ? 0.08 : 0.05) + Math.sin(phase * 2) * 0.06 * a + breathe * 0.02;
    rig.inner.rotation.y = Math.sin(phase * 0.45) * 0.09 * a + twitch * 0.2;
    rig.inner.rotation.z = R.innerZ + s * (brute ? 0.12 : 0.16) * (0.4 + a) + twitch * 0.55;
    if (anim.snap == null) anim.snap = 0;
    if ((o.dt || 0) > 0 && Math.random() < (o.dt || 0) * (runner ? 2.6 : brute ? 0.4 : 1.15)) {
      anim.snap = (Math.random() < 0.5 ? -1 : 1) * (0.28 + Math.random() * 0.5);
    }
    anim.snap *= Math.exp(-(o.dt || 0) * 5.2);
    rig.head.rotation.x = 0.22 + Math.sin(phase * 0.65) * 0.09 + (runner ? Math.sin(time * 9.5) * 0.05 : Math.sin(time * 2.2) * 0.03);
    rig.head.rotation.y = Math.sin(time * 0.55 + phase) * 0.18 + twitch * 0.8 + anim.snap;
    rig.head.rotation.z = Math.sin(phase * 0.75) * 0.2 + twitch * 1.15 + anim.snap * 0.4;
    const hipAmp = (brute ? 0.34 : runner ? 0.7 : 0.52) * a;
    const kneeAmp = (brute ? 0.42 : runner ? 0.95 : 0.68) * a;
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      const bad = i === anim.badLeg;
      const swing = Math.sin(phase + (bad ? 0.55 : 0)) * sign;
      const lift = Math.max(0, swing);
      rig.hips[i].rotation.x = R.hips[i] + swing * hipAmp * (bad ? 0.42 : 1);
      rig.hips[i].rotation.z = R.hipZ[i] + (bad ? 0.1 * a : 0);
      rig.knees[i].rotation.x = R.knees[i] - lift * kneeAmp * (bad ? 0.3 : 1) - (bad ? 0.28 * (0.35 + a) : 0);
    }
    for (let i = 0; i < 2; i++) {
      const claw = Math.sin(phase * (runner ? 3.2 : brute ? 1.15 : 1.85) + i * 2.2);
      const reach = (runner ? 0.22 : 0.1) + claw * (runner ? 0.2 : 0.12);
      rig.shoulders[i].rotation.x = R.shX[i] + reach * (0.45 + a);
      rig.shoulders[i].rotation.y = Math.sin(phase * 1.25 + i * 1.8) * (runner ? 0.22 : 0.14);
      rig.shoulders[i].rotation.z = R.shZ[i] + Math.sin(phase + i * 1.4) * 0.08 + (i === 0 ? -1 : 1) * twitch * 0.25;
      rig.elbows[i].rotation.x = R.elX[i] + 0.1 + Math.abs(claw) * (runner ? 0.42 : 0.26);
      if (rig.hands[i]) rig.hands[i].rotation.x = -0.55 - Math.max(0, claw) * (runner ? 0.7 : 0.5) - Math.abs(twitch) * 0.4;
    }
    const strike = o.strike || 0;
    if (strike > 0) {
      const raise = strike < 0.58 ? strike / 0.58 : (1 - strike) / 0.42;
      const slam = strike < 0.58 ? 0 : (strike - 0.58) / 0.42;
      const ease = slam * slam;
      const lead = anim.badLeg === 0 ? 1 : 0;
      for (let i = 0; i < 2; i++) {
        const up = brute ? 1.65 : 2.02;
        const down = brute ? 1.2 : 0.95;
        const chambered = lerp(R.shX[i], up, Math.min(1, raise * 1.15));
        rig.shoulders[i].rotation.x = lerp(chambered, down, ease);
        rig.shoulders[i].rotation.z = lerp(R.shZ[i], i === 0 ? 0.42 : -0.32, raise * (1 - ease));
        rig.elbows[i].rotation.x = 0.18 + raise * 0.7 * (1 - ease * 0.65);
        if (rig.hands[i]) rig.hands[i].rotation.x = -0.25 - raise * 0.85 + ease * 0.35;
      }
      rig.hips[lead].rotation.x = R.hips[lead] + 0.5 * ease;
      rig.knees[lead].rotation.x = R.knees[lead] - 0.35 * ease;
      rig.inner.rotation.x = R.innerX - 0.14 * raise + 0.4 * ease;
      rig.head.rotation.x = -0.32 * raise + 0.5 * ease;
      rig.head.rotation.z *= 1 - ease;
      if (rig.jaw) rig.jaw.rotation.x = (rig.jaw.userData.rest || 0.5) + 0.25 * raise + 0.62 * ease;
    }
    if ((o.flinch || 0) > 0) {
      const f = o.flinch;
      rig.inner.rotation.x -= 0.28 * f;
      rig.head.rotation.x -= 0.34 * f;
      rig.head.rotation.z += 0.2 * f;
      rig.shoulders[0].rotation.z += 0.28 * f;
      rig.shoulders[1].rotation.z -= 0.28 * f;
    }
    if ((o.gulp || 0) > 0.2 && strike <= 0) rig.head.rotation.x += 0.1 * o.gulp;
    if (rig.eyeMat) {
      const pulse = 0.55 + Math.sin(time * (runner ? 9 : brute ? 2.4 : 4.2) + phase) * 0.4;
      rig.eyeMat.emissiveIntensity = pulse + strike * 0.9 + Math.abs(anim.snap || 0);
    }
    (rig.pupils || []).forEach((p) => {
      if (p.userData.restX == null) {
        p.userData.restX = p.position.x;
        p.userData.restY = p.position.y;
      }
      p.position.x = p.userData.restX + Math.sin(time * 2.4 + phase) * 0.007 + (anim.snap || 0) * 0.01;
      p.position.y = p.userData.restY + Math.cos(time * 1.7) * 0.004;
    });
    poseJaw(rig, o.gulp || 0, type, strike > 0);
  }

  function poseFigure(mesh, dt, o) {
    const rig = mesh.userData.rig;
    const anim = mesh.userData.anim;
    if (!rig || !anim) return;
    o = o || {};
    const action = o.action || "idle";
    if (action === "fall") {
      poseFall(rig, clamp(o.fall || 0, 0, 1));
      anim.lastX = mesh.position.x;
      anim.lastZ = mesh.position.z;
      return;
    }
    let spd = 0;
    if (anim.lastX != null) {
      spd = Math.hypot(mesh.position.x - anim.lastX, mesh.position.z - anim.lastZ) / Math.max(dt, 0.001);
      if (spd > 14) spd = 0;
    }
    const want = spd > 0.45 ? 1 : spd > 0.2 ? 0.4 : 0;
    anim.amp += (want - anim.amp) * Math.min(1, dt * 8);
    const type = o.type || "shambler";
    const zombie = rig.kind === "zombie";
    const freq = zombie ? (type === "runner" ? 6.4 : type === "brute" ? 2.6 : 4.4) : 4.05;
    let drive = Math.max(spd, zombie ? (type === "runner" ? 0.7 : 0.38) : 0.12);
    if (zombie && type !== "runner") drive *= 0.68 + 0.7 * Math.pow(Math.max(0, Math.sin(anim.phase)), 2);
    anim.phase += dt * drive * freq;
    o.dt = dt;
    if (zombie) poseZombie(rig, anim, o);
    else poseHuman(rig, anim, o);
    const saying = AudioBus.speaking;
    if (saying && mesh.userData.pid && SPEAKER[saying] === mesh.userData.pid && rig.head) {
      rig.head.rotation.x += Math.sin(time * 8) * 0.04;
      rig.head.rotation.y += Math.sin(time * 2.3) * 0.05;
    }
    mesh.rotation.x = 0;
    if (o.bob !== false) {
      const scale = mesh.scale.x || 1;
      if (zombie) {
        const s = Math.sin(anim.phase);
        const left = Math.pow(Math.max(0, s), 1.45);
        const right = Math.pow(Math.max(0, -s), 1.45);
        const heavy = anim.badLeg === 1 ? right * 1.55 + left * 0.35 : left * 1.55 + right * 0.35;
        mesh.position.y = heavy * 0.09 * anim.amp * scale + Math.abs(Math.sin(anim.phase * 0.5)) * 0.02 * scale;
      } else {
        const step = Math.pow(Math.abs(Math.sin(anim.phase)), 1.15);
        const breathe = Math.sin(time * 1.55 + anim.phase) * 0.008;
        mesh.position.y = breathe * scale + step * 0.038 * anim.amp * scale;
      }
    }
    anim.lastX = mesh.position.x;
    anim.lastZ = mesh.position.z;
  }

  function poseActor(mesh, dt, o) {
    if (!mesh || !mesh.userData || !mesh.userData.rig) return;
    poseFigure(mesh, dt, o);
  }

  function poseWorld(dt) {
    if (player.mesh && player.mesh.visible && mode !== "title") {
      if (player.hp <= 0) {
        player.fall = Math.min(1, (player.fall || 0) + dt / 0.62);
        const e = 1 - Math.pow(1 - player.fall, 3);
        poseFigure(player.mesh, dt, { action: "fall", fall: e, bob: false });
        player.mesh.rotation.x = e * 1.08;
        player.mesh.position.y = e * 0.1;
      } else {
        let action = "idle";
        if (player.dodge > 0) action = "dodge";
        else if (player.attack > 0) action = "cut";
        else if (player.blocking) action = "block";
        const { r } = flatVectors();
        const lean = player.dodgeDir.x * r.x + player.dodgeDir.z * r.z;
        const cut = player.attack > 0 ? 1 - Math.max(0, player.attack) / Math.max(0.05, player.attackDur) : 0;
        poseFigure(player.mesh, dt, {
          action,
          cut,
          combo: player.combo,
          weak: player.weak,
          lean,
          flinch: action === "cut" || action === "dodge" ? 0 : player.flinch,
        });
      }
    }
    const owned = new Set();
    zombies.forEach((z) => {
      owned.add(z.mesh);
      if (z.recoil > 0) z.recoil = Math.max(0, z.recoil - dt);
      if (z.dead) {
        z.fall = Math.min(1, (z.fall || 0) + dt / 0.5);
        const e = 1 - Math.pow(1 - z.fall, 3);
        poseFigure(z.mesh, dt, { action: "fall", fall: e, bob: false, type: z.type });
        z.mesh.rotation.x = e * (z.type === "brute" ? 1.02 : 1.16);
        z.mesh.position.y = Math.sin(Math.min(1, z.fall) * Math.PI) * 0.06 + e * (z.type === "brute" ? 0.2 : 0.13);
        return;
      }
      let strike = 0;
      let fade = 1;
      if (z.stun > 0 && z.windup <= 0) z.attack = 0;
      else if (z.windup > 0) {
        strike = clamp(1 - z.windup / Math.max(0.05, z.windup0), 0, 1);
        z.poseU = strike;
        z.attack = 1;
      } else if ((z.attack || 0) > 0) {
        z.attack = Math.max(0, z.attack - dt * 3.1);
        strike = 1;
        fade = z.attack;
      }
      let action = "idle";
      if (z.human && strike > 0) action = "strike";
      else if (z.human && (z.aiming > 0 || z.recoil > 0)) action = "aim";
      poseFigure(z.mesh, dt, {
        action,
        type: z.type,
        strike,
        fade,
        flinch: z.stun > 0 ? clamp(z.stun / 0.4, 0, 1) : 0,
        gulp: z.mouth || 0,
        kick: z.recoil > 0 ? z.recoil / 0.14 : 0,
      });
    });
    allies.forEach((a) => {
      owned.add(a.mesh);
      if (a.down) {
        a.fall = Math.min(1, (a.fall || 0) + dt / 0.58);
        const e = 1 - Math.pow(1 - a.fall, 3);
        poseFigure(a.mesh, dt, { action: "fall", fall: e, bob: false });
        a.mesh.rotation.x = e * 1.05;
        a.mesh.position.y = e * 0.12;
        return;
      }
      if (a.swing > 0) a.swing = Math.max(0, a.swing - dt);
      const swingU = a.swing > 0 ? 1 - a.swing / 0.34 : 0;
      poseFigure(a.mesh, dt, {
        action: a.swing > 0 ? "strike" : "idle",
        strike: swingU,
        flinch: a.iframe > 0 ? clamp(a.iframe / 0.4, 0, 1) : 0,
      });
    });
    [peopleRoot, followRoot].forEach((group) => {
      if (!group) return;
      group.children.forEach((child) => poseActor(child, dt, {}));
    });
    if (actorRoot) {
      actorRoot.children.forEach((child) => {
        if (owned.has(child)) return;
        const ud = child.userData || {};
        const lurk = !!ud.titleLurk;
        const gulp = ud.titleZ || lurk ? Math.max(0, Math.sin(time * (lurk ? 2.6 : 1.15))) : 0;
        poseActor(child, dt, { type: lurk ? "runner" : "shambler", gulp });
      });
    }
  }

  function applyAtmosphere(arena) {
    fogBase = arena.fog;
    scene.background = new THREE.Color(arena.fog);
    scene.fog = new THREE.FogExp2(arena.fog, arena.density);
    hemi.color.setHex(arena.hemiSky);
    hemi.groundColor.setHex(arena.hemiGround);
    hemi.intensity = 0.82;
    moon.color.setHex(arena.moon);
    moon.intensity = arena.moonI * 1.35;
    moon.userData.rest = moon.intensity;
    if (rim) rim.intensity = arena.rain ? 0.55 : 0.32;
    if (rain) rain.visible = !!arena.rain;
    if (arena.rain && !rain) {
      const n = 1800;
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 46;
        arr[i * 3 + 1] = Math.random() * 18;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 46;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9aa4b0, size: 0.028, transparent: true, opacity: 0.45, depthWrite: false }));
      scene.add(rain);
    }
  }

  function updateRain(dt) {
    if (!rain || !rain.visible) return;
    const p = rain.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * 14;
      if (y < 0) y = 16 + Math.random() * 2;
      p.setY(i, y);
    }
    p.needsUpdate = true;
  }

  function personVisible(p) {
    if (!state) return false;
    if (p.id === "harris") return ["none", "obvious", "secret", "delayed"].includes(state.harris);
    if (p.id === "ellis") return !state.ellisWith && !state.ellisRaider;
    if (p.id === "pete") return !!state.peteAlive;
    if (p.id === "ruth") return !!state.ruthAlive;
    return true;
  }

  function syncPeople() {
    clearGroup(peopleRoot);
    clearGroup(followRoot);
    if (!state) return;
    peopleDefs.forEach((p) => {
      if (!personVisible(p)) return;
      const fig = makeFigure({ color: p.color, name: p.name, pid: p.id, scale: p.scale || 1 });
      fig.position.set(p.x, 0, p.z);
      fig.rotation.y = p.face || 0;
      peopleRoot.add(fig);
    });
    const party = [];
    const inFight = current && current.kind === "combat";
    if (!inFight && state.juneAlive) party.push({ pid: "june", name: "June", color: 0x7a3e36, scale: 0.92, hair: 0x2a2118 });
    if (!inFight && state.ellisWith && state.ellisAlive) party.push({ pid: "ellis", name: "Ellis", color: 0x24383a, scale: 1.05, broad: 1.08 });
    if (!inFight && state.calWith) party.push({ pid: "cal", name: "Cal", color: 0x2a2c30, scale: 1, hair: 0x3a342c });
    party.forEach((p) => {
      const fig = makeFigure(p);
      fig.userData.follow = true;
      followRoot.add(fig);
    });
    const showLabels = !(current && current.kind === "combat");
    peopleRoot.traverse((o) => { if (o.userData && o.userData.isLabel) o.visible = showLabels; });
    followRoot.traverse((o) => { if (o.userData && o.userData.isLabel) o.visible = showLabels; });
  }

  function buildArena(id) {
    clearGroup(propsRoot);
    clearGroup(actorRoot);
    clearGroup(peopleRoot);
    clearGroup(followRoot);
    zombies = [];
    bullets = [];
    const built = World.build(propsRoot, id);
    solids = built.solids;
    markers = built.markers;
    points = built.points;
    peopleDefs = built.people;
    allies = [];
    lastStart = built.start;
    bounds = built.arena.bounds;
    camDist = built.arena.camDist || 5.6;
    currentArenaId = id;
    flickerLights = built.flickers || [];
    const maxA = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    propsRoot.traverse((obj) => {
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      mats.forEach((m) => {
        if (m.map) m.map.anisotropy = maxA;
      });
    });
    applyAtmosphere(built.arena);
    if (player.mesh) {
      player.mesh.position.set(lastStart.x, 0, lastStart.z);
      yaw = lastStart.yaw;
    }
    syncPeople();
  }

  function ensurePlayer(force) {
    if (player.mesh && !force) return;
    if (player.mesh) {
      scene.remove(player.mesh);
      disposeObj(player.mesh);
    }
    player.mesh = makeFigure({
      color: 0x2c2926,
      skin: 0xc49a78,
      hair: 0x161412,
      sword: true,
      pid: "player",
    });
    player.sword = player.mesh.userData.sword;
    scene.add(player.mesh);
  }

  function expandSpawn(list) {
    const out = [];
    (list || []).forEach((item) => {
      const n = item.count || 1;
      for (let i = 0; i < n; i++) out.push(Object.assign({}, item, { count: 1 }));
    });
    return out;
  }

  function spawnActors(node) {
    zombies = [];
    const list = typeof node.spawn === "function" ? node.spawn(state) : node.spawn || [];
    const easy = !!node.easy;
    expandSpawn(list).forEach((spec, i) => {
      const type = TYPES[spec.type] || TYPES.shambler;
      const pt = points[i % Math.max(1, points.length)] || [0, -4];
      const fig = makeFigure({
        color: type.cloth,
        skin: type.skin,
        zombie: !type.human,
        lean: type.lean,
        scale: (spec.scale || type.scale) * (spec.name === "Voss" ? 1.08 : 1),
        gun: !!type.gun,
        name: spec.name || "",
        pid: spec.id || "",
        kind: spec.type,
        seed: 17 + i * 53,
        broad: type.human ? 1 : 1,
      });
      const jx = (Math.random() - 0.5) * 0.7;
      const jz = (Math.random() - 0.5) * 0.7;
      fig.position.set(pt[0] + jx, 0, pt[1] + jz);
      actorRoot.add(fig);
      zombies.push({
        mesh: fig,
        type: spec.type,
        hp: spec.hp || type.hp,
        hpMax: spec.hp || type.hp,
        speed: type.speed * (easy ? 0.78 : 1),
        dmg: type.dmg * (easy ? 0.75 : 1),
        windup0: type.windup + (easy ? 0.14 : 0),
        windup: 0,
        range: type.range,
        human: !!type.human,
        gun: !!type.gun,
        id: spec.id || "",
        name: spec.name || "",
        ambient: !!spec.ambient,
        dead: false,
        stun: 0,
        shootCd: 0.6 + Math.random(),
        aiming: 0,
        cloth: fig.userData.cloth,
        voiceCd: 0.35 + Math.random() * 1.6,
        hearDist: 999,
        mouth: 0,
      });
    });
  }

  function clearZombies() {
    zombies.forEach((z) => actorRoot.remove(z.mesh));
    zombies = [];
    bullets.forEach((b) => actorRoot.remove(b.mesh));
    bullets = [];
  }

  function clearAllies() {
    allies.forEach((a) => {
      if (a.mesh.parent) a.mesh.parent.remove(a.mesh);
      disposeObj(a.mesh);
    });
    allies = [];
  }

  function allyUp(id) {
    return (state[id + "Down"] || 0) !== (state.day || 9);
  }

  function spawnAllies() {
    clearAllies();
    if (!state) return;
    const specs = [];
    if (state.juneAlive && allyUp("june")) {
      specs.push({ id: "june", name: "June", color: 0x7a3e36, scale: 0.92, hair: 0x2a2118, hp: 34, role: "june", hang: (state.juneTrust || 0) < 0 });
    }
    if (state.ellisWith && state.ellisAlive && allyUp("ellis")) {
      specs.push({ id: "ellis", name: "Ellis", color: 0x24383a, scale: 1.05, broad: 1.08, wrench: true, hp: 48, role: "ellis" });
    }
    if (state.calWith && allyUp("cal")) {
      specs.push({ id: "cal", name: "Cal", color: 0x2a2c30, scale: 1, hair: 0x3a342c, hp: 36, role: "cal" });
    }
    const origin = player.mesh ? player.mesh.position : { x: lastStart.x, z: lastStart.z };
    specs.forEach((spec, i) => {
      const fig = makeFigure(spec);
      fig.position.set(origin.x + (i - 1) * 0.7, 0, origin.z + 1.15);
      actorRoot.add(fig);
      allies.push({
        id: spec.id,
        role: spec.role,
        hang: !!spec.hang,
        mesh: fig,
        hp: spec.hp,
        cd: 0.45 + i * 0.25,
        down: false,
        pulled: false,
        iframe: 0,
        swing: 0,
        cloth: fig.userData.cloth,
      });
    });
  }

  function ellisMayHit(z) {
    if (!z || z.dead || z.human) return false;
    if (z.name === "Harris" || z.name === "Ian") return false;
    return true;
  }

  function dropAlly(a) {
    if (a.down) return;
    a.down = true;
    a.hp = 0;
    a.fall = 0;
    if (a.cloth) a.cloth.emissive.setHex(0x000000);
    Story.remember(state, "down", a.id);
    const name = { june: "June", ellis: "Ellis", cal: "Cal" }[a.id] || "They";
    showTip(name + " is down.", 2.2);
    save();
  }

  function hurtAlly(a, amount) {
    if (!a || a.down || a.iframe > 0) return;
    a.hp -= amount;
    a.iframe = 0.4;
    if (a.cloth) a.cloth.emissive.setHex(0x6a221c);
    AudioBus.hurt();
    trauma = Math.min(1, trauma + 0.18);
    if (a.hp <= 0) dropAlly(a);
  }

  function shoveZombie(z, from) {
    z.windup = 0;
    z.stun = 0.55;
    z.victim = null;
    const dx = z.mesh.position.x - from.x;
    const dz = z.mesh.position.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    z.mesh.position.x += (dx / len) * 0.85;
    z.mesh.position.z += (dz / len) * 0.85;
    if (z.cloth) z.cloth.emissive.setHex(0x000000);
    AudioBus.block();
  }

  function nearestPrey(allow) {
    let best = null;
    let bestD = 999;
    const home = player.mesh.position;
    zombies.forEach((z) => {
      if (!allow(z)) return;
      const dPlayer = Math.hypot(z.mesh.position.x - home.x, z.mesh.position.z - home.z);
      if (dPlayer > 8) return;
      if (dPlayer < bestD) {
        bestD = dPlayer;
        best = z;
      }
    });
    return best;
  }

  function setMarker(m) {
    if (markerMesh) {
      propsRoot.remove(markerMesh);
      disposeObj(markerMesh);
      markerMesh = null;
    }
    if (!m) return;
    markerMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.035, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0x8d3b32 })
    );
    markerMesh.rotation.x = Math.PI / 2;
    markerMesh.position.set(m.x, 0.08, m.z);
    propsRoot.add(markerMesh);
  }

  function pushOut(pos, radius) {
    for (const s of solids) {
      const cx = clamp(pos.x, s.minx, s.maxx);
      const cz = clamp(pos.z, s.minz, s.maxz);
      const inside = cx === pos.x && cz === pos.z;
      if (inside) {
        const left = pos.x - s.minx;
        const right = s.maxx - pos.x;
        const back = pos.z - s.minz;
        const front = s.maxz - pos.z;
        const m = Math.min(left, right, back, front);
        if (m === left) pos.x = s.minx - radius;
        else if (m === right) pos.x = s.maxx + radius;
        else if (m === back) pos.z = s.minz - radius;
        else pos.z = s.maxz + radius;
      } else {
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < radius * radius && d2 > 0.00001) {
          const d = Math.sqrt(d2);
          const push = (radius - d) / d;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      }
    }
    pos.x = clamp(pos.x, -bounds.x, bounds.x);
    pos.z = clamp(pos.z, -bounds.z, bounds.z);
  }

  function findActor(id) {
    if (!id) return null;
    const roots = [followRoot, peopleRoot, actorRoot];
    for (const r of roots) {
      for (const c of r.children) if (c.userData && c.userData.pid === id) return c;
    }
    return null;
  }

  function save() {
    if (!state) return;
    state.hp = player.hp;
    try { localStorage.setItem(SAVE, JSON.stringify({ state, node: state.node })); } catch (e) { /* private mode */ }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE); } catch (e) { /* private mode */ }
  }

  function hasSave() {
    try { return !!localStorage.getItem(SAVE); } catch (e) { return false; }
  }

  function show(el, on) { el.classList.toggle("hidden", !on); }

  function setMode(next) {
    mode = next;
    ui.app.classList.toggle("talking", mode === "talk" || mode === "black");
    ui.app.classList.toggle("carding", mode === "card");
    show(ui.hud, mode !== "title" && mode !== "ending");
    show(ui.title, mode === "title");
    show(ui.card, mode === "card");
    show(ui.blackout, mode === "black");
    show(ui.dialogue, mode === "talk");
    show(ui.pause, mode === "pause");
    show(ui.dead, mode === "dead");
    show(ui.end, mode === "ending");
    show(ui.confirm, false);
    if (mode !== "play" && document.pointerLockElement === ui.canvas) document.exitPointerLock();
    if (mode !== "talk") choicesUp = false;
  }

  function showTip(text, sec) {
    ui.tip.textContent = text || "";
    tipLeft = text ? (sec || 4) : 0;
  }

  function refreshHud() {
    if (!state) return;
    ui.place.textContent = state.place || "";
    const hp = clamp(player.hp, 0, 100);
    ui.fillHp.style.width = hp + "%";
    ui.fillSt.style.width = clamp(player.stamina, 0, 100) + "%";
    const edge = 1 - clamp((state.bladeWear || 0) / 0.62, 0, 1);
    ui.fillEdge.style.width = (edge * 100) + "%";
    ui.barHp.classList.toggle("low", hp < 35);
    ui.vignette.classList.toggle("low", hp < 35 && hp > 0);
  }

  function fillJournal() {
    ui.rel.innerHTML = "";
    Story.relations(state).forEach((line) => {
      const p = document.createElement("p");
      p.className = "rel";
      p.textContent = line;
      ui.rel.appendChild(p);
    });
    ui.log.innerHTML = "";
    state.journal.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      ui.log.appendChild(li);
    });
  }

  function openJournal() {
    if (!state || mode === "title" || mode === "ending" || mode === "card") return;
    if (journalOpen) return closeJournal();
    journalOpen = true;
    modeBeforeJournal = mode;
    fillJournal();
    show(ui.journal, true);
    if (document.pointerLockElement === ui.canvas) document.exitPointerLock();
  }

  function closeJournal() {
    journalOpen = false;
    show(ui.journal, false);
  }

  function hurtFlash() {
    ui.vignette.classList.add("hurt");
    if (ui.bleed) ui.bleed.classList.add("on");
    setTimeout(() => {
      ui.vignette.classList.remove("hurt");
      if (ui.bleed) ui.bleed.classList.remove("on");
    }, 420);
  }

  function noteLivingKill(z) {
    state.livingKilled = (state.livingKilled || 0) + 1;
    if (z.id === "ellis") {
      state.ellisAlive = false;
      state.ellisWith = false;
      state.ellisRaider = false;
      state.ellisExit = "dead";
      state.journal.push("Ellis Ward died on the road with the living.");
    }
    if (z.id === "voss") state.vossDead = true;
    if (!state.calSawBlood) {
      state.calSawBlood = true;
      state.calTrust -= 1;
      state.journal.push("Cal saw you cut a living person. He has less to say.");
    }
  }

  function killZombie(z) {
    if (z.dead) return;
    z.dead = true;
    z.fall = 0;
    if (z.cloth) z.cloth.emissive.setHex(0x000000);
    AudioBus.hit();
    trauma = Math.min(1, trauma + 0.45);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(0.42 + Math.random() * 0.22, 16),
      new THREE.MeshBasicMaterial({ color: 0x6a1010, transparent: true, opacity: 0.88 })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(z.mesh.position.x, 0.03, z.mesh.position.z);
    actorRoot.add(pool);
    for (let i = 0; i < 7; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.035 + Math.random() * 0.04, 5, 4),
        new THREE.MeshLambertMaterial({ color: 0x4a0c0c, emissive: 0x2a0404, emissiveIntensity: 0.25 })
      );
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.15 + Math.random() * 0.7;
      drop.position.set(z.mesh.position.x + Math.cos(ang) * rad, 0.04 + Math.random() * 0.05, z.mesh.position.z + Math.sin(ang) * rad);
      actorRoot.add(drop);
    }
    if (z.human) noteLivingKill(z);
  }

  function damagePlayer(amount) {
    if (player.iframe > 0 || player.hp <= 0) return;
    let dmg = amount;
    if (player.blocking && player.stamina > 1) {
      dmg *= 0.32;
      player.stamina = Math.max(0, player.stamina - 12);
      player.staminaDelay = 0.35;
      AudioBus.block();
      trauma = Math.min(1, trauma + 0.2);
      player.flinch = 0.16;
    } else {
      AudioBus.hurt();
      trauma = Math.min(1, trauma + 0.85);
      hurtFlash();
      player.flinch = 0.48;
    }
    player.hp -= dmg;
    state.hp = player.hp;
    if (player.hp <= 0) {
      player.hp = 0;
      state.hp = 0;
      Story.remember(state, "fall");
      AudioBus.stopSpeak();
      setMode("dead");
      save();
    }
  }

  function fireBullet(z) {
    const from = z.mesh.position;
    const to = player.mesh.position;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xe6d2a8 }));
    mesh.position.set(from.x, 1.15, from.z);
    actorRoot.add(mesh);
    bullets.push({ mesh, vx: (dx / len) * 11, vz: (dz / len) * 11, life: 2.2, dmg: 16 });
    z.recoil = 0.16;
    z.recoil = 0.14;
  }

  function tryAttack() {
    if (mode !== "play" || journalOpen) return;
    if (player.dodge > 0) return;
    if (player.attack > 0) { player.queue = true; return; }
    if (player.stamina < 4) return;
    player.weak = player.stamina < 12;
    player.stamina = Math.max(0, player.stamina - (player.weak ? 8 : 16));
    player.staminaDelay = 0.45;
    player.attackDur = player.weak ? 0.58 : 0.4;
    player.attack = player.attackDur;
    player.combo = 0;
    player.queue = false;
    player.hitThis = new Set();
    player.blocking = false;
    AudioBus.swing();
    trauma = Math.min(1, trauma + 0.08);
  }

  function tryDodge() {
    if (mode !== "play" || journalOpen || player.dodge > 0 || player.stamina < 18) return;
    const { f, r } = flatVectors();
    let fx = 0, rx = 0;
    if (keys.has("KeyW")) fx += 1;
    if (keys.has("KeyS")) fx -= 1;
    if (keys.has("KeyD")) rx += 1;
    if (keys.has("KeyA")) rx -= 1;
    const dir = new THREE.Vector3();
    if (fx === 0 && rx === 0) dir.copy(f).multiplyScalar(-1);
    else dir.copy(f).multiplyScalar(fx).add(r.multiplyScalar(rx)).normalize();
    player.dodgeDir.copy(dir);
    player.dodge = 0.26;
    player.iframe = 0.36;
    player.stamina = Math.max(0, player.stamina - 26);
    player.staminaDelay = 0.4;
    player.attack = 0;
    player.queue = false;
  }

  function nearestHostile() {
    let best = 999;
    if (!player.mesh) return best;
    zombies.forEach((z) => {
      if (z.dead) return;
      const d = Math.hypot(z.mesh.position.x - player.mesh.position.x, z.mesh.position.z - player.mesh.position.z);
      if (d < best) best = d;
    });
    return best;
  }

  function livingHostiles() {
    return zombies.filter((z) => !z.dead && !z.ambient).length;
  }

  function showLine(line) {
    if (line.hear) Story.hear(state, line.hear);
    speakerNow = line.speaker || "";
    fullLine = Story.fill(line.text, state);
    shownChars = 0;
    ui.who.textContent = speakerNow;
    ui.line.classList.toggle("narration", !speakerNow);
    ui.line.textContent = "";
    ui.choices.innerHTML = "";
    choicesUp = false;
    ui.cont.textContent = "Click or space";
    ui.cont.classList.remove("hidden");
    const sayAs = speakerNow || "Narrator";
    if (!(AudioBus.lineText === fullLine && (AudioBus.busy || AudioBus.speaking))) {
      AudioBus.speak(fullLine, sayAs, { replace: !voiceHold });
    }
  }

  function showChoices() {
    ui.choices.innerHTML = "";
    visibleChoices.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.textContent = (i + 1) + "    " + Story.fill(c.text, state);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        choose(i);
      });
      ui.choices.appendChild(b);
    });
    choicesUp = true;
    ui.cont.textContent = "Choose";
  }

  function openTalk(node) {
    lines = Story.readyLines(state).concat((node.lines || []).filter((l) => Story.match(l.when, state)));
    visibleChoices = (node.choices || []).filter((c) => Story.match(c.when, state));
    lineIndex = 0;
    setMode("talk");
    if (!lines.length) {
      if (visibleChoices.length) showChoices();
      else goNext(Story.resolve(node, state));
      return;
    }
    showLine(lines[0]);
  }

  function advanceTalk() {
    if (mode !== "talk" || journalOpen) return;
    if (shownChars < fullLine.length) {
      shownChars = fullLine.length;
      ui.line.textContent = fullLine;
      return;
    }
    lineIndex += 1;
    if (lineIndex < lines.length) showLine(lines[lineIndex]);
    else if (visibleChoices.length && !choicesUp) showChoices();
    else if (!visibleChoices.length) goNext(Story.resolve(current, state));
  }

  function choose(index) {
    if (mode !== "talk" || !choicesUp) return;
    const c = visibleChoices[index];
    if (!c) return;
    Story.apply(c.set, state);
    if (c.log) state.journal.push(Story.fill(c.log, state));
    AudioBus.ui();
    voiceHold = true;
    AudioBus.speak(Story.fill(c.text, state), "Mara", { replace: true });
    goNext(Story.resolve(c, state));
    voiceHold = false;
  }

  function goNext(id) {
    if (!id) {
      console.error("No next scene from", state && state.node);
      return;
    }
    beginNode(id, "enter");
  }

  function showEnding() {
    const end = Story.ending(state);
    ui.endKicker.textContent = end.kicker;
    ui.endTitle.textContent = end.title;
    ui.endps.innerHTML = "";
    end.paragraphs.forEach((para) => {
      const p = document.createElement("p");
      p.textContent = para;
      ui.endps.appendChild(p);
    });
    setMode("ending");
    AudioBus.speakSequence(end.paragraphs, "Narrator");
    save();
  }

  function startNode(node, why) {
    current = node;
    whyNow = why;
    if (why === "enter") {
      Story.onEnter(node.id || state.node, state);
      if (node.card) state.hp = Math.min(100, (state.hp ?? 100) + 10);
      state._wear = state.bladeWear || 0;
    } else if (why === "retry") {
      state.hp = 100;
      state.bladeWear = state._wear || 0;
    }
    player.hp = state.hp == null ? 100 : state.hp;
    player.stamina = 100;
    player.fall = 0;
    player.flinch = 0;
    if (player.mesh) {
      player.mesh.visible = true;
      player.mesh.rotation.x = 0;
      player.mesh.position.y = 0;
    }
    if (player.sword) player.sword.rotation.set(0, 0, 0);
    player.attack = 0;
    player.dodge = 0;
    player.iframe = 0;
    if (node.place || node.card) state.place = node.place || node.card;
    const needBuild = node.arena && (node.arena !== currentArenaId || node.card || currentArenaId === "title");
    if (needBuild) buildArena(node.arena);
    else {
      clearAllies();
      syncPeople();
      if ((why === "retry" || why === "restore") && player.mesh) {
        player.mesh.position.set(lastStart.x, 0, lastStart.z);
        yaw = lastStart.yaw;
      }
    }
    winTimer = 0;
    exploreDone = false;
    ui.hint.textContent = "";
    setMarker(null);
    if (node.kind === "combat" || node.kind === "explore") {
      if (!needBuild) clearZombies();
      spawnActors(node);
      if (node.kind === "combat") spawnAllies();
      setMode("play");
      lookLeft = 5;
      if (node.kind === "explore") {
        setMarker(markers[node.marker]);
        ui.hint.textContent = node.hint || "";
      }
      if (node.tip) showTip(node.tip, 7);
      else showTip("", 0);
    } else if (node.kind === "talk") {
      showTip("", 0);
      openTalk(node);
    } else if (node.kind === "black") {
      ui.blackText.textContent = Story.fill(node.text, state);
      setMode("black");
      AudioBus.speak(ui.blackText.textContent, "Narrator", { replace: !voiceHold });
    } else if (node.kind === "ending") {
      showEnding();
    }
    save();
    refreshHud();
    ui.card.style.opacity = "0";
    setTimeout(() => { if (mode !== "card") show(ui.card, false); }, 450);
  }

  function beginNode(id, why) {
    const node = Story.NODES[id];
    if (!node) {
      console.error("Missing scene", id);
      return;
    }
    node.id = id;
    clearTimeout(cardTimer);
    closeJournal();
    state.node = id;
    current = node;
    show(ui.title, false);
    show(ui.confirm, false);
    show(ui.dead, false);
    show(ui.end, false);
    show(ui.pause, false);
    if (node.card) {
      ui.cardKicker.textContent = node.kicker || "";
      ui.cardTitle.textContent = node.card;
      ui.card.style.opacity = "1";
      setMode("card");
      if (node.kind === "talk") {
        const first = (node.lines || []).find((l) => Story.match(l.when, state));
        if (first) AudioBus.speak(Story.fill(first.text, state), first.speaker || "Narrator");
      }
      cardTimer = setTimeout(() => startNode(node, why), 1500);
      return;
    }
    startNode(node, why);
  }

  function newGame(name) {
    clearSave();
    state = Story.createState(name);
    player.hp = 100;
    player.stamina = 100;
    ensurePlayer(true);
    beginNode("opening", "enter");
  }

  function loadGame() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE));
      if (!raw || !raw.node || !Story.NODES[raw.node]) return;
      state = raw.state;
      if (!state._did) state._did = {};
      if (!state.journal) state.journal = [];
      if (!state.pending) state.pending = {};
      state.day = state.day || Story.dayOf(raw.node);
      state.falls = state.falls || 0;
      state.juneDown = state.juneDown || 0;
      state.ellisDown = state.ellisDown || 0;
      state.calDown = state.calDown || 0;
      player.hp = state.hp ?? 100;
      ensurePlayer(true);
      beginNode(raw.node, "restore");
    } catch (e) { /* ignore broken saves */ }
  }

  function showTitle() {
    if (cardTimer) clearTimeout(cardTimer);
    AudioBus.stopSpeak();
    closeJournal();
    state = state || null;
    buildArena("dojo");
    clearGroup(peopleRoot);
    clearGroup(followRoot);
    if (player.mesh) player.mesh.visible = false;
    const hero = makeFigure({ color: 0x2c2926, skin: 0xc49a78, hair: 0x161412, sword: true });
    hero.position.set(0.4, 0, 5.5);
    actorRoot.add(hero);
    const zed = makeFigure({ color: 0x3a3c36, skin: 0x6a7264, zombie: true, kind: "shambler", seed: 9, lean: 0.42, scale: 1.08 });
    zed.position.set(-2.2, 0, -1.5);
    zed.userData.titleZ = true;
    actorRoot.add(zed);
    const lurk = makeFigure({ color: 0x5c4038, skin: 0x7a655c, zombie: true, kind: "runner", seed: 21, lean: 0.52, scale: 0.98 });
    lurk.position.set(5.6, 0, -6.4);
    lurk.userData.titleLurk = true;
    actorRoot.add(lurk);
    currentArenaId = "title";
    setMode("title");
    ui.hint.textContent = "";
    ui.prompt.textContent = "";
    ui.tip.textContent = "";
    const saved = hasSave();
    show(ui.btnContinue, saved);
    $("btn-new").textContent = saved ? "Start over" : "Begin";
  }

  function finishExplore() {
    if (exploreDone) return;
    exploreDone = true;
    clearZombies();
    goNext(Story.resolve(current, state));
  }

  function updateFollowers(dt) {
    if (!player.mesh) return;
    const { f, r } = flatVectors();
    const spots = [[-0.95, 2.45], [1.05, 2.9], [0.1, 3.4]];
    let i = 0;
    followRoot.children.forEach((child) => {
      const spot = spots[i++] || spots[0];
      const tx = player.mesh.position.x + r.x * spot[0] - f.x * spot[1];
      const tz = player.mesh.position.z + r.z * spot[0] - f.z * spot[1];
      child.position.x += (tx - child.position.x) * Math.min(1, dt * 3);
      child.position.z += (tz - child.position.z) * Math.min(1, dt * 3);
      child.position.y = 0;
      child.rotation.y = yaw;
    });
  }

  function updatePlayer(dt) {
    if (keys.has("ArrowLeft")) yaw += dt * 1.7;
    if (keys.has("ArrowRight")) yaw -= dt * 1.7;
    if (keys.has("ArrowUp")) pitch = clamp(pitch + dt * 0.8, -0.85, 0.45);
    if (keys.has("ArrowDown")) pitch = clamp(pitch - dt * 0.8, -0.85, 0.45);
    const { f, r } = flatVectors();
    let fx = 0, rx = 0;
    if (keys.has("KeyW")) fx += 1;
    if (keys.has("KeyS")) fx -= 1;
    if (keys.has("KeyD")) rx += 1;
    if (keys.has("KeyA")) rx -= 1;
    const wish = new THREE.Vector3(f.x * fx + r.x * rx, 0, f.z * fx + r.z * rx);
    if (wish.lengthSq() > 0) wish.normalize();
    let speed = 4.5;
    if (player.attack > 0) speed *= 0.62;
    if (rmb && player.attack <= 0) speed *= 0.55;
    const pos = player.mesh.position;
    if (player.dodge > 0) {
      player.dodge -= dt;
      pos.x += player.dodgeDir.x * 11 * dt;
      pos.z += player.dodgeDir.z * 11 * dt;
    } else if (wish.lengthSq() > 0) {
      pos.x += wish.x * speed * dt;
      pos.z += wish.z * speed * dt;
    }
    pushOut(pos, 0.42);
    player.mesh.rotation.y = yaw;
    if (player.iframe > 0) player.iframe -= dt;
    if (player.flinch > 0) player.flinch = Math.max(0, player.flinch - dt * 1.35);
    player.blocking = rmb && player.attack <= 0 && player.dodge <= 0 && player.stamina > 0 && mode === "play";
    if (player.blocking) {
      player.stamina = Math.max(0, player.stamina - dt * 18);
      player.staminaDelay = 0.25;
    }
      if (player.attack > 0) {
      player.attack -= dt;
      const u = 1 - Math.max(0, player.attack) / player.attackDur;
      if (u > 0.18 && u < 0.58) {
        const dmgBase = [32, 40, 52][player.combo] || 32;
        const wear = clamp(state.bladeWear || 0, 0, 0.62);
        const dmg = dmgBase * (player.weak ? 0.55 : 1) * (1 - wear * 0.7);
        zombies.forEach((z) => {
          if (z.dead || player.hitThis.has(z)) return;
          const dx = z.mesh.position.x - pos.x;
          const dz = z.mesh.position.z - pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 2.25 || dist < 0.001) return;
          const dot = (dx / dist) * f.x + (dz / dist) * f.z;
          if (dot < 0.18) return;
          player.hitThis.add(z);
          z.hp -= dmg;
          z.stun = 0.22;
          z.mesh.position.x += f.x * 0.35;
          z.mesh.position.z += f.z * 0.35;
          state.bladeWear = Math.min(0.62, (state.bladeWear || 0) + 0.028);
          AudioBus.hit();
          trauma = Math.min(1, trauma + 0.12);
          if (z.hp <= 0) killZombie(z);
        });
      }
      if (player.attack <= 0) {
        player.attack = 0;
        if (player.queue && player.combo < 2 && !player.weak && player.stamina >= 10) {
          player.queue = false;
          player.combo += 1;
          player.stamina -= 12;
          player.attackDur = 0.32;
          player.attack = player.attackDur;
          player.hitThis = new Set();
          AudioBus.swing();
        } else {
          player.combo = 0;
          player.queue = false;
        }
      }
    }
    if (player.staminaDelay > 0) player.staminaDelay -= dt;
    else player.stamina = Math.min(100, player.stamina + dt * 22);
  }

  function victimPoint(z) {
    if (z.victim && z.victim !== "player") {
      const ally = allies.find((a) => a.id === z.victim && !a.down);
      if (!ally) return null;
      return { id: ally.id, x: ally.mesh.position.x, z: ally.mesh.position.z };
    }
    return { id: "player", x: player.mesh.position.x, z: player.mesh.position.z };
  }

  function liveFocus(z) {
    const px = player.mesh.position.x;
    const pz = player.mesh.position.z;
    let best = { id: "player", x: px, z: pz, dist: Math.hypot(px - z.mesh.position.x, pz - z.mesh.position.z) || 0.001 };
    allies.forEach((a) => {
      if (a.down) return;
      const d = Math.hypot(a.mesh.position.x - z.mesh.position.x, a.mesh.position.z - z.mesh.position.z);
      const take = a.id === "ellis" ? d + 0.45 < best.dist : d < 1.35 && d < best.dist;
      if (take) best = { id: a.id, x: a.mesh.position.x, z: a.mesh.position.z, dist: d || 0.001 };
    });
    return best;
  }

  function updateAllies(dt) {
    if (!current || current.kind !== "combat" || !player.mesh) return;
    const { f, r } = flatVectors();
    const pos = player.mesh.position;
    allies.forEach((a) => {
      if (a.iframe > 0) a.iframe -= dt;
      if (a.down) return;
      if (a.cd > 0) a.cd -= dt;
      if (a.cloth && a.iframe <= 0) a.cloth.emissive.setHex(0x000000);
      let tx = pos.x;
      let tz = pos.z;
      if (a.role === "june") {
        const back = a.hang ? 2.7 : 0.15;
        const side = a.hang ? 1.35 : 1.15;
        tx = pos.x - r.x * side - f.x * back;
        tz = pos.z - r.z * side - f.z * back;
        if (!a.hang && a.cd <= 0) {
          const grab = zombies.find((z) => !z.dead && (z.type === "shambler" || z.type === "runner") && z.windup > 0
            && Math.hypot(z.mesh.position.x - pos.x, z.mesh.position.z - pos.z) < z.range + 0.45
            && Math.hypot(z.mesh.position.x - a.mesh.position.x, z.mesh.position.z - a.mesh.position.z) < 2.6);
          if (grab) {
            shoveZombie(grab, pos);
            a.swing = 0.34;
            a.cd = 3.3;
            if (a.cloth) a.cloth.emissive.setHex(0xc4b49a);
          }
        }
      } else if (a.role === "ellis") {
        const prey = nearestPrey(ellisMayHit);
        if (prey) {
          const edx = prey.mesh.position.x - a.mesh.position.x;
          const edz = prey.mesh.position.z - a.mesh.position.z;
          const ed = Math.hypot(edx, edz) || 1;
          const hold = Math.max(0, ed - 1.2);
          tx = a.mesh.position.x + (edx / ed) * hold;
          tz = a.mesh.position.z + (edz / ed) * hold;
          const d = ed;
          if (d < 1.55 && a.cd <= 0) {
            prey.hp -= 18;
            prey.stun = 0.2;
            a.swing = 0.34;
            a.cd = 1.35;
            AudioBus.hit();
            if (a.cloth) a.cloth.emissive.setHex(0xc4b49a);
            if (prey.hp <= 0) killZombie(prey);
          }
        } else {
          tx = pos.x + r.x * 1.35 - f.x * 0.35;
          tz = pos.z + r.z * 1.35 - f.z * 0.35;
        }
      } else {
        tx = pos.x - f.x * 1.45 + r.x * 0.35;
        tz = pos.z - f.z * 1.45 + r.z * 0.35;
        if (!a.pulled) {
          const grab = zombies.find((z) => !z.dead && z.windup > 0
            && Math.hypot(z.mesh.position.x - pos.x, z.mesh.position.z - pos.z) < z.range + 0.35);
          if (grab) {
            shoveZombie(grab, pos);
            a.swing = 0.34;
            a.pulled = true;
            a.cd = 1;
            Story.remember(state, "pull");
            showTip("Cal pulls it off you.", 1.8);
          }
        }
      }
      const dx = tx - a.mesh.position.x;
      const dz = tz - a.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const step = (a.role === "ellis" ? 3.1 : 3.4) * dt;
      if (dist > 0.35) {
        const take = Math.min(step, dist);
        a.mesh.position.x += (dx / dist) * take;
        a.mesh.position.z += (dz / dist) * take;
      }
      if (dist > 0.05) a.mesh.rotation.y = Math.atan2(-dx, -dz);
      pushOut(a.mesh.position, 0.36);
      const gap = Math.hypot(a.mesh.position.x - pos.x, a.mesh.position.z - pos.z);
      if (a.role !== "ellis" && gap < 0.7 && gap > 0.001) {
        a.mesh.position.x += ((a.mesh.position.x - pos.x) / gap) * (0.7 - gap);
        a.mesh.position.z += ((a.mesh.position.z - pos.z) / gap) * (0.7 - gap);
      }
    });
  }

  function yawTo(mesh, dirx, dirz, dt, rate) {
    const want = Math.atan2(-dirx, -dirz);
    let dy = want - mesh.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    mesh.rotation.y += dy * Math.min(1, dt * rate);
  }

  function updateZombies(dt) {
    const pos = player.mesh.position;
    zombies.forEach((z) => {
      if (z.dead) return;
      const focus = z.windup > 0 ? victimPoint(z) : liveFocus(z);
      if (!focus) {
        z.windup = 0;
        z.victim = null;
        return;
      }
      const dx = focus.x - z.mesh.position.x;
      const dz = focus.z - z.mesh.position.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const dirx = dx / dist;
      const dirz = dz / dist;
      const pdx = pos.x - z.mesh.position.x;
      const pdz = pos.z - z.mesh.position.z;
      const pdist = Math.hypot(pdx, pdz) || 0.001;
      const rate = z.windup > 0 ? 1.5 : (z.type === "runner" ? 7.2 : z.type === "brute" ? 2.05 : 3.1);
      yawTo(z.mesh, dirx, dirz, dt, rate);
      if (!z.human && z.type === "runner") {
        if (pdist < 3.4 && !z.stung) {
          z.stung = true;
          trauma = Math.min(1, trauma + 0.55);
          hurtFlash();
          AudioBus.zombie("scream", Math.max(-1, Math.min(1, (z.mesh.position.x - pos.x) / 3)), 0.36, 0.12);
        } else if (pdist > 6.5) z.stung = false;
      }
      if (z.stun > 0) {
        z.stun -= dt;
        if (z.cloth) z.cloth.emissive.setHex(0x000000);
        return;
      }
      if (z.windup > 0) {
        z.windup -= dt;
        if (z.cloth) z.cloth.emissive.setHex(0x6a221c);
        if (z.windup <= 0) {
          if (z.cloth) z.cloth.emissive.setHex(0x000000);
          const hit = victimPoint(z);
          const hitDist = hit ? Math.hypot(hit.x - z.mesh.position.x, hit.z - z.mesh.position.z) : 99;
          if (hit && hitDist < z.range + 0.35) {
            if (hit.id === "player") {
              const blocked = player.blocking && player.stamina > 1;
              damagePlayer(z.dmg);
              if (blocked) z.stun = 0.35;
            } else {
              hurtAlly(allies.find((a) => a.id === hit.id), z.dmg);
            }
          }
          z.victim = null;
        }
        return;
      }
      if (z.human && z.gun && pdist > 3.5 && pdist < 15) {
        z.shootCd -= dt;
        const strafeX = -pdz / pdist;
        const strafeZ = pdx / pdist;
        z.mesh.position.x += strafeX * z.speed * 0.35 * dt;
        z.mesh.position.z += strafeZ * z.speed * 0.35 * dt;
        z.mesh.rotation.y = Math.atan2(-pdx / pdist, -pdz / pdist);
        if (z.shootCd <= 0 && z.aiming <= 0) z.aiming = 0.42;
        if (z.aiming > 0) {
          z.aiming -= dt;
          if (z.cloth) z.cloth.emissive.setHex(0x6a221c);
          if (z.aiming <= 0) {
            if (z.cloth) z.cloth.emissive.setHex(0x000000);
            fireBullet(z);
            z.shootCd = 2.15;
          }
        }
      } else if (dist > z.range * 0.92) {
        z.mesh.position.x += dirx * z.speed * dt;
        z.mesh.position.z += dirz * z.speed * dt;
        if (z.cloth) z.cloth.emissive.setHex(0x000000);
      } else {
        z.windup = z.windup0;
        z.victim = focus.id;
        if (!z.human) z.voiceCd = 0;
        if (pdist < 3.4) trauma = Math.min(1, trauma + (z.type === "brute" ? 0.22 : 0.1));
      }
      pushOut(z.mesh.position, 0.38);
    });
    for (let i = 0; i < zombies.length; i++) {
      for (let j = i + 1; j < zombies.length; j++) {
        const a = zombies[i], b = zombies[j];
        if (a.dead || b.dead) continue;
        const dx = a.mesh.position.x - b.mesh.position.x;
        const dz = a.mesh.position.z - b.mesh.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 0.85) {
          const p = (0.85 - d) / d * 0.35;
          a.mesh.position.x += dx * p;
          a.mesh.position.z += dz * p;
          b.mesh.position.x -= dx * p;
          b.mesh.position.z -= dz * p;
        }
      }
    }
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.z += b.vz * dt;
      const struck = allies.find((a) => !a.down && Math.hypot(b.mesh.position.x - a.mesh.position.x, b.mesh.position.z - a.mesh.position.z) < 0.5);
      if (struck) {
        hurtAlly(struck, b.dmg);
        actorRoot.remove(b.mesh);
        disposeObj(b.mesh);
        bullets.splice(i, 1);
        continue;
      }
      const d = Math.hypot(b.mesh.position.x - player.mesh.position.x, b.mesh.position.z - player.mesh.position.z);
      if (d < 0.55) {
        damagePlayer(b.dmg);
        actorRoot.remove(b.mesh);
        disposeObj(b.mesh);
        bullets.splice(i, 1);
      } else if (b.life <= 0) {
        actorRoot.remove(b.mesh);
        disposeObj(b.mesh);
        bullets.splice(i, 1);
      }
    }
  }

  function updateCamera(dt) {
    if (!player.mesh) return;
    const { f } = flatVectors();
    const pos = player.mesh.position;
    const near = nearestHostile();
    const close = clamp(1 - near / 6, 0, 1);
    if (mode === "talk") {
      const id = SPEAKER[speakerNow];
      const focus = findActor(id) || player.mesh;
      camTalk.set(focus.position.x + 2.2, 1.85, focus.position.z + 3.4);
      camera.position.lerp(camTalk, 1 - Math.exp(-2.4 * dt));
      camera.lookAt(focus.position.x, 1.35, focus.position.z);
      camera.rotateZ(Math.sin(time * 0.6) * 0.012);
      return;
    }
    camDesired.copy(pos).addScaledVector(f, -camDist);
    camDesired.y = 2.25 - pitch * 0.45;
    camera.position.lerp(camDesired, 1 - Math.exp(-7 * dt));
    camLook.copy(pos);
    camLook.y += 1.35 + pitch;
    camLook.addScaledVector(f, 1.5);
    camera.lookAt(camLook);
    const sway = mode === "play" ? 1 : 0.2;
    camera.position.x += Math.sin(time * 1.35) * 0.02 * sway * (0.35 + close);
    camera.position.y += Math.sin(time * 2.05) * 0.015 * sway;
    if (trauma > 0) {
      const s = trauma * trauma;
      camera.position.x += (Math.random() - 0.5) * s * 0.55;
      camera.position.y += (Math.random() - 0.5) * s * 0.36;
      trauma = Math.max(0, trauma - dt * 1.35);
    }
    camera.rotateZ(Math.sin(time * 0.85) * 0.01 * (0.25 + close) + (Math.random() - 0.5) * close * 0.008);
    const wantFov = 51 + close * 5 + (player.hp > 0 && player.hp < 30 ? 2.5 : 0);
    if (Math.abs(camera.fov - wantFov) > 0.04) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 2.8);
      camera.updateProjectionMatrix();
    }
  }

  function updateZombieVoices(dt) {
    if (!player.mesh) return;
    const audible = !!(AudioBus.ctx && !AudioBus.muted);
    const { r } = flatVectors();
    const px = player.mesh.position.x;
    const pz = player.mesh.position.z;
    const ready = [];
    zombies.forEach((z) => {
      if (z.mesh.userData.jaw) z.mouth = Math.max(0, (z.mouth || 0) - dt * (z.dead ? 2.2 : 0.62));
      if (!audible || z.dead || z.human) return;
      z.voiceCd = (z.voiceCd || 0) - dt;
      const dx = z.mesh.position.x - px;
      const dz = z.mesh.position.z - pz;
      const dist = Math.hypot(dx, dz);
      const hear = z.type === "brute" ? 14 : z.type === "runner" ? 11 : 9;
      if ((z.hearDist == null || z.hearDist > hear) && dist <= hear) {
        z.voiceCd = Math.min(z.voiceCd, 0.05 + Math.random() * 0.2);
      }
      z.hearDist = dist;
      if (dist > hear || z.voiceCd > 0) return;
      const side = (dx * r.x + dz * r.z) / Math.max(dist, 0.001);
      ready.push({ z, dist, side, hear, attacking: z.windup > 0 });
    });
    ready.sort((a, b) => a.dist - b.dist);
    ready.forEach((item, i) => {
      const { z, dist, side, hear, attacking } = item;
      const close = 1 - dist / hear;
      let kind = "moan";
      if (attacking) kind = z.type === "brute" ? "brute" : "snarl";
      else if (z.type === "brute") kind = "brute";
      else if (dist < 2.3 && Math.random() < 0.45) kind = "hiss";
      else if (z.type === "runner" && dist < 5 && Math.random() < 0.22) kind = "scream";
      else if (z.type === "runner") kind = Math.random() < 0.6 ? "snarl" : "moan";
      else if (Math.random() < 0.18) kind = "snarl";
      const vol = Math.min(0.62, (0.05 + close * close * 0.48) * (z.type === "brute" ? 1.22 : 1) * (attacking ? 1.28 : 1));
      const played = AudioBus.zombie(kind, side * 0.92, vol, 1 - close);
      if (played) {
        z.mouth = 1;
        const base = attacking ? 0.95 : (z.type === "runner" ? 1.25 : z.type === "brute" ? 2.5 : 2.05);
        z.voiceCd = base * (1.35 - close * 0.95) * (0.7 + Math.random() * 0.65);
      } else {
        z.voiceCd = 0.2 + Math.random() * 0.25 + i * 0.06;
      }
    });
  }

  function updatePlay(dt) {
    updatePlayer(dt);
    updateAllies(dt);
    updateZombies(dt);
    updateZombieVoices(dt);
    updateBullets(dt);
    updateFollowers(dt);
    if (current && current.kind === "combat" && winTimer <= 0 && livingHostiles() === 0 && zombies.length > 0) {
      winTimer = 1.15;
      showTip("It goes quiet.", 1.2);
    }
    if (winTimer > 0) {
      winTimer -= dt;
      if (winTimer <= 0) goNext(Story.resolve(current, state));
    }
    if (current && current.kind === "explore" && !exploreDone) {
      const m = markers[current.marker];
      if (m && player.mesh) {
        const d = Math.hypot(player.mesh.position.x - m.x, player.mesh.position.z - m.z);
        const near = nearestHostile();
        if (d < 2.5 && near > 2.1) ui.prompt.textContent = "E    " + (m.label || "approach");
        else if (d < 2.5) ui.prompt.textContent = "Not while one is on you";
        else ui.prompt.textContent = "";
        if (markerMesh) {
          const s = 1 + Math.sin(time * 3) * 0.08;
          markerMesh.scale.set(s, s, s);
        }
      }
    } else ui.prompt.textContent = "";
    if (lookLeft > 0) {
      lookLeft -= dt;
      show(ui.look, document.pointerLockElement !== ui.canvas && lookLeft > 0);
    } else show(ui.look, false);
    if (tipLeft > 0) {
      tipLeft -= dt;
      if (tipLeft <= 0) ui.tip.textContent = "";
    }
  }

  function updateAsh(dt) {
    if (!ash) return;
    const p = ash.geometry.attributes.position;
    const arr = p.array;
    const ox = camera.position.x;
    const oz = camera.position.z;
    const rise = dt * 0.22;
    const drift = dt * 0.28;
    for (let i = 0; i < arr.length; i += 3) {
      let x = arr[i] + drift;
      let y = arr[i + 1] + rise;
      let z = arr[i + 2];
      if (y > 7.5) y = 0.15;
      if (x - ox > 22) x -= 44;
      else if (x - ox < -22) x += 44;
      if (z - oz > 22) z -= 44;
      else if (z - oz < -22) z += 44;
      arr[i] = x;
      arr[i + 1] = y;
      arr[i + 2] = z;
    }
    p.needsUpdate = true;
  }

  function updateDread(dt) {
    const playing = mode === "play" && player.mesh && player.hp > 0;
    const near = playing ? nearestHostile() : 99;
    const close = playing ? clamp(1 - near / 5.5, 0, 1) : 0;
    const low = playing && player.hp < 42 ? clamp((42 - player.hp) / 42, 0, 1) : 0;
    if (ui.app) {
      ui.app.classList.toggle("dread-close", close > 0.42);
      ui.app.classList.toggle("dread-low", low > 0.2);
      ui.app.classList.toggle("dread-critical", playing && player.hp < 22);
    }
    if (scene.fog) {
      fearColor.setHex(fogBase).lerp(fearHot, close * 0.62 + low * 0.28);
      scene.fog.color.copy(fearColor);
      if (scene.background && scene.background.isColor) scene.background.copy(fearColor);
    }
    const rest = moon.userData.rest || moon.intensity;
    const blink = Math.sin(time * 19.0) > 0.985 ? 0.45 : 1;
    moon.intensity = rest * (0.9 + Math.sin(time * 0.8) * 0.08) * blink;
    flickerLights.forEach((light) => {
      const base = light.userData.rest || 1;
      const phase = light.userData.phase || 0;
      let n = 0.78 + Math.sin(time * 16 + phase) * 0.08 + Math.sin(time * 47 + phase * 2) * 0.05;
      if (Math.sin(time * 3.1 + phase) > 0.97) n *= 0.35 + Math.random() * 0.3;
      light.intensity = base * n;
    });
    if (rim) rim.intensity = 0.28 + close * 0.45 + Math.sin(time * 1.7) * 0.04;
    const panic = Math.max(close, low);
    if (playing && panic > 0.35) {
      heart -= dt * (1.1 + panic * 1.8);
      if (heart <= 0) {
        AudioBus.heartbeat(panic);
        heart = 0.95 - panic * 0.35;
      }
    } else heart = Math.min(1.3, heart + dt);
  }

  function update(dt) {
    if (!simReady) return;
    time += dt;
    updateRain(dt);
    updateAsh(dt);
    updateDread(dt);
    if (mode === "title") {
      titleTime += dt;
      const a = titleTime * 0.11;
      camera.position.set(Math.sin(a) * 8.2, 1.85, Math.cos(a) * 8.2);
      camera.lookAt(0, 1.05, -0.4);
      camera.rotateZ(Math.sin(titleTime * 0.37) * 0.045);
      const zed = actorRoot.children.find((c) => c.userData && c.userData.titleZ);
      if (zed) {
        const x = Math.sin(titleTime * 0.42) * 2.4;
        const z = -0.6 + Math.cos(titleTime * 0.28) * 1.1;
        const dx = x - zed.position.x;
        const dz = z - zed.position.z;
        zed.position.x = x;
        zed.position.z = z;
        if (Math.hypot(dx, dz) > 0.0008) zed.rotation.y = Math.atan2(-dx, -dz);
      }
      const lurk = actorRoot.children.find((c) => c.userData && c.userData.titleLurk);
      if (lurk) {
        const tx = 0.35;
        const tz = 4.6;
        const dx = tx - lurk.position.x;
        const dz = tz - lurk.position.z;
        const dist = Math.hypot(dx, dz) || 0.001;
        if (dist < 1.15) lurk.position.set(6.2, 0, -7.2);
        else {
          lurk.position.x += (dx / dist) * dt * 1.35;
          lurk.position.z += (dz / dist) * dt * 1.35;
          lurk.rotation.y = Math.atan2(-dx, -dz);
        }
      }
      poseWorld(dt);
      renderer.render(scene, camera);
      AudioBus.tension(0.22);
      titleVoice -= dt;
      if (titleVoice <= 0) {
        titleVoice = 2.4 + Math.random() * 2.6;
        if (AudioBus.ctx && !AudioBus.muted) {
          const kind = Math.random() < 0.28 ? "scream" : Math.random() < 0.5 ? "hiss" : "moan";
          AudioBus.zombie(kind, Math.sin(titleTime * 0.7) * 0.65, kind === "scream" ? 0.1 : 0.16, 0.45);
        }
      }
      return;
    }
    if (journalOpen) {
      renderer.render(scene, camera);
      return;
    }
    if (mode === "play") updatePlay(dt);
    else if (mode === "talk" || mode === "black" || mode === "card" || mode === "pause" || mode === "dead") {
      updateFollowers(dt);
      if (mode === "talk" && shownChars < fullLine.length) {
        shownChars += dt * 42;
        ui.line.textContent = fullLine.slice(0, Math.floor(shownChars));
      }
    }
    poseWorld(dt);
    if (mode !== "ending" && mode !== "title") updateCamera(dt);
    const showLabels = !!(current && current.kind === "explore");
    if (showLabels !== labelsShown) {
      labelsShown = showLabels;
      const hideOrShow = (group) => group.traverse((o) => {
        if (o.userData && o.userData.isLabel) o.visible = showLabels;
      });
      hideOrShow(peopleRoot);
      hideOrShow(followRoot);
    }
    const near = player.mesh ? nearestHostile() : 99;
    let tension = mode === "play" ? clamp(1 - near / 9, 0, 1) : 0.04;
    if (player.hp < 35) tension += 0.25;
    AudioBus.tension(tension);
    refreshHud();
    renderer.render(scene, camera);
  }

  function init(canvas) {
    ui.canvas = canvas;
    ui.app = $("app");
    ui.title = $("title");
    ui.hud = $("hud");
    ui.place = $("place");
    ui.hint = $("hint");
    ui.prompt = $("prompt");
    ui.tip = $("tip");
    ui.dialogue = $("dialogue");
    ui.who = $("who");
    ui.line = $("line");
    ui.choices = $("choices");
    ui.cont = $("cont");
    ui.card = $("card");
    ui.cardKicker = $("card-kicker");
    ui.cardTitle = $("card-title");
    ui.blackout = $("blackout");
    ui.blackText = $("black-text");
    ui.pause = $("pause");
    ui.dead = $("dead");
    ui.journal = $("journal");
    ui.rel = $("rel");
    ui.log = $("log");
    ui.end = $("end");
    ui.endKicker = $("end-kicker");
    ui.endTitle = $("end-title");
    ui.endps = $("endps");
    ui.confirm = $("confirm");
    ui.look = $("lookmsg");
    ui.vignette = $("vignette");
    ui.bleed = $("bleed");
    ui.fillHp = $("fill-hp");
    ui.fillSt = $("fill-st");
    ui.fillEdge = $("fill-edge");
    ui.barHp = $("bar-hp");
    ui.btnContinue = $("btn-continue");

    function renderScale() {
      return Math.min(window.devicePixelRatio || 1, 1.5);
    }

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: (window.devicePixelRatio || 1) <= 1,
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer.setPixelRatio(renderScale());
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(51, window.innerWidth / window.innerHeight, 0.08, 180);
    hemi = new THREE.HemisphereLight(0x4a444c, 0x1a1212, 0.82);
    moon = new THREE.DirectionalLight(0x9aabb8, 1.05);
    moon.position.set(-16, 24, 10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.03;
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 80;
    moon.shadow.camera.left = -28;
    moon.shadow.camera.right = 28;
    moon.shadow.camera.top = 28;
    moon.shadow.camera.bottom = -28;
    amb = new THREE.AmbientLight(0x2a2022, 0.22);
    rim = new THREE.DirectionalLight(0x6a1820, 0.34);
    rim.position.set(12, 3.5, -14);
    scene.add(hemi, moon, amb, rim);
    const moonBall = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xb7c0cc })
    );
    moonBall.position.set(-32, 18, -22);
    scene.add(moonBall);
    const ashN = 420;
    const ashGeo = new THREE.BufferGeometry();
    const ashArr = new Float32Array(ashN * 3);
    for (let i = 0; i < ashN; i++) {
      ashArr[i * 3] = (Math.random() - 0.5) * 44;
      ashArr[i * 3 + 1] = Math.random() * 7;
      ashArr[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    ashGeo.setAttribute("position", new THREE.BufferAttribute(ashArr, 3));
    ash = new THREE.Points(ashGeo, new THREE.PointsMaterial({
      color: 0xc8b0a0,
      size: 0.03,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }));
    scene.add(ash);
    propsRoot = new THREE.Group();
    actorRoot = new THREE.Group();
    peopleRoot = new THREE.Group();
    followRoot = new THREE.Group();
    scene.add(propsRoot, actorRoot, peopleRoot, followRoot);

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(renderScale());
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("click", () => {
      AudioBus.ensure();
      if (mode === "black") { goNext(Story.resolve(current, state)); return; }
      if (mode === "talk") { if (!choicesUp) advanceTalk(); return; }
      if (mode !== "play" || journalOpen) return;
      try {
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
      } catch (err) { /* mouse look is optional */ }
      tryAttack();
    });
    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== canvas || mode !== "play") return;
      yaw -= e.movementX * 0.0022;
      pitch = clamp(pitch - e.movementY * 0.0018, -0.85, 0.45);
    });
    window.addEventListener("mousedown", (e) => { if (e.button === 2) rmb = true; });
    window.addEventListener("mouseup", (e) => { if (e.button === 2) rmb = false; });
    window.addEventListener("keydown", (e) => {
      keys.add(e.code);
      if (e.code === "Space") e.preventDefault();
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "KeyM") {
        const muted = !AudioBus.muted;
        AudioBus.setMuted(muted);
        try { localStorage.setItem(MUTE, muted ? "1" : "0"); } catch (err) { /* ignore */ }
        $("btn-sound").textContent = muted ? "Sound off" : "Sound on";
      }
      if (e.code === "KeyJ") openJournal();
      if (e.code === "Escape") {
        if (journalOpen) closeJournal();
        else if (mode === "play") setMode("pause");
        else if (mode === "pause") setMode("play");
      }
      if (e.code === "Space" || e.code === "Enter") {
        if (mode === "talk") advanceTalk();
        else if (mode === "black") goNext(Story.resolve(current, state));
        else if (mode === "play") tryDodge();
      }
      if (e.code === "KeyE" && mode === "play" && current && current.kind === "explore") {
        const m = markers[current.marker];
        if (!m || !player.mesh) return;
        const d = Math.hypot(player.mesh.position.x - m.x, player.mesh.position.z - m.z);
        if (d < 2.5 && nearestHostile() > 2.1) finishExplore();
      }
      if (mode === "talk" && choicesUp && /^Digit[1-4]$/.test(e.code)) choose(Number(e.code.slice(5)) - 1);
    });
    window.addEventListener("keyup", (e) => keys.delete(e.code));
    window.addEventListener("blur", () => { keys.clear(); rmb = false; });
    ui.dialogue.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (!choicesUp) advanceTalk();
    });
    ui.blackout.addEventListener("click", () => {
      if (mode === "black") goNext(Story.resolve(current, state));
    });

    $("btn-new").addEventListener("click", () => {
      AudioBus.ensure();
      if (hasSave()) { show(ui.confirm, true); show(ui.title, false); return; }
      newGame($("name").value);
    });
    $("btn-yes").addEventListener("click", () => { AudioBus.ensure(); newGame($("name").value); });
    $("btn-no").addEventListener("click", () => { show(ui.confirm, false); show(ui.title, true); });
    $("btn-continue").addEventListener("click", () => { AudioBus.ensure(); loadGame(); });
    $("btn-sound").addEventListener("click", () => {
      const muted = !AudioBus.muted;
      AudioBus.setMuted(muted);
      try { localStorage.setItem(MUTE, muted ? "1" : "0"); } catch (e) { /* ignore */ }
      $("btn-sound").textContent = muted ? "Sound off" : "Sound on";
      if (!muted) AudioBus.ensure();
    });
    $("btn-resume").addEventListener("click", () => setMode("play"));
    $("btn-journal").addEventListener("click", openJournal);
    $("btn-close-journal").addEventListener("click", closeJournal);
    $("btn-quit").addEventListener("click", () => { save(); showTitle(); });
    $("btn-retry").addEventListener("click", () => beginNode(state.node, "retry"));
    $("btn-dead-title").addEventListener("click", () => showTitle());
    $("btn-end").addEventListener("click", () => showTitle());

    try {
      if (localStorage.getItem(MUTE) === "1") {
        AudioBus.setMuted(true);
        $("btn-sound").textContent = "Sound off";
      }
    } catch (e) { /* ignore */ }

    simReady = true;
    showTitle();
  }

  root.Game = { init, update };
})(window);
