import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Moodle Test Editor",
  description: "Create, edit, import and export Moodle quiz questions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Sidebar />
        <main className="md:ml-64 min-h-screen">
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
