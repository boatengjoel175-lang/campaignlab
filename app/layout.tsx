import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampaignLab",
  description: "Live marketing campaign simulator for university classrooms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
