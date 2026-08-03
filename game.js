// --- Basic scene setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Starfield ---
function makeStars(count, spread) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * spread;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 });
  return new THREE.Points(geometry, material);
}
scene.add(makeStars(4000, 3000));

// --- Ship (placeholder shape - swap for blocks later) ---
const ship = new THREE.Group();
const bodyGeo = new THREE.ConeGeometry(4, 12, 8);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3cf0c5 });
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.rotation.x = Math.PI / 2; // point cone forward along -Z
ship.add(bodyMesh);
scene.add(ship);

// Basic lighting so the ship isn't a black silhouette
scene.add(new THREE.AmbientLight(0x404060, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 300, 100);
scene.add(sun);

// --- Movement state ---
const keys = {};
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

const moveSpeed = 1.2;

function updateMovement() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.quaternion);

  if (keys["w"]) ship.position.addScaledVector(forward, -moveSpeed);
  if (keys["s"]) ship.position.addScaledVector(forward, moveSpeed);
  if (keys["a"]) ship.position.addScaledVector(right, moveSpeed);
  if (keys["d"]) ship.position.addScaledVector(right, -moveSpeed);
}

// --- Camera orbit (right-click drag) ---
let camDistance = 40;
let camYaw = 0;
let camPitch = 0.3;
let dragging = false;
let lastX = 0, lastY = 0;

window.addEventListener("mousedown", (e) => {
  if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 2) dragging = false;
});
window.addEventListener("contextmenu", (e) => e.preventDefault()); // stop right-click menu

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  camYaw += dx * 0.005;
  camPitch += dy * 0.005;
  camPitch = Math.max(-1.4, Math.min(1.4, camPitch)); // clamp so you can't flip over the top
});

function updateCamera() {
  // Orbit position relative to the ship
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
