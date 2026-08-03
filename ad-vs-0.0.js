// --- Basic scene setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 8000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
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
    color: color,
    size: size,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  return new THREE.Points(geometry, material);
}
scene.add(makeStarLayer(3000, 4000, 2.2, 0xffffff));
scene.add(makeStarLayer(5000, 6000, 1.2, 0xaad4ff));
scene.add(makeStarLayer(6000, 8000, 0.7, 0xffe9c4));

const bgGeo = new THREE.SphereGeometry(6000, 32, 32);
const bgMat = new THREE.MeshBasicMaterial({ color: 0x060613, side: THREE.BackSide });
scene.add(new THREE.Mesh(bgGeo, bgMat));

// --- Planets scattered around the map ---
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

// --- Ship (placeholder shape - swap for blocks later) ---
const ship = new THREE.Group();
const bodyGeo = new THREE.ConeGeometry(4, 12, 8);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3cf0c5, metalness: 0.3, roughness: 0.4 });
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.rotation.x = Math.PI / 2;
ship.add(bodyMesh);
scene.add(ship);

scene.add(new THREE.AmbientLight(0x404060, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 300, 100);
scene.add(sun);

// --- Input state ---
const keys = {};
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === "c" && !e.repeat) toggleMouseLock();
});
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

const moveSpeed = 1.2;
const turnLerp = 0.12;
const tempFacingObj = new THREE.Object3D();

// --- Camera orbit state ---
let camDistance = 40;
let camYaw = 0;
let camPitch = 0.3;
let dragging = false;
let mouseLocked = false;
let lastX = 0, lastY = 0;

window.addEventListener("mousedown", (e) => {
  if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
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

  camYaw -= dx * 0.005;    // mouse right -> camera moves left, mouse left -> camera moves right
  camPitch += dy * 0.005;  // mouse up -> camera drops below ship, mouse down -> camera rises above
  camPitch = Math.max(-1.4, Math.min(1.4, camPitch));
});

function getCameraForward() {
  return new THREE.Vector3(
    -Math.sin(camYaw) * Math.cos(camPitch),
    -Math.sin(camPitch),
    -Math.cos(camYaw) * Math.cos(camPitch)
  ).normalize();
}

function updateMovement() {
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

// --- Main loop ---
function animate() {
  requestAnimationFrame(animate);
  updateMovement();
  updateCamera();
  renderer.render(scene, camera);
}
animate();
