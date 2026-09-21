import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-indigo-50/50 via-white to-gray-50">
      <div className="max-w-xl mx-auto space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-bold text-indigo-700">
          <span>📚</span>
          <span>EduSnap — Quiz Generator Pintar Buku SD</span>
        </span>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight">
          Ubah Foto Buku Pelajaran Jadi <span className="text-indigo-600">Kuis Interaktif</span>
        </h1>

        <p className="text-base text-gray-600 max-w-lg mx-auto">
          Guru tinggal foto halaman buku pelajaran SD, sistem membaca teks (OCR) dan AI otomatis membuat butir soal. Siswa langsung mengerjakan tanpa ribet akun!
        </p>

        {/* Tombol aksi utama */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/join"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-bold text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition"
          >
            <span>🎒 Masuk Kuis Siswa</span>
            <span>→</span>
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-7 py-3.5 text-base font-bold text-gray-800 hover:bg-gray-50 active:scale-95 transition"
          >
            <span>👨‍🏫 Portal Guru</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-200/60 text-xs text-gray-500">
          Belum punya akun guru?{" "}
          <Link href="/register" className="font-bold text-indigo-600 hover:underline">
            Daftar Akun Guru Gratis
          </Link>
        </div>
      </div>
    </main>
  );
}
