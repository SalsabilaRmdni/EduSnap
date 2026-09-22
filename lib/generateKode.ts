import Kelas from "@/models/Kelas";

// Generate kode akses kelas unik, contoh format: 4A-X7K9 atau K1-9M2P
export async function generateKodeKelas(namaKelas = "Kelas"): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Tanpa 0/O/1/I agar tidak tertukar oleh anak SD & guru

  // Ambil angka atau kode dari nama kelas (misal "Kelas 4A" -> "4A", "Kelas 2" -> "K2")
  const match = namaKelas.match(/(\d+[A-Za-z]?|[A-Za-z]+\d+)/);
  let prefix = match ? match[0].toUpperCase() : "K";
  if (prefix.length === 1 && !isNaN(Number(prefix))) {
    prefix = `K${prefix}`;
  }

  while (true) {
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    const kode = `${prefix}-${suffix}`;

    const existing = await Kelas.findOne({ kode_kelas: kode });
    if (!existing) {
      return kode;
    }
  }
}