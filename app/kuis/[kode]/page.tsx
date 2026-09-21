"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SoalSiswa {
  index: number;
  id: string;
  pertanyaan: string;
  pilihan: string[];
}

interface SesiSiswa {
  id: string;
  kode_unik: string;
  judul_kuis: string;
  mata_pelajaran: string;
  tingkat_kelas: string;
  status: string;
  total_soal: number;
  soal: SoalSiswa[];
}

interface HasilEvaluasi {
  nomor: number;
  pertanyaan: string;
  pilihan: string[];
  jawabanSiswa: number;
  kunciJawaban: number;
  isBenar: boolean;
}

interface HasilKuis {
  pesertaId: string;
  namaSiswa: string;
  judulKuis: string;
  mataPelajaran: string;
  tingkatKelas: string;
  skor: number;
  jumlahBenar: number;
  totalSoal: number;
  detail: HasilEvaluasi[];
}

function KuisSiswaContent() {
  const params = useParams<{ kode: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const kode = (params.kode || "").toUpperCase();

  const [sesi, setSesi] = useState<SesiSiswa | null>(null);
  const [namaSiswa, setNamaSiswa] = useState<string>(() => {
    const fromQuery = searchParams.get("nama");
    if (fromQuery) return fromQuery;
    if (typeof window !== "undefined") {
      return localStorage.getItem(`kuis_nama_${kode}`) || "";
    }
    return "";
  });
  const [jawaban, setJawaban] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasil, setHasil] = useState<HasilKuis | null>(null);

  const fetchSesi = useCallback(async () => {
    if (!kode) return;
    try {
      const res = await fetch(`/api/sesi/${kode}`);
      const data = await res.json();
      if (data.status === "ok") {
        setSesi(data.sesi);
      } else {
        setErrorMsg(data.message || "Gagal memuat kuis.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat memuat kuis.");
    } finally {
      setLoading(false);
    }
  }, [kode]);

  useEffect(() => {
    fetchSesi();
  }, [fetchSesi]);

  const handlePilihOpsi = (soalIdx: number, opsiIdx: number) => {
    setJawaban((prev) => ({
      ...prev,
      [soalIdx]: opsiIdx,
    }));
  };

  const handleSubmit = async () => {
    if (!sesi) return;

    if (!namaSiswa.trim()) {
      alert("Silakan isi nama kamu terlebih dahulu.");
      return;
    }

    const totalSoal = sesi.soal.length;
    const terjawab = Object.keys(jawaban).length;

    if (terjawab < totalSoal) {
      const yakin = confirm(
        `Kamu baru menjawab ${terjawab} dari ${totalSoal} soal. Yakin ingin mengirim sekarang?`
      );
      if (!yakin) return;
    }

    setSubmitting(true);
    setErrorMsg("");

    // Siapkan array jawaban berurutan
    const jawabanArray = sesi.soal.map((_, idx) =>
      jawaban[idx] !== undefined ? jawaban[idx] : -1
    );

    try {
      const res = await fetch(`/api/sesi/${kode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaSiswa: namaSiswa.trim(),
          jawaban: jawabanArray,
        }),
      });

      const data = await res.json();
      if (data.status === "ok" && data.hasil) {
        setHasil(data.hasil);
        // Scroll ke paling atas agar siswa langsung melihat skornya
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(data.message || "Gagal mengirim jawaban.");
      }
    } catch {
      setErrorMsg("Koneksi terputus. Silakan coba kirim lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 bg-indigo-50/50">
        <div className="text-center space-y-3">
          <span className="inline-block animate-spin text-4xl">🎒</span>
          <p className="text-gray-600 font-medium">Sedang memuat soal kuis...</p>
        </div>
      </main>
    );
  }

  if (errorMsg && !sesi) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-gray-50 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-gray-900">Oops!</h2>
          <p className="text-sm text-gray-500">{errorMsg}</p>
          <button
            onClick={() => router.push("/join")}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Kembali ke Halaman Join
          </button>
        </div>
      </main>
    );
  }

  // Jika sudah ada hasil (setelah submit) -> Tampilkan Kartu Nilai & Pembahasan
  if (hasil) {
    const isSempurna = hasil.skor === 100;
    const isBagus = hasil.skor >= 70;

    return (
      <main className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white p-4 md:p-8">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Kartu Skor Utama */}
          <div className="rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-lg space-y-4">
            <span className="text-5xl">{isSempurna ? "🏆" : isBagus ? "🌟" : "💪"}</span>

            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
                Hasil Kuis Siswa
              </span>
              <h1 className="text-2xl font-black text-gray-900 mt-1">{hasil.judulKuis}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Nama Siswa: <strong className="text-gray-800">{hasil.namaSiswa}</strong>
              </p>
            </div>

            {/* Lingkaran Nilai */}
            <div className="inline-flex flex-col items-center justify-center rounded-3xl bg-indigo-600 px-10 py-6 text-white shadow-md">
              <span className="text-xs uppercase font-semibold tracking-wider text-indigo-200">
                Nilai Kamu
              </span>
              <span className="text-6xl font-black tracking-tight">{hasil.skor}</span>
              <span className="text-xs text-indigo-200 mt-1">dari 100</span>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 text-sm font-semibold">
              <div className="text-green-600 flex items-center gap-1.5">
                <span>✅ Benar:</span>
                <span className="text-base font-bold">{hasil.jumlahBenar}</span>
              </div>
              <div className="text-red-500 flex items-center gap-1.5">
                <span>❌ Salah:</span>
                <span className="text-base font-bold">{hasil.totalSoal - hasil.jumlahBenar}</span>
              </div>
              <div className="text-gray-500 flex items-center gap-1.5">
                <span>📝 Total:</span>
                <span className="text-base font-bold">{hasil.totalSoal} Soal</span>
              </div>
            </div>

            <p className="text-sm font-medium text-gray-600 max-w-sm mx-auto italic">
              {isSempurna
                ? "Luar biasa! Kamu berhasil menjawab semua soal dengan benar!"
                : isBagus
                ? "Kerja bagus! Terus pertahankan semangat belajarmu ya!"
                : "Jangan berkecil hati, belajar lagi dan coba tantangan berikutnya!"}
            </p>

            <div className="pt-3">
              <Link
                href="/join"
                className="inline-block rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition"
              >
                Kerjakan Kuis Lain
              </Link>
            </div>
          </div>

          {/* Pembahasan Soal */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Pembahasan Soal & Kunci Jawaban</h2>

            {hasil.detail.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-5 bg-white shadow-sm space-y-3 transition ${
                  item.isBenar ? "border-green-300" : "border-red-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-gray-900 text-base">
                    <span className="mr-1 text-indigo-600">{item.nomor}.</span> {item.pertanyaan}
                  </p>
                  <span
                    className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.isBenar
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.isBenar ? "Benar ✅" : "Salah ❌"}
                  </span>
                </div>

                <div className="space-y-2">
                  {item.pilihan.map((opsi, pIdx) => {
                    const isDipilih = item.jawabanSiswa === pIdx;
                    const isKunci = item.kunciJawaban === pIdx;

                    let barColor = "border-gray-200 bg-gray-50 text-gray-700";
                    if (isKunci) {
                      barColor = "border-green-400 bg-green-50 text-green-900 font-semibold";
                    } else if (isDipilih && !item.isBenar) {
                      barColor = "border-red-300 bg-red-50 text-red-800 line-through";
                    }

                    return (
                      <div
                        key={pIdx}
                        className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm border ${barColor}`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold border border-gray-300">
                          {["A", "B", "C", "D"][pIdx]}
                        </span>
                        <span className="flex-1">{opsi}</span>
                        {isKunci && (
                          <span className="text-xs font-bold text-green-700">KUNCI JAWABAN</span>
                        )}
                        {isDipilih && !isKunci && (
                          <span className="text-xs font-semibold text-red-600">Jawabanmu</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Tampilan Lembar Soal Kuis
  const totalSoal = sesi?.soal.length || 0;
  const dijawabCount = Object.keys(jawaban).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Kuis */}
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {sesi?.tingkat_kelas || "SD"}
              </span>
              <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                {sesi?.mata_pelajaran || "Tematik"}
              </span>
            </div>
            <span className="text-xs font-extrabold tracking-widest text-gray-500 uppercase bg-gray-100 px-2.5 py-1 rounded-md">
              KODE: {sesi?.kode_unik}
            </span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {sesi?.judul_kuis}
          </h1>

          {/* Form input nama siswa jika belum terisi */}
          <div className="rounded-xl bg-indigo-50/60 p-4 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 block">
                Nama Siswa:
              </span>
              {namaSiswa ? (
                <span className="text-base font-extrabold text-gray-900">{namaSiswa}</span>
              ) : (
                <span className="text-xs text-red-500 italic">Harap isi nama kamu</span>
              )}
            </div>

            {!namaSiswa && (
              <input
                type="text"
                placeholder="Ketik namamu di sini..."
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            )}
          </div>

          {/* Progress Bar Pengisian */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold text-gray-500">
              <span>Progres Pengerjaan</span>
              <span>
                {dijawabCount} dari {totalSoal} Soal Terjawab
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: `${totalSoal > 0 ? (dijawabCount / totalSoal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Daftar Soal Interaktif */}
        <div className="space-y-5">
          {sesi?.soal.map((s, idx) => {
            const terpilih = jawaban[idx];
            return (
              <div
                key={s.id || idx}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="font-semibold text-gray-900 text-lg leading-snug">
                    {s.pertanyaan}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-10">
                  {s.pilihan.map((opsi, oIdx) => {
                    const isSelected = terpilih === oIdx;
                    const labelHuruf = ["A", "B", "C", "D"][oIdx] || String(oIdx + 1);

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handlePilihOpsi(idx, oIdx)}
                        className={`flex items-center gap-3 rounded-xl p-3.5 text-left text-sm font-medium border-2 transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {labelHuruf}
                        </span>
                        <span className="flex-1">{opsi}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tombol Kirim Jawaban */}
        <div className="sticky bottom-4 rounded-2xl border border-indigo-100 bg-white/95 p-4 shadow-xl backdrop-blur-md flex items-center justify-between gap-4">
          <div className="text-xs font-medium text-gray-600">
            {dijawabCount < totalSoal ? (
              <span className="text-amber-600 font-semibold">
                ⚠️ Ada {totalSoal - dijawabCount} soal belum dijawab
              </span>
            ) : (
              <span className="text-green-600 font-semibold">
                ✨ Semua soal sudah terjawab!
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
          >
            {submitting ? "Memeriksa & Menghitung Nilai..." : "Kirim Jawaban & Lihat Skor 🚀"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function KuisSiswaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Memuat halaman kuis...
        </div>
      }
    >
      <KuisSiswaContent />
    </Suspense>
  );
}
