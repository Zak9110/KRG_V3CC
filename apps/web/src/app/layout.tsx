import type { Metadata } from "next";
import "./globals.css";
import HtmlAttributes from "../components/HtmlAttributes";

export const metadata: Metadata = {
  title: "KRG e-Visit System",
  description: "Kurdistan Regional Government Electronic Visit Permit System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <HtmlAttributes />
        {children}
      </body>
    </html>
  );
}
