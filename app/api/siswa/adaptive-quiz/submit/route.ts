import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import Siswa from "@/models/Siswa";
import Materi from "@/models/Materi";
import Soal, { ISoalItem } from "@/models/Soal";
import ProgressSiswa, { IDetailJawabanAttempt } from "@/models/ProgressSiswa";
import {
  evaluasiJawaban,
  formatFeedbackSiswa,
  MASTERY_THRESHOLD,
} from "@/lib/adaptiveLearning";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { kodeKelas, namaSiswa, materiId, jawaban, soalIds } = body;

    if (!kodeKelas || !namaSiswa || !materiId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Parameter kodeKelas, namaSiswa, dan materiId wajib disertakan.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(soalIds) || soalIds.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Daftar ID soal tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!jawaban || (typeof jawaban !== "object" && !Array.isArray(jawaban))) {
      return NextResponse.json(
        { status: "error", message: "Format jawaban tidak valid." },
        { status: 400 }
      );
    }

    // 1. Validasi Kelas
    const cleanKode = String(kodeKelas).trim().toUpperCase();
    const kelas = await Kelas.findOne({
      kode_kelas: cleanKode,
      is_active: { $ne: false },
    });
    if (!kelas) {
      return NextResponse.json(
        { status: "error", message: "Kelas tidak ditemukan atau sudah tidak aktif." },
        { status: 404 }
      );
    }

    // 2. Validasi Siswa dalam Kelas
    const cleanNama = String(namaSiswa).trim();
    const escapedNama = cleanNama.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

    // 4. Ambil Progress Siswa
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

    // 5. Ambil data butir Soal dari database sesuai urutan soalIds
    const soalDocs = await Soal.find({ _id: { $in: soalIds } });
    const soalMap = new Map<string, ISoalItem>();
    soalDocs.forEach((s) => soalMap.set(String(s._id), s));

    const urutanSoal: ISoalItem[] = [];
    for (const sid of soalIds) {
      const s = soalMap.get(String(sid));
      if (s) urutanSoal.push(s);
    }

    if (urutanSoal.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Soal tidak ditemukan di database." },
        { status: 404 }
      );
    }

    // 6. Evaluasi jawaban siswa
    const hasilEvaluasi = evaluasiJawaban(
      urutanSoal,
      jawaban,
      progress.levelSaatIni
    );

    const isRemedialAttempt = progress.status === "remedial";

    // 7. Siapkan struktur detail riwayat untuk disimpan di database
    const detailJawabanSubdocs: IDetailJawabanAttempt[] = hasilEvaluasi.detail.map((d) => ({
      soalId: d.soalId as any,
      pertanyaan: d.pertanyaan,
      pilihan: d.pilihan,
      jawabanSiswa: d.jawabanSiswa,
      jawabanBenar: d.jawabanBenar,
      isBenar: d.isCorrect,
      konsep: d.konsep,
      level: d.level,
      difficulty: d.difficulty,
      penjelasan: d.penjelasan,
    }));

    // 8. Update ProgressSiswa
    const levelSebelumEvaluasi = progress.levelSaatIni;
    progress.nilaiLevelSaatIni = hasilEvaluasi.skor;
    progress.attemptKe = (progress.attemptKe || 0) + 1;
    progress.levelSaatIni = hasilEvaluasi.levelBerikutnya;
    progress.status = hasilEvaluasi.statusBaru;
    progress.konsepBelumDikuasai =
      hasilEvaluasi.statusBaru === "remedial" ? hasilEvaluasi.konsepSalah : [];

    // Tambahkan soalIds ke array soalSudahDikerjakan (tanpa duplikat)
    const existingSoalIds = new Set(
      progress.soalSudahDikerjakan.map((id: any) => String(id))
    );
    for (const sid of soalIds) {
      if (!existingSoalIds.has(String(sid))) {
        progress.soalSudahDikerjakan.push(sid as any);
        existingSoalIds.add(String(sid));
      }
    }

    // Catat riwayat attempt
    progress.riwayatAttempt.push({
      attemptKe: progress.attemptKe,
      level: hasilEvaluasi.detail[0]?.level || levelSebelumEvaluasi,
      tipeQuiz: isRemedialAttempt ? "remedial" : "normal",
      skor: hasilEvaluasi.skor,
      jumlahBenar: hasilEvaluasi.jumlahBenar,
      totalSoal: hasilEvaluasi.totalSoal,
      konsepSalah: hasilEvaluasi.konsepSalah,
      detailJawaban: detailJawabanSubdocs,
      createdAt: new Date(),
    });

    progress.lastAttemptAt = new Date();
    await progress.save();

    // 8b. Safe sync to Peserta if a Sesi exists for this materi
    try {
      const Sesi = (await import("@/models/Sesi")).default;
      const Peserta = (await import("@/models/Peserta")).default;
      const activeSesi = await Sesi.findOne({
        materi_id: materi._id,
        ...(kelas?._id ? { kelas_id: kelas._id } : {}),
      }).sort({ createdAt: -1 });

      if (activeSesi) {
        await Peserta.findOneAndUpdate(
          { sesi_id: activeSesi._id, siswa_id: siswa._id },
          {
            $set: {
              nama_siswa: siswa.nama,
              skor: hasilEvaluasi.skor,
              jumlah_benar: hasilEvaluasi.jumlahBenar,
              total_soal: hasilEvaluasi.totalSoal,
              jawaban: hasilEvaluasi.detail.map((d) => d.jawabanSiswa),
            },
          },
          { upsert: true, new: true }
        );
      }
    } catch (syncErr) {
      console.warn("Sync to Peserta optional notice:", syncErr);
    }

    // 9. Format feedback aman untuk siswa
    const feedbackList = formatFeedbackSiswa(hasilEvaluasi.detail);

    return NextResponse.json({
      status: "ok",
      message: hasilEvaluasi.lulusLevel
        ? hasilEvaluasi.statusBaru === "menguasai"
          ? "Luar biasa! Kamu telah menguasai semua level pada materi ini!"
          : `Hebat! Kamu lulus Level ${levelSebelumEvaluasi} dengan nilai ${hasilEvaluasi.skor}. Lanjut ke Level ${hasilEvaluasi.levelBerikutnya}!`
        : `Nilaimu ${hasilEvaluasi.skor} (di bawah target ${MASTERY_THRESHOLD}%). Yuk ikuti remedial untuk konsep yang masih keliru!`,
      hasil: {
        skor: hasilEvaluasi.skor,
        jumlahBenar: hasilEvaluasi.jumlahBenar,
        totalSoal: hasilEvaluasi.totalSoal,
        threshold: MASTERY_THRESHOLD,
        lulusLevel: hasilEvaluasi.lulusLevel,
        levelSebelumnya: levelSebelumEvaluasi,
        levelBaru: hasilEvaluasi.levelBerikutnya,
        statusBaru: hasilEvaluasi.statusBaru,
        konsepPerluRemedial: progress.konsepBelumDikuasai,
        attemptKe: progress.attemptKe,
        feedback: feedbackList,
      },
    });
  } catch (error) {
    console.error("Error submit adaptive quiz:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memproses jawaban adaptive quiz.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
