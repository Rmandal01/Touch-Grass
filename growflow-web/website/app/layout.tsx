/**
 * layout.tsx
 * ----------
 * Root layout for the GrowFlow website. Sets global metadata and pulls in globals.css
 * (Tailwind + theme). Every page renders inside <body> here.
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowFlow — grow a garden by being productive",
  description:
    "Productive time grows your plant; doomscrolling makes it wilt. A productivity garden.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
