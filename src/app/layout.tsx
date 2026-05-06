import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardCanvas — Infinite Whiteboard",
  description: "A self-hosted infinite whiteboard where every sticky note is a card. Rich text, links, images, PDFs, and clipped articles — all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
