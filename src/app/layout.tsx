import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodePad — Mobile & Web Code Editor",
  description: "A fast, distraction-free, mobile-friendly code editor powered by Monaco and Neon DB",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full w-full overflow-hidden antialiased bg-slate-950 text-slate-100 select-none">
        {children}
      </body>
    </html>
  );
}
