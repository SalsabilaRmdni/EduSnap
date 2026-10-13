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

    // Helper konversi kunci jawaban (angka 0-3, huruf A-D, string angka, atau teks opsi)
    function parseKunci(val: unknown, pilihan: string[] = []): number {
      if (typeof val === "number" && !isNaN(val)) return val;
      if (typeof val === "string") {
        const trimmed = val.trim();
        const upper = trimmed.toUpperCase();
        if (upper === "A") return 0;
        if (upper === "B") return 1;
        if (upper === "C") return 2;
        if (upper === "D") return 3;

        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 0 && num < (pilihan.length || 10)) {
          return num;
        }

        if (Array.isArray(pilihan)) {
          const matchIdx = pilihan.findIndex(
            (p) => p.trim().toLowerCase() === trimmed.toLowerCase()
          );
          if (matchIdx !== -1) return matchIdx;
        }
      }
      return -1;
    }

    // Ambil soal-soal aktif dari server menjaga URUTAN PERSIS activeSoalIds
    const idMap = new Map(
      sesi.soal.map((s: ISoal) => [String((s as { _id?: unknown })._id), s])
    );
    const soalAktif = (activeSoalIds || [])
      .map((id: unknown) => idMap.get(String(id)))
      .filter((s: unknown): s is ISoal => Boolean(s));

    // Petakan jawaban siswa (bisa berupa [{ soalId, jawaban }] atau [0, 1, 2, ...])
    const jawabanMap = new Map<string, number>();
    const jawabanArrayRaw: number[] = [];

    if (Array.isArray(jawaban)) {
      jawaban.forEach((item, index) => {
        if (item && typeof item === "object" && "soalId" in item) {
          const sId = String(item.soalId);
          const ans = Number(item.jawaban);
          const parsedAns = isNaN(ans) ? -1 : ans;
          jawabanMap.set(sId, parsedAns);
          jawabanArrayRaw.push(parsedAns);
        } else {
          const ans = Number(item);
          const parsedAns = isNaN(ans) ? -1 : ans;
          jawabanArrayRaw.push(parsedAns);
          const sId = activeSoalIds && activeSoalIds[index] ? String(activeSoalIds[index]) : undefined;
          if (sId) {
            jawabanMap.set(sId, parsedAns);
          }
        }
      });
    }

    const totalSoal = soalAktif.length > 0 ? soalAktif.length : (sesi.soal.length || 1);
    let jumlahBenar = 0;

    const hurufLabels = ["A", "B", "C", "D", "E", "F"];

    const detailEvaluasi = soalAktif.map((s: ISoal, idx: number) => {
      const sId = String((s as { _id?: unknown })._id || "");
      let jawabanSiswa = -1;

      if (sId && jawabanMap.has(sId)) {
        jawabanSiswa = jawabanMap.get(sId)!;
      } else if (idx < jawabanArrayRaw.length) {
        jawabanSiswa = jawabanArrayRaw[idx];
      }

      const pilihan = Array.isArray(s.pilihan) ? s.pilihan : [];
      const kunciJawaban = parseKunci(s.jawaban_benar, pilihan);
      const isBenar = jawabanSiswa >= 0 && jawabanSiswa === kunciJawaban;

      if (isBenar) {
        jumlahBenar++;
      }

      const labelSiswa =
        jawabanSiswa >= 0 && jawabanSiswa < hurufLabels.length
          ? hurufLabels[jawabanSiswa]
          : "-";
      const teksSiswa =
        jawabanSiswa >= 0 && pilihan[jawabanSiswa]
          ? pilihan[jawabanSiswa]
          : "(Tidak dijawab)";

      const labelKunci =
        kunciJawaban >= 0 && kunciJawaban < hurufLabels.length
          ? hurufLabels[kunciJawaban]
          : "-";
      const teksKunci =
        kunciJawaban >= 0 && pilihan[kunciJawaban]
          ? pilihan[kunciJawaban]
          : "-";

      // Penjelasan / pembahasan edukatif ramah anak
      let penjelasan = (s as { penjelasan?: string }).penjelasan?.trim() || "";
      if (!penjelasan) {
        if (isBenar) {
          penjelasan = `Pilihanmu tepat sekali! Jawaban yang benar adalah pilihan ${labelKunci}: "${teksKunci}".`;
        } else {
          penjelasan = `Jawaban yang tepat adalah pilihan ${labelKunci}: "${teksKunci}". Kamu memilih "${teksSiswa}". Pelajari kembali materi ini agar di kesempatan berikutnya dapat menjawab dengan tepat!`;
        }
      }

      return {
        nomor: idx + 1,
        soalId: sId,
        pertanyaan: s.pertanyaan,
        pilihan,
        jawabanSiswa,
        kunciJawaban,
        labelSiswa,
        teksSiswa,
        labelKunci,
        teksKunci,
        isBenar,
        penjelasan,
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
      jawaban: jawabanArrayRaw,
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
      jawaban: jawabanArrayRaw,
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