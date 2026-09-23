"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function BottomNavSiswa() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryKode = searchParams.get("kode") || "";
  const queryNama = searchParams.get("nama") || "";
  const queryStr = queryKode && queryNama ? `?kode=${encodeURIComponent(queryKode)}&nama=${encodeURIComponent(queryNama)}` : "";

  const isBeranda = pathname === "/siswa" || pathname === "/";
  const isSoal = pathname.startsWith("/kuis") || pathname === "/join";
  const isHasil = pathname.includes("/hasil") || (pathname === "/siswa" && searchParams.get("tab") === "hasil");

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-sky-100 shadow-lg py-2 px-6">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Beranda */}
        <Link
          href={`/siswa${queryStr}`}
          className={`flex flex-col items-center gap-1 transition ${
            isBeranda ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600 font-semibold"
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isBeranda ? "bg-blue-50 text-blue-600" : ""}`}>
            <svg className="w-6 h-6" fill={isBeranda ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="text-[11px]">Beranda</span>
        </Link>

        {/* Soal */}
        <Link
          href={`/siswa${queryStr}`}
          className={`flex flex-col items-center gap-1 transition ${
            isSoal && !isBeranda ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600 font-semibold"
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isSoal && !isBeranda ? "bg-blue-50 text-blue-600" : ""}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-[11px]">Soal</span>
        </Link>

        {/* Hasil */}
        <Link
          href={`/siswa${queryStr}&tab=hasil`}
          className={`flex flex-col items-center gap-1 transition ${
            isHasil ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600 font-semibold"
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isHasil ? "bg-blue-50 text-blue-600" : ""}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <span className="text-[11px]">Hasil</span>
        </Link>
      </div>
    </div>
  );
}
