import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Graph",
  description: "A workspace for graph plotting.",
};

const menuItems = [
  { label: "Home", href: "/" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav aria-label="Main navigation">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
