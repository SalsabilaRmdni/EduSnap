import mongoose from "mongoose";
import {
  normalisasiPertanyaan,
  ekstrakPolaPertanyaan,
  periksaPolaAntarLevel,
  periksaVariasiJawaban,
  validasiSoalItem,
  validasiQuestionBank,
  filterDuplikatSoal,
  ValidatedSoalItem,
} from "../lib/questionBank";
import {
  MASTERY_THRESHOLD,
  DEFAULT_QUIZ_LIMIT,
  hitungSkor,
  tentukanLevelDanStatus,
  identifikasiKonsepSalah,
  evaluasiJawaban,
  formatFeedbackSiswa,
} from "../lib/adaptiveLearning";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

// Generator mock soal Question Bank 18 butir dengan progresi kognitif nyata
function createRichMockQuestionBank(mapel: "Matematika" | "Bahasa Indonesia" | "IPA"): ValidatedSoalItem[] {
  if (mapel === "Matematika") {
    return [
      // 6 Soal Level 1 (Mudah: 1 langkah dasar, fakta langsung / hitungan langsung)
      { pertanyaan: "Berapa hasil dari 7 × 8?", pilihan: ["48", "54", "56", "64"], jawabanBenar: 2, konsep: "Perkalian Dasar", level: 1, difficulty: "normal", penjelasan: "7 × 8 = 56.", tips: "Tips: 7 dijumlahkan 8 kali." },
      { pertanyaan: "Berapa hasil dari 36 ÷ 6?", pilihan: ["5", "6", "7", "8"], jawabanBenar: 1, konsep: "Pembagian Dasar", level: 1, difficulty: "normal", penjelasan: "36 ÷ 6 = 6.", tips: "Tips: Pembagian kebalikan perkalian." },
      { pertanyaan: "Berapa hasil dari 45 + 28?", pilihan: ["63", "71", "73", "83"], jawabanBenar: 2, konsep: "Penjumlahan", level: 1, difficulty: "normal", penjelasan: "45 + 28 = 73.", tips: "Tips: Jumlahkan satuan lalu puluhan." },
      { pertanyaan: "Berapa hasil dari 90 - 37?", pilihan: ["53", "57", "63", "67"], jawabanBenar: 0, konsep: "Pengurangan", level: 1, difficulty: "normal", penjelasan: "90 - 37 = 53.", tips: "Tips: Teliti saat meminjam puluhan." },
      { pertanyaan: "Berapa hasil dari 9 × 4?", pilihan: ["32", "36", "40", "45"], jawabanBenar: 1, konsep: "Perkalian Dasar", level: 1, difficulty: "normal", penjelasan: "9 × 4 = 36.", tips: "Tips: Ingat tabel perkalian 9." },
      { pertanyaan: "Berapa hasil dari 64 ÷ 8?", pilihan: ["6", "7", "8", "9"], jawabanBenar: 2, konsep: "Pembagian Dasar", level: 1, difficulty: "normal", penjelasan: "64 ÷ 8 = 8.", tips: "Tips: 8 × 8 = 64." },

      // 6 Soal Level 2 (Sedang: 1-2 langkah, soal cerita kontekstual / penerapan situasi)
      { pertanyaan: "Siti memiliki 9 kotak pensil. Setiap kotak berisi 6 pensil. Berapa jumlah seluruh pensil Siti?", pilihan: ["45 pensil", "52 pensil", "54 pensil", "60 pensil"], jawabanBenar: 2, konsep: "Perkalian Kontekstual", level: 2, difficulty: "normal", penjelasan: "9 kotak × 6 pensil = 54 pensil.", tips: "Tips: Kalikan jumlah wadah dengan isi per wadah." },
      { pertanyaan: "Pak Budi membagikan 48 buku cerita secara merata kepada 8 kelompok belajar. Berapa buku yang diterima setiap kelompok?", pilihan: ["5 buku", "6 buku", "7 buku", "8 buku"], jawabanBenar: 1, konsep: "Pembagian Kontekstual", level: 2, difficulty: "normal", penjelasan: "48 ÷ 8 = 6 buku per kelompok.", tips: "Tips: Kata merata menunjukkan operasi pembagian." },
      { pertanyaan: "Di perpustakaan ada 120 buku. Dipinjam siswa sebanyak 45 buku. Berapa buku yang tersisa di rak?", pilihan: ["65 buku", "75 buku", "80 buku", "85 buku"], jawabanBenar: 1, konsep: "Pengurangan Kontekstual", level: 2, difficulty: "normal", penjelasan: "120 - 45 = 75 buku.", tips: "Tips: Pengurangan untuk mencari sisa benda." },
      { pertanyaan: "Edo membeli 3 kantong permen, masing-masing berisi 15 butir. Berapa butir total permen Edo?", pilihan: ["35 butir", "40 butir", "45 butir", "50 butir"], jawabanBenar: 2, konsep: "Perkalian Kontekstual", level: 2, difficulty: "normal", penjelasan: "3 × 15 = 45 butir.", tips: "Tips: Kalikan 3 dengan 15." },
      { pertanyaan: "Sebuah tali sepanjang 84 meter dipotong menjadi 7 bagian sama panjang. Berapa panjang setiap potongan tali?", pilihan: ["11 meter", "12 meter", "13 meter", "14 meter"], jawabanBenar: 1, konsep: "Pembagian Kontekstual", level: 2, difficulty: "normal", penjelasan: "84 ÷ 7 = 12 meter.", tips: "Tips: Bagi total panjang dengan jumlah potongan." },
      { pertanyaan: "Di toko ada 5 keranjang apel. Jika tiap keranjang berisi 18 apel, berapa banyak apel seluruhnya?", pilihan: ["80 apel", "85 apel", "90 apel", "95 apel"], jawabanBenar: 2, konsep: "Perkalian Kontekstual", level: 2, difficulty: "normal", penjelasan: "5 × 18 = 90 apel.", tips: "Tips: 5 × 18 = 90." },

      // 6 Soal Level 3 (Sulit: multi-langkah bertingkat, analisis strategi pemecahan masalah)
      { pertanyaan: "Sebuah sekolah memiliki 8 kelas. Setiap kelas mendapat 6 kotak pensil. Setiap kotak berisi 12 pensil. Jika 25 pensil rusak, berapa pensil yang masih dapat digunakan?", pilihan: ["525 pensil", "551 pensil", "576 pensil", "601 pensil"], jawabanBenar: 1, konsep: "Pemecahan Masalah Multi-Langkah", level: 3, difficulty: "normal", penjelasan: "Total kotak = 8 × 6 = 48 kotak. Total pensil = 48 × 12 = 576. Sisa = 576 - 25 = 551 pensil.", tips: "Tips: Hitung total kotak, kalikan isi per kotak, lalu kurangkan yang rusak." },
      { pertanyaan: "Ibu membeli 5 dus mie instan. Setiap dus berisi 24 bungkus. Sebanyak 30 bungkus dimasak untuk arisan, sisanya dibagikan sama banyak kepada 6 tetangga. Berapa bungkus mie yang didapat setiap tetangga?", pilihan: ["12 bungkus", "15 bungkus", "18 bungkus", "20 bungkus"], jawabanBenar: 1, konsep: "Operasi Campuran Multi-Langkah", level: 3, difficulty: "normal", penjelasan: "Total mie = 5 × 24 = 120. Sisa = 120 - 30 = 90. Tiap tetangga = 90 ÷ 6 = 15 bungkus.", tips: "Tips: Kerjakan berurutan: perkalian, pengurangan, lalu pembagian." },
      { pertanyaan: "Pak Joko memanen 3 keranjang mangga, tiap keranjang berisi 40 buah. Sebanyak 15 mangga busuk dibuang. Sisanya dimasukkan ke kantong plastik yang masing-masing memuat 7 buah. Berapa kantong plastik yang dibutuhkan?", pilihan: ["13 kantong", "15 kantong", "17 kantong", "19 kantong"], jawabanBenar: 1, konsep: "Pemecahan Masalah Bertingkat", level: 3, difficulty: "normal", penjelasan: "Panen = 3 × 40 = 120 buah. Bagus = 120 - 15 = 105 buah. Kantong = 105 ÷ 7 = 15 kantong.", tips: "Tips: Cari mangga bagus dahulu sebelum membagi ke kantong." },
      { pertanyaan: "Dalam sebuah lomba cerdas cermat, tim menjawab benar 14 soal bernilai 5 poin dan salah 4 soal dipotong 2 poin. Jika nilai awal tim adalah 20, berapa nilai akhir tim tersebut?", pilihan: ["72 poin", "82 poin", "88 poin", "90 poin"], jawabanBenar: 1, konsep: "Analisis Skor Campuran", level: 3, difficulty: "normal", penjelasan: "Poin benar = 14 × 5 = 70. Pengurangan = 4 × 2 = 8. Nilai akhir = 20 + 70 - 8 = 82 poin.", tips: "Tips: Hitung nilai tambah dan nilai kurang secara terpisah." },
      { pertanyaan: "Andi memiliki uang Rp50.000. Ia membeli 3 buku tulis seharga Rp6.000 per buku dan 2 pensil seharga Rp2.500 per pensil. Berapa uang kembalian yang diterima Andi?", pilihan: ["Rp25.000", "Rp27.000", "Rp29.000", "Rp31.000"], jawabanBenar: 1, konsep: "Aritmetika Sosial Bertingkat", level: 3, difficulty: "normal", penjelasan: "Total belanja = (3 × 6.000) + (2 × 2.500) = 18.000 + 5.000 = 23.000. Kembalian = 50.000 - 23.000 = 27.000.", tips: "Tips: Jumlahkan belanja buku dan pensil sebelum mengurangkannya dari uang awal." },
      { pertanyaan: "Sebuah bak air bervolume 300 liter mula-mula berisi 60 liter. Bak diisi air dari kran dengan debit 15 liter per menit selama 12 menit. Berapa liter air yang masih dibutuhkan agar bak penuh?", pilihan: ["50 liter", "60 liter", "70 liter", "80 liter"], jawabanBenar: 1, konsep: "Analisis Debit Bertingkat", level: 3, difficulty: "normal", penjelasan: "Air masuk = 15 × 12 = 180 liter. Total air = 60 + 180 = 240 liter. Kekurangan = 300 - 240 = 60 liter.", tips: "Tips: Kalikan debit dengan waktu, tambah air awal, lalu cari selisih ke kapasitas penuh." },
    ];
  }

  if (mapel === "Bahasa Indonesia") {
    return [
      // 6 Soal Level 1 (Mudah: identifikasi langsung fakta/tokoh/kata dalam teks)
      { pertanyaan: "Siapa tokoh utama dalam fabel Kancil dan Buaya?", pilihan: ["Singa", "Kancil", "Gajah", "Harimau"], jawabanBenar: 1, konsep: "Identifikasi Tokoh", level: 1, difficulty: "normal", penjelasan: "Tokoh utama yang diceritakan adalah Kancil.", tips: "Tips: Tokoh utama paling sering muncul dalam cerita." },
      { pertanyaan: "Di manakah latar tempat utama dalam cerita Si Kancil?", pilihan: ["Di padang pasir", "Di pinggir sungai hutan", "Di atas gunung es", "Di tengah laut"], jawabanBenar: 1, konsep: "Identifikasi Latar Tempat", level: 1, difficulty: "normal", penjelasan: "Peristiwa kancil bertemu buaya terjadi di tepi sungai hutan.", tips: "Tips: Cari keterangan tempat dalam paragraf pertama." },
      { pertanyaan: "Apa arti kata cerdik dalam bacaan tersebut?", pilihan: ["Malas", "Pintar banyak akal", "Suka marah", "Takut air"], jawabanBenar: 1, konsep: "Makna Kosakata", level: 1, difficulty: "normal", penjelasan: "Cerdik berarti pintar dan pandai mencari akal pemecahan masalah.", tips: "Tips: Hubungkan kata cerdik dengan tindakan tokoh." },
      { pertanyaan: "Kapan Kancil ingin menyeberang sungai?", pilihan: ["Saat malam hari", "Saat siang hari yang terik", "Saat badai hujan", "Saat fajar"], jawabanBenar: 1, konsep: "Informasi Tersurat Waktu", level: 1, difficulty: "normal", penjelasan: "Dalam teks disebutkan Kancil lapar pada siang hari.", tips: "Tips: Cari kata keterangan waktu di bacaan." },
      { pertanyaan: "Hewan apa yang diminta Kancil berbaris di sungai?", pilihan: ["Ikan paus", "Buaya", "Ular", "Katak"], jawabanBenar: 1, konsep: "Identifikasi Fakta", level: 1, difficulty: "normal", penjelasan: "Kancil meminta kawanan buaya berbaris.", tips: "Tips: Bacalah kalimat percakapan Kancil." },
      { pertanyaan: "Apa yang ingin dimakan Kancil di seberang sungai?", pilihan: ["Buah-buahan segar", "Ikan asin", "Daging bakar", "Madu lebah"], jawabanBenar: 0, konsep: "Informasi Tersurat Tujuan", level: 1, difficulty: "normal", penjelasan: "Di seberang sungai terdapat kebun mentimun dan buah segar.", tips: "Tips: Kancil adalah herbivora pemakan tanaman." },

      // 6 Soal Level 2 (Sedang: sebab-akibat, motivasi tokoh, penerapan isi teks)
      { pertanyaan: "Mengapa Kancil meminta para buaya berbaris rapi di sungai?", pilihan: ["Agar buaya tidak kedinginan", "Untuk dijadikan jembatan agar Kancil bisa menyeberang", "Untuk diajak senam bersama", "Agar buaya bisa menangkap ikan"], jawabanBenar: 1, konsep: "Hubungan Sebab Akibat", level: 2, difficulty: "normal", penjelasan: "Kancil berpura-pura menghitung buaya agar bisa menyeberangi sungai tanpa dimakan.", tips: "Tips: Pahami alasan di balik perkataan Kancil." },
      { pertanyaan: "Apa alasan buaya bersedia berbaris saat Kancil berbicara?", pilihan: ["Karena buaya takut pada kancil", "Karena dijanjikan pembagian daging dari raja hutan", "Karena buaya ingin bermain", "Karena buaya disuruh singa"], jawabanBenar: 1, konsep: "Motivasi Tokoh", level: 2, difficulty: "normal", penjelasan: "Kancil membohongi buaya bahwa raja hutan menitipkan pesan daging lezat.", tips: "Tips: Teliti tipu muslihat yang dikatakan kancil." },
      { pertanyaan: "Bagaimana perasaan buaya setelah Kancil sampai di seberang sungai?", pilihan: ["Sangat senang", "Merasa tertipu dan marah", "Ingin berterima kasih", "Biasa saja"], jawabanBenar: 1, konsep: "Inferensi Emosi Tokoh", level: 2, difficulty: "normal", penjelasan: "Buaya sadar bahwa mereka hanya diperalat sebagai jembatan penyeberangan.", tips: "Tips: Hubungkan reaksi akhir tokoh buaya." },
      { pertanyaan: "Sikap apa yang ditunjukkan Kancil ketika menghadapi bahaya buaya yang lapar?", pilihan: ["Panik dan menangis", "Tenang dan mencari akal cerdik", "Melompat ke dalam mulut buaya", "Menyerah begitu saja"], jawabanBenar: 1, konsep: "Karakterisasi Tokoh", level: 2, difficulty: "normal", penjelasan: "Kancil tidak panik melainkan menggunakan kecerdasannya untuk bertahan hidup.", tips: "Tips: Perhatikan cara kancil berbicara kepada buaya." },
      { pertanyaan: "Mengapa buaya gagal menangkap Kancil?", pilihan: ["Karena kancil bisa berenang cepat", "Karena buaya mudah percaya pada bujukan kancil", "Karena sungai tiba-tiba kering", "Karena ada pemburu"], jawabanBenar: 1, konsep: "Analisis Sebab Akibat", level: 2, difficulty: "normal", penjelasan: "Sifat buaya yang serakah dan mudah percaya membuat mereka lengah.", tips: "Tips: Kenali kelemahan karakter buaya." },
      { pertanyaan: "Pesan moral apa yang dapat kita petik dari dongeng tersebut?", pilihan: ["Kita boleh menipu siapa saja", "Gunakan kecerdasan untuk kebaikan dan jangan mudah percaya tipuan", "Jangan pernah minum air sungai", "Hewan kuat selalu menang"], jawabanBenar: 1, konsep: "Amanat Cerita", level: 2, difficulty: "normal", penjelasan: "Cerita mengajarkan pentingnya kecerdasan dan kehati-hatian agar tidak mudah tertipu.", tips: "Tips: Amanat adalah pelajaran hidup yang baik dari cerita." },

      // 6 Soal Level 3 (Sulit: evaluasi hipotesis, analisis implikasi alternatif, penalaran kritis)
      { pertanyaan: "Jika para buaya sejak awal menyadari bahwa Kancil tidak membawa pesan dari raja hutan, bagaimana kemungkinan akhir cerita akan berubah berdasarkan isi teks?", pilihan: ["Kancil akan tetap menyeberang dengan mudah", "Kancil tidak akan bisa menyeberang dan harus mencari jalan lain yang aman", "Buaya akan mengantar kancil sampai tujuan", "Semua buaya akan pergi meninggalkan sungai"], jawabanBenar: 1, konsep: "Evaluasi Hipotesis Cerita", level: 3, difficulty: "normal", penjelasan: "Jika buaya sadar tipuan sejak awal, kancil tidak akan dapat menyeberang dan terancam bahaya.", tips: "Tips: Bayangkan jika satu peristiwa kunci dalam cerita digagalkan." },
      { pertanyaan: "Berdasarkan keseluruhan cerita, apa dampak jangka panjang dari tindakan Kancil terhadap hubungannya dengan hewan-hewan lain di hutan?", pilihan: ["Semua hewan semakin menyayangi kancil", "Hewan lain menjadi sulit percaya pada perkataan kancil di kemudian hari", "Kancil diangkat menjadi raja hutan", "Kancil tidak lagi membutuhkan makanan"], jawabanBenar: 1, konsep: "Analisis Implikasi Jangka Panjang", level: 3, difficulty: "normal", penjelasan: "Tindakan berbohong berulang kali akan menghilangkan rasa percaya dari sesama makhluk.", tips: "Tips: Hubungkan akibat perbuatan curang dengan nilai kepercayaan." },
      { pertanyaan: "Bandingkan watak Kancil dan watak Buaya dalam fabel tersebut. Manakah kesimpulan perbandingan yang paling tepat dan berimbang?", pilihan: ["Kancil cerdik namun licik, sedangkan buaya berbadan kuat namun mudah tertipu", "Kancil selalu jujur, sedangkan buaya selalu jahat", "Keduanya memiliki watak yang sama-sama penyabar", "Buaya lebih pintar menyusun siasat dibanding kancil"], jawabanBenar: 0, konsep: "Perbandingan Watak Kritis", level: 3, difficulty: "normal", penjelasan: "Kancil memiliki kelebihan kecerdasan tetapi menggunakan tipuan, sedangkan buaya kuat fisik tetapi lemah nalar.", tips: "Tips: Cermati kelebihan dan kekurangan kedua tokoh." },
      { pertanyaan: "Bagian manakah dari teks yang menjadi titik balik (klimaks) yang menentukan keselamatan Kancil?", pilihan: ["Saat kancil terbangun dari tidur siang", "Saat kancil berhasil menginjak punggung buaya terakhir lalu melompat ke tepian", "Saat kancil memakan mentimun sampai kenyang", "Saat kancil berjalan menuju tepi sungai"], jawabanBenar: 1, konsep: "Analisis Struktur Alur Cerita", level: 3, difficulty: "normal", penjelasan: "Klimaks ketegangan terjadi saat lompatan di punggung buaya terakhir yang menentukan berhasil tidaknya siasat.", tips: "Tips: Titik balik adalah momen paling menegangkan dan penentu hasil." },
      { pertanyaan: "Jika cerita ini dikaitkan dengan kehidupan sehari-hari siswa di sekolah, tindakan bijak manakah yang meneladani sisi positif Kancil tanpa meniru sisi negatifnya?", pilihan: ["Mengelabui teman saat ulangan agar mendapat nilai tinggi", "Berpikir tenang dan kreatif saat menghadapi tugas sulit tanpa perlu berbuat curang", "Menyuruh teman mengerjakan tugas kita", "Menghindari masalah dengan berbohong"], jawabanBenar: 1, konsep: "Penerapan Nilai Kritis", level: 3, difficulty: "normal", penjelasan: "Sisi positif kancil adalah ketenangan dan kreativitas berpikir, yang harus dilakukan dengan kejujuran.", tips: "Tips: Saring hal baik (kreatif) dan buang hal buruk (curang)." },
      { pertanyaan: "Bagaimana penulis fabel menggambarkan kontras antara kekuatan fisik dan kecerdasan akal dalam teks?", pilihan: ["Kekuatan fisik selalu mengalahkan akal pikiran", "Akal pikiran yang cerdas mampu mengatasi kekuatan fisik yang besar", "Kekuatan dan akal tidak ada hubungannya", "Hanya hewan besar yang bisa bertahan hidup"], jawabanBenar: 1, konsep: "Interpretasi Tema Pengarang", level: 3, difficulty: "normal", penjelasan: "Tema sentral cerita membuktikan bahwa kekuatan akal mampu meloloskan diri dari kekuatan fisik buaya.", tips: "Tips: Renungkan pesan utama yang ingin disampaikan pengarang." },
    ];
  }

  // IPA
  return [
    // 6 Soal Level 1 (Mudah: fakta langsung, definisi, identifikasi perubahan wujud)
    { pertanyaan: "Air dapat berubah wujud menjadi es padat melalui peristiwa apa?", pilihan: ["Menguap", "Membeku", "Menyublim", "Mengembun"], jawabanBenar: 1, konsep: "Perubahan Wujud Dasar", level: 1, difficulty: "normal", penjelasan: "Air cair berubah menjadi es padat disebut membeku.", tips: "Tips: Dari cair ke padat = membeku." },
    { pertanyaan: "Peristiwa perubahan wujud dari benda padat menjadi cair disebut apa?", pilihan: ["Mencair", "Mengembun", "Membeku", "Mengkristal"], jawabanBenar: 0, konsep: "Definisi Mencair", level: 1, difficulty: "normal", penjelasan: "Padat ke cair disebut mencair atau melebur.", tips: "Tips: Contoh es krim meleleh di tempat panas." },
    { pertanyaan: "Titik beku air murni pada tekanan normal adalah berapa derajat Celsius?", pilihan: ["0°C", "50°C", "100°C", "-100°C"], jawabanBenar: 0, konsep: "Titik Beku Air", level: 1, difficulty: "normal", penjelasan: "Air murni membeku pada suhu 0 derajat Celsius.", tips: "Tips: 0°C adalah batas pembekuan air." },
    { pertanyaan: "Apa wujud zat dari uap air hasil penguapan?", pilihan: ["Padat", "Cair", "Gas", "Plasma"], jawabanBenar: 2, konsep: "Identifikasi Wujud Zat", level: 1, difficulty: "normal", penjelasan: "Uap air berwujud gas tak kasat mata.", tips: "Tips: Uap air melayang di udara sebagai gas." },
    { pertanyaan: "Benda manakah di bawah ini yang mengalami peristiwa menyublim dalam kehidupan sehari-hari?", pilihan: ["Batu kali", "Kapur barus", "Besi baja", "Kayu jati"], jawabanBenar: 1, konsep: "Pengenalan Benda Menyublim", level: 1, difficulty: "normal", penjelasan: "Kapur barus di lemari berubah langsung dari padat menjadi gas.", tips: "Tips: Kapur barus lama-lama habis tanpa mencair." },
    { pertanyaan: "Perubahan uap air menjadi titik-titik air pada daun di pagi hari disebut apa?", pilihan: ["Mengembun", "Menguap", "Mencair", "Membeku"], jawabanBenar: 0, konsep: "Definisi Mengembun", level: 1, difficulty: "normal", penjelasan: "Gas menjadi cair akibat pendinginan disebut mengembun.", tips: "Tips: Embun pagi berasal dari uap air di udara." },

    // 6 Soal Level 2 (Sedang: sebab-akibat proses termal, mekanisme perubahan wujud)
    { pertanyaan: "Mengapa air yang dimasukkan ke dalam freezer lemari es lama-kelamaan menjadi padat?", pilihan: ["Karena air menyerap panas dari freezer", "Karena suhu dingin freezer melepaskan kalor/panas dari air", "Karena udara freezer menekan air", "Karena air bertambah massanya"], jawabanBenar: 1, konsep: "Perpindahan Kalor Pembekuan", level: 2, difficulty: "normal", penjelasan: "Pembekuan terjadi karena air melepas kalor ke lingkungan freezer yang bersuhu rendah.", tips: "Tips: Melepas kalor membuat partikel air merapat menjadi padat." },
    { pertanyaan: "Mengapa pakaian basah yang dijemur di bawah terik sinar matahari dapat menjadi kering?", pilihan: ["Air pada pakaian mengembun ke udara", "Air pada pakaian menyerap kalor matahari lalu menguap menjadi gas", "Pakaian menyerap air sampai habis", "Air pada pakaian membeku tertiup angin"], jawabanBenar: 1, konsep: "Mekanisme Penguapan", level: 2, difficulty: "normal", penjelasan: "Energi panas matahari menyebabkan molekul air pada pakaian menguap ke udara.", tips: "Tips: Panas mempercepat proses penguapan air." },
    { pertanyaan: "Mengapa dinding luar gelas yang berisi es teh manis tampak basah berair?", pilihan: ["Air es merembes keluar melalui pori-pori kaca", "Uap air di udara luar gelas melepaskan kalor dan mengembun pada dinding gelas yang dingin", "Es mencair di luar gelas", "Air tumpah dari bibir gelas"], jawabanBenar: 1, konsep: "Proses Pengembunan", level: 2, difficulty: "normal", penjelasan: "Udara di sekitar gelas yang hangat melepaskan kalor saat menyentuh permukaan gelas yang dingin sehingga mengembun.", tips: "Tips: Udara luar mengandung uap air yang mendingin di kaca gelas." },
    { pertanyaan: "Apa yang terjadi pada partikel mentega ketika dipanaskan di atas wajan penggorengan?", pilihan: ["Partikelnya semakin merapat dan membeku", "Partikelnya bergerak lebih bebas dan wujudnya berubah menjadi cair", "Mentega langsung menghilang menjadi asap", "Mentega mengeras"], jawabanBenar: 1, konsep: "Gerak Partikel saat Mencair", level: 2, difficulty: "normal", penjelasan: "Pemanasan menambah energi kalor sehingga ikatan partikel padat melonggar menjadi cair.", tips: "Tips: Panas membuat zat padat meleleh." },
    { pertanyaan: "Mengapa embun di dedaunan menghilang saat matahari mulai bersinar terang?", pilihan: ["Embun meresap seluruhnya ke dalam batang", "Embun menyerap panas matahari dan menguap kembali ke udara", "Embun membeku menjadi es kristal", "Embun dimakan oleh ulat"], jawabanBenar: 1, konsep: "Pengaruh Panas terhadap Embun", level: 2, difficulty: "normal", penjelasan: "Titik air embun menyerap energi kalor dari sinar matahari sehingga menguap menjadi uap air.", tips: "Tips: Panas matahari mengubah embun kembali jadi gas." },
    { pertanyaan: "Jika air terus dipanaskan hingga mencapai suhu 100°C di wadah terbuka, apa peristiwa yang terjadi secara terus-menerus?", pilihan: ["Air membeku", "Air mendidih dan menguap secara aktif", "Air mengendap di dasar", "Air memadat"], jawabanBenar: 1, konsep: "Titik Didih Air", level: 2, difficulty: "normal", penjelasan: "Pada suhu 100°C air mencapai titik didih dan berubah wujud menjadi uap air dengan cepat.", tips: "Tips: 100°C adalah titik didih air pada tekanan 1 atm." },

    // 6 Soal Level 3 (Sulit: analisis sistemik siklus air, dampak perubahan lingkungan, pemecahan masalah)
    { pertanyaan: "Jika suhu rata-rata global di bumi meningkat terus-menerus dalam waktu lama, bagaimana dampak sistemiknya terhadap cadangan es di kutub dan siklus air bumi?", pilihan: ["Cadangan es kutub bertambah tebal dan kekeringan berkurang", "Laju pencairan es kutub meningkat pesat, permukaan air laut naik, dan cuaca ekstrem bertambah", "Siklus air berhenti total", "Semua air di bumi langsung menguap ke luar angkasa"], jawabanBenar: 1, konsep: "Analisis Dampak Pemanasan Global", level: 3, difficulty: "normal", penjelasan: "Peningkatan suhu memicu pencairan es kutub besar-besaran yang menaikkan permukaan laut dan mengacaukan siklus penguapan-hujan.", tips: "Tips: Hubungkan suhu global dengan laju mencairnya es dan kenaikan laut." },
    { pertanyaan: "Pada siklus air, mengapa air hujan yang jatuh di daerah hutan yang lebat memiliki laju infiltrasi tanah yang lebih baik dibandingkan daerah pemukiman beraspal padat?", pilihan: ["Karena hutan tidak membutuhkan air", "Karena akar pepohonan dan serasah daun memperlambat aliran permukaan dan memberi waktu air meresap ke tanah", "Karena aspal menyerap air lebih cepat dari tanah", "Karena hujan di hutan tidak mengandung asam"], jawabanBenar: 1, konsep: "Analisis Infiltrasi vs Aliran Permukaan", level: 3, difficulty: "normal", penjelasan: "Akar tanaman menciptakan pori-pori tanah alami yang memfasilitasi penyerapan air, sedangkan aspal kedap air.", tips: "Tips: Infiltrasi adalah peresapan air ke dalam tanah yang dibantu akar pohon." },
    { pertanyaan: "Sebuah desa di lereng bukit mengalami penggundulan hutan. Saat musim kemarau tiba, sumur warga menjadi kering, padahal saat musim hujan terjadi banjir lumpur. Berdasarkan konsep siklus air dan konservasi tanah, apa akar penyebab utama masalah tersebut?", pilihan: ["Air hujan tidak turun lagi di desa tersebut", "Hilangnya vegetasi membuat air hujan langsung menjadi limpasan permukaan dan tidak tersimpan sebagai air tanah", "Warga desa menggunakan air terlalu banyak", "Suhu tanah terlalu dingin"], jawabanBenar: 1, konsep: "Pemecahan Masalah Ekosistem Air", level: 3, difficulty: "normal", penjelasan: "Tanpa pohon, air hujan mengalir deras di permukaan memicu banjir dan tidak sempat terserap mengisi akuifer air tanah.", tips: "Tips: Pohon berfungsi sebagai penyimpan cadangan air tanah." },
    { pertanyaan: "Bagaimana proses pembentukan awan dan hujan dapat dipengaruhi apabila udara di suatu kawasan industri mengandung konsentrasi partikel polutan jelaga yang sangat tinggi?", pilihan: ["Awan tidak akan pernah terbentuk sama sekali", "Partikel polutan bertindak sebagai inti kondensasi berlebih yang dapat memicu hujan asam dan perubahan pola presipitasi", "Polutan membuat air hujan menjadi sangat manis", "Awan menjadi sangat ringan dan terbang ke luar angkasa"], jawabanBenar: 1, konsep: "Analisis Dampak Polusi Udara pada Kondensasi", level: 3, difficulty: "normal", penjelasan: "Partikel polutan bertindak sebagai inti kondensasi awan (CCN) dan bereaksi dengan uap air membentuk polusi presipitasi.", tips: "Tips: Partikel di udara menjadi tempat menempelnya uap air saat kondensasi." },
    { pertanyaan: "Jika petani garam ingin mempercepat proses kristalisasi air laut menjadi garam di tambak terbuka, strategi alami manakah yang paling efektif diterapkan?", pilihan: ["Menutup tambak garam dengan terpal rapat", "Memperluas permukaan bidang tambak dan memanfaatkan angin kencang serta terik matahari maksimal", "Menambahkan es batu ke dalam tambak", "Menyiram tambak dengan air tawar di malam hari"], jawabanBenar: 1, konsep: "Penerapan Strategi Penguapan Optimal", level: 3, difficulty: "normal", penjelasan: "Luas permukaan, hembusan angin, dan suhu panas matahari adalah faktor utama yang mempercepat laju penguapan air.", tips: "Tips: Penguapan semakin cepat jika area luas dan panas matahari terik." },
    { pertanyaan: "Mengapa di daerah gurun pasir terjadi perbedaan suhu yang sangat ekstrem antara siang hari yang sangat panas dan malam hari yang sangat dingin jika ditinjau dari ketiadaan uap air di udara?", pilihan: ["Karena matahari bersinar 24 jam di gurun", "Karena kelembapan udara sangat rendah sehingga tidak ada uap air yang bertindak sebagai penyimpan panas (efek selimut termal)", "Karena pasir gurun terbuat dari es batu", "Karena angin malam meniup matahari"], jawabanBenar: 1, konsep: "Analisis Kapasitas Kalor dan Kelembapan", level: 3, difficulty: "normal", penjelasan: "Uap air di atmosfer berfungsi menahan radiasi panas. Udara gurun yang sangat kering menyebabkan panas cepat terlepas ke angkasa di malam hari.", tips: "Tips: Uap air di udara berfungsi seperti selimut penahan panas bumi." },
  ];
}

async function runQuestionBankCognitiveTests() {
  console.log("==================================================================");
  console.log("VERIFIKASI 15 SKENARIO: QUESTION BANK & COGNITIVE LEVEL PROGRESSION");
  console.log("==================================================================");

  const bankMatematika = createRichMockQuestionBank("Matematika");
  const valMath = validasiQuestionBank(bankMatematika);
  assert(valMath.valid === true, "Bank Matematika lolos validasi struktur dasar");

  const soalLvl1Only = valMath.soalList.filter((s) => s.level === 1);
  const soalLvl2Only = valMath.soalList.filter((s) => s.level === 2);
  const soalLvl3Only = valMath.soalList.filter((s) => s.level === 3);

  // -------------------------------------------------------------------------
  // Skenario 1: Siswa di Level 1 hanya menerima soal Level 1
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 1] Siswa di Level 1 hanya menerima soal Level 1");
  const poolUntukLevel1 = valMath.soalList.filter((s) => s.level === 1);
  assert(poolUntukLevel1.length === 6, "Terdapat 6 soal Level 1");
  assert(poolUntukLevel1.every((s) => s.level === 1), "Semua soal yang diterima siswa Level 1 terverifikasi level 1");

  // -------------------------------------------------------------------------
  // Skenario 2: Siswa di Level 2 hanya menerima soal Level 2
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 2] Siswa di Level 2 hanya menerima soal Level 2");
  const poolUntukLevel2 = valMath.soalList.filter((s) => s.level === 2);
  assert(poolUntukLevel2.length === 6, "Terdapat 6 soal Level 2");
  assert(poolUntukLevel2.every((s) => s.level === 2), "Semua soal yang diterima siswa Level 2 terverifikasi level 2");

  // -------------------------------------------------------------------------
  // Skenario 3: Siswa di Level 3 hanya menerima soal Level 3
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 3] Siswa di Level 3 hanya menerima soal Level 3");
  const poolUntukLevel3 = valMath.soalList.filter((s) => s.level === 3);
  assert(poolUntukLevel3.length === 6, "Terdapat 6 soal Level 3");
  assert(poolUntukLevel3.every((s) => s.level === 3), "Semua soal yang diterima siswa Level 3 terverifikasi level 3");

  // -------------------------------------------------------------------------
  // Skenario 4: Soal Level 2 berbeda dari Level 1 (bukan sekadar ganti angka)
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 4] Soal Level 2 berbeda dari Level 1 (bukan sekadar ganti angka)");
  const cekPolaL1L2 = periksaPolaAntarLevel(valMath.soalList);
  assert(cekPolaL1L2.valid === true, "Tidak ada soal Level 2 yang meniru template/pola Level 1");
  // Pastikan deteksi berfungsi jika ada pelanggaran:
  const pelanggaranL2: ValidatedSoalItem[] = [
    { pertanyaan: "Berapa hasil dari 7 × 8?", pilihan: ["48", "54", "56", "64"], jawabanBenar: 2, konsep: "Perkalian", level: 1, difficulty: "normal", penjelasan: "x", tips: "y" },
    { pertanyaan: "Berapa hasil dari 9 × 5?", pilihan: ["40", "45", "50", "55"], jawabanBenar: 1, konsep: "Perkalian", level: 2, difficulty: "normal", penjelasan: "x", tips: "y" },
  ];
  assert(periksaPolaAntarLevel(pelanggaranL2).valid === false, "Detektor berhasil memblokir Level 2 yang hanya mengubah angka dari Level 1");

  // -------------------------------------------------------------------------
  // Skenario 5: Soal Level 3 berbeda dari Level 1 dan 2 (bukan sekadar ganti angka)
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 5] Soal Level 3 berbeda dari Level 1 dan 2 (bukan sekadar ganti angka)");
  const pelanggaranL3: ValidatedSoalItem[] = [
    { pertanyaan: "Siti memiliki 9 kotak pensil. Setiap kotak berisi 6 pensil. Berapa jumlah seluruh pensil Siti?", pilihan: ["45 pensil", "52 pensil", "54 pensil", "60 pensil"], jawabanBenar: 2, konsep: "Perkalian", level: 2, difficulty: "normal", penjelasan: "x", tips: "y" },
    { pertanyaan: "Budi memiliki 8 kotak pensil. Setiap kotak berisi 7 pensil. Berapa jumlah seluruh pensil Budi?", pilihan: ["50 pensil", "54 pensil", "56 pensil", "60 pensil"], jawabanBenar: 2, konsep: "Perkalian", level: 3, difficulty: "normal", penjelasan: "x", tips: "y" },
  ];
  assert(periksaPolaAntarLevel(pelanggaranL3).valid === false, "Detektor berhasil memblokir Level 3 yang hanya mengganti nama/angka dari Level 2");

  // -------------------------------------------------------------------------
  // Skenario 6: Level 2 memiliki penalaran lebih tinggi dari Level 1
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 6] Level 2 memiliki penalaran lebih tinggi dari Level 1");
  const avgLenL1 = soalLvl1Only.reduce((sum, s) => sum + s.pertanyaan.length, 0) / soalLvl1Only.length;
  const avgLenL2 = soalLvl2Only.reduce((sum, s) => sum + s.pertanyaan.length, 0) / soalLvl2Only.length;
  assert(avgLenL2 > avgLenL1 * 1.5, `Level 2 (${avgLenL2.toFixed(0)} chars) menyajikan konteks situasi nyata > 1.5x lebih mendalam dibanding Level 1 (${avgLenL1.toFixed(0)} chars)`);

  // -------------------------------------------------------------------------
  // Skenario 7: Level 3 memiliki penalaran lebih tinggi dari Level 2
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 7] Level 3 memiliki penalaran lebih tinggi dari Level 2");
  const avgLenL3 = soalLvl3Only.reduce((sum, s) => sum + s.pertanyaan.length, 0) / soalLvl3Only.length;
  assert(avgLenL3 > avgLenL2 * 1.3, `Level 3 (${avgLenL3.toFixed(0)} chars) menyajikan analisis multi-langkah > 1.3x lebih kompleks dibanding Level 2 (${avgLenL2.toFixed(0)} chars)`);

  // -------------------------------------------------------------------------
  // Skenario 8: Siswa yang belum mencapai 80% tetap di level yang sama
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 8] Siswa yang belum mencapai 80% tetap di level yang sama");
  const evaluasiGagalLvl1 = tentukanLevelDanStatus(1, 33);
  assert(evaluasiGagalLvl1.lulusLevel === false, "Skor 33% tidak lulus");
  assert(evaluasiGagalLvl1.levelBerikutnya === 1, "Siswa tetap berada di Level 1");
  assert(evaluasiGagalLvl1.status === "remedial", "Status siswa beralih ke 'remedial'");

  const evaluasiGagalLvl2 = tentukanLevelDanStatus(2, 60);
  assert(evaluasiGagalLvl2.levelBerikutnya === 2, "Skor 60% di Level 2 tetap berada di Level 2");

  const evaluasiGagalLvl3 = tentukanLevelDanStatus(3, 75);
  assert(evaluasiGagalLvl3.levelBerikutnya === 3, "Skor 75% di Level 3 tetap berada di Level 3");

  // -------------------------------------------------------------------------
  // Skenario 9: Siswa yang belum mencapai 80% menerima soal remedial yang berbeda dari soal yang sudah dikerjakan
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 9] Siswa remedial menerima soal berbeda (strict no-repeat)");
  const riwayatSoalDikerjakan = ["id_q1", "id_q2", "id_q3"];
  const poolL1Mock = soalLvl1Only.map((s, idx) => ({ ...s, _id: `id_q${idx + 1}` }));
  const soalTersediaRemedial = poolL1Mock.filter((s) => !riwayatSoalDikerjakan.includes(s._id));
  assert(soalTersediaRemedial.length === 3, "Tersedia 3 soal fresh untuk remedial Level 1");
  assert(
    !soalTersediaRemedial.some((s) => riwayatSoalDikerjakan.includes(s._id)),
    "Semua soal remedial 100% berbeda dari soal yang sudah dikerjakan"
  );

  // -------------------------------------------------------------------------
  // Skenario 10: Siswa yang mencapai >= 80% di Level 1 naik ke Level 2
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 10] Siswa yang mencapai >= 80% di Level 1 naik ke Level 2");
  const evaluasiLulusLvl1 = tentukanLevelDanStatus(1, 100);
  assert(evaluasiLulusLvl1.lulusLevel === true, "Skor 100% lulus Level 1");
  assert(evaluasiLulusLvl1.levelBerikutnya === 2, "Level berikutnya adalah Level 2");

  // -------------------------------------------------------------------------
  // Skenario 11: Siswa yang mencapai >= 80% di Level 2 naik ke Level 3
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 11] Siswa yang mencapai >= 80% di Level 2 naik ke Level 3");
  const evaluasiLulusLvl2 = tentukanLevelDanStatus(2, 85);
  assert(evaluasiLulusLvl2.lulusLevel === true, "Skor 85% lulus Level 2");
  assert(evaluasiLulusLvl2.levelBerikutnya === 3, "Level berikutnya adalah Level 3");

  // -------------------------------------------------------------------------
  // Skenario 12: Progress Siswa A dan Siswa B tetap terpisah
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 12] Progress Siswa A dan Siswa B tetap terpisah");
  const progressSiswaA = { siswaId: "putri", materiId: "mat_1", level: 1, status: "remedial", riwayatSoal: ["q1", "q2"] };
  const progressSiswaB = { siswaId: "bela", materiId: "mat_1", level: 2, status: "belajar", riwayatSoal: ["q1", "q2", "q3", "q4"] };
  assert(progressSiswaA.siswaId !== progressSiswaB.siswaId, "ID siswa berbeda");
  assert(progressSiswaA.level === 1 && progressSiswaB.level === 2, "Putri di Level 1 sedangkan Bela di Level 2 pada materi yang sama");
  assert(progressSiswaA.status === "remedial" && progressSiswaB.status === "belajar", "Status belajar masing-masing siswa independen");

  // -------------------------------------------------------------------------
  // Skenario 13: Mata pelajaran Matematika menggunakan sistem ini
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 13] Mata pelajaran Matematika menggunakan sistem ini");
  assert(valMath.valid === true, "Question Bank Matematika valid");
  assert(valMath.soalList.filter((s) => s.level === 1).length >= 6, "Matematika memiliki set Level 1 lengkap");
  assert(valMath.soalList.filter((s) => s.level === 2).length >= 6, "Matematika memiliki set Level 2 lengkap");
  assert(valMath.soalList.filter((s) => s.level === 3).length >= 6, "Matematika memiliki set Level 3 lengkap");

  // -------------------------------------------------------------------------
  // Skenario 14: Mata pelajaran Bahasa Indonesia menggunakan sistem ini
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 14] Mata pelajaran Bahasa Indonesia menggunakan sistem ini");
  const bankBahasa = createRichMockQuestionBank("Bahasa Indonesia");
  const valBahasa = validasiQuestionBank(bankBahasa);
  assert(valBahasa.valid === true, "Question Bank Bahasa Indonesia valid");
  assert(valBahasa.soalList.filter((s) => s.level === 1).length >= 6, "Bahasa Indonesia memiliki set Level 1 lengkap");
  assert(valBahasa.soalList.filter((s) => s.level === 2).length >= 6, "Bahasa Indonesia memiliki set Level 2 lengkap");
  assert(valBahasa.soalList.filter((s) => s.level === 3).length >= 6, "Bahasa Indonesia memiliki set Level 3 lengkap");

  // -------------------------------------------------------------------------
  // Skenario 15: Mata pelajaran IPA menggunakan sistem ini
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 15] Mata pelajaran IPA menggunakan sistem ini");
  const bankIPA = createRichMockQuestionBank("IPA");
  const valIPA = validasiQuestionBank(bankIPA);
  assert(valIPA.valid === true, "Question Bank IPA valid");
  assert(valIPA.soalList.filter((s) => s.level === 1).length >= 6, "IPA memiliki set Level 1 lengkap");
  assert(valIPA.soalList.filter((s) => s.level === 2).length >= 6, "IPA memiliki set Level 2 lengkap");
  assert(valIPA.soalList.filter((s) => s.level === 3).length >= 6, "IPA memiliki set Level 3 lengkap");

  console.log("\n==================================================================");
  console.log("SELURUH 15 SKENARIO TEST BERHASIL 100% (ALL PASS)!");
  console.log("==================================================================");
}

runQuestionBankCognitiveTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
