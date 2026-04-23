import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardBoard — Infinite Whiteboard",
  description: "A self-hosted infinite whiteboard where every sticky note is a card. Rich text, links, images, PDFs, and clipped articles — all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
