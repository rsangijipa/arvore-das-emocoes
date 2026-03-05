import { NextResponse } from "next/server";

import { listFavorites, saveFavorite } from "@/lib/server/quote-repository";
import type { FavoritePayload } from "@/types/quote";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId obrigatorio" }, { status: 400 });
  }

  const favorites = await listFavorites(sessionId);
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<FavoritePayload>;

  if (!body.sessionId || !body.quoteId || typeof body.isFavorite !== "boolean") {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const favorites = await saveFavorite({
    sessionId: body.sessionId,
    quoteId: body.quoteId,
    isFavorite: body.isFavorite,
  });

  return NextResponse.json({ ok: true, favorites });
}
