import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

// Endpoint sederhana untuk cek apakah koneksi ke MongoDB berhasil.
// Akses via: GET http://localhost:3000/api/health
export async function GET() {
  try {
    const mongooseInstance = await connectDB();
    const dbName = mongooseInstance.connection.db?.databaseName;

    return NextResponse.json({
      status: "ok",
      message: "Berhasil terkoneksi ke MongoDB 🎉",
      database: dbName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal konek ke MongoDB. Cek MONGODB_URI di .env.local",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
