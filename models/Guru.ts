import mongoose, { Schema, models, model } from "mongoose";

export interface IGuru extends mongoose.Document {
  nama: string;
  email: string;
  password_hash?: string;
  google_id?: string;
  auth_provider?: "credentials" | "google";
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
    reset_password_token: { type: String, required: false },
    reset_password_expires: { type: Date, required: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// Pola "models.Guru || model(...)" supaya tidak error
// "OverwriteModelError" saat Next.js hot-reload di development.
export default models.Guru || model<IGuru>("Guru", GuruSchema);
