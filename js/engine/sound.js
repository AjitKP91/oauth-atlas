// ==========================================================================
// OAUTH ATLAS — Tactile Web Audio API Synthesizer (Opt-In Audio Cues)
// ==========================================================================

class SoundEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this._ensureCtx();
      this.playTone('back');
    }
    return this.enabled;
  }

  _ensureCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(channel = 'back') {
    if (!this.enabled) return;
    this._ensureCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (channel === 'attack') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
      return;
    }

    const freqs = {
      front: [440, 554.37],
      back: [523.25, 659.25],
      oob: [587.33, 880],
      local: [392, 493.88],
      success: [523.25, 659.25, 783.99]
    };

    const notes = freqs[channel] || freqs.back;
    notes.forEach((f, idx) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      const t0 = now + idx * 0.055;
      o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.045, t0);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.26);
      o.connect(g).connect(this.ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.27);
    });
  }
}

export const sound = new SoundEngine();
