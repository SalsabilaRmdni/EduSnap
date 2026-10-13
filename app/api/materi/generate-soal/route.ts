import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Soal from "@/models/Soal";
import Materi from "@/models/Materi";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const maxDuration = 60; // Batas waktu fungsi serverless 60 detik untuk 3 pemanggilan AI

interface SoalAIItem {
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
  level: number;
  penjelasan?: string;
}

const LEVEL_CONFIGS = {
  1: {
    nama: "Level 1 (Mudah)",
    panduan:
      "Tingkat Mudah / Pemahaman Dasar (C1–C2): Mengingat fakta langsung, definisi kata/istilah sederhana, dan informasi eksplisit dari teks buku. Kalimat pertanyaan harus singkat, lugas, dan mudah dipahami anak SD.",
  },
  2: {
    nama: "Level 2 (Sedang)",
    panduan:
      "Tingkat Sedang / Penerapan Konsep (C3): Memahami hubungan sebab-akibat sederhana, contoh penerapan konsep dalam kehidupan sehari-hari anak SD berdasarkan teks, atau mengelompokkan informasi.",
  },
  3: {
    nama: "Level 3 (Sulit / HOTS)",
    panduan:
      "Tingkat Sulit / Penalaran Kritis & HOTS (C4): Menganalisis situasi, menarik kesimpulan yang tidak tertulis langsung, mengevaluasi pernyataan, atau memecahkan masalah kontekstual berdasarkan konsep materi.",
  },
} as const;

// Helper untuk memanggil AI khusus per level dengan mekanisme retry mandiri per level
async function requestLevelSoal(
  level: 1 | 2 | 3,
  konteksMapel: string,
  konteksKelas: string,
  konteksHalaman: string,
  namaMateri: string,
  teksOCR: string,
  apiKey: string,
  modelName: string,
  maxRetry = 2
): Promise<SoalAIItem[]> {
  const { nama, panduan } = LEVEL_CONFIGS[level];

  const isOcrValid =
    teksOCR &&
    teksOCR.trim().length >= 10 &&
    !teksOCR.includes("[Gagal membaca");

  const sumberMateri = isOcrValid
    ? `Teks Buku Pelajaran (Hasil OCR):
"""
${teksOCR}
"""`
    : `(Catatan: Teks hasil pindai kurang terbaca, jadi gunakan topik materi "${namaMateri}" untuk mata pelajaran ${konteksMapel} ${konteksKelas} sebagai acuan pembuatan soal).`;

  const prompt = `Kamu adalah guru ${konteksKelas} yang ramah, mendidik, dan ahli dalam penyusunan soal evaluasi SD berjenjang.
Berdasarkan materi pelajaran dari buku sekolah berikut:
- Mata Pelajaran: ${konteksMapel}
- Tingkat Siswa: ${konteksKelas} ${konteksHalaman}
- Judul Bab/Materi: ${namaMateri}

${sumberMateri}

TUGAS:
Buatkan 10 butir soal kuis pilihan ganda khusus untuk ${nama}.
Panduan Karakteristik Soal:
${panduan}

Ketentuan Khusus:
1. Buat tepat 10 butir soal.
2. Setiap soal memiliki tepat 4 pilihan jawaban yang masuk akal bagi anak SD.
3. Setiap soal memiliki tepat 1 kunci jawaban berupa indeks angka (0, 1, 2, atau 3).
4. Setiap soal memiliki penjelasan/pembahasan singkat yang mendidik dan mudah dipahami anak SD.
5. Pertanyaan dan pilihan harus dalam Bahasa Indonesia yang baik dan bebas dari kesalahan ketik OCR.
6. Pertanyaan dan pilihan harus ringkas, lugas, dan padat (hindari paragraf bacaan cerita yang terlalu panjang agar respon lengkap).

Balas HANYA dengan JSON array murni (tanpa teks pembuka/penutup, tanpa komentar, tanpa markdown):
[
  {
    "pertanyaan": "Pertanyaan soal...",
    "pilihan": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "jawabanBenar": 0,
    "penjelasan": "Penjelasan ringkas mengapa jawaban ini benar."
  }
]`;

  let activeModel = modelName;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 3500,
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();

        // Jika terkena HTTP 402 (Payment Required / in_flight_budget_exhausted)
        if (aiRes.status === 402) {
          if (activeModel !== "openrouter/free") {
            console.warn(`[GenerateSoal] Model ${activeModel} terkena limit kredit (HTTP 402). Mencoba beralih ke model gratis (openrouter/free)...`);
            activeModel = "openrouter/free";
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw new Error(
            "Saldo kredit OpenRouter tidak mencukupi atau kuota pemanggilan bersamaan penuh. Silakan cek saldo kredit di https://openrouter.ai/settings/credits atau gunakan API key dengan kredit aktif."
          );
        }

        let pesanError = `OpenRouter HTTP ${aiRes.status}: ${errText}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) {
            pesanError = parsed.error.message;
          }
        } catch {
          // ignore
        }

        throw new Error(pesanError);
      }

      const aiData = await aiRes.json();
      const rawContent: string = aiData.choices?.[0]?.message?.content ?? "";

      // 1. Coba parse array utuh
      const jsonMatch = rawContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
      let parsed: unknown = null;
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          try {
            const sanitized = jsonMatch[0].replace(/,\s*([\]}])/g, "$1");
            parsed = JSON.parse(sanitized);
          } catch {
            parsed = null;
          }
        }
      }

      // 2. Jika parse array utuh belum berhasil, pulihkan dari objek-objek pertanyaan yang sudah terbentuk
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const objectMatches = rawContent.match(/\{[\s\S]*?"pertanyaan"[\s\S]*?"pilihan"[\s\S]*?"jawabanBenar"[\s\S]*?\}/g);
        if (objectMatches && objectMatches.length > 0) {
          const recovered: Array<{ pertanyaan: string; pilihan: string[]; jawabanBenar: number; penjelasan?: string }> = [];
          for (const objStr of objectMatches) {
            try {
              const obj = JSON.parse(objStr.replace(/,\s*([\]}])/g, "$1"));
              if (obj.pertanyaan && Array.isArray(obj.pilihan)) {
                recovered.push(obj);
              }
            } catch {
              // Lewati objek yang korup
            }
          }
          if (recovered.length >= 5) {
            parsed = recovered;
          }
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Blok array JSON tidak ditemukan pada respon AI");
      }

      // Validasi dan normalisasi tiap item
      const validSoal: SoalAIItem[] = [];
      for (const item of parsed) {
        if (
          item &&
          typeof item.pertanyaan === "string" &&
          item.pertanyaan.trim().length > 0 &&
          Array.isArray(item.pilihan) &&
          item.pilihan.length >= 2
        ) {
          const jawabanBenar =
            typeof item.jawabanBenar === "number" &&
            item.jawabanBenar >= 0 &&
            item.jawabanBenar < item.pilihan.length
              ? item.jawabanBenar
              : 0;

          validSoal.push({
            pertanyaan: item.pertanyaan.trim(),
            pilihan: item.pilihan.map((p: unknown) => String(p).trim()),
            jawabanBenar,
            level,
            penjelasan: typeof item.penjelasan === "string" ? item.penjelasan.trim() : undefined,
          });
        }
      }

      if (validSoal.length < 5) {
        throw new Error(`Hanya ${validSoal.length} butir soal valid yang terbentuk (minimal 5 butir)`);
      }

      return validSoal;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Generate Soal] Percobaan ${attempt} gagal untuk ${nama}:`, lastError.message);
      if (attempt < maxRetry) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  throw new Error(`Gagal menghasilkan soal ${nama}: ${lastError?.message}`);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await req.json();

    if (!materiId) {
      return NextResponse.json({ error: "materiId wajib diisi" }, { status: 400 });
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    }

    // Pastikan materi ini milik guru yang sedang login
    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { error: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const isOcrEmpty =
      !materi.teksHasilOCR ||
      materi.teksHasilOCR.trim().length < 5 ||
      materi.teksHasilOCR.includes("[Gagal membaca");

    if (isOcrEmpty && (!materi.namaMateri || materi.namaMateri.trim().length < 3)) {
      return NextResponse.json(
        { error: "Teks buku atau judul materi tidak valid, tidak bisa generate soal" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY belum dikonfigurasi di environment variables" },
        { status: 500 }
      );
    }

    const modelName = process.env.OPENROUTER_MODEL || "google/gemini-3.8-flash";
    const konteksMapel = materi.mataPelajaran || "Tematik / Umum";
    const konteksKelas = materi.kelas || "Sekolah Dasar (SD)";
    const konteksHalaman = materi.halaman ? `(Halaman: ${materi.halaman})` : "";

    // Panggil secara berurutan (sekuensial) agar tidak memicu error in_flight_budget_exhausted di OpenRouter
    const soalLvl1 = await requestLevelSoal(1, konteksMapel, konteksKelas, konteksHalaman, materi.namaMateri, materi.teksHasilOCR || "", apiKey, modelName);
    await new Promise((r) => setTimeout(r, 800));

    const soalLvl2 = await requestLevelSoal(2, konteksMapel, konteksKelas, konteksHalaman, materi.namaMateri, materi.teksHasilOCR || "", apiKey, modelName);
    await new Promise((r) => setTimeout(r, 800));

    const soalLvl3 = await requestLevelSoal(3, konteksMapel, konteksKelas, konteksHalaman, materi.namaMateri, materi.teksHasilOCR || "", apiKey, modelName);

    const semuaSoal = [...soalLvl1, ...soalLvl2, ...soalLvl3];

    // Pastikan koneksi DB tetap aktif setelah pemanggilan AI paralel
    await connectDB();

    const soalTersimpan = await Soal.insertMany(
      semuaSoal.map((s) => ({
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanBenar: s.jawabanBenar,
        level: s.level,
        penjelasan: s.penjelasan,
        materiId,
      }))
    );

    return NextResponse.json({
      success: true,
      totalSoal: soalTersimpan.length,
      breakdown: {
        level1: soalLvl1.length,
        level2: soalLvl2.length,
        level3: soalLvl3.length,
      },
      soal: soalTersimpan,
    });
  } catch (err) {
    console.error("Gagal generate bank soal adaptif:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Gagal generate soal dari AI",
      },
      { status: 500 }
    );
  }
}