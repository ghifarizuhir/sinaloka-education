import { Link } from "react-router-dom";
import { WHATSAPP_URL } from "../lib/constants";
import { PageMeta } from "../components/shared/PageMeta";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white font-[Plus_Jakarta_Sans,sans-serif] text-zinc-800">
      <PageMeta
        title="Kebijakan Privasi — Sinaloka"
        description="Kebijakan privasi Sinaloka: bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pengguna platform manajemen bimbel."
        canonicalPath="/privacy"
      />

      {/* Structured Data: Organization */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Sinaloka",
        "url": "https://sinaloka.com",
        "logo": "https://sinaloka.com/favicon.svg",
        "description": "Platform manajemen bimbingan belajar untuk mengelola siswa, tutor, jadwal, dan pembayaran.",
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "sales",
          "url": "https://wa.me/6285121094946",
          "availableLanguage": "Indonesian",
        },
      }) }} />

      {/* Structured Data: BreadcrumbList */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Beranda", "item": "https://sinaloka.com/" },
          { "@type": "ListItem", "position": 2, "name": "Kebijakan Privasi", "item": "https://sinaloka.com/privacy" },
        ],
      }) }} />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors mb-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-bold text-zinc-900 mb-2">
          Kebijakan Privasi
        </h1>
        <p className="text-sm text-zinc-500 mb-10">
          Terakhir diperbarui: Maret 2026
        </p>

        <div className="prose prose-zinc max-w-none space-y-10">

          {/* Pendahuluan */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              1. Pendahuluan
            </h2>
            <p className="text-zinc-600 leading-relaxed">
              Sinaloka ("kami") adalah platform manajemen lembaga bimbingan belajar berbasis SaaS yang beroperasi di Indonesia. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi pengguna yang mengakses platform kami, termasuk admin lembaga, tutor, orang tua, dan siswa.
            </p>
            <p className="text-zinc-600 leading-relaxed mt-3">
              Dengan menggunakan Sinaloka, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini. Jika Anda tidak setuju, mohon hentikan penggunaan platform kami.
            </p>
          </section>

          {/* Data yang Dikumpulkan */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              2. Data yang Kami Kumpulkan
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Kami mengumpulkan data yang Anda berikan secara langsung maupun data yang dihasilkan dari penggunaan platform:
            </p>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              a. Data Akun &amp; Profil
            </h3>
            <ul className="list-disc list-inside text-zinc-600 space-y-1 mb-4">
              <li>Nama lengkap</li>
              <li>Alamat email</li>
              <li>Nomor WhatsApp / telepon</li>
              <li>Kata sandi (disimpan dalam bentuk terenkripsi)</li>
              <li>Peran pengguna (admin, tutor, orang tua)</li>
            </ul>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              b. Data Siswa
            </h3>
            <ul className="list-disc list-inside text-zinc-600 space-y-1 mb-4">
              <li>Nama siswa</li>
              <li>Informasi kelas dan mata pelajaran</li>
              <li>Catatan kehadiran dan sesi belajar</li>
              <li>Data pembayaran dan tagihan (tidak termasuk detail kartu kredit)</li>
            </ul>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              c. Data Operasional Lembaga
            </h3>
            <ul className="list-disc list-inside text-zinc-600 space-y-1 mb-4">
              <li>Nama dan informasi lembaga bimbel</li>
              <li>Jadwal kelas dan sesi</li>
              <li>Riwayat transaksi dan pembayaran</li>
              <li>Bukti transfer yang diunggah</li>
            </ul>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              d. Data Teknis
            </h3>
            <ul className="list-disc list-inside text-zinc-600 space-y-1">
              <li>Alamat IP dan informasi browser</li>
              <li>Log aktivitas penggunaan platform</li>
              <li>Cookie sesi untuk autentikasi</li>
            </ul>
          </section>

          {/* Penggunaan Data */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              3. Bagaimana Kami Menggunakan Data
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Data yang kami kumpulkan digunakan semata-mata untuk:
            </p>
            <ul className="list-disc list-inside text-zinc-600 space-y-2">
              <li>Menyediakan dan mengoperasikan layanan Sinaloka</li>
              <li>Mengelola akun pengguna dan autentikasi</li>
              <li>Memfasilitasi komunikasi antara lembaga, tutor, dan orang tua</li>
              <li>Memproses pembayaran dan menghasilkan catatan transaksi</li>
              <li>Mengirimkan notifikasi terkait layanan (pengingat jadwal, konfirmasi pembayaran)</li>
              <li>Mendeteksi dan mencegah penyalahgunaan platform</li>
              <li>Meningkatkan kualitas dan performa platform</li>
            </ul>
            <p className="text-zinc-600 leading-relaxed mt-4">
              Kami tidak menjual, menyewakan, atau memperdagangkan data pribadi pengguna kepada pihak ketiga untuk tujuan pemasaran.
            </p>
          </section>

          {/* Keamanan Data */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              4. Keamanan &amp; Isolasi Data
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Kami menerapkan sejumlah mekanisme untuk melindungi data pengguna:
            </p>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              a. Isolasi Multi-Tenant
            </h3>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Setiap lembaga bimbel beroperasi dalam lingkungan yang terisolasi secara logis. Data satu lembaga tidak dapat diakses oleh lembaga lain. Setiap permintaan ke backend divalidasi terhadap identitas lembaga yang tersimpan dalam token autentikasi.
            </p>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              b. Enkripsi &amp; Autentikasi
            </h3>
            <ul className="list-disc list-inside text-zinc-600 space-y-1 mb-4">
              <li>Kata sandi disimpan menggunakan hashing yang tidak dapat dibalik (bcrypt)</li>
              <li>Komunikasi antara klien dan server menggunakan HTTPS/TLS</li>
              <li>Autentikasi menggunakan JSON Web Token (JWT) dengan masa berlaku terbatas</li>
              <li>Kontrol akses berbasis peran (admin, tutor, orang tua) diterapkan di setiap endpoint</li>
            </ul>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              c. Infrastruktur
            </h3>
            <p className="text-zinc-600 leading-relaxed">
              Platform kami berjalan di atas infrastruktur cloud yang dikelola oleh penyedia terpercaya. Meski demikian, tidak ada sistem yang sepenuhnya kebal terhadap ancaman. Kami menyarankan pengguna untuk menjaga kerahasiaan kredensial akun mereka dan melaporkan aktivitas mencurigakan kepada kami sesegera mungkin.
            </p>
          </section>

          {/* Layanan Pihak Ketiga */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              5. Layanan Pihak Ketiga
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Sinaloka menggunakan layanan pihak ketiga berikut untuk mendukung operasional platform:
            </p>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              a. Payment Gateway (Midtrans)
            </h3>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Untuk pemrosesan pembayaran online, kami menggunakan Midtrans (PT Midtrans). Data kartu kredit atau rekening bank tidak disimpan di server kami — proses tersebut sepenuhnya ditangani oleh Midtrans sesuai standar keamanan mereka. Penggunaan layanan Midtrans tunduk pada{" "}
              <a
                href="https://midtrans.com/id/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-800 underline underline-offset-2 hover:text-zinc-600"
              >
                Kebijakan Privasi Midtrans
              </a>
              .
            </p>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              b. Notifikasi WhatsApp (Fonnte)
            </h3>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Kami menggunakan layanan Fonnte untuk mengirimkan notifikasi melalui WhatsApp kepada tutor dan orang tua, seperti pengingat jadwal dan konfirmasi pembayaran. Nomor WhatsApp pengguna akan digunakan untuk keperluan notifikasi ini. Layanan Fonnte tunduk pada kebijakan privasi mereka sendiri.
            </p>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              c. Layanan Email (Resend)
            </h3>
            <p className="text-zinc-600 leading-relaxed">
              Kami menggunakan Resend untuk mengirimkan email transaksional seperti undangan akun dan reset kata sandi. Alamat email pengguna digunakan hanya untuk keperluan ini.
            </p>
          </section>

          {/* Cookie */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              6. Cookie
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-3">
              Sinaloka menggunakan cookie yang diperlukan untuk fungsi dasar platform:
            </p>
            <ul className="list-disc list-inside text-zinc-600 space-y-1 mb-3">
              <li>
                <span className="font-medium text-zinc-700">Cookie sesi</span> — menjaga status login pengguna selama sesi aktif
              </li>
              <li>
                <span className="font-medium text-zinc-700">Token refresh</span> — memungkinkan pengguna tetap login tanpa harus masuk ulang secara manual
              </li>
            </ul>
            <p className="text-zinc-600 leading-relaxed">
              Kami tidak menggunakan cookie untuk pelacakan perilaku lintas situs atau untuk keperluan iklan. Anda dapat menonaktifkan cookie melalui pengaturan browser, namun hal ini dapat memengaruhi fungsionalitas platform.
            </p>
          </section>

          {/* Retensi Data */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              7. Retensi Data
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-3">
              Kami menyimpan data selama akun Anda aktif atau selama diperlukan untuk memberikan layanan. Secara spesifik:
            </p>
            <ul className="list-disc list-inside text-zinc-600 space-y-2">
              <li>Data akun disimpan selama langganan aktif</li>
              <li>Riwayat transaksi dan pembayaran disimpan minimal selama 5 tahun untuk keperluan akuntansi dan kepatuhan</li>
              <li>Log teknis disimpan selama 90 hari</li>
              <li>Setelah akun dihapus atau langganan berakhir, data operasional akan dihapus dalam waktu 30 hari, kecuali data yang wajib dipertahankan oleh hukum yang berlaku</li>
            </ul>
          </section>

          {/* Hak Pengguna */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              8. Hak Pengguna
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Sebagai pengguna Sinaloka, Anda memiliki hak-hak berikut terkait data pribadi Anda:
            </p>
            <ul className="list-disc list-inside text-zinc-600 space-y-2">
              <li>
                <span className="font-medium text-zinc-700">Akses</span> — meminta salinan data pribadi yang kami simpan tentang Anda
              </li>
              <li>
                <span className="font-medium text-zinc-700">Koreksi</span> — memperbarui atau memperbaiki data yang tidak akurat melalui pengaturan akun
              </li>
              <li>
                <span className="font-medium text-zinc-700">Penghapusan</span> — meminta penghapusan akun dan data pribadi Anda, tunduk pada kewajiban retensi hukum
              </li>
              <li>
                <span className="font-medium text-zinc-700">Keberatan</span> — mengajukan keberatan terhadap cara tertentu kami memproses data Anda
              </li>
              <li>
                <span className="font-medium text-zinc-700">Portabilitas</span> — meminta ekspor data Anda dalam format yang dapat dibaca mesin
              </li>
            </ul>
            <p className="text-zinc-600 leading-relaxed mt-4">
              Untuk menggunakan hak-hak di atas, silakan hubungi kami melalui informasi kontak di bawah. Kami akan merespons dalam waktu 14 hari kerja.
            </p>
          </section>

          {/* Perubahan Kebijakan */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              9. Perubahan Kebijakan Privasi
            </h2>
            <p className="text-zinc-600 leading-relaxed">
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan signifikan akan diberitahukan melalui email atau notifikasi di dalam platform minimal 7 hari sebelum perubahan berlaku. Penggunaan Anda atas platform setelah tanggal berlaku perubahan dianggap sebagai penerimaan atas kebijakan yang diperbarui.
            </p>
          </section>

          {/* Kontak */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              10. Hubungi Kami
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Jika Anda memiliki pertanyaan, kekhawatiran, atau ingin menggunakan hak-hak Anda terkait data pribadi, silakan hubungi kami:
            </p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
              <p className="font-medium text-zinc-800 mb-1">Sinaloka</p>
              <p className="text-zinc-600 text-sm mb-3">
                Platform Manajemen Lembaga Bimbingan Belajar
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800 hover:text-zinc-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Hubungi via WhatsApp
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
