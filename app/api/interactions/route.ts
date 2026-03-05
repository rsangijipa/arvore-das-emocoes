import { NextResponse } from "next/server";

import { registerInteraction } from "@/lib/server/quote-repository";
import type { InteractionPayload } from "@/types/quote";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<InteractionPayload>;

  if (!body.sessionId || !body.actionType) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  await registerInteraction({
    sessionId: body.sessionId,
    actionType: body.actionType,
    quoteId: body.quoteId,
    theme: body.theme,
  });

  return NextResponse.json({ ok: true });
}
