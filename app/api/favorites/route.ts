import { NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/firebase/admin";
import { listFavorites, saveFavorite } from "@/lib/server/quote-repository";

/**
 * Resolve de quem sao as favoritas desta requisicao.
 *
 * Regra: quando o Firebase Admin esta configurado, o dono e SEMPRE o `uid` do
 * ID token — nunca um id que o cliente mandou no corpo ou na query. Antes esta
 * rota aceitava qualquer `sessionId` em texto puro, o que permitia ler e
 * escrever as favoritas de qualquer pessoa cujo id fosse conhecido.
 */
async function resolveOwner(request: Request, fallbackSessionId: string | null) {
  const uid = await verifySessionToken(request.headers.get("authorization"));

  if (uid === null) {
    return { error: NextResponse.json({ error: "Sessao nao autenticada" }, { status: 401 }) };
  }

  // sem Firebase configurado o backend roda em memoria (modo local/demo)
  if (uid === "unverified") {
    if (!fallbackSessionId) {
      return { error: NextResponse.json({ error: "sessionId obrigatorio" }, { status: 400 }) };
    }
    return { ownerId: fallbackSessionId };
  }

  return { ownerId: uid };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { ownerId, error } = await resolveOwner(request, searchParams.get("sessionId"));

  if (error) {
    return error;
  }

  const favorites = await listFavorites(ownerId as string);
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  let body: { sessionId?: unknown; quoteId?: unknown; isFavorite?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (typeof body.quoteId !== "string" || body.quoteId.length === 0 || body.quoteId.length > 128) {
    return NextResponse.json({ error: "quoteId invalido" }, { status: 400 });
  }

  if (typeof body.isFavorite !== "boolean") {
    return NextResponse.json({ error: "isFavorite invalido" }, { status: 400 });
  }

  const { ownerId, error } = await resolveOwner(
    request,
    typeof body.sessionId === "string" ? body.sessionId : null,
  );

  if (error) {
    return error;
  }

  const favorites = await saveFavorite({
    sessionId: ownerId as string,
    quoteId: body.quoteId,
    isFavorite: body.isFavorite,
  });

  return NextResponse.json({ ok: true, favorites });
}
