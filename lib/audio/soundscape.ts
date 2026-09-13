type SoundKey = "hover" | "random" | "favorite" | "click";

type TimeOfDay = "morning" | "day" | "evening" | "night";

export class Soundscape {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted = false;
  private started = false;
  private currentTimeOfDay: TimeOfDay = "morning";
  private ambientTimer: number | null = null;

  private initAudio() {
    if (this.ctx) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();

    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  setTimeOfDay(variant: TimeOfDay) {
    this.currentTimeOfDay = variant;
  }

  startAmbient() {
    this.initAudio();
    if (!this.ctx || !this.ambientGain) return;

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.18, now + 2.2);

    if (this.started) return;
    this.started = true;

    this.setupWindAndChords();
    this.scheduleNatureElements();
  }

  private setupWindAndChords() {
    if (!this.ctx || !this.ambientGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

    whiteNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ambientGain);

    whiteNoise.start();
    lfo.start();

    const droneNotes = [146.83, 220.0, 293.66, 440.0];
    droneNotes.forEach((freq, idx) => {
      if (!this.ctx || !this.ambientGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.012 / (idx + 1), this.ctx.currentTime);

      const subtleLfo = this.ctx.createOscillator();
      const subtleLfoGain = this.ctx.createGain();
      subtleLfo.frequency.setValueAtTime(0.08 + idx * 0.03, this.ctx.currentTime);
      subtleLfoGain.gain.setValueAtTime(0.005 / (idx + 1), this.ctx.currentTime);
      subtleLfo.connect(subtleLfoGain);
      subtleLfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start();
      subtleLfo.start();
    });
  }

  private scheduleNatureElements() {
    if (!this.started) return;

    const delay = 4000 + Math.random() * 6000;
    this.ambientTimer = window.setTimeout(() => {
      this.playNatureSound();
      this.scheduleNatureElements();
    }, delay);
  }

  private playNatureSound() {
    if (!this.ctx || !this.ambientGain || this.isMuted) return;

    if (this.currentTimeOfDay === "night") {
      this.playCricket();
    } else if (this.currentTimeOfDay === "evening") {
      if (Math.random() > 0.5) {
        this.playWindChime();
      } else {
        this.playCricket();
      }
    } else {
      if (Math.random() > 0.4) {
        this.playBirdChirp();
      } else {
        this.playWindChime();
      }
    }
  }

  private playBirdChirp() {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const baseFreq = 2200 + Math.random() * 600;

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.16);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  private playCricket() {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.06;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(4600 + Math.random() * 200, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.018, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  private playWindChime() {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 783.99, 987.77, 1318.51];
    const freq = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 1.85);
  }

  play(key: SoundKey) {
    this.initAudio();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    switch (key) {
      case "hover": {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.09);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }
      case "click": {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.19);
        break;
      }
      case "random": {
        [440, 554.37, 659.25].forEach((freq, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.06;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.06, t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.58);
        });
        break;
      }
      case "favorite": {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.07;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.07, t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.75);
        });
        break;
      }
    }
  }

  stopAll() {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
    this.ambientGain.gain.linearRampToValueAtTime(0, now + 0.5);

    if (this.ambientTimer) {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.started = false;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.15);
  }
}

export const soundscape = new Soundscape();
