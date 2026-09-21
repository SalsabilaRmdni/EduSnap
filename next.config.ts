import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // tesseract.js (dipakai untuk OCR) punya file worker-script yang
  // dibaca langsung dari node_modules saat runtime. Kalau Next.js ikut
  // "membungkus" (bundle) library ini, path ke file worker-nya jadi
  // salah dan error "Cannot find module ...worker-script/node/index.js"
  // muncul. Baris ini bilang ke Next.js: biarkan tesseract.js diakses
  // langsung dari node_modules, jangan dibundle.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;