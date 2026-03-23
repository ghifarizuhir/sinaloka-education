import { useEffect } from "react";
import { Link } from "react-router-dom";
import { WHATSAPP_URL } from "../lib/constants";

export default function TermsOfServicePage() {
  useEffect(() => {
    document.title = "Syarat & Ketentuan — Sinaloka";
  }, []);

  return (
    <div className="min-h-screen bg-white font-[Plus_Jakarta_Sans,sans-serif]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Kembali ke Beranda
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-zinc-900 mb-3">
            Syarat &amp; Ketentuan
          </h1>
          <p className="text-sm text-zinc-500">
            Terakhir diperbarui: 23 Maret 2026
          </p>
        </div>

        {/* Intro */}
        <p className="text-zinc-600 leading-relaxed mb-10">
          Selamat datang di Sinaloka. Dengan menggunakan layanan kami, Anda
          menyetujui syarat dan ketentuan yang tertulis di halaman ini. Harap
          baca dengan seksama sebelum mendaftar atau menggunakan platform
          Sinaloka. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak
          melanjutkan penggunaan layanan.
        </p>

        <div className="space-y-10 text-zinc-700 leading-relaxed">
          {/* 1. Definisi */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              1. Definisi
            </h2>
            <ul className="space-y-3 list-none">
              <li>
                <span className="font-medium text-zinc-900">"Sinaloka"</span>{" "}
                atau <span className="font-medium text-zinc-900">"Kami"</span>{" "}
                — mengacu pada tim di balik platform manajemen lembaga bimbel
                Sinaloka.
              </li>
              <li>
                <span className="font-medium text-zinc-900">"Platform"</span>{" "}
                — seluruh aplikasi Sinaloka yang dapat diakses melalui web,
                termasuk dashboard admin, portal tutor, dan portal orang tua.
              </li>
              <li>
                <span className="font-medium text-zinc-900">"Pengguna"</span>{" "}
                atau{" "}
                <span className="font-medium text-zinc-900">"Anda"</span> —
                setiap pihak yang mendaftar dan menggunakan platform Sinaloka,
                termasuk pemilik lembaga (admin), tutor, dan orang tua siswa.
              </li>
              <li>
                <span className="font-medium text-zinc-900">"Lembaga"</span> —
                bimbel atau lembaga pendidikan yang mendaftarkan dirinya ke
                platform Sinaloka sebagai tenant.
              </li>
              <li>
                <span className="font-medium text-zinc-900">"Layanan"</span> —
                semua fitur yang tersedia di platform Sinaloka, termasuk
                manajemen siswa, tutor, jadwal, absensi, pembayaran, laporan
                keuangan, dan portal orang tua.
              </li>
            </ul>
          </section>

          {/* 2. Deskripsi Layanan */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              2. Deskripsi Layanan
            </h2>
            <p className="mb-3">
              Sinaloka adalah platform manajemen lembaga bimbel berbasis SaaS
              (Software as a Service) yang dirancang untuk membantu lembaga
              pendidikan di Indonesia mengelola operasional sehari-hari secara
              lebih efisien. Fitur utama yang kami sediakan meliputi:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-600">
              <li>Manajemen data siswa dan tutor</li>
              <li>Penjadwalan sesi belajar</li>
              <li>Pencatatan dan laporan absensi</li>
              <li>Pembayaran online (QRIS dan Virtual Account)</li>
              <li>Pembuatan dan pengelolaan invoice</li>
              <li>Pencatatan pengeluaran dan laporan keuangan sederhana</li>
              <li>Portal orang tua untuk memantau perkembangan dan pembayaran</li>
            </ul>
            <p className="mt-3 text-sm text-zinc-500">
              Sinaloka adalah startup yang terus berkembang. Fitur-fitur di atas
              dapat berubah seiring waktu — kami selalu berusaha memberikan
              pengalaman terbaik untuk lembaga Anda.
            </p>
          </section>

          {/* 3. Pendaftaran & Tanggung Jawab Akun */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              3. Pendaftaran &amp; Tanggung Jawab Akun
            </h2>
            <p className="mb-3">
              Untuk menggunakan Sinaloka, Anda perlu mendaftarkan lembaga Anda
              dan membuat akun. Dengan mendaftar, Anda menyatakan bahwa:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-600 mb-4">
              <li>
                Informasi yang Anda berikan akurat, lengkap, dan tidak
                menyesatkan.
              </li>
              <li>
                Anda berusia minimal 18 tahun atau memiliki wewenang hukum untuk
                mewakili lembaga Anda.
              </li>
              <li>
                Anda bertanggung jawab atas semua aktivitas yang terjadi di
                bawah akun Anda.
              </li>
            </ul>
            <p className="mb-3">
              Anda wajib menjaga kerahasiaan kata sandi akun dan segera
              menghubungi kami jika mencurigai adanya akses tidak sah ke akun
              Anda. Kami tidak bertanggung jawab atas kerugian yang timbul
              akibat kelalaian Anda dalam menjaga keamanan akun.
            </p>
            <p>
              Setiap lembaga beroperasi sebagai{" "}
              <em>tenant</em> tersendiri di platform kami. Data lembaga Anda
              terisolasi dan tidak dapat diakses oleh lembaga lain.
            </p>
          </section>

          {/* 4. Uji Coba Gratis & Ketentuan Berlangganan */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              4. Uji Coba Gratis &amp; Ketentuan Berlangganan
            </h2>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              4.1 Periode Uji Coba Gratis
            </h3>
            <p className="mb-4">
              Setiap lembaga yang baru mendaftar mendapatkan akses penuh ke
              platform Sinaloka secara gratis selama{" "}
              <span className="font-medium text-zinc-900">2 bulan</span>. Tidak
              diperlukan kartu kredit atau komitmen pembayaran di muka. Setelah
              periode uji coba berakhir, Anda dapat memilih untuk berlangganan
              atau menghentikan penggunaan.
            </p>

            <h3 className="text-base font-semibold text-zinc-800 mb-2">
              4.2 Berlangganan Bulanan
            </h3>
            <p className="mb-3">
              Setelah periode uji coba, Sinaloka menggunakan model berlangganan
              bulanan. Biaya berlangganan akan diinformasikan secara transparan
              sebelum Anda diwajibkan membayar. Pembayaran dapat dilakukan
              melalui QRIS atau Virtual Account.
            </p>
            <p className="mb-3">
              Berlangganan bersifat bulanan dan dapat dibatalkan kapan saja.
              Tidak ada kontrak jangka panjang yang mengikat Anda. Jika Anda
              membatalkan, akses Anda tetap aktif hingga akhir periode
              berlangganan yang sudah dibayar.
            </p>
            <p className="text-sm text-zinc-500">
              Kami tidak menawarkan refund untuk periode berlangganan yang sudah
              berjalan, kecuali dalam situasi tertentu yang kami nilai wajar
              untuk dipertimbangkan. Hubungi kami jika ada masalah dengan
              pembayaran Anda.
            </p>
          </section>

          {/* 5. Penggunaan yang Dapat Diterima */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              5. Penggunaan yang Dapat Diterima
            </h2>
            <p className="mb-3">
              Anda setuju untuk menggunakan Sinaloka hanya untuk tujuan yang
              sah dan sesuai dengan ketentuan ini. Anda dilarang:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-600">
              <li>
                Menggunakan platform untuk kegiatan ilegal atau melanggar hukum
                yang berlaku di Indonesia.
              </li>
              <li>
                Mencoba mengakses data lembaga lain atau melewati mekanisme
                keamanan platform.
              </li>
              <li>
                Menyalahgunakan fitur pembayaran atau mencoba melakukan
                transaksi palsu.
              </li>
              <li>
                Mengunggah konten yang mengandung malware, virus, atau kode
                berbahaya lainnya.
              </li>
              <li>
                Mengotomatiskan akses ke platform tanpa izin tertulis dari kami
                (scraping, bot, dll.).
              </li>
              <li>
                Menjual kembali atau menyewakan akses ke platform kepada pihak
                lain tanpa persetujuan kami.
              </li>
            </ul>
            <p className="mt-4">
              Pelanggaran terhadap ketentuan ini dapat mengakibatkan penangguhan
              atau penghentian akun Anda.
            </p>
          </section>

          {/* 6. Data & Privasi */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              6. Data &amp; Privasi
            </h2>
            <p className="mb-3">
              Anda tetap memiliki hak atas semua data yang Anda masukkan ke
              platform Sinaloka — termasuk data siswa, tutor, jadwal, dan
              keuangan lembaga Anda. Kami tidak mengklaim kepemilikan atas data
              tersebut.
            </p>
            <p className="mb-3">
              Kami menggunakan data yang Anda berikan semata-mata untuk
              menjalankan dan meningkatkan layanan Sinaloka. Kami tidak menjual
              data Anda kepada pihak ketiga.
            </p>
            <p>
              Dengan menggunakan platform ini, Anda juga menyatakan bahwa Anda
              telah mendapatkan persetujuan yang diperlukan dari siswa, tutor,
              dan orang tua terkait penggunaan data mereka di platform Sinaloka,
              sesuai dengan peraturan perundang-undangan yang berlaku di
              Indonesia.
            </p>
          </section>

          {/* 7. Kekayaan Intelektual */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              7. Kekayaan Intelektual
            </h2>
            <p className="mb-3">
              Semua elemen platform Sinaloka — termasuk desain, kode, antarmuka,
              logo, dan nama merek — adalah milik kami dan dilindungi oleh
              hukum kekayaan intelektual yang berlaku.
            </p>
            <p>
              Anda tidak diperkenankan untuk menyalin, memodifikasi,
              mendistribusikan, atau membuat karya turunan dari platform atau
              komponen kami tanpa izin tertulis dari kami.
            </p>
          </section>

          {/* 8. Batasan Tanggung Jawab */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              8. Batasan Tanggung Jawab
            </h2>
            <p className="mb-3">
              Sinaloka disediakan "sebagaimana adanya". Kami berupaya semaksimal
              mungkin untuk menjaga platform tetap berjalan dengan baik, namun
              kami tidak dapat menjamin bahwa layanan akan selalu tersedia tanpa
              gangguan, bebas dari kesalahan, atau memenuhi setiap kebutuhan
              spesifik Anda.
            </p>
            <p className="mb-3">
              Sebagai startup, kami beroperasi dengan tim kecil dan sumber daya
              yang terbatas. Kami akan selalu berusaha transparan jika ada
              masalah yang mempengaruhi layanan dan menyelesaikannya secepat
              mungkin.
            </p>
            <p>
              Sejauh yang diizinkan oleh hukum yang berlaku, Sinaloka tidak
              bertanggung jawab atas kerugian tidak langsung, insidental, atau
              konsekuensial yang timbul dari penggunaan atau ketidakmampuan
              menggunakan platform kami. Tanggung jawab maksimum kami terbatas
              pada jumlah biaya berlangganan yang Anda bayarkan dalam 3 bulan
              terakhir.
            </p>
          </section>

          {/* 9. Perubahan Layanan */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              9. Perubahan Layanan
            </h2>
            <p className="mb-3">
              Kami berhak untuk mengubah, menambah, atau menghapus fitur
              platform kapan saja. Jika ada perubahan signifikan yang berdampak
              pada cara Anda menggunakan layanan, kami akan berusaha memberikan
              pemberitahuan yang wajar sebelumnya.
            </p>
            <p>
              Kami juga berhak mengubah harga berlangganan. Perubahan harga akan
              dikomunikasikan setidaknya 30 hari sebelum berlaku, sehingga Anda
              memiliki waktu untuk memutuskan apakah ingin melanjutkan
              berlangganan.
            </p>
          </section>

          {/* 10. Penghentian Akun */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              10. Penghentian Akun
            </h2>
            <p className="mb-3">
              Anda dapat menghentikan penggunaan Sinaloka kapan saja dengan
              menghubungi kami. Setelah akun dihentikan, data Anda akan tetap
              tersimpan selama 30 hari sebelum dihapus permanen, memberikan
              waktu bagi Anda untuk mengekspor data yang diperlukan.
            </p>
            <p>
              Kami berhak menangguhkan atau menghentikan akun Anda jika Anda
              melanggar ketentuan ini, tidak membayar biaya berlangganan, atau
              menggunakan platform dengan cara yang merugikan pengguna lain atau
              operasional kami. Dalam situasi seperti ini, kami akan berusaha
              memberikan pemberitahuan terlebih dahulu kecuali jika pelanggarannya
              serius.
            </p>
          </section>

          {/* 11. Hukum yang Berlaku */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              11. Hukum yang Berlaku
            </h2>
            <p>
              Syarat dan ketentuan ini diatur oleh dan ditafsirkan sesuai dengan
              hukum yang berlaku di Republik Indonesia. Setiap sengketa yang
              timbul dari atau terkait dengan penggunaan layanan Sinaloka akan
              diselesaikan secara musyawarah terlebih dahulu. Jika tidak tercapai
              kesepakatan, sengketa akan diselesaikan melalui jalur hukum yang
              berlaku di Indonesia.
            </p>
          </section>

          {/* 12. Perubahan Syarat & Ketentuan */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              12. Perubahan Syarat &amp; Ketentuan
            </h2>
            <p>
              Kami dapat memperbarui syarat dan ketentuan ini dari waktu ke
              waktu. Perubahan akan diberitahukan melalui email atau notifikasi
              di platform. Penggunaan berkelanjutan atas layanan Sinaloka setelah
              perubahan tersebut dianggap sebagai penerimaan Anda terhadap syarat
              yang diperbarui.
            </p>
          </section>

          {/* 13. Hubungi Kami */}
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              13. Hubungi Kami
            </h2>
            <p className="mb-3">
              Jika Anda memiliki pertanyaan, masukan, atau keluhan terkait
              layanan Sinaloka atau syarat dan ketentuan ini, jangan ragu untuk
              menghubungi kami. Kami adalah tim kecil yang peduli dan akan
              merespons secepat mungkin.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Hubungi Kami via WhatsApp
            </a>
          </section>
        </div>

        {/* Footer note */}
        <div className="mt-14 pt-8 border-t border-zinc-100">
          <p className="text-sm text-zinc-400 text-center">
            &copy; {new Date().getFullYear()} Sinaloka. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
}
