export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center bg-white">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
        MVP — Tahap Awal
      </span>

      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
        Quiz Generator App
      </h1>

      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          Login
        </a>
        <a
          href="/register"
          className="rounded-md px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
        >
          Daftar akun guru →
        </a>
      </div>
    </main>
  );
}
