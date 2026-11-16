import { COLORS, FIELD, PLAYER } from './config.js';
import { SCREEN_PAUSE, SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE } from './world.js';

const TAU = Math.PI * 2;
const backgroundCache = new WeakMap();

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function glow(ctx, x, y, radius, color, strength = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha *= strength;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha /= strength;
}

function text(ctx, value, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function drawBackground(ctx, world) {
  let background = backgroundCache.get(world);
  if (!background) {
    background = document.createElement('canvas');
    background.width = FIELD.width;
    background.height = FIELD.height;
    const bg = background.getContext('2d');
    const base = bg.createLinearGradient(0, 0, FIELD.width, FIELD.height);
    base.addColorStop(0, '#111124');
    base.addColorStop(0.52, '#0b0b1c');
    base.addColorStop(1, '#171025');
    bg.fillStyle = base;
    bg.fillRect(0, 0, FIELD.width, FIELD.height);
    bg.save();
    bg.globalCompositeOperation = 'screen';
    world.clouds.forEach((cloud) => {
      const hue = cloud.tint < 0.34 ? 'rgba(53,78,157,0.12)' : cloud.tint < 0.67 ? 'rgba(112,53,151,0.105)' : 'rgba(180,82,59,0.065)';
      glow(bg, cloud.x, cloud.y, cloud.radius, hue, 1);
    });
    bg.restore();
    const vignette = bg.createRadialGradient(480, 268, 80, 480, 268, 620);
    vignette.addColorStop(0, 'rgba(3,4,14,0)');
    vignette.addColorStop(1, 'rgba(2,3,11,0.76)');
    bg.fillStyle = vignette;
    bg.fillRect(0, 0, FIELD.width, FIELD.height);
    backgroundCache.set(world, background);
  }
  ctx.drawImage(background, 0, 0);

  const offsetX = world.player ? world.player.x - FIELD.width / 2 : 0;
  const offsetY = world.player ? world.player.y - FIELD.height / 2 : 0;
  for (const star of world.stars) {
    const x = (star.x - offsetX * star.depth * 0.035 + FIELD.width) % FIELD.width;
    const y = (star.y - offsetY * star.depth * 0.035 + FIELD.height) % FIELD.height;
    const twinkle = 0.48 + 0.48 * Math.sin(world.runTime * (0.6 + star.depth) + star.phase);
    ctx.globalAlpha = twinkle * (0.35 + star.depth * 0.55);
    ctx.fillStyle = star.depth > 0.76 ? '#d9d3ff' : '#a9b5e8';
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGusts(ctx, world) {
  if (!world.gusts.length) return;
  ctx.save();
  for (const gust of world.gusts) {
    const pulse = 0.78 + Math.sin(gust.phase * 2) * 0.16;
    const gradient = ctx.createRadialGradient(gust.x, gust.y, 3, gust.x, gust.y, gust.radius);
    gradient.addColorStop(0, `rgba(150,90,255,${0.04 * pulse})`);
    gradient.addColorStop(0.72, 'rgba(117,76,210,0.028)');
    gradient.addColorStop(1, 'rgba(117,76,210,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(gust.x, gust.y, gust.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(185,143,255,0.15)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(gust.x, gust.y, gust.radius * 0.73, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpark(ctx, spark, time) {
  const pulse = 1 + Math.sin(time * 4 + spark.phase) * 0.18;
  ctx.save();
  glow(ctx, spark.x, spark.y, 24 * pulse, 'rgba(78,225,255,0.28)', 1);
  ctx.translate(spark.x, spark.y);
  ctx.rotate(time + spark.phase);
  ctx.fillStyle = '#b7f7ff';
  ctx.strokeStyle = '#44dff9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -7 * pulse);
  ctx.lineTo(5 * pulse, 0);
  ctx.lineTo(0, 7 * pulse);
  ctx.lineTo(-5 * pulse, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWisp(ctx, wisp, time) {
  const color = wisp.type === 'spitter' ? '#ff80bc' : wisp.type === 'splitter' ? '#ffb56f' : wisp.type === 'weaver' ? '#a9a0ff' : wisp.type === 'chaser' ? '#ff718f' : '#d27cff';
  const wobble = Math.sin(time * 5 + wisp.phase) * 2.4;
  ctx.save();
  glow(ctx, wisp.x, wisp.y, wisp.radius * 2.6, `${color}55`, 1);
  ctx.translate(wisp.x, wisp.y);
  ctx.rotate(wisp.age * (wisp.type === 'weaver' ? 1.9 : 0.6));
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(36,18,55,0.94)';
  ctx.beginPath();
  const sides = wisp.type === 'drifter' ? 8 : wisp.type === 'chaser' ? 5 : wisp.type === 'weaver' ? 7 : 6;
  for (let i = 0; i <= sides; i += 1) {
    const angle = i / sides * TAU;
    const radius = wisp.radius * (i % 2 ? 0.77 : 1) + wobble * 0.22;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-wisp.radius * 0.25, -wisp.radius * 0.1, 2.2, 0, TAU);
  ctx.arc(wisp.radius * 0.25, -wisp.radius * 0.1, 2.2, 0, TAU);
  ctx.fill();
  if (wisp.type === 'spitter') {
    ctx.strokeStyle = 'rgba(255,128,188,0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, wisp.radius * 1.45, 0, TAU);
    ctx.stroke();
  }
  if (wisp.type === 'weaver') {
    ctx.strokeStyle = 'rgba(207,195,255,0.82)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, wisp.radius * 1.45, wisp.radius * 0.62, time * 1.7, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const pulse = 1 + Math.sin(world.runTime * 4.5) * 0.07;
  ctx.save();
  if (world.dashTrail > 0) {
    ctx.globalAlpha = Math.min(0.55, world.dashTrail * 3);
    for (let i = 1; i <= 4; i += 1) {
      ctx.fillStyle = '#ffae4f';
      ctx.beginPath();
      ctx.arc(p.x - p.vx * i * 0.023, p.y - p.vy * i * 0.023, p.radius * (1 - i * 0.12), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const safeRadius = 56 + p.light * 1.55;
  glow(ctx, p.x, p.y, safeRadius, `rgba(255,154,53,${0.13 + p.light / 950})`, 1);
  if (p.shield > 0) {
    ctx.strokeStyle = `rgba(112,242,255,${0.65 + Math.sin(world.runTime * 8) * 0.18})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 9, 0, TAU);
    ctx.stroke();
  }
  const flicker = p.invulnerable > 0 && Math.floor(world.runTime * 18) % 2 === 0;
  if (!flicker) {
    glow(ctx, p.x, p.y, 33 * pulse, 'rgba(255,164,64,0.75)', 1);
    ctx.fillStyle = '#ffe0a2';
    ctx.strokeStyle = '#ffad43';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * pulse, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff8d9';
    ctx.beginPath();
    ctx.arc(p.x - 2.5, p.y - 3, p.radius * 0.42, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawEffects(ctx, world) {
  for (const particle of world.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const item of world.floating) {
    ctx.globalAlpha = Math.min(1, item.life * 1.7);
    ctx.font = `700 ${item.size}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8,8,20,0.85)';
    ctx.strokeText(item.text, item.x, item.y);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.fillStyle = 'rgba(7,8,21,0.76)';
  roundedRect(ctx, 19, 17, 295, 92, 12);
  ctx.fill();
  text(ctx, 'SCORE', 34, 35, 11, '#a7a5c4', 'left', 700);
  text(ctx, String(world.score).padStart(6, '0'), 33, 63, 29, COLORS.gold, 'left', 800);
  const best = world.shotMode ? world.best : Math.max(world.best, world.readBest());
  text(ctx, `BEST ${best.toLocaleString()}`, 35, 91, 13, '#d7c9a9', 'left', 700);

  ctx.fillStyle = 'rgba(7,8,21,0.73)';
  roundedRect(ctx, 19, 119, 205, 64, 10);
  ctx.fill();
  text(ctx, `WAVE ${String(world.wave).padStart(2, '0')}`, 34, 140, 19, COLORS.white, 'left', 750);
  if (world.wave % 5 === 0) text(ctx, 'STORM', 34, 165, 12, '#eab2ff', 'left', 800);
  else text(ctx, 'NEBULA DRIFT', 34, 165, 11, '#a9a6c7', 'left', 650);

  ctx.fillStyle = 'rgba(7,8,21,0.76)';
  roundedRect(ctx, 694, 17, 247, 77, 12);
  ctx.fill();
  text(ctx, 'LIVES', 711, 36, 11, '#aaa6c7', 'left', 700);
  for (let i = 0; i < 3; i += 1) {
    ctx.globalAlpha = i < p.lives ? 1 : 0.2;
    glow(ctx, 737 + i * 36, 66, 15, 'rgba(255,161,63,0.55)', 1);
    ctx.fillStyle = '#ffd58c';
    ctx.strokeStyle = '#ff9f3f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(737 + i * 36, 66, 7.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const lightWidth = 207;
  ctx.fillStyle = 'rgba(7,8,21,0.78)';
  roundedRect(ctx, 711, 112, 230, 72, 10);
  ctx.fill();
  text(ctx, 'EMBER LIGHT', 727, 131, 12, '#f2d89e', 'left', 750);
  text(ctx, `${Math.ceil(p.light)}%`, 925, 131, 13, COLORS.gold, 'right', 750);
  roundedRect(ctx, 727, 146, lightWidth, 10, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.11)';
  ctx.fill();
  roundedRect(ctx, 727, 146, lightWidth * p.light / PLAYER.maxLight, 10, 5);
  const light = ctx.createLinearGradient(727, 0, 727 + lightWidth, 0);
  light.addColorStop(0, '#e86d39');
  light.addColorStop(1, '#ffd47c');
  ctx.fillStyle = light;
  ctx.fill();
  const comboFill = world.comboTime / 4;
  roundedRect(ctx, 727, 165, lightWidth, 4, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  roundedRect(ctx, 727, 165, lightWidth * comboFill, 4, 2);
  ctx.fillStyle = '#cb89ff';
  ctx.fill();

  const comboX = 428;
  ctx.fillStyle = 'rgba(7,8,21,0.73)';
  roundedRect(ctx, comboX, 19, 104, 49, 10);
  ctx.fill();
  text(ctx, `x${world.combo}`, 480, 43, 24, world.combo > 1 ? '#e5b7ff' : '#d4cda9', 'center', 800);
  text(ctx, 'COMBO', 480, 60, 9, '#a7a3c4', 'center', 700);

  const power = p.shield > 0 ? ['SHIELD', '1 HIT'] : p.magnet > 0 ? ['MAGNET', `${p.magnet.toFixed(1)}s`] : p.slow > 0 ? ['SLOW-TIME', `${p.slow.toFixed(1)}s`] : null;
  if (power) {
    ctx.fillStyle = 'rgba(7,8,21,0.76)';
    roundedRect(ctx, 711, 196, 230, 35, 8);
    ctx.fill();
    text(ctx, `${power[0]}  ${power[1]}`, 727, 214, 13, '#e8b5ff', 'left', 750);
  }
  if (world.banner) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, world.banner.time * 2);
    ctx.fillStyle = 'rgba(9,8,23,0.84)';
    roundedRect(ctx, 292, 92, 376, 46, 12);
    ctx.fill();
    text(ctx, world.banner.text, 480, 115, 17, world.banner.color, 'center', 800);
    ctx.restore();
  }
  text(ctx, 'SPACE / CLICK  DASH     P  PAUSE     M  SOUND', 480, 516, 10, 'rgba(221,216,248,0.62)', 'center', 600);
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5,6,17,0.43)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,150,56,0.6)';
  ctx.shadowBlur = 32;
  ctx.fillStyle = '#ffd18a';
  ctx.font = '800 59px ui-monospace, monospace';
  ctx.fillText('EMBERLINE', 480, 147);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#a8e8ff';
  ctx.font = '700 13px ui-monospace, monospace';
  ctx.letterSpacing = '5px';
  ctx.fillText('A LAST LIGHT IN A DYING STAR', 480, 190);
  ctx.letterSpacing = '0px';
  ctx.restore();

  glow(ctx, 480, 272, 86, 'rgba(255,155,56,0.26)', 1);
  ctx.fillStyle = '#ffd68f';
  ctx.strokeStyle = '#ffab46';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(480, 272, 19 + Math.sin(world.runTime * 3) * 2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = `rgba(116,231,255,${0.48 - i * 0.1})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(480, 272, 52 + i * 14, 17 + i * 5, world.runTime * (0.12 + i * 0.04), 0, TAU);
    ctx.stroke();
  }
  text(ctx, 'Gather sparks. Spend your light to burn through the dark.', 480, 341, 16, '#efdfc4', 'center', 600);
  text(ctx, 'WASD / ARROWS MOVE     SPACE / CLICK DASH     P PAUSE', 480, 376, 11, '#b8b2d0', 'center', 650);
  ctx.fillStyle = 'rgba(255,177,76,0.14)';
  ctx.strokeStyle = 'rgba(255,195,112,0.72)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 347, 402, 266, 47, 11);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'PRESS ENTER OR CLICK', 480, 425, 14, '#ffe0a6', 'center', 800);
  const best = world.shotMode ? world.best : world.readBest();
  text(ctx, `BEST  ${best.toLocaleString()}`, 480, 485, 13, '#d0c3a2', 'center', 700);
  text(ctx, 'M  SOUND', 480, 514, 10, '#8e8aa8', 'center', 600);
}

function drawLightFalloff(ctx, world) {
  if (world.screen !== SCREEN_PLAY && world.screen !== SCREEN_PAUSE) return;
  const player = world.player;
  const radius = 62 + player.light * 1.24;
  const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 570);
  gradient.addColorStop(0, 'rgba(2,3,12,0)');
  gradient.addColorStop(Math.min(0.84, radius / 570), 'rgba(2,3,12,0.06)');
  gradient.addColorStop(1, 'rgba(2,3,12,0.54)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(4,5,16,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'PAUSED', 480, 239, 39, '#ffe0a6', 'center', 800);
  text(ctx, 'P OR ESC TO RESUME', 480, 287, 13, '#cbc4df', 'center', 700);
}

function drawResults(ctx, world) {
  ctx.fillStyle = 'rgba(4,5,16,0.77)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,100,100,0.28)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#ffd18a';
  ctx.font = '800 42px ui-monospace, monospace';
  ctx.fillText('THE EMBER FADES', 480, 124);
  ctx.shadowBlur = 0;
  ctx.restore();
  text(ctx, 'FINAL SCORE', 480, 190, 12, '#a9a5c2', 'center', 750);
  text(ctx, world.score.toLocaleString(), 480, 228, 39, '#ffe1a0', 'center', 800);
  text(ctx, `BEST  ${world.best.toLocaleString()}`, 480, 271, 16, '#d8c99e', 'center', 750);
  ctx.strokeStyle = 'rgba(196,177,230,0.2)';
  ctx.beginPath();
  ctx.moveTo(343, 304);
  ctx.lineTo(617, 304);
  ctx.stroke();
  text(ctx, `WAVE REACHED   ${world.wave}`, 480, 337, 15, '#f2e9dd', 'center', 700);
  text(ctx, `WISPS DISSOLVED   ${world.wispsDissolved}`, 480, 369, 15, '#e5c4ff', 'center', 700);
  text(ctx, `SPARKS COLLECTED   ${world.sparksCollected}`, 480, 401, 15, '#a8f4ff', 'center', 700);
  ctx.fillStyle = 'rgba(255,177,76,0.14)';
  ctx.strokeStyle = 'rgba(255,195,112,0.72)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 353, 433, 254, 44, 10);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'R OR CLICK TO PLAY AGAIN', 480, 455, 13, '#ffe0a6', 'center', 800);
}

export function render(ctx, world, width = FIELD.width, height = FIELD.height) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, world);
  const offsetX = world.shake ? (Math.sin(world.runTime * 73) * world.shake) : 0;
  const offsetY = world.shake ? (Math.cos(world.runTime * 61) * world.shake) : 0;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  drawGusts(ctx, world);
  for (const spark of world.sparks) if (spark.alive) drawSpark(ctx, spark, world.runTime);
  for (const power of world.powerups) {
    const pulse = 1 + Math.sin(world.runTime * 5 + power.phase) * 0.12;
    const color = power.type === 'shield' ? '#7cefff' : power.type === 'magnet' ? '#d88cff' : '#b2ffb6';
    glow(ctx, power.x, power.y, 24, `${color}55`, 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(power.x, power.y, power.radius * pulse, 0, TAU);
    ctx.stroke();
    text(ctx, power.type === 'shield' ? 'S' : power.type === 'magnet' ? 'M' : 'T', power.x, power.y, 10, color, 'center', 800);
  }
  for (const wisp of world.wisps) if (wisp.alive) drawWisp(ctx, wisp, world.runTime);
  for (const orb of world.orbs) {
    glow(ctx, orb.x, orb.y, 20, 'rgba(169,94,255,0.32)', 1);
    ctx.fillStyle = '#bc88ff';
    ctx.strokeStyle = '#f0d7ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  drawPlayer(ctx, world);
  drawEffects(ctx, world);
  ctx.restore();

  drawLightFalloff(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSE) drawHud(ctx, world);
  if (world.screen === SCREEN_PAUSE) drawPause(ctx);
  if (world.screen === SCREEN_RESULTS) drawResults(ctx, world);
  if (world.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,42,76,${world.hitFlash * 0.14})`;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}
