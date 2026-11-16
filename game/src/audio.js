export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.ambient = null;
    this.ambientGain = null;
  }

  start() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.25;
      this.master.connect(this.context.destination);
      this.startAmbient();
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  startAmbient() {
    const ctx = this.context;
    this.ambient = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    this.ambientGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    this.ambient.type = 'sine';
    overtone.type = 'triangle';
    this.ambient.frequency.value = 55;
    overtone.frequency.value = 82.4;
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    this.ambientGain.gain.value = 0.035;
    this.ambient.connect(filter);
    overtone.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.master);
    this.ambient.start();
    overtone.start();
  }

  tone(frequency, duration, type = 'sine', volume = 0.2, slide = 0) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration);
  }

  collect(combo = 1) { this.tone(470 + Math.min(combo, 8) * 55, 0.12, 'sine', 0.14, 220); }
  dash() { this.tone(360, 0.22, 'triangle', 0.2, -255); }
  dissolve() { this.tone(760, 0.24, 'sine', 0.17, 430); }
  hit() { this.tone(130, 0.42, 'sawtooth', 0.3, -75); }
  wave() {
    [440, 554, 659, 880].forEach((note, index) => {
      setTimeout(() => this.tone(note, 0.32, 'sine', 0.14), index * 110);
    });
  }
  gameOver() { this.tone(96, 1.1, 'triangle', 0.22, -42); }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.25, this.context.currentTime, 0.03);
    return this.muted;
  }
}
