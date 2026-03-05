import { NextResponse } from "next/server";

import { hasTheme, randomQuote } from "@/lib/server/quote-repository";
import type { ThemeFilter } from "@/types/quote";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const theme = (searchParams.get("theme") ?? "all") as ThemeFilter;
  const excludeId = searchParams.get("excludeId") ?? undefined;

  if (!(await hasTheme(theme))) {
    return NextResponse.json({ error: "Tema invalido" }, { status: 400 });
  }

  const quote = await randomQuote(theme, excludeId);

  if (!quote) {
    return NextResponse.json({ error: "Nenhuma frase encontrada" }, { status: 404 });
  }

  return NextResponse.json({ quote });
}
