import type { Quote, ThemeFilter, ThemeOption } from "@/types/quote";

type QuotesResponse = {
  quotes: Quote[];
  themes: ThemeOption[];
};

export async function fetchQuotesByTheme(theme: ThemeFilter): Promise<QuotesResponse> {
  const response = await fetch(`/api/quotes/by-theme?theme=${theme}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar frases");
  }

  return response.json() as Promise<QuotesResponse>;
}

export async function fetchRandomQuote(
  theme: ThemeFilter,
  excludeId?: string,
): Promise<Quote> {
  const searchParams = new URLSearchParams({ theme });
  if (excludeId) {
    searchParams.set("excludeId", excludeId);
  }

  const response = await fetch(`/api/quotes/random?${searchParams.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Nao foi possivel sortear frase");
  }

  const payload = (await response.json()) as { quote: Quote };
  return payload.quote;
}
