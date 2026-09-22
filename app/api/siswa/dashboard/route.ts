import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import Siswa from "@/models/Siswa";
import Sesi from "@/models/Sesi";
import Peserta from "@/models/Peserta";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const kodeKelas = searchParams.get("kode")?.trim().toUpperCase();
    const namaSiswa = searchParams.get("nama")?.trim();

    if (!kodeKelas || !namaSiswa) {
      return NextResponse.json(
        { status: "error", message: "Parameter kode kelas dan nama siswa diperlukan." },
        { status: 400 }
      );
    }

    // 1. Temukan kelas
    const kelas = await Kelas.findOne({ kode_kelas: kodeKelas });
    if (!kelas) {
      return NextResponse.json(
        { status: "error", message: "Kelas tidak ditemukan." },
        { status: 404 }
      );
    }

    // 2. Temukan siswa
    const escapedNama = namaSiswa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const siswa = await Siswa.findOne({
      kelas_id: kelas._id,
      nama: { $regex: `^${escapedNama}$`, $options: "i" },
    });

    if (!siswa) {
      return NextResponse.json(
        { status: "error", message: "Siswa tidak ditemukan di kelas ini." },
        { status: 404 }
      );
    }

    // 3. Ambil semua sesi kuis untuk kelas ini (atau yang dibuat oleh guru kelas ini)
    const sesiList = await Sesi.find({
      $or: [
        { kelas_id: kelas._id },
        { guru_id: kelas.guru_id, kelas_id: null },
      ],
      status: { $ne: "draft" },
    }).sort({ createdAt: -1 });

    // 4. Periksa hasil pengerjaan kuis untuk siswa ini
    const kuisWithStatus = await Promise.all(
      sesiList.map(async (sesi) => {
        const pengerjaan = await Peserta.findOne({
          sesi_id: sesi._id,
          siswa_id: siswa._id,
        });

        return {
          id: sesi._id,
          kode_unik: sesi.kode_unik,
          judul_kuis: sesi.judul_kuis,
          mata_pelajaran: sesi.mata_pelajaran,
          tingkat_kelas: sesi.tingkat_kelas,
          total_soal: sesi.soal ? sesi.soal.length : 0,
          status_kuis: sesi.status,
          sudah_mengerjakan: !!pengerjaan,
          nilai: pengerjaan ? pengerjaan.skor : null,
          jumlah_benar: pengerjaan ? pengerjaan.jumlah_benar : null,
          dikerjakan_pada: pengerjaan ? pengerjaan.createdAt : null,
        };
      })
    );

    return NextResponse.json({
      status: "ok",
      siswa: {
        id: siswa._id,
        nama: siswa.nama,
      },
      kelas: {
        id: kelas._id,
        nama_kelas: kelas.nama_kelas,
        kode_kelas: kelas.kode_kelas,
      },
      kuisList: kuisWithStatus,
    });
  } catch (error) {
    console.error("Error dashboard siswa:", error);
    return NextResponse.json(
      { status: "error", message: "Gagal memuat dashboard siswa." },
      { status: 500 }
    );
  }
}
