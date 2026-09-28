import mongoose, { Schema, models, model } from "mongoose";

export interface IMateri extends mongoose.Document {
  guru_id?: mongoose.Types.ObjectId;
  kelas_id?: mongoose.Types.ObjectId;
  guruEmail?: string;
  namaMateri: string;
  mataPelajaran: string;
  kelas: string;
  halaman: string;
  gambarList: string[];
  teksHasilOCR: string;
  createdAt: Date;
}

const MateriSchema = new Schema<IMateri>({
  guru_id: { type: Schema.Types.ObjectId, ref: "Guru", required: false },
  kelas_id: { type: Schema.Types.ObjectId, ref: "Kelas", required: false },
  guruEmail: { type: String, required: false },
  namaMateri: { type: String, required: true },
  mataPelajaran: { type: String, default: "Tematik / Umum" },
  kelas: { type: String, default: "SD (Umum)" },
  halaman: { type: String, default: "" },
  // Array base64, satu entri per halaman foto materi (urutan sesuai urutan upload)
  gambarList: { type: [String], required: true },
  teksHasilOCR: { type: String, default: "" }, // hasil ekstrak teks gabungan semua halaman
  createdAt: { type: Date, default: Date.now },
});

export default models.Materi || model<IMateri>("Materi", MateriSchema);
