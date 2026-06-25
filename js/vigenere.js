/* ================================================================
   VIGENÈRE CIPHER — BYTE-LEVEL (mod 256)
   Domain: Uint8Array (bytes 0–255)
   ================================================================ */

/** Enkripsi: c[i] = (p[i] + k[i mod n]) mod 256 */
function vigenereEncrypt(plainBytes, keyBytes) {
  const n = keyBytes.length;
  const out = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i++) {
    out[i] = (plainBytes[i] + keyBytes[i % n]) % 256;
  }
  return out;
}

/** Dekripsi: p[i] = (c[i] - k[i mod n] + 256) mod 256 */
function vigenereDecrypt(cipherBytes, keyBytes) {
  const n = keyBytes.length;
  const out = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i++) {
    out[i] = (cipherBytes[i] - keyBytes[i % n] + 256) % 256;
  }
  return out;
}
