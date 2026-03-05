import { Howl } from "howler";

type SoundKey = "hover" | "random" | "favorite" | "click";

function createSound(src: string[], volume: number, loop = false) {
  return new Howl({
    src,
    volume,
    loop,
    preload: true,
    onloaderror: () => undefined,
    onplayerror: () => undefined,
  });
}

export class Soundscape {
  private ambient: Howl | null = null;

  private sounds: Record<SoundKey, Howl> | null = null;

  private startedAmbient = false;

  private ensureLoaded() {
    if (!this.ambient) {
      this.ambient = createSound(["/audio/ambient-loop.mp3"], 0.16, true);
    }

    if (!this.sounds) {
      this.sounds = {
        hover: createSound(["/sounds/wind-chime-single.mp3"], 0.15),
        click: createSound(["/sounds/leaf-rustle.mp3"], 0.3),
        random: createSound(["/audio/quote-random.mp3"], 0.16),
        favorite: createSound(["/audio/favorite-soft.mp3"], 0.18),
      };
    }
  }

  startAmbient() {
    if (this.startedAmbient) {
      return;
    }

    this.ensureLoaded();
    this.startedAmbient = true;
    this.ambient?.play();
  }

  play(key: SoundKey) {
    this.ensureLoaded();
    this.sounds?.[key].play();
  }

  stopAll() {
    this.ambient?.stop();
    this.startedAmbient = false;
  }
}

export const soundscape = new Soundscape();
