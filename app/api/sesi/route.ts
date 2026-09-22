import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Sesi from "@/models/Sesi";
import Soal from "@/models/Soal";
import Materi from "@/models/Materi";
import Kelas from "@/models/Kelas";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Helper untuk generate kode unik 6 karakter (angka dan huruf besar)
function generateKodeUnik(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa O, 0, 1, I agar tidak membingungkan
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const { materiId, judulKuis, customKode, kelasId } = await req.json();

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

    // Validasi kelasId (opsional) - kalau diisi, pastikan kelas itu benar milik guru yang login
    let kelasValid: string | undefined = undefined;
    if (kelasId) {
      const kelas = await Kelas.findById(kelasId);
      if (!kelas) {
        return NextResponse.json(
          { status: "error", message: "Kelas tidak ditemukan" },
          { status: 404 }
        );
      }
      if (session?.guruId && String(kelas.guru_id) !== String(session.guruId)) {
        return NextResponse.json(
          { status: "error", message: "Kelas ini bukan milik Anda" },
          { status: 403 }
        );
      }
      kelasValid = kelas._id.toString();
    }

    const soalList = await Soal.find({ materiId }).sort({ createdAt: 1 });
    if (!soalList || soalList.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Belum ada soal untuk materi ini. Generate soal terlebih dahulu." },
        { status: 400 }
      );
    }

    // Tentukan kode unik
    let kode = (customKode || "").trim().toUpperCase();
    if (kode) {
      // Cek apakah kode sudah dipakai
      const existing = await Sesi.findOne({ kode_unik: kode });
      if (existing) {
        return NextResponse.json(
          { status: "error", message: `Kode kuis "${kode}" sudah digunakan, gunakan kode lain` },
          { status: 409 }
        );
      }
    } else {
      // Buat kode unik otomatis
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        kode = generateKodeUnik();
        const existing = await Sesi.findOne({ kode_unik: kode });
        if (!existing) isUnique = true;
        attempts++;
      }
    }

    // Format soal ke skema sesi
    const formattedSoal = soalList.map((s) => ({
      pertanyaan: s.pertanyaan,
      tipe: "pilihan_ganda",
      pilihan: s.pilihan,
      jawaban_benar: s.jawabanBenar,
    }));

    const sesiBaru = await Sesi.create({
      guru_id: session?.guruId,
      guru_email: session?.email || materi.guruEmail,
      materi_id: materi._id,
      kelas_id: kelasValid,
      kode_unik: kode,
      mata_pelajaran: materi.mataPelajaran || "Tematik / Umum",
      tingkat_kelas: materi.kelas || "SD (Umum)",
      judul_kuis: judulKuis || materi.namaMateri,
      status: "aktif",
      soal: formattedSoal,
    });

    return NextResponse.json({
      status: "ok",
      message: "Sesi kuis berhasil dibuat! Bagikan kode kuis ke siswa.",
      sesi: {
        id: sesiBaru._id,
        kode_unik: sesiBaru.kode_unik,
        judul_kuis: sesiBaru.judul_kuis,
        mata_pelajaran: sesiBaru.mata_pelajaran,
        tingkat_kelas: sesiBaru.tingkat_kelas,
        kelas_id: sesiBaru.kelas_id,
        total_soal: sesiBaru.soal.length,
      },
    });
  } catch (error) {
    console.error("Error create sesi:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal membuat sesi kuis",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.json({ status: "error", message: "Belum login" }, { status: 401 });
    }

    const sesiList = await Sesi.find({
      $or: [{ guru_id: session.guruId }, { guru_email: session.email }],
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      status: "ok",
      sesiList,
    });
  } catch (error) {
    console.error("Error get sesi list:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memuat riwayat sesi kuis",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
