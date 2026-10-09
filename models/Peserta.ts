import mongoose, { Schema, models, model } from "mongoose";

export interface IPeserta extends mongoose.Document {
  sesi_id: mongoose.Types.ObjectId;
  siswa_id?: mongoose.Types.ObjectId;
  nama_siswa: string;
  level?: number;
  percobaan_ke?: number;
  lulus?: boolean;
  jawaban: (number | string)[];
  skor: number;
  jumlah_benar: number;
  total_soal: number;
  createdAt: Date;
  updatedAt: Date;
}

const PesertaSchema = new Schema<IPeserta>(
  {
    sesi_id: { type: Schema.Types.ObjectId, ref: "Sesi", required: true },
    siswa_id: { type: Schema.Types.ObjectId, ref: "Siswa", required: false },
    nama_siswa: { type: String, required: true },
    level: { type: Number, enum: [1, 2, 3], default: 1 },
    percobaan_ke: { type: Number, default: 1 },
    lulus: { type: Boolean, default: false },
    jawaban: { type: [Schema.Types.Mixed], default: [] },
    skor: { type: Number, default: 0 },
    jumlah_benar: { type: Number, default: 0 },
    total_soal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.Peserta || model<IPeserta>("Peserta", PesertaSchema);
