import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

import "./globals.css";

// tres familias para as mensagens: cada folha traz uma caligrafia diferente
const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const displayAlt = Playfair_Display({
  variable: "--font-display-alt",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const hand = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
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
