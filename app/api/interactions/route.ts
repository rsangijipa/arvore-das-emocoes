import { NextResponse } from "next/server";

import { registerInteractions } from "@/lib/server/quote-repository";
import type { InteractionPayload } from "@/types/quote";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<InteractionPayload> | Array<Partial<InteractionPayload>>;
  const payloads = Array.isArray(body) ? body : [body];

  const isValidPayload = (payload: Partial<InteractionPayload>) => Boolean(payload.sessionId && payload.actionType);

  if (!payloads.every(isValidPayload)) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  await registerInteractions(
    payloads.map((payload) => ({
      sessionId: payload.sessionId as string,
      actionType: payload.actionType as InteractionPayload["actionType"],
      quoteId: payload.quoteId,
      theme: payload.theme,
    })),
  );

  return NextResponse.json({ ok: true });
}
