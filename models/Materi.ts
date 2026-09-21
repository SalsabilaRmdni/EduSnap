import { Schema, models, model } from "mongoose";

const MateriSchema = new Schema({
  guruEmail: { type: String, required: true },
  namaMateri: { type: String, required: true },
  mataPelajaran: { type: String, default: "Tematik / Umum" },
  kelas: { type: String, default: "SD (Umum)" },
  halaman: { type: String, default: "" },
  gambarBase64: { type: String, required: true },
  teksHasilOCR: { type: String, default: "" }, // hasil ekstrak teks dari foto
  createdAt: { type: Date, default: Date.now },
});

export default models.Materi || model("Materi", MateriSchema);