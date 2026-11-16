import { FIELD, PLAYER, POWER_DURATION } from './config.js';

export function makePlayer() {
  return {
    x: FIELD.width / 2, y: FIELD.height * 0.68, vx: 0, vy: 0, radius: PLAYER.radius,
    light: PLAYER.startLight, lives: 3, dash: 0, dashCooldown: 0, invulnerable: 0,
    shield: 0, magnet: 0, slow: 0, facing: -Math.PI / 2,
  };
}

export function makeWisp(world, type = 'drifter', small = false) {
  const side = Math.floor(world.rng() * 4);
  const margin = 30;
  const x = side === 0 ? margin : side === 1 ? FIELD.width - margin : world.rng() * FIELD.width;
  const y = side === 2 ? margin : side === 3 ? FIELD.height - margin : world.rng() * FIELD.height;
  const angle = Math.atan2(world.player.y - y, world.player.x - x) + (world.rng() - 0.5) * 1.7;
  const scale = small ? 0.58 : 1;
  const baseSpeed = (43 + Math.min(world.wave, 15) * 3.2) * scale;
  return {
    x, y, vx: Math.cos(angle) * baseSpeed, vy: Math.sin(angle) * baseSpeed,
    type: small ? 'drifter' : type, radius: (type === 'splitter' ? 16 : 14) * scale,
    age: world.rng() * 4, phase: world.rng() * Math.PI * 2, fire: 2 + world.rng() * 2,
    small, alive: true,
  };
}

export function makeSpark(world, x = null, y = null) {
  return {
    x: x ?? 24 + world.rng() * (FIELD.width - 48),
    y: y ?? 24 + world.rng() * (FIELD.height - 48),
    radius: 5, phase: world.rng() * Math.PI * 2, alive: true,
  };
}

export function makePower(world, x, y) {
  const types = ['shield', 'magnet', 'slow'];
  return { x, y, type: types[Math.floor(world.rng() * types.length)], radius: 9, alive: true, phase: 0 };
}

export function makeOrb(x, y, target, speed = 85) {
  const angle = Math.atan2(target.y - y, target.x - x);
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 7, alive: true };
}

export function updatePlayer(player, dt, movement, dashPressed, audio, world) {
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dash = Math.max(0, player.dash - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.magnet = Math.max(0, player.magnet - dt);
  player.slow = Math.max(0, player.slow - dt);

  let dx = movement.x;
  let dy = movement.y;
  if (movement.target) {
    dx -= player.x;
    dy -= player.y;
    const length = Math.hypot(dx, dy);
    if (length > 8) { dx /= length; dy /= length; }
    else { dx = 0; dy = 0; }
  }
  if (dx || dy) player.facing = Math.atan2(dy, dx);

  if (dashPressed && player.dashCooldown <= 0 && player.light >= PLAYER.dashCost) {
    player.light -= PLAYER.dashCost;
    player.dash = PLAYER.dashDuration;
    player.dashCooldown = PLAYER.dashCooldown;
    if (!dx && !dy) {
      dx = Math.cos(player.facing);
      dy = Math.sin(player.facing);
    }
    const length = Math.hypot(dx, dy) || 1;
    player.vx = dx / length * PLAYER.dashSpeed;
    player.vy = dy / length * PLAYER.dashSpeed;
    audio.dash();
    world.dashTrail = 0.22;
  } else if (player.dash <= 0) {
    const targetX = dx * PLAYER.speed;
    const targetY = dy * PLAYER.speed;
    player.vx += (targetX - player.vx) * Math.min(1, dt * 9);
    player.vy += (targetY - player.vy) * Math.min(1, dt * 9);
  }
  player.x = Math.max(player.radius + 3, Math.min(FIELD.width - player.radius - 3, player.x + player.vx * dt));
  player.y = Math.max(player.radius + 3, Math.min(FIELD.height - player.radius - 3, player.y + player.vy * dt));
  world.dashTrail = Math.max(0, world.dashTrail - dt);
}

export function updateWisp(wisp, dt, player, world) {
  wisp.age += dt;
  const dx = player.x - wisp.x;
  const dy = player.y - wisp.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = Math.hypot(wisp.vx, wisp.vy) || 1;
  if (wisp.type === 'chaser') {
    const turn = 1.35 * dt;
    const desired = Math.atan2(dy, dx);
    let angle = Math.atan2(wisp.vy, wisp.vx);
    let diff = Math.atan2(Math.sin(desired - angle), Math.cos(desired - angle));
    angle += Math.max(-turn, Math.min(turn, diff));
    const targetSpeed = speed * 0.94 + (60 + world.wave * 2.4) * 0.06;
    wisp.vx = Math.cos(angle) * targetSpeed;
    wisp.vy = Math.sin(angle) * targetSpeed;
  } else if (wisp.type === 'weaver') {
    wisp.vx += Math.cos(wisp.age * 4 + wisp.phase) * 34 * dt;
    wisp.vy += Math.sin(wisp.age * 3 + wisp.phase) * 34 * dt;
    const speed = Math.hypot(wisp.vx, wisp.vy);
    const maxSpeed = 92 + Math.min(world.wave, 12) * 2.4;
    if (speed > maxSpeed) {
      wisp.vx *= maxSpeed / speed;
      wisp.vy *= maxSpeed / speed;
    }
  } else if (wisp.type === 'spitter') {
    const desiredRange = 190;
    const direction = distance < desiredRange ? -1 : distance > desiredRange + 55 ? 1 : 0;
    wisp.vx += (dx / distance) * direction * 55 * dt;
    wisp.vy += (dy / distance) * direction * 55 * dt;
    wisp.fire -= dt;
    if (wisp.fire <= 0) {
      world.orbs.push(makeOrb(wisp.x, wisp.y, player, 77 + world.wave * 1.2));
      wisp.fire = Math.max(1.1, 2.7 - world.wave * 0.035);
    }
  } else if (wisp.type === 'drifter' && !wisp.small) {
    wisp.vx += Math.sin(wisp.age * 1.1 + wisp.phase) * 11 * dt;
    wisp.vy += Math.cos(wisp.age * 0.9 + wisp.phase) * 11 * dt;
  }
  wisp.x += wisp.vx * dt;
  wisp.y += wisp.vy * dt;
  const pad = wisp.radius * 1.5;
  if (wisp.x < pad || wisp.x > FIELD.width - pad) wisp.vx *= -1;
  if (wisp.y < pad || wisp.y > FIELD.height - pad) wisp.vy *= -1;
  wisp.x = Math.max(pad, Math.min(FIELD.width - pad, wisp.x));
  wisp.y = Math.max(pad, Math.min(FIELD.height - pad, wisp.y));
}

export function applyPower(player, type) {
  if (type === 'shield') player.shield = 1;
  if (type === 'magnet') player.magnet = POWER_DURATION.magnet;
  if (type === 'slow') player.slow = POWER_DURATION.slow;
}
