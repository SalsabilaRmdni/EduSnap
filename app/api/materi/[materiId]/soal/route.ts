import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";
import Soal from "@/models/Soal";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

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
        { status: "error", message: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await context.params;

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

    // Pastikan materi ini milik guru yang sedang login
    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { status: "error", message: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const soalList = await Soal.find({ materiId }).sort({ createdAt: 1 });

    return NextResponse.json({
      status: "ok",
      materi: {
        id: materi._id,
        namaMateri: materi.namaMateri,
        mataPelajaran: materi.mataPelajaran || "Tematik / Umum",
        kelas: materi.kelas || "SD (Umum)",
        kelas_id: materi.kelas_id,
        halaman: materi.halaman || "",
        teksHasilOCR: materi.teksHasilOCR || "",
      },
      soal: soalList,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal mengambil data kuis",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT: perbarui butir soal (pertanyaan, pilihan, atau kunci jawaban)
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ materiId: string }> }
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

    const { materiId } = await context.params;
    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json(
        { status: "error", message: "Materi tidak ditemukan" },
        { status: 404 }
      );
    }

    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { status: "error", message: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const { soalId, pertanyaan, pilihan, jawabanBenar } = await req.json();

    if (!soalId) {
      return NextResponse.json(
        { status: "error", message: "soalId wajib disertakan" },
        { status: 400 }
      );
    }

    const updated = await Soal.findOneAndUpdate(
      { _id: soalId, materiId },
      {
        pertanyaan: pertanyaan?.trim(),
        pilihan: Array.isArray(pilihan) ? pilihan : undefined,
        jawabanBenar: jawabanBenar !== undefined ? Number(jawabanBenar) : undefined,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { status: "error", message: "Soal tidak ditemukan pada materi ini" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", soal: updated });
  } catch (error) {
    console.error("Error PUT soal:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal memperbarui butir soal",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE: hapus butir soal
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
        { status: "error", message: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await context.params;
    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json(
        { status: "error", message: "Materi tidak ditemukan" },
        { status: 404 }
      );
    }

    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { status: "error", message: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const soalId = searchParams.get("soalId");

    if (!soalId) {
      return NextResponse.json(
        { status: "error", message: "soalId wajib disertakan" },
        { status: 400 }
      );
    }

    const deleted = await Soal.findOneAndDelete({ _id: soalId, materiId });

    if (!deleted) {
      return NextResponse.json(
        { status: "error", message: "Soal tidak ditemukan pada materi ini" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", message: "Soal berhasil dihapus" });
  } catch (error) {
    console.error("Error DELETE soal:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal menghapus butir soal",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
