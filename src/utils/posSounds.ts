// Web Audio API Sound Synthesizer for POS Operations
// Provides instant, latency-free feedback for scanner beeps, card transactions, and cash register

class POSSoundController {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public toggleSound(enabled?: boolean) {
    this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled;
    return this.soundEnabled;
  }

  public isEnabled() {
    return this.soundEnabled;
  }

  // Barcode / QR Scan Beep (high crisp laser scanner tone)
  public playScanBeep() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio error ignored
    }
  }

  // Barcode / QR Unscan Beep (descending tone indicating item removal from cart)
  public playUnscanBeep() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Audio error ignored
    }
  }

  // Card Terminal NFC Tap Tone (two swift modern beeps)
  public playCardTapTone() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // First beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1480, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1960, now + 0.09);
      gain2.gain.setValueAtTime(0.22, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.18);
    } catch {
      // Audio error ignored
    }
  }

  // Cash Register Drawer Opening / Chime
  public playCashDrawer() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Mechanical latch click
      const oscClick = ctx.createOscillator();
      const gainClick = ctx.createGain();
      oscClick.type = 'triangle';
      oscClick.frequency.setValueAtTime(320, now);
      oscClick.frequency.exponentialRampToValueAtTime(120, now + 0.05);
      gainClick.gain.setValueAtTime(0.25, now);
      gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      oscClick.connect(gainClick);
      gainClick.connect(ctx.destination);
      oscClick.start(now);
      oscClick.stop(now + 0.06);

      // Bell chime (classic cash register bell)
      const oscBell = ctx.createOscillator();
      const gainBell = ctx.createGain();
      oscBell.type = 'sine';
      oscBell.frequency.setValueAtTime(1760, now + 0.04);
      gainBell.gain.setValueAtTime(0.25, now + 0.04);
      gainBell.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      oscBell.connect(gainBell);
      gainBell.connect(ctx.destination);
      oscBell.start(now + 0.04);
      oscBell.stop(now + 0.4);
    } catch {
      // Audio error ignored
    }
  }

  // Payment Completed Success Fanfare
  public playSuccessChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.08;
        const duration = 0.25;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      });
    } catch {
      // Audio error ignored
    }
  }

  // Error / Warning tone
  public playError() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio error ignored
    }
  }
}

export const posSound = new POSSoundController();
