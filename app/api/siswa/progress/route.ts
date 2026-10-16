import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import Siswa from "@/models/Siswa";
import Materi from "@/models/Materi";
import ProgressSiswa from "@/models/ProgressSiswa";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const kodeKelas = searchParams.get("kodeKelas")?.trim().toUpperCase();
    const namaSiswa = searchParams.get("namaSiswa")?.trim();
    const materiId = searchParams.get("materiId")?.trim();

    if (!kodeKelas || !namaSiswa || !materiId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Parameter kodeKelas, namaSiswa, dan materiId wajib disertakan.",
        },
        { status: 400 }
      );
    }

    // 1. Validasi Kelas
    const kelas = await Kelas.findOne({
      kode_kelas: kodeKelas,
      is_active: { $ne: false },
    });
    if (!kelas) {
      return NextResponse.json(
        { status: "error", message: "Kelas tidak ditemukan atau sudah tidak aktif." },
        { status: 404 }
      );
    }

    // 2. Validasi Siswa dalam Kelas tersebut (Data Isolation)
    const escapedNama = namaSiswa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const siswa = await Siswa.findOne({
      kelas_id: kelas._id,
      nama: { $regex: `^${escapedNama}$`, $options: "i" },
    });

    if (!siswa) {
      return NextResponse.json(
        { status: "error", message: "Siswa tidak terdaftar di kelas ini." },
        { status: 404 }
      );
    }

    // 3. Validasi Materi
    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json(
        { status: "error", message: "Materi tidak ditemukan." },
        { status: 404 }
      );
    }

    // 4. Ambil atau Buat Dokumen Progress Siswa
    let progress = await ProgressSiswa.findOne({
      siswa_id: siswa._id,
      materi_id: materi._id,
    });

    if (!progress) {
      progress = await ProgressSiswa.create({
        siswa_id: siswa._id,
        materi_id: materi._id,
        levelSaatIni: 1,
        status: "belum_mulai",
        nilaiLevelSaatIni: 0,
        attemptKe: 0,
        konsepBelumDikuasai: [],
        soalSudahDikerjakan: [],
        riwayatAttempt: [],
        lastAttemptAt: null,
      });
    }

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
      materi: {
        id: materi._id,
        namaMateri: materi.namaMateri,
        mataPelajaran: materi.mataPelajaran,
      },
      progress: {
        levelSaatIni: progress.levelSaatIni,
        status: progress.status,
        nilaiLevelSaatIni: progress.nilaiLevelSaatIni,
        attemptKe: progress.attemptKe,
        konsepBelumDikuasai: progress.konsepBelumDikuasai,
        totalSoalDikerjakan: progress.soalSudahDikerjakan.length,
        lastAttemptAt: progress.lastAttemptAt,
        totalRiwayat: progress.riwayatAttempt ? progress.riwayatAttempt.length : 0,
      },
    });
  } catch (error) {
    console.error("Error get progress siswa:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memuat data progress siswa.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
