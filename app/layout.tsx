import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduSnap — Platform Pembelajaran & Kuis Interaktif SD",
  description: "Ubah foto materi buku pelajaran SD menjadi kuis interaktif cerdas untuk guru dan siswa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col font-sans selection:bg-sky-100 selection:text-sky-800">
        {children}
      </body>
    </html>
  );
}
