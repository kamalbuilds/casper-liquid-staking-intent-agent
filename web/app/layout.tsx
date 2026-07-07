import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import StyledComponentsRegistry from "@/lib/StyledComponentsRegistry";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "Liquid Staking Intent Agent",
  description:
    "Turn a plain-language staking intent into a bounded Casper transaction, enforced by an on-chain policy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
        <StyledComponentsRegistry>
          <WalletProvider>{children}</WalletProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
