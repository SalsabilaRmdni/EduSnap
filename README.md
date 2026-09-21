# Quiz Generator App — MVP (Step 1: Setup Project)

Progres hari ini: **setup project Next.js + koneksi MongoDB**, sesuai
konsep & ERD yang sudah direview.

## Apa yang sudah dibuat

- Project Next.js 15 (App Router + TypeScript + Tailwind CSS)
- Koneksi ke MongoDB via Mongoose (`lib/mongodb.ts`)
- Model database sesuai ERD:
  - `models/Guru.ts`
  - `models/Kelas.ts`
  - `models/Siswa.ts`
  - `models/Sesi.ts` (termasuk sub-skema soal)
  - `models/Peserta.ts`
- Endpoint tes koneksi: `GET /api/health`

## Cara menjalankan di komputer kamu

1. Install dependencies:
   ```bash
   npm install
   ```

2. Buat cluster MongoDB gratis di MongoDB Atlas (kalau belum punya),
   lalu ambil connection string-nya.

3. Salin `.env.local.example` menjadi `.env.local`, lalu isi
   `MONGODB_URI` dengan connection string dari Atlas:
   ```bash
   cp .env.local.example .env.local
   ```

4. Jalankan development server:
   ```bash
   npm run dev
   ```

5. Buka http://localhost:3000 — kalau tampil halaman
   "Quiz Generator App — MVP", setup sudah berhasil.

6. Cek koneksi database di http://localhost:3000/api/health.
   Kalau responnya `"status": "ok"`, berarti sudah konek ke MongoDB. 🎉

## Rencana langkah berikutnya (MVP)

Urutan yang disarankan, mengikuti alur sistem di konsep:

1. ~~Setup project + koneksi database~~ (hari ini)
2. Login guru (email + password)
3. Upload foto materi buku + OCR -> jadi teks
4. Generate soal otomatis dari teks (AI, dengan context mapel)
5. Guru buat sesi kuis (kode unik) + kelola roster kelas (siswa)
6. Siswa join sesi pakai kode, tanpa akun
7. Siswa kerjakan & submit jawaban
8. Penilaian otomatis + simpan skor ke Peserta
9. Riwayat nilai siswa lintas sesi ("Riwayat Nilai Saya")
10. Guru lihat rekap hasil per sesi
