"use client";
import UploadMateriSection from "./UploadMateriSection";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface GuruSession {
  guruId: string;
  nama: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [guru, setGuru] = useState<GuruSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "ok") {
          router.push("/login");
          return;
        }
        setGuru(data.guru);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat...</p>
      </main>
    );
  }

  if (!guru) return null;

  const inisial = guru.nama
    .split(" ")
    .map((k) => k[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <span className="text-lg font-semibold text-gray-900">
          📚 Quiz Generator App
        </span>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 transition"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {inisial}
            </span>
            <span className="text-left">
              <span className="block text-sm font-medium text-gray-900">{guru.nama}</span>
              <span className="block text-xs text-gray-400">Guru</span>
            </span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg z-10">
              <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
                {guru.email}
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-gray-200 bg-white p-4">
          <nav className="space-y-1">
            <a
              href="#"
              className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700"
            >
              🏠 Dashboard
            </a>
            <button
              onClick={() => setShowUpload(true)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              📤 Upload Materi
            </button>
            <span className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 cursor-not-allowed">
              📝 Riwayat Kuis
            </span>
          </nav>
        </aside>

        {/* Konten */}
        <main className="flex-1 p-6 md:p-8">
          <h1 className="text-2xl font-bold">👋 Halo, {guru.nama}!</h1>
          <p className="mt-1 text-gray-500">
            Kelola materi dan kuis kamu di sini.
          </p>

          {!showUpload ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-lg">
                  📤
                </span>
                <h2 className="font-semibold text-gray-900">Upload Materi</h2>
                <p className="text-sm text-gray-500">
                  Foto materi pelajaran, sistem akan generate soal otomatis.
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
                >
                  Buka →
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3 opacity-50">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-lg">
                  📝
                </span>
                <h2 className="font-semibold text-gray-900">Riwayat Kuis</h2>
                <p className="text-sm text-gray-500">
                  Lihat kuis yang pernah dibuat dan hasil skor siswa.
                </p>
                <button
                  disabled
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
                >
                  Segera hadir
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <button
                onClick={() => setShowUpload(false)}
                className="mb-4 text-sm text-gray-500 hover:text-gray-800"
              >
                ← Kembali
              </button>
              <UploadMateriSection guruEmail={guru.email} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
