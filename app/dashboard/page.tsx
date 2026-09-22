"use client";

import UploadMateriSection from "./UploadMateriSection";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface GuruSession {
  guruId: string;
  nama: string;
  email: string;
}

interface SesiItem {
  _id: string;
  kode_unik: string;
  judul_kuis: string;
  mata_pelajaran: string;
  tingkat_kelas: string;
  soal: unknown[];
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [guru, setGuru] = useState<GuruSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "upload" | "riwayat">("home");
  const [sesiList, setSesiList] = useState<SesiItem[]>([]);
  const [loadingSesi, setLoadingSesi] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (activeTab === "riwayat" || activeTab === "home") {
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

  const handleCopyLink = (kode: string) => {
    const url = `${window.location.origin}/join?kode=${kode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(kode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black mx-auto animate-pulse">
            📚
          </div>
          <p className="text-sm font-semibold text-slate-500">Memuat Portal Guru EduSnap...</p>
        </div>
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-200">
                📚
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900">
                  Edu<span className="text-indigo-600">Snap</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                  Portal Guru
                </span>
              </div>
            </Link>
          </div>

          {/* Profile & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-100 transition"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm">
                {inisial}
              </span>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-slate-900">{guru.nama}</span>
                <span className="block text-[10px] text-slate-400">Pendidik SD</span>
              </div>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-40 space-y-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{guru.nama}</p>
                  <p className="text-[11px] text-slate-400 truncate">{guru.email}</p>
                </div>
                <Link
                  href="/dashboard/kelas"
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>👥</span> Kelola Kelas & Siswa
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition"
                >
                  <span>🚪</span> Keluar (Logout)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200/80 bg-white p-4 space-y-6 min-h-[calc(100vh-64px)]">
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                activeTab === "home"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">🏠</span>
              <span>Dashboard Utama</span>
            </button>

            <Link
              href="/dashboard/kelas"
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              <span className="text-base">👥</span>
              <span>Kelola Kelas & Siswa</span>
            </Link>

            <button
              onClick={() => setActiveTab("upload")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                activeTab === "upload"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">📷</span>
              <span>Foto & Upload Materi</span>
            </button>

            <button
              onClick={() => setActiveTab("riwayat")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                activeTab === "riwayat"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">📊</span>
              <span>Riwayat Kuis & Rekap</span>
            </button>
          </nav>

          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 space-y-2">
            <span className="text-xs font-bold text-indigo-900 block">💡 Tips Penggunaan</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Buka menu <strong>Kelola Kelas</strong> untuk melihat <strong>Kode Akses Kelas</strong> yang dapat dibagikan kepada siswa Anda.
            </p>
          </div>
        </aside>

        {/* Mobile Drawer (Responsive Menu) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-4/5 max-w-xs bg-white h-full p-5 space-y-6 shadow-2xl flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="font-extrabold text-base text-slate-900">Menu Guru</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 p-1">✕</button>
                </div>
                <nav className="space-y-2">
                  <button
                    onClick={() => { setActiveTab("home"); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold ${
                      activeTab === "home" ? "bg-indigo-600 text-white" : "text-slate-700 bg-slate-50"
                    }`}
                  >
                    <span>🏠</span> Dashboard Utama
                  </button>
                  <Link
                    href="/dashboard/kelas"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 bg-slate-50"
                  >
                    <span>👥</span> Kelola Kelas & Siswa
                  </Link>
                  <button
                    onClick={() => { setActiveTab("upload"); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold ${
                      activeTab === "upload" ? "bg-indigo-600 text-white" : "text-slate-700 bg-slate-50"
                    }`}
                  >
                    <span>📷</span> Foto & Upload Materi
                  </button>
                  <button
                    onClick={() => { setActiveTab("riwayat"); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold ${
                      activeTab === "riwayat" ? "bg-indigo-600 text-white" : "text-slate-700 bg-slate-50"
                    }`}
                  >
                    <span>📊</span> Riwayat Kuis & Rekap
                  </button>
                </nav>
              </div>

              <button
                onClick={handleLogout}
                className="w-full rounded-xl bg-red-50 text-red-600 font-bold text-xs py-3 text-center"
              >
                🚪 Keluar dari Akun
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 p-6 sm:p-8 text-white shadow-lg shadow-indigo-600/10 flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 text-white font-bold px-3 py-1 rounded-full text-xs">
                    <span>🌟</span> Portal Edukasi Cerdas
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Selamat Datang, {guru.nama}! 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                    Ubah foto buku materi pelajaran SD menjadi kuis interaktif secara otomatis. Siswa dapat mengerjakan kuis hanya menggunakan nama dan kode kelas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="rounded-xl bg-white text-indigo-700 font-bold px-5 py-3 text-xs shadow-sm hover:bg-indigo-50 active:scale-95 transition"
                  >
                    📷 Foto Materi Sekarang
                  </button>
                  <Link
                    href="/dashboard/kelas"
                    className="rounded-xl bg-indigo-500/50 hover:bg-indigo-500/70 border border-white/20 text-white font-bold px-5 py-3 text-xs transition"
                  >
                    👥 Kelola Kelas
                  </Link>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black">
                      📷
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Upload & Foto Materi Buku</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Ambil foto buku materi via kamera HP atau upload file. OCR mengekstrak teks otomatis dan AI menyusun butir soal kuis.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition"
                  >
                    <span>Mulai Unggah Materi</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-black">
                      👥
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Kelola Kelas & Bagikan Kode</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Daftarkan nama siswa dan dapatkan <strong>Kode Akses Kelas</strong> tetap (misal: 4A-X7K9) untuk dibagikan ke siswa Anda.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/kelas"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                  >
                    <span>Buka Kelola Kelas & Kode</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Sesi Kuis Terbaru Section */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Sesi Kuis Aktif Terbaru</h3>
                    <p className="text-xs text-slate-400">Daftar kuis yang siap dikerjakan oleh siswa</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("riwayat")}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Lihat Semua ({sesiList.length}) →
                  </button>
                </div>

                {loadingSesi ? (
                  <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                    Memuat daftar kuis...
                  </div>
                ) : sesiList.length === 0 ? (
                  <div className="text-center py-10 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                    <span className="text-3xl">📝</span>
                    <p className="text-sm font-bold text-slate-700">Belum ada sesi kuis yang dibuat</p>
                    <p className="text-xs text-slate-400">Foto materi buku dan buat butir soal kuis pertamamu.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sesiList.slice(0, 3).map((sesi) => (
                      <div key={sesi._id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{sesi.judul_kuis}</span>
                            <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[10px] px-2 py-0.5 rounded">
                              {sesi.mata_pelajaran}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Kode Kuis: <strong className="font-mono text-slate-700 font-bold">{sesi.kode_unik}</strong> • {sesi.soal.length} Soal
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(sesi.kode_unik)}
                            className="rounded-xl border border-slate-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                          >
                            {copiedCode === sesi.kode_unik ? "✅ Tersalin!" : "📋 Salin Link"}
                          </button>
                          <Link
                            href={`/dashboard/sesi/${sesi.kode_unik}`}
                            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition"
                          >
                            📊 Rekap Nilai
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveTab("home")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  ← Kembali ke Dashboard Utama
                </button>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Langkah 1: Unggah Materi
                </span>
              </div>
              <UploadMateriSection guruEmail={guru.email} />
            </div>
          )}

          {activeTab === "riwayat" && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Riwayat Sesi Kuis</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Daftar semua kuis yang pernah Anda buat untuk siswa</p>
                </div>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  + Buat Kuis Baru
                </button>
              </div>

              {loadingSesi ? (
                <div className="p-12 text-center text-xs text-slate-400">Memuat riwayat kuis...</div>
              ) : sesiList.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-3">
                  <span className="text-4xl">📝</span>
                  <p className="font-bold text-slate-800">Belum ada riwayat kuis</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Mulai dengan mengunggah atau memotret halaman buku materi Anda untuk membuat soal pertama.
                  </p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white"
                  >
                    Foto Materi Baru →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sesiList.map((s) => (
                    <div
                      key={s._id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-300 transition flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{s.judul_kuis}</span>
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {s.mata_pelajaran}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {s.tingkat_kelas}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Kode Akses: <strong className="font-mono text-indigo-600 font-extrabold">{s.kode_unik}</strong> • {s.soal.length} Soal • Dibuat: {new Date(s.createdAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(s.kode_unik)}
                          className="rounded-xl border border-slate-300 hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition"
                        >
                          {copiedCode === s.kode_unik ? "✅ Tersalin!" : "📋 Salin Link"}
                        </button>
                        <Link
                          href={`/dashboard/sesi/${s.kode_unik}`}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                        >
                          📊 Rekap Nilai Siswa →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
