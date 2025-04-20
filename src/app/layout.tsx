import TopLoader from "@/components/next-top-loader";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";

import type { Metadata } from "next";
import { Nunito } from "next/font/google";

export const metadata: Metadata = {
  title: "EnviroLink",
  description:
    "Take action, support environmental campaigns, and make a real impact in your community. Be part of the movement for a greener future.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <TopLoader />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
