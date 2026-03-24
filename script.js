(() => {
  "use strict";

  // =========================
  // Konfiguration
  // =========================
  const CONFIG = {
    ship: {
      radius: 16,
      turnSpeed: Math.PI * 2.6,
      thrust: 270,
      friction: 0.992,
      invulnerableAfterHit: 1.4,
      shootCooldown: 0.16,
    },
    bullet: {
      speed: 520,
      life: 1.1,
      radius: 2,
      max: 8,
    },
    asteroid: {
      startLarge: 5,
      baseSpeed: 48,
      speedVariance: 65,
      largeRadius: 52,
      mediumRadius: 32,
      smallRadius: 20,
      verticesMin: 9,
      verticesMax: 14,
      jaggedness: 0.3,
    },
    scoring: {
      large: 20,
      medium: 50,
      small: 100,
    },
    gameplay: {
      lives: 3,
      hitGrace: 2.0,
      explosionDuration: 0.35,
    },
  };

  // =========================
  // Initialisierung
  // =========================
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const statusEl = document.getElementById("status");

  const input = {
    left: false,
    right: false,
    thrust: false,
    shoot: false,
  };

  let gameState;

  // =========================
  // Hilfsfunktionen
  // =========================
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function wrapPosition(entity) {
    if (entity.x < -entity.radius) entity.x = canvas.width + entity.radius;
    if (entity.x > canvas.width + entity.radius) entity.x = -entity.radius;
    if (entity.y < -entity.radius) entity.y = canvas.height + entity.radius;
    if (entity.y > canvas.height + entity.radius) entity.y = -entity.radius;
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function createAsteroidShape(vertexCount, radius) {
    const points = [];
    for (let i = 0; i < vertexCount; i += 1) {
      const angle = (Math.PI * 2 * i) / vertexCount;
      const offset = rand(1 - CONFIG.asteroid.jaggedness, 1 + CONFIG.asteroid.jaggedness);
      points.push({ angle, dist: radius * offset });
    }
    return points;
  }

  function asteroidValue(size) {
    if (size === "large") return CONFIG.scoring.large;
    if (size === "medium") return CONFIG.scoring.medium;
    return CONFIG.scoring.small;
  }

  function asteroidRadius(size) {
    if (size === "large") return CONFIG.asteroid.largeRadius;
    if (size === "medium") return CONFIG.asteroid.mediumRadius;
    return CONFIG.asteroid.smallRadius;
  }

  function nextAsteroidSize(size) {
    if (size === "large") return "medium";
    if (size === "medium") return "small";
    return null;
  }

  function createAsteroid(size, x = null, y = null) {
    const radius = asteroidRadius(size);
    const speed = CONFIG.asteroid.baseSpeed + Math.random() * CONFIG.asteroid.speedVariance;
    const angle = Math.random() * Math.PI * 2;
    const spin = rand(-1, 1);

    const asteroid = {
      type: "asteroid",
      size,
      radius,
      x: x ?? rand(0, canvas.width),
      y: y ?? rand(0, canvas.height),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: rand(0, Math.PI * 2),
      spin,
      shape: createAsteroidShape(
        Math.floor(rand(CONFIG.asteroid.verticesMin, CONFIG.asteroid.verticesMax)),
        radius
      ),
    };

    return asteroid;
  }

  function spawnInitialAsteroids() {
    const list = [];
    for (let i = 0; i < CONFIG.asteroid.startLarge; i += 1) {
      let asteroid = createAsteroid("large");
      // Spawn mit Abstand zum Schiff
      while (distanceSquared(asteroid, gameState.ship) < 180 * 180) {
        asteroid = createAsteroid("large");
      }
      list.push(asteroid);
    }
    return list;
  }

  function createShip() {
    return {
      type: "ship",
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: 0,
      vy: 0,
      radius: CONFIG.ship.radius,
      angle: -Math.PI / 2,
      shootTimer: 0,
      invulnerableTimer: CONFIG.gameplay.hitGrace,
      thrustFxTimer: 0,
    };
  }

  function resetGame() {
    gameState = {
      running: true,
      score: 0,
      lives: CONFIG.gameplay.lives,
      ship: createShip(),
      bullets: [],
      asteroids: [],
      explosions: [],
      blinkTimer: 0,
      levelClearCooldown: 0,
      lastTime: performance.now(),
    };

    gameState.asteroids = spawnInitialAsteroids();
    updateHud("Läuft");
  }

  // =========================
  // Input Handling
  // =========================
  function onKeyDown(event) {
    const { code } = event;
    if (code === "ArrowLeft") input.left = true;
    if (code === "ArrowRight") input.right = true;
    if (code === "ArrowUp") input.thrust = true;
    if (code === "Space") {
      event.preventDefault();
      input.shoot = true;
      if (!gameState.running) resetGame();
    }
  }

  function onKeyUp(event) {
    const { code } = event;
    if (code === "ArrowLeft") input.left = false;
    if (code === "ArrowRight") input.right = false;
    if (code === "ArrowUp") input.thrust = false;
    if (code === "Space") input.shoot = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // =========================
  // Entity Management & Logik
  // =========================
  function shootBullet(ship) {
    if (gameState.bullets.length >= CONFIG.bullet.max) return;

    const speedX = Math.cos(ship.angle) * CONFIG.bullet.speed;
    const speedY = Math.sin(ship.angle) * CONFIG.bullet.speed;

    gameState.bullets.push({
      x: ship.x + Math.cos(ship.angle) * (ship.radius + 2),
      y: ship.y + Math.sin(ship.angle) * (ship.radius + 2),
      vx: ship.vx + speedX,
      vy: ship.vy + speedY,
      radius: CONFIG.bullet.radius,
      life: CONFIG.bullet.life,
    });

    ship.thrustFxTimer = 0.06;
  }

  function splitAsteroid(asteroid) {
    const nextSize = nextAsteroidSize(asteroid.size);
    if (!nextSize) return [];

    const childA = createAsteroid(nextSize, asteroid.x, asteroid.y);
    const childB = createAsteroid(nextSize, asteroid.x, asteroid.y);

    childA.vx += asteroid.vx * 0.3;
    childA.vy += asteroid.vy * 0.3;
    childB.vx -= asteroid.vx * 0.3;
    childB.vy -= asteroid.vy * 0.3;

    return [childA, childB];
  }

  function spawnExplosion(x, y, color = "#f8f871") {
    gameState.explosions.push({
      x,
      y,
      time: CONFIG.gameplay.explosionDuration,
      maxTime: CONFIG.gameplay.explosionDuration,
      color,
    });
  }

  function handleShipHit() {
    const ship = gameState.ship;
    if (ship.invulnerableTimer > 0) return;

    gameState.lives -= 1;
    spawnExplosion(ship.x, ship.y, "#ff7b7b");

    if (gameState.lives <= 0) {
      gameState.running = false;
      updateHud("Game Over – Leertaste zum Neustart");
      return;
    }

    // Respawn des Schiffs im Zentrum
    gameState.ship = createShip();
    gameState.ship.invulnerableTimer = CONFIG.ship.invulnerableAfterHit;
    gameState.bullets = [];
  }

  function handleCollisions() {
    const ship = gameState.ship;

    // Schiff vs Asteroiden
    for (const asteroid of gameState.asteroids) {
      const collisionDistance = (ship.radius + asteroid.radius) ** 2;
      if (distanceSquared(ship, asteroid) <= collisionDistance) {
        handleShipHit();
        break;
      }
    }

    // Bullet vs Asteroid
    const remainingBullets = [];
    const remainingAsteroids = [];
    const spawnedAsteroids = [];

    for (const asteroid of gameState.asteroids) {
      let destroyed = false;

      for (const bullet of gameState.bullets) {
        if (bullet._hit) continue;
        const hitDistance = (bullet.radius + asteroid.radius) ** 2;
        if (distanceSquared(bullet, asteroid) <= hitDistance) {
          bullet._hit = true;
          destroyed = true;
          gameState.score += asteroidValue(asteroid.size);
          spawnedAsteroids.push(...splitAsteroid(asteroid));
          spawnExplosion(asteroid.x, asteroid.y);
          break;
        }
      }

      if (!destroyed) {
        remainingAsteroids.push(asteroid);
      }
    }

    for (const bullet of gameState.bullets) {
      if (!bullet._hit) remainingBullets.push(bullet);
    }

    gameState.bullets = remainingBullets;
    gameState.asteroids = remainingAsteroids.concat(spawnedAsteroids);

    if (gameState.running && gameState.asteroids.length === 0) {
      gameState.levelClearCooldown = 0.7;
      updateHud("Welle geschafft!");
      for (let i = 0; i < CONFIG.asteroid.startLarge + 1; i += 1) {
        gameState.asteroids.push(createAsteroid("large"));
      }
    }
  }

  function update(dt) {
    const ship = gameState.ship;

    if (!gameState.running) {
      updateExplosions(dt);
      return;
    }

    if (gameState.levelClearCooldown > 0) {
      gameState.levelClearCooldown -= dt;
      if (gameState.levelClearCooldown <= 0) updateHud("Läuft");
    }

    if (ship.invulnerableTimer > 0) ship.invulnerableTimer -= dt;
    if (ship.thrustFxTimer > 0) ship.thrustFxTimer -= dt;

    // Drehung
    if (input.left) ship.angle -= CONFIG.ship.turnSpeed * dt;
    if (input.right) ship.angle += CONFIG.ship.turnSpeed * dt;

    // Schub + Trägheit
    if (input.thrust) {
      ship.vx += Math.cos(ship.angle) * CONFIG.ship.thrust * dt;
      ship.vy += Math.sin(ship.angle) * CONFIG.ship.thrust * dt;
      ship.thrustFxTimer = Math.max(ship.thrustFxTimer, 0.02);
    }

    ship.vx *= CONFIG.ship.friction;
    ship.vy *= CONFIG.ship.friction;

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrapPosition(ship);

    // Schießen (Cooldown)
    ship.shootTimer -= dt;
    if (input.shoot && ship.shootTimer <= 0) {
      shootBullet(ship);
      ship.shootTimer = CONFIG.ship.shootCooldown;
    }

    // Bullets updaten
    for (let i = gameState.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = gameState.bullets[i];
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      wrapPosition(bullet);
      if (bullet.life <= 0) gameState.bullets.splice(i, 1);
    }

    // Asteroiden updaten
    for (const asteroid of gameState.asteroids) {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.rotation += asteroid.spin * dt;
      wrapPosition(asteroid);
    }

    updateExplosions(dt);
    handleCollisions();
    updateHud(gameState.levelClearCooldown > 0 ? "Welle geschafft!" : "Läuft");
  }

  function updateExplosions(dt) {
    for (let i = gameState.explosions.length - 1; i >= 0; i -= 1) {
      gameState.explosions[i].time -= dt;
      if (gameState.explosions[i].time <= 0) gameState.explosions.splice(i, 1);
    }
  }

  // =========================
  // Rendering
  // =========================
  function drawShip(ship) {
    const blink = ship.invulnerableTimer > 0 && Math.floor(ship.invulnerableTimer * 10) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = "#eaf6ff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius * 0.8, ship.radius * 0.7);
    ctx.lineTo(-ship.radius * 0.45, 0);
    ctx.lineTo(-ship.radius * 0.8, -ship.radius * 0.7);
    ctx.closePath();
    ctx.stroke();

    // Einfaches Mündungs-/Schubfeuer
    if (ship.thrustFxTimer > 0 && (input.thrust || input.shoot)) {
      ctx.strokeStyle = "#f8f871";
      ctx.beginPath();
      ctx.moveTo(-ship.radius * 0.7, 0);
      ctx.lineTo(-ship.radius * 1.25, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);
    ctx.strokeStyle = "#8ef9f3";
    ctx.lineWidth = 2;

    ctx.beginPath();
    asteroid.shape.forEach((point, index) => {
      const px = Math.cos(point.angle) * point.dist;
      const py = Math.sin(point.angle) * point.dist;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  function drawBullets() {
    ctx.fillStyle = "#f8f871";
    for (const bullet of gameState.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawExplosions() {
    for (const explosion of gameState.explosions) {
      const t = explosion.time / explosion.maxTime;
      const radius = 34 * (1 - t);
      ctx.strokeStyle = explosion.color;
      ctx.globalAlpha = t;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawGameOverOverlay() {
    if (gameState.running) return;

    ctx.fillStyle = "rgba(4, 7, 13, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ff7b7b";
    ctx.font = "bold 56px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 16);

    ctx.fillStyle = "#eaf6ff";
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("Leertaste drücken zum Neustart", canvas.width / 2, canvas.height / 2 + 34);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sternenhintergrund (leichtes Rastergefühl)
    ctx.fillStyle = "#0a1222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBullets();
    for (const asteroid of gameState.asteroids) drawAsteroid(asteroid);
    drawShip(gameState.ship);
    drawExplosions();
    drawGameOverOverlay();
  }

  function updateHud(statusText) {
    scoreEl.textContent = `Score: ${gameState.score}`;
    livesEl.textContent = `Leben: ${gameState.lives}`;
    statusEl.textContent = `Status: ${statusText}`;
  }

  // =========================
  // Game Loop
  // =========================
  function loop(now) {
    const dt = Math.min((now - gameState.lastTime) / 1000, 0.033);
    gameState.lastTime = now;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  resetGame();
  requestAnimationFrame(loop);
})();
