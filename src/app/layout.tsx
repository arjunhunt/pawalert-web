import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PawAlert - Community Stray Dog Welfare Network",
  description:
    "Real-time alerts connecting local feeders and dog lovers with stray dogs needing food, medical care, and rescue.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-darkBg text-neutral-100 antialiased min-h-screen flex flex-col selection:bg-pawAmber selection:text-white">
        {children}
      </body>
    </html>
  );
}
