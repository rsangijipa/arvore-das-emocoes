import { NextResponse } from "next/server";

import { hasTheme, listQuotes } from "@/lib/server/quote-repository";
import type { ThemeFilter } from "@/types/quote";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const theme = (searchParams.get("theme") ?? "all") as ThemeFilter;

  if (!(await hasTheme(theme))) {
    return NextResponse.json({ error: "Tema invalido" }, { status: 400 });
  }

  const quotes = await listQuotes(theme);
  return NextResponse.json({ quotes });
}
