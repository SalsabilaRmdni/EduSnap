import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Sesi from "@/models/Sesi";
import Siswa from "@/models/Siswa";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ kode: string }> }
) {
  try {
    await connectDB();
    const { kode } = await context.params;

    if (!kode) {
      return NextResponse.json(
        { status: "error", message: "Kode kuis wajib diisi" },
        { status: 400 }
      );
    }

    const sesi = await Sesi.findOne({
      kode_unik: kode.trim().toUpperCase(),
    });

    if (!sesi) {
      return NextResponse.json(
        { status: "error", message: "Kuis dengan kode tersebut tidak ditemukan. Periksa kembali kodenya." },
        { status: 404 }
      );
    }

    if (sesi.status === "selesai") {
      return NextResponse.json(
        { status: "error", message: "Sesi kuis ini telah ditutup oleh guru." },
        { status: 403 }
      );
    }

    // Jika sesi ini terhubung ke kelas, ambil daftar nama siswa di kelas tersebut
    let daftarSiswaKelas: string[] = [];
    if (sesi.kelas_id) {
      const siswaList = await Siswa.find({ kelas_id: sesi.kelas_id })
        .select("nama")
        .sort({ nama: 1 });
      daftarSiswaKelas = siswaList.map((s) => s.nama);
    }

    // Ambil soal TANPA menyertakan kunci jawaban untuk siswa
    const soalUntukSiswa = sesi.soal.map(
      (s: { _id?: unknown; pertanyaan: string; pilihan: string[] }, index: number) => ({
        index,
        id: s._id ? String(s._id) : String(index),
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
      })
    );

    return NextResponse.json({
      status: "ok",
      sesi: {
        id: sesi._id,
        kode_unik: sesi.kode_unik,
        judul_kuis: sesi.judul_kuis,
        mata_pelajaran: sesi.mata_pelajaran,
        tingkat_kelas: sesi.tingkat_kelas,
        kelas_id: sesi.kelas_id,
        status: sesi.status,
        total_soal: sesi.soal.length,
        daftar_siswa: daftarSiswaKelas,
        soal: soalUntukSiswa,
      },
    });
  } catch (error) {
    console.error("Error get sesi by kode:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memuat kuis",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}