# Garansi Polar

Fitur ini berjalan pada website statis, termasuk GitHub Pages dan file lokal.

## Halaman

- `warranty.html`: cek garansi dengan nomor kartu, atau melalui QR.
- `warranty-card.html`: pengisian data, penyimpanan draf, dan cetak kartu.
- `assets/warranty-registry.js`: daftar garansi yang sudah diterbitkan.

Daftar awal sengaja kosong. Tidak ada garansi pelanggan atau contoh aktif yang dibuat tanpa data asli. Nomor yang belum diterbitkan menampilkan hasil belum ditemukan, bukan konfirmasi barang palsu.

## Menerbitkan kartu

1. Buka `warranty-card.html` dan isi data pemasangan serta kendaraan.
2. Masukkan alamat HTTPS website Polar yang sudah online. Untuk GitHub Pages, sertakan nama repository, misalnya `https://nama.github.io/polar/`. Tidak perlu menambahkan nama file HTML.
3. Pilih seri dan tint untuk kaca depan, samping, dan belakang. Masa garansi bawaan 5 tahun, dapat dipilih sampai 10 tahun sesuai dokumen pemasangan yang benar-benar diberikan.
4. Sesuaikan catatan garansi dengan ketentuan resmi Polar. Teks bawaan hanya merujuk ke dokumen garansi dan invoice, tidak membuat ketentuan pembatalan baru.
5. Simpan Draf. Simpan juga Backup Draf untuk arsip internal.
6. Pilih Ekspor Daftar Garansi. File ekspor menggabungkan daftar yang saat ini diterbitkan dengan semua draf tersimpan.
7. Pemilik website mengganti `assets/warranty-registry.js` di GitHub dengan file ekspor. Gunakan versi daftar paling baru saat mengekspor agar penerbitan dari perangkat lain tidak tertimpa. Bump nilai `v=` pada referensi registry di ketiga HTML bila CDN masih menyimpan versi lama.
8. Setelah deployment selesai, cek nomor pada `warranty.html` atau pindai QR untuk memastikan data terdaftar.

Jika nomor yang sudah diterbitkan memiliki data berbeda, ekspor dihentikan. Koreksi data dan pembatalan hanya boleh dilakukan pemilik website pada daftar resmi. Untuk pembatalan, ubah `state` menjadi `cancelled`. Tombol cetak tidak menerbitkan atau mengaktifkan garansi.

## Cetak

Kartu berukuran 190 x 80 mm. Pilih depan saja, belakang saja, atau kedua sisi. Unduh PDF membuat file langsung di perangkat, tanpa dialog cetak dan tanpa mengirim data ke layanan lain. Setiap sisi ditempatkan pada satu halaman A4 dengan margin 10 mm dan gambar kartu 305 dpi. Cetak membuka dialog cetak browser. Gunakan A4, skala 100%, nonaktifkan header/footer browser. Untuk dua sisi pada printer duplex, gunakan flip on long edge. Dua halaman memakai posisi dan ukuran yang sama; potong mengikuti batas kartu.

## Data

Draf disimpan di browser/perangkat, bukan database bersama. Backup JSON memuat nomor rangka lengkap untuk pencetakan dan harus menjadi arsip internal. Daftar publik hanya memuat enam karakter terakhir VIN, data kendaraan, dealer, pemasangan, film, dan masa berlaku. Nama pelanggan dan nomor telepon tidak diminta atau dipublikasikan.

QR hanya memuat URL dengan nomor garansi. Halaman publik mencari nomor dalam daftar terbitan; halaman cetak tidak memiliki akses untuk mengubah data yang sudah online. Jika daftar gagal dimuat, checker menampilkan pesan layanan tidak tersedia, bukan hasil belum ditemukan.

Nomor memakai awalan PLR, tahun, dan delapan digit acak. Masa berlaku dihitung berdasarkan tanggal pemasangan; pemasangan 29 Februari jatuh tempo 28 Februari pada tahun non-kabisat. Status aktif berlaku sampai akhir tanggal kedaluwarsa menurut waktu Indonesia. Tidak ada biaya klaim atau ketentuan hukum baru yang diasumsikan dari kartu merek lain.

Sistem ini belum menyediakan login dealer atau penyimpanan terpusat. Untuk pendaftaran otomatis dari banyak dealer, daftar statis perlu diganti API/database dengan autentikasi. Jangan memasukkan token GitHub atau kredensial ke halaman publik.

## Library

QR dibuat secara lokal dengan [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) karya Kazuhiko Arase, berlisensi MIT. Sumber vendored mempertahankan notice lisensi. Ikon menggunakan [Lucide](https://lucide.dev), berlisensi ISC. Tidak ada layanan QR eksternal yang menerima data kartu.

PDF dibuat lokal dengan [pdf-lib](https://pdf-lib.js.org), berlisensi MIT. Bundle dan notice lisensi tersedia pada folder `vendor`.
