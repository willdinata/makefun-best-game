const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']);

export class Input {
  constructor(canvas, onStart, onPause, onRestart, onMute) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 480, y: 270, active: false, down: false };
    this.canvas = canvas;
    this.onStart = onStart;
    this.onPause = onPause;
    this.onRestart = onRestart;
    this.onMute = onMute;
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (event) => {
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
      if (!this.keys.has(event.key)) this.pressed.add(event.key);
      this.keys.add(event.key);
      if (event.repeat) return;
      if (event.key === 'Enter' && this.onStart()) return;
      if (event.key.toLowerCase() === 'p' || event.key === 'Escape') this.onPause();
      if (event.key.toLowerCase() === 'r') this.onRestart();
      if (event.key.toLowerCase() === 'm') this.onMute();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key));
    window.addEventListener('blur', () => this.keys.clear());
    this.canvas.addEventListener('pointermove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const scale = Math.min(rect.width / 960, rect.height / 540);
      const left = rect.left + (rect.width - 960 * scale) / 2;
      const top = rect.top + (rect.height - 540 * scale) / 2;
      this.mouse.x = (event.clientX - left) / scale;
      this.mouse.y = (event.clientY - top) / scale;
      this.mouse.active = true;
    });
    this.canvas.addEventListener('pointerdown', () => {
      this.mouse.down = true;
      if (this.onStart()) return;
      this.pressed.add('MouseDash');
    });
    window.addEventListener('pointerup', () => { this.mouse.down = false; });
  }

  movement() {
    let x = 0;
    let y = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('w')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('s')) y += 1;
    if (x || y) {
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    }
    if (this.mouse.down && this.mouse.active) return { x: this.mouse.x, y: this.mouse.y, target: true };
    return { x: 0, y: 0 };
  }

  consumeDash() {
    const dash = this.pressed.has(' ') || this.pressed.has('MouseDash');
    this.pressed.delete(' ');
    this.pressed.delete('MouseDash');
    return dash;
  }

  endFrame() {
    this.pressed.clear();
  }
}

export { MOVE_KEYS };
