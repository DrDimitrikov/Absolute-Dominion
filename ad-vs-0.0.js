// ============================================================
// BASIC SCENE SETUP (flight)
// ============================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 8000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const editorCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  editorCamera.aspect = window.innerWidth / window.innerHeight;
  editorCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Layered starfield ---
function makeStarLayer(count, spread, size, color) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * spread;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: color, size: size, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  return new THREE.Points(geometry, material);
}
scene.add(makeStarLayer(3000, 4000, 2.2, 0xffffff));
scene.add(makeStarLayer(5000, 6000, 1.2, 0xaad4ff));
scene.add(makeStarLayer(6000, 8000, 0.7, 0xffe9c4));

const bgGeo = new THREE.SphereGeometry(6000, 32, 32);
const bgMat = new THREE.MeshBasicMaterial({ color: 0x060613, side: THREE.BackSide });
scene.add(new THREE.Mesh(bgGeo, bgMat));

// --- Planets + orbiting moons (each moon = one resource) ---
const RESOURCES = [
  { id: "iron",           label: "Iron",           color: "#a8b0bc" },
  { id: "oil",            label: "Oil",            color: "#6b5a3e" },
  { id: "plasma_crystal", label: "Plasma Crystal", color: "#7cf0ff" },
  { id: "void_ice",       label: "Void Ice",       color: "#b8d4ff" },
  { id: "stardust",       label: "Stardust",       color: "#ffe08a" }
];

const planets = [];
const moons = [];

function makePlanet(radius, color, position) {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat2 = new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat2);
  mesh.position.copy(position);
  scene.add(mesh);
  return mesh;
}

function makeMoon(planetMesh, planetRadius, opts) {
  const pivot = new THREE.Group();
  pivot.position.copy(planetMesh.position);
  scene.add(pivot);

  const moonRadius = opts.radius;
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(moonRadius, 24, 24),
    new THREE.MeshStandardMaterial({
      color: opts.color,
      roughness: 0.9,
      metalness: 0.15,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissive ? 0.25 : 0
    })
  );
  moonMesh.position.set(opts.orbitRadius, 0, 0);
  pivot.rotation.y = opts.phase || 0;
  pivot.rotation.x = opts.tilt || 0;
  pivot.add(moonMesh);

  const moon = {
    planet: planetMesh,
    pivot,
    mesh: moonMesh,
    radius: moonRadius,
    baseRadius: moonRadius,
    orbitRadius: opts.orbitRadius,
    orbitSpeed: opts.orbitSpeed,
    resourceId: opts.resourceId,
    maxResources: opts.maxResources,
    remaining: opts.maxResources,
    name: opts.name,
    respawnAt: 0,
    active: true
  };
  moons.push(moon);
  return moon;
}

const planetDefs = [
  { radius: 120, color: 0x4a7c59, pos: new THREE.Vector3(700, 50, -400),
    moon: { radius: 28, color: 0x9aa3ad, orbitRadius: 220, orbitSpeed: 0.0035, phase: 0.4, tilt: 0.15, resourceId: "iron", maxResources: 1400, name: "Ferrum Moon" } },
  { radius: 220, color: 0xc9a66b, pos: new THREE.Vector3(-1000, -120, 800),
    moon: { radius: 36, color: 0x5c4a32, orbitRadius: 340, orbitSpeed: 0.0022, phase: 1.2, tilt: -0.2, resourceId: "oil", maxResources: 1600, name: "Tar Moon", emissive: 0x221100 } },
  { radius: 90,  color: 0x6b8ec9, pos: new THREE.Vector3(350, -220, 1000),
    moon: { radius: 22, color: 0x66e0ff, orbitRadius: 180, orbitSpeed: 0.0045, phase: 2.1, tilt: 0.35, resourceId: "plasma_crystal", maxResources: 1200, name: "Crystal Moon", emissive: 0x114466 } },
  { radius: 170, color: 0xb85c5c, pos: new THREE.Vector3(-600, 320, -950),
    moon: { radius: 30, color: 0xcfe4ff, orbitRadius: 280, orbitSpeed: 0.0028, phase: 3.5, tilt: 0.1, resourceId: "void_ice", maxResources: 1500, name: "Cryo Moon", emissive: 0x223355 } },
  { radius: 140, color: 0x8a6bc9, pos: new THREE.Vector3(1200, -80, 300),
    moon: { radius: 26, color: 0xffe6a0, orbitRadius: 250, orbitSpeed: 0.0038, phase: 5.0, tilt: -0.25, resourceId: "stardust", maxResources: 1300, name: "Dust Moon", emissive: 0x443300 } }
];

for (const def of planetDefs) {
  const planet = makePlanet(def.radius, def.color, def.pos);
  planets.push(planet);
  makeMoon(planet, def.radius, def.moon);
}

function updateMoons() {
  const now = performance.now();
  for (const m of moons) {
    m.pivot.rotation.y += m.orbitSpeed;
    if (m.active) m.mesh.rotation.y += 0.01;

    if (!m.active && m.respawnAt && now >= m.respawnAt) {
      respawnMoon(m);
    }
  }
}

function getMoonWorldPos(moon, out = new THREE.Vector3()) {
  return moon.mesh.getWorldPosition(out);
}

function getMoonEffectiveRadius(moon) {
  return moon.baseRadius * moon.mesh.scale.x;
}

function updateMoonScale(moon) {
  const pct = moon.maxResources > 0 ? moon.remaining / moon.maxResources : 0;
  const scale = Math.max(0.08, pct);
  moon.mesh.scale.setScalar(scale);
  moon.radius = moon.baseRadius * scale;
}

function despawnMoon(moon) {
  moon.remaining = 0;
  moon.active = false;
  moon.mesh.visible = false;
  moon.mesh.scale.setScalar(0.01);
  moon.radius = 0;
  moon.respawnAt = performance.now() + 30000;
}

function respawnMoon(moon) {
  moon.remaining = moon.maxResources;
  moon.active = true;
  moon.respawnAt = 0;
  moon.mesh.visible = true;
  moon.mesh.scale.setScalar(1);
  moon.radius = moon.baseRadius;
}

// --- Ship (rebuilt from blocks; starts as a placeholder cone) ---
const ship = new THREE.Group();
const placeholderMesh = new THREE.Mesh(
  new THREE.ConeGeometry(4, 12, 8),
  new THREE.MeshStandardMaterial({ color: 0x3cf0c5, metalness: 0.3, roughness: 0.4 })
);
placeholderMesh.rotation.x = Math.PI / 2;
ship.add(placeholderMesh);
scene.add(ship);

scene.add(new THREE.AmbientLight(0x404060, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 300, 100);
scene.add(sun);

// ============================================================
// BLOCK TYPES
// ============================================================
const GRID = 4;
const GRID_HALF_RANGE = 20;

const ROTATION_STATES = [
  { x: 0, y: 0, z: 0 },
  { x: 0, y: Math.PI / 2, z: 0 },
  { x: 0, y: Math.PI, z: 0 },
  { x: 0, y: (3 * Math.PI) / 2, z: 0 },
  { x: Math.PI / 2, y: 0, z: 0 },
  { x: -Math.PI / 2, y: 0, z: 0 },
  { x: 0, y: 0, z: Math.PI / 2 },
  { x: 0, y: 0, z: -Math.PI / 2 },
  { x: 0, y: 0, z: Math.PI }
];
function applyRotationState(obj, idx) {
  const r = ROTATION_STATES[idx];
  obj.rotation.set(r.x, r.y, r.z);
}

function mat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: extras.metalness ?? 0.3,
    roughness: extras.roughness ?? 0.5,
    ...extras
  });
}

function makeShapeGroup(shapeMesh) {
  const g = new THREE.Group();
  g.add(shapeMesh);
  return g;
}

function makeBarrelWeapon(color, radius = 0.55, length = 3.8) {
  const g = new THREE.CylinderGeometry(radius, radius, length, 10);
  g.rotateX(Math.PI / 2);
  return makeShapeGroup(new THREE.Mesh(g, mat(color)));
}

function makeTwinBarrel(color) {
  const group = new THREE.Group();
  for (const x of [-0.7, 0.7]) {
    const geo = new THREE.CylinderGeometry(0.35, 0.35, 3.6, 8);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat(color));
    mesh.position.x = x;
    group.add(mesh);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.6), mat(0x4a5060));
  base.position.z = 0.6;
  group.add(base);
  return group;
}

function makeRailWeapon(color) {
  const group = new THREE.Group();
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.2), mat(color, { metalness: 0.7, roughness: 0.25 }));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.18, 8, 16), mat(0x88ddff, { metalness: 0.8, roughness: 0.2 }));
  coil.rotation.y = Math.PI / 2;
  coil.position.z = -0.4;
  group.add(rail, coil);
  return group;
}

function makeMissilePod(color) {
  const group = new THREE.Group();
  const pod = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.0, 3.2), mat(color));
  group.add(pod);
  for (const ox of [-0.7, 0.7]) {
    for (const oy of [-0.45, 0.45]) {
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.7, 6),
        mat(0xffcc88)
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.set(ox, oy, -1.9);
      group.add(tip);
    }
  }
  return group;
}

function makePlasmaLance(color) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 4.4, 10),
    mat(color, { emissive: color, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.35 })
  );
  core.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.15, 8, 18),
    mat(0xaa66ff, { emissive: 0xaa66ff, emissiveIntensity: 0.4 })
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.z = 0.2;
  group.add(core, ring);
  return group;
}

function makeDrillBlock() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.4), mat(0x8a7355, { metalness: 0.45, roughness: 0.45 })));
  const bit = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 3.2, 8),
    mat(0xc0c8d0, { metalness: 0.8, roughness: 0.25 })
  );
  bit.rotation.x = Math.PI / 2;
  bit.position.z = -2.4;
  g.add(bit);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.6, 12), mat(0xffaa44, { emissive: 0xff6611, emissiveIntensity: 0.25 }));
  collar.rotation.x = Math.PI / 2;
  collar.position.z = -1.0;
  g.add(collar);
  return g;
}

function makeMiningLaser() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 2.8), mat(0x4a6a88, { metalness: 0.5 })));
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.75, 2.8, 12),
    mat(0x44ddff, { emissive: 0x22aacc, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.2 })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -2.0;
  g.add(lens);
  return g;
}

function makeOreHold() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 3.6), mat(0x6b5744, { roughness: 0.8 })));
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 2.2), mat(0x3cf0c5, { metalness: 0.4 }));
  hatch.position.y = 1.75;
  g.add(hatch);
  return g;
}

// Weapons carry combat stats used when firing.
const WEAPON_IDS = new Set([
  "weapon", "pulse_cannon", "rail_gun", "scatter_blaster", "plasma_lance", "missile_pod"
]);
const MINING_IDS = new Set(["drill", "mining_laser", "ore_hold"]);

const BLOCK_TYPES = [
  // --- Structure ---
  { id: "cube",     label: "Hull Cube",   category: "structure", color: 0x8fa3b8, markerOffset: -2.2, hp: 12, make: () => makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.6, 3.6), mat(0x8fa3b8))) },
  { id: "armor",    label: "Armor Plate", category: "structure", color: 0x5a6678, markerOffset: -2.2, hp: 22, make: () => makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, 3.8), mat(0x5a6678, { metalness: 0.55, roughness: 0.35 }))) },
  { id: "cone",     label: "Nose Cone",   category: "structure", color: 0x3cf0c5, markerOffset: -2.2, hp: 10, make: () => makeShapeGroup(new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.6, 12), mat(0x3cf0c5))) },
  { id: "sphere",   label: "Sphere Pod",  category: "structure", color: 0xd7c15a, markerOffset: -2.2, hp: 10, make: () => makeShapeGroup(new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), mat(0xd7c15a))) },
  { id: "cylinder", label: "Cylinder",    category: "structure", color: 0xb0b0b0, markerOffset: -2.2, hp: 11, make: () => makeShapeGroup(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.6, 16), mat(0xb0b0b0))) },
  { id: "pyramid",  label: "Wing Wedge",  category: "structure", color: 0x7a8ccf, markerOffset: -2.4, hp: 9,  make: () => makeShapeGroup(new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.6, 4), mat(0x7a8ccf))) },
  { id: "fin",      label: "Stabilizer",  category: "structure", color: 0x6ec1ff, markerOffset: -2.4, hp: 8,  make: () => makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.4, 3.6), mat(0x6ec1ff))) },
  { id: "glass",    label: "Glass Dome",  category: "structure", color: 0x88e0ff, markerOffset: -2.2, hp: 6,  make: () => makeShapeGroup(new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), mat(0x88e0ff, { transparent: true, opacity: 0.55, metalness: 0.1, roughness: 0.1 }))) },
  { id: "cargo",    label: "Cargo Crate", category: "structure", color: 0xc49a6c, markerOffset: -2.2, hp: 14, make: () => makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 3.4), mat(0xc49a6c, { roughness: 0.75 }))) },
  { id: "antenna",  label: "Antenna",     category: "structure", color: 0xd0d8e8, markerOffset: -2.6, hp: 5,  make: () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.8, 8), mat(0xd0d8e8)));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), mat(0xff6b6b, { emissive: 0xff6b6b, emissiveIntensity: 0.5 }));
      tip.position.y = 2.1;
      g.add(tip);
      return g;
    } },

  // --- Propulsion ---
  { id: "engine",       label: "Engine",       category: "propulsion", color: 0xff8c3c, markerOffset: -2.2, hp: 10, make: () => makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.6), mat(0xff8c3c))) },
  { id: "boost_engine", label: "Boost Engine", category: "propulsion", color: 0xff5522, markerOffset: -2.2, hp: 10, make: () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 3.4), mat(0xff5522, { metalness: 0.45 })));
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.2, 12), mat(0xffcc66, { emissive: 0xff8822, emissiveIntensity: 0.4 }));
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.z = 2.0;
      g.add(nozzle);
      return g;
    } },

  // --- Mining ---
  {
    id: "drill", label: "Mining Drill", category: "mining", color: 0xc4a574, markerOffset: -2.8, hp: 10,
    mineRate: 1.8, make: () => makeDrillBlock()
  },
  {
    id: "mining_laser", label: "Mining Laser", category: "mining", color: 0x44ddff, markerOffset: -2.6, hp: 9,
    mineRate: 3.2, make: () => makeMiningLaser()
  },
  {
    id: "ore_hold", label: "Ore Hold", category: "mining", color: 0x6b5744, markerOffset: -2.2, hp: 12,
    cargoBonus: 120, make: () => makeOreHold()
  },

  // --- Weapons (unique stats) ---
  {
    id: "weapon", label: "Light Gun", category: "weapon", color: 0xe64545, markerOffset: -2.4, hp: 8,
    damage: 8, projectileSpeed: 7, projectileLife: 70, projectileSize: 0.45, projectileColor: 0xff5555,
    make: () => makeBarrelWeapon(0xe64545, 0.5, 3.6)
  },
  {
    id: "pulse_cannon", label: "Pulse Cannon", category: "weapon", color: 0xff6b8a, markerOffset: -2.4, hp: 9,
    damage: 12, projectileSpeed: 8, projectileLife: 75, projectileSize: 0.55, projectileColor: 0xff77aa,
    make: () => makeBarrelWeapon(0xff6b8a, 0.65, 3.9)
  },
  {
    id: "rail_gun", label: "Rail Gun", category: "weapon", color: 0x66d4ff, markerOffset: -2.6, hp: 10,
    damage: 28, projectileSpeed: 14, projectileLife: 55, projectileSize: 0.35, projectileColor: 0xa8f0ff,
    make: () => makeRailWeapon(0x66d4ff)
  },
  {
    id: "scatter_blaster", label: "Scatter Blaster", category: "weapon", color: 0xffaa33, markerOffset: -2.4, hp: 9,
    damage: 6, projectileSpeed: 6, projectileLife: 50, projectileSize: 0.4, projectileColor: 0xffcc66, pellets: 3, spread: 0.18,
    make: () => makeTwinBarrel(0xffaa33)
  },
  {
    id: "plasma_lance", label: "Plasma Lance", category: "weapon", color: 0xb266ff, markerOffset: -2.6, hp: 9,
    damage: 18, projectileSpeed: 5.5, projectileLife: 100, projectileSize: 0.75, projectileColor: 0xcc88ff,
    make: () => makePlasmaLance(0xb266ff)
  },
  {
    id: "missile_pod", label: "Missile Pod", category: "weapon", color: 0xd4552a, markerOffset: -2.4, hp: 11,
    damage: 35, projectileSpeed: 4, projectileLife: 120, projectileSize: 0.7, projectileColor: 0xff8844,
    make: () => makeMissilePod(0xd4552a)
  }
];

function blockTypeById(id) { return BLOCK_TYPES.find(b => b.id === id); }
function isWeaponType(id) { return WEAPON_IDS.has(id); }
function isMiningTool(id) { return id === "drill" || id === "mining_laser"; }

function createBlockMesh(typeId) {
  const def = blockTypeById(typeId);
  if (!def) {
    console.warn("Unknown block type:", typeId);
    return makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.6, 3.6), mat(0xff00ff)));
  }
  const group = def.make();
  group.userData.isBlockRoot = true;
  group.userData.blockType = typeId;
  return group;
}

function createGhostPreview(typeId) {
  const group = createBlockMesh(typeId);
  const bt = blockTypeById(typeId);
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.9, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  marker.position.set(0, 0, bt.markerOffset);
  marker.rotation.x = -Math.PI / 2;
  group.add(marker);
  return group;
}

function findBlockRoot(obj) {
  while (obj && !(obj.userData && obj.userData.isBlockRoot)) obj = obj.parent;
  return obj;
}

let shipBlocks = [];

function rebuildShipFromBlocks() {
  while (ship.children.length) ship.remove(ship.children[0]);

  if (shipBlocks.length === 0) {
    ship.add(placeholderMesh);
    refreshPlayerMaxHealth(true);
    return;
  }
  for (const b of shipBlocks) {
    const mesh = createBlockMesh(b.type);
    mesh.position.set(b.gx * GRID, b.gy * GRID, b.gz * GRID);
    applyRotationState(mesh, b.rot);
    ship.add(mesh);
  }
  refreshPlayerMaxHealth(true);
}

function getRegularEngineCount() {
  return shipBlocks.filter(b => b.type === "engine").length;
}
function getBoostEngineCount() {
  return shipBlocks.filter(b => b.type === "boost_engine").length;
}
function getWeaponBlocks() {
  return shipBlocks.filter(b => isWeaponType(b.type));
}

// Top speed: each Engine +30%, each Boost Engine +50% (additive on base).
function getTopSpeedMultiplier() {
  return 1 + getRegularEngineCount() * 0.30 + getBoostEngineCount() * 0.50;
}

function computeHullHpFromBlocks(blocks) {
  if (!blocks || blocks.length === 0) return 100;
  let hp = 40;
  for (const b of blocks) {
    const def = blockTypeById(b.type);
    hp += def ? (def.hp || 8) : 8;
  }
  return hp;
}

// ============================================================
// SHIP EDITOR SCENE
// ============================================================
const editorScene = new THREE.Scene();
editorScene.add(new THREE.AmbientLight(0x555566, 1.6));
const editorLight = new THREE.DirectionalLight(0xffffff, 1.1);
editorLight.position.set(100, 200, 100);
editorScene.add(editorLight);

const editorGrid = new THREE.GridHelper(GRID_HALF_RANGE * 2 * GRID, GRID_HALF_RANGE * 2, 0x3cf0c5, 0x334455);
editorGrid.position.y = -GRID / 2;
editorScene.add(editorGrid);

const basePlaneSize = GRID_HALF_RANGE * 2 * GRID;
const basePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(basePlaneSize, basePlaneSize),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
);
basePlane.rotation.x = -Math.PI / 2;
basePlane.position.y = -GRID / 2;
editorScene.add(basePlane);

const facingArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, 0),
  24,
  0xffe14d,
  6,
  4
);
editorScene.add(facingArrow);

const placedMeshes = [];
const occupied = new Set();

let selectedType = BLOCK_TYPES[0].id;
let ghostRotation = 0;
let ghostCell = { gx: 0, gy: 0, gz: 0, key: "0,0,0" };

let selectedBlockIndex = null;
let highlightHelper = null;

const ghostGroup = new THREE.Group();
ghostGroup.position.set(0, 0, 0);
editorScene.add(ghostGroup);

function rebuildGhostMesh() {
  while (ghostGroup.children.length) ghostGroup.remove(ghostGroup.children[0]);

  if (selectedType === null) {
    ghostGroup.visible = false;
    return;
  }

  const preview = createGhostPreview(selectedType);
  preview.traverse((obj) => {
    if (obj.isMesh) {
      obj.material = obj.material.clone();
      obj.material.transparent = true;
      obj.material.opacity = 0.5;
    }
  });
  ghostGroup.add(preview);
  applyRotationState(ghostGroup, ghostRotation);
  ghostGroup.visible = !occupied.has(ghostCell.key);
}
rebuildGhostMesh();

function setSelectedType(id) {
  selectedType = id;
  clearSelection();
  rebuildGhostMesh();
}

function deselectPlacingBlock() {
  selectedType = null;
  document.querySelectorAll(".block-btn").forEach(b => b.classList.remove("selected"));
  rebuildGhostMesh();
}

const blockListEl = document.getElementById("block-list");
const CATEGORY_ORDER = ["structure", "propulsion", "mining", "weapon"];
const CATEGORY_LABELS = {
  structure: "STRUCTURE",
  propulsion: "PROPULSION",
  mining: "MINING",
  weapon: "WEAPONS"
};

CATEGORY_ORDER.forEach(cat => {
  const label = document.createElement("div");
  label.className = "section-label";
  label.textContent = CATEGORY_LABELS[cat];
  blockListEl.appendChild(label);

  BLOCK_TYPES.filter(bt => bt.category === cat).forEach(bt => {
    const btn = document.createElement("button");
    btn.className = "block-btn" + (bt.id === selectedType ? " selected" : "");
    const dmgMeta = bt.damage != null ? `<span class="meta">${bt.damage} dmg</span>`
      : bt.mineRate != null ? `<span class="meta">${bt.mineRate}/t</span>`
      : bt.cargoBonus != null ? `<span class="meta">+${bt.cargoBonus} cap</span>`
      : "";
    btn.innerHTML = `<span class="swatch" style="background:#${bt.color.toString(16).padStart(6,"0")}"></span>${bt.label}${dmgMeta}`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".block-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      setSelectedType(bt.id);
    });
    blockListEl.appendChild(btn);
  });
});

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

function clampCell(v) {
  return Math.max(-GRID_HALF_RANGE, Math.min(GRID_HALF_RANGE, v));
}

function updateGhost(clientX, clientY) {
  if (selectedType === null) return;

  mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, editorCamera);

  const targets = [basePlane, ...placedMeshes];
  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length > 0) {
    const hit = hits[0];
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const point = hit.point.clone().add(normal.multiplyScalar(GRID / 2));
    const gx = clampCell(Math.round(point.x / GRID));
    const gy = clampCell(Math.round(point.y / GRID));
    const gz = clampCell(Math.round(point.z / GRID));
    const key = `${gx},${gy},${gz}`;

    ghostCell = { gx, gy, gz, key };
    ghostGroup.position.set(gx * GRID, gy * GRID, gz * GRID);
    ghostGroup.visible = !occupied.has(key);
  }
}

function placeBlock() {
  if (selectedType === null) return;
  if (!ghostCell || occupied.has(ghostCell.key)) return;
  const { gx, gy, gz, key } = ghostCell;

  const mesh = createBlockMesh(selectedType);
  mesh.position.set(gx * GRID, gy * GRID, gz * GRID);
  applyRotationState(mesh, ghostRotation);
  editorScene.add(mesh);
  placedMeshes.push(mesh);
  occupied.add(key);

  shipBlocks.push({ type: selectedType, gx, gy, gz, rot: ghostRotation });
}

function trySelectBlock(clientX, clientY) {
  mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, editorCamera);

  const hits = raycaster.intersectObjects(placedMeshes, true);
  if (hits.length > 0) {
    const root = findBlockRoot(hits[0].object);
    const idx = placedMeshes.indexOf(root);
    if (idx !== -1) {
      selectBlock(idx);
      return;
    }
  }
  clearSelection();
}

function selectBlock(idx) {
  clearSelection();
  selectedBlockIndex = idx;
  highlightHelper = new THREE.BoxHelper(placedMeshes[idx], 0xffe14d);
  editorScene.add(highlightHelper);
}

function clearSelection() {
  if (highlightHelper) {
    editorScene.remove(highlightHelper);
    highlightHelper = null;
  }
  selectedBlockIndex = null;
}

function deleteSelectedBlock() {
  if (selectedBlockIndex === null) return;
  const mesh = placedMeshes[selectedBlockIndex];
  const block = shipBlocks[selectedBlockIndex];

  editorScene.remove(mesh);
  occupied.delete(`${block.gx},${block.gy},${block.gz}`);
  placedMeshes.splice(selectedBlockIndex, 1);
  shipBlocks.splice(selectedBlockIndex, 1);

  clearSelection();
}

function loadEditorFromShipBlocks() {
  for (const m of placedMeshes) editorScene.remove(m);
  placedMeshes.length = 0;
  occupied.clear();
  clearSelection();

  for (const b of shipBlocks) {
    const mesh = createBlockMesh(b.type);
    mesh.position.set(b.gx * GRID, b.gy * GRID, b.gz * GRID);
    applyRotationState(mesh, b.rot);
    editorScene.add(mesh);
    placedMeshes.push(mesh);
    occupied.add(`${b.gx},${b.gy},${b.gz}`);
  }
}

let editorYaw = 0.8, editorPitch = 0.4, editorDist = 60;
const EDITOR_ZOOM_MIN = 15, EDITOR_ZOOM_MAX = 200;

function updateEditorCamera() {
  const offset = new THREE.Vector3(
    Math.sin(editorYaw) * Math.cos(editorPitch),
    Math.sin(editorPitch),
    Math.cos(editorYaw) * Math.cos(editorPitch)
  ).multiplyScalar(editorDist);
  editorCamera.position.copy(offset);
  editorCamera.lookAt(0, 0, 0);
}

// ============================================================
// PLAYER HEALTH
// ============================================================
let playerMaxHp = 100;
let playerHp = 100;
const centerHudEl = document.getElementById("center-hud");
const healthHudEl = document.getElementById("health-hud");
const healthFillEl = document.getElementById("health-fill");
const healthTextEl = document.getElementById("health-text");
const boostFillEl = document.getElementById("boost-fill");
const boostTextEl = document.getElementById("boost-text");
const targetReadoutEl = document.getElementById("target-readout");
const crosshairEl = document.getElementById("crosshair");

function refreshPlayerMaxHealth(resetCurrent) {
  playerMaxHp = computeHullHpFromBlocks(shipBlocks);
  if (resetCurrent || playerHp > playerMaxHp) playerHp = playerMaxHp;
  updateHealthHud();
}

function damagePlayer(amount) {
  playerHp = Math.max(0, playerHp - amount);
  updateHealthHud();
  if (playerHp <= 0) {
    // Soft respawn near origin
    ship.position.set(0, 0, 0);
    playerHp = playerMaxHp;
    clearTargetLock();
    updateHealthHud();
  }
}

function updateHealthHud() {
  const pct = playerMaxHp > 0 ? (playerHp / playerMaxHp) * 100 : 0;
  healthFillEl.style.width = pct + "%";
  healthTextEl.textContent = `${Math.ceil(playerHp)} / ${playerMaxHp}`;
  healthHudEl.classList.toggle("low", pct <= 30);
}

function updateBoostHud() {
  // Map 1x..3x onto the bar
  const pct = ((boostFactor - 1) / (BOOST_MAX - 1)) * 100;
  boostFillEl.style.width = Math.max(4, pct) + "%";
  boostTextEl.textContent = `${boostFactor.toFixed(1)}x`;
}

// Shift spool boost (1x → 3x)
let boostFactor = 1.0;
const BOOST_MAX = 3;
const BOOST_RAMP_UP = 0.018;
const BOOST_RAMP_DOWN = 0.028;
const baseMoveSpeed = 1.0;
const turnLerp = 0.12;
const tempFacingObj = new THREE.Object3D();

refreshPlayerMaxHealth(true);
updateBoostHud();

function healPlayer(amount) {
  playerHp = Math.min(playerMaxHp, playerHp + amount);
  updateHealthHud();
}

function healMissingPercent(pct) {
  const missing = playerMaxHp - playerHp;
  if (missing <= 0) return 0;
  const heal = missing * pct;
  healPlayer(heal);
  return heal;
}

// ============================================================
// CARGO / RESOURCES
// ============================================================
const inventory = {
  iron: 0,
  oil: 0,
  plasma_crystal: 0,
  void_ice: 0,
  stardust: 0
};
const cargoHudEl = document.getElementById("cargo-hud");
const cargoListEl = document.getElementById("cargo-list");
const miningStatusEl = document.getElementById("mining-status");

function getCargoCapacity() {
  let cap = 200;
  for (const b of shipBlocks) {
    const def = blockTypeById(b.type);
    if (def && def.cargoBonus) cap += def.cargoBonus;
  }
  return cap;
}

function getCargoUsed() {
  return Object.values(inventory).reduce((a, b) => a + b, 0);
}

function getCargoFree() {
  return Math.max(0, getCargoCapacity() - getCargoUsed());
}

function resourceById(id) {
  return RESOURCES.find(r => r.id === id);
}

function updateCargoHud() {
  if (!cargoListEl) return;
  const used = getCargoUsed();
  const cap = getCargoCapacity();
  let html = `<div class="panel-title">Cargo Hold</div><div class="cargo-cap">${used.toFixed(0)} / ${cap}</div>`;
  for (const r of RESOURCES) {
    const amt = inventory[r.id] || 0;
    html += `<div class="cargo-row"><span class="dot" style="background:${r.color}"></span>${r.label}<span class="amt">${amt.toFixed(0)}</span></div>`;
  }
  cargoListEl.innerHTML = html;
}

updateCargoHud();

// ============================================================
// MINING
// Tap M = focus camera on nearest moon
// Hold M = auto-approach, then mine until depleted (cannot cancel)
// ============================================================
let miningPhase = "idle"; // idle | focused | approaching | mining
let miningMoon = null;
let mKeyDownAt = 0;
const _moonWorld = new THREE.Vector3();
const _laserFrom = new THREE.Vector3();
const _laserTo = new THREE.Vector3();
const _laserDir = new THREE.Vector3();
const _laserUp = new THREE.Vector3(0, 1, 0);
const MINE_RANGE_PAD = 40;
const M_HOLD_MS = 200;
const APPROACH_SPEED_MULT = 1.35;

const miningLaserBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.45, 0.25, 1, 10),
  new THREE.MeshBasicMaterial({
    color: 0x66f0ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  })
);
miningLaserBeam.visible = false;
scene.add(miningLaserBeam);

const miningLaserGlow = new THREE.Mesh(
  new THREE.CylinderGeometry(0.9, 0.55, 1, 10),
  new THREE.MeshBasicMaterial({
    color: 0x33aaff,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  })
);
miningLaserGlow.visible = false;
scene.add(miningLaserGlow);

function hasMiningGear() {
  return shipBlocks.some(b => isMiningTool(b.type));
}

function hasMiningLaser() {
  return shipBlocks.some(b => b.type === "mining_laser");
}

function getMiningRate() {
  let rate = 0;
  for (const b of shipBlocks) {
    const def = blockTypeById(b.type);
    if (def && def.mineRate) rate += def.mineRate;
  }
  return rate;
}

function setMiningStatus(text, active) {
  if (!miningStatusEl) return;
  miningStatusEl.textContent = text;
  miningStatusEl.classList.toggle("active", !!active);
}

function findNearestMoon() {
  let best = null;
  let bestDist = Infinity;
  for (const moon of moons) {
    if (!moon.active || moon.remaining <= 0) continue;
    getMoonWorldPos(moon, _moonWorld);
    const dist = ship.position.distanceTo(_moonWorld);
    if (dist < bestDist) {
      bestDist = dist;
      best = moon;
    }
  }
  return best;
}

function hideMiningLaser() {
  miningLaserBeam.visible = false;
  miningLaserGlow.visible = false;
}

function updateMiningLaserVisual() {
  if (miningPhase !== "mining" || !miningMoon || !miningMoon.active || !hasMiningLaser()) {
    hideMiningLaser();
    return;
  }

  getMoonWorldPos(miningMoon, _laserTo);
  _laserFrom.copy(ship.position);
  _laserDir.subVectors(_laserTo, _laserFrom);
  const dist = _laserDir.length();
  if (dist < 0.1) {
    hideMiningLaser();
    return;
  }
  _laserDir.multiplyScalar(1 / dist);

  const mid = _laserFrom.clone().addScaledVector(_laserDir, dist * 0.5);
  miningLaserBeam.position.copy(mid);
  miningLaserGlow.position.copy(mid);
  miningLaserBeam.scale.set(1, dist, 1);
  miningLaserGlow.scale.set(1, dist, 1);
  miningLaserBeam.quaternion.setFromUnitVectors(_laserUp, _laserDir);
  miningLaserGlow.quaternion.copy(miningLaserBeam.quaternion);
  miningLaserBeam.visible = true;
  miningLaserGlow.visible = true;
}

function stopMining(reason) {
  miningPhase = "idle";
  miningMoon = null;
  hideMiningLaser();
  setMiningStatus(reason || "Tap M to focus nearest moon · hold M to approach", false);
}

function beginMining(moon) {
  if (!hasMiningGear()) {
    setMiningStatus("Need a Mining Drill or Mining Laser", false);
    miningPhase = "idle";
    miningMoon = null;
    return;
  }
  miningPhase = "mining";
  miningMoon = moon;
  const res = resourceById(moon.resourceId);
  setMiningStatus(`Mining ${moon.name} · ${res ? res.label : moon.resourceId} — locked until empty`, true);
}

function onMiningKeyDown() {
  // Once mining has started, M does nothing (cannot cancel)
  if (miningPhase === "mining") return;

  const moon = findNearestMoon();
  if (!moon) {
    setMiningStatus("No active moons available", false);
    return;
  }

  miningMoon = moon;
  miningPhase = "focused";
  mKeyDownAt = performance.now();
  getMoonWorldPos(moon, _moonWorld);
  aimCameraAtWorldPoint(_moonWorld);
  const res = resourceById(moon.resourceId);
  setMiningStatus(
    `Focused ${moon.name} (${res ? res.label : ""}) — hold M to approach`,
    true
  );
}

function onMiningKeyUp() {
  // If already mining, ignore release — stay locked until depleted
  if (miningPhase === "mining") return;

  // Tap-only or aborted approach
  if (miningPhase === "focused" || miningPhase === "approaching") {
    miningPhase = "idle";
    miningMoon = null;
    hideMiningLaser();
    setMiningStatus("Tap M to focus nearest moon · hold M to approach", false);
  }
}

function updateMining() {
  // Keep camera on target moon while focusing / approaching / mining
  if (miningMoon && miningMoon.active && (miningPhase === "focused" || miningPhase === "approaching" || miningPhase === "mining")) {
    getMoonWorldPos(miningMoon, _moonWorld);
    aimCameraAtWorldPoint(_moonWorld);
  }

  // Hold M after tap → start auto-approach
  if (miningPhase === "focused" && keys["m"] && (performance.now() - mKeyDownAt) >= M_HOLD_MS) {
    if (!hasMiningGear()) {
      setMiningStatus("Need a Mining Drill or Mining Laser to approach", false);
    } else {
      miningPhase = "approaching";
      setMiningStatus(`Approaching ${miningMoon.name}…`, true);
    }
  }

  if (miningPhase === "approaching" && miningMoon) {
    if (!miningMoon.active || miningMoon.remaining <= 0) {
      stopMining("Target moon vanished");
      return;
    }
    if (!keys["m"]) {
      // released before mining started — cancel approach
      onMiningKeyUp();
      return;
    }

    getMoonWorldPos(miningMoon, _moonWorld);
    const toMoon = _moonWorld.clone().sub(ship.position);
    const dist = toMoon.length();
    const stopDist = getMoonEffectiveRadius(miningMoon) + 24;

    if (dist > stopDist) {
      toMoon.normalize();
      const speed = getCurrentMoveSpeed() * APPROACH_SPEED_MULT;
      ship.position.addScaledVector(toMoon, Math.min(speed, dist - stopDist));
      tempFacingObj.position.copy(ship.position);
      tempFacingObj.lookAt(_moonWorld);
      ship.quaternion.slerp(tempFacingObj.quaternion, 0.18);
    } else {
      beginMining(miningMoon);
    }
  }

  if (miningPhase === "mining" && miningMoon) {
    if (!hasMiningGear()) {
      // Gear removed mid-mine — still finish? User said doesn't stop until depleted.
      // Keep following/depleting at a tiny base rate so lock still ends.
    }
    if (!miningMoon.active) {
      stopMining("Moon depleted");
      return;
    }

    getMoonWorldPos(miningMoon, _moonWorld);
    let away = ship.position.clone().sub(_moonWorld);
    if (away.lengthSq() < 0.01) away.set(1, 0.2, 0);
    away.normalize();
    const followDist = getMoonEffectiveRadius(miningMoon) + 22;
    const desired = _moonWorld.clone().add(away.multiplyScalar(followDist));
    ship.position.lerp(desired, 0.2);

    tempFacingObj.position.copy(ship.position);
    tempFacingObj.lookAt(_moonWorld);
    ship.quaternion.slerp(tempFacingObj.quaternion, 0.22);

    const rate = Math.max(0.4, getMiningRate());
    const free = getCargoFree();
    const take = Math.min(rate, miningMoon.remaining);
    const stored = Math.min(take, free);
    if (stored > 0) {
      inventory[miningMoon.resourceId] = (inventory[miningMoon.resourceId] || 0) + stored;
      updateCargoHud();
    }
    // Always deplete moon while mining (overflow is lost if cargo full)
    miningMoon.remaining = Math.max(0, miningMoon.remaining - take);
    updateMoonScale(miningMoon);

    const res = resourceById(miningMoon.resourceId);
    setMiningStatus(
      `Mining ${miningMoon.name} · ${res ? res.label : ""} · ${miningMoon.remaining.toFixed(0)} left`,
      true
    );

    if (miningMoon.remaining <= 0) {
      const name = miningMoon.name;
      despawnMoon(miningMoon);
      stopMining(`${name} depleted — respawns in 30s`);
      return;
    }
  }

  updateMiningLaserVisual();
}

// ============================================================
// PvE HEALING CRATES
// ============================================================
const healCrates = [];
const MAX_HEAL_CRATES = 6;
const HEAL_CRATE_PICKUP_RANGE = 14;

function makeHealCrateMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(6, 6, 6),
    new THREE.MeshStandardMaterial({
      color: 0x1a8f6a,
      emissive: 0x0d5c44,
      emissiveIntensity: 0.45,
      metalness: 0.3,
      roughness: 0.4
    })
  );
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.2), new THREE.MeshBasicMaterial({ color: 0x7dffc4 }));
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x7dffc4 }));
  g.add(box, crossV, crossH);
  return g;
}

function spawnHealCrate() {
  const mesh = makeHealCrateMesh();
  const angle = Math.random() * Math.PI * 2;
  const dist = 120 + Math.random() * 400;
  mesh.position.set(
    Math.cos(angle) * dist + (Math.random() - 0.5) * 80,
    (Math.random() - 0.5) * 120,
    Math.sin(angle) * dist + (Math.random() - 0.5) * 80
  );
  mesh.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(mesh);
  healCrates.push({
    mesh,
    spin: new THREE.Vector3(
      0.01 + Math.random() * 0.02,
      0.012 + Math.random() * 0.02,
      0.008 + Math.random() * 0.015
    )
  });
}

function clearHealCrates() {
  for (const c of healCrates) scene.remove(c.mesh);
  healCrates.length = 0;
}

function ensureHealCrates() {
  while (healCrates.length < MAX_HEAL_CRATES) spawnHealCrate();
}

function updateHealCrates() {
  if (!pveEnabled) return;
  ensureHealCrates();

  for (let i = healCrates.length - 1; i >= 0; i--) {
    const c = healCrates[i];
    c.mesh.rotation.x += c.spin.x;
    c.mesh.rotation.y += c.spin.y;
    c.mesh.rotation.z += c.spin.z;

    if (c.mesh.position.distanceTo(ship.position) < HEAL_CRATE_PICKUP_RANGE) {
      healMissingPercent(0.25);
      scene.remove(c.mesh);
      healCrates.splice(i, 1);
      // Respawn elsewhere shortly by ensuring count next frames
    }
  }
}

// ============================================================
// PvE — ENEMY PRESETS + SPAWNING
// ============================================================
const MAX_ENEMIES = 2;
let pveEnabled = false;
const enemies = [];

// Presets use only editor block types.
const ENEMY_PRESETS = [
  {
    name: "Scout Drone",
    maxHp: 45,
    speed: 0.35,
    fireCooldown: 90,
    weaponDamage: 4,
    blocks: [
      { type: "cube", gx: 0, gy: 0, gz: 0, rot: 0 },
      { type: "cone", gx: 0, gy: 0, gz: -1, rot: 0 },
      { type: "engine", gx: 0, gy: 0, gz: 1, rot: 0 },
      { type: "weapon", gx: 0, gy: 0, gz: -2, rot: 0 }
    ]
  },
  {
    name: "Wedge Fighter",
    maxHp: 60,
    speed: 0.28,
    fireCooldown: 75,
    weaponDamage: 5,
    blocks: [
      { type: "cube", gx: 0, gy: 0, gz: 0, rot: 0 },
      { type: "pyramid", gx: -1, gy: 0, gz: 0, rot: 0 },
      { type: "pyramid", gx: 1, gy: 0, gz: 0, rot: 0 },
      { type: "cone", gx: 0, gy: 0, gz: -1, rot: 0 },
      { type: "engine", gx: 0, gy: 0, gz: 1, rot: 0 },
      { type: "pulse_cannon", gx: 0, gy: 1, gz: 0, rot: 0 }
    ]
  },
  {
    name: "Cargo Raider",
    maxHp: 75,
    speed: 0.22,
    fireCooldown: 100,
    weaponDamage: 6,
    blocks: [
      { type: "cargo", gx: 0, gy: 0, gz: 0, rot: 0 },
      { type: "armor", gx: 0, gy: 0, gz: -1, rot: 0 },
      { type: "armor", gx: 0, gy: 0, gz: 1, rot: 0 },
      { type: "cylinder", gx: -1, gy: 0, gz: 0, rot: 0 },
      { type: "cylinder", gx: 1, gy: 0, gz: 0, rot: 0 },
      { type: "boost_engine", gx: 0, gy: 0, gz: 2, rot: 0 },
      { type: "scatter_blaster", gx: 0, gy: 0, gz: -2, rot: 0 }
    ]
  },
  {
    name: "Needle Interceptor",
    maxHp: 40,
    speed: 0.42,
    fireCooldown: 65,
    weaponDamage: 3,
    blocks: [
      { type: "cylinder", gx: 0, gy: 0, gz: 0, rot: 0 },
      { type: "cone", gx: 0, gy: 0, gz: -1, rot: 0 },
      { type: "fin", gx: -1, gy: 0, gz: 0, rot: 0 },
      { type: "fin", gx: 1, gy: 0, gz: 0, rot: 0 },
      { type: "engine", gx: 0, gy: 0, gz: 1, rot: 0 },
      { type: "rail_gun", gx: 0, gy: 0, gz: -2, rot: 0 }
    ]
  }
];

const pveToggleBtn = document.getElementById("pve-toggle");
const pveLabelEl = document.getElementById("pve-label");
const pveStatusEl = document.getElementById("pve-status");

function updatePveUi() {
  pveToggleBtn.classList.toggle("on", pveEnabled);
  pveToggleBtn.setAttribute("aria-pressed", pveEnabled ? "true" : "false");
  pveLabelEl.textContent = pveEnabled ? "PvE Online" : "PvE Offline";
  if (!pveEnabled) {
    pveStatusEl.textContent = "Sector clear";
  } else {
    pveStatusEl.textContent = `Hostiles: ${enemies.length} / ${MAX_ENEMIES}`;
  }
}

function buildShipGroupFromBlocks(blocks) {
  const group = new THREE.Group();
  for (const b of blocks) {
    const mesh = createBlockMesh(b.type);
    mesh.position.set(b.gx * GRID, b.gy * GRID, b.gz * GRID);
    applyRotationState(mesh, b.rot || 0);
    group.add(mesh);
  }
  return group;
}

function createEnemyHealthBar() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 16;
  const tex = new THREE.CanvasTexture(canvas);
  const matSprite = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(matSprite);
  sprite.scale.set(12, 1.5, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = canvas.getContext("2d");
  sprite.userData.tex = tex;
  return sprite;
}

function drawEnemyHealthBar(sprite, hp, maxHp) {
  const ctx = sprite.userData.ctx;
  const canvas = sprite.userData.canvas;
  const pct = Math.max(0, hp / maxHp);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = pct > 0.35 ? "#3cf0c5" : "#e64545";
  ctx.fillRect(2, 2, (canvas.width - 4) * pct, canvas.height - 4);
  sprite.userData.tex.needsUpdate = true;
}

function randomSpawnOffset() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 80 + Math.random() * 60;
  return new THREE.Vector3(
    Math.cos(angle) * dist,
    (Math.random() - 0.5) * 30,
    Math.sin(angle) * dist
  );
}

function spawnEnemy() {
  if (enemies.length >= MAX_ENEMIES) return;

  const preset = ENEMY_PRESETS[Math.floor(Math.random() * ENEMY_PRESETS.length)];
  const group = buildShipGroupFromBlocks(preset.blocks);
  const offset = randomSpawnOffset();
  group.position.copy(ship.position).add(offset);

  // Face roughly toward player
  group.lookAt(ship.position);

  const hpBar = createEnemyHealthBar();
  hpBar.position.y = 10;
  group.add(hpBar);
  drawEnemyHealthBar(hpBar, preset.maxHp, preset.maxHp);

  scene.add(group);

  enemies.push({
    group,
    hpBar,
    blocks: preset.blocks,
    name: preset.name,
    maxHp: preset.maxHp,
    hp: preset.maxHp,
    speed: preset.speed,
    fireCooldown: preset.fireCooldown,
    fireTimer: Math.floor(Math.random() * preset.fireCooldown),
    weaponDamage: preset.weaponDamage,
    radius: 8
  });
  updatePveUi();
}

function destroyEnemy(index) {
  const enemy = enemies[index];
  if (!enemy) return;
  if (lockedEnemy === enemy) clearTargetLock();
  scene.remove(enemy.group);
  enemies.splice(index, 1);
  updatePveUi();
}

function clearAllEnemies() {
  clearTargetLock();
  for (let i = enemies.length - 1; i >= 0; i--) {
    scene.remove(enemies[i].group);
  }
  enemies.length = 0;
  updatePveUi();
}

function setPveEnabled(on) {
  pveEnabled = on;
  if (!pveEnabled) {
    clearAllEnemies();
    clearHealCrates();
  } else {
    while (enemies.length < MAX_ENEMIES) spawnEnemy();
    ensureHealCrates();
  }
  updatePveUi();
}

// ============================================================
// TARGET LOCK ("T" — closest enemy)
// ============================================================
let lockedEnemy = null;
let targetHighlight = null;
const TARGET_EMISSIVE = 0xff1a1a;

function clearTargetLock() {
  if (lockedEnemy && lockedEnemy._savedMats) {
    for (const entry of lockedEnemy._savedMats) {
      if (entry.mat) {
        entry.mat.emissive.copy(entry.emissive);
        entry.mat.emissiveIntensity = entry.intensity;
      }
    }
    lockedEnemy._savedMats = null;
  }
  if (targetHighlight) {
    scene.remove(targetHighlight);
    targetHighlight.dispose && targetHighlight.dispose();
    targetHighlight = null;
  }
  lockedEnemy = null;
  if (targetReadoutEl) {
    targetReadoutEl.textContent = "No target lock — press T";
    targetReadoutEl.classList.remove("locked");
  }
}

function findClosestEnemy() {
  let best = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    const d = ship.position.distanceToSquared(e.group.position);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

function aimCameraAtWorldPoint(worldPos) {
  const dir = new THREE.Vector3().subVectors(worldPos, ship.position);
  if (dir.lengthSq() < 0.0001) return;
  dir.normalize();
  camPitch = Math.asin(Math.max(-1, Math.min(1, -dir.y)));
  camYaw = Math.atan2(-dir.x, -dir.z);
}

function applyRedTargetHighlight(enemy) {
  enemy._savedMats = [];
  enemy.group.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m.emissive) continue;
      enemy._savedMats.push({
        mat: m,
        emissive: m.emissive.clone(),
        intensity: m.emissiveIntensity != null ? m.emissiveIntensity : 0
      });
      m.emissive.setHex(TARGET_EMISSIVE);
      m.emissiveIntensity = 0.85;
    }
  });
}

function lockClosestTarget() {
  if (editorOpen || !pveEnabled || enemies.length === 0) {
    if (targetReadoutEl) {
      targetReadoutEl.textContent = pveEnabled ? "No hostiles in range" : "Enable PvE to lock targets";
      targetReadoutEl.classList.remove("locked");
    }
    return;
  }

  clearTargetLock();
  const enemy = findClosestEnemy();
  if (!enemy) return;

  lockedEnemy = enemy;
  applyRedTargetHighlight(enemy);

  targetHighlight = new THREE.BoxHelper(enemy.group, 0xff2222);
  scene.add(targetHighlight);

  aimCameraAtWorldPoint(enemy.group.position);

  tempFacingObj.position.copy(ship.position);
  tempFacingObj.lookAt(enemy.group.position);
  ship.quaternion.copy(tempFacingObj.quaternion);

  const dist = ship.position.distanceTo(enemy.group.position);
  if (targetReadoutEl) {
    targetReadoutEl.textContent = `LOCKED · ${enemy.name} · ${dist.toFixed(0)}u`;
    targetReadoutEl.classList.add("locked");
  }
}

function updateTargetLock() {
  if (!lockedEnemy) return;
  if (!enemies.includes(lockedEnemy)) {
    clearTargetLock();
    return;
  }
  if (targetHighlight) targetHighlight.update();
  const dist = ship.position.distanceTo(lockedEnemy.group.position);
  if (targetReadoutEl) {
    targetReadoutEl.textContent = `LOCKED · ${lockedEnemy.name} · ${dist.toFixed(0)}u`;
  }
}

pveToggleBtn.addEventListener("click", () => {
  setPveEnabled(!pveEnabled);
});

function updateEnemies() {
  if (!pveEnabled) return;

  // Maintain two alive enemies
  while (enemies.length < MAX_ENEMIES) spawnEnemy();

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const toPlayer = new THREE.Vector3().subVectors(ship.position, e.group.position);
    const dist = toPlayer.length();

    if (dist > 1) {
      toPlayer.normalize();
      e.group.position.addScaledVector(toPlayer, e.speed);

      // Gentle turn toward player
      const target = e.group.position.clone().add(toPlayer);
      const tmp = new THREE.Object3D();
      tmp.position.copy(e.group.position);
      tmp.lookAt(target);
      e.group.quaternion.slerp(tmp.quaternion, 0.05);
    }

    // Keep HP bar upright toward camera
    e.hpBar.quaternion.copy(camera.quaternion);

    e.fireTimer--;
    if (e.fireTimer <= 0 && dist < 180) {
      e.fireTimer = e.fireCooldown;
      fireEnemyShot(e);
    }
  }
}

function fireEnemyShot(enemy) {
  const dir = new THREE.Vector3().subVectors(ship.position, enemy.group.position).normalize();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4444 })
  );
  mesh.position.copy(enemy.group.position);
  scene.add(mesh);
  projectiles.push({
    mesh,
    velocity: dir.multiplyScalar(4.5),
    life: 80,
    damage: enemy.weaponDamage,
    fromEnemy: true,
    hitRadius: 4
  });
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  drawEnemyHealthBar(enemy.hpBar, enemy.hp, enemy.maxHp);
  if (enemy.hp <= 0) {
    const idx = enemies.indexOf(enemy);
    if (idx !== -1) destroyEnemy(idx);
  }
}

// ============================================================
// INPUT
// ============================================================
const keys = {};
let editorOpen = false;
let dragging = false;
let mouseLocked = false;
let lastX = 0, lastY = 0;

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (e.key === "Shift") keys["shift"] = true;

  if (k === "e" && !e.repeat) {
    if (miningPhase === "mining") return; // locked until moon depleted
    toggleEditor();
  }
  if (k === "c" && !e.repeat && !editorOpen) toggleMouseLock();
  if (k === "f" && !e.repeat && !editorOpen) fireWeapons();
  if (k === "t" && !e.repeat && !editorOpen) lockClosestTarget();
  if (k === "m" && !e.repeat && !editorOpen) onMiningKeyDown();

  if (editorOpen) {
    if (k === "r" && !e.repeat) {
      ghostRotation = (ghostRotation + 1) % ROTATION_STATES.length;
      rebuildGhostMesh();
    }
    if (k === "q" && !e.repeat) deselectPlacingBlock();
    if (k === "x" && !e.repeat) deleteSelectedBlock();
  }
});
window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = false;
  if (e.key === "Shift") keys["shift"] = false;
  if (k === "m" && !editorOpen) onMiningKeyUp();
});

function toggleEditor() {
  editorOpen = !editorOpen;

  const editorUiEl = document.getElementById("editor-ui");
  const editorTitleEl = document.getElementById("editor-title");
  const controlsBoxEl = document.getElementById("controls-box");
  const pveBoxEl = document.getElementById("pve-box");
  if (!editorUiEl || !editorTitleEl || !controlsBoxEl) {
    console.error("Editor UI elements not found - check index.html has #editor-ui, #editor-title, #controls-box");
    return;
  }

  editorUiEl.style.display = editorOpen ? "block" : "none";
  editorTitleEl.style.display = editorOpen ? "block" : "none";
  controlsBoxEl.style.display = editorOpen ? "none" : "block";
  if (pveBoxEl) pveBoxEl.style.display = editorOpen ? "none" : "block";
  if (centerHudEl) centerHudEl.style.display = editorOpen ? "none" : "block";
  if (crosshairEl) crosshairEl.style.display = editorOpen ? "none" : "block";
  if (cargoHudEl) cargoHudEl.style.display = editorOpen ? "none" : "block";

  if (editorOpen) {
    if (mouseLocked) document.exitPointerLock();
    if (miningPhase === "approaching" || miningPhase === "focused") stopMining("Editor opened");
    loadEditorFromShipBlocks();
    updateEditorCamera();
  } else {
    clearSelection();
    rebuildShipFromBlocks();
    updateCargoHud();
  }
}

window.addEventListener("mousedown", (e) => {
  if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
  if (editorOpen && e.button === 0) {
    if (selectedType !== null) {
      placeBlock();
    } else {
      trySelectBlock(e.clientX, e.clientY);
    }
  }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 2) dragging = false;
});
window.addEventListener("contextmenu", (e) => e.preventDefault());

const FLIGHT_ZOOM_MIN = 12, FLIGHT_ZOOM_MAX = 250;
window.addEventListener("wheel", (e) => {
  const zoomStep = e.deltaY * 0.05;
  if (editorOpen) {
    editorDist = Math.max(EDITOR_ZOOM_MIN, Math.min(EDITOR_ZOOM_MAX, editorDist + zoomStep));
  } else {
    camDistance = Math.max(FLIGHT_ZOOM_MIN, Math.min(FLIGHT_ZOOM_MAX, camDistance + zoomStep));
  }
}, { passive: true });

function toggleMouseLock() {
  if (!mouseLocked) {
    renderer.domElement.requestPointerLock().catch(() => {});
  } else {
    document.exitPointerLock();
  }
}
document.addEventListener("pointerlockchange", () => {
  mouseLocked = document.pointerLockElement === renderer.domElement;
});

window.addEventListener("mousemove", (e) => {
  if (editorOpen) {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      editorYaw -= dx * 0.006;
      editorPitch = Math.max(-1.3, Math.min(1.3, editorPitch + dy * 0.006));
    }
    updateGhost(e.clientX, e.clientY);
    return;
  }

  let dx, dy;
  if (mouseLocked) {
    dx = e.movementX;
    dy = e.movementY;
  } else if (dragging) {
    dx = e.clientX - lastX;
    dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  } else {
    return;
  }

  camYaw -= dx * 0.005;
  camPitch += dy * 0.005;
  camPitch = Math.max(-1.4, Math.min(1.4, camPitch));
});

// ============================================================
// FLIGHT MOVEMENT + CAMERA
// ============================================================
let camDistance = 40;
let camYaw = 0;
let camPitch = 0.3;

function getCameraForward() {
  return new THREE.Vector3(
    -Math.sin(camYaw) * Math.cos(camPitch),
    -Math.sin(camPitch),
    -Math.cos(camYaw) * Math.cos(camPitch)
  ).normalize();
}

function getShipForward() {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
}

function updateBoostFactor() {
  if (keys["shift"]) {
    boostFactor = Math.min(BOOST_MAX, boostFactor + BOOST_RAMP_UP);
  } else {
    boostFactor = Math.max(1, boostFactor - BOOST_RAMP_DOWN);
  }
  updateBoostHud();
}

function getCurrentMoveSpeed() {
  return baseMoveSpeed * getTopSpeedMultiplier() * boostFactor;
}

function updateMovement() {
  updateBoostFactor();
  if (miningPhase === "mining" || miningPhase === "approaching") return;

  const moveSpeed = getCurrentMoveSpeed();
  const forward = getCameraForward();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();

  const moveVec = new THREE.Vector3();
  if (keys["w"]) moveVec.add(forward);
  if (keys["s"]) moveVec.addScaledVector(forward, -1);
  if (keys["a"]) moveVec.addScaledVector(right, -1);
  if (keys["d"]) moveVec.add(right);

  if (moveVec.lengthSq() > 0) {
    moveVec.normalize().multiplyScalar(moveSpeed);
    ship.position.add(moveVec);

    const targetDir = mouseLocked ? forward : moveVec.clone().normalize();

    tempFacingObj.position.copy(ship.position);
    tempFacingObj.lookAt(ship.position.clone().add(targetDir));
    ship.quaternion.slerp(tempFacingObj.quaternion, turnLerp);
  }
}

function updateCamera() {
  const offset = new THREE.Vector3(
    Math.sin(camYaw) * Math.cos(camPitch),
    Math.sin(camPitch),
    Math.cos(camYaw) * Math.cos(camPitch)
  ).multiplyScalar(camDistance);

  camera.position.copy(ship.position).add(offset);
  camera.lookAt(ship.position);
}

// ============================================================
// WEAPONS ("F" to fire)
// Each weapon fires along the direction IT is actually facing -
// combining its own block rotation with the ship's current orientation.
// ============================================================
const projectiles = [];

function getWeaponWorldDirection(ownerQuaternion, block) {
  const r = ROTATION_STATES[block.rot];
  const localDir = new THREE.Vector3(0, 0, -1);
  localDir.applyEuler(new THREE.Euler(r.x, r.y, r.z));
  localDir.applyQuaternion(ownerQuaternion);
  return localDir.multiplyScalar(-1);
}

function spawnProjectile(origin, direction, def, fromEnemy) {
  const size = def.projectileSize || 0.5;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 8, 8),
    new THREE.MeshBasicMaterial({ color: def.projectileColor || 0xff5555 })
  );
  mesh.position.copy(origin);
  scene.add(mesh);

  projectiles.push({
    mesh,
    velocity: direction.clone().normalize().multiplyScalar(def.projectileSpeed || 6),
    life: def.projectileLife || 90,
    damage: def.damage || 8,
    fromEnemy: !!fromEnemy,
    hitRadius: Math.max(3.5, size * 6)
  });
}

function fireWeapons() {
  const weapons = getWeaponBlocks();
  if (weapons.length === 0) return;

  ship.updateMatrixWorld(true);

  for (const w of weapons) {
    const def = blockTypeById(w.type);
    if (!def) continue;

    const localPos = new THREE.Vector3(w.gx * GRID, w.gy * GRID, w.gz * GRID);
    const worldPos = localPos.applyMatrix4(ship.matrixWorld);
    const baseDir = getWeaponWorldDirection(ship.quaternion, w);

    const pellets = def.pellets || 1;
    const spread = def.spread || 0;

    for (let p = 0; p < pellets; p++) {
      const dir = baseDir.clone();
      if (spread > 0 && pellets > 1) {
        dir.x += (Math.random() - 0.5) * spread;
        dir.y += (Math.random() - 0.5) * spread;
        dir.z += (Math.random() - 0.5) * spread;
        dir.normalize();
      }
      spawnProjectile(worldPos, dir, def, false);
    }
  }
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.mesh.position.add(p.velocity);
    p.life--;

    let hit = false;

    if (p.fromEnemy) {
      if (p.mesh.position.distanceTo(ship.position) < (p.hitRadius || 4)) {
        damagePlayer(p.damage);
        hit = true;
      }
    } else if (pveEnabled) {
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (p.mesh.position.distanceTo(e.group.position) < (e.radius + (p.hitRadius || 3))) {
          damageEnemy(e, p.damage);
          hit = true;
          break;
        }
      }
    }

    if (hit || p.life <= 0) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }
}

// ============================================================
// MAIN LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);

  updateMoons();

  if (editorOpen) {
    updateEditorCamera();
    renderer.render(editorScene, editorCamera);
  } else {
    updateMovement();
    updateMining();
    updateCamera();
    updateEnemies();
    updateHealCrates();
    updateProjectiles();
    updateTargetLock();
    renderer.render(scene, camera);
  }
}
updatePveUi();
animate();
