import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Soal from "@/models/Soal";
import Materi from "@/models/Materi";
import AIConfig from "@/models/AIConfig";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  validasiQuestionBank,
  filterDuplikatSoal,
  ValidatedSoalItem,
} from "@/lib/questionBank";

export const maxDuration = 60; // Batas waktu fungsi serverless 60 detik untuk 3 pemanggilan AI

// Helper parser cerdas & kebal format untuk mengekstrak array soal dari respon model AI apapun
function extractSoalListFromAI(rawContent: string): unknown[] {
  if (!rawContent || typeof rawContent !== "string") return [];

  // 1. Hilangkan tag penalaran reasoning model (misal <think>...</think> pada DeepSeek)
  let cleanText = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .trim();

  // 2. Hilangkan pembungkus markdown code fence (```json ... ```)
  cleanText = cleanText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // 3. Coba parse langsung keseluruhan teks
  try {
    const direct = JSON.parse(cleanText);
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === "object") {
      for (const val of Object.values(direct)) {
        if (Array.isArray(val) && val.length > 0) return val;
      }
    }
  } catch {
    // Lanjut ke metode berikutnya
  }

  // 4. Cari array [ ... ] terluar
  const firstBracket = cleanText.indexOf("[");
  const lastBracket = cleanText.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const arraySlice = cleanText.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(arraySlice);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      try {
        const sanitized = arraySlice.replace(/,\s*([\]}])/g, "$1");
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Lanjut ke object
      }
    }
  }

  // 5. Cari object { ... } terluar jika dibungkus { "soal": [...] }
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const objSlice = cleanText.slice(firstBrace, lastBrace + 1);
    try {
      const sanitized = objSlice.replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(sanitized);
      if (parsed && typeof parsed === "object") {
        for (const val of Object.values(parsed)) {
          if (Array.isArray(val) && val.length > 0) return val;
        }
      }
    } catch {
      // Lanjut ke scanning blok per butir
    }
  }

  // 6. Ekstraksi per butir objek mandiri (balanced braces scanner) jika format terputus
  const recovered: unknown[] = [];
  let depth = 0;
  let startIdx = -1;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (char === "{") {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const candidate = cleanText.slice(startIdx, i + 1);
        try {
          const item = JSON.parse(candidate.replace(/,\s*([\]}])/g, "$1"));
          if (
            item &&
            typeof item === "object" &&
            ("pertanyaan" in item || "question" in item || "soal" in item || "options" in item || "pilihan" in item)
          ) {
            recovered.push(item);
          }
        } catch {
          // Lewati blok yang tidak valid
        }
        startIdx = -1;
      }
    }
  }

  return recovered;
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

    // 0. Ambil konfigurasi AI aktif dari database
    const activeAIConfig = await AIConfig.findOne().sort({ updatedAt: -1 });
    if (!activeAIConfig) {
      return NextResponse.json(
        {
          error:
            "Konfigurasi AI belum tersedia. Hubungi administrator sistem untuk mengatur AI.",
        },
        { status: 503 }
      );
    }

    if (!activeAIConfig.isActive) {
      return NextResponse.json(
        {
          error:
            "Layanan pembuatan soal AI sedang dinonaktifkan oleh administrator.",
        },
        { status: 503 }
      );
    }

    if (activeAIConfig.provider !== "openrouter") {
      return NextResponse.json(
        {
          error: `Provider AI "${activeAIConfig.provider}" saat ini belum didukung oleh sistem. Hubungi administrator.`,
        },
        { status: 500 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Konfigurasi OPENROUTER_API_KEY belum tersedia di server. Hubungi administrator.",
        },
        { status: 500 }
      );
    }

    const aiModelName = activeAIConfig.model;
    const aiReasoningEffort = activeAIConfig.reasoningEffort || "medium";

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

    const konteksMapel = materi.mataPelajaran || "Tematik / Umum";
    const konteksKelas = materi.kelas || "Sekolah Dasar (SD)";
    const konteksHalaman = materi.halaman ? `(Halaman: ${materi.halaman})` : "";
    const sumberTeks = !isOcrEmpty
      ? materi.teksHasilOCR
      : `Topik materi pelajaran: ${materi.namaMateri} (${konteksMapel} ${konteksKelas}).`;

    // Helper untuk memanggil OpenRouter per batch level menggunakan AIConfig dari DB
    async function requestBatchLevel(level: 1 | 2 | 3): Promise<{
      success: boolean;
      data?: any[];
      error?: string;
      status?: number;
    }> {
      const levelConfig = {
        1: {
          label: "LEVEL 1 (MUDAH)",
          deskripsi:
            "basic understanding, direct question, one-step reasoning. Menguji pemahaman konsep dasar (cukup 1 langkah berpikir sederhana). Pertanyaan sederhana, to-the-point, berupa fakta langsung, definisi, identifikasi, atau hitungan/penerapan langsung satu langkah.",
        },
        2: {
          label: "LEVEL 2 (SEDANG)",
          deskripsi:
            "application, contextual/story problem, cause-effect, 1–2 reasoning steps. Menguji penerapan konsep (application) ke dalam situasi nyata atau soal cerita kontekstual. Membutuhkan 1–2 langkah penalaran. Siswa harus memahami situasi kontekstual terlebih dahulu untuk menentukan konsep yang digunakan.",
        },
        3: {
          label: "LEVEL 3 (SULIT)",
          deskripsi:
            "analysis, multi-step reasoning, problem solving, lebih kompleks. Menguji analisis kritis, penalaran mendalam, atau pemecahan masalah bertingkat (multi-langkah berpikir). Membutuhkan penggabungan beberapa informasi, kondisi bersyarat, atau minimal 2-3 langkah penyelesaian.",
        },
      }[level];

      const batchPrompt = `Kamu adalah pakar kurikulum dan guru ${konteksKelas} yang profesional, kreatif, dan ramah anak.
Berdasarkan materi pelajaran dari buku sekolah berikut:
- Mata Pelajaran: ${konteksMapel}
- Tingkat Siswa: ${konteksKelas} ${konteksHalaman}
- Judul Bab/Materi: ${materi.namaMateri}

Teks Buku Pelajaran:
"""
${sumberTeks}
"""

TUGAS UTAMA:
Buatkan TEPAT 6 BUTIR SOAL PILIHAN GANDA dalam Bahasa Indonesia khusus untuk tingkat kesulitan:
${levelConfig.label}:
- ${levelConfig.deskripsi}
- Semua 6 butir soal WAJIB berada pada level: ${level}
- Materi dan konsep harus tetap berpegang teguh pada teks buku di atas. Jangan melenceng ke materi di luar topik.

ATURAN WAJIB STRUKTUR TIAP BUTIR SOAL:
- "pertanyaan": Kalimat tanya yang jelas, variatif polanya, ramah anak, dan relevan dengan materi teks.
- "pilihan": Array tepat 4 pilihan jawaban yang masuk akal dan jelas bedanya (opsi A, B, C, D).
- "jawabanBenar": Index jawaban yang benar (angka 0, 1, 2, atau 3). Kunci jawaban antar soal HARUS BERVARIASI (jangan seragam).
- "penjelasan": Penjelasan mendidik ramah anak yang menerangkan langkah berpikir dan mengapa jawaban tersebut benar.
- "tips": Tips belajar praktis dan mudah diingat anak untuk konsep soal tersebut.
- "konsep": Nama konsep spesifik yang diuji dari teks materi (contoh: "perkalian dasar", "perubahan wujud mencair", dsb). JANGAN gunakan konsep "umum".
- "level": ${level}
- "difficulty": "normal"

FORMAT OUTPUT:
Balas HANYA dengan JSON array murni tanpa markdown, tanpa backticks, tanpa kata pengantar atau penutup.
[
  {
    "pertanyaan": "...",
    "pilihan": ["opsi A", "opsi B", "opsi C", "opsi D"],
    "jawabanBenar": 0,
    "penjelasan": "...",
    "tips": "...",
    "konsep": "...",
    "level": ${level},
    "difficulty": "normal"
  }
]
Total tepat 6 item dengan "level": ${level}.`;

      const requestPayload: any = {
        model: aiModelName,
        messages: [{ role: "user", content: batchPrompt }],
      };

      if (aiReasoningEffort && aiReasoningEffort !== "none") {
        requestPayload.reasoning = {
          effort: aiReasoningEffort,
        };
      }

      let aiRes: Response;
      try {
        aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify(requestPayload),
        });
      } catch (networkErr: any) {
        console.error(`Network error pada Batch Level ${level}:`, networkErr);
        return {
          success: false,
          error: `Koneksi ke AI terputus saat memproses Batch Level ${level}. Silakan periksa jaringan internet dan coba lagi.`,
          status: 503,
        };
      }

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error(`OpenRouter error pada Batch Level ${level}:`, errText);
        let errorPesan = `Gagal menghubungi AI OpenRouter pada Batch Level ${level} (${aiRes.status}). Silakan coba beberapa saat lagi.`;
        if (aiRes.status === 401) {
          errorPesan = "Autentikasi OpenRouter tidak valid (401). Periksa kembali konfigurasi OPENROUTER_API_KEY.";
        } else if (aiRes.status === 402) {
          errorPesan = `Kredit OpenRouter tidak mencukupi (402) saat memproses Batch Level ${level}.`;
        } else if (aiRes.status === 404) {
          errorPesan = "Model AI tidak ditemukan pada endpoint OpenRouter (404).";
        } else if (aiRes.status === 429) {
          errorPesan = `Batas kuota request OpenRouter terlampaui (429 - Rate Limit) saat memproses Batch Level ${level}. Mohon tunggu beberapa saat sebelum mencoba lagi.`;
        }

        return {
          success: false,
          error: errorPesan,
          status: aiRes.status >= 400 && aiRes.status < 500 ? aiRes.status : 500,
        };
      }

      let rawContent = "";
      try {
        const aiData = await aiRes.json();
        rawContent = aiData.choices?.[0]?.message?.content ?? "";
      } catch {
        return {
          success: false,
          error: `Gagal membaca respon AI pada Batch Level ${level}.`,
          status: 500,
        };
      }

      // Gunakan parser cerdas gabungan untuk mengekstrak array soal
      const extractedItems = extractSoalListFromAI(rawContent);

      if (!Array.isArray(extractedItems) || extractedItems.length < 5) {
        return {
          success: false,
          error: `Batch Level ${level} hanya menghasilkan ${Array.isArray(extractedItems) ? extractedItems.length : 0} butir soal (minimal 5 butir dibutuhkan).`,
          status: 422,
        };
      }

      // Pastikan level terisi dengan angka level batch ini
      const sanitizedList = extractedItems.map((item: any) => ({
        ...item,
        level,
        difficulty: item.difficulty || "normal",
        konsep: typeof item.konsep === "string" && item.konsep.trim() ? item.konsep.trim() : "umum",
      }));

      return {
        success: true,
        data: sanitizedList,
      };
    }

    // Panggil sekuensial antar batch dengan jeda agar tidak memicu rate limit / in-flight budget exhausted
    // BATCH REQUEST 1: Level 1 (6 butir)
    const batch1 = await requestBatchLevel(1);
    if (!batch1.success || !batch1.data) {
      return NextResponse.json(
        { error: batch1.error || "Gagal membuat soal Batch Level 1 (Mudah). Tidak ada soal yang disimpan." },
        { status: batch1.status || 500 }
      );
    }
    await new Promise((r) => setTimeout(r, 800));

    // BATCH REQUEST 2: Level 2 (6 butir)
    const batch2 = await requestBatchLevel(2);
    if (!batch2.success || !batch2.data) {
      return NextResponse.json(
        { error: batch2.error || "Gagal membuat soal Batch Level 2 (Sedang). Tidak ada partial soal yang disimpan." },
        { status: batch2.status || 500 }
      );
    }
    await new Promise((r) => setTimeout(r, 800));

    // BATCH REQUEST 3: Level 3 (6 butir)
    const batch3 = await requestBatchLevel(3);
    if (!batch3.success || !batch3.data) {
      return NextResponse.json(
        { error: batch3.error || "Gagal membuat soal Batch Level 3 (Sulit). Tidak ada partial soal yang disimpan." },
        { status: batch3.status || 500 }
      );
    }

    // 1. Gabungkan hasil ketiga batch menjadi satu array (6 + 6 + 6 = 18 butir)
    const combinedRawSoalList: any[] = [
      ...batch1.data.slice(0, 6),
      ...batch2.data.slice(0, 6),
      ...batch3.data.slice(0, 6),
    ];

    // 2. Jalankan validasiQuestionBank() pada keseluruhan bank soal
    const validasiRes = validasiQuestionBank(combinedRawSoalList);
    if (!validasiRes.valid || validasiRes.soalList.length === 0) {
      return NextResponse.json(
        {
          error:
            validasiRes.error ||
            "Hasil Question Bank belum memenuhi standar validasi (minimal 18 butir: 6 L1, 6 L2, 6 L3). Tidak ada data yang disimpan.",
        },
        { status: 422 }
      );
    }

    // 3. Pastikan kuota terpenuhi: level1 >= 6, level2 >= 6, level3 >= 6, dan total >= 18
    if (
      validasiRes.counts.level1 < 6 ||
      validasiRes.counts.level2 < 6 ||
      validasiRes.counts.level3 < 6 ||
      validasiRes.counts.total < 18
    ) {
      return NextResponse.json(
        {
          error: `Komposisi soal belum memenuhi kuota minimum 18 butir (Level 1: ${validasiRes.counts.level1}/6, Level 2: ${validasiRes.counts.level2}/6, Level 3: ${validasiRes.counts.level3}/6). Tidak ada soal yang disimpan.`,
        },
        { status: 422 }
      );
    }

    // 4. Ambil soal yang sudah ada di database untuk mencegah duplikasi
    const existingSoalDocs = await Soal.find({ materiId }, { pertanyaan: 1 });
    const { soalUnik, jumlahDuplikat } = filterDuplikatSoal(
      validasiRes.soalList,
      existingSoalDocs
    );

    if (soalUnik.length === 0) {
      return NextResponse.json(
        {
          error:
            "Semua butir soal hasil batch AI sudah ada di Question Bank materi ini. Tidak ada butir soal baru yang ditambahkan.",
        },
        { status: 409 }
      );
    }

    // 5. Simpan soal baru ke database HANYA setelah semua validasi lolos
    const soalDocsToInsert = soalUnik.map((s: ValidatedSoalItem) => ({
      materiId: materi._id,
      pertanyaan: s.pertanyaan,
      pilihan: s.pilihan,
      jawabanBenar: s.jawabanBenar,
      level: s.level,
      konsep: s.konsep,
      difficulty: s.difficulty,
      penjelasan: s.penjelasan,
      tips: s.tips,
      createdAt: new Date(),
    }));

    const soalTersimpan = await Soal.insertMany(soalDocsToInsert);

    const totalSemua = await Soal.countDocuments({ materiId });
    const countLvl1 = await Soal.countDocuments({ materiId, level: 1 });
    const countLvl2 = await Soal.countDocuments({ materiId, level: 2 });
    const countLvl3 = await Soal.countDocuments({ materiId, level: 3 });

    return NextResponse.json({
      success: true,
      message: `Berhasil membuat Question Bank! Ditambahkan ${soalTersimpan.length} butir soal baru (${validasiRes.counts.level1} Level 1, ${validasiRes.counts.level2} Level 2, ${validasiRes.counts.level3} Level 3).`,
      summary: {
        totalBaru: soalTersimpan.length,
        totalSemua,
        level1: countLvl1,
        level2: countLvl2,
        level3: countLvl3,
        duplikatDilewati: jumlahDuplikat,
      },
      soal: soalTersimpan,
    });
  } catch (err) {
    console.error("Error generate-soal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan pada server saat membuat Question Bank." },
      { status: 500 }
    );
  }
}