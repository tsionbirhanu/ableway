import type { Metadata } from "next";
import { SkipLink } from "@/components/skip-link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ableway",
  description: "Learn skills and find work. Use your voice or your keyboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SkipLink targetId="main" />
        {children}
      </body>
    </html>
  );
}
