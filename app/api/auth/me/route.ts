import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME, normalizeRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ status: "error", message: "Belum login" }, { status: 401 });
  }

  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ status: "error", message: "Sesi tidak valid" }, { status: 401 });
  }

  // Ambil role terbaru dari database secara aman
  const { connectDB } = await import("@/lib/mongodb");
  const Guru = (await import("@/models/Guru")).default;
  await connectDB();
  const guruDoc = await Guru.findById(session.guruId);

  const effectiveRole = normalizeRole(guruDoc?.role ?? session.role);

  return NextResponse.json({
    status: "ok",
    guru: {
      ...session,
      role: effectiveRole,
      nama: guruDoc?.nama || session.nama,
      email: guruDoc?.email || session.email,
    },
  });
}
