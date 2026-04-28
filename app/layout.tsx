import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/Toast";
import KeepAlive from "@/components/KeepAlive";

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
      <body>
        {children}
        <ToastContainer />
        <KeepAlive />
      </body>
    </html>
  );
}
