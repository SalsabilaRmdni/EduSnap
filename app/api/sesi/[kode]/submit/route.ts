import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Sesi, { ISoal } from "@/models/Sesi";
import Peserta from "@/models/Peserta";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ kode: string }> }
) {
  try {
    await connectDB();
    const { kode } = await context.params;
    const { namaSiswa, jawaban } = await req.json();

    if (!namaSiswa || typeof namaSiswa !== "string" || !namaSiswa.trim()) {
      return NextResponse.json(
        { status: "error", message: "Nama lengkap siswa wajib diisi" },
        { status: 400 }
      );
    }

    if (!Array.isArray(jawaban)) {
      return NextResponse.json(
        { status: "error", message: "Format jawaban tidak valid" },
        { status: 400 }
      );
    }

    const sesi = await Sesi.findOne({
      kode_unik: kode.trim().toUpperCase(),
    });

    if (!sesi) {
      return NextResponse.json(
        { status: "error", message: "Sesi kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    const totalSoal = sesi.soal.length;
    let jumlahBenar = 0;

    const detailEvaluasi = sesi.soal.map((s: ISoal, idx: number) => {
      const jawabanSiswa = jawaban[idx] !== undefined ? Number(jawaban[idx]) : -1;
      const kunciJawaban = Number(s.jawaban_benar);
      const isBenar = jawabanSiswa === kunciJawaban;

      if (isBenar) {
        jumlahBenar++;
      }

      return {
        nomor: idx + 1,
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanSiswa,
        kunciJawaban,
        isBenar,
      };
    });

    const skor = totalSoal > 0 ? Math.round((jumlahBenar / totalSoal) * 100) : 0;

    // Simpan ke database Peserta
    const peserta = await Peserta.create({
      sesi_id: sesi._id,
      nama_siswa: namaSiswa.trim(),
      jawaban: jawaban,
      skor: skor,
      jumlah_benar: jumlahBenar,
      total_soal: totalSoal,
    });

    return NextResponse.json({
      status: "ok",
      message: "Jawaban berhasil dikirim! Nilai sudah dihitung.",
      hasil: {
        pesertaId: peserta._id,
        namaSiswa: peserta.nama_siswa,
        judulKuis: sesi.judul_kuis,
        mataPelajaran: sesi.mata_pelajaran,
        tingkatKelas: sesi.tingkat_kelas,
        skor: skor,
        jumlahBenar: jumlahBenar,
        totalSoal: totalSoal,
        detail: detailEvaluasi,
      },
    });
  } catch (error) {
    console.error("Error submit kuis:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal mengirim jawaban kuis",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
