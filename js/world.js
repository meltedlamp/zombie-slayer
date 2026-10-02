(function (root) {
  const ARENAS = {
    dojo: { layout: "dojo", fog: 0x1a1416, density: 0.032, hemiSky: 0x7a6a72, hemiGround: 0x2a211c, moon: 0xd2c4bc, moonI: 1.15, bounds: { x: 16, z: 16 } },
    gas: { layout: "gas", fog: 0x141614, density: 0.036, hemiSky: 0x6e746c, hemiGround: 0x241e18, moon: 0xc5c8c0, moonI: 0.95, bounds: { x: 17, z: 17 } },
    overpass: { layout: "overpass", fog: 0x121418, density: 0.036, hemiSky: 0x5a6270, hemiGround: 0x1c1a18, moon: 0xb0b8c4, moonI: 0.9, bounds: { x: 15, z: 16 } },
    truck: { layout: "truck", fog: 0x1a1814, density: 0.03, hemiSky: 0x8a7a68, hemiGround: 0x2a241c, moon: 0xe0d4c4, moonI: 1.2, bounds: { x: 18, z: 18 } },
    school: { layout: "school", fog: 0x181816, density: 0.034, hemiSky: 0x7a756c, hemiGround: 0x26221c, moon: 0xd5d0c6, moonI: 1.05, bounds: { x: 17, z: 17 } },
    farm: { layout: "farm", fog: 0x1c1a16, density: 0.028, hemiSky: 0x8a7858, hemiGround: 0x2a2418, moon: 0xe6d2b0, moonI: 1.28, bounds: { x: 18, z: 18 } },
    farmNight: { layout: "farm", fog: 0x0c1016, density: 0.046, hemiSky: 0x3a4458, hemiGround: 0x12100e, moon: 0xb7c4d8, moonI: 0.72, rain: true, bounds: { x: 18, z: 18 } },
    roadblock: { layout: "roadblock", fog: 0x161410, density: 0.034, hemiSky: 0x6a6248, hemiGround: 0x221e16, moon: 0xd8d0b8, moonI: 1.1, bounds: { x: 15, z: 16 } },
    bridge: { layout: "bridge", fog: 0x101418, density: 0.026, hemiSky: 0x4a5868, hemiGround: 0x141810, moon: 0xc5d0dc, moonI: 1, bounds: { x: 2.35, z: 20 }, camDist: 5.2 },
  };

  const TINT = {
    dojo: 0xc8b8a4,
    gas: 0xb7b2a8,
    overpass: 0x9aa0a8,
    truck: 0xb7a88a,
    school: 0xb4aea4,
    farm: 0xa8a080,
    farmNight: 0x6a6858,
    roadblock: 0xa89a78,
    bridge: 0x8a9088,
  };

  let groundTex = null;

  function mudTexture() {
    if (groundTex) return groundTex;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#3a342c";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 7000; i++) {
      const v = Math.random();
      g.fillStyle = v > 0.55 ? "rgba(0,0,0,0.2)" : "rgba(110,90,60,0.16)";
      g.fillRect(Math.random() * 512, Math.random() * 512, v > 0.85 ? 6 : 2, 2);
    }
    groundTex = new THREE.CanvasTexture(c);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(12, 12);
    groundTex.userData.shared = true;
    return groundTex;
  }

  function build(group, arenaId) {
    const arena = ARENAS[arenaId] || ARENAS.dojo;
    const night = arenaId === "farmNight";
    const solids = [];
    const markers = {};
    let points = [];
    let people = [];
    let start = { x: 0, z: 8, yaw: 0 };

    function add(mesh, solidBox) {
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      group.add(mesh);
      if (solidBox) solids.push(solidBox);
      return mesh;
    }

    function adopt(g, solidBox) {
      g.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      group.add(g);
      if (solidBox) solids.push(solidBox);
      return g;
    }

    function mat(color, rough, metal) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: rough == null ? 0.92 : rough,
        metalness: metal || 0,
      });
    }

    function glassMat(opacity) {
      return new THREE.MeshStandardMaterial({
        color: 0xb7c6cc,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: opacity == null ? 0.38 : opacity,
        side: THREE.DoubleSide,
      });
    }

    function glowMat(color, intensity) {
      return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: intensity == null ? 0.7 : intensity,
        roughness: 0.55,
      });
    }

    function box(x, y, z, w, h, d, color, solid, rough) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, rough));
      m.position.set(x, y, z);
      const sb = solid
        ? { minx: x - w / 2, maxx: x + w / 2, minz: z - d / 2, maxz: z + d / 2 }
        : null;
      return add(m, sb);
    }

    function flat(mesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    }

    function patch(x, z, w, d, color, y) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y == null ? 0.025 : y, z);
      return flat(m);
    }

    function stain(x, z, r, color) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), mat(color, 1));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.03, z);
      return flat(m);
    }

    function practical(x, y, z, color, intensity, dist) {
      const light = new THREE.PointLight(color, intensity, dist || 9, 2);
      light.position.set(x, y, z);
      group.add(light);
      return light;
    }

    function tree(x, z, s) {
      s = s || 1;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.4 * s, 6), mat(0x2a241e));
      trunk.position.set(x, 0.7 * s, z);
      add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 2.4 * s, 6), mat(0x2e3328));
      crown.position.set(x, 2.1 * s, z);
      add(crown);
    }

    function deadTree(x, z, s) {
      s = s || 1;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.16 * s, 3.1 * s, 5), mat(0x2c261f));
      trunk.position.set(x, 1.55 * s, z);
      add(trunk);
      const forks = [[0.9, 2.3, 0.2], [-0.7, 2.5, -0.3], [0.2, 2.7, 1.1]];
      forks.forEach((f) => {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.05 * s, 1.15 * s, 4), mat(0x2c261f));
        branch.position.set(x + f[0] * 0.25 * s, f[1] * s, z + f[2] * 0.2 * s);
        branch.rotation.z = f[0];
        branch.rotation.x = f[2] * 0.4;
        add(branch);
      });
    }

    function rock(x, z, s) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26 * (s || 1), 0), mat(0x6a655c, 1));
      m.position.set(x, 0.14 * (s || 1), z);
      m.rotation.set(0.4, s || 0, 0.2);
      add(m);
    }

    function grass(x, z, s) {
      s = s || 1;
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.38 * s, 4), mat(0x3d4a32));
        blade.position.set(x + (i - 1) * 0.08 * s, 0.18 * s, z + (i % 2) * 0.05);
        add(blade);
      }
    }

    function car(x, z, rot, color, opts) {
      opts = opts || {};
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rot || 0;
      const paint = mat(color || 0x3a3438, 0.65, 0.25);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 3.6), paint);
      body.position.y = 0.55;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.48, 1.7), mat(0x1c2024, 0.35, 0.15));
      cab.position.set(0, 1.02, -0.15);
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.38), glassMat(opts.cracked ? 0.55 : 0.4));
      windshield.position.set(0, 1.05, 0.72);
      g.add(body, cab, windshield);
      if (opts.cracked) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.7), mat(0xd8e0e4, 0.3, 0.2));
        crack.position.set(0.15, 1.02, 0.78);
        crack.rotation.z = 0.4;
        g.add(crack);
      }
      if (opts.hood) {
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.1), paint);
        hood.position.set(0, 1.05, 1.15);
        hood.rotation.x = -0.7;
        g.add(hood);
      }
      [[-0.75, 0.28, -1.25], [0.75, 0.28, -1.25], [-0.75, 0.28, 1.25], [0.75, 0.28, 1.25]].forEach((p) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 8), mat(0x151515));
        w.rotation.z = Math.PI / 2;
        w.position.set(p[0], p[1], p[2]);
        g.add(w);
      });
      return adopt(g, { minx: x - 1.9, maxx: x + 1.9, minz: z - 2.2, maxz: z + 2.2 });
    }

    function truck(x, z, rot, color, opts) {
      opts = opts || {};
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rot || 0;
      const paint = mat(color || 0x4a342c, 0.7, 0.22);
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 5.4), paint);
      chassis.position.set(0, 0.62, 0);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.9, 1.8), mat(0x241e1c, 0.5, 0.15));
      cab.position.set(0, 1.25, 1.55);
      const wind = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), glassMat());
      wind.position.set(0, 1.35, 2.46);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.38, 2.5), mat(0x3a322c, 0.9));
      bed.position.set(0, 0.95, -1.15);
      const gate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.08), mat(0x2e2824, 0.6, 0.3));
      gate.position.set(0, 1.15, -2.42);
      g.add(chassis, cab, wind, bed, gate);
      [[-0.85, 0.32, 1.7], [0.85, 0.32, 1.7], [-0.85, 0.32, -1.3], [0.85, 0.32, -1.3]].forEach((p) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 8), mat(0x141414));
        w.rotation.z = Math.PI / 2;
        w.position.set(p[0], p[1], p[2]);
        g.add(w);
      });
      if (opts.lump) {
        const lump = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 1.6), mat(0x4a4038, 1));
        lump.position.set(0.1, 1.28, -1.05);
        lump.rotation.z = 0.08;
        g.add(lump);
      }
      if (opts.tarp) {
        const tarp = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 1.8), mat(0x2c3a34, 0.95));
        tarp.position.set(0, 1.45, -0.7);
        tarp.rotation.z = -0.18;
        tarp.rotation.x = 0.12;
        g.add(tarp);
      }
      if (opts.sacks) {
        for (let i = 0; i < 3; i++) {
          const sack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.36), mat(0x8a7a52));
          sack.position.set(-0.4 + (i % 2) * 0.55, 1.28 + Math.floor(i / 2) * 0.26, -1.2);
          g.add(sack);
        }
      }
      return adopt(g, { minx: x - 2.3, maxx: x + 2.3, minz: z - 3.1, maxz: z + 3.1 });
    }

    function fenceRun(x1, z1, x2, z2) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const n = Math.max(2, Math.floor(len / 1.35));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        box(x1 + dx * t, 0.62, z1 + dz * t, 0.08, 1.25, 0.08, 0x4a433a, false);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(dx) < 0.2 ? 0.06 : len, 0.07, Math.abs(dz) < 0.2 ? 0.06 : len), mat(0x5a5046));
      rail.position.set((x1 + x2) / 2, 0.85, (z1 + z2) / 2);
      add(rail);
      const rail2 = new THREE.Mesh(rail.geometry.clone(), mat(0x5a5046));
      rail2.position.set((x1 + x2) / 2, 0.4, (z1 + z2) / 2);
      add(rail2);
    }

    function sign(x, y, z, lines, w, h, rot, dark) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const ctx = c.getContext("2d");
      ctx.fillStyle = dark ? "#241e1a" : "#d7ccb6";
      ctx.fillRect(0, 0, 512, 256);
      if (!dark) {
        ctx.strokeStyle = "#2a211c";
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 492, 236);
      }
      ctx.fillStyle = dark ? "#d5cbb8" : "#2a211c";
      ctx.font = "bold 46px Georgia";
      lines.forEach((line, i) => ctx.fillText(line, 36, 84 + i * 64));
      const tex = new THREE.CanvasTexture(c);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w || 2.4, h || 1.2),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.rotation.y = rot || 0;
      add(m);
      return m;
    }

    function tag(x, y, z, text, w, rot) {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 128;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#cbb892";
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = "#2a211c";
      ctx.font = "bold 42px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 66);
      const tex = new THREE.CanvasTexture(c);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w || 0.8, (w || 0.8) * 0.5),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.rotation.y = rot || 0;
      add(m);
    }

    function lamp(x, z, color, intensity) {
      box(x, 1.7, z, 0.08, 3.4, 0.08, 0x2a2a2c, false);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.22), glowMat(color || 0xe6d2a2, 0.9));
      head.position.set(x, 3.35, z);
      add(head);
      if (intensity) practical(x, 3.1, z, color || 0xe6d2a2, intensity, 10);
    }

    function barrel(x, z, lit) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.72, 8), mat(0x3a2c24, 0.55, 0.45));
      m.position.set(x, 0.36, z);
      add(m);
      if (!lit) return;
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 6), glowMat(0xff6a2a, 1.4));
      fire.position.set(x, 0.9, z);
      add(fire);
      practical(x, 1.3, z, 0xff7a3a, 7, 8);
    }

    function crate(x, y, z, s) {
      s = s || 1;
      return box(x, y, z, 0.55 * s, 0.42 * s, 0.5 * s, 0x6b5340, false);
    }

    function sacks(x, z, n) {
      for (let i = 0; i < n; i++) {
        box(x + (i % 2) * 0.08, 0.2 + Math.floor(i / 2) * 0.28, z + (i % 3) * 0.02, 0.55, 0.26, 0.38, i % 2 ? 0x8d7b4e : 0x6e5a3c, false);
      }
    }

    function bench(x, z, rot) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rot || 0;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.42), mat(0x5c4636));
      seat.position.y = 0.46;
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 0.06), mat(0x5c4636));
      back.position.set(0, 0.7, 0.18);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.08), mat(0x3a332c));
      leg.position.y = 0.2;
      g.add(seat, back, leg);
      adopt(g);
    }

    function bike(x, z, rot) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rot || 0;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.05), mat(0x6a3030, 0.5, 0.3));
      frame.position.y = 0.48;
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), mat(0x6a3030, 0.5, 0.3));
      fork.position.set(0, 0.4, 0.48);
      const wmat = mat(0x222, 0.6, 0.4);
      const w1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 4, 10), wmat);
      w1.position.set(0, 0.28, -0.42);
      const w2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 4, 10), wmat);
      w2.position.set(0, 0.28, 0.48);
      g.add(frame, fork, w1, w2);
      adopt(g);
    }

    function jug(x, z, color) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.4, 8), mat(color || 0x2a4a6a, 0.4, 0.08));
      body.position.set(x, 0.26, z);
      add(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 6), mat(0x1a1a1a));
      cap.position.set(x, 0.5, z);
      add(cap);
    }

    function hose(pts) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const len = Math.hypot(dx, dz) || 0.01;
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.045, 0.055), mat(0x1a221c, 0.8));
        m.position.set((a[0] + b[0]) / 2, 0.04, (a[1] + b[1]) / 2);
        m.rotation.y = Math.atan2(-dz, dx);
        add(m);
      }
    }

    function windowRow(x0, y, z, count, step, brokenAt) {
      for (let i = 0; i < count; i++) {
        const x = x0 + i * step;
        const broken = brokenAt && brokenAt.indexOf(i) !== -1;
        box(x, y, z, step * 0.72, 1.15, 0.08, 0x241e1c, false);
        if (!broken) {
          const pane = new THREE.Mesh(new THREE.PlaneGeometry(step * 0.5, 0.85), glassMat());
          pane.position.set(x, y, z + 0.06);
          add(pane);
        } else {
          const shard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.02), glassMat(0.7));
          shard.position.set(x + 0.08, y - 0.15, z + 0.1);
          shard.rotation.z = 0.5;
          add(shard);
        }
      }
    }

    function shards(originX, originZ, n) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.12), glassMat(0.75));
        m.position.set(originX + (i % 5) * 0.28 - 0.5, 0.04, originZ + Math.floor(i / 5) * 0.22);
        m.rotation.y = i * 0.7;
        m.rotation.x = 0.35;
        add(m);
      }
    }

    function swordRack(x, z) {
      box(x, 1.15, z, 0.15, 1.5, 1.3, 0x3a2e26, false);
      [-0.28, 0.28].forEach((oz) => {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.08), mat(0xc5ccd2, 0.35, 0.7));
        blade.position.set(x + 0.1, 1.35, z + oz);
        add(blade);
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.08), mat(0x6b4b32));
        hilt.position.set(x + 0.1, 0.82, z + oz);
        add(hilt);
      });
    }

    function lockerRow(x0, z, n, step) {
      for (let i = 0; i < n; i++) {
        const open = i === 2 || i === 5;
        box(x0 + i * step, 1.05, z, step * 0.86, 2.05, open ? 0.28 : 0.42, i % 2 ? 0x3e5158 : 0x4a5c62, false);
        if (open) {
          const door = new THREE.Mesh(new THREE.BoxGeometry(step * 0.7, 1.7, 0.05), mat(0x4a5c62, 0.5, 0.35));
          door.position.set(x0 + i * step + 0.28, 1.05, z + 0.28);
          door.rotation.y = -0.9;
          add(door);
        }
      }
    }

    function hoop(x, z) {
      box(x, 1.6, z, 0.08, 3.2, 0.08, 0x3a3a3c, true);
      box(x, 3.05, z - 0.35, 1.3, 0.08, 0.08, 0xc84a3a, false);
      const net = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 4, 10), mat(0xc84a3a, 0.5, 0.2));
      net.position.set(x, 2.85, z - 0.55);
      net.rotation.x = Math.PI / 2;
      add(net);
    }

    function logs(x, z) {
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.25, 6), mat(0x4a3828));
        m.rotation.z = Math.PI / 2;
        m.position.set(x, 0.16 + i * 0.2, z + (i % 2) * 0.06);
        add(m);
      }
    }

    function corn(x, z, cols, rows) {
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const h = 1.15 + ((i + j) % 3) * 0.18;
          const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.22, h, 0.22), mat(0x6a6230));
          stalk.position.set(x + i * 0.55, h / 2, z + j * 0.55);
          add(stalk);
        }
      }
    }

    function lineRun(x, z, len, axis) {
      const n = Math.max(2, Math.floor(len / 1.5));
      for (let i = 0; i < n; i++) {
        if (axis === "x") box(x + i * 1.5, 0.04, z, 0.7, 0.02, 0.1, 0xd5d0c4, false);
        else box(x, 0.04, z + i * 1.5, 0.1, 0.02, 0.7, 0xd5d0c4, false);
      }
    }

    const layouts = {
      dojo() {
        start = { x: 0, z: 9, yaw: 0 };
        points = [[-3, -6], [2.5, -5], [5, -3], [-5, -2], [1, -7.2], [-2, 1], [4, 2]];
        people = [{ id: "harris", name: "Harris", x: 5.4, z: 4.2, color: 0x3d4c5c }];
        patch(0, 2, 22, 26, 0x4a453c, 0.02);
        patch(0, -4, 14, 10, 0x6a5344, 0.03);
        patch(0, -1.5, 7.2, 8.8, 0x3a2e26, 0.035);
        patch(0, -1.5, 6.2, 7.6, 0x6a5344, 0.045);
        box(0, 2.4, -12.2, 18, 4.8, 4.2, 0x3c342e, true);
        box(0, 4.95, -12.2, 18.6, 0.35, 4.8, 0x2a2420, true);
        box(-6.4, 1.25, -9.85, 1.3, 2.5, 0.18, 0x1a1614, false);
        box(2.2, 1.15, -9.9, 1.6, 2.3, 0.16, 0x161412, false);
        windowRow(-4.2, 2.7, -9.95, 5, 1.7, [1, 3]);
        shards(-1.2, -7.2, 10);
        shards(2.4, -6.6, 6);
        const lean = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.04), glassMat(0.55));
        lean.position.set(3.4, 0.7, -8.2);
        lean.rotation.x = 0.55;
        lean.rotation.y = 0.3;
        add(lean);
        swordRack(5.6, -9.7);
        box(-8.6, 0.45, -8.6, 1.6, 0.9, 0.35, 0x3a3028, false);
        for (let i = 0; i < 4; i++) box(-8.9 + i * 0.28, 0.55, -8.55, 0.16, 0.28, 0.22, 0x2a2420, false);
        box(1.15, 0.06, 0.4, 0.28, 0.08, 0.1, 0x1a1816, false);
        box(-4.2, 0.35, -6.4, 0.45, 0.7, 0.45, 0x243038, false);
        for (let i = 0; i < 3; i++) box(-4.2, 0.85, -6.15 + i * 0.12, 0.12, 0.28, 0.12, 0x8eb4c4, false);
        const dummy = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.15, 8), mat(0x5a4038));
        dummy.position.set(6.4, 0.7, -4.2);
        add(dummy);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mat(0xc4a484));
        head.position.set(6.4, 1.4, -4.2);
        add(head);
        bench(-6.5, 2.4, 0.4);
        bike(-9.2, 5.5, 0.8);
        car(9.2, 6.4, 0.6, 0x4a4038, { hood: false });
        stain(8.4, 5.2, 0.7, 0x2a241c);
        fenceRun(-13, 6, -13, -8);
        fenceRun(-13, 6, -6, 11);
        deadTree(-11.5, 9, 1.15);
        tree(12, -4, 1);
        deadTree(-8, 12, 0.9);
        tree(11, 10, 0.85);
        rock(-10, 3, 1.2);
        rock(10, -6, 0.8);
        lamp(-6.2, -8.2, 0xf0d2a4, 5);
        practical(-6.4, 2.2, -8.4, 0xf0d2a4, 4, 8);
        sign(-6.4, 2.7, -9.7, ["SIDE DOOR"], 1.8, 0.7);
        sign(2.4, 3.6, -9.85, ["5 TO 6", "CLOSED"], 2.2, 1.15);
        box(0, 0.04, 4, 1.4, 0.02, 8, 0x6a604e, false);
      },
      gas() {
        start = { x: 0, z: 11, yaw: 0 };
        points = [[-6, 4], [6, 2], [-4, -4], [3, 6], [-8, 1], [7, -5], [1, -6]];
        people = [
          { id: "ellis", name: "Ellis", x: 0.6, z: 2.4, color: 0x24383a },
          { id: "harris", name: "Harris", x: 7.2, z: 6.5, color: 0x3d4c5c },
        ];
        markers.ellis = { x: 0.6, z: 2.4, label: "Ellis" };
        patch(0, 1, 24, 28, 0x2c2e30, 0.02);
        patch(0, 10, 8, 14, 0x3a3c38, 0.03);
        lineRun(0, -6, 18, "z");
        box(0, 2.3, -12.4, 16, 4.4, 4.4, 0x3a342c, true);
        box(0, 4.7, -12.4, 16.4, 0.3, 5, 0x2a2824, true);
        windowRow(-4.5, 2.5, -10.05, 4, 1.8, [2]);
        box(0, 1.2, -10.05, 1.5, 2.3, 0.12, 0x141210, false);
        box(-6.2, 0.7, -9.2, 1.3, 1.3, 0.7, 0x2a3330, true);
        sign(0, 3.5, -10.0, ["NO GAS", "CLOSED"], 2.8, 1.15);
        box(0, 3.15, 1.2, 9.5, 0.18, 7.2, 0x2a2e32, false);
        [[-4.2, 1.2], [4.2, 1.2], [-4.2, -1.6], [4.2, -1.6]].forEach((p) => {
          box(p[0], 1.55, p[1], 0.16, 3.1, 0.16, 0x3a3e42, false);
        });
        const tube = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.2), glowMat(0xd5e4ea, 0.45));
        tube.position.set(0, 2.95, 1.2);
        add(tube);
        practical(0, 2.7, 1.2, 0xd7e6ee, 6, 12);
        [-1.7, 1.7].forEach((x) => {
          box(x, 0.85, 0.4, 0.55, 1.5, 0.55, 0x1a1c1e, true);
          box(x, 1.35, 0.15, 0.35, 0.45, 0.12, 0xc84a3a, false);
          const hoseHook = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 4, 8), mat(0x222));
          hoseHook.position.set(x + 0.28, 1.1, 0.4);
          add(hoseHook);
        });
        hose([[1.95, 0.5], [2.4, 1.1], [1.8, 1.8], [1.1, 2.2], [0.9, 2.6]]);
        box(-2.5, 0.45, 3.2, 0.7, 0.7, 0.5, 0x2a3e48, false);
        tag(-2.5, 0.7, 3.48, "PEACHES", 0.7);
        crate(-3.3, 0.25, 3.0, 1);
        crate(-3.5, 0.65, 3.15, 0.7);
        for (let i = 0; i < 4; i++) box(-5.5 + i * 0.22, 0.12, -8.4, 0.16, 0.18, 0.16, i % 2 ? 0x8a3a32 : 0xc4b48a, false);
        box(6.4, 0.7, -8.6, 1.5, 1.3, 1.1, 0x2e3230, true);
        stain(6.2, -7.4, 0.9, 0x1a1814);
        stain(-0.4, 1.4, 1.1, 0x1c1a16);
        stain(2.2, -2.4, 0.6, 0x181614);
        car(9.4, 7.2, 0.4, 0x2e3230, { hood: true });
        car(-10, -5, 1.1, 0x3a2a28);
        box(-10.2, 0.35, -1.5, 0.7, 0.22, 0.7, 0x1a1a1a, false);
        box(-10.2, 0.55, -1.5, 0.7, 0.18, 0.7, 0x1a1a1a, false);
        box(-10.2, 0.75, -1.5, 0.7, 0.18, 0.7, 0x222);
        bike(5.5, 8.5, -0.4);
        [-3.2, 3.2].forEach((x) => box(x, 0.45, 6.5, 0.25, 0.9, 0.25, 0xc4a050, false));
        box(8.5, 1.6, -2, 0.12, 3.2, 0.12, 0x3a3a3c, false);
        sign(8.5, 3.3, -2, ["CASH", "ONLY"], 1.3, 0.9);
        deadTree(13, 11, 1.1);
        tree(-13, -9, 1.2);
        deadTree(12, -10, 0.9);
        rock(11, 4, 1);
      },
      overpass() {
        start = { x: 0, z: 9, yaw: 0 };
        points = [[-2, 2], [3, -1], [-3, -4], [1.5, 4], [4, 1], [-1, -7]];
        people = [{ id: "harris", name: "Harris", x: -2.4, z: 1.2, color: 0x3d4c5c }];
        patch(0, 0, 28, 34, 0x23262a, 0.02);
        patch(0, 0, 7.2, 30, 0x2a2c30, 0.03);
        lineRun(0, -12, 26, "z");
        box(0, 5.15, -1.5, 28, 0.45, 7.5, 0x3a3e44, false);
        box(-6.2, 2.6, -1.5, 0.7, 5.2, 0.7, 0x4a4e54, true);
        box(6.2, 2.6, -1.5, 0.7, 5.2, 0.7, 0x4a4e54, true);
        box(-11, 2.6, -1.5, 0.55, 5.2, 0.55, 0x3e4248, false);
        box(11, 2.6, -1.5, 0.55, 5.2, 0.55, 0x3e4248, false);
        sign(-5.55, 2.2, -1.5, ["COUNTY", "9"], 1.1, 0.85, Math.PI / 2, true);
        box(-4.6, 0.45, 3, 0.45, 0.85, 8, 0x5a5e62, true);
        box(4.6, 0.45, -5, 0.45, 0.85, 8, 0x5a5e62, true);
        box(-4.6, 0.45, -8, 0.45, 0.85, 5, 0x5a5e62, false);
        car(-1.6, -4.6, 0.18, 0x3c3834, { cracked: true });
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.08), mat(0x6a4038, 1));
        blanket.position.set(-1.55, 1.05, -3.7);
        add(blanket);
        [-6.2, -5.4, -4.6].forEach((z, i) => box(-3.3, 0.22, z, 0.28, 0.42, 0.28, 0xc45a28, false));
        crate(-3.6, 0.25, -2.2, 0.9);
        box(-3.15, 0.08, -1.4, 0.35, 0.08, 0.55, 0x5a4638, false);
        box(3.4, 0.1, 2.4, 0.45, 0.12, 0.7, 0x3a3430, false);
        stain(-1.2, -3.2, 0.8, 0x1a1818);
        stain(0.4, 5, 1.4, 0x1c1e22);
        lamp(5.5, 6.5, 0xf0c888, 3);
        car(8.5, -9, -0.5, 0x2a2826);
        deadTree(-12, 7, 1.3);
        deadTree(12, -9, 1.15);
        tree(-12, -11, 1);
        rock(9, 6, 1.3);
        rock(-9, -2, 0.9);
        grass(7, 8, 1);
        grass(-8, 9, 0.8);
      },
      truck() {
        start = { x: -1.5, z: 8.5, yaw: -0.42 };
        points = [[7, 4], [-8, -2], [3, 6], [8, -5], [-4, -7], [11, 1], [-11, 5]];
        people = [
          { id: "nedra", name: "Nedra", x: 3.3, z: 0.2, color: 0x5c3a32 },
          { id: "cal", name: "Cal", x: 5.2, z: 2.2, color: 0x222428 },
        ];
        patch(2, 0, 14, 16, 0x5a4c38, 0.02);
        patch(1.5, -1, 4, 9, 0x3a3428, 0.03);
        truck(1.2, -1.6, Math.PI, 0x4a342c, { lump: true, tarp: true });
        jug(3.15, 0.85, 0x2a5270);
        crate(3.6, 0.25, -0.6, 1);
        const rope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 10), mat(0x6a5a40, 0.95));
        rope.position.set(2.5, 0.08, 1.5);
        rope.rotation.x = Math.PI / 2;
        add(rope);
        bench(5.6, -1.2, -0.6);
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.45), mat(0x3a4038));
        chair.position.set(4.4, 0.42, 3.2);
        add(chair);
        box(4.4, 0.2, 3.2, 0.08, 0.4, 0.08, 0x3a4038, false);
        lamp(-3.2, 3.4, 0xf0c080, 2);
        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), glowMat(0xf0c080, 1.3));
        lantern.position.set(2.6, 1.15, 0.9);
        add(lantern);
        practical(2.6, 1.4, 0.9, 0xf0b060, 5, 8);
        box(-6.5, 0.55, 6.2, 0.1, 1.1, 0.1, 0x3a342c, false);
        box(-5.2, 0.7, 6.2, 0.9, 0.55, 0.08, 0x4a4034, false);
        deadTree(-9, -6, 1.45);
        deadTree(-11, 3, 1.2);
        tree(11, 8, 1.35);
        deadTree(13, -3, 1.05);
        tree(8, 13, 1.15);
        deadTree(-4, 13, 1);
        tree(-13, 10, 0.9);
        rock(7, -8, 1.4);
        rock(-2, 6, 0.7);
        grass(6, 7, 1);
        grass(-7, 2, 1.1);
        grass(9, -6, 0.8);
        grass(-5, -8, 1);
        sacks(-7.2, 4.2, 2);
      },
      school() {
        start = { x: 0, z: 11, yaw: 0 };
        points = [[-5, 3], [4, 1], [-2, -1], [6, 4], [-6, 6], [1, 5], [3, -2]];
        markers.door = { x: 0, z: -6.4, label: "the doors" };
        patch(0, 2, 28, 30, 0x6a675e, 0.02);
        patch(0, 3, 12, 14, 0x3a4a38, 0.028);
        patch(0, 2.5, 9, 12, 0x4a4e46, 0.04);
        box(-4.2, 0.045, 2.5, 0.08, 0.02, 10, 0xe4dcc8, false);
        box(4.2, 0.045, 2.5, 0.08, 0.02, 10, 0xe4dcc8, false);
        box(0, 0.045, -2.2, 8.4, 0.02, 0.08, 0xe4dcc8, false);
        box(0, 0.045, 7.2, 8.4, 0.02, 0.08, 0xe4dcc8, false);
        box(0, 2.7, -12.4, 22, 5.4, 4.6, 0x3e3a36, true);
        box(0, 5.55, -12.4, 22.5, 0.35, 5.2, 0x2e2a26, true);
        box(0, 1.35, -9.9, 2.4, 2.7, 0.2, 0x1a1816, true);
        box(-0.55, 1.35, -9.75, 0.08, 2.5, 0.08, 0x5a5148, false);
        windowRow(-7.2, 3.3, -9.95, 4, 1.55, [1]);
        windowRow(2.4, 3.3, -9.95, 4, 1.55, []);
        const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.85), glowMat(0xf0d8a8, 0.8));
        lit.position.set(-5.6, 3.3, -9.88);
        add(lit);
        practical(0, 2.4, -8.6, 0xf0dcc0, 4, 8);
        lockerRow(-8.2, -9.15, 5, 0.78);
        lockerRow(3.4, -9.15, 5, 0.78);
        box(2.6, 1.15, -8.3, 1.3, 1.5, 0.35, 0x2a3338, false);
        const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.2, 0.08), glassMat(0.45));
        caseGlass.position.set(2.6, 1.2, -8.08);
        add(caseGlass);
        box(2.15, 0.85, -8.15, 0.32, 0.42, 0.04, 0xf0ead8, false);
        sign(0, 4.15, -9.9, ["HARROW CREEK", "HIGH SCHOOL"], 4.2, 1.35);
        sign(-3.4, 1.45, -7.2, ["EMERGENCY", "PICKUP"], 1.7, 0.95);
        hoop(7.6, 2.2);
        bench(-6.2, 6.4, 0.2);
        bench(6.4, 7.2, -0.4);
        bike(-2.4, 8.6, 0.5);
        bike(-1.5, 8.9, 0.2);
        bike(1.8, 9.1, -0.3);
        box(-12.2, 1.35, 8.5, 2.3, 2.5, 7.2, 0xc4b04a, true);
        box(-12.2, 2.15, 6.2, 2.1, 0.7, 1.5, 0x2a2e32, false);
        for (let i = 0; i < 3; i++) box(-12.2, 0.85, 10.2 - i * 1.6, 2.2, 0.7, 0.9, 0x3a4044, false);
        box(5.5, 2.2, -4, 0.08, 4.4, 0.08, 0x8a8680, false);
        box(-8.5, 0.45, 1.5, 2.4, 0.35, 1.1, 0x4a463e, false);
        box(-8.5, 0.85, 1.5, 2.4, 0.3, 1.1, 0x4a463e, false);
        box(-8.5, 1.2, 1.5, 2.2, 0.25, 1.0, 0x3e3a34, false);
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.18), mat(0x2a3a48));
        bag.position.set(-1.2, 0.16, -5.2);
        bag.rotation.y = 0.4;
        add(bag);
        const bag2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.18), mat(0x6a3030));
        bag2.position.set(1.4, 0.16, -4.6);
        bag2.rotation.y = -0.3;
        add(bag2);
        box(8.4, 0.4, 7.5, 0.45, 0.8, 0.45, 0x2e3230, false);
        fenceRun(-15, 13, 15, 13);
        deadTree(-14, 4, 1.15);
        tree(13, 5, 1.05);
        deadTree(14, -6, 0.9);
        rock(-10, 11, 1);
      },
      farm() {
        start = { x: 0, z: 12, yaw: 0 };
        points = [[-4, 14], [1, 15], [5, 13], [-6, 12], [6, 16], [2, 11], [-2, 16], [7, 10]];
        people = [
          { id: "owen", name: "Owen", x: -1.4, z: 7.2, color: 0x4a453c },
          { id: "ruth", name: "Ruth", x: -6.2, z: 0.4, color: 0x3a3438 },
          { id: "pete", name: "Pete", x: 4.2, z: 4.2, color: 0x3e342c },
        ];
        markers.gate = { x: 0, z: 7.4, label: "the gate" };
        patch(0, 2, 36, 36, 0x3d4a32, 0.015);
        patch(0, 8, 3.2, 12, 0x5a4634, 0.03);
        patch(-4, -1, 8, 6, 0x4a4034, 0.03);
        box(-7.2, 2.15, -5.2, 7.2, 4, 5.6, 0x5a463c, true);
        box(-7.2, 4.35, -5.2, 7.8, 0.45, 6.2, 0x3a2e28, true);
        box(-7.2, 0.18, -2.05, 5.2, 0.22, 2.2, 0x6a5848, false);
        box(-7.2, 1.25, -2.15, 1.1, 2.2, 0.12, 0x2a201c, false);
        windowRow(-9.2, 2.5, -2.28, 2, 1.5, []);
        windowRow(-5.2, 2.6, -2.28, 1, 1.4, []);
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.9), glowMat(0xf0c890, night ? 1.3 : 0.55));
        win.position.set(-8.6, 2.5, -2.2);
        add(win);
        const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.9), glowMat(0xf0c890, night ? 1.3 : 0.55));
        win2.position.set(-5.6, 2.6, -2.2);
        add(win2);
        practical(-7.2, 2.4, -1.2, 0xf0c090, night ? 8 : 3.5, night ? 12 : 8);
        lamp(-4.4, -1.6, 0xf0d0a0, night ? 4 : 1.5);
        bench(-5.2, -1.3, 0.15);
        const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), mat(0x4a382c));
        rocker.position.set(-9.2, 0.45, -1.5);
        add(rocker);
        box(-9.2, 0.7, -1.35, 0.5, 0.4, 0.06, 0x4a382c, false);
        const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.05), mat(0x2a2420, 0.55, 0.35));
        rifle.position.set(-4.7, 0.55, -1.85);
        rifle.rotation.z = 0.18;
        add(rifle);
        box(7.4, 2.3, -4.6, 6.4, 4.4, 7.2, 0x6a3a32, true);
        box(7.4, 4.7, -4.6, 6.8, 0.4, 7.6, 0x4a3028, true);
        box(7.4, 1.5, -0.85, 2.2, 2.6, 0.12, 0x3a241c, false);
        box(6.55, 1.6, -0.7, 0.12, 2.2, 1.5, 0x5a3428, false);
        box(8.25, 1.6, -0.7, 0.12, 2.2, 1.5, 0x5a3428, false);
        sacks(5.2, -0.2, 4);
        tag(5.2, 1.15, 0.15, "SEED", 0.85);
        logs(9.6, 1.4);
        const well = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.7, 8), mat(0x6a645c));
        well.position.set(2.4, 0.35, 2.2);
        add(well);
        box(2.4, 1.15, 2.2, 0.08, 1.5, 0.08, 0x3a342c, false);
        box(1.7, 1.15, 2.2, 0.08, 1.5, 0.08, 0x3a342c, false);
        box(2.05, 1.85, 2.2, 0.9, 0.08, 0.08, 0x3a342c, false);
        box(3.5, 0.45, 5.2, 0.55, 0.7, 0.55, 0x3a4a58, false);
        fenceRun(-12, 8.2, -1.5, 8.2);
        fenceRun(1.5, 8.2, 12, 8.2);
        fenceRun(-12, 8.2, -12, -10);
        fenceRun(12, 8.2, 12, -10);
        fenceRun(-12, -10, 12, -10);
        box(-1.55, 1.05, 8.2, 0.18, 1.7, 0.18, 0x3a342c, false);
        box(1.55, 1.05, 8.2, 0.18, 1.7, 0.18, 0x3a342c, false);
        sign(-3.2, 1.7, 8.35, ["MILLER"], 1.6, 0.6);
        corn(8.2, -9.2, 6, 4);
        for (let i = 0; i < 4; i++) box(-10.2, 0.2, -1 + i * 0.7, 1.4, 0.28, 0.4, 0x4a5a34, false);
        box(-10.6, 1.3, 2.2, 0.08, 1.8, 0.08, 0x3a342c, false);
        box(-6.2, 1.3, 3.4, 0.08, 1.8, 0.08, 0x3a342c, false);
        box(-8.4, 2.15, 2.8, 4.6, 0.04, 0.04, 0x6a6a6c, false);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55), mat(0xd8d2c8, 0.95));
        cloth.position.set(-9.2, 1.7, 2.8);
        add(cloth);
        const cloth2 = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), mat(0x6a3030, 0.95));
        cloth2.position.set(-7.6, 1.65, 2.8);
        add(cloth2);
        truck(11.5, 6.5, 0.8, 0x3a4034, { sacks: true });
        deadTree(-14, 11, 1.35);
        tree(14, 12, 1.15);
        deadTree(14, -11, 1.3);
        tree(-14, -8, 1.1);
        grass(-2, 4, 1);
        grass(3, 8, 0.8);
        grass(-8, 6, 1);
        if (night) {
          stain(-2, 5, 1.1, 0x1a2428);
          stain(4, 9, 0.8, 0x1a2428);
          stain(1, 2, 0.6, 0x1a2428);
        }
        rock(-11, 5, 1.1);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.06, 8), mat(0x8a3030));
        bowl.position.set(-6.4, 0.08, -1.2);
        add(bowl);
      },
      roadblock() {
        start = { x: 0, z: 9, yaw: 0 };
        points = [[-3, 1], [3, 0], [0, -3], [-5, 3], [5, 2], [-1, 4]];
        people = [{ id: "voss", name: "Voss", x: 0.4, z: -1.4, color: 0x3f2e28 }];
        markers.voss = { x: 0.4, z: -1.4, label: "Voss" };
        patch(0, 0, 16, 30, 0x2e2c28, 0.02);
        patch(0, 2, 5.5, 22, 0x3a3428, 0.03);
        lineRun(0, -8, 20, "z");
        truck(-4.2, -4.2, 1.15, 0x2a2824, { sacks: true });
        truck(4.6, -3.6, -1.05, 0x34302c, { tarp: true, sacks: true });
        for (let i = 0; i < 5; i++) {
          box(-3.2 + i * 0.55, 0.2, -5.2, 0.5, 0.32, 0.36, 0x6a5e40, false);
          if (i < 4) box(-2.9 + i * 0.55, 0.48, -5.2, 0.5, 0.28, 0.36, 0x5a5038, false);
        }
        box(0, 0.45, -5.6, 2.2, 0.7, 0.8, 0x6a5434, true);
        sacks(-6.4, -1.2, 5);
        tag(-6.4, 1.05, -0.9, "SEED", 0.8, Math.PI / 2);
        barrel(6.2, 2.4, true);
        crate(5.4, 0.25, 3.6, 1);
        box(5.5, 0.7, 3.5, 0.7, 0.08, 0.5, 0x5a4638, false);
        box(5.35, 0.85, 3.45, 0.18, 0.12, 0.1, 0x2a2a28, false);
        box(5.35, 1.05, 3.45, 0.02, 0.35, 0.02, 0x222, false);
        [-2.2, -1.2, 1.4, 2.4].forEach((x) => box(x, 0.25, 5.5, 0.32, 0.48, 0.32, 0xc45a28, false));
        box(-7.2, 0.35, 1, 1.4, 0.08, 2.2, 0x2c3a34, false);
        box(7.4, 0.15, -1, 1.6, 0.12, 0.5, 0x3a342c, false);
        deadTree(-12, -7, 1.25);
        deadTree(12, 7, 1.1);
        tree(-13, 8, 1);
        rock(10, -8, 1.3);
        rock(-9, 6, 0.8);
        grass(8, 8, 1);
        grass(-8, -8, 0.9);
      },
      bridge() {
        start = { x: 0, z: 14, yaw: 0 };
        points = [[0, 8], [-0.5, 3], [0.6, -1], [0, -6], [-0.4, -10], [0.4, -14], [0, 11], [-0.3, -3]];
        markers.span = { x: 0, z: -2, label: "the span" };
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(90, 90),
          new THREE.MeshStandardMaterial({ color: 0x1a2830, roughness: 0.25, metalness: 0.2 })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.y = -1.35;
        water.receiveShadow = true;
        group.add(water);
        patch(0, 0, 4.6, 40, 0x3a3c40, 0.12);
        for (let i = -8; i <= 8; i++) {
          if (Math.abs(i) % 5 === 0) continue;
          box(0, 0.16, i * 2.2, 4.3, 0.06, 1.7, i % 2 ? 0x34363a : 0x3e4044, false);
        }
        box(0, 0.2, -6, 3.2, 0.08, 2.4, 0x2a2c30, false);
        box(-2.45, 0.85, 0, 0.16, 1.05, 40, 0x4a4e54, true);
        box(2.45, 0.85, 0, 0.16, 1.05, 40, 0x4a4e54, true);
        box(-2.45, 0.85, -8.5, 0.2, 0.35, 3.2, 0x2a2e32, false);
        for (let i = -7; i <= 7; i++) {
          box(-2.45, 1.15, i * 2.6, 0.08, 0.55, 0.08, 0x5a5e64, false);
          box(2.45, 1.15, i * 2.6, 0.08, 0.55, 0.08, 0x5a5e64, false);
        }
        [-16, -6, 4, 14].forEach((z) => {
          box(-1.5, -0.4, z, 0.45, 1.8, 0.45, 0x2e3236, false);
          box(1.5, -0.4, z, 0.45, 1.8, 0.45, 0x2e3236, false);
        });
        box(0.4, 0.28, 2.2, 0.45, 0.16, 0.7, 0x3a3430, false);
        box(-0.5, 0.26, -3.4, 0.35, 0.1, 0.9, 0x4a3828, false);
        stain(0.2, -6.2, 0.55, 0x2a1818);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 5, 10), mat(0x1a1a1a, 0.6, 0.3));
        wheel.position.set(0.8, 0.32, -11);
        wheel.rotation.y = 0.4;
        add(wheel);
        rock(0.2, 6.5, 0.7);
        box(-1.85, 0.85, 11.4, 0.08, 1.5, 0.08, 0x3a3c40, false);
        sign(-1.45, 1.45, 11.4, ["ONE LANE", "AHEAD"], 1.15, 0.62, -0.35);
        box(-8, 0.8, -16, 4, 1.6, 3, 0x2e3230, false);
        box(8, 1.2, 12, 3.5, 2.4, 3, 0x2a2e28, false);
        deadTree(-11, 6, 1.45);
        deadTree(12, -10, 1.35);
        tree(-13, -8, 1.15);
        tree(13, 4, 1.2);
        deadTree(10, 16, 1);
        deadTree(-9, -16, 1.1);
        const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mat(0xc45a28, 0.5, 0.1));
        buoy.position.set(-4.5, -1.05, 3);
        add(buoy);
        rock(-5, -4, 1.4);
        rock(6, 8, 1.6);
        rock(-6, 14, 1.1);
      },
    };

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ map: mudTexture(), color: TINT[arenaId] || 0xffffff, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    (layouts[arena.layout] || layouts.dojo)();
    return { arena, solids, markers, points, people, start };
  }

  root.World = { ARENAS, build };
})(window);
