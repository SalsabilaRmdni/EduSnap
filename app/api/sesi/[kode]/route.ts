import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Sesi from "@/models/Sesi";
import Siswa from "@/models/Siswa";
import ProgresSiswa from "@/models/ProgresSiswa";

export async function GET(
  req: NextRequest,
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

    const searchParams = req.nextUrl.searchParams;
    const namaParam = searchParams.get("nama");

    // Jika siswa menyertakan nama: jalankan logika bank soal adaptif per level tersimpan di server
    if (namaParam && namaParam.trim()) {
      const namaClean = namaParam.trim();
      const namaTernormalisasi = namaClean.toLowerCase();

      // Cari data siswa di roster jika sesi terikat ke kelas
      let siswaCocok = null;
      if (sesi.kelas_id) {
        siswaCocok = await Siswa.findOne({
          kelas_id: sesi.kelas_id,
          nama: {
            $regex: `^${namaClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            $options: "i",
          },
        });
      }

      // Cari atau buat ProgresSiswa
      let progresSiswa = await ProgresSiswa.findOne({
        sesi_id: sesi._id,
        nama_ternormalisasi: namaTernormalisasi,
      });

      if (!progresSiswa) {
        progresSiswa = await ProgresSiswa.create({
          sesi_id: sesi._id,
          siswa_id: siswaCocok?._id,
          nama_siswa: siswaCocok?.nama || namaClean,
          nama_ternormalisasi: namaTernormalisasi,
          level_saat_ini: 1,
          status_materi: "sedang_belajar",
          soal_pernah_dikeluarkan: [],
          percobaan_aktif: null,
          riwayat_percobaan: [],
          skor_tertinggi: 0,
        });
      }

      const targetLevel = progresSiswa.level_saat_ini || 1;
      const targetJumlahSoal = sesi.soal_per_level || 5;

      // Ambil soal yang sedang aktif jika ada (KEBAL REFRESH BROWSER)
      let activeQuestions: typeof sesi.soal = [];

      if (
        progresSiswa.percobaan_aktif &&
        Array.isArray(progresSiswa.percobaan_aktif.soal_ids) &&
        progresSiswa.percobaan_aktif.soal_ids.length > 0
      ) {
        const idSet = new Set(
          progresSiswa.percobaan_aktif.soal_ids.map((id: unknown) => String(id))
        );
        activeQuestions = sesi.soal.filter((s: { _id?: unknown }) =>
          idSet.has(String(s._id))
        );
      }

      // Jika belum ada percobaan aktif atau soal tidak ditemukan: pilih soal baru
      if (activeQuestions.length === 0) {
        // Filter bank soal sesi yang sesuai dengan level ini
        let levelSoal = sesi.soal.filter(
          (s: { level?: number }) => (s.level || 1) === targetLevel
        );

        // Graceful fallback jika sesi lama atau belum ada soal level ini
        if (levelSoal.length === 0) {
          levelSoal = sesi.soal;
        }

        const pernahKeluarSet = new Set(
          (progresSiswa.soal_pernah_dikeluarkan || []).map((id: unknown) => String(id))
        );

        let soalBelumKeluar = levelSoal.filter(
          (s: { _id?: unknown }) => !pernahKeluarSet.has(String(s._id))
        );

        // Jika soal baru di level ini sudah habis (karena mengulang berkali-kali)
        if (soalBelumKeluar.length < targetJumlahSoal) {
          // Reset riwayat soal yang pernah dikeluarkan KHUSUS untuk level ini
          const levelSoalIds = new Set(
            levelSoal.map((s: { _id?: unknown }) => String(s._id))
          );
          progresSiswa.soal_pernah_dikeluarkan = (
            progresSiswa.soal_pernah_dikeluarkan || []
          ).filter((id: unknown) => !levelSoalIds.has(String(id)));

          soalBelumKeluar = levelSoal;
        }

        // Acak dan ambil sejumlah targetJumlahSoal (default 5 butir)
        const shuffled = [...soalBelumKeluar].sort(() => Math.random() - 0.5);
        activeQuestions = shuffled.slice(0, targetJumlahSoal);

        // Simpan sesi percobaan aktif di server
        progresSiswa.percobaan_aktif = {
          level: targetLevel,
          soal_ids: activeQuestions.map((s: { _id?: unknown }) => s._id),
          dimulai_pada: new Date(),
        };
        await progresSiswa.save();
      }

      // Format soal TANPA menyertakan kunci jawaban untuk siswa
      const soalUntukSiswa = activeQuestions.map(
        (s: { _id?: unknown; pertanyaan: string; pilihan: string[]; level?: number }, index: number) => ({
          index,
          id: s._id ? String(s._id) : String(index),
          pertanyaan: s.pertanyaan,
          pilihan: s.pilihan,
          level: s.level || targetLevel,
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
          total_soal: soalUntukSiswa.length,
          soal_per_level: targetJumlahSoal,
          passing_grade: sesi.passing_grade || 70,
          daftar_siswa: daftarSiswaKelas,
          soal: soalUntukSiswa,
        },
        progres: {
          level: progresSiswa.level_saat_ini,
          statusMateri: progresSiswa.status_materi,
          percobaanKe: (progresSiswa.riwayat_percobaan?.length || 0) + 1,
          skorTertinggi: progresSiswa.skor_tertinggi,
          riwayatPercobaan: progresSiswa.riwayat_percobaan || [],
        },
      });
    }

    // Default (jika dibuka tanpa parameter nama): kembalikan soal tanpa kunci jawaban
    const soalUntukSiswa = sesi.soal.map(
      (s: { _id?: unknown; pertanyaan: string; pilihan: string[]; level?: number }, index: number) => ({
        index,
        id: s._id ? String(s._id) : String(index),
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        level: s.level || 1,
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
        soal_per_level: sesi.soal_per_level || 5,
        passing_grade: sesi.passing_grade || 70,
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