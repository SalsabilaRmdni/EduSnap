import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";
import Soal from "@/models/Soal";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ materiId: string }> }
) {
  try {
    await connectDB();
    const { materiId } = await context.params;

    if (!materiId) {
      return NextResponse.json(
        { status: "error", message: "materiId wajib disertakan" },
        { status: 400 }
      );
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json(
        { status: "error", message: "Materi tidak ditemukan" },
        { status: 404 }
      );
    }

    const soalList = await Soal.find({ materiId }).sort({ createdAt: 1 });

    return NextResponse.json({
      status: "ok",
      materi: {
        id: materi._id,
        namaMateri: materi.namaMateri,
        mataPelajaran: materi.mataPelajaran || "Tematik / Umum",
        kelas: materi.kelas || "SD (Umum)",
        halaman: materi.halaman || "",
        teksHasilOCR: materi.teksHasilOCR || "",
      },
      soal: soalList,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal mengambil data kuis",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
