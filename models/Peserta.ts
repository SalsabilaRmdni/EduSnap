import mongoose, { Schema, models, model } from "mongoose";

export interface IPeserta extends mongoose.Document {
  sesi_id: mongoose.Types.ObjectId;
  siswa_id: mongoose.Types.ObjectId;
  jawaban: string[];
  skor: number;
}

const PesertaSchema = new Schema<IPeserta>(
  {
    sesi_id: { type: Schema.Types.ObjectId, ref: "Sesi", required: true },
    siswa_id: { type: Schema.Types.ObjectId, ref: "Siswa", required: true },
    jawaban: { type: [String], default: [] },
    skor: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.Peserta || model<IPeserta>("Peserta", PesertaSchema);
