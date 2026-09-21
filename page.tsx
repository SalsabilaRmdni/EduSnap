import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center bg-gradient-to-b from-white to-gray-50">
      <span className="text-5xl">📚</span>

      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Quiz Generator App
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Ubah foto materi pelajaran jadi kuis interaktif secara otomatis.
          Guru tinggal foto, AI yang buatkan soalnya.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition"
        >
          Masuk
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition"
        >
          Daftar sebagai Guru
        </Link>
      </div>
    </main>
  );
}
