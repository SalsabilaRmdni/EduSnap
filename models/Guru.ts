import mongoose, { Schema, models, model } from "mongoose";

export interface IGuru extends mongoose.Document {
  nama: string;
  email: string;
  password_hash?: string;
  google_id?: string;
  auth_provider?: "credentials" | "google";
  role?: "guru" | "admin";
  reset_password_token?: string;
  reset_password_expires?: Date;
  createdAt: Date;
}

const GuruSchema = new Schema<IGuru>(
  {
    nama: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: false },
    google_id: { type: String, required: false, sparse: true },
    auth_provider: { type: String, enum: ["credentials", "google"], default: "credentials" },
    role: { type: String, enum: ["guru", "admin"], default: "guru" },
    reset_password_token: { type: String, required: false },
    reset_password_expires: { type: Date, required: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, strict: false }
);

// Normalisasi role jika ada input malformed dari MongoDB Atlas atau spasi/huruf besar
GuruSchema.pre("init", function (rawDoc: any) {
  if (rawDoc) {
    const malformedAdmin =
      rawDoc['role: "admin"'] !== undefined ||
      rawDoc['role:"admin"'] !== undefined ||
      rawDoc["role: 'admin'"] !== undefined ||
      rawDoc["role:'admin'"] !== undefined;

    if (malformedAdmin) {
      rawDoc.role = "admin";
    } else if (typeof rawDoc.role === "string") {
      rawDoc.role = rawDoc.role.trim().toLowerCase();
    }
  }
});

// Pola "models.Guru || model(...)" supaya tidak error
// "OverwriteModelError" saat Next.js hot-reload di development.
export default models.Guru || model<IGuru>("Guru", GuruSchema);
