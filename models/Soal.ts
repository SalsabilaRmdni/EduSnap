import mongoose, { Schema, models, model } from "mongoose";

export interface ISoalItem extends mongoose.Document {
  materiId: mongoose.Types.ObjectId;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
  level: number;
  konsep?: string;
  difficulty?: "normal" | "remedial";
  penjelasan?: string;
  tips?: string;
  createdAt: Date;
}

export type ISoalDoc = ISoalItem;

const SoalSchema = new Schema<ISoalItem>({
  materiId: { type: Schema.Types.ObjectId, ref: "Materi", required: true },
  pertanyaan: { type: String, required: true },
  pilihan: { type: [String], required: true }, // 4 opsi jawaban
  jawabanBenar: { type: Number, required: true }, // index 0-3 dari array pilihan
  level: { type: Number, enum: [1, 2, 3], default: 1, required: true },
  konsep: { type: String, default: "umum", trim: true },
  difficulty: { type: String, enum: ["normal", "remedial"], default: "normal" },
  penjelasan: { type: String, default: "", required: false },
  tips: { type: String, default: "", required: false },
  createdAt: { type: Date, default: Date.now },
});

export default models.Soal || model<ISoalItem>("Soal", SoalSchema);
