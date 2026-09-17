// Major Computing Systems Ltd. — neural hero background (three.js)
// A rotating 3D neural cloud with glowing shader nodes, synapse-firing
// pathways, and a wireframe brain at its core — anchored behind the hero
// copy. Signal orbs ride the rendered pathways node-to-node, and the
// network reaches toward the cursor. Fixed full-viewport backdrop;
// main.js dims it on scroll.

(function () {
  "use strict";

  const canvas = document.getElementById("neural-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch (e) {
    return; // no WebGL — hero glow/grid remain as the backdrop
  }

  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);

  // ---- scene & camera ----
  const scene = new THREE.Scene();
  const CAM_DIST = 68;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1200);
  camera.position.set(0, 3, CAM_DIST);
  camera.lookAt(0, 0, 0);

  const neuralGroup = new THREE.Group();
  scene.add(neuralGroup);

  const clock = new THREE.Clock();

  // Anchor: right of centre on wide screens, centred on narrow ones
  const HALF_H = Math.tan(THREE.MathUtils.degToRad(42 / 2)) * CAM_DIST; // ~26
  const initAspect = Math.max((canvas.clientWidth || 1440) / (canvas.clientHeight || 900), 0.5);
  neuralGroup.position.x = Math.min(15, HALF_H * initAspect * 0.5);

  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
    uSignal: { value: 0.9 },
    uColorA: { value: new THREE.Color(0x29c6f8) }, // brand cyan
    uColorB: { value: new THREE.Color(0x8b5cf6) }, // brand violet
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uMouseActive: { value: 0 },
  };

  // Shared GLSL: cursor reach-out — nodes/lines lean toward uMouse
  const MOUSE_GLSL = `
    uniform vec3 uMouse;
    uniform float uMouseActive;
    vec3 mousePull(vec3 p) {
      vec3 toM = uMouse - p;
      float md = length(toM);
      float pull = max(0.0, 1.0 - md / 17.0) * 3.4 * uMouseActive;
      return p + normalize(toM + vec3(0.0001)) * pull;
    }
  `;

  // ---- neural cloud nodes ----
  const NODE_COUNT = 420;
  const nodePositions = [];

  function randomInNeuralCloud() {
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    const r = 7 + Math.pow(Math.random(), 0.55) * 28;
    const x = Math.sin(p) * Math.cos(t) * r + Math.sin(t * 2.0) * 3.2;
    let y = Math.cos(p) * r * 0.62;
    const z = Math.sin(p) * Math.sin(t) * r;
    y += Math.sin(x * 0.12) * Math.cos(z * 0.1) * 3.5;
    return new THREE.Vector3(x, y, z);
  }

  const nodeArray = new Float32Array(NODE_COUNT * 3);
  const seedArray = new Float32Array(NODE_COUNT);
  const sizeArray = new Float32Array(NODE_COUNT);

  for (let i = 0; i < NODE_COUNT; i++) {
    const p = randomInNeuralCloud();
    nodePositions.push(p);
    nodeArray.set([p.x, p.y, p.z], i * 3);
    seedArray[i] = Math.random() * 100;
    sizeArray[i] = 2.0 + Math.random() * 4.0;
  }

  const nodesGeo = new THREE.BufferGeometry();
  nodesGeo.setAttribute("position", new THREE.BufferAttribute(nodeArray, 3));
  nodesGeo.setAttribute("aSeed", new THREE.BufferAttribute(seedArray, 1));
  nodesGeo.setAttribute("aSize", new THREE.BufferAttribute(sizeArray, 1));

  const nodesMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uIntensity;
      attribute float aSeed;
      attribute float aSize;
      varying float vPulse;
      varying float vSeed;
      ${MOUSE_GLSL}
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        float wave = sin(uTime * 0.8 + aSeed * 4.0);
        float breathe = sin(uTime * 0.28 + length(position) * 0.08) * 0.85;
        p += normalize(position + 0.0001) * breathe;
        p.y += wave * 0.18;
        p = mousePull(p);
        vPulse = 0.45 + 0.55 * sin(uTime * 1.2 + aSeed * 6.283);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uIntensity * (260.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uIntensity;
      varying float vPulse;
      varying float vSeed;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float core = smoothstep(0.5, 0.0, d);
        float glow = smoothstep(0.5, 0.08, d);
        vec3 color = mix(uColorA, uColorB, fract(vSeed));
        color = mix(color, vec3(1.0), vPulse * 0.35);
        float alpha = (core * 0.85 + glow * 0.3) * uIntensity;
        if (alpha < 0.03) discard;
        gl_FragColor = vec4(color * (1.1 + vPulse * 1.4), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  neuralGroup.add(new THREE.Points(nodesGeo, nodesMat));

  // ---- pathways: connect nearby nodes; lines carry synapse pulse waves ----
  const MAX_CONNECTIONS = 1150;
  const connectionPositions = [];
  const connectionPhases = [];
  const edges = []; // [a, b] node indices, for the orbs

  for (let i = 0; i < NODE_COUNT && edges.length < MAX_CONNECTIONS; i++) {
    for (let j = i + 1; j < NODE_COUNT && edges.length < MAX_CONNECTIONS; j++) {
      const a = nodePositions[i];
      const b = nodePositions[j];
      if (a.distanceTo(b) < 8.6 && Math.random() > 0.45) {
        connectionPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        const phase = Math.random() * Math.PI * 2;
        connectionPhases.push(phase, phase);
        edges.push([i, j]);
      }
    }
  }

  const adjacency = nodePositions.map(() => []);
  edges.forEach(([a, b], ei) => {
    adjacency[a].push({ edge: ei, other: b });
    adjacency[b].push({ edge: ei, other: a });
  });

  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(connectionPositions), 3));
  linesGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(connectionPhases), 1));

  const linesMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;
      varying float vPhase;
      varying float vDepth;
      ${MOUSE_GLSL}
      void main() {
        vPhase = aPhase;
        vec3 p = position;
        p += normalize(position + 0.0001) * sin(uTime * 0.28 + length(position) * 0.06) * 0.65;
        p = mousePull(p);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vDepth = smoothstep(95.0, 12.0, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSignal;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vPhase;
      varying float vDepth;
      void main() {
        float pulse = pow(0.5 + 0.5 * sin(uTime * 1.7 + vPhase * 8.0), 8.0);
        vec3 color = mix(uColorA, uColorB, 0.45 + 0.5 * sin(vPhase));
        float alpha = (0.05 + pulse * 0.38 * uSignal) * uIntensity * vDepth;
        gl_FragColor = vec4(color * (0.9 + pulse * 3.2), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  neuralGroup.add(new THREE.LineSegments(linesGeo, linesMat));

  // ---- central wireframe brain ----
  const brainGroup = new THREE.Group();
  brainGroup.scale.setScalar(1.55);
  neuralGroup.add(brainGroup);

  const brainMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vPos;
      varying float vPulse;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec3 p = position;
        float fold =
          sin(position.x * 3.2 + uTime * 0.8) *
          sin(position.y * 4.1 - uTime * 0.6) *
          sin(position.z * 2.7 + uTime * 0.45);
        p += normal * fold * 0.22;
        p *= 1.0 + sin(uTime * 1.0 + position.x * 0.4) * 0.025;
        vPos = p;
        vPulse = 0.5 + 0.5 * sin(uTime * 1.5 + length(position) * 0.8);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vPos;
      varying float vPulse;
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.5);
        float folds =
          abs(sin(vPos.x * 4.0)) *
          abs(cos(vPos.y * 5.0)) *
          abs(sin(vPos.z * 3.5));
        vec3 base = mix(uColorA, uColorB, 0.45 + 0.35 * sin(vPos.x * 1.2));
        vec3 electric = mix(base, vec3(1.0), rim * 0.22 + vPulse * 0.1);
        float alpha = 0.14 + rim * 0.55 + folds * 0.09;
        gl_FragColor = vec4(electric * (1.0 + rim * 2.2) * uIntensity, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const brainWireMat = new THREE.MeshBasicMaterial({
    color: 0x29c6f8,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  function createBrainHemisphere(side) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(4.9, 48, 48);
    geo.scale(1.12, 0.82, 1.42);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const fold =
        Math.sin(y * 2.2) * 0.28 +
        Math.sin(z * 2.6) * 0.22 +
        Math.cos((y + z) * 1.7) * 0.18;
      const frontalBulge = z > 0 ? z * 0.08 : 0;
      const rearRound = z < 0 ? Math.abs(z) * 0.04 : 0;
      pos.setX(i, x + fold * side + frontalBulge * side - rearRound * side);
      pos.setY(i, y + Math.sin(x * 1.8 + z * 0.9) * 0.12);
      pos.setZ(i, z + Math.cos(x * 1.4 + y * 1.2) * 0.16);
    }
    geo.computeVertexNormals();

    const hemi = new THREE.Mesh(geo, brainMat);
    hemi.position.x = side * 2.65;
    hemi.rotation.z = side * 0.08;

    const wire = new THREE.Mesh(geo.clone(), brainWireMat);
    wire.position.copy(hemi.position);
    wire.rotation.copy(hemi.rotation);

    group.add(hemi, wire);
    return group;
  }

  const leftBrain = createBrainHemisphere(-1);
  const rightBrain = createBrainHemisphere(1);
  brainGroup.add(leftBrain, rightBrain);

  // corpus callosum bridge
  const bridge = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.08, 12, 80, Math.PI),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  bridge.rotation.z = Math.PI;
  bridge.rotation.x = Math.PI * 0.5;
  bridge.position.y = -0.25;
  brainGroup.add(bridge);

  // animated fold lines across the hemispheres
  const foldLines = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const y = -2.7 + Math.random() * 5.4;
    const z = -4.2 + Math.random() * 8.4;
    const radius = 0.65 + Math.random() * 1.45;
    const twist = Math.random() * Math.PI * 2;
    const points = [];
    for (let k = 0; k < 80; k++) {
      const t = k / 79;
      const angle = t * Math.PI * 2.0;
      points.push(new THREE.Vector3(
        side * (2.55 + Math.sin(angle * 1.7 + twist) * 0.65),
        y + Math.sin(angle * 2.4 + twist) * radius * 0.32,
        z + Math.cos(angle + twist) * radius
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(140));
    const mat = new THREE.LineBasicMaterial({
      color: Math.random() > 0.5 ? 0x29c6f8 : 0x8b5cf6,
      transparent: true,
      opacity: 0.2 + Math.random() * 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.userData.baseOpacity = mat.opacity;
    line.userData.speed = 0.3 + Math.random() * 0.6;
    line.userData.offset = Math.random() * 10;
    brainGroup.add(line);
    foldLines.push(line);
  }

  // glowing synapse points embedded in the brain volume
  const BRAIN_NODE_COUNT = 160;
  const brainNodeGeo = new THREE.BufferGeometry();
  const brainNodePositions = new Float32Array(BRAIN_NODE_COUNT * 3);
  const brainNodeSeeds = new Float32Array(BRAIN_NODE_COUNT);
  const brainNodeSizes = new Float32Array(BRAIN_NODE_COUNT);
  for (let i = 0; i < BRAIN_NODE_COUNT; i++) {
    const side = Math.random() > 0.5 ? -1 : 1;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    brainNodePositions.set([
      side * 2.55 + Math.sin(phi) * Math.cos(theta) * 4.2 * 0.55,
      Math.cos(phi) * 3.1,
      Math.sin(phi) * Math.sin(theta) * 5.2,
    ], i * 3);
    brainNodeSeeds[i] = Math.random() * 100;
    brainNodeSizes[i] = 2.5 + Math.random() * 4.5;
  }
  brainNodeGeo.setAttribute("position", new THREE.BufferAttribute(brainNodePositions, 3));
  brainNodeGeo.setAttribute("aSeed", new THREE.BufferAttribute(brainNodeSeeds, 1));
  brainNodeGeo.setAttribute("aSize", new THREE.BufferAttribute(brainNodeSizes, 1));

  const brainNodeMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uIntensity;
      attribute float aSeed;
      attribute float aSize;
      varying float vPulse;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        p += normalize(position + 0.0001) * sin(uTime * 1.2 + aSeed * 4.0) * 0.12;
        vPulse = 0.5 + 0.5 * sin(uTime * 3.0 + aSeed * 6.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uIntensity * (240.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uIntensity;
      varying float vPulse;
      varying float vSeed;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float glow = smoothstep(0.5, 0.0, d);
        vec3 color = mix(uColorA, uColorB, fract(vSeed));
        float alpha = glow * (0.45 + vPulse * 0.55) * uIntensity;
        if (alpha < 0.025) discard;
        gl_FragColor = vec4(color * (1.6 + vPulse * 2.4), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  brainGroup.add(new THREE.Points(brainNodeGeo, brainNodeMat));

  // narrow screens: lift the brain above the stacked hero copy so text stays readable
  if (initAspect < 0.9) {
    neuralGroup.position.x = 0;
    neuralGroup.position.y = HALF_H * 0.72;
    brainGroup.scale.setScalar(0.75);
  }


  // ---- orbs: many signal dots streaming the pathways, chaining, blinking out ----
  const ORB_COUNT = 48;
  const ORB_SPEED = [1.6, 2.8];
  const ORB_CHAIN_CHANCE = 0.75;  // most keep flowing onto a connected pathway
  const ORB_FADE_TIME = 0.45;
  const ORB_BASE_SCALE = 0.9;

  function makeGlowTex(inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const orbTex = makeGlowTex("rgba(255,255,255,1)", "rgba(160,220,255,0.45)");

  const orbs = [];
  for (let i = 0; i < ORB_COUNT; i++) {
    const mat = new THREE.SpriteMaterial({
      map: orbTex,
      color: 0xbfe8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(0.001);
    sprite.visible = false;
    neuralGroup.add(sprite);
    orbs.push({
      sprite, state: "wait", wait: Math.random() * 2,
      from: 0, to: 0, t: 0, speed: 4, fadeT: 0,
    });
  }

  function orbSpawn(o) {
    const [a, b] = edges[Math.floor(Math.random() * edges.length)];
    if (Math.random() < 0.5) { o.from = a; o.to = b; } else { o.from = b; o.to = a; }
    o.t = 0;
    o.speed = ORB_SPEED[0] + Math.random() * (ORB_SPEED[1] - ORB_SPEED[0]);
    o.state = "travel";
    o.sprite.visible = true;
    o.sprite.material.opacity = 0.95;
    o.sprite.scale.setScalar(ORB_BASE_SCALE);
  }

  function orbChainOrFade(o) {
    if (Math.random() < ORB_CHAIN_CHANCE && adjacency[o.to].length > 0) {
      const options = adjacency[o.to].filter((e) => e.other !== o.from);
      const next = options.length
        ? options[Math.floor(Math.random() * options.length)]
        : adjacency[o.to][0];
      o.from = o.to;
      o.to = next.other;
      o.t = 0;
      o.speed = ORB_SPEED[0] + Math.random() * (ORB_SPEED[1] - ORB_SPEED[0]);
    } else {
      o.state = "fade";
      o.fadeT = 0;
    }
  }

  // ---- flow particles: a constant stream of light riding every pathway ----
  const FLOW_MAX_EDGES = 500;
  const FLOW_PER_EDGE = 2;

  const flowMeta = []; // { a, b, phase, speed, len }
  {
    const scored = edges.map(([a, b], ei) => ({
      ei,
      len: nodePositions[a].distanceTo(nodePositions[b]),
    }));
    scored.sort((x, y) => x.len - y.len); // shorter links read as tighter connections
    for (const s of scored.slice(0, FLOW_MAX_EDGES)) {
      const [a, b] = edges[s.ei];
      for (let k = 0; k < FLOW_PER_EDGE; k++) {
        flowMeta.push({
          a, b,
          phase: Math.random(),
          speed: 0.7 + Math.random() * 1.1, // world units per second
          len: s.len,
          dir: Math.random() < 0.5,
        });
      }
    }
  }

  const FLOW_COUNT = flowMeta.length;
  const flowPositions = new Float32Array(FLOW_COUNT * 3);
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute("position", new THREE.BufferAttribute(flowPositions, 3));
  const flowMat = new THREE.PointsMaterial({
    size: 1.6,
    map: orbTex,
    color: 0xa8dcff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  neuralGroup.add(new THREE.Points(flowGeo, flowMat));

  function updateFlow(time) {
    for (let i = 0; i < FLOW_COUNT; i++) {
      const f = flowMeta[i];
      let t = (time * (f.speed / Math.max(f.len, 0.001)) + f.phase) % 1;
      if (f.dir) t = 1 - t;
      const pa = renderedNodes[f.a];
      const pb = renderedNodes[f.b];
      flowPositions[i * 3] = pa.x + (pb.x - pa.x) * t;
      flowPositions[i * 3 + 1] = pa.y + (pb.y - pa.y) * t;
      flowPositions[i * 3 + 2] = pa.z + (pb.z - pa.z) * t;
    }
    flowGeo.attributes.position.needsUpdate = true;
  }

  // ---- cursor tracking ----
  let mouseNDC = null;
  let targetRX = 0, targetRY = 0;
  const mouseWorld = new THREE.Vector3();
  const mouseLocal = new THREE.Vector3();
  const pullVec = new THREE.Vector3();
  let mouseActiveTarget = 0;

  window.addEventListener("pointermove", (e) => {
    mouseNDC = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -((e.clientY / window.innerHeight) * 2 - 1),
    };
    mouseActiveTarget = 1;
    targetRY = mouseNDC.x * 0.08;
    targetRX = -mouseNDC.y * 0.05;
  }, { passive: true });

  document.addEventListener("pointerleave", () => { mouseActiveTarget = 0; });
  document.addEventListener("mouseleave", () => { mouseActiveTarget = 0; });

  function updateMouse() {
    // ease the engage/disengage so the reach-out fades in softly
    const u = uniforms.uMouseActive;
    u.value += (mouseActiveTarget - u.value) * 0.04;
    if (mouseNDC) {
      const halfW = HALF_H * camera.aspect;
      mouseWorld.set(mouseNDC.x * halfW, 3 + mouseNDC.y * HALF_H, 0);
      neuralGroup.updateMatrixWorld();
      mouseLocal.copy(mouseWorld);
      neuralGroup.worldToLocal(mouseLocal);
      uniforms.uMouse.value.copy(mouseLocal);
    }
  }

  // ---- per-frame ----
  const posA = new THREE.Vector3();
  const posB = new THREE.Vector3();

  // Cache each node's rendered position — mirrors the line vertex shader exactly
  // (breathe displacement + cursor reach-out), so orbs ride the visible pathways.
  const renderedNodes = nodePositions.map(() => new THREE.Vector3());

  function computeRenderedNodes(time) {
    const ma = uniforms.uMouseActive.value;
    for (let i = 0; i < nodePositions.length; i++) {
      const p = nodePositions[i];
      const out = renderedNodes[i];
      const len = p.length() + 0.0001;
      const breathe = Math.sin(time * 0.28 + len * 0.06) * 0.65;
      out.copy(p).multiplyScalar(1 + breathe / len);
      if (ma > 0.02) {
        pullVec.subVectors(uniforms.uMouse.value, out);
        const md = pullVec.length();
        const pull = Math.max(0, 1 - md / 17) * 3.4 * ma;
        if (md > 0.001) out.addScaledVector(pullVec, pull / md);
      }
    }
  }

  function updateOrbs(dt) {
    for (const o of orbs) {
      if (o.state === "wait") {
        o.wait -= dt;
        if (o.wait <= 0) orbSpawn(o);
        continue;
      }
      posA.copy(renderedNodes[o.from]);
      posB.copy(renderedNodes[o.to]);

      if (o.state === "travel") {
        const edgeLen = Math.max(posA.distanceTo(posB), 0.001);
        o.t += (dt * o.speed) / edgeLen;
        if (o.t >= 1) {
          o.t = 1;
          orbChainOrFade(o);
          if (o.state === "travel") {
            posA.copy(renderedNodes[o.from]);
            posB.copy(renderedNodes[o.to]);
          }
        }
        o.sprite.position.lerpVectors(posA, posB, o.t);
      } else if (o.state === "fade") {
        o.fadeT += dt;
        const k = Math.max(0, 1 - o.fadeT / ORB_FADE_TIME);
        o.sprite.scale.setScalar(Math.max(ORB_BASE_SCALE * k * k, 0.001));
        o.sprite.material.opacity = 0.95 * k;
        o.sprite.position.copy(posB);
        if (o.fadeT >= ORB_FADE_TIME) {
          o.state = "wait";
          o.wait = 0.2 + Math.random() * 1.2;
          o.sprite.visible = false;
        }
      }
    }
  }

  // ---- sizing ----
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(DPR);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- main loop ----
  let raf = null;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();
    uniforms.uTime.value = time;

    updateMouse();
    computeRenderedNodes(time);
    updateOrbs(dt);
    updateFlow(time);

    // slow, relaxed rotation
    neuralGroup.rotation.y += 0.0007;
    neuralGroup.rotation.x += ((Math.sin(time * 0.12) * 0.05 + targetRX) - neuralGroup.rotation.x) * 0.04;
    neuralGroup.rotation.z += (targetRY * 0.4 - neuralGroup.rotation.z) * 0.04;

    brainGroup.rotation.y -= 0.0016;
    brainGroup.rotation.x = Math.sin(time * 0.5) * 0.04;
    leftBrain.rotation.y = Math.sin(time * 0.7) * 0.035;
    rightBrain.rotation.y = -Math.sin(time * 0.7) * 0.035;
    bridge.scale.setScalar(1.0 + Math.sin(time * 1.6) * 0.045);

    for (const line of foldLines) {
      line.material.opacity =
        line.userData.baseOpacity * (0.55 + 0.45 * Math.sin(time * line.userData.speed + line.userData.offset));
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf === null) {
      clock.getDelta();
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  // first paint
  renderer.render(scene, camera);
  start();
})();
