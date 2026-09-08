import { NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/firebase/admin";
import { registerInteractions } from "@/lib/server/quote-repository";
import { INTERACTION_ACTIONS, THEME_SLUGS } from "@/types/quote";
import type { InteractionAction, InteractionPayload, ThemeFilter } from "@/types/quote";

/** teto de itens aceitos por requisicao (o batch do Firestore para em 500) */
const MAX_ITEMS = 200;

function isAction(value: unknown): value is InteractionAction {
  return typeof value === "string" && (INTERACTION_ACTIONS as readonly string[]).includes(value);
}

function isTheme(value: unknown): value is ThemeFilter {
  return value === "all" || (typeof value === "string" && (THEME_SLUGS as readonly string[]).includes(value));
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body];

  if (items.length === 0) {
    return NextResponse.json({ ok: true });
  }

  if (items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `Maximo de ${MAX_ITEMS} interacoes por requisicao` },
      { status: 413 },
    );
  }

  const uid = await verifySessionToken(request.headers.get("authorization"));
  if (uid === null) {
    return NextResponse.json({ error: "Sessao nao autenticada" }, { status: 401 });
  }

  const payloads: InteractionPayload[] = [];

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    const candidate = item as Record<string, unknown>;

    // allowlist de verdade: antes bastava `actionType` ser truthy e qualquer
    // string ia parar no Firestore, poluindo a analise depois
    if (!isAction(candidate.actionType)) {
      return NextResponse.json({ error: "actionType invalido" }, { status: 400 });
    }

    if (candidate.theme !== undefined && !isTheme(candidate.theme)) {
      return NextResponse.json({ error: "theme invalido" }, { status: 400 });
    }

    if (
      candidate.quoteId !== undefined &&
      (typeof candidate.quoteId !== "string" || candidate.quoteId.length > 128)
    ) {
      return NextResponse.json({ error: "quoteId invalido" }, { status: 400 });
    }
    if (candidate.emotion !== undefined && (typeof candidate.emotion !== "string" || candidate.emotion.length > 32)) return NextResponse.json({ error: "emotion invalida" }, { status: 400 });
    if (candidate.intensity !== undefined && (typeof candidate.intensity !== "number" || !Number.isInteger(candidate.intensity) || candidate.intensity < 1 || candidate.intensity > 5)) return NextResponse.json({ error: "intensity invalida" }, { status: 400 });
    if (candidate.activityType !== undefined && (typeof candidate.activityType !== "string" || candidate.activityType.length > 32)) return NextResponse.json({ error: "activityType invalido" }, { status: 400 });
    if (candidate.durationMs !== undefined && (typeof candidate.durationMs !== "number" || !Number.isInteger(candidate.durationMs) || candidate.durationMs < 0 || candidate.durationMs > 3600000)) return NextResponse.json({ error: "durationMs invalido" }, { status: 400 });

    const sessionId =
      uid === "unverified"
        ? typeof candidate.sessionId === "string" && candidate.sessionId.length > 0
          ? candidate.sessionId
          : null
        : uid;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId obrigatorio" }, { status: 400 });
    }

    payloads.push({
      sessionId,
      actionType: candidate.actionType,
      quoteId: candidate.quoteId as string | undefined,
      theme: candidate.theme as ThemeFilter | undefined,
      emotion: candidate.emotion as string | undefined,
      intensity: candidate.intensity as number | undefined,
      activityType: candidate.activityType as string | undefined,
      durationMs: candidate.durationMs as number | undefined,
    });
  }

  await registerInteractions(payloads);
  return NextResponse.json({ ok: true });
}
