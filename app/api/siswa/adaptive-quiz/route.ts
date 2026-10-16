import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import Siswa from "@/models/Siswa";
import Materi from "@/models/Materi";
import ProgressSiswa from "@/models/ProgressSiswa";
import { pilihSoalAdaptive, DEFAULT_QUIZ_LIMIT } from "@/lib/adaptiveLearning";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const kodeKelas = searchParams.get("kodeKelas")?.trim().toUpperCase();
    const namaSiswa = searchParams.get("namaSiswa")?.trim();
    const materiId = searchParams.get("materiId")?.trim();
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_QUIZ_LIMIT;

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

    // 2. Validasi Siswa
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
    if (!mongoose.Types.ObjectId.isValid(materiId)) {
      return NextResponse.json(
        { status: "error", message: "ID materi tidak valid." },
        { status: 400 }
      );
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json(
        { status: "error", message: "Materi tidak ditemukan." },
        { status: 404 }
      );
    }

    // 4. Ambil atau inisialisasi ProgressSiswa
    let progress = await ProgressSiswa.findOne({
      siswa_id: siswa._id,
      materi_id: materi._id,
    });

    if (!progress) {
      progress = await ProgressSiswa.create({
        siswa_id: siswa._id,
        materi_id: materi._id,
        levelSaatIni: 1,
        status: "belajar",
        nilaiLevelSaatIni: 0,
        attemptKe: 0,
        konsepBelumDikuasai: [],
        soalSudahDikerjakan: [],
        riwayatAttempt: [],
        lastAttemptAt: null,
      });
    }

    // Jika siswa sudah tamat menguasai level 3
    if (progress.status === "menguasai") {
      return NextResponse.json({
        status: "ok",
        pesan: "Siswa telah berhasil menguasai materi ini hingga Level tertinggi!",
        selesai: true,
        progress: {
          levelSaatIni: progress.levelSaatIni,
          status: progress.status,
          nilaiTerakhir: progress.nilaiLevelSaatIni,
        },
        soal: [],
      });
    }

    const isRemedial = progress.status === "remedial";

    // 5. Pilih soal adaptive menggunakan helper
    const hasilPilih = await pilihSoalAdaptive({
      materiId: materi._id,
      level: progress.levelSaatIni,
      isRemedial: isRemedial,
      konsepBermasalah: progress.konsepBelumDikuasai,
      soalSudahDikerjakanIds: progress.soalSudahDikerjakan,
      limit: limit,
    });

    const soalList = hasilPilih.soal;

    if (!soalList || soalList.length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message:
            hasilPilih.pesanInfo ||
            "Belum ada butir soal baru yang tersedia untuk level atau kebutuhan remedial ini. Hubungi gurumu.",
          stokKurang: true,
          progress: {
            levelSaatIni: progress.levelSaatIni,
            status: progress.status,
            konsepBelumDikuasai: progress.konsepBelumDikuasai,
          },
        },
        { status: 404 }
      );
    }

    // 6. Format soal tanpa membocorkan kunci jawaban
    const sanitizedSoal = soalList.map((s, index) => ({
      index,
      id: String(s._id),
      pertanyaan: s.pertanyaan,
      pilihan: s.pilihan,
      level: s.level,
      konsep: s.konsep,
      difficulty: s.difficulty,
    }));

    return NextResponse.json({
      status: "ok",
      materi: {
        id: materi._id,
        namaMateri: materi.namaMateri,
        mataPelajaran: materi.mataPelajaran,
      },
      siswa: {
        id: siswa._id,
        nama: siswa.nama,
      },
      infoQuiz: {
        level: progress.levelSaatIni,
        status: progress.status,
        isRemedial: isRemedial,
        konsepTarget: isRemedial ? progress.konsepBelumDikuasai : [],
        totalSoal: sanitizedSoal.length,
        stokKurang: hasilPilih.stokKurang,
        pesanInfo: hasilPilih.pesanInfo,
      },
      soal: sanitizedSoal,
    });
  } catch (error) {
    console.error("Error get adaptive quiz:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memuat kuis adaptive.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
