import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Sesi from "@/models/Sesi";
import Peserta from "@/models/Peserta";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ kode: string }> }
) {
  try {
    await connectDB();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { status: "error", message: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { kode } = await context.params;

    const cleanKode = kode.trim();
    const sesi = await Sesi.findOne(
      cleanKode.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanKode)
        ? { $or: [{ kode_unik: cleanKode.toUpperCase() }, { _id: cleanKode }] }
        : { kode_unik: cleanKode.toUpperCase() }
    );

    if (!sesi) {
      return NextResponse.json(
        { status: "error", message: "Sesi kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Pastikan sesi kuis ini benar-benar milik guru yang sedang login
    const isOwner =
      (sesi.guru_id && String(sesi.guru_id) === String(session.guruId)) ||
      (sesi.guru_email && sesi.guru_email.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { status: "error", message: "Anda tidak berhak melihat rekap nilai sesi kuis ini" },
        { status: 403 }
      );
    }

    const pesertaList = await Peserta.find({ sesi_id: sesi._id }).sort({ createdAt: -1 });

    // Agregasi per siswa (Catatan User #4: gabungkan percobaan per siswa)
    const mapSiswa = new Map<string, {
      nama_siswa: string;
      siswa_id?: string;
      skor_tertinggi: number;
      level_terakhir: number;
      total_percobaan: number;
      lulus_terakhir: boolean;
      terakhir_mengerjakan: Date;
      riwayat: typeof pesertaList;
    }>();

    for (const p of pesertaList) {
      const key = (p.nama_siswa || "").trim().toLowerCase();
      if (!mapSiswa.has(key)) {
        mapSiswa.set(key, {
          nama_siswa: p.nama_siswa,
          siswa_id: p.siswa_id ? String(p.siswa_id) : undefined,
          skor_tertinggi: p.skor || 0,
          level_terakhir: p.level || 1,
          total_percobaan: 1,
          lulus_terakhir: !!p.lulus,
          terakhir_mengerjakan: p.createdAt,
          riwayat: [p],
        });
      } else {
        const item = mapSiswa.get(key)!;
        item.total_percobaan += 1;
        item.skor_tertinggi = Math.max(item.skor_tertinggi, p.skor || 0);
        item.riwayat.push(p);
      }
    }

    const rekapSiswa = Array.from(mapSiswa.values());
    const totalSiswaUnik = rekapSiswa.length;
    const rataRataSkor =
      totalSiswaUnik > 0
        ? Math.round(rekapSiswa.reduce((acc, s) => acc + s.skor_tertinggi, 0) / totalSiswaUnik)
        : 0;

    return NextResponse.json({
      status: "ok",
      sesi: {
        id: sesi._id,
        kode_unik: sesi.kode_unik,
        judul_kuis: sesi.judul_kuis,
        mata_pelajaran: sesi.mata_pelajaran,
        tingkat_kelas: sesi.tingkat_kelas,
        status: sesi.status,
        totalSoal: sesi.soal.length,
        passing_grade: sesi.passing_grade || 70,
        createdAt: sesi.createdAt,
      },
      stats: {
        totalPeserta: totalSiswaUnik,
        totalSubmit: pesertaList.length,
        rataRataSkor,
      },
      rekapSiswa,
      pesertaList,
    });
  } catch (error) {
    console.error("Error get peserta list:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memuat daftar peserta",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
