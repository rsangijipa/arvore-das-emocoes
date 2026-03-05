import { Howl } from "howler";

type SoundKey = "hover" | "random" | "favorite";

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
  private ambient = createSound(["/audio/ambient-loop.mp3"], 0.16, true);

  private sounds: Record<SoundKey, Howl> = {
    hover: createSound(["/audio/leaf-hover.mp3"], 0.1),
    random: createSound(["/audio/quote-random.mp3"], 0.16),
    favorite: createSound(["/audio/favorite-soft.mp3"], 0.18),
  };

  private startedAmbient = false;

  startAmbient() {
    if (this.startedAmbient) {
      return;
    }

    this.startedAmbient = true;
    this.ambient.play();
  }

  play(key: SoundKey) {
    this.sounds[key].play();
  }

  stopAll() {
    this.ambient.stop();
    this.startedAmbient = false;
  }
}

export const soundscape = new Soundscape();
