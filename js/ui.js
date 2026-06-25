/* ================================================================
   UI — DOM manipulation, state, event handler functions
   Depends on: vigenere.js, base64.js, fileHandler.js
   ================================================================ */

/* ----------------------------------------------------------------
   STATE
   ---------------------------------------------------------------- */
const MAX_VISIBLE = 50;

let currentFile = null;
let currentResultBytes = null;
let currentResultFilename = '';

/* ================================================================
   KEYSPACE CALCULATOR
   ================================================================ */

function formatBigInt(n) {
  const s = n.toString();
  // Add thousands separators manually (toLocaleString unreliable on BigInt in some browsers)
  const parts = [];
  let rem = s;
  while (rem.length > 3) { parts.unshift(rem.slice(-3)); rem = rem.slice(0, -3); }
  if (rem) parts.unshift(rem);
  const formatted = parts.join('.');

  if (s.length > 15) {
    const exp = s.length - 1;
    const mantissa = (parseFloat(s.slice(0, 5)) / 10000).toFixed(2);
    return { formatted, sci: `${mantissa} &times; 10<sup>${exp}</sup>` };
  }
  return { formatted, sci: null };
}

function updateKeyspaceDisplay(keyStr) {
  const n = keyStr.length;
  const keyspace = BigInt(256) ** BigInt(n);
  const { formatted, sci } = formatBigInt(keyspace);

  const display = document.getElementById('keyspaceDisplay');
  const bigEl = document.getElementById('keyspaceBig');

  if (sci) {
    // Large number: sci notation prominent, full number in collapsible details
    display.innerHTML =
      `<div class="keyspace-label">256<sup>${n}</sup> &asymp;</div>` +
      `<div class="keyspace-sci-main">${sci}</div>`;
    bigEl.innerHTML =
      `<details class="keyspace-details">` +
      `<summary>Angka lengkap</summary>` +
      `<span class="keyspace-full">${formatted}</span>` +
      `</details>`;
    bigEl.style.display = 'block';
  } else {
    display.innerHTML = `<div>256<sup>${n}</sup> = ${formatted}</div>`;
    bigEl.style.display = 'none';
  }
}

/* ================================================================
   MESSAGES
   ================================================================ */

function showMsg(el, textEl, msg) {
  el.classList.add('visible');
  if (textEl) textEl.textContent = msg;
}

function hideMsg(el) { if (el) el.classList.remove('visible'); }

function clearTextMessages() {
  hideMsg(document.getElementById('textError'));
  hideMsg(document.getElementById('textWarn'));
}

function clearFileMessages() {
  hideMsg(document.getElementById('fileError'));
  hideMsg(document.getElementById('fileWarn'));
}

/* ================================================================
   STEP-BY-STEP TABLE
   ================================================================ */

function charLabel(byte) {
  if (byte >= 32 && byte <= 126) return String.fromCharCode(byte);
  return '<span style="color:var(--text-muted);font-size:11px">[np]</span>';
}

function buildStepTable(plainBytes, keyBytes, resultBytes, mode) {
  const isEnc = mode === 'encrypt';
  document.getElementById('thPlain').textContent  = isEnc ? 'Plain'  : 'Cipher';
  document.getElementById('thCipher').textContent = isEnc ? 'Cipher' : 'Plain';

  const total = plainBytes.length;
  document.getElementById('stepCount').textContent = `${total} byte${total !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('stepBody');
  tbody.innerHTML = '';

  const n = keyBytes.length;

  for (let i = 0; i < total; i++) {
    const p = plainBytes[i];
    const k = keyBytes[i % n];
    const r = resultBytes[i];
    const formula = isEnc
      ? `(${p} + ${k}) mod 256`
      : `(${p} &#8722; ${k} + 256) mod 256`;

    const tr = document.createElement('tr');
    if (i >= MAX_VISIBLE) tr.classList.add('hidden-row');

    tr.innerHTML = `
      <td>${i}</td>
      <td>${charLabel(p)} <span style="color:var(--text-muted)">(${p})</span></td>
      <td>${charLabel(k)} <span style="color:var(--text-muted)">(${k})[${i % n}]</span></td>
      <td>${formula}</td>
      <td><strong>${r}</strong></td>
      <td>${charLabel(r)} <span style="color:var(--text-muted)">(${r})</span></td>
    `;
    tbody.appendChild(tr);
  }

  // Expand row if needed
  const table = document.getElementById('stepTable');
  table.classList.remove('expanded');
  const existingExpand = tbody.querySelector('.expand-row');
  if (existingExpand) existingExpand.remove();

  if (total > MAX_VISIBLE) {
    const expandTr = document.createElement('tr');
    expandTr.className = 'expand-row';
    expandTr.innerHTML = `<td colspan="6">
      <button class="btn-expand" id="btnExpand">Tampilkan semua ${total} baris</button>
    </td>`;
    tbody.appendChild(expandTr);

    document.getElementById('btnExpand').addEventListener('click', function() {
      table.classList.add('expanded');
      expandTr.style.display = 'none';
    });
  }

  document.getElementById('stepSection').classList.add('visible');
}

/* ================================================================
   TEXT MODE
   ================================================================ */

function getTextMode() {
  return document.querySelector('input[name="textMode"]:checked').value;
}

/* Core computation — called by both manual trigger and reactive debounce.
   reactive=true: suppresses "required field" errors in favour of
   contextual hints; reactive=false: classic validation with error msgs. */
function _computeText(reactive) {
  _setTextComputing(false);
  clearTextMessages();

  const outputEl   = document.getElementById('textOutput');
  const stepEl     = document.getElementById('stepSection');
  const statsCard  = document.getElementById('statsCard');
  const outputBox  = document.getElementById('textOutputBox');

  outputEl.classList.remove('visible');
  stepEl.classList.remove('visible');
  document.getElementById('base64VizSection').classList.remove('visible');
  statsCard.style.display = 'none';
  outputBox.classList.remove('output-box-hint');

  const input  = document.getElementById('textInput').value;
  const keyStr = document.getElementById('textKey').value;
  const mode   = getTextMode();

  // --- Edge cases ---
  if (!input && !keyStr) return; // both empty → silent default state

  if (!keyStr) {
    if (reactive && input) {
      // Prompt the user to add a key — show hint in the output area
      document.getElementById('textOutputLabel').textContent = 'Output';
      outputBox.textContent = 'Ketik kunci untuk melihat hasil enkripsi.';
      outputBox.classList.add('output-box-hint');
      outputEl.classList.add('visible');
    } else if (!reactive) {
      showMsg(document.getElementById('textError'), document.getElementById('textErrorMsg'), 'Kunci tidak boleh kosong.');
    }
    return;
  }

  if (!input) return; // key filled, no input → wait silently

  // Key length warning (shown in both modes — educational)
  if (keyStr.length < 3) {
    showMsg(document.getElementById('textWarn'), document.getElementById('textWarnMsg'), 'Kunci sangat pendek (<3 karakter). Keamanan rendah.');
  }

  const keyBytes = strToBytes(keyStr);
  let plainBytes, resultBytes, outputText;

  if (mode === 'encrypt') {
    plainBytes  = strToBytes(input);
    resultBytes = vigenereEncrypt(plainBytes, keyBytes);
    outputText  = uint8ToBase64(resultBytes);
    document.getElementById('textOutputLabel').textContent = 'Output (Base64)';
  } else {
    try {
      plainBytes = base64ToUint8(input);
    } catch {
      showMsg(document.getElementById('textError'), document.getElementById('textErrorMsg'),
        'Input bukan Base64 yang valid. Untuk dekripsi, masukkan ciphertext dalam format Base64.');
      return;
    }
    resultBytes = vigenereDecrypt(plainBytes, keyBytes);
    outputText  = bytesToStr(resultBytes);
    document.getElementById('textOutputLabel').textContent = 'Output (Plaintext)';
  }

  outputBox.textContent = outputText;
  outputEl.classList.add('visible');
  hideMsg(document.getElementById('textCopyOk'));

  buildStepTable(plainBytes, keyBytes, resultBytes, mode);
  _applyStepViz();

  buildBase64VizTable(mode, resultBytes, input);
  _applyBase64Viz();

  document.getElementById('statsContent').innerHTML =
    `Input: ${plainBytes.length} byte(s)<br>` +
    `Kunci: ${keyBytes.length} byte(s)<br>` +
    `Output: ${outputText.length} char(s)<br>` +
    `Mode: ${mode === 'encrypt' ? 'Enkripsi' : 'Dekripsi'}`;
  statsCard.style.display = 'block';
}

// Manual trigger (button click) — keeps classic required-field validation
function processTextMode() { _computeText(false); }

/* ================================================================
   VISUALIZATION TOGGLES
   ================================================================ */

let _stepVizVisible   = true;   // byte-by-byte: default show
let _base64VizVisible = false;  // Base64: default hide

function _applyStepViz() {
  const wrap = document.getElementById('stepTableWrap');
  const btn  = document.getElementById('stepVizToggle');
  if (wrap) wrap.style.display = _stepVizVisible ? '' : 'none';
  if (btn)  btn.textContent   = _stepVizVisible ? 'Sembunyikan' : 'Tampilkan';
}

function _applyBase64Viz() {
  const wrap = document.getElementById('base64VizTableWrap');
  const btn  = document.getElementById('base64VizToggle');
  if (wrap) wrap.style.display = _base64VizVisible ? '' : 'none';
  if (btn)  btn.textContent   = _base64VizVisible ? 'Sembunyikan' : 'Tampilkan';
}

/* ================================================================
   REACTIVE TEXT MODE — debounced auto-update
   ================================================================ */

let _textDebounceTimer = null;

function _getDebounceDelay(inputLen) {
  if (inputLen > 5000) return 600;
  if (inputLen > 1000) return 400;
  return 150;
}

function _setTextComputing(show) {
  const el = document.getElementById('textComputing');
  if (el) el.classList.toggle('active', show);
}

// Debounced entry point — called on every input event in text mode
function scheduleTextUpdate() {
  if (_textDebounceTimer) clearTimeout(_textDebounceTimer);

  const input  = document.getElementById('textInput').value;
  const keyStr = document.getElementById('textKey').value;

  // Both empty: clear output state immediately
  if (!input && !keyStr) {
    _setTextComputing(false);
    _computeText(true);
    return;
  }

  const delay = _getDebounceDelay(input.length);
  _setTextComputing(true);
  _textDebounceTimer = setTimeout(() => {
    _textDebounceTimer = null;
    try { _computeText(true); } catch(e) { _setTextComputing(false); throw e; }
  }, delay);
}

function initTextReactive() {
  const textInput = document.getElementById('textInput');
  const textKey   = document.getElementById('textKey');

  textInput.addEventListener('input',  scheduleTextUpdate);
  textInput.addEventListener('change', scheduleTextUpdate);
  textKey.addEventListener('input',   scheduleTextUpdate);
  textKey.addEventListener('change',  scheduleTextUpdate);

  // Mode toggle is an explicit user action — re-compute immediately, no debounce
  document.querySelectorAll('input[name="textMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (_textDebounceTimer) { clearTimeout(_textDebounceTimer); _textDebounceTimer = null; }
      _computeText(true);
    });
  });
}

function loadTextExample() {
  document.getElementById('textInput').value = 'Halo Politeknik Caltex Riau';
  const keyInput = document.getElementById('textKey');
  keyInput.value = 'KRIPTO';
  document.querySelector('input[name="textMode"][value="encrypt"]').checked = true;
  updateKeyspaceDisplay('KRIPTO');
  updateKeyInfo('KRIPTO', keyInput, document.getElementById('textKeyInfo'));
  _computeText(true); // immediate — no need to debounce an explicit example load
}

function copyOutput() {
  const text = document.getElementById('textOutputBox').textContent;
  const okEl = document.getElementById('textCopyOk');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      okEl.classList.add('visible');
      setTimeout(() => okEl.classList.remove('visible'), 2000);
    });
  } else {
    // Fallback for file:// protocol
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      okEl.classList.add('visible');
      setTimeout(() => okEl.classList.remove('visible'), 2000);
    } catch {}
    document.body.removeChild(ta);
  }
}

/* ================================================================
   FILE MODE
   ================================================================ */

function setCurrentFile(file) {
  clearFileMessages();
  const check = validateFile(file);
  if (!check.ok) {
    showMsg(document.getElementById('fileError'), document.getElementById('fileErrorMsg'), check.msg);
    clearCurrentFile();
    return;
  }

  currentFile = file;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatFileSize(file.size);
  document.getElementById('fileSelected').classList.add('visible');
  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('fileOutput').classList.remove('visible');
  document.getElementById('previewGrid').classList.remove('visible');
  currentResultBytes = null;
}

function clearCurrentFile() {
  currentFile = null;
  currentResultBytes = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('fileSelected').classList.remove('visible');
  document.getElementById('dropZone').style.display = '';
  document.getElementById('fileOutput').classList.remove('visible');
  document.getElementById('previewGrid').classList.remove('visible');
}

function getFileMode() {
  return document.querySelector('input[name="fileMode"]:checked').value;
}

function showFileProgress(show, text = 'Memproses...') {
  const wrap = document.getElementById('fileProgress');
  wrap.classList.toggle('visible', show);
  document.getElementById('progressText').textContent = text;
  document.getElementById('progressFill').style.width = show ? '0%' : '0%';
}

function setFileProgress(pct) {
  document.getElementById('progressFill').style.width = `${pct}%`;
}

function processFileMode() {
  clearFileMessages();
  document.getElementById('fileOutput').classList.remove('visible');
  document.getElementById('previewGrid').classList.remove('visible');

  const keyStr = document.getElementById('fileKey').value;
  const mode = getFileMode();

  if (!currentFile) {
    showMsg(document.getElementById('fileError'), document.getElementById('fileErrorMsg'), 'Pilih file terlebih dahulu.');
    return;
  }
  if (!keyStr) {
    showMsg(document.getElementById('fileError'), document.getElementById('fileErrorMsg'), 'Kunci tidak boleh kosong.');
    return;
  }
  if (keyStr.length < 3) {
    showMsg(document.getElementById('fileWarn'), document.getElementById('fileWarnMsg'), 'Kunci sangat pendek (<3 karakter). Keamanan rendah.');
  }

  const btn = document.getElementById('fileProcess');
  btn.disabled = true;

  const largeFile = currentFile.size > PROGRESS_THRESHOLD;
  if (largeFile) showFileProgress(true);

  readFileAsBytes(
    currentFile,
    (e) => {
      if (e.lengthComputable && largeFile) {
        setFileProgress(Math.round((e.loaded / e.total) * 60));
      }
    },
    (e) => {
      if (largeFile) setFileProgress(70);

      const inputBytes = new Uint8Array(e.target.result);
      const keyBytes = strToBytes(keyStr);

      // Processing is synchronous — fine for ≤40 MB in modern engines
      const resultBytes = mode === 'encrypt'
        ? vigenereEncrypt(inputBytes, keyBytes)
        : vigenereDecrypt(inputBytes, keyBytes);

      if (largeFile) setFileProgress(100);

      currentResultBytes = resultBytes;

      const ext = getFileExt(currentFile.name);
      const baseName = currentFile.name.replace(/\.[^.]+$/, '');
      currentResultFilename = `${baseName}_${mode === 'encrypt' ? 'enc' : 'dec'}.${ext}`;

      // Media preview
      if (IMAGE_TYPES.has(ext)) {
        renderImagePreview(inputBytes, resultBytes, ALLOWED_TYPES[ext]);
      } else if (AUDIO_TYPES.has(ext)) {
        renderAudioPreview(inputBytes, resultBytes, ALLOWED_TYPES[ext], mode);
      } else if (VIDEO_TYPES.has(ext)) {
        renderVideoPreview(inputBytes, resultBytes, ALLOWED_TYPES[ext], mode);
      }

      // Show success
      document.getElementById('fileSuccessText').textContent =
        `File berhasil diproses. (${formatFileSize(resultBytes.length)})`;
      document.getElementById('fileOutput').classList.add('visible');

      setTimeout(() => {
        if (largeFile) showFileProgress(false);
        btn.disabled = false;
      }, 200);
    },
    () => {
      showMsg(document.getElementById('fileError'), document.getElementById('fileErrorMsg'), 'Gagal membaca file. Coba lagi.');
      showFileProgress(false);
      btn.disabled = false;
    }
  );
}

/* Replace content inside a .preview-item, preserving the .preview-label */
function setPreviewContent(itemId, el) {
  const item = document.getElementById(itemId);
  const label = item.querySelector('.preview-label');
  item.innerHTML = '';
  if (label) item.appendChild(label);
  item.appendChild(el);
}

/* Wire onerror fallback + click-to-zoom on an <img> element */
function attachPreviewWithFallback(imgEl, url, fallbackMsg) {
  const item = imgEl.closest('.preview-item');
  imgEl.onerror = () => {
    imgEl.style.display = 'none';
    const fallback = document.createElement('div');
    fallback.className = 'preview-fallback';
    fallback.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="18" height="18"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>' +
      '</svg>' +
      `<span>${fallbackMsg}</span>`;
    item.appendChild(fallback);
  };
  imgEl.onclick = () => openLightbox(url);
  imgEl.src = url;
}

function renderImagePreview(originalBytes, processedBytes, mimeType) {
  const { urlOrig, urlProc } = createImageObjectURLs(originalBytes, processedBytes, mimeType);

  const beforeImg = document.createElement('img');
  beforeImg.className = 'preview-img';
  beforeImg.alt = 'Sebelum';
  setPreviewContent('previewBeforeItem', beforeImg);
  attachPreviewWithFallback(beforeImg, urlOrig, 'Preview tidak tersedia<br>(format tidak didukung browser)');

  const afterImg = document.createElement('img');
  afterImg.className = 'preview-img';
  afterImg.alt = 'Setelah';
  setPreviewContent('previewAfterItem', afterImg);
  attachPreviewWithFallback(afterImg, urlProc, 'Image terenkripsi<br>(struktur byte rusak)');

  document.getElementById('previewGrid').classList.add('visible');
}

function createEncryptedPlaceholder(type, mimeType, sizeStr) {
  const SVG_VIDEO =
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="2" y="4" width="16" height="16"/><polygon points="22,8 22,16 16,12"/>' +
    '</svg>';
  const SVG_AUDIO =
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">' +
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
    '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
    '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
    '</svg>';
  const div = document.createElement('div');
  div.className = 'preview-placeholder';
  div.innerHTML =
    (type === 'video' ? SVG_VIDEO : SVG_AUDIO) +
    `<span class="preview-placeholder-title">${type === 'video' ? 'Video' : 'Audio'} terenkripsi</span>` +
    `<span class="preview-placeholder-meta">Ukuran: ${sizeStr}&ensp;&middot;&ensp;${mimeType}</span>`;
  return div;
}

function renderAudioPreview(originalBytes, processedBytes, mimeType, mode) {
  const isEncrypt = mode === 'encrypt';
  const playerBytes = isEncrypt ? originalBytes : processedBytes;
  const placeholderBytes = isEncrypt ? processedBytes : originalBytes;
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.className = 'preview-audio-player';
  audio.src = createMediaObjectURL(playerBytes, mimeType);
  const placeholder = createEncryptedPlaceholder('audio', mimeType, formatFileSize(placeholderBytes.length));
  setPreviewContent(isEncrypt ? 'previewBeforeItem' : 'previewAfterItem', audio);
  setPreviewContent(isEncrypt ? 'previewAfterItem' : 'previewBeforeItem', placeholder);
  document.getElementById('previewGrid').classList.add('visible');
}

function renderVideoPreview(originalBytes, processedBytes, mimeType, mode) {
  const isEncrypt = mode === 'encrypt';
  const playerBytes = isEncrypt ? originalBytes : processedBytes;
  const placeholderBytes = isEncrypt ? processedBytes : originalBytes;
  const video = document.createElement('video');
  video.controls = true;
  video.className = 'preview-video-player';
  video.src = createMediaObjectURL(playerBytes, mimeType);
  const placeholder = createEncryptedPlaceholder('video', mimeType, formatFileSize(placeholderBytes.length));
  setPreviewContent(isEncrypt ? 'previewBeforeItem' : 'previewAfterItem', video);
  setPreviewContent(isEncrypt ? 'previewAfterItem' : 'previewBeforeItem', placeholder);
  document.getElementById('previewGrid').classList.add('visible');
}

function downloadResult() {
  if (!currentResultBytes) return;
  const ext = getFileExt(currentResultFilename);
  const mimeType = ALLOWED_TYPES[ext] || 'application/octet-stream';
  triggerDownload(currentResultBytes, currentResultFilename, mimeType);
}

function loadFileExample() {
  const keyInput = document.getElementById('fileKey');
  keyInput.value = 'MATDIS';
  updateKeyspaceDisplay('MATDIS');
  updateKeyInfo('MATDIS', keyInput, document.getElementById('fileKeyInfo'));
}

/* ================================================================
   DRAG AND DROP
   ================================================================ */

function initDropZone() {
  const zone = document.getElementById('dropZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setCurrentFile(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) setCurrentFile(input.files[0]);
  });
}

/* ================================================================
   DARK MODE
   ================================================================ */

function initTheme() {
  const saved = localStorage.getItem('vigenere-theme');
  const isDark = saved === 'dark';
  applyTheme(isDark);
}

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('iconSun').style.display  = dark ? 'none' : '';
  document.getElementById('iconMoon').style.display = dark ? '' : 'none';
  localStorage.setItem('vigenere-theme', dark ? 'dark' : 'light');
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
}

/* ================================================================
   TABS
   ================================================================ */

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(tab === 'text' ? 'panelText' : 'panelFile').classList.add('active');
}

/* ================================================================
   KEY INFO (byte count + whitespace warning + trim button)
   ================================================================ */

function updateKeyInfo(keyStr, inputEl, infoEl) {
  if (!keyStr) { infoEl.innerHTML = ''; return; }
  const byteCount = strToBytes(keyStr).length;
  const spaceCount = (keyStr.match(/\s/g) || []).length;
  if (spaceCount > 0) {
    infoEl.innerHTML =
      `<span>${byteCount} byte</span> ` +
      `<span class="key-info-warn">(termasuk ${spaceCount} spasi)</span> `;
    const trimBtn = document.createElement('button');
    trimBtn.className = 'btn-trim';
    trimBtn.textContent = 'Trim';
    trimBtn.addEventListener('click', () => {
      inputEl.value = keyStr.trim();
      inputEl.dispatchEvent(new Event('input'));
    });
    infoEl.appendChild(trimBtn);
  } else {
    infoEl.innerHTML = `<span>${byteCount} byte</span>`;
  }
}

/* ================================================================
   SHARED KEY INPUT → KEYSPACE UPDATE
   ================================================================ */

function bindKeyspaceUpdate(inputId) {
  const inputEl = document.getElementById(inputId);
  const infoId = inputId === 'textKey' ? 'textKeyInfo' : 'fileKeyInfo';
  const infoEl = document.getElementById(infoId);
  inputEl.addEventListener('input', (e) => {
    updateKeyspaceDisplay(e.target.value);
    updateKeyInfo(e.target.value, inputEl, infoEl);
  });
}
