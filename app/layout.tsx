import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

import "./globals.css";

// tres familias para as mensagens: cada folha traz uma caligrafia diferente
// preload: true garante que o Next.js injete <link rel="preload"> no <head>
// para evitar o flash de fonte genérica ao abrir o card pela primeira vez
const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: true,
});

const displayAlt = Playfair_Display({
  variable: "--font-display-alt",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  preload: true,
});

const hand = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: true,
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Árvore das Emoções",
  description:
    "Uma árvore 3D gerada do zero a cada visita. Toque nas folhas luminosas para receber mensagens de acolhimento.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1422",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${display.variable} ${displayAlt.variable} ${hand.variable} ${sans.variable} antialiased`}
      >
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
