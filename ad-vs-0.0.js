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

// --- Planets ---
function makePlanet(radius, color, position) {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat2 = new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat2);
  mesh.position.copy(position);
  scene.add(mesh);
  return mesh;
}
makePlanet(120, 0x4a7c59, new THREE.Vector3(700, 50, -400));
makePlanet(220, 0xc9a66b, new THREE.Vector3(-1000, -120, 800));
makePlanet(90,  0x6b8ec9, new THREE.Vector3(350, -220, 1000));
makePlanet(170, 0xb85c5c, new THREE.Vector3(-600, 320, -950));
makePlanet(140, 0x8a6bc9, new THREE.Vector3(1200, -80, 300));

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

// 9 rotation states: 4 flat spins (Y), tilt up/down (X), roll left/right (Z), and upside-down.
const ROTATION_STATES = [
  { x: 0, y: 0, z: 0 },                    // 0: default
  { x: 0, y: Math.PI / 2, z: 0 },          // 1: yaw 90
  { x: 0, y: Math.PI, z: 0 },              // 2: yaw 180
  { x: 0, y: (3 * Math.PI) / 2, z: 0 },    // 3: yaw 270
  { x: Math.PI / 2, y: 0, z: 0 },          // 4: tilt up
  { x: -Math.PI / 2, y: 0, z: 0 },         // 5: tilt down
  { x: 0, y: 0, z: Math.PI / 2 },          // 6: roll right
  { x: 0, y: 0, z: -Math.PI / 2 },         // 7: roll left
  { x: 0, y: 0, z: Math.PI }               // 8: upside down
];
function applyRotationState(obj, idx) {
  const r = ROTATION_STATES[idx];
  obj.rotation.set(r.x, r.y, r.z);
}

function mat(color) { return new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 }); }

// Shape-only group (no marker) - this is what's actually used for placed blocks & the flight ship.
function makeShapeGroup(shapeMesh) {
  const g = new THREE.Group();
  g.add(shapeMesh);
  return g;
}

const BLOCK_TYPES = [
  { id: "cube",     label: "Hull Cube",  color: 0x8fa3b8, markerOffset: -2.2, make: () => makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.6, 3.6), mat(0x8fa3b8))) },
  { id: "cone",     label: "Nose Cone",  color: 0x3cf0c5, markerOffset: -2.2, make: () => makeShapeGroup(new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.6, 12), mat(0x3cf0c5))) },
  { id: "sphere",   label: "Sphere Pod", color: 0xd7c15a, markerOffset: -2.2, make: () => makeShapeGroup(new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), mat(0xd7c15a))) },
  { id: "cylinder", label: "Cylinder",   color: 0xb0b0b0, markerOffset: -2.2, make: () => makeShapeGroup(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.6, 16), mat(0xb0b0b0))) },
  { id: "pyramid",  label: "Wing Wedge", color: 0x7a8ccf, markerOffset: -2.4, make: () => makeShapeGroup(new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.6, 4), mat(0x7a8ccf))) },
  { id: "engine",   label: "Engine",     color: 0xff8c3c, markerOffset: -2.2, make: () => makeShapeGroup(new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.6), mat(0xff8c3c))) },
  { id: "weapon",   label: "Weapon",     color: 0xe64545, markerOffset: -2.4, make: () => {
      const g = new THREE.CylinderGeometry(0.6, 0.6, 3.8, 10);
      g.rotateX(Math.PI / 2);
      return makeShapeGroup(new THREE.Mesh(g, mat(0xe64545)));
    } }
];
function blockTypeById(id) { return BLOCK_TYPES.find(b => b.id === id); }

// Real block instance - shape only, no marker. Used for placed blocks & the actual flight ship.
function createBlockMesh(typeId) {
  const group = blockTypeById(typeId).make();
  group.userData.isBlockRoot = true;
  return group;
}

// Ghost-only instance - shape PLUS a rotation marker, so you can see orientation while aiming.
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
    return;
  }
  for (const b of shipBlocks) {
    const mesh = createBlockMesh(b.type);
    mesh.position.set(b.gx * GRID, b.gy * GRID, b.gz * GRID);
    applyRotationState(mesh, b.rot);
    ship.add(mesh);
  }
}

function getEngineCount() {
  return shipBlocks.filter(b => b.type === "engine").length;
}
function getWeaponBlocks() {
  return shipBlocks.filter(b => b.type === "weapon");
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
BLOCK_TYPES.forEach(bt => {
  const btn = document.createElement("button");
  btn.className = "block-btn" + (bt.id === selectedType ? " selected" : "");
  btn.innerHTML = `<span class="swatch" style="background:#${bt.color.toString(16).padStart(6,"0")}"></span>${bt.label}`;
  btn.addEventListener("click", () => {
    document.querySelectorAll(".block-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    setSelectedType(bt.id);
  });
  blockListEl.appendChild(btn);
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

  if (k === "e" && !e.repeat) toggleEditor();
  if (k === "c" && !e.repeat && !editorOpen) toggleMouseLock();
  if (k === "f" && !e.repeat && !editorOpen) fireWeapons();

  if (editorOpen) {
    if (k === "r" && !e.repeat) {
      ghostRotation = (ghostRotation + 1) % ROTATION_STATES.length;
      rebuildGhostMesh();
    }
    if (k === "q" && !e.repeat) deselectPlacingBlock();
    if (k === "x" && !e.repeat) deleteSelectedBlock();
  }
});
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

function toggleEditor() {
  editorOpen = !editorOpen;

  const editorUiEl = document.getElementById("editor-ui");
  const editorTitleEl = document.getElementById("editor-title");
  const controlsBoxEl = document.getElementById("controls-box");
  if (!editorUiEl || !editorTitleEl || !controlsBoxEl) {
    console.error("Editor UI elements not found - check index.html has #editor-ui, #editor-title, #controls-box");
    return;
  }

  editorUiEl.style.display = editorOpen ? "block" : "none";
  editorTitleEl.style.display = editorOpen ? "block" : "none";
  controlsBoxEl.style.display = editorOpen ? "none" : "block";

  if (editorOpen) {
    if (mouseLocked) document.exitPointerLock();
    loadEditorFromShipBlocks();
    updateEditorCamera();
  } else {
    clearSelection();
    rebuildShipFromBlocks();
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
const baseMoveSpeed = 1.0;
const speedPerEnginePercent = 0.20;
const turnLerp = 0.12;
const tempFacingObj = new THREE.Object3D();

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

function getCurrentMoveSpeed() {
  const engineCount = getEngineCount();
  return baseMoveSpeed * (1 + speedPerEnginePercent * engineCount);
}

function updateMovement() {
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
// ============================================================
const projectiles = [];
const projectileSpeed = 6;
const projectileLife = 90;

function fireWeapons() {
  const weapons = getWeaponBlocks();
  if (weapons.length === 0) return;

  ship.updateMatrixWorld(true);
  const forward = getShipForward();

  for (const w of weapons) {
    const localPos = new THREE.Vector3(w.gx * GRID, w.gy * GRID, w.gz * GRID);
    const worldPos = localPos.applyMatrix4(ship.matrixWorld);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5555 })
    );
    mesh.position.copy(worldPos);
    scene.add(mesh);

    projectiles.push({
      mesh,
      velocity: forward.clone().multiplyScalar(-projectileSpeed),
      life: projectileLife
    });
  }
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.mesh.position.add(p.velocity);
    p.life--;
    if (p.life <= 0) {
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

  if (editorOpen) {
    updateEditorCamera();
    renderer.render(editorScene, editorCamera);
  } else {
    updateMovement();
    updateCamera();
    updateProjectiles();
    renderer.render(scene, camera);
  }
}
animate();
