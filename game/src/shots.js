import { FIELD, PLAYER, STEP } from './config.js';
import { beginWave } from './waves.js';
import { SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE } from './world.js';

function pilot(world, careless = false) {
  const player = world.player;
  let target = null;
  let targetDistance = Infinity;
  for (const spark of world.sparks) {
    const distance = Math.hypot(player.x - spark.x, player.y - spark.y);
    if (distance < targetDistance) { target = spark; targetDistance = distance; }
  }
  let dx = target ? target.x - player.x : FIELD.width / 2 - player.x;
  let dy = target ? target.y - player.y : FIELD.height * 0.65 - player.y;
  let length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  let nearest = null;
  let threatDistance = Infinity;
  for (const wisp of world.wisps) {
    const distance = Math.hypot(player.x - wisp.x, player.y - wisp.y);
    if (distance < threatDistance) { nearest = wisp; threatDistance = distance; }
  }
  const danger = nearest && !careless && threatDistance < 118;
  if (danger) {
    dx += (player.x - nearest.x) / threatDistance * (1.4 - threatDistance / 180);
    dy += (player.y - nearest.y) / threatDistance * (1.4 - threatDistance / 180);
    length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
  }
  const dash = player.light >= PLAYER.dashCost && player.dashCooldown <= 0
    && ((!careless && nearest && threatDistance < 68) || (careless && nearest && threatDistance < 34));
  return { movement: { x: dx, y: dy }, dash };
}

export function stageShot(name, world) {
  world.reset();
  world.shotMode = true;
  if (name === 'start') {
    for (let frame = 0; frame < 5 / STEP; frame += 1) world.step(STEP);
    return SCREEN_TITLE;
  }
  world.screen = SCREEN_PLAY;
  beginWave(world, name === 'storm' ? 5 : 1);
  if (name === 'storm') world.storm = 50;

  const limit = name === 'end' ? 600 : name === 'storm' ? 13 : 26;
  for (let frame = 0; frame < limit / STEP; frame += 1) {
    const { movement, dash } = pilot(world, name === 'end');
    world.step(STEP, movement, dash);
    if (world.screen === SCREEN_RESULTS) break;
  }
  if (name === 'end' && world.screen !== SCREEN_RESULTS) {
    for (let frame = 0; frame < 60 * 600 && world.screen !== SCREEN_RESULTS; frame += 1) {
      world.step(STEP, { x: 0, y: 0 }, false);
    }
  }
  return world.screen === SCREEN_RESULTS ? SCREEN_RESULTS : world.screen === SCREEN_TITLE ? SCREEN_TITLE : SCREEN_PLAY;
}
