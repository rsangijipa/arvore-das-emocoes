export type RandomGenerator = () => number;

export const createRng = (seed: number): RandomGenerator => {
    let state = seed >>> 0;
    return () => {
        // Numerical Recipes LCG
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 0xffffffff;
    };
};

export const pickFrom = <T>(items: T[], rng: RandomGenerator): T => {
    if (!items.length) throw new Error('Cannot pick from empty array');
    const idx = Math.floor(rng() * items.length);
    return items[idx];
};
