import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI belum diset. Tambahkan di file .env.local, contoh:\n" +
    "MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db_name>"
  );
}

/**
 * Next.js (dev mode) me-reload module setiap ada perubahan file,
 * jadi koneksi mongoose di-cache di global object supaya tidak
 * membuat koneksi baru berkali-kali.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
