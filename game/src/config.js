export const FIELD = Object.freeze({ width: 960, height: 540 });
export const STEP = 1 / 60;
export const COLORS = Object.freeze({
  ink: '#080914',
  amber: '#ffb34e',
  gold: '#ffd889',
  cyan: '#73eaff',
  magenta: '#dc76ff',
  violet: '#8b70ff',
  white: '#f5efff',
  muted: '#a6a2c2',
  red: '#ff647c',
});
export const PLAYER = Object.freeze({
  radius: 11,
  speed: 218,
  dashSpeed: 620,
  dashDuration: 0.19,
  dashCooldown: 0.62,
  dashCost: 17,
  maxLight: 100,
  startLight: 70,
  invulnerable: 1.15,
});
export const WAVE = Object.freeze({
  duration: 17,
  spawnGap: 1.55,
  sparkGap: 1.25,
  maxWisps: 18,
  types: Object.freeze(['drifter', 'chaser', 'weaver', 'splitter', 'spitter']),
});
export const POWER_DURATION = Object.freeze({ magnet: 8, slow: 5 });
