import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: { default: "MountCrypto", template: "%s | MountCrypto" },
  description: "Markets at a glance — stocks, crypto, forex, commodities",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${dmSerifDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
