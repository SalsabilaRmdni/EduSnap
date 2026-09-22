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
      return (
        localStorage.getItem(`kuis_nama_${kode}`) ||
        localStorage.getItem("edusnap_siswa_nama") ||
        ""
      );
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
        setErrorMsg(data.message || "Kuis tidak ditemukan.");
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
      alert("Silakan ketik nama kamu terlebih dahulu ya!");
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
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(data.message || "Gagal mengirim jawaban kuis.");
      }
    } catch {
      setErrorMsg("Koneksi terputus. Silakan coba kirim lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-sky-50 via-white to-amber-50">
        <div className="text-center space-y-3">
          <span className="text-5xl inline-block animate-bounce">🎒</span>
          <p className="text-sm font-extrabold text-slate-700">Sedang memuat soal kuis kamu...</p>
        </div>
      </main>
    );
  }

  if (errorMsg && !sesi) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-md border border-slate-200 space-y-4">
          <span className="text-5xl block">⚠️</span>
          <h2 className="text-2xl font-black text-slate-900">Oops!</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => router.push("/join")}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            Kembali ke Halaman Masuk
          </button>
        </div>
      </main>
    );
  }

  // JIKA SUDAH SELESAI -> TAMPILKAN LAYAR HASIL & BINTANG
  if (hasil) {
    const isSempurna = hasil.skor === 100;
    const isBagus = hasil.skor >= 70;

    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50/70 via-white to-emerald-50/50 p-4 sm:p-6 md:p-10">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Kartu Skor Apresiasi */}
          <div className="rounded-3xl border-2 border-amber-200 bg-white p-6 sm:p-8 text-center shadow-xl shadow-amber-500/10 space-y-5">
            <span className="text-6xl inline-block animate-pulse">
              {isSempurna ? "🏆🌟" : isBagus ? "⭐🎉" : "💪✨"}
            </span>

            <div className="space-y-1">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                Kuis Selesai!
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {isSempurna
                  ? `Luar Biasa, ${hasil.namaSiswa}!`
                  : isBagus
                  ? `Hebat Sekali, ${hasil.namaSiswa}!`
                  : `Tetap Semangat, ${hasil.namaSiswa}!`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">{hasil.judulKuis}</p>
            </div>

            {/* Lingkaran Skor Besar */}
            <div className="h-36 w-36 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex flex-col items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 border-4 border-emerald-200">
              <span className="text-4xl sm:text-5xl font-black">{hasil.skor}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">
                Nilai Kamu
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 text-center border border-slate-200/80">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Benar</p>
                <p className="text-xl font-black text-emerald-600">{hasil.jumlahBenar}</p>
              </div>
              <div className="border-x border-slate-200">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Salah</p>
                <p className="text-xl font-black text-red-500">
                  {hasil.totalSoal - hasil.jumlahBenar}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Total</p>
                <p className="text-xl font-black text-slate-700">{hasil.totalSoal}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/siswa"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-md shadow-indigo-600/20 transition"
              >
                <span>🏠 Kembali ke Dashboard Siswa</span>
              </Link>
            </div>
          </div>

          {/* Pembahasan Soal & Kunci Jawaban */}
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Pembahasan Soal & Kunci Jawaban
            </h2>

            {hasil.detail.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-3xl border-2 p-5 sm:p-6 bg-white shadow-sm space-y-3 transition ${
                  item.isBenar ? "border-emerald-300" : "border-red-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                    <span className="text-indigo-600 mr-1">{item.nomor}.</span> {item.pertanyaan}
                  </p>
                  <span
                    className={`shrink-0 text-xs font-black px-3 py-1 rounded-full ${
                      item.isBenar
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.isBenar ? "Benar ✅" : "Salah ❌"}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {item.pilihan.map((opsi, pIdx) => {
                    const isDipilih = item.jawabanSiswa === pIdx;
                    const isKunci = item.kunciJawaban === pIdx;

                    let barColor = "border-slate-200 bg-slate-50 text-slate-700";
                    if (isKunci) {
                      barColor = "border-emerald-400 bg-emerald-50 text-emerald-950 font-bold";
                    } else if (isDipilih && !item.isBenar) {
                      barColor = "border-red-300 bg-red-50 text-red-900 line-through";
                    }

                    return (
                      <div
                        key={pIdx}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs sm:text-sm border-2 ${barColor}`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black border border-slate-200">
                          {["A", "B", "C", "D"][pIdx]}
                        </span>
                        <span className="flex-1 font-medium">{opsi}</span>
                        {isKunci && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded">
                            KUNCI JAWABAN
                          </span>
                        )}
                        {isDipilih && !isKunci && (
                          <span className="text-[10px] font-bold text-red-600">Jawabanmu</span>
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

  // LEMBAR PENGERJAAN KUIS SISWA
  const totalSoal = sesi?.soal.length || 0;
  const dijawabCount = Object.keys(jawaban).length;

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-6 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header Kuis */}
        <header className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {sesi?.tingkat_kelas || "SD"}
              </span>
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {sesi?.mata_pelajaran || "Tematik"}
              </span>
            </div>
            <span className="text-xs font-black tracking-widest text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-md">
              KODE: {sesi?.kode_unik}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {sesi?.judul_kuis}
          </h1>

          {/* Nama Siswa Banner */}
          <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <span className="text-xs text-amber-800 font-medium">Nama Siswa:</span>
              <strong className="text-xs sm:text-sm text-slate-900 font-extrabold">{namaSiswa || "Belum diisi"}</strong>
            </div>

            {!namaSiswa && (
              <input
                type="text"
                placeholder="Ketik namamu..."
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold focus:outline-none"
              />
            )}
          </div>

          {/* Progress Bar Pengisian */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-extrabold text-slate-500">
              <span>Progres Jawaban</span>
              <span className="text-indigo-600">
                {dijawabCount} dari {totalSoal} Soal Terjawab
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${totalSoal > 0 ? (dijawabCount / totalSoal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700 border border-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Daftar Soal Interaktif dengan Tombol Pilihan Empuk */}
        <div className="space-y-5">
          {sesi?.soal.map((s, idx) => {
            const terpilih = jawaban[idx];
            return (
              <div
                key={s.id || idx}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    {idx + 1}
                  </span>
                  <p className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                    {s.pertanyaan}
                  </p>
                </div>

                {/* Grid Pilihan A, B, C, D */}
                <div className="grid grid-cols-1 gap-2.5 pl-0 sm:pl-11">
                  {s.pilihan.map((opsi, oIdx) => {
                    const isSelected = terpilih === oIdx;
                    const labelHuruf = ["A", "B", "C", "D"][oIdx] || String(oIdx + 1);

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handlePilihOpsi(idx, oIdx)}
                        className={`flex items-center gap-3.5 rounded-2xl p-4 text-left border-2 transition-all active:scale-[0.99] ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-sm"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span
                          className={`h-9 w-9 shrink-0 rounded-xl text-sm font-black flex items-center justify-center transition ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {labelHuruf}
                        </span>
                        <span className="flex-1 text-sm sm:text-base font-bold">{opsi}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Bar untuk Kirim Jawaban */}
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 z-30">
          <div className="text-xs font-bold text-slate-600 text-center sm:text-left">
            {dijawabCount < totalSoal ? (
              <span className="text-amber-600">
                ⚠️ Masih ada {totalSoal - dijawabCount} soal belum kamu jawab
              </span>
            ) : (
              <span className="text-emerald-600">
                ✨ Hebat! Semua {totalSoal} soal sudah kamu jawab!
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            {submitting ? "Menghitung Nilai Kamu..." : "Kirim Jawaban & Lihat Nilai 🚀"}
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
        <div className="flex min-h-screen items-center justify-center font-bold text-xs text-slate-400">
          Memuat halaman kuis...
        </div>
      }
    >
      <KuisSiswaContent />
    </Suspense>
  );
}
