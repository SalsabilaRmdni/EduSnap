import nodemailer from "nodemailer";

interface SendResetEmailOptions {
  toEmail: string;
  namaGuru: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  toEmail,
  namaGuru,
  resetUrl,
}: SendResetEmailOptions): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || `"EduSnap" <${user || "noreply@edusnap.id"}>`;

  // Jika konfigurasi SMTP belum diset oleh pengguna di .env.local
  if (!host || !user || !pass) {
    console.warn("\n⚠️ [EduSnap Email Service] SMTP belum dikonfigurasi di .env.local.");
    console.warn(`📩 Simulasi Pengiriman Email Reset Password ke: ${toEmail}`);
    console.warn(`🔗 Link Reset Password: ${resetUrl}\n`);
    return {
      success: true,
      simulated: true,
      message:
        "SMTP belum dikonfigurasi. Link reset password telah dicatat di log server untuk pengujian lokal.",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F0F9FF; margin: 0; padding: 20px; }
          .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 2px solid #E0F2FE; }
          .logo { text-align: center; font-size: 28px; font-weight: 900; color: #0284C7; margin-bottom: 24px; }
          .logo span { color: #F59E0B; }
          h2 { color: #1E293B; font-size: 20px; font-weight: 800; margin-bottom: 12px; }
          p { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #9333EA; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 16px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(147, 51, 234, 0.25); }
          .footer { font-size: 12px; color: #94A3B8; text-align: center; margin-top: 24px; border-top: 1px solid #F1F5F9; padding-top: 16px; }
          .link-fallback { word-break: break-all; font-size: 12px; color: #64748B; background: #F8FAFC; padding: 10px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Edu<span>Snap</span></div>
          <h2>Atur Ulang Kata Sandi Akun Guru</h2>
          <p>Halo, <strong>Guru ${namaGuru}</strong>!</p>
          <p>Kami menerima permintaan untuk mereset kata sandi akun EduSnap Anda. Silakan klik tombol di bawah untuk membuat kata sandi baru:</p>
          
          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Kata Sandi Sekarang →</a>
          </div>

          <p style="font-size: 13px; color: #64748B;">
            Tautan ini berlaku selama <strong>1 jam</strong>. Jika Anda tidak merasa meminta reset kata sandi, silakan abaikan email ini dengan aman.
          </p>

          <p style="font-size: 11px; color: #94A3B8; margin-bottom: 4px;">Atau salin tautan berikut ke browser Anda:</p>
          <div class="link-fallback">${resetUrl}</div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} EduSnap — Platform Pembelajaran & Kuis Interaktif SD
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: "EduSnap — Reset Kata Sandi Akun Guru",
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error("Gagal mengirim email reset password via SMTP:", error);
    throw new Error(
      error instanceof Error ? error.message : "Terjadi kesalahan saat mengirim email reset password."
    );
  }
}
