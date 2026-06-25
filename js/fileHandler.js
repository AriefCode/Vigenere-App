/* ================================================================
   FILE HANDLER
   File API utilities: validation, FileReader, Blob, download
   No direct DOM manipulation (except triggerDownload's temporary <a>)
   ================================================================ */

const ALLOWED_TYPES = {
  'txt': 'text/plain',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'webp': 'image/webp',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'mp4': 'video/mp4',
  'webm': 'video/webm',
};

const IMAGE_TYPES = new Set(['png','jpg','jpeg','webp']);
const AUDIO_TYPES = new Set(['mp3','wav','ogg']);
const VIDEO_TYPES = new Set(['mp4','webm']);

const MAX_SIZE = 40 * 1024 * 1024; // 40 MB
const PROGRESS_THRESHOLD = 5 * 1024 * 1024; // 5 MB

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExt(name) {
  return name.split('.').pop().toLowerCase();
}

function validateFile(file) {
  const ext = getFileExt(file.name);
  if (!ALLOWED_TYPES[ext]) {
    return { ok: false, msg: `Tipe file .${ext} tidak didukung. Format yang didukung: .txt, .png, .jpg, .jpeg, .webp, .mp3, .wav, .ogg, .mp4, .webm` };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, msg: `File terlalu besar (${formatFileSize(file.size)}). Maksimum 40 MB.` };
  }
  if (file.size === 0) {
    return { ok: false, msg: 'File tidak boleh kosong.' };
  }
  return { ok: true };
}

/** Wraps FileReader.readAsArrayBuffer with named callbacks */
function readFileAsBytes(file, onProgress, onLoad, onError) {
  const reader = new FileReader();
  reader.onprogress = onProgress;
  reader.onload = onLoad;
  reader.onerror = onError;
  reader.readAsArrayBuffer(file);
}

/** Creates a Blob and triggers browser download via a temporary <a> element */
function triggerDownload(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Creates a single Blob URL for audio/video preview */
function createMediaObjectURL(bytes, mimeType) {
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

/** Creates object URLs for before/after image preview (caller sets img.src) */
function createImageObjectURLs(originalBytes, processedBytes, mimeType) {
  const blobOrig = new Blob([originalBytes], { type: mimeType });
  const blobProc = new Blob([processedBytes], { type: mimeType });
  return {
    urlOrig: URL.createObjectURL(blobOrig),
    urlProc: URL.createObjectURL(blobProc),
  };
}
