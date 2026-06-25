# Vigenère Cipher — Byte-Level

Implementasi Vigenère Cipher extended ke domain byte (0–255, mod 256).
Tugas Matematika Diskrit — Politeknik Caltex Riau.

## Cara Membuka

Tidak memerlukan server. Buka langsung di browser:

```
File → Open File → index.html
```

Atau klik dua kali `index.html` dari File Explorer.

## Cara Test

### Text Mode (round-trip test)
1. Klik **Load Example** → field terisi otomatis
2. Pilih **Enkripsi** → klik **Proses**
3. Salin output Base64 → paste ke field input
4. Pilih **Dekripsi** → klik **Proses**
5. Hasil harus: `Halo Politeknik Caltex Riau`

### File Mode
1. Upload file `.txt` kecil
2. Masukkan kunci → Enkripsi → Unduh file
3. Upload file hasil enkripsi → kunci sama → Dekripsi → Unduh
4. Buka file hasil dekripsi → konten identik dengan asli

### Image Preview
Upload file `.png` atau `.jpg` → Enkripsi → preview before/after tampil.
Gambar setelah enkripsi akan terlihat noise/corrupted (sesuai ekspektasi).

## Algoritma

```
Enkripsi: c[i] = (p[i] + k[i mod n]) mod 256
Dekripsi: p[i] = (c[i] - k[i mod n] + 256) mod 256
```

- Input/output diproses sebagai byte array (Uint8Array)
- Kunci dikonversi ke bytes via UTF-8
- Output enkripsi Text Mode: Base64
- Output enkripsi File Mode: file binary (download)

## Batasan File

| Tipe | Format |
|------|--------|
| Teks | `.txt` |
| Gambar | `.png`, `.jpg`, `.jpeg`, `.webp` |
| Audio | `.mp3`, `.wav`, `.ogg` |
| Video | `.mp4`, `.webm` |

Ukuran maksimum: **40 MB**
