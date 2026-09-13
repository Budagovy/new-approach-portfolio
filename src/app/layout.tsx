import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import { DotPattern } from "@/components/DotPattern";
import "./globals.css";

const sans = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "New Approach — Architecture Portfolio",
  description:
    "New Approach is a small architecture studio for houses, interiors and additions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <DotPattern className="fixed inset-0 -z-10 h-full w-full" />
        {children}
      </body>
    </html>
  );
}
