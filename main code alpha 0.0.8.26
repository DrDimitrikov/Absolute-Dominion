const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ship = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  angle: 0,          // facing direction, in radians
  velX: 0,
  velY: 0,
  thrust: 0.15,       // acceleration per frame while thrusting
  turnSpeed: 0.06,    // radians per frame
  friction: 0.99,     // space "drag" so it doesn't feel too slippery, set to 1 for true Newtonian
  size: 18
};

const keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

function update() {
  // Rotate
  if (keys["ArrowLeft"]) ship.angle -= ship.turnSpeed;
  if (keys["ArrowRight"]) ship.angle += ship.turnSpeed;

  // Thrust forward in whatever direction we're facing
  if (keys["ArrowUp"]) {
    ship.velX += Math.cos(ship.angle) * ship.thrust;
    ship.velY += Math.sin(ship.angle) * ship.thrust;
  }

  // Apply drag
  ship.velX *= ship.friction;
  ship.velY *= ship.friction;

  // Move
  ship.x += ship.velX;
  ship.y += ship.velY;

  // Wrap around screen edges (temporary, until we have a real universe)
  if (ship.x < 0) ship.x = canvas.width;
  if (ship.x > canvas.width) ship.x = 0;
  if (ship.y < 0) ship.y = canvas.height;
  if (ship.y > canvas.height) ship.y = 0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ship as a triangle pointing in its facing direction
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.fillStyle = "lime";
  ctx.beginPath();
  ctx.moveTo(ship.size, 0);
  ctx.lineTo(-ship.size / 1.5, ship.size / 1.5);
  ctx.lineTo(-ship.size / 1.5, -ship.size / 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
