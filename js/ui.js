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

  // Scientific notation suffix if large
  if (s.length > 15) {
    const exp = s.length - 1;
    const mantissa = (parseFloat(s.slice(0, 5)) / 10000).toFixed(3);
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

  display.innerHTML = `<div>256<sup>${n}</sup> = ${formatted}</div>`;
  if (sci) {
    bigEl.innerHTML = `<span class="keyspace-sci">&asymp; ${sci}</span>`;
    bigEl.style.display = 'block';
  } else {
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

function hideMsg(el) { el.classList.remove('visible'); }

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

function processTextMode() {
  clearTextMessages();
  document.getElementById('textOutput').classList.remove('visible');
  document.getElementById('stepSection').classList.remove('visible');
  document.getElementById('statsCard').style.display = 'none';

  const input = document.getElementById('textInput').value;
  const keyStr = document.getElementById('textKey').value;
  const mode = getTextMode();

  // Validation
  if (!keyStr) {
    showMsg(document.getElementById('textError'), document.getElementById('textErrorMsg'), 'Kunci tidak boleh kosong.');
    return;
  }
  if (keyStr.length < 3) {
    showMsg(document.getElementById('textWarn'), document.getElementById('textWarnMsg'), 'Kunci sangat pendek (<3 karakter). Keamanan rendah.');
  }
  if (!input) {
    showMsg(document.getElementById('textError'), document.getElementById('textErrorMsg'), 'Input tidak boleh kosong.');
    return;
  }

  const keyBytes = strToBytes(keyStr);
  let plainBytes, resultBytes, outputText;

  if (mode === 'encrypt') {
    plainBytes = strToBytes(input);
    resultBytes = vigenereEncrypt(plainBytes, keyBytes);
    outputText = uint8ToBase64(resultBytes);
    document.getElementById('textOutputLabel').textContent = 'Output (Base64)';
  } else {
    // Decrypt: input is Base64
    try {
      plainBytes = base64ToUint8(input);
    } catch {
      showMsg(document.getElementById('textError'), document.getElementById('textErrorMsg'), 'Input bukan Base64 yang valid. Untuk dekripsi, masukkan ciphertext dalam format Base64.');
      return;
    }
    resultBytes = vigenereDecrypt(plainBytes, keyBytes);
    outputText = bytesToStr(resultBytes);
    document.getElementById('textOutputLabel').textContent = 'Output (Plaintext)';
  }

  document.getElementById('textOutputBox').textContent = outputText;
  document.getElementById('textOutput').classList.add('visible');
  hideMsg(document.getElementById('textCopyOk'));

  buildStepTable(plainBytes, keyBytes, resultBytes, mode);

  // Stats sidebar
  const statsCard = document.getElementById('statsCard');
  const statsContent = document.getElementById('statsContent');
  statsContent.innerHTML = `
    Input: ${plainBytes.length} byte(s)<br>
    Kunci: ${keyBytes.length} byte(s)<br>
    Output: ${outputText.length} char(s)<br>
    Mode: ${mode === 'encrypt' ? 'Enkripsi' : 'Dekripsi'}
  `;
  statsCard.style.display = 'block';
}

function loadTextExample() {
  document.getElementById('textInput').value = 'Halo Politeknik Caltex Riau';
  document.getElementById('textKey').value = 'KRIPTO';
  document.querySelector('input[name="textMode"][value="encrypt"]').checked = true;
  updateKeyspaceDisplay('KRIPTO');
  clearTextMessages();
  document.getElementById('textOutput').classList.remove('visible');
  document.getElementById('stepSection').classList.remove('visible');
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

      // Image preview
      if (IMAGE_TYPES.has(ext)) {
        renderImagePreview(inputBytes, resultBytes, ALLOWED_TYPES[ext]);
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

function renderImagePreview(originalBytes, processedBytes, mimeType) {
  const { urlOrig, urlProc } = createImageObjectURLs(originalBytes, processedBytes, mimeType);
  document.getElementById('previewBefore').src = urlOrig;
  document.getElementById('previewAfter').src = urlProc;
  document.getElementById('previewGrid').classList.add('visible');
}

function downloadResult() {
  if (!currentResultBytes) return;
  const ext = getFileExt(currentResultFilename);
  const mimeType = ALLOWED_TYPES[ext] || 'application/octet-stream';
  triggerDownload(currentResultBytes, currentResultFilename, mimeType);
}

function loadFileExample() {
  document.getElementById('fileKey').value = 'MATDIS';
  updateKeyspaceDisplay('MATDIS');
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
   SHARED KEY INPUT → KEYSPACE UPDATE
   ================================================================ */

function bindKeyspaceUpdate(inputId) {
  document.getElementById(inputId).addEventListener('input', (e) => {
    updateKeyspaceDisplay(e.target.value);
  });
}
