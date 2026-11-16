import { FIELD, STEP } from './config.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { World, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE } from './world.js';
import { render } from './render.js';
import { seedFromQuery } from './random.js';
import { stageShot } from './shots.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const status = document.querySelector('#status');
const audio = new AudioEngine();
const seed = seedFromQuery(window.location.search);
const world = new World(seed, audio);

function start() {
  if (world.screen === SCREEN_TITLE) {
    audio.start();
    world.start();
    announce();
    return true;
  }
  if (world.screen === SCREEN_RESULTS) {
    audio.start();
    world.restart();
    announce();
    return true;
  }
  return false;
}

function pause() {
  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSE) {
    world.togglePause();
    announce();
  }
}

function restart() {
  if (world.screen === SCREEN_RESULTS) start();
}

function announce() {
  const names = {
    [SCREEN_TITLE]: 'Emberline. Title screen. Press Enter or click to begin.',
    [SCREEN_PLAY]: `Playing. Wave ${world.wave}. Score ${world.score}. Lives ${world.player.lives}. Ember light ${Math.ceil(world.player.light)} percent. Wisps dissolved ${world.wispsDissolved}. Sparks collected ${world.sparksCollected}.`,
    [SCREEN_PAUSE]: 'Paused. Press P or Escape to resume.',
    [SCREEN_RESULTS]: `Run over. Score ${world.score}. Wave ${world.wave}. Press R or click to play again.`,
  };
  if (status.textContent !== names[world.screen]) status.textContent = names[world.screen];
}

const input = new Input(canvas, start, pause, restart, () => audio.toggleMute());

const shot = new URLSearchParams(window.location.search).get('shot');
const shotMode = shot !== null;
if (shot) {
  const scene = ['start', 'play', 'storm', 'end'].includes(shot) ? shot : 'start';
  world.best = 0;
  const screen = stageShot(scene, world);
  world.screen = screen;
  announce();
}

let last = performance.now();
let accumulator = 0;
function frame(now) {
  const elapsed = Math.min(0.2, (now - last) / 1000);
  last = now;
  if (!shotMode && (world.screen === SCREEN_PLAY || world.screen === SCREEN_TITLE)) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      if (world.screen === SCREEN_PLAY) world.step(STEP, input.movement(), input.consumeDash());
      else world.step(STEP);
      accumulator -= STEP;
      if (world.screen !== SCREEN_PLAY) break;
    }
    input.endFrame();
    announce();
  } else {
    input.endFrame();
  }
  render(ctx, world, FIELD.width, FIELD.height);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
