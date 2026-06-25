/* ================================================================
   BASE64 & UTF-8 HELPERS
   Pure utilities — no DOM, no side effects
   ================================================================ */

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: false });

const strToBytes = str => enc.encode(str);
const bytesToStr = bytes => dec.decode(bytes);

/** Uint8Array → Base64 string */
function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Base64 string → Uint8Array (throws on invalid input) */
function base64ToUint8(b64) {
  let binary;
  try { binary = atob(b64.trim()); } catch { throw new Error('invalid_b64'); }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
