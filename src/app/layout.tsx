import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent Query Composer — Circle Agent Stack",
  description:
    "Decompose an agent query into Marketplace services, estimate USDC nanopayments, and run the flow.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.className} ${outfit.variable} ${geistMono.variable} dark h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden bg-app">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
