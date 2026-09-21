import mongoose, { Schema, models, model } from "mongoose";

export interface IGuru extends mongoose.Document {
  nama: string;
  email: string;
  password_hash: string;
  createdAt: Date;
}

const GuruSchema = new Schema<IGuru>(
  {
    nama: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// Pola "models.Guru || model(...)" supaya tidak error
// "OverwriteModelError" saat Next.js hot-reload di development.
export default models.Guru || model<IGuru>("Guru", GuruSchema);
