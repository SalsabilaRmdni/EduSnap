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
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-800">
        {children}
      </body>
    </html>
  );
}
