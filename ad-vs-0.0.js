
[85 lines collapsed]

    pivot,
    mesh: moonMesh,
    radius: moonRadius,
    baseRadius: moonRadius,
    orbitRadius: opts.orbitRadius,
    orbitSpeed: opts.orbitSpeed,
    resourceId: opts.resourceId,
    maxResources: opts.maxResources,
    remaining: opts.maxResources,
    name: opts.name
    name: opts.name,
    respawnAt: 0,
    active: true
  };
  moons.push(moon);
  return moon;

[1 line collapsed]

const planetDefs = [
  { radius: 120, color: 0x4a7c59, pos: new THREE.Vector3(700, 50, -400),
    moon: { radius: 28, color: 0x9aa3ad, orbitRadius: 220, orbitSpeed: 0.0035, phase: 0.4, tilt: 0.15, resourceId: "iron", maxResources: 120, name: "Ferrum Moon" } },
    moon: { radius: 28, color: 0x9aa3ad, orbitRadius: 220, orbitSpeed: 0.0035, phase: 0.4, tilt: 0.15, resourceId: "iron", maxResources: 1400, name: "Ferrum Moon" } },
  { radius: 220, color: 0xc9a66b, pos: new THREE.Vector3(-1000, -120, 800),
    moon: { radius: 36, color: 0x5c4a32, orbitRadius: 340, orbitSpeed: 0.0022, phase: 1.2, tilt: -0.2, resourceId: "oil", maxResources: 100, name: "Tar Moon", emissive: 0x221100 } },
    moon: { radius: 36, color: 0x5c4a32, orbitRadius: 340, orbitSpeed: 0.0022, phase: 1.2, tilt: -0.2, resourceId: "oil", maxResources: 1600, name: "Tar Moon", emissive: 0x221100 } },
  { radius: 90,  color: 0x6b8ec9, pos: new THREE.Vector3(350, -220, 1000),
    moon: { radius: 22, color: 0x66e0ff, orbitRadius: 180, orbitSpeed: 0.0045, phase: 2.1, tilt: 0.35, resourceId: "plasma_crystal", maxResources: 80, name: "Crystal Moon", emissive: 0x114466 } },
    moon: { radius: 22, color: 0x66e0ff, orbitRadius: 180, orbitSpeed: 0.0045, phase: 2.1, tilt: 0.35, resourceId: "plasma_crystal", maxResources: 1200, name: "Crystal Moon", emissive: 0x114466 } },
  { radius: 170, color: 0xb85c5c, pos: new THREE.Vector3(-600, 320, -950),
    moon: { radius: 30, color: 0xcfe4ff, orbitRadius: 280, orbitSpeed: 0.0028, phase: 3.5, tilt: 0.1, resourceId: "void_ice", maxResources: 110, name: "Cryo Moon", emissive: 0x223355 } },
    moon: { radius: 30, color: 0xcfe4ff, orbitRadius: 280, orbitSpeed: 0.0028, phase: 3.5, tilt: 0.1, resourceId: "void_ice", maxResources: 1500, name: "Cryo Moon", emissive: 0x223355 } },
  { radius: 140, color: 0x8a6bc9, pos: new THREE.Vector3(1200, -80, 300),
    moon: { radius: 26, color: 0xffe6a0, orbitRadius: 250, orbitSpeed: 0.0038, phase: 5.0, tilt: -0.25, resourceId: "stardust", maxResources: 90, name: "Dust Moon", emissive: 0x443300 } }
    moon: { radius: 26, color: 0xffe6a0, orbitRadius: 250, orbitSpeed: 0.0038, phase: 5.0, tilt: -0.25, resourceId: "stardust", maxResources: 1300, name: "Dust Moon", emissive: 0x443300 } }
];
for (const def of planetDefs) {

[3 lines collapsed]

}
function updateMoons() {
  const now = performance.now();
  for (const m of moons) {
    m.pivot.rotation.y += m.orbitSpeed;
    m.mesh.rotation.y += 0.01;
    if (m.active) m.mesh.rotation.y += 0.01;
    if (!m.active && m.respawnAt && now >= m.respawnAt) {
      respawnMoon(m);
    }
  }
}

[1 line collapsed]

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

[192 lines collapsed]

  // --- Mining ---
  {
    id: "drill", label: "Mining Drill", category: "mining", color: 0xc4a574, markerOffset: -2.8, hp: 10,
    mineRate: 0.35, make: () => makeDrillBlock()
    mineRate: 1.8, make: () => makeDrillBlock()
  },
  {
    id: "mining_laser", label: "Mining Laser", category: "mining", color: 0x44ddff, markerOffset: -2.6, hp: 9,
    mineRate: 0.55, make: () => makeMiningLaser()
    mineRate: 3.2, make: () => makeMiningLaser()
  },
  {
    id: "ore_hold", label: "Ore Hold", category: "mining", color: 0x6b5744, markerOffset: -2.2, hp: 12,
    cargoBonus: 40, make: () => makeOreHold()
    cargoBonus: 120, make: () => makeOreHold()
  },
  // --- Weapons (unique stats) ---

[426 lines collapsed]

const miningStatusEl = document.getElementById("mining-status");
function getCargoCapacity() {
  let cap = 50;
  let cap = 200;
  for (const b of shipBlocks) {
    const def = blockTypeById(b.type);
    if (def && def.cargoBonus) cap += def.cargoBonus;

[29 lines collapsed]

// ============================================================
// MINING
// Tap M = focus camera on nearest moon
// Hold M = auto-approach, then mine until depleted (cannot cancel)
// ============================================================
let isMining = false;
let miningPhase = "idle"; // idle | focused | approaching | mining
let miningMoon = null;
let mKeyDownAt = 0;
const _moonWorld = new THREE.Vector3();
const MINE_RANGE_PAD = 35;
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

[3 lines collapsed]

  return rate;
}
function findNearestMineableMoon() {
function setMiningStatus(text, active) {
  if (!miningStatusEl) return;
  miningStatusEl.textContent = text;
  miningStatusEl.classList.toggle("active", !!active);
}
function findNearestMoon() {
  let best = null;
  let bestDist = Infinity;
  for (const moon of moons) {
    if (moon.remaining <= 0) continue;
    if (!moon.active || moon.remaining <= 0) continue;
    getMoonWorldPos(moon, _moonWorld);
    const dist = ship.position.distanceTo(_moonWorld) - moon.radius;
    const dist = ship.position.distanceTo(_moonWorld);
    if (dist < bestDist) {
      bestDist = dist;
      best = moon;
    }
  }
  if (!best || bestDist > MINE_RANGE_PAD) return null;
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
  isMining = false;
  miningPhase = "idle";
  miningMoon = null;
  if (miningStatusEl) {
    miningStatusEl.textContent = reason || "Mining idle — approach a moon & press M";
    miningStatusEl.classList.remove("active");
  }
  hideMiningLaser();
  setMiningStatus(reason || "Tap M to focus nearest moon · hold M to approach", false);
}
function startMining() {
function beginMining(moon) {
  if (!hasMiningGear()) {
    if (miningStatusEl) {
      miningStatusEl.textContent = "Need a Mining Drill or Mining Laser";
      miningStatusEl.classList.remove("active");
    }
    setMiningStatus("Need a Mining Drill or Mining Laser", false);
    miningPhase = "idle";
    miningMoon = null;
    return;
  }
  const moon = findNearestMineableMoon();
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
    if (miningStatusEl) {
      miningStatusEl.textContent = "No moon in range (or depleted)";
      miningStatusEl.classList.remove("active");
    }
    setMiningStatus("No active moons available", false);
    return;
  }
  if (getCargoFree() <= 0) {
    if (miningStatusEl) {
      miningStatusEl.textContent = "Cargo full — add Ore Holds";
      miningStatusEl.classList.remove("active");
    }
    return;
  }
  isMining = true;
