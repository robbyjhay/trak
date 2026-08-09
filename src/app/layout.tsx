import type { Metadata, Viewport } from "next";
import { Archivo, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Fraunces — display / heading serif.
 * Prototype: weights 400/600/700 roman + 500 italic, optical sizing 9..144.
 * next/font only allows `axes` (opsz) with the variable font; weight range
 * still covers the prototype’s discrete weights.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

/**
 * Archivo — interface sans (400/500/600/700/800).
 */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

/**
 * JetBrains Mono — metadata / technical values (weight 500).
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trak — Digital Learning Unit",
  description:
    "The Digital Learning Unit's activity & operations register — PSSDC, Lagos State Government.",
  applicationName: "Trak",
};

export const viewport: Viewport = {
  themeColor: "#0d1d1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
