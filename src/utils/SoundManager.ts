// Simple procedural sound generator using Web Audio API
// No external assets required.

class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;

    constructor() {
        this.init();
    }

    private init() {
        if (typeof window !== 'undefined') {
            const maybeWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
            const AudioContextClass = window.AudioContext || maybeWindow.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = 0.3; // Master volume
            }
        }
    }

    private ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
    }

    public resume() {
        this.ensureContext();
    }

    public toggleMute(muted: boolean) {
        this.enabled = !muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.3, this.ctx!.currentTime, 0.1);
        }
    }

    // Play a gentle wind chime sound
    public playHover(intensity: number = 0.5) {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        // Don't force resume on hover to avoid warnings
        if (this.ctx.state !== 'running') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Pentatonic scale frequenciesish for pleasant randomness
        const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5, D5, E5, G5, A5
        const freq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)] * (1 + (Math.random() * 0.01)); // Slight detune

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 2, this.ctx.currentTime); // High pitch for tiny leaves

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05 * intensity, this.ctx.currentTime + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3); // Decay

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    public playClick() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        this.ensureContext();

        // Create a richer bell sound with 2 harmonics
        const t = this.ctx.currentTime;
        const fundamental = 440; // A4

        [1, 1.5].forEach((ratio, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = i === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(fundamental * ratio, t);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1 / (i + 1), t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(t);
            osc.stop(t + 1.5);
        });
    }

    public playRegenerate() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        this.ensureContext();

        // Upward arpeggio swell
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major chord

        notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            const startTime = now + i * 0.1;
            const stopTime = startTime + 2.0;

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.05, startTime + 0.5);
            gain.gain.linearRampToValueAtTime(0, stopTime);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(stopTime);
        });
    }
}

export const soundManager = new SoundManager();
