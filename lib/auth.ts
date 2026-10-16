import { SignJWT, jwtVerify } from "jose";

export interface GuruSessionPayload {
  guruId: string;
  nama: string;
  email: string;
  role?: "guru" | "admin";
}

export const SESSION_COOKIE_NAME = "guru_session";

/** Ambil secret key secara lazy saat runtime (bukan saat module load),
 *  sehingga tidak memblokir next build ketika env var belum tersedia. */
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET belum diset. Tambahkan di .env.local, contoh:\n" +
        "JWT_SECRET=isi_dengan_teks_acak_yang_panjang_dan_rahasia"
    );
  }
  return new TextEncoder().encode(secret);
}

// Bikin token JWT untuk sesi login guru, berlaku 7 hari.
export async function createSessionToken(payload: GuruSessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

// Verifikasi token JWT dari cookie. Return null kalau tidak valid/expired.
export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as GuruSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Normalisasi role agar selalu konsisten ("admin" atau "guru"):
 * - Menangani lowercase, trim whitespace, dan kasus malformed key lama di MongoDB.
 * - Nilai apapun selain admin valid akan kembali ke default "guru".
 */
export function normalizeRole(roleInput?: unknown): "admin" | "guru" {
  if (!roleInput) return "guru";

  if (typeof roleInput === "string") {
    const cleaned = roleInput.trim().toLowerCase();
    return cleaned === "admin" ? "admin" : "guru";
  }

  if (typeof roleInput === "object" && roleInput !== null) {
    const raw = roleInput as Record<string, unknown>;
    const malformed =
      raw['role: "admin"'] !== undefined ||
      raw['role:"admin"'] !== undefined ||
      raw["role: 'admin'"] !== undefined ||
      raw["role:'admin'"] !== undefined;
    if (malformed) return "admin";
    if (typeof raw.role === "string") {
      return raw.role.trim().toLowerCase() === "admin" ? "admin" : "guru";
    }
  }

  return "guru";
}

/**
 * Verifikasi apakah sesi yang dikirim milik akun Admin:
 * 1. Verifikasi JWT dari cookie guru_session.
 * 2. Ambil guruId dari payload.
 * 3. Cari Guru di database via connectDB().
 * 4. Pastikan Guru.role === "admin" setelah normalisasi.
 *
 * Mengembalikan:
 * - { authorized: true, guru } jika admin.
 * - { authorized: false, status: 401, error: "..." } jika belum login / sesi tidak valid.
 * - { authorized: false, status: 403, error: "..." } jika login tapi bukan admin.
 */
export async function verifyAdminSession(token?: string | null): Promise<
  | { authorized: true; session: GuruSessionPayload; guruDoc: any }
  | { authorized: false; status: 401 | 403; error: string }
> {
  if (!token) {
    return {
      authorized: false,
      status: 401,
      error: "Sesi tidak ditemukan atau belum login.",
    };
  }

  const session = await verifySessionToken(token);
  if (!session || !session.guruId) {
    return {
      authorized: false,
      status: 401,
      error: "Sesi tidak valid atau telah kedaluwarsa.",
    };
  }

  // Import dinamis untuk mencegah circular dependency saat build
  const { connectDB } = await import("@/lib/mongodb");
  const Guru = (await import("@/models/Guru")).default;

  await connectDB();
  const guruDoc = await Guru.findById(session.guruId);

  if (!guruDoc) {
    return {
      authorized: false,
      status: 401,
      error: "Akun pengguna tidak ditemukan di database.",
    };
  }

  const role = normalizeRole(guruDoc.role);
  if (role !== "admin") {
    return {
      authorized: false,
      status: 403,
      error: "Akses ditolak. Halaman atau aksi ini hanya dapat diakses oleh Administrator.",
    };
  }

  return {
    authorized: true,
    session,
    guruDoc,
  };
}
