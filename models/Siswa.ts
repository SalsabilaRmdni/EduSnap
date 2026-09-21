import mongoose, { Schema, models, model } from "mongoose";

export interface ISiswa extends mongoose.Document {
  kelas_id: mongoose.Types.ObjectId;
  nama: string;
  created_at: Date;
}

const SiswaSchema = new Schema<ISiswa>({
  kelas_id: { type: Schema.Types.ObjectId, ref: "Kelas", required: true },
  nama: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export default models.Siswa || model<ISiswa>("Siswa", SiswaSchema);
