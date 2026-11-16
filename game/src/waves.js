import { FIELD, WAVE } from './config.js';
import { makeSpark, makeWisp } from './entities.js';

export function beginWave(world, number) {
  world.wave = number;
  world.waveTime = 0;
  world.spawnTimer = 0.3;
  world.sparkTimer = 0.4;
  world.waveSpawned = 0;
  world.waveCleared = false;
  const storm = number % 5 === 0;
  if (storm) {
    world.storm = 2.4;
    world.gusts = [];
    for (let i = 0; i < 5; i += 1) {
      world.gusts.push({
        x: world.rng() * FIELD.width, y: world.rng() * FIELD.height,
        vx: (world.rng() - 0.5) * 105, vy: (world.rng() - 0.5) * 85,
        radius: 70 + world.rng() * 75, phase: world.rng() * Math.PI * 2,
      });
    }
  } else {
    world.storm = 0;
    world.gusts = [];
  }
}

export function spawnForWave(world, dt) {
  world.waveTime += dt;
  world.storm = Math.max(0, world.storm - dt);
  world.spawnTimer -= dt;
  world.sparkTimer -= dt;
  const duration = Math.max(8, WAVE.duration - world.wave * 0.34);
  const maxWisps = Math.min(WAVE.maxWisps + Math.floor(world.wave * 1.4), 34);
  const waveQuota = Math.min(5 + world.wave * 2, 36);
  const gap = Math.max(0.48, WAVE.spawnGap / (1 + world.wave * 0.055));
  if (world.spawnTimer <= 0 && world.waveTime < duration && world.waveSpawned < waveQuota && world.wisps.length < maxWisps) {
    const available = Math.min(Math.max(0, world.wave - 1), 3);
    if (world.wave >= 6) {
      const roll = world.rng();
      const type = roll < 0.24 ? 'spitter' : WAVE.types[Math.floor(world.rng() * (available + 1))];
      world.wisps.push(makeWisp(world, type));
    } else {
      const type = WAVE.types[Math.floor(world.rng() * (available + 1))];
      world.wisps.push(makeWisp(world, type));
    }
    world.waveSpawned += 1;
    world.spawnTimer = gap * (world.wave % 5 === 0 ? 0.72 : 0.86 + world.rng() * 0.3);
  }
  if (world.sparkTimer <= 0 && world.sparks.length < 7) {
    world.sparks.push(makeSpark(world));
    world.sparkTimer = WAVE.sparkGap * (0.8 + world.rng() * 0.55);
  }
  for (const gust of world.gusts) {
    gust.x += gust.vx * dt;
    gust.y += gust.vy * dt;
    gust.phase += dt;
    if (gust.x < 0 || gust.x > FIELD.width) gust.vx *= -1;
    if (gust.y < 0 || gust.y > FIELD.height) gust.vy *= -1;
  }
  const finished = world.wisps.length === 0 && (world.waveTime >= duration || world.waveSpawned >= waveQuota);
  if (!world.waveCleared && finished) {
    world.waveCleared = true;
    return true;
  }
  return false;
}
