import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** nome proprio do app: evita reaproveitar um app admin de outra configuracao */
const APP_NAME = "arvore-das-emocoes";

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function hasCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function getAdminApp(): App | null {
  if (!hasCredentials()) {
    return null;
  }

  if (getApps().some((app) => app.name === APP_NAME)) {
    return getApp(APP_NAME);
  }

  return initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID as string,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY as string),
      }),
    },
    APP_NAME,
  );
}

/**
 * Consulta pura: apenas verifica as variaveis de ambiente, sem inicializar nada.
 * A versao anterior chamava `getAdminApp()` e inicializava o app como efeito
 * colateral de uma funcao com cara de leitura.
 */
export function isFirebaseAdminConfigured(): boolean {
  return hasCredentials();
}

export function getFirebaseAdminDb() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

/**
 * Valida o ID token do Firebase e devolve o UID.
 *
 * Devolve `null` quando o token e invalido. Devolve `"unverified"` quando o
 * Firebase Admin nao esta configurado — nesse modo o backend roda em memoria,
 * sem dados reais de ninguem, e exigir token deixaria a aplicacao inutilizavel
 * em desenvolvimento.
 */
export async function verifySessionToken(
  authorizationHeader: string | null,
): Promise<string | null | "unverified"> {
  const app = getAdminApp();
  if (!app) {
    return "unverified";
  }

  const token = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : null;

  if (!token) {
    return null;
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
