// ============================================================
// BASIC SCENE SETUP (flight)
// ============================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 8000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  editorCamera.aspect = window.innerWidth / window.innerHeight;
  editorCamera.updateProjectionMatrix();
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
  const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  scene.add(mesh);
  return mesh;
}
makePlanet(120, 0x4a7c59, new THREE.Vector3(700, 50, -400));
makePlanet(220, 0xc9a66b, new THREE.Vector3(-1000, -120, 800));
makePlanet(90,  0x6b8ec9, new THREE.Vector3(350, -220, 1000));
makePlanet(170, 0xb85c5c, new THREE.Vector3(-600, 320, -950));
makePlanet(140, 0x8a6bc9, new THREE.Vector3(1200, -80, 300));

// --- Ship (rebuilt from blocks after editing; starts as a placeholder cone) ---
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
// BLOCK TYPES (used by both the editor and ship rebuilding)
// ============================================================
const GRID = 4; // size of one grid cell in world units

const BLOCK_TYPES = [
  { id: "cube",     label: "Hull Cube",  color: 0x8fa3b8, make: () => new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.6, 3.6), mat(0x8fa3b8)) },
  { id: "cone",     label: "Nose Cone",  color: 0x3cf0c5, make: () => new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.6, 12), mat(0x3cf0c5)) },
  { id: "sphere",   label: "Sphere Pod", color: 0xd7c15a, make: () => new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), mat(0xd7c15a)) },
  { id: "cylinder", label: "Cylinder",   color: 0xb0b0b0, make: () => new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.6, 16), mat(0xb0b0b0)) },
  { id: "pyramid",  label: "Wing Wedge", color: 0x7a8ccf, make: () => new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.6, 4), mat(0x7a8ccf)) },
  { id: "engine",   label: "Engine",     color: 0xff8c3c, make: () => new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.6), mat(0xff8c3c)) },
  { id: "weapon",   label: "Weapon",     color: 0xe64545, make: () => {
      const g = new THREE.CylinderGeometry(0.6, 0.6, 3.8, 10);
      g.rotateX(Math.PI / 2);
      return new THREE.Mesh(g, mat(0xe64545));
    } }
];
function mat(color) { return new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 }); }
function blockTypeById(id) { return BLOCK_TYPES.find(b => b.id === id); }

// The ship's actual data - this is the single source of truth for what the ship looks like
let shipBlocks = []; // [{type, gx, gy, gz, rot}]

function rebuildShipFromBlocks() {
  // Clear current ship visuals
  while (ship.children.length) ship.remove(ship.children[0]);

  if (shipBlocks.length === 0) {
    // Nothing built yet - keep the placeholder cone so it's not invisible
    ship.add(placeholderMesh);
    return;
  }
  for (const b of shipBlocks) {
    const mesh = blockTypeById(b.type).make();
    mesh.position.set(b.gx * GRID, b.gy * GRID, b.gz * GRID);
    mesh.rotation.y = b.rot * (Math.PI / 2);
    ship.add(mesh);
  }
}

// ============================================================
// SHIP EDITOR (separate scene + camera)
// ============================================================
const editorScene = new THREE.Scene();
const editorCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

editorScene.add(new THREE.AmbientLight(0x555566, 1.6));
const editorLight = new THREE.DirectionalLight(0xffffff, 1.1);
editorLight.position.set(100, 200, 100);
editorScene.add(editorLight);

const grid = new THREE.GridHelper(160, 40, 0x3cf0c5, 0x334455);
grid.position.y = -GRID / 2;
editorScene.add(grid);

// Invisible-ish base plane so raycasting has something to hit on empty ground
const basePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
);
basePlane.rotation.x = -Math.PI / 2;
basePlane.position.y = -GRID / 2;
editorScene.add(basePlane);

const placedMeshes = []; // meshes currently shown in the editor
const occupied = new Set(); // "gx,gy,gz" keys already filled

let selectedType = BLOCK_TYPES[0].id;
let ghostRotation = 0;
let ghostCell = null;

const ghostMesh = blockTypeById(selectedType).make();
ghostMesh.material = ghostMesh.material.clone();
ghostMesh.material.transparent = true;
ghostMesh.material.opacity = 0.5;
ghostMesh.visible = false;
editorScene.add(ghostMesh);

function setSelectedType(id) {
  selectedType = id;
  editorScene.remove(ghostMesh);
  const newGhost = blockTypeById(id).make();
  newGhost.material = newGhost.material.clone();
  newGhost.material.transparent = true;
  newGhost.material.opacity = 0.5;
  newGhost.position.copy(ghostMesh.position);
  newGhost.rotation.y = ghostRotation * (Math.PI / 2);
  newGhost.visible = ghostMesh.visible;
  Object.assign(ghostMesh, {}); // no-op, keeping reference simple below
  ghostMeshRef.current = newGhost;
  editorScene.add(newGhost);
}
// Simple mutable holder so setSelectedType can swap the actual mesh object
const ghostMeshRef = { current: ghostMesh };

// Build the palette UI
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

function updateGhost(clientX, clientY) {
  mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, editorCamera);

  const targets = [basePlane, ...placedMeshes];
  const hits = raycaster.intersectObjects(targets);

  if (hits.length > 0) {
    const hit = hits[0];
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const point = hit.point.clone().add(normal.multiplyScalar(GRID / 2));
    const gx = Math.round(point.x / GRID);
    const gy = Math.round(point.y / GRID);
    const gz = Math.round(point.z / GRID);
    const key = `${gx},${gy},${gz}`;

    ghostCell = { gx, gy, gz, key };
    ghostMeshRef.current.position.set(gx * GRID, gy * GRID, gz * GRID);
    ghostMeshRef.current.visible = !occupied.has(key);
  } else {
    ghostCell = null;
    ghostMeshRef.current.visible = false;
  }
}

function placeBlock() {
  if (!ghostCell || occupied.has(ghostCell.key)) return;
  const { gx, gy, gz, key } = ghostCell;

  const mesh = blockTypeById(selectedType).make();
  mesh.position.set(gx * GRID, gy * GRID, gz * GRID);
  mesh.rotation.y = ghostRotation * (Math.PI / 2);
  editorScene.add(mesh);
  placedMeshes.push(mesh);
  occupied.add(key);

  shipBlocks.push({ type: selectedType, gx, gy, gz, rot: ghostRotation });
}

function loadEditorFromShipBlocks() {
  // Clear existing editor placed blocks
  for (const m of placedMeshes) editorScene.remove(m);
  placedMeshes.length = 0;
  occupied.clear();

  for (const b of shipBlocks) {
    const mesh = blockTypeById(b.type).make();
    mesh.position.set(b.gx * GRID, b.gy * GRID, b.gz * GRID);
    mesh.rotation.y = b.rot * (Math.PI / 2);
    editorScene.add(mesh);
    placedMeshes.push(mesh);
    occupied.add(`${b.gx},${b.gy},${b.gz}`);
  }
}

// Editor camera orbit (reuses same RMB-drag convention as flight camera)
let editorYaw = 0.8, editorPitch = 0.4, editorDist = 60;

function updateEditorCamera() {
  const offset = new THREE.Vector3(
    Math.sin(editorYaw) * Math.cos(editorPitch),
    Math.sin(editorPitch),
    Math.cos(editorYaw) * Math.cos(editorPitch)
  ).multiplyScalar(editorDist);
  editorCamera.position.copy(offset);
  editorCamera.lookAt(0, 0, 0);
}
updateEditorCamera();

// ============================================================
// INPUT
// ============================================================
const keys = {};
let editorOpen = false;

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === "e" && !e.repeat) toggleEditor();
  if (k === "c" && !e.repeat && !editorOpen) toggleMouseLock();
  if (k === "r" && !e.repeat && editorOpen) {
    ghostRotation = (ghostRotation + 1) % 4;
    ghostMeshRef.current.rotation.y = ghostRotation * (Math.PI / 2);
  }
});
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

function toggleEditor() {
  editorOpen = !editorOpen;
  document.getElementById("editor-ui").style.display = editorOpen ? "block" : "none";
  document.getElementById("editor-title").style.display = editorOpen ? "block" : "none";
  document.getElementById("controls-box").style.display = editorOpen ? "none" : "block";

  if (editorOpen) {
    if (mouseLocked) document.exitPointerLock();
    loadEditorFromShipBlocks();
  } else {
    rebuildShipFromBlocks();
  }
}

// --- Mouse handling shared between flight camera drag and editor placement ---
let dragging = false;
let mouseLocked = false;
let lastX = 0, lastY = 0;

window.addEventListener("mousedown", (e) => {
  if (editorOpen) {
    if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
    if (e.button === 0) placeBlock();
  } else {
    if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
  }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 2) dragging = false;
});
window.addEventListener("contextmenu", (e) => e.preventDefault());

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
    updateGhost(e.clientX, e.clientY);
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      editorYaw -= dx * 0.006;
      editorPitch = Math.max(-1.3, Math.min(1.3, editorPitch + dy * 0.006));
    }
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
const moveSpeed = 1.2;
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

function updateMovement() {
  if (editorOpen) return;

  if (mouseLocked) {
    const forward = getCameraForward();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();

    let moved = false;
    if (keys["w"]) { ship.position.addScaledVector(forward, moveSpeed); moved = true; }
    if (keys["s"]) { ship.position.addScaledVector(forward, -moveSpeed); moved = true; }
    if (keys["a"]) { ship.position.addScaledVector(right, -moveSpeed); moved = true; }
    if (keys["d"]) { ship.position.addScaledVector(right, moveSpeed); moved = true; }

    if (moved) {
      tempFacingObj.position.copy(ship.position);
      tempFacingObj.lookAt(ship.position.clone().add(forward));
      ship.quaternion.slerp(tempFacingObj.quaternion, turnLerp);
    }
  } else {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.quaternion);

    if (keys["w"]) ship.position.addScaledVector(forward, -moveSpeed);
    if (keys["s"]) ship.position.addScaledVector(forward, moveSpeed);
    if (keys["a"]) ship.position.addScaledVector(right, moveSpeed);
    if (keys["d"]) ship.position.addScaledVector(right, -moveSpeed);
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
    renderer.render(scene, camera);
  }
}
animate();
