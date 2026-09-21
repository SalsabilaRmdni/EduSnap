import mongoose, { Schema, models, model } from "mongoose";

const MateriSchema = new Schema({
  guruEmail: { type: String, required: true },
  namaMateri: { type: String, required: true },
  gambarBase64: { type: String, required: true },
  teksHasilOCR: { type: String, default: "" }, // hasil ekstrak teks dari foto
  createdAt: { type: Date, default: Date.now },
});

export default models.Materi || model("Materi", MateriSchema);