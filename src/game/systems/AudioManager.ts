import type { SettingsData } from '../types';

/**
 * Procedural audio (§36). Rather than ship binary sound files, the vertical
 * slice synthesises everything with the Web Audio API behind named hooks, so
 * real samples can drop in later without touching call sites. Respects the
 * music / sfx / volume / accessibility settings.
 */
export type Sfx =
  | 'tap' | 'kick' | 'pass' | 'shot' | 'net' | 'whistle' | 'cheer'
  | 'groan' | 'notify' | 'paper' | 'success' | 'fail';

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: SettingsData = { music: true, sfx: true, volume: 0.7, reducedMotion: false, reducedShake: false, highContrast: false, leftHanded: false, textScale: 1 };
  private crowdGain: GainNode | null = null;

  init(settings: SettingsData) {
    this.settings = settings;
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Must be called from a user gesture to satisfy autoplay policies. */
  resume() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  setVolume(v: number) {
    this.settings.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  update(settings: SettingsData) {
    this.settings = settings;
    if (this.master) this.master.gain.value = settings.volume;
    if (!settings.sfx) this.crowd(0);
  }

  private beep(freq: number, dur: number, type: OscillatorType, vol = 0.3, slideTo?: number) {
    if (!this.settings.sfx) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private noise(dur: number, vol = 0.3, filterFreq = 1200) {
    if (!this.settings.sfx) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
  }

  play(sfx: Sfx) {
    switch (sfx) {
      case 'tap': this.beep(420, 0.05, 'square', 0.12); break;
      case 'kick': this.noise(0.08, 0.25, 900); this.beep(160, 0.06, 'sine', 0.2, 80); break;
      case 'pass': this.noise(0.06, 0.15, 700); break;
      case 'shot': this.noise(0.1, 0.35, 1400); this.beep(200, 0.09, 'sine', 0.25, 90); break;
      case 'net': this.noise(0.14, 0.2, 500); break;
      case 'whistle': this.beep(2100, 0.18, 'square', 0.14, 2400); break;
      case 'cheer': this.crowdBurst(); break;
      case 'groan': this.noise(0.5, 0.14, 300); this.beep(140, 0.4, 'sine', 0.1, 90); break;
      case 'notify': this.beep(660, 0.08, 'triangle', 0.16); this.beep(880, 0.08, 'triangle', 0.14); break;
      case 'paper': this.noise(0.18, 0.12, 4000); break;
      case 'success': this.beep(523, 0.1, 'triangle', 0.18); setTimeout(() => this.beep(784, 0.14, 'triangle', 0.18), 90); break;
      case 'fail': this.beep(300, 0.14, 'sawtooth', 0.16, 150); break;
    }
  }

  private crowdBurst() {
    if (!this.settings.sfx) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((Math.PI * i) / data.length);
      data[i] = (Math.random() * 2 - 1) * env * 0.6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.value = 0.4;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start();
  }

  /** Ambient crowd murmur loop for the match (level 0..1). */
  crowd(level: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (!this.crowdGain) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 400;
      this.crowdGain = ctx.createGain();
      this.crowdGain.gain.value = 0;
      src.connect(filter); filter.connect(this.crowdGain); this.crowdGain.connect(this.master);
      src.start();
    }
    this.crowdGain.gain.linearRampToValueAtTime(this.settings.sfx ? level * 0.25 : 0, ctx.currentTime + 0.6);
  }
}

export const AudioManager = new Audio();
