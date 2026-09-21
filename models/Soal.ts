import mongoose, { Schema, models, model } from "mongoose";

const SoalSchema = new Schema({
  materiId: { type: Schema.Types.ObjectId, ref: "Materi", required: true },
  pertanyaan: { type: String, required: true },
  pilihan: { type: [String], required: true }, // 4 opsi jawaban
  jawabanBenar: { type: Number, required: true }, // index 0-3 dari array pilihan
  createdAt: { type: Date, default: Date.now },
});

export default models.Soal || model("Soal", SoalSchema);