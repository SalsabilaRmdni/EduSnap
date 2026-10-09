import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Sesi, { ISoal } from "@/models/Sesi";
import Peserta from "@/models/Peserta";
import Siswa from "@/models/Siswa";
import ProgresSiswa from "@/models/ProgresSiswa";

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

    // Perbaikan: Tolak submit jika sesi berstatus selesai
    if (sesi.status === "selesai") {
      return NextResponse.json(
        { status: "error", message: "Sesi kuis ini telah ditutup oleh gurumu." },
        { status: 403 }
      );
    }

    const namaSiswaTrim = namaSiswa.trim();
    const namaTernormalisasi = namaSiswaTrim.toLowerCase();
    let siswaCocok = null;

    // Kalau sesi ini terhubung ke kelas tertentu, nama siswa WAJIB terdaftar di kelas itu
    if (sesi.kelas_id) {
      siswaCocok = await Siswa.findOne({
        kelas_id: sesi.kelas_id,
        nama: {
          $regex: `^${namaSiswaTrim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      });

      if (!siswaCocok) {
        return NextResponse.json(
          {
            status: "error",
            message:
              "Nama kamu tidak terdaftar di kelas ini. Periksa kembali penulisan nama, atau hubungi gurumu.",
          },
          { status: 403 }
        );
      }
    }

    // Ambil dokumen ProgresSiswa
    let progresSiswa = await ProgresSiswa.findOne({
      sesi_id: sesi._id,
      nama_ternormalisasi: namaTernormalisasi,
    });

    // Idempoten (Catatan User #2): Mencegah submit ganda / double click
    if (!progresSiswa || !progresSiswa.percobaan_aktif) {
      // Jika percobaan aktif sudah kosong tapi sudah ada riwayat submit sebelumnya, kembalikan hasil terakhir
      if (progresSiswa && progresSiswa.riwayat_percobaan?.length > 0) {
        const lastAttempt = progresSiswa.riwayat_percobaan[progresSiswa.riwayat_percobaan.length - 1];
        return NextResponse.json({
          status: "ok",
          message: "Jawaban percobaan ini sudah tercatat sebelumnya.",
          hasil: {
            namaSiswa: progresSiswa.nama_siswa,
            judulKuis: sesi.judul_kuis,
            mataPelajaran: sesi.mata_pelajaran,
            tingkatKelas: sesi.tingkat_kelas,
            skor: lastAttempt.skor,
            jumlahBenar: lastAttempt.jumlah_benar,
            totalSoal: lastAttempt.total_soal,
            lulus: lastAttempt.lulus,
            levelSaatIni: lastAttempt.level,
            levelBaru: progresSiswa.level_saat_ini,
            statusMateri: progresSiswa.status_materi,
            percobaanKe: lastAttempt.percobaan_ke,
            detail: [],
          },
        });
      }

      return NextResponse.json(
        {
          status: "error",
          message: "Tidak ada sesi percobaan kuis yang aktif. Silakan buka kembali kuis.",
        },
        { status: 400 }
      );
    }

    const { level: levelSaatIni, soal_ids: activeSoalIds } = progresSiswa.percobaan_aktif;

    // Ambil soal-soal yang sedang aktif dari database server (Anti manipulasi browser)
    const activeIdSet = new Set(activeSoalIds.map((id: unknown) => String(id)));
    const soalAktif = sesi.soal.filter((s: { _id?: unknown }) =>
      activeIdSet.has(String(s._id))
    );

    const totalSoal = soalAktif.length > 0 ? soalAktif.length : sesi.soal.length;
    let jumlahBenar = 0;

    const detailEvaluasi = soalAktif.map((s: ISoal, idx: number) => {
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
    const passingGrade = sesi.passing_grade || 70;
    const lulus = skor >= passingGrade;

    const nomorPercobaan = (progresSiswa.riwayat_percobaan?.length || 0) + 1;

    // Tentukan level baru & status materi
    let levelBaru = levelSaatIni;
    let statusMateri = progresSiswa.status_materi;

    if (lulus) {
      // Cek apakah ada bank soal di level berikutnya
      const adaSoalLevelBerikutnya = sesi.soal.some(
        (s: { level?: number }) => (s.level || 1) === levelSaatIni + 1
      );

      if (levelSaatIni >= 3 || !adaSoalLevelBerikutnya) {
        // Lulus level 3 atau materi selesai
        levelBaru = levelSaatIni;
        statusMateri = "selesai";
      } else {
        // Naik ke level berikutnya
        levelBaru = levelSaatIni + 1;
        statusMateri = "sedang_belajar";
      }
    } else {
      // Belum lulus KKM 70 -> tetap di level saat ini
      levelBaru = levelSaatIni;
      statusMateri = "sedang_belajar";
    }

    // Update ProgresSiswa secara atomik di server
    progresSiswa.riwayat_percobaan.push({
      percobaan_ke: nomorPercobaan,
      level: levelSaatIni,
      soal_ids: activeSoalIds,
      jawaban,
      skor,
      jumlah_benar: jumlahBenar,
      total_soal: totalSoal,
      lulus,
      createdAt: new Date(),
    });

    // Tambahkan soal yang baru diselesaikan ke riwayat soal yang pernah dikeluarkan
    const existingPernahKeluar = new Set(
      (progresSiswa.soal_pernah_dikeluarkan || []).map((id: unknown) => String(id))
    );
    for (const sid of activeSoalIds) {
      if (!existingPernahKeluar.has(String(sid))) {
        progresSiswa.soal_pernah_dikeluarkan.push(sid);
      }
    }

    progresSiswa.level_saat_ini = levelBaru;
    progresSiswa.status_materi = statusMateri;
    progresSiswa.skor_tertinggi = Math.max(progresSiswa.skor_tertinggi || 0, skor);
    progresSiswa.percobaan_aktif = null; // Kosongkan percobaan aktif
    await progresSiswa.save();

    // Catat satu dokumen per percobaan ke Peserta (Catatan User #4)
    const peserta = await Peserta.create({
      sesi_id: sesi._id,
      siswa_id: siswaCocok?._id,
      nama_siswa: siswaCocok?.nama || namaSiswaTrim,
      level: levelSaatIni,
      percobaan_ke: nomorPercobaan,
      lulus,
      jawaban,
      skor,
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
        skor,
        jumlahBenar,
        totalSoal,
        lulus,
        levelSaatIni,
        levelBaru,
        statusMateri, // "sedang_belajar" | "selesai"
        percobaanKe: nomorPercobaan,
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