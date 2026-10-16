import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import Siswa from "@/models/Siswa";
import Sesi from "@/models/Sesi";
import Peserta from "@/models/Peserta";
import ProgresSiswa from "@/models/ProgresSiswa";

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

    // 3. Ambil semua sesi kuis khusus untuk kelas ini
    const sesiList = await Sesi.find({
      kelas_id: kelas._id,
      status: { $ne: "draft" },
    }).sort({ createdAt: -1 });

    // 4. Periksa hasil pengerjaan kuis untuk siswa ini
    const kuisWithStatus = await Promise.all(
      sesiList.map(async (sesi) => {
        const progres = await ProgresSiswa.findOne({
          sesi_id: sesi._id,
          $or: [
            { siswa_id: siswa._id },
            { nama_ternormalisasi: (siswa.nama || "").trim().toLowerCase() },
          ],
        });

        const pengerjaanList = await Peserta.find({
          sesi_id: sesi._id,
          siswa_id: siswa._id,
        }).sort({ createdAt: -1 });

        const skorTertinggi = progres
          ? progres.skor_tertinggi
          : pengerjaanList.length > 0
          ? Math.max(...pengerjaanList.map((p) => p.skor || 0))
          : null;

        const levelSaatIni = progres ? progres.level_saat_ini : 1;
        const statusMateri = progres ? progres.status_materi : "sedang_belajar";
        const totalPercobaan = progres
          ? progres.riwayat_percobaan?.length || 0
          : pengerjaanList.length;

        return {
          id: sesi._id,
          kode_unik: sesi.kode_unik,
          materi_id: sesi.materi_id ? String(sesi.materi_id) : null,
          judul_kuis: sesi.judul_kuis,
          mata_pelajaran: sesi.mata_pelajaran,
          tingkat_kelas: sesi.tingkat_kelas,
          total_soal: sesi.soal ? sesi.soal.length : 0,
          status_kuis: sesi.status,
          sudah_mengerjakan: totalPercobaan > 0,
          nilai: skorTertinggi,
          skor_tertinggi: skorTertinggi,
          level_saat_ini: levelSaatIni,
          status_materi: statusMateri,
          total_percobaan: totalPercobaan,
          dikerjakan_pada: pengerjaanList[0] ? pengerjaanList[0].createdAt : null,
        };
      })
    );

    // 5. Ambil daftar materi untuk kelas ini beserta progres adaptive siswa
    const Materi = (await import("@/models/Materi")).default;
    const ProgressSiswa = (await import("@/models/ProgressSiswa")).default;

    // Ambil materi berdasarkan kelas_id atau yang pernah dipakai di sesi kelas ini
    const sesiMateriIds = sesiList
      .map((s) => s.materi_id)
      .filter((mid) => !!mid);

    const materiDocs = await Materi.find({
      $or: [
        { kelas_id: kelas._id },
        { _id: { $in: sesiMateriIds } },
      ],
    })
      .select("-gambarList -teksHasilOCR")
      .sort({ createdAt: -1 });

    const materiWithProgress = await Promise.all(
      materiDocs.map(async (m) => {
        const p = await ProgressSiswa.findOne({
          siswa_id: siswa._id,
          materi_id: m._id,
        });

        return {
          id: m._id,
          namaMateri: m.namaMateri,
          mataPelajaran: m.mataPelajaran || "Tematik / Umum",
          kelas: m.kelas || kelas.nama_kelas,
          halaman: m.halaman || "",
          progress: {
            levelSaatIni: p?.levelSaatIni || 1,
            status: p?.status || "belum_mulai",
            nilaiLevelSaatIni: p ? p.nilaiLevelSaatIni : null,
            attemptKe: p?.attemptKe || 0,
            konsepBelumDikuasai: p?.konsepBelumDikuasai || [],
            lastAttemptAt: p?.lastAttemptAt || null,
          },
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
      materiList: materiWithProgress,
    });
  } catch (error) {
    console.error("Error dashboard siswa:", error);
    return NextResponse.json(
      { status: "error", message: "Gagal memuat dashboard siswa." },
      { status: 500 }
    );
  }
}
