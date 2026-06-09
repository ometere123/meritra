import "./globals.css";
import { Cormorant_SC, Source_Sans_3, Azeret_Mono } from "next/font/google";
import type { Metadata } from "next";
import TopNavigation from "@/components/layout/TopNavigation";
import MeritraFooter from "@/components/layout/MeritraFooter";
import Providers from "./providers";

const heading = Cormorant_SC({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-heading" });
const body = Source_Sans_3({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-body" });
const mono = Azeret_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "MERITRA — Research Grant Reviewer",
  description:
    "Research merit reviewed by evidence, feasibility, and consensus. A GenLayer-powered research grant review and funding suitability layer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <TopNavigation />
          <main className="flex-1">{children}</main>
          <MeritraFooter />
        </Providers>
      </body>
    </html>
  );
}
