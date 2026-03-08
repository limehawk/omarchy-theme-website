import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://omarchytheme.com"),
  title: {
    template: "%s | Omarchy Themes",
    default: "Omarchy Themes — Browse & Install Terminal Color Schemes",
  },
  description:
    "Discover, preview, and install terminal color schemes for the Omarchy Linux desktop environment. One-command installation for curated themes.",
  openGraph: {
    title: "Omarchy Themes — Browse & Install Terminal Color Schemes",
    description:
      "Discover, preview, and install terminal color schemes for the Omarchy Linux desktop environment.",
    siteName: "Omarchy Themes",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} ${inter.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
