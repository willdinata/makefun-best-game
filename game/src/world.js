import { FIELD, PLAYER, WAVE } from './config.js';
import { makePlayer, makePower, makeSpark, makeWisp, updatePlayer, updateWisp, applyPower } from './entities.js';
import { burst, floatText, updateEffects } from './particles.js';
import { beginWave, spawnForWave } from './waves.js';
import { mulberry32 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_RESULTS = 'results';

export class World {
  constructor(seed, audio) {
    this.seed = seed >>> 0;
    this.audio = audio;
    this.reset();
  }

  reset() {
    this.rng = mulberry32(this.seed);
    this.shotMode = false;
    this.screen = SCREEN_TITLE;
    this.player = makePlayer();
    this.score = 0;
    this.best = 0;
    this.wave = 1;
    this.waveTime = 0;
    this.waveSpawned = 0;
    this.spawnTimer = 0;
    this.sparkTimer = 0;
    this.combo = 1;
    this.comboTime = 0;
    this.wisps = [];
    this.sparks = [];
    this.orbs = [];
    this.powerups = [];
    this.particles = [];
    this.floating = [];
    this.gusts = [];
    this.storm = 0;
    this.waveCleared = false;
    this.banner = null;
    this.bannerQueue = [];
    this.shake = 0;
    this.hitFlash = 0;
    this.dashTrail = 0;
    this.sparksCollected = 0;
    this.wispsDissolved = 0;
    this.runTime = 0;
    this.stars = Array.from({ length: 150 }, () => ({
      x: this.rng() * FIELD.width,
      y: this.rng() * FIELD.height,
      size: 0.5 + this.rng() * 1.8,
      depth: 0.12 + this.rng() * 0.9,
      phase: this.rng() * Math.PI * 2,
    }));
    this.clouds = Array.from({ length: 8 }, () => ({
      x: this.rng() * FIELD.width, y: this.rng() * FIELD.height,
      radius: 90 + this.rng() * 170, tint: this.rng(),
    }));
    for (let i = 0; i < 6; i += 1) this.sparks.push(makeSpark(this));
  }

  start() {
    if (this.screen !== SCREEN_TITLE) return false;
    this.screen = SCREEN_PLAY;
    this.audio.start();
    beginWave(this, 1);
    return true;
  }

  togglePause() {
    if (this.screen === SCREEN_PLAY) this.screen = SCREEN_PAUSE;
    else if (this.screen === SCREEN_PAUSE) this.screen = SCREEN_PLAY;
  }

  restart() {
    if (this.screen !== SCREEN_RESULTS) return false;
    this.reset();
    this.start();
    return true;
  }

  step(dt, movement = { x: 0, y: 0 }, dashPressed = false) {
    if (this.screen === SCREEN_TITLE) {
      this.runTime += dt;
      updateEffects(this, dt);
      return;
    }
    if (this.screen !== SCREEN_PLAY) return;
    this.runTime += dt;
    const player = this.player;
    const slowFactor = player.slow > 0 ? 0.4 : 1;
    const worldDt = dt * slowFactor;
    updatePlayer(player, dt, movement, dashPressed, this.audio, this);
    const waveCleared = spawnForWave(this, worldDt);

    if (player.magnet > 0) {
      for (const spark of this.sparks) {
        const distance = Math.hypot(player.x - spark.x, player.y - spark.y);
        if (distance > 8 && distance < 245) {
          const pull = (1 - distance / 245) * 190 * worldDt;
          spark.x += (player.x - spark.x) / distance * pull;
          spark.y += (player.y - spark.y) / distance * pull;
        }
      }
    }
    for (const gust of this.gusts) {
      const dx = player.x - gust.x;
      const dy = player.y - gust.y;
      const distance = Math.hypot(dx, dy);
      if (distance < gust.radius && distance > 0) {
        const force = (1 - distance / gust.radius) * 115 * worldDt;
        player.x = Math.max(player.radius + 3, Math.min(FIELD.width - player.radius - 3, player.x + gust.vx * force * 0.045));
        player.y = Math.max(player.radius + 3, Math.min(FIELD.height - player.radius - 3, player.y + gust.vy * force * 0.045));
      }
    }
    for (const wisp of this.wisps) updateWisp(wisp, worldDt, player, this);
    for (const orb of this.orbs) {
      orb.x += orb.vx * worldDt;
      orb.y += orb.vy * worldDt;
      if (orb.x < -20 || orb.x > FIELD.width + 20 || orb.y < -20 || orb.y > FIELD.height + 20) orb.alive = false;
    }

    this.collide();
    this.sparks = this.sparks.filter((spark) => spark.alive);
    this.wisps = this.wisps.filter((wisp) => wisp.alive);
    this.orbs = this.orbs.filter((orb) => orb.alive);
    this.powerups = this.powerups.filter((power) => power.alive);
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (this.comboTime === 0) this.combo = 1;
    if (waveCleared && this.screen === SCREEN_PLAY) this.clearWave();
    updateEffects(this, dt);
    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = this.bannerQueue.shift() ?? null;
    }
  }

  collide() {
    const p = this.player;
    for (const spark of this.sparks) {
      if (!spark.alive || Math.hypot(p.x - spark.x, p.y - spark.y) > p.radius + spark.radius + 3) continue;
      spark.alive = false;
      p.light = Math.min(PLAYER.maxLight, p.light + 13);
      this.score += 10;
      this.sparksCollected += 1;
      this.advanceCombo();
      this.audio.collect(this.combo);
      burst(this, spark.x, spark.y, '#73eaff', 9, 94);
      floatText(this, '+10', spark.x, spark.y, '#a7f5ff', 15);
    }

    for (const power of this.powerups) {
      if (!power.alive || Math.hypot(p.x - power.x, p.y - power.y) > p.radius + power.radius + 4) continue;
      power.alive = false;
      applyPower(p, power.type);
      const label = power.type === 'slow' ? 'SLOW-TIME' : power.type.toUpperCase();
      floatText(this, label, power.x, power.y, '#f4c5ff', 14);
      burst(this, power.x, power.y, '#e58dff', 12, 86);
      this.audio.collect(this.combo);
    }

    for (const wisp of this.wisps) {
      if (!wisp.alive) continue;
      const distance = Math.hypot(p.x - wisp.x, p.y - wisp.y);
      if (p.dash > 0 && distance < p.radius + wisp.radius + 10) {
        this.dissolve(wisp);
      } else if (p.invulnerable <= 0 && p.dash <= 0 && distance < p.radius + wisp.radius - 1) {
        this.takeHit();
        break;
      }
    }
    for (const orb of this.orbs) {
      if (!orb.alive) continue;
      if (p.dash > 0 && Math.hypot(p.x - orb.x, p.y - orb.y) < p.radius + orb.radius + 8) {
        orb.alive = false;
        burst(this, orb.x, orb.y, '#bd79ff', 7, 72);
      } else if (p.invulnerable <= 0 && p.dash <= 0 && Math.hypot(p.x - orb.x, p.y - orb.y) < p.radius + orb.radius) {
        orb.alive = false;
        this.takeHit();
      }
    }
  }

  advanceCombo() {
    this.combo = Math.min(8, this.combo + 1);
    this.comboTime = 4;
  }

  dissolve(wisp) {
    wisp.alive = false;
    const multiplier = this.combo;
    const points = 50 * multiplier;
    this.score += points;
    this.wispsDissolved += 1;
    this.advanceCombo();
    this.audio.dissolve();
    burst(this, wisp.x, wisp.y, '#d477ff', wisp.small ? 9 : 18, 150);
    floatText(this, `+${points}  x${multiplier}`, wisp.x, wisp.y, '#f2ccff', 18);
    if (wisp.type === 'splitter' && !wisp.small) {
      for (let i = 0; i < 2; i += 1) {
        const child = makeWisp(this, 'drifter', true);
        child.x = wisp.x + (i ? 12 : -12);
        child.y = wisp.y;
        child.vx += i ? 44 : -44;
        child.vy += (i ? -1 : 1) * 28;
        this.wisps.push(child);
      }
    }
    if (this.rng() < 0.12) this.powerups.push(makePower(this, wisp.x, wisp.y));
  }

  takeHit() {
    const p = this.player;
    if (p.shield > 0) {
      p.shield = 0;
      p.invulnerable = 0.65;
      this.combo = 1;
      this.comboTime = 0;
      burst(this, p.x, p.y, '#8ef6ff', 17, 130);
      floatText(this, 'SHIELD', p.x, p.y - 20, '#aef8ff', 15);
      return;
    }
    p.lives -= 1;
    p.light = Math.max(8, p.light - 24);
    p.invulnerable = PLAYER.invulnerable;
    this.combo = 1;
    this.comboTime = 0;
    this.shake = 12;
    this.hitFlash = 0.85;
    this.audio.hit();
    burst(this, p.x, p.y, '#ff637a', 24, 180);
    if (p.lives <= 0) {
      p.lives = 0;
      this.screen = SCREEN_RESULTS;
      this.best = this.shotMode ? 0 : this.readBest();
      if (this.score > this.best) {
        this.best = this.score;
        try { localStorage.setItem('emberline-best', String(this.best)); } catch {}
      }
      this.audio.gameOver();
    }
  }

  clearWave() {
    const bonus = 100 * this.wave;
    this.score += bonus;
    this.best = Math.max(this.best, this.score);
    this.banner = { text: `WAVE ${this.wave} CLEAR   +${bonus}`, time: 2.2, color: '#ffd889' };
    this.audio.wave();
    beginWave(this, this.wave + 1);
    if (this.wave % 5 === 0) this.bannerQueue.push({ text: `STORM ${this.wave}   INCOMING`, time: 2.4, color: '#ee8dff' });
  }

  readBest() {
    try { return Number(localStorage.getItem('emberline-best')) || 0; } catch { return 0; }
  }
}

export { WAVE };
