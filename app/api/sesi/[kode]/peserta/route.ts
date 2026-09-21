import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Sesi from "@/models/Sesi";
import Peserta from "@/models/Peserta";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ kode: string }> }
) {
  try {
    await connectDB();
    const { kode } = await context.params;

    const sesi = await Sesi.findOne({
      kode_unik: kode.trim().toUpperCase(),
    });

    if (!sesi) {
      return NextResponse.json(
        { status: "error", message: "Sesi kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    const pesertaList = await Peserta.find({ sesi_id: sesi._id }).sort({ createdAt: -1 });

    const totalPeserta = pesertaList.length;
    const rataRataSkor =
      totalPeserta > 0
        ? Math.round(pesertaList.reduce((acc, p) => acc + (p.skor || 0), 0) / totalPeserta)
        : 0;

    return NextResponse.json({
      status: "ok",
      sesi: {
        id: sesi._id,
        kode_unik: sesi.kode_unik,
        judul_kuis: sesi.judul_kuis,
        mata_pelajaran: sesi.mata_pelajaran,
        tingkat_kelas: sesi.tingkat_kelas,
        status: sesi.status,
        totalSoal: sesi.soal.length,
        createdAt: sesi.createdAt,
      },
      stats: {
        totalPeserta,
        rataRataSkor,
      },
      pesertaList,
    });
  } catch (error) {
    console.error("Error get peserta list:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memuat daftar peserta",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
