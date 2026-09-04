/**
 * Namespace do localStorage.
 *
 * O projeto nasceu com o prefixo "harvore." (nome antigo). Renomear sem mais nem
 * menos apagaria as favoritas de quem ja usa o app, entao `migrateLegacyStorage`
 * copia as chaves antigas na primeira abertura e so depois remove.
 */
export const STORAGE_NAMESPACE = "arvore";
const LEGACY_NAMESPACE = "harvore";

export const SESSION_STORAGE_KEY = `${STORAGE_NAMESPACE}.sessionId`;
export const INTRO_STORAGE_KEY = `${STORAGE_NAMESPACE}.onboarding.dismissed`;
export const FAVORITES_PREFIX = `${STORAGE_NAMESPACE}.favorites`;

let migrated = false;

export function migrateLegacyStorage(): void {
  if (migrated || typeof window === "undefined") {
    return;
  }

  migrated = true;

  try {
    const legacyKeys: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(`${LEGACY_NAMESPACE}.`)) {
        legacyKeys.push(key);
      }
    }

    for (const legacyKey of legacyKeys) {
      const nextKey = `${STORAGE_NAMESPACE}.${legacyKey.slice(LEGACY_NAMESPACE.length + 1)}`;
      const value = window.localStorage.getItem(legacyKey);

      // nunca sobrescreve um valor ja migrado
      if (value !== null && window.localStorage.getItem(nextKey) === null) {
        window.localStorage.setItem(nextKey, value);
      }

      window.localStorage.removeItem(legacyKey);
    }
  } catch {
    // localStorage bloqueado (janela privada, cookies desativados): segue sem migrar
  }
}
