import mongoose, { Schema, models, model } from "mongoose";

export interface ISoalDoc extends mongoose.Document {
  materiId: mongoose.Types.ObjectId;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
  level: number;
  penjelasan?: string;
  createdAt: Date;
}

const SoalSchema = new Schema<ISoalDoc>({
  materiId: { type: Schema.Types.ObjectId, ref: "Materi", required: true },
  pertanyaan: { type: String, required: true },
  pilihan: { type: [String], required: true }, // 4 opsi jawaban
  jawabanBenar: { type: Number, required: true }, // index 0-3 dari array pilihan
  level: { type: Number, enum: [1, 2, 3], default: 1, required: true },
  penjelasan: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

export default models.Soal || model<ISoalDoc>("Soal", SoalSchema);