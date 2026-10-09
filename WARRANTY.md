# Garansi Polar

Fitur ini berjalan pada website statis, termasuk GitHub Pages dan file lokal.

## Halaman

- `warranty.html`: cek garansi dengan nomor kartu, atau melalui QR.
- `admin.html`: masuk area Admin menggunakan PIN.
- `warranty-card.html`: pengisian data, penyimpanan draf, dan cetak kartu setelah masuk Admin.
- `assets/warranty-registry.js`: daftar garansi yang sudah diterbitkan.

Daftar awal sengaja kosong. Tidak ada garansi pelanggan atau contoh aktif yang dibuat tanpa data asli. Nomor yang belum diterbitkan menampilkan hasil belum ditemukan, bukan konfirmasi barang palsu.

## Menerbitkan kartu

1. Buka `admin.html`, masukkan PIN Admin, lalu isi data pemasangan serta kendaraan.
2. Masukkan alamat HTTPS website Polar yang sudah online. Untuk GitHub Pages, sertakan nama repository, misalnya `https://nama.github.io/polar/`. Tidak perlu menambahkan nama file HTML.
3. Pilih jenis produk. Untuk kaca film, pilih seri dan tint untuk kaca depan, samping, dan belakang; garansi bawaan 5 tahun, dapat dipilih sampai 10 tahun sesuai dokumen pemasangan yang benar-benar diberikan. Untuk PPF, pilih PPF POLAR GLOSSÉ atau PPF POLAR BLANC dan isi area pemasangan; masa garansi PPF adalah 5 tahun sesuai konfirmasi pemilik.
4. Sesuaikan catatan garansi dengan ketentuan resmi Polar. Teks bawaan hanya merujuk ke dokumen garansi dan invoice, tidak membuat ketentuan pembatalan baru.
5. Simpan Draf. Simpan juga Backup Draf untuk arsip internal.
6. Pilih Ekspor Daftar Garansi. File ekspor menggabungkan daftar yang saat ini diterbitkan dengan semua draf tersimpan.
7. Pemilik website mengganti `assets/warranty-registry.js` di GitHub dengan file ekspor. Gunakan versi daftar paling baru saat mengekspor agar penerbitan dari perangkat lain tidak tertimpa. Bump nilai `v=` pada referensi registry di ketiga HTML bila CDN masih menyimpan versi lama.
8. Setelah deployment selesai, cek nomor pada `warranty.html` atau pindai QR untuk memastikan data terdaftar.

Jika nomor yang sudah diterbitkan memiliki data berbeda, ekspor dihentikan. Koreksi data dan pembatalan hanya boleh dilakukan pemilik website pada daftar resmi. Untuk pembatalan, ubah `state` menjadi `cancelled`. Tombol cetak tidak menerbitkan atau mengaktifkan garansi.

## Cetak

Kartu PPF mencantumkan seri dan area pemasangan, bukan tint atau VLT. Kartu kaca film tetap mencantumkan seri dan tint di setiap posisi kaca. Kedua jenis memakai alur QR, draf, PDF, dan penerbitan daftar yang sama. Untuk kendaraan yang memasang keduanya, buat satu kartu per jenis produk.

Kartu berukuran 190 x 80 mm. Pilih depan saja, belakang saja, atau kedua sisi. Unduh PDF membuat file langsung di perangkat, tanpa dialog cetak dan tanpa mengirim data ke layanan lain. Setiap sisi ditempatkan pada satu halaman A4 dengan margin 10 mm dan gambar kartu 305 dpi. Cetak membuka dialog cetak browser. Gunakan A4, skala 100%, nonaktifkan header/footer browser. Untuk dua sisi pada printer duplex, gunakan flip on long edge. Dua halaman memakai posisi dan ukuran yang sama; potong mengikuti batas kartu.

## Akses Admin

Area Admin memakai PIN yang ditentukan pemilik website. Sesi disimpan di `sessionStorage`, berlaku 30 menit, dan dapat diakhiri dengan tombol Keluar. Akses langsung ke halaman kartu tanpa sesi diarahkan ke halaman Admin. Nomor PIN tidak dimasukkan ke URL atau dicetak pada kartu. Menutup tab biasanya mengakhiri sesi; pengembalian tab oleh browser dapat memulihkan sesi sampai masa 30 menit berakhir.

GitHub Pages hanya melayani file statis. Pemeriksaan PIN dan sesi berjalan di browser, sehingga dapat dibaca atau dilewati melalui kode publik. Ini pembatas antarmuka, bukan autentikasi aman, dan bukan perlindungan untuk data rahasia. Jangan mengandalkan PIN untuk mengendalikan penerbitan garansi resmi atau menyimpan data pelanggan secara terpusat. Penerbitan daftar tetap memerlukan akses pemilik ke repository. Untuk Admin aman, gunakan backend dengan verifikasi PIN/password di server, pembatasan percobaan, dan sesi server. Draf yang sudah tersimpan tetap ada di perangkat setelah Keluar; gunakan perangkat internal untuk data lengkap kendaraan.

## Penyimpanan

`productType` membedakan `window-film` dan `ppf`. Draf/daftar lama tanpa properti ini tetap dikenali sebagai kaca film. Data PPF menggunakan `ppf.series` (`GLOSSÉ` atau `BLANC`) dan `ppf.coverage` (maksimum 80 karakter); daftar publik PPF tidak memuat kolom kaca atau tint. Semua halaman pemakai core/checker harus diperbarui bersamaan saat format PPF ditambahkan. Ekspor tetap menggabungkan data kaca film dan PPF yang sudah ada tanpa menghapusnya.

Draf disimpan di browser/perangkat, bukan database bersama. Backup JSON memuat nomor rangka lengkap untuk pencetakan dan harus menjadi arsip internal. Daftar publik hanya memuat enam karakter terakhir VIN, data kendaraan, dealer, pemasangan, film, dan masa berlaku. Nama pelanggan dan nomor telepon tidak diminta atau dipublikasikan.

QR hanya memuat URL dengan nomor garansi. Halaman publik mencari nomor dalam daftar terbitan; halaman cetak tidak memiliki akses untuk mengubah data yang sudah online. Jika daftar gagal dimuat, checker menampilkan pesan layanan tidak tersedia, bukan hasil belum ditemukan.

Nomor memakai awalan PLR, tahun, dan delapan digit acak. Masa berlaku dihitung berdasarkan tanggal pemasangan; pemasangan 29 Februari jatuh tempo 28 Februari pada tahun non-kabisat. Status aktif berlaku sampai akhir tanggal kedaluwarsa menurut waktu Indonesia. Tidak ada biaya klaim atau ketentuan hukum baru yang diasumsikan dari kartu merek lain.

Sistem ini belum menyediakan autentikasi server untuk dealer atau penyimpanan terpusat. Untuk pendaftaran otomatis dari banyak dealer, daftar statis perlu diganti API/database dengan autentikasi. Jangan memasukkan token GitHub atau kredensial ke halaman publik.

## Library

QR dibuat secara lokal dengan [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) karya Kazuhiko Arase, berlisensi MIT. Sumber vendored mempertahankan notice lisensi. Ikon menggunakan [Lucide](https://lucide.dev), berlisensi ISC. Tidak ada layanan QR eksternal yang menerima data kartu.

PDF dibuat lokal dengan [pdf-lib](https://pdf-lib.js.org), berlisensi MIT. Bundle dan notice lisensi tersedia pada folder `vendor`.
