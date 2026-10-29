# Garansi Polar

Website utama tetap di GitHub Pages dengan domain `https://polarfilms.co`. Pengecekan dan aktivasi memakai layanan server `https://polar-warranty-online.irvingtans.chatgpt.site` dan database Cloudflare D1. Draf browser bukan bukti aktivasi online.

## Aktivasi dan Cetak

1. Buka `admin.html`, masukkan PIN, lalu isi kartu atau pilih draf tersimpan.
2. Pilih produk. Kaca film menyediakan Windshield, Front Sides Window, Around Windows, dan Sunroof; pilih None untuk area yang tidak dipasang. Minimal satu area harus terpasang. Draf lama tiga area tetap memakai label dan cakupan aslinya.
3. PPF menyediakan POLAR GLOSSÉ dan POLAR BLANC dengan area pemasangan dan masa garansi 5 tahun. Garansi kaca film 5-10 tahun harus sesuai dokumen pemasangan yang benar-benar diberikan. Buat kartu terpisah untuk kaca film dan PPF.
4. Simpan Draf, lalu tekan **Aktifkan Online**. Tab konfirmasi hanya menerima data publik dengan VIN enam karakter terakhir, tidak menerima VIN lengkap atau catatan internal.
5. Masuk menggunakan akun ChatGPT pemilik Polar dan tekan **Konfirmasi & Aktifkan**. Server menolak akun lain meskipun mengetahui PIN antarmuka.
6. Setelah konfirmasi berhasil, nomor dapat langsung dicek melalui `warranty.html` atau QR dari perangkat lain. Tidak perlu unggah daftar ke GitHub. Kembali ke tab kartu untuk memperbarui status Terdaftar online.
7. Cetak atau Unduh PDF. Draf/kartu yang pernah dicetak sebelum layanan online diluncurkan harus diaktifkan satu kali melalui tombol yang sama; QR lama tetap bekerja jika menggunakan domain Polar yang benar.

Aktivasi tidak dilakukan otomatis saat menyimpan, mencetak, mengunduh PDF, atau mengimpor backup. Setiap kartu dikonfirmasi secara individual agar draf contoh tidak menjadi garansi resmi. Jangan aktifkan data contoh di produksi.

## Keamanan dan Penyimpanan

`services/polar-warranty` adalah sumber layanan server. Identitas pemilik diverifikasi melalui Sign in with ChatGPT dan allowlist email di secret runtime `POLAR_ADMIN_EMAIL`. Jangan menaruh kredensial atau token GitHub dalam JavaScript publik. PIN browser hanya pembatas antarmuka lokal, bukan otorisasi penerbitan. Sesi PIN berlaku 30 menit. Keluar tidak menghapus draf lokal.

D1 menyimpan data publik per nomor kartu, waktu aktivasi, dan identitas penerbit untuk audit internal. Tidak ada endpoint daftar semua kartu untuk pengunjung. API publik hanya mengembalikan hasil satu nomor lengkap, tanpa identitas penerbit. Pengecekan dibatasi 120 permintaan per alamat jaringan per 10 menit; alamat disimpan sebagai hash berbatas waktu. Respons memakai no-store dan CORS untuk domain website Polar. Aktivasi memerlukan identitas pemilik, Origin yang sama, dan JSON yang tervalidasi.

Nomor yang sama dengan data identik aman untuk dicoba kembali. Data berbeda atau nomor berstatus cancelled tidak bisa ditimpa/diaktifkan ulang. Data resmi yang keliru perlu ditangani pemilik, bukan ditimpa dengan draf. Belum ada antarmuka pembatalan atau perubahan data pelanggan; jangan mengedit database tanpa arsip dan konfirmasi pemilik.

Draf dan backup JSON disimpan di perangkat dan memuat VIN lengkap untuk pencetakan; simpan sebagai arsip internal. Nama pelanggan dan nomor telepon tidak diminta. Daftar publik hanya memuat VIN enam karakter terakhir, kendaraan, dealer, produk, area, dan tanggal garansi. Tidak ada draf lokal yang dipindah otomatis ke database.

`assets/warranty-registry.js` dipertahankan untuk kompatibilitas daftar lama. Hasil database menjadi prioritas; daftar lama hanya dibaca bila server mengonfirmasi nomor belum ada. Kegagalan jaringan ditampilkan sebagai layanan tidak tersedia, bukan nomor tidak terdaftar. Ekspor daftar lama masih tersedia pada Arsip daftar lama, tetapi tidak diperlukan untuk aktivasi baru.

## Format dan Cetak

Kode memakai PLR, tahun, dan delapan karakter acak. Garansi aktif sampai akhir tanggal kedaluwarsa waktu Jakarta. Tanggal 29 Februari diklem ke 28 Februari pada tahun non-kabisat. `films` memakai `null` untuk None; format lama front/side/rear tidak dimigrasikan secara diam-diam. `productType` membedakan window-film dan ppf; format lama tanpa properti ini adalah kaca film.

Kartu 190 x 80 mm. PDF dibuat lokal pada 305 dpi, satu sisi per halaman A4 dengan margin 10 mm. Pilih depan, belakang, atau keduanya. Cetak skala 100%, nonaktifkan header/footer; duplex menggunakan flip on long edge. QR hanya berisi URL dengan nomor kartu, bukan data kendaraan atau kredensial.

QR memakai qrcode-generator (MIT), PDF memakai pdf-lib (MIT), ikon memakai Lucide (ISC). Notice lisensi disertakan dalam vendor. Tidak ada layanan QR/PDF eksternal yang menerima data kartu. Ketentuan garansi harus mengacu pada dokumen resmi Polar dan invoice pemasangan, bukan contoh kartu merek lain.
