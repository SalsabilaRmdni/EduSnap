import { SignJWT, jwtVerify } from "jose";

export interface GuruSessionPayload {
  guruId: string;
  nama: string;
  email: string;
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
