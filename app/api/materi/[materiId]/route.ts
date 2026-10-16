import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";
import Soal from "@/models/Soal";
import Sesi from "@/models/Sesi";
import Peserta from "@/models/Peserta";
import ProgressSiswa from "@/models/ProgressSiswa";
import Kelas from "@/models/Kelas";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// GET: Ambil detail materi beserta ringkasan relasi data child (untuk modal delete / info)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ materiId: string }> }
) {
  try {
    await connectDB();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await context.params;

    if (!materiId || !mongoose.Types.ObjectId.isValid(materiId)) {
      return NextResponse.json(
        { error: "ID materi tidak valid" },
        { status: 400 }
      );
    }

    const materi = await Materi.findById(materiId).select("-gambarList");
    if (!materi) {
      return NextResponse.json(
        { error: "Materi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi kepemilikan materi
    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && session.email && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { error: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    // Hitung jumlah data turunan yang terhubung
    const [soalCount, sesiCount, progressCount] = await Promise.all([
      Soal.countDocuments({ materiId: materi._id }),
      Sesi.countDocuments({ materi_id: materi._id }),
      ProgressSiswa.countDocuments({ materi_id: materi._id }),
    ]);

    return NextResponse.json({
      success: true,
      materi,
      counts: {
        soal: soalCount,
        sesi: sesiCount,
        progressSiswa: progressCount,
      },
    });
  } catch (err) {
    console.error("Error GET materi:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat mengambil data materi." },
      { status: 500 }
    );
  }
}

// PATCH: Edit materi milik guru yang sedang login
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ materiId: string }> }
) {
  try {
    await connectDB();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await context.params;

    if (!materiId || !mongoose.Types.ObjectId.isValid(materiId)) {
      return NextResponse.json(
        { error: "ID materi tidak valid" },
        { status: 400 }
      );
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json(
        { error: "Materi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi kepemilikan materi
    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && session.email && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { error: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { namaMateri, mataPelajaran, kelas, halaman, kelas_id } = body;

    // 1. Update namaMateri jika diberikan
    if (namaMateri !== undefined) {
      const cleanNama = String(namaMateri).trim();
      if (!cleanNama) {
        return NextResponse.json(
          { error: "Nama materi tidak boleh kosong" },
          { status: 400 }
        );
      }
      materi.namaMateri = cleanNama;
    }

    // 2. Update mataPelajaran jika diberikan
    if (mataPelajaran !== undefined) {
      const cleanMapel = String(mataPelajaran).trim();
      if (cleanMapel) {
        materi.mataPelajaran = cleanMapel;
      }
    }

    // 3. Update halaman jika diberikan
    if (halaman !== undefined) {
      materi.halaman = String(halaman).trim();
    }

    // 4. Update kelas_id jika diberikan (pastikan kelas tujuan milik guru ini)
    if (kelas_id !== undefined && kelas_id) {
      if (!mongoose.Types.ObjectId.isValid(kelas_id)) {
        return NextResponse.json(
          { error: "ID kelas tidak valid" },
          { status: 400 }
        );
      }
      const kelasDoc = await Kelas.findOne({
        _id: kelas_id,
        guru_id: session.guruId,
        is_active: { $ne: false },
      });
      if (!kelasDoc) {
        return NextResponse.json(
          { error: "Kelas tujuan tidak ditemukan atau bukan milik Anda" },
          { status: 403 }
        );
      }
      materi.kelas_id = kelasDoc._id;
      materi.kelas = kelasDoc.nama_kelas;
    } else if (kelas !== undefined && String(kelas).trim()) {
      materi.kelas = String(kelas).trim();
    }

    await materi.save();

    return NextResponse.json({
      success: true,
      message: "Materi berhasil diperbarui",
      materi: {
        _id: String(materi._id),
        namaMateri: materi.namaMateri,
        mataPelajaran: materi.mataPelajaran,
        kelas: materi.kelas,
        kelas_id: materi.kelas_id ? String(materi.kelas_id) : undefined,
        halaman: materi.halaman,
        createdAt: materi.createdAt,
      },
    });
  } catch (err) {
    console.error("Error PATCH materi:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memperbarui materi." },
      { status: 500 }
    );
  }
}

// DELETE: Hapus materi beserta seluruh data turunannya (Cascade Delete)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ materiId: string }> }
) {
  try {
    await connectDB();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await context.params;

    if (!materiId || !mongoose.Types.ObjectId.isValid(materiId)) {
      return NextResponse.json(
        { error: "ID materi tidak valid" },
        { status: 400 }
      );
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json(
        { error: "Materi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi kepemilikan materi
    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && session.email && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { error: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const targetObjId = materi._id;

    // ==========================================
    // CASCADE DELETE TERKONTROL
    // ==========================================
    // 1. Cari seluruh sesi yang dibuat dari materi ini
    const sesiDocs = await Sesi.find({ materi_id: targetObjId }, { _id: 1 });
    const sesiIds = sesiDocs.map((s) => s._id);

    // 2. Hapus jawaban / nilai peserta yang hanya mengikuti sesi materi ini
    let deletedPesertaCount = 0;
    if (sesiIds.length > 0) {
      const resPeserta = await Peserta.deleteMany({ sesi_id: { $in: sesiIds } });
      deletedPesertaCount = resPeserta.deletedCount;
    }

    // 3. Hapus seluruh sesi kuis dari materi ini
    const resSesi = await Sesi.deleteMany({ materi_id: targetObjId });

    // 4. Hapus seluruh butir soal (Question Bank) yang terhubung ke materi ini
    const resSoal = await Soal.deleteMany({ materiId: targetObjId });

    // 5. Hapus progres adaptive siswa yang khusus pada materi ini
    const resProgress = await ProgressSiswa.deleteMany({ materi_id: targetObjId });

    // 6. Hapus dokumen materi itu sendiri
    await Materi.findByIdAndDelete(targetObjId);

    return NextResponse.json({
      success: true,
      message: "Materi beserta data terkait berhasil dihapus.",
      deleted: {
        materi: 1,
        materiId: String(targetObjId),
        soal: resSoal.deletedCount,
        sesi: resSesi.deletedCount,
        peserta: deletedPesertaCount,
        progressSiswa: resProgress.deletedCount,
      },
    });
  } catch (err) {
    console.error("Error DELETE materi:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menghapus materi." },
      { status: 500 }
    );
  }
}
