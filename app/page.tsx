import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50/70 via-white to-slate-50">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-200">
              📚
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Edu<span className="text-indigo-600">Snap</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                Kuis Buku SD
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/join"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
            >
              <span>🎒</span>
              <span>Masuk Siswa</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition"
            >
              <span>👨‍🏫 Portal Guru</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center text-center space-y-10">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-sm">
            <span>✨</span>
            <span>Platform Kuis Otomatis untuk Sekolah Dasar</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            Ubah Foto Buku Pelajaran Jadi <span className="text-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Kuis Interaktif</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Guru tinggal foto halaman materi buku SD dari HP, sistem membaca teks materi dengan OCR dan AI membuat butir soal otomatis. Siswa SD langsung mengerjakan hanya memakai <strong>Nama + Kode Kelas</strong>!
          </p>
        </div>

        {/* Dua Pengalaman: Siswa & Guru */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl text-left">
          {/* Card Masuk Siswa SD */}
          <div className="relative rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-7 sm:p-8 shadow-xl shadow-amber-500/5 hover:border-amber-400 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl shadow-md shadow-amber-200">
                🎒
              </div>
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
                Pengalaman Siswa SD
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                Masuk Mengerjakan Kuis
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tanpa perlu email atau kata sandi. Cukup masukkan namamu dan kode kelas yang diberikan oleh gurumu untuk mulai belajar!
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-amber-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Format: Nama Siswa + Kode Kelas (Contoh: 4A-X7K9)</span>
              </div>
            </div>

            <Link
              href="/join"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white py-4 px-6 font-black text-base shadow-lg shadow-amber-500/20 transition"
            >
              <span>Mulai Belajar & Kuis 🚀</span>
            </Link>
          </div>

          {/* Card Portal Guru */}
          <div className="relative rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/20 p-7 sm:p-8 shadow-xl shadow-indigo-500/5 hover:border-indigo-300 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shadow-indigo-200">
                👨‍🏫
              </div>
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-md">
                Portal Guru & Pendidik
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                Kelola Kelas & Buat Kuis
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Kelola kelas, daftarkan nama siswa, foto materi pelajaran SD via kamera HP, dan biarkan AI menyusun butir soal pilihan ganda.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>✓ OCR Teks Cepat</span>
                <span>•</span>
                <span>✓ Rekap Nilai Otomatis</span>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white py-4 px-6 font-bold text-base shadow-lg shadow-indigo-600/20 transition"
              >
                <span>Masuk Portal Guru →</span>
              </Link>
              <div className="text-center">
                <span className="text-xs text-slate-500">
                  Belum punya akun?{" "}
                  <Link href="/register" className="font-bold text-indigo-600 hover:underline">
                    Daftar Guru Gratis
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Keunggulan Utama */}
        <div className="w-full border-t border-slate-200/80 pt-12 space-y-8">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            Alur Kerja Sederhana & Ramah Guru SD
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <span className="text-2xl">📷</span>
              <h4 className="font-bold text-sm text-slate-900">Foto Halaman Buku</h4>
              <p className="text-xs text-slate-500">Ambil foto materi dari kamera HP atau unggah file gambar materi.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <span className="text-2xl">🔍</span>
              <h4 className="font-bold text-sm text-slate-900">OCR Teks Otomatis</h4>
              <p className="text-xs text-slate-500">Sistem otomatis membaca isi teks dari foto buku tanpa perlu ketik ulang.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <span className="text-2xl">🤖</span>
              <h4 className="font-bold text-sm text-slate-900">AI Susun Soal</h4>
              <p className="text-xs text-slate-500">AI menyusun pilihan ganda dengan kunci jawaban sesuai materi kelas SD.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <span className="text-2xl">🔑</span>
              <h4 className="font-bold text-sm text-slate-900">1 Kode per Kelas</h4>
              <p className="text-xs text-slate-500">Semua siswa di satu kelas memakai kode yang sama dan nilai terekam rapi.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} EduSnap — Platform Pembelajaran & Kuis Cerdas Buku SD.</p>
      </footer>
    </div>
  );
}
