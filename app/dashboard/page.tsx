"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EduSnapLogo from "@/components/EduSnapLogo";
import SchoolIllustration from "@/components/SchoolIllustration";
import UploadMateriSection from "./UploadMateriSection";

interface GuruSession {
  guruId: string;
  nama: string;
  email: string;
}

function formatNamaGuru(nama: string) {
  if (!nama) return "";
  return nama
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface KelasItem {
  _id: string;
  nama_kelas: string;
  kode_kelas: string;
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
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "materi" | "hasil">("dashboard");
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [sesiList, setSesiList] = useState<SesiItem[]>([]);
  const [siswaTotal, setSiswaTotal] = useState<number>(25);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "ok") {
          router.push("/login");
          return;
        }
        setGuru(data.guru);

        // Fetch Kelas Guru
        fetch(`/api/kelas?guruId=${data.guru.guruId}`)
          .then((r) => r.json())
          .then((kData) => {
            if (kData.success && Array.isArray(kData.kelas)) {
              setKelasList(kData.kelas);
              if (kData.kelas.length > 0) {
                // Fetch student count from first class
                fetch(`/api/kelas/${kData.kelas[0]._id}/siswa`)
                  .then((sRes) => sRes.json())
                  .then((sData) => {
                    if (sData.success && Array.isArray(sData.siswa)) {
                      setSiswaTotal(sData.siswa.length);
                    }
                  });
              }
            }
          });

        // Fetch Sesi Kuis
        fetch("/api/sesi")
          .then((r) => r.json())
          .then((sData) => {
            if (sData.status === "ok") {
              setSesiList(sData.sesiList || []);
            }
          });
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-center space-y-3">
          <span className="text-5xl inline-block animate-bounce">📚</span>
          <p className="text-sm font-black text-slate-700">Memuat Dashboard Guru...</p>
        </div>
      </main>
    );
  }

  if (!guru) return null;

  const kelasUtama = kelasList[0] || {
    nama_kelas: "Kelas 4A",
    kode_kelas: "4A-X7K9",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* ======================================= */}
      {/* SIDEBAR GURU (Mengikuti Referensi Screen 6) */}
      {/* ======================================= */}
      <aside className="w-full md:w-56 shrink-0 bg-white border-r border-sky-100 p-4 sm:p-5 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Logo / Brand */}
          <div className="flex items-center justify-between md:justify-start gap-3">
            <Link href="/dashboard">
              <EduSnapLogo size="sm" />
            </Link>

            {/* Logout on mobile */}
            <button
              onClick={handleLogout}
              className="md:hidden text-xs font-bold text-red-500 hover:underline"
            >
              Keluar
            </button>
          </div>

          {/* Teacher Avatar Pill */}
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-purple-50 border border-purple-100">
            <div className="h-10 w-10 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
              👩‍🏫
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-900 truncate">Guru {formatNamaGuru(guru.nama)}</p>
              <p className="text-[10px] font-bold text-purple-700">Guru SD</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible pb-2 md:pb-0 gap-1.5 md:gap-0">
            {/* Dashboard */}
            <button
              onClick={() => setActiveMenu("dashboard")}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-black transition shrink-0 ${
                activeMenu === "dashboard"
                  ? "bg-purple-100 text-purple-800 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </button>

            {/* Kelas */}
            <Link
              href="/dashboard/kelas"
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition shrink-0"
            >
              <span>🏫</span>
              <span>Kelas</span>
            </Link>

            {/* Siswa */}
            <Link
              href="/dashboard/kelas"
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition shrink-0"
            >
              <span>👥</span>
              <span>Siswa</span>
            </Link>

            {/* Materi */}
            <button
              onClick={() => setActiveMenu("materi")}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                activeMenu === "materi"
                  ? "bg-purple-100 text-purple-800 font-black shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📖</span>
              <span>Materi</span>
            </button>

            {/* Soal */}
            <button
              onClick={() => setActiveMenu("materi")}
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition shrink-0"
            >
              <span>📝</span>
              <span>Soal</span>
            </button>

            {/* Hasil */}
            <button
              onClick={() => setActiveMenu("hasil")}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                activeMenu === "hasil"
                  ? "bg-purple-100 text-purple-800 font-black shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📊</span>
              <span>Hasil</span>
            </button>
          </nav>
        </div>

        {/* Desktop Logout Button */}
        <div className="hidden md:block pt-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 py-2.5 px-3 text-xs font-black text-red-600 transition"
          >
            Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* ======================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ======================================= */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl relative overflow-hidden">
        {/* Welcome Greeting (Avatar circle + text) */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-2xl shadow-xs">
            👩‍🏫
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Selamat Datang, Guru {formatNamaGuru(guru.nama)}! 👋
            </h1>
            <p className="text-xs font-bold text-slate-400">
              Kelola kelas dan buat materi kuis buku SD dengan mudah.
            </p>
          </div>
        </div>

        {activeMenu === "dashboard" && (
          <div className="space-y-6">
            {/* Section: Kelas Saya */}
            <div className="space-y-3">
              <h2 className="text-base font-black text-slate-900">
                Kelas Saya
              </h2>

              {/* Card Kelas Saya (Mengikuti Gambar Referensi) */}
              <Link
                href="/dashboard/kelas"
                className="rounded-3xl border-2 border-sky-100 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex items-center justify-between gap-4 block"
              >
                <div className="flex items-center gap-4">
                  {/* School Icon Graphic */}
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shrink-0 shadow-xs">
                    🏫
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900">
                      {kelasUtama.nama_kelas}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      {siswaTotal} Siswa
                    </p>
                    <p className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md inline-block">
                      Kode: {kelasUtama.kode_kelas}
                    </p>
                  </div>
                </div>

                <div className="text-slate-400 font-black text-xl hover:text-slate-600">
                  ›
                </div>
              </Link>

              {/* Big Yellow Button: + Tambah Materi */}
              <button
                onClick={() => setActiveMenu("materi")}
                className="w-full rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 py-4 px-6 text-base font-black text-slate-900 shadow-md shadow-amber-300/40 flex items-center justify-center gap-2 transition"
              >
                <span>+</span>
                <span>Tambah Materi</span>
              </button>
            </div>

            {/* Bottom Graphic: Books & Kid */}
            <div className="pt-6 flex items-end justify-between border-t border-slate-100">
              {/* Stack of books illustration */}
              <div className="flex items-center gap-3">
                <div className="text-4xl">📚</div>
                <div className="text-xs font-bold text-slate-500">
                  <p className="text-slate-800 font-black">Materi Buku Siap Digenerate</p>
                  <p>Ambil foto halaman buku dari kamera HP Anda.</p>
                </div>
              </div>

              {/* Cute School Kid Illustration */}
              <div className="shrink-0 -mb-2">
                <span className="text-6xl inline-block">👧</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Upload/Foto Materi (Screen 8) */}
        {activeMenu === "materi" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveMenu("dashboard")}
                className="h-10 w-10 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 font-black shadow-sm transition active:scale-95"
              >
                ←
              </button>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Tambah Materi
              </h1>
            </div>
            <UploadMateriSection guruEmail={guru.email} />
          </div>
        )}

        {/* Tab Riwayat / Hasil */}
        {activeMenu === "hasil" && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveMenu("dashboard")}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            >
              ← Kembali ke Dashboard
            </button>

            <div className="rounded-3xl border-2 border-sky-100 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900">Hasil & Rekap Nilai Siswa</h2>
              <div className="divide-y divide-slate-100">
                {sesiList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">Belum ada sesi kuis yang dibuat.</p>
                ) : (
                  sesiList.map((s) => (
                    <div key={s._id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{s.judul_kuis}</p>
                        <p className="text-xs text-slate-400">Kode: {s.kode_unik}</p>
                      </div>
                      <Link
                        href={`/dashboard/sesi/${s.kode_unik}`}
                        className="rounded-xl bg-purple-600 text-white font-bold text-xs px-3.5 py-2 hover:bg-purple-700 transition"
                      >
                        Lihat Nilai →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
