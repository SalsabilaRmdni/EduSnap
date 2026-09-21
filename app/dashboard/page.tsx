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
  const [activeTab, setActiveTab] = useState<"home" | "upload" | "riwayat">("home");
  const [sesiList, setSesiList] = useState<Array<{
    _id: string;
    kode_unik: string;
    judul_kuis: string;
    mata_pelajaran: string;
    tingkat_kelas: string;
    soal: unknown[];
    createdAt: string;
  }>>([]);
  const [loadingSesi, setLoadingSesi] = useState(false);
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
    if (activeTab === "riwayat") {
      setLoadingSesi(true);
      fetch("/api/sesi")
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "ok") {
            setSesiList(data.sesiList || []);
          }
        })
        .finally(() => setLoadingSesi(false));
    }
  }, [activeTab]);

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
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Memuat data guru...</p>
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
        <span className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📚</span>
          <span>EduSnap — Quiz Generator</span>
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
        <aside className="hidden md:block w-56 shrink-0 border-r border-gray-200 bg-white p-4 min-h-[calc(100vh-61px)]">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === "home"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              🏠 Dashboard
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === "upload"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              📤 Upload Materi Buku
            </button>
            <button
              onClick={() => setActiveTab("riwayat")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === "riwayat"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              📝 Riwayat Sesi Kuis
            </button>
          </nav>
        </aside>

        {/* Konten */}
        <main className="flex-1 p-6 md:p-8">
          {activeTab === "home" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900">👋 Halo, {guru.nama}!</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Selamat datang di portal guru. Buat kuis interaktif dari foto buku pelajaran SD dalam hitungan detik.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3 shadow-sm hover:border-indigo-300 transition">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                    📤
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">Upload Materi Buku SD</h2>
                  <p className="text-sm text-gray-500">
                    Foto buku pelajaran anak, ekstrak teks dengan OCR, dan buat butir soal otomatis oleh AI.
                  </p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Mulai Upload Foto →
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3 shadow-sm hover:border-indigo-300 transition">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                    📊
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">Riwayat & Rekap Nilai</h2>
                  <p className="text-sm text-gray-500">
                    Pantau sesi kuis yang pernah kamu bagikan ke siswa dan periksa perolehan nilai mereka.
                  </p>
                  <button
                    onClick={() => setActiveTab("riwayat")}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Buka Rekap Nilai →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab("home")}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                ← Kembali ke Ringkasan
              </button>
              <UploadMateriSection guruEmail={guru.email} />
            </div>
          )}

          {activeTab === "riwayat" && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Riwayat Sesi Kuis</h1>
                  <p className="text-xs text-gray-500">
                    Daftar sesi kuis yang telah dibuat dan siap dikerjakan siswa
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  + Buat Kuis Baru
                </button>
              </div>

              {loadingSesi ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Memuat daftar sesi...
                </div>
              ) : sesiList.length > 0 ? (
                <div className="grid gap-4">
                  {sesiList.map((s) => (
                    <div
                      key={s._id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-200 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                            {s.tingkat_kelas || "SD"}
                          </span>
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                            {s.mata_pelajaran || "Tematik"}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">{s.judul_kuis}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>Kode Kuis: <strong className="text-indigo-600 tracking-wider uppercase">{s.kode_unik}</strong></span>
                          <span>•</span>
                          <span>{s.soal?.length || 0} Soal</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/join?kode=${s.kode_unik}`
                            );
                            alert(`Link kuis ${s.kode_unik} disalin ke clipboard!`);
                          }}
                          className="flex-1 sm:flex-initial rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition text-center"
                        >
                          📋 Salin Link
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/sesi/${s.kode_unik}`)}
                          className="flex-1 sm:flex-initial rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition text-center shadow-sm"
                        >
                          📊 Rekap Nilai →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3">
                  <span className="text-4xl">📝</span>
                  <p className="font-semibold text-gray-700">Belum ada sesi kuis yang aktif.</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Upload foto materi buku pelajaran dan buat sesi kuis untuk membagikannya ke siswa!
                  </p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="inline-block rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
                  >
                    Upload Materi Sekarang
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
