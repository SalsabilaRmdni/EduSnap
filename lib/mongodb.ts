import mongoose from "mongoose";

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
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Lazy check: dilakukan saat runtime, bukan saat module load,
  // supaya next build tidak gagal karena env var belum tersedia.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI belum diset. Tambahkan di file .env.local, contoh:\n" +
        "MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db_name>"
    );
  }

  // Sanitasi URI (perbaiki typo umum seperti tanda tanya ganda '??' pada query string)
  const cleanUri = MONGODB_URI.trim().replace(/\?\?+/g, "?");

  if (!cached.promise || mongoose.connection.readyState === 0) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    };

    cached.promise = mongoose.connect(cleanUri, opts).then((mongooseInstance) => {
      cached.conn = mongooseInstance;
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      cached.conn = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }

  return cached.conn;
}
