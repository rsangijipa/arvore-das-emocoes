import type { Quote, ThemeFilter } from "@/types/quote";

type QuotesResponse = {
  quotes: Quote[];
};

export async function fetchQuotesByTheme(theme: ThemeFilter): Promise<QuotesResponse> {
  const response = await fetch(`/api/quotes/by-theme?theme=${theme}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar frases");
  }

  return response.json() as Promise<QuotesResponse>;
}
