import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP nonce is attached by middleware (x-trak-nonce) and applied to Next's
  // inline scripts via the html nonce attribute (AUDIT_08 §Security headers).
  const h = await headers();
  const nonce = h.get("x-trak-nonce") ?? undefined;

  return (
    <html
      lang="en"
      nonce={nonce}
      suppressHydrationWarning
      className={`${fraunces.variable} ${archivo.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('trak-theme');
                let isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased text-foreground bg-background">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
