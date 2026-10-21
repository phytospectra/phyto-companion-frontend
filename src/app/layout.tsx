import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/phyto/theme-provider";
import { QueryProvider } from "@/components/phyto/query-provider";
import { MockProvider } from "@/components/phyto/mock-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Phytospectra — an honest companion for natural product discovery",
  description:
    "Phytospectra takes complex plant extract spectra and produces evidence-graded structural and biological hypotheses. Every claim carries a verdict badge; every candidate is one click from its evidence.",
  keywords: [
    "natural products",
    "drug discovery",
    "NMR",
    "LC-MS",
    "metabolomics",
    "phytochemistry",
  ],
  authors: [{ name: "Phytospectra" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <MockProvider>
              {children}
              <Toaster />
            </MockProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
