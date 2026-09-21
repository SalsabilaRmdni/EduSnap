import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET belum diset. Tambahkan di .env.local, contoh:\n" +
    "JWT_SECRET=isi_dengan_teks_acak_yang_panjang_dan_rahasia"
  );
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface GuruSessionPayload {
  guruId: string;
  nama: string;
  email: string;
}

// Bikin token JWT untuk sesi login guru, berlaku 7 hari.
export async function createSessionToken(payload: GuruSessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

// Verifikasi token JWT dari cookie. Return null kalau tidak valid/expired.
export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as GuruSessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "guru_session";
