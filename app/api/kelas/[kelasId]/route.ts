import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import Siswa from "@/models/Siswa";
import Materi from "@/models/Materi";
import Sesi from "@/models/Sesi";
import Peserta from "@/models/Peserta";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Helper verifikasi sesi guru & kepemilikan kelas aktif
async function verifikasiAksesKelas(req: NextRequest, kelasId: string) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session?.guruId) {
    return { error: "Sesi guru tidak valid atau belum login", status: 401 };
  }

  const kelas = await Kelas.findOne({
    _id: kelasId,
    guru_id: session.guruId,
    is_active: { $ne: false },
  });

  if (!kelas) {
    return {
      error: "Kelas tidak ditemukan atau Anda tidak memiliki akses ke kelas ini",
      status: 403,
    };
  }

  return { session, kelas };
}

// GET: Ambil detail kelas beserta rekap jumlah data terkait (siswa, materi, kuis, peserta)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const authCheck = await verifikasiAksesKelas(req, kelasId);
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { kelas } = authCheck;

    // Hitung jumlah data terkait untuk verifikasi & dialog konfirmasi hapus
    const siswaCount = await Siswa.countDocuments({ kelas_id: kelasId });
    const materiCount = await Materi.countDocuments({ kelas_id: kelasId });
    const sesiList = await Sesi.find({ kelas_id: kelasId }).select("_id");
    const sesiIds = sesiList.map((s) => s._id);
    const sesiCount = sesiIds.length;
    const pesertaCount = sesiCount > 0 ? await Peserta.countDocuments({ sesi_id: { $in: sesiIds } }) : 0;

    return NextResponse.json({
      success: true,
      kelas,
      counts: {
        siswa: siswaCount,
        materi: materiCount,
        sesi: sesiCount,
        peserta: pesertaCount,
      },
    });
  } catch (err) {
    console.error("Error GET kelas detail:", err);
    return NextResponse.json({ error: "Gagal mengambil detail kelas" }, { status: 500 });
  }
}

// PATCH / PUT: Edit nama kelas milik guru
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const authCheck = await verifikasiAksesKelas(req, kelasId);
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { session, kelas } = authCheck;
    const body = await req.json();

    const rawNama = typeof body.namaKelas === "string" ? body.namaKelas : body.nama_kelas;
    const namaKelasBaru = typeof rawNama === "string" ? rawNama.trim() : "";

    // Validasi panjang & isi nama kelas
    if (!namaKelasBaru) {
      return NextResponse.json({ error: "Nama kelas wajib diisi" }, { status: 400 });
    }

    if (namaKelasBaru.length < 2 || namaKelasBaru.length > 50) {
      return NextResponse.json(
        { error: "Nama kelas harus antara 2 hingga 50 karakter" },
        { status: 400 }
      );
    }

    // Cek apakah guru ini sudah mempunyai kelas aktif lain dengan nama yang sama (case-insensitive)
    const escapedNama = namaKelasBaru.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const duplicate = await Kelas.findOne({
      guru_id: session.guruId,
      _id: { $ne: kelasId },
      is_active: { $ne: false },
      nama_kelas: { $regex: `^${escapedNama}$`, $options: "i" },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Kelas dengan nama "${namaKelasBaru}" sudah ada. Silakan gunakan nama lain.` },
        { status: 409 }
      );
    }

    // Update HANYA nama_kelas. _id dan kode_kelas TIDAK boleh berubah!
    kelas.nama_kelas = namaKelasBaru;
    await kelas.save();

    // Sinkronisasi teks kelas di Materi terkait (jika ada yang menyimpan field string kelas)
    await Materi.updateMany({ kelas_id: kelasId }, { $set: { kelas: namaKelasBaru } });

    return NextResponse.json({
      success: true,
      message: "Nama kelas berhasil diperbarui",
      kelas: {
        _id: kelas._id,
        guru_id: kelas.guru_id,
        nama_kelas: kelas.nama_kelas,
        kode_kelas: kelas.kode_kelas,
        created_at: kelas.created_at,
      },
    });
  } catch (err) {
    console.error("Error PATCH kelas:", err);
    return NextResponse.json({ error: "Gagal memperbarui kelas" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ kelasId: string }> }
) {
  return PATCH(req, context);
}

// DELETE: Hapus kelas secara aman dengan perlindungan data siswa & kuis
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const authCheck = await verifikasiAksesKelas(req, kelasId);
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { kelas } = authCheck;

    // Periksa apakah kelas memiliki data terkait (siswa, materi, sesi, peserta kuis)
    const siswaCount = await Siswa.countDocuments({ kelas_id: kelasId });
    const materiCount = await Materi.countDocuments({ kelas_id: kelasId });
    const sesiList = await Sesi.find({ kelas_id: kelasId }).select("_id");
    const sesiIds = sesiList.map((s) => s._id);
    const sesiCount = sesiIds.length;
    const pesertaCount = sesiCount > 0 ? await Peserta.countDocuments({ sesi_id: { $in: sesiIds } }) : 0;

    let deleteMethod: "hard_delete" | "soft_delete" = "soft_delete";

    // MEKANISME TERAMAN:
    // 1. Jika kelas masih kosong sama sekali (0 siswa, 0 materi, 0 sesi):
    //    Aman dihapus total (hard delete), kode unik kelas dibebaskan.
    // 2. Jika kelas sudah memiliki siswa, materi, atau riwayat nilai kuis:
    //    Lakukan Soft Delete (is_active = false, deleted_at = new Date()) agar seluruh riwayat kuis
    //    dan nilai peserta tetap aman dan tidak timbul orphan records atau kehilangan data sertifikat/nilai.
    if (siswaCount === 0 && materiCount === 0 && sesiCount === 0) {
      await Kelas.findByIdAndDelete(kelasId);
      deleteMethod = "hard_delete";
    } else {
      kelas.is_active = false;
      kelas.deleted_at = new Date();
      await kelas.save();
      deleteMethod = "soft_delete";
    }

    return NextResponse.json({
      success: true,
      message: `Kelas "${kelas.nama_kelas}" berhasil dihapus.`,
      method: deleteMethod,
      summary: {
        siswa: siswaCount,
        materi: materiCount,
        sesi: sesiCount,
        peserta: pesertaCount,
      },
    });
  } catch (err) {
    console.error("Error DELETE kelas:", err);
    return NextResponse.json({ error: "Gagal menghapus kelas" }, { status: 500 });
  }
}
