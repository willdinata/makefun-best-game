export function burst(world, x, y, color, count = 14, speed = 120) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const velocity = speed * (0.25 + world.rng() * 0.75);
    world.particles.push({
      x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
      life: 0.35 + world.rng() * 0.55, maxLife: 0.9, size: 1.5 + world.rng() * 3, color,
    });
  }
}

export function floatText(world, text, x, y, color = '#ffe0a2', size = 17) {
  world.floating.push({ text, x, y, color, size, life: 1.05 });
}

export function updateEffects(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const particle = world.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
    particle.life -= dt;
    if (particle.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.floating.length - 1; i >= 0; i -= 1) {
    const text = world.floating[i];
    text.y -= 30 * dt;
    text.life -= dt;
    if (text.life <= 0) world.floating.splice(i, 1);
  }
  world.shake = Math.max(0, world.shake - dt * 22);
  world.hitFlash = Math.max(0, world.hitFlash - dt * 1.8);
}
