(function (root) {
  const SAVE = "zombie-slayer-harrow-1";
  const MUTE = "zombie-slayer-muted";
  const TYPES = {
    shambler: { hp: 40, speed: 1.42, dmg: 11, windup: 0.48, range: 1.32, lean: 0.28, scale: 1, cloth: 0x4e554c, skin: 0x7d8474 },
    runner: { hp: 28, speed: 3.05, dmg: 13, windup: 0.28, range: 1.42, lean: 0.42, scale: 0.96, cloth: 0x6a534c, skin: 0x8d7b70 },
    brute: { hp: 120, speed: 1.02, dmg: 20, windup: 0.62, range: 1.75, lean: 0.12, scale: 1.32, cloth: 0x2e302c, skin: 0x5e6458 },
    raider: { hp: 56, speed: 2.35, dmg: 13, windup: 0.36, range: 1.45, lean: 0, scale: 1, cloth: 0x4a4038, skin: 0xc4a484, human: true, gun: true },
  };
  const SPEAKER = { June: "june", Harris: "harris", Ellis: "ellis", Cal: "cal", Nedra: "nedra", Owen: "owen", Ruth: "ruth", Voss: "voss", Pete: "pete" };

  const player = {
    mesh: null, sword: null, hp: 100, stamina: 100, staminaDelay: 0,
    attack: 0, attackDur: 0.4, combo: 0, queue: false, weak: false,
    dodge: 0, dodgeDir: new THREE.Vector3(), iframe: 0, blocking: false,
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
  let rain = null;
  let markerMesh = null;
  let exploreDone = false;
  let simReady = false;

  const $ = (id) => document.getElementById(id);
  const ui = {};

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function flatVectors() {
    const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    return { f, r };
  }

  function disposeObj(o) {
    o.traverse((c) => {
      if (c.geometry && !c.geometry.userData.keep) c.geometry.dispose();
      if (!c.material) return;
      const ms = Array.isArray(c.material) ? c.material : [c.material];
      ms.forEach((m) => {
        if (m.map && !m.map.userData.shared) m.map.dispose();
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

  function matStd(color, rough, metal) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough == null ? 0.9 : rough, metalness: metal || 0 });
  }

  function makeLabel(text) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 256, 64);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(28, 14, 200, 36);
    g.font = "24px Georgia";
    g.fillStyle = "#e6dccb";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 128, 34);
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
      bevelSegments: 1,
      curveSegments: 2,
    });
    geo.translate(0, 0, -0.01);
    return geo;
  }

  function makeSword(pivot) {
    const steel = new THREE.MeshStandardMaterial({ color: 0xd5dde4, roughness: 0.2, metalness: 0.9, emissive: 0x3a4248, emissiveIntensity: 0.45 });
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

  function makeFigure(opts) {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);
    const zombie = !!opts.zombie;
    const bulky = (opts.scale || 1) >= 1.2;
    const lanky = zombie && (opts.scale || 1) < 0.99;
    const broad = (opts.broad || 1) * (bulky ? 1.22 : 1);
    const skin = matStd(opts.skin || 0xc4a484, zombie ? 0.72 : 0.78);
    const cloth = matStd(opts.color || 0x33302c, 0.9);
    const leatherCol = new THREE.Color(opts.color || 0x33302c).lerp(new THREE.Color(zombie ? 0x14110e : 0x2a2118), zombie ? 0.72 : 0.5);
    const leather = matStd(leatherCol.getHex(), 0.84, 0.04);
    const hairMat = matStd(opts.hair || (zombie ? 0x12100e : 0x1a1614), 1);
    const metal = matStd(0x3e444a, 0.35, 0.62);
    const gore = new THREE.MeshStandardMaterial({ color: 0x5a1614, emissive: 0x2a0808, emissiveIntensity: 0.45, roughness: 0.62 });
    const bone = matStd(0xc8c0b0, 0.7, 0.05);
    const horn = matStd(0x2a2420, 0.55, 0.12);
    const armR = bulky ? 0.105 : lanky ? 0.062 : 0.078;
    const legR = bulky ? 0.135 : lanky ? 0.078 : 0.108;
    const chestW = (bulky ? 0.56 : 0.46) * broad;
    const shinMat = zombie ? skin : cloth;
    const foreMat = zombie ? skin : cloth;

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
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 6), material);
      mesh.position.y = -(length / 2 + radius);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function addLeg(side) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.13, 0.9, 0.02);
      hip.rotation.z = side * 0.04;
      hip.rotation.x = zombie ? 0.18 : 0.06;
      const thighSpan = 0.42;
      const thighLen = Math.max(0.12, thighSpan - legR * 2);
      limbDown(hip, legR, thighLen, cloth);
      const knee = new THREE.Group();
      knee.position.y = -thighSpan;
      knee.rotation.x = zombie ? -0.22 : 0.1;
      const shinR = legR * 0.7;
      const shinSpan = 0.4;
      const shinLen = Math.max(0.12, shinSpan - shinR * 2);
      limbDown(knee, shinR, shinLen, shinMat);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.24), leather);
      boot.position.set(0, -shinSpan + 0.05, zombie ? 0.02 : -0.04);
      boot.castShadow = true;
      knee.add(boot);
      hip.add(knee);
      inner.add(hip);
    }

    addLeg(-1);
    addLeg(1);

    const head = addPart(inner, new THREE.SphereGeometry(0.155, 10, 8), skin, 0, 1.7, -0.02);
    head.scale.set(0.92, 1.08, 0.98);
    const jaw = addPart(inner, new THREE.BoxGeometry(0.14, zombie ? 0.055 : 0.07, 0.11), skin, 0, zombie ? 1.52 : 1.56, zombie ? -0.07 : -0.04);
    if (zombie) {
      jaw.rotation.x = 0.45;
      jaw.userData.rest = jaw.rotation.x;
      g.userData.jaw = jaw;
    }
    const brow = addPart(inner, new THREE.BoxGeometry(0.18, 0.045, 0.08), hairMat, 0, 1.76, -0.11);
    brow.rotation.x = zombie ? 0.15 : 0.55;

    if (zombie) {
      addPart(inner, new THREE.BoxGeometry(0.1, 0.045, 0.05), matStd(0x140808, 0.9), 0, 1.54, -0.13);
      for (let i = -1; i <= 1; i++) {
        addPart(inner, new THREE.BoxGeometry(0.018, 0.03, 0.018), bone, i * 0.028, 1.55, -0.15);
      }
      addPart(inner, new THREE.BoxGeometry(0.16, 0.1, 0.02), gore, 0, 1.16, -0.15);
      addPart(inner, new THREE.BoxGeometry(0.1, 0.22, 0.03), gore, 0.1, 1.22, -0.13, 0, 0, 0.4);
      addPart(inner, new THREE.BoxGeometry(0.22, 0.16, 0.04), cloth, 0.02, 0.7, 0.12, 0.8, 0.2, 0.4);
      addPart(inner, new THREE.BoxGeometry(0.012, 0.16, 0.012), hairMat, -0.06, 1.78, 0.08, 0.4, 0, 0.5);
      addPart(inner, new THREE.BoxGeometry(0.012, 0.2, 0.012), hairMat, 0.05, 1.74, 0.1, 0.2, 0, -0.3);
      const socket = matStd(0x0c0908, 0.9);
      addPart(inner, new THREE.SphereGeometry(0.045, 6, 5), socket, -0.055, 1.68, -0.12);
      addPart(inner, new THREE.SphereGeometry(0.04, 6, 5), socket, 0.06, 1.66, -0.12);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a0806, emissive: 0xff2e14, emissiveIntensity: 1.35, roughness: 0.28 });
      const e1 = addPart(inner, new THREE.SphereGeometry(0.032, 8, 6), eyeMat, -0.055, 1.685, -0.145);
      e1.scale.set(1, 0.75, 0.7);
      const e2 = addPart(inner, new THREE.SphereGeometry(0.026, 8, 6), eyeMat, 0.062, 1.655, -0.15);
      e2.scale.set(1.1, 0.9, 0.7);
      inner.rotation.x = opts.lean || 0.28;
    } else if (opts.sword) {
      const hood = addPart(inner, new THREE.SphereGeometry(0.19, 10, 8), leather, 0, 1.78, 0.07);
      hood.scale.set(1.02, 0.7, 0.95);
      addPart(inner, new THREE.BoxGeometry(0.18, 0.12, 0.08), leather, 0, 1.5, 0.08);
      const scar = addPart(inner, new THREE.BoxGeometry(0.11, 0.018, 0.02), gore, -0.04, 1.69, -0.15, 0, 0, 0.7);
      scar.castShadow = false;
      const eyeMat = matStd(0x14110e, 0.35);
      const e1 = addPart(inner, new THREE.SphereGeometry(0.028, 8, 6), eyeMat, -0.05, 1.68, -0.15);
      const e2 = addPart(inner, new THREE.SphereGeometry(0.028, 8, 6), eyeMat, 0.05, 1.68, -0.15);
      e1.scale.y = 0.4;
      e2.scale.y = 0.4;
    } else {
      const cap = addPart(inner, new THREE.SphereGeometry(0.16, 8, 6), hairMat, 0, 1.78, 0.02);
      cap.scale.set(0.98, 0.5, 1.02);
      addPart(inner, new THREE.BoxGeometry(0.07, 0.14, 0.12), hairMat, -0.1, 1.66, 0.02);
      addPart(inner, new THREE.BoxGeometry(0.07, 0.14, 0.12), hairMat, 0.1, 1.66, 0.02);
      addPart(inner, new THREE.BoxGeometry(0.2, 0.1, 0.06), leather, 0, 1.52, 0.08);
      const eyeMat = matStd(0x14110e, 0.35);
      const e1 = addPart(inner, new THREE.SphereGeometry(0.026, 8, 6), eyeMat, -0.05, 1.68, -0.15);
      const e2 = addPart(inner, new THREE.SphereGeometry(0.026, 8, 6), eyeMat, 0.05, 1.68, -0.15);
      e1.scale.y = 0.42;
      e2.scale.y = 0.42;
      if (opts.gun) {
        addPart(inner, new THREE.BoxGeometry(0.16, 0.07, 0.04), leather, 0, 1.58, -0.13);
        addPart(inner, new THREE.BoxGeometry(0.22, 0.08, 0.16), leather, 0, 1.84, 0.04);
      }
    }

    function addArm(side, spec) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * Math.max(0.28, chestW * 0.52), 1.46, 0);
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
        for (let i = -1; i <= 1; i++) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.11, 4), horn);
          claw.position.set(i * 0.026, -0.01, -0.06);
          claw.rotation.x = -Math.PI / 2;
          claw.castShadow = true;
          hand.add(claw);
        }
      }
      elbow.add(hand);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(armR * 1.2, 6, 5), spec.pad || leather);
      cap.castShadow = true;
      shoulder.add(cap);
      shoulder.add(elbow);
      inner.add(shoulder);
      return hand;
    }

    let toolHand = null;
    if (zombie) {
      addArm(-1, { pitch: 0.7, splay: 0.2, bend: 0.42, upper: lanky ? 0.36 : 0.32, fore: lanky ? 0.34 : 0.3 });
      addArm(1, { pitch: 0.85, splay: 0.08, bend: 0.28, upper: bulky ? 0.36 : 0.34, fore: 0.32 });
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
    if (opts.scale) g.scale.setScalar(opts.scale);
    return g;
  }

  function applyAtmosphere(arena) {
    scene.background = new THREE.Color(arena.fog);
    scene.fog = new THREE.FogExp2(arena.fog, arena.density);
    hemi.color.setHex(arena.hemiSky);
    hemi.groundColor.setHex(arena.hemiGround);
    moon.color.setHex(arena.moon);
    moon.intensity = arena.moonI * 1.45;
    if (rain) rain.visible = !!arena.rain;
    if (arena.rain && !rain) {
      const n = 700;
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 46;
        arr[i * 3 + 1] = Math.random() * 18;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 46;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaeb6be, size: 0.045, transparent: true, opacity: 0.35 }));
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
    camDist = built.arena.camDist || 5.5;
    currentArenaId = id;
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
    a.mesh.rotation.x = 1.05;
    a.mesh.position.y = 0.12;
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
    setTimeout(() => ui.vignette.classList.remove("hurt"), 180);
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
    z.mesh.rotation.x = 1.15;
    z.mesh.position.y = 0.15;
    if (z.cloth) z.cloth.emissive.setHex(0x000000);
    AudioBus.hit();
    trauma = Math.min(1, trauma + 0.28);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(0.28 + Math.random() * 0.15, 8),
      new THREE.MeshBasicMaterial({ color: 0x4a1c18, transparent: true, opacity: 0.75 })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(z.mesh.position.x, 0.03, z.mesh.position.z);
    actorRoot.add(pool);
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
    } else {
      AudioBus.hurt();
      trauma = Math.min(1, trauma + 0.6);
      hurtFlash();
    }
    player.hp -= dmg;
    state.hp = player.hp;
    if (player.hp <= 0) {
      player.hp = 0;
      state.hp = 0;
      Story.remember(state, "fall");
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
    goNext(Story.resolve(c, state));
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
    if (player.mesh) player.mesh.visible = true;
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
      cardTimer = setTimeout(() => startNode(node, why), 1500);
      return;
    }
    startNode(node, why);
  }

  function newGame(name) {
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
    closeJournal();
    state = state || null;
    buildArena("dojo");
    clearGroup(peopleRoot);
    clearGroup(followRoot);
    if (player.mesh) player.mesh.visible = false;
    const hero = makeFigure({ color: 0x2c2926, skin: 0xc49a78, hair: 0x161412, sword: true });
    hero.position.set(0.4, 0, 5.5);
    actorRoot.add(hero);
    const zed = makeFigure({ color: 0x4e554c, skin: 0x7d8474, zombie: true, lean: 0.3, scale: 1 });
    zed.position.set(-2.2, 0, -1.5);
    zed.userData.titleZ = true;
    actorRoot.add(zed);
    currentArenaId = "title";
    setMode("title");
    ui.hint.textContent = "";
    ui.prompt.textContent = "";
    ui.tip.textContent = "";
    show(ui.btnContinue, hasSave());
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
    const moving = wish.lengthSq() > 0 || player.dodge > 0;
    player.mesh.position.y = moving ? Math.sin(time * 10) * 0.035 : 0;
    player.mesh.rotation.y = yaw;
    if (player.iframe > 0) player.iframe -= dt;
    player.blocking = rmb && player.attack <= 0 && player.dodge <= 0 && player.stamina > 0 && mode === "play";
    if (player.blocking) {
      player.stamina = Math.max(0, player.stamina - dt * 18);
      player.staminaDelay = 0.25;
    }
    if (player.attack > 0) {
      player.attack -= dt;
      const u = 1 - Math.max(0, player.attack) / player.attackDur;
      const cut = Math.sin(clamp(u, 0, 1) * Math.PI);
      player.sword.rotation.set(-cut * 2.1, cut * 0.45, -cut * 1.05);
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
          player.sword.rotation.set(0, 0, 0);
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
      z.mesh.rotation.y = Math.atan2(-dirx, -dirz);
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
    if (mode === "talk") {
      const id = SPEAKER[speakerNow];
      const focus = findActor(id) || player.mesh;
      const dest = new THREE.Vector3(focus.position.x + 2.6, 2.15, focus.position.z + 4.0);
      camera.position.lerp(dest, 1 - Math.exp(-2.4 * dt));
      camera.lookAt(focus.position.x, 1.35, focus.position.z);
      return;
    }
    const desired = pos.clone().addScaledVector(f, -camDist);
    desired.y = 2.15 - pitch * 0.45;
    camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
    const look = pos.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(f, 1.4);
    look.y += pitch;
    camera.lookAt(look);
    if (trauma > 0) {
      const s = trauma * trauma;
      camera.position.x += (Math.random() - 0.5) * s * 0.28;
      camera.position.y += (Math.random() - 0.5) * s * 0.18;
      trauma = Math.max(0, trauma - dt * 1.7);
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
      const jaw = z.mesh.userData.jaw;
      if (jaw) {
        z.mouth = Math.max(0, (z.mouth || 0) - dt * (z.dead ? 2.2 : 0.62));
        const bite = !z.dead && z.mouth > 0.02 ? Math.max(0, Math.sin(time * (z.type === "brute" ? 10 : 17))) : 0;
        jaw.rotation.x = jaw.userData.rest + bite * 0.4 * z.mouth;
      }
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

  function update(dt) {
    if (!simReady) return;
    time += dt;
    updateRain(dt);
    if (mode === "title") {
      titleTime += dt;
      const a = titleTime * 0.08;
      camera.position.set(Math.sin(a) * 12, 3.3, Math.cos(a) * 12);
      camera.lookAt(0, 1.2, -1);
      const zed = actorRoot.children.find((c) => c.userData && c.userData.titleZ);
      if (zed) {
        zed.position.x = Math.sin(titleTime * 0.35) * 3.2;
        zed.position.z = -1.2 + Math.cos(titleTime * 0.22) * 1.4;
        zed.rotation.y = titleTime * 0.4;
      }
      renderer.render(scene, camera);
      AudioBus.tension(0.08);
      titleVoice -= dt;
      if (titleVoice <= 0) {
        titleVoice = 3.6 + Math.random() * 3.2;
        if (AudioBus.ctx && !AudioBus.muted) AudioBus.zombie("moan", Math.sin(titleTime * 0.7) * 0.4, 0.13, 0.5);
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
    if (mode !== "ending" && mode !== "title") updateCamera(dt);
    const showLabels = !!(current && current.kind === "explore");
    const hideOrShow = (group) => group.traverse((o) => {
      if (o.userData && o.userData.isLabel) o.visible = showLabels;
    });
    hideOrShow(peopleRoot);
    hideOrShow(followRoot);
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
    ui.fillHp = $("fill-hp");
    ui.fillSt = $("fill-st");
    ui.fillEdge = $("fill-edge");
    ui.barHp = $("bar-hp");
    ui.btnContinue = $("btn-continue");

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 180);
    hemi = new THREE.HemisphereLight(0x8a8078, 0x2a241c, 1);
    moon = new THREE.DirectionalLight(0xd5d0c8, 1.5);
    moon.position.set(-14, 22, 8);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 70;
    moon.shadow.camera.left = -24;
    moon.shadow.camera.right = 24;
    moon.shadow.camera.top = 24;
    moon.shadow.camera.bottom = -24;
    amb = new THREE.AmbientLight(0x4a4038, 0.28);
    scene.add(hemi, moon, amb);
    const moonBall = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe7e1d6 }));
    moonBall.position.set(-28, 22, -18);
    scene.add(moonBall);
    propsRoot = new THREE.Group();
    actorRoot = new THREE.Group();
    peopleRoot = new THREE.Group();
    followRoot = new THREE.Group();
    scene.add(propsRoot, actorRoot, peopleRoot, followRoot);

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
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
    $("btn-yes").addEventListener("click", () => newGame($("name").value));
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
