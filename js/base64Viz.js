/* ================================================================
   BASE64 VISUALIZATION — step-by-step encode/decode table
   Depends on: index.html elements #base64VizSection, #base64VizHead, etc.
   ================================================================ */

const _B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const _B64_VIZ_MAX = 10;

// --- Group builders ---

function _b64EncodeGroups(bytes) {
  const groups = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const count = Math.min(3, bytes.length - i);
    const b0 = bytes[i], b1 = count > 1 ? bytes[i+1] : 0, b2 = count > 2 ? bytes[i+2] : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    const v = [(n >> 18) & 63, (n >> 12) & 63, (n >> 6) & 63, n & 63];
    groups.push({
      byteVals: Array.from(bytes.slice(i, i + count)),
      count,
      bits: n.toString(2).padStart(24, '0'),
      chunks: v,
      chars: [
        _B64_CHARS[v[0]], _B64_CHARS[v[1]],
        count >= 2 ? _B64_CHARS[v[2]] : '=',
        count >= 3 ? _B64_CHARS[v[3]] : '='
      ]
    });
  }
  return groups;
}

function _b64DecodeGroups(b64str) {
  const clean = b64str.replace(/[^A-Za-z0-9+/=]/g, '');
  const groups = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c = [clean[i]||'=', clean[i+1]||'=', clean[i+2]||'=', clean[i+3]||'='];
    const v = c.map(ch => ch === '=' ? 0 : Math.max(0, _B64_CHARS.indexOf(ch)));
    const n = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
    const pad1 = c[2] === '=', pad2 = c[3] === '=';
    const byteVals = pad1
      ? [(n >> 16) & 255]
      : pad2
        ? [(n >> 16) & 255, (n >> 8) & 255]
        : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    groups.push({ chars: c, chunks: v, bits: n.toString(2).padStart(24, '0'), byteVals, count: byteVals.length });
  }
  return groups;
}

// --- Row builder ---

function _b64FmtBits(bits) {
  // Visually split 24-bit string into 4 × 6-bit groups
  return bits.slice(0,6) + ' ' + bits.slice(6,12) + ' ' + bits.slice(12,18) + ' ' + bits.slice(18);
}

function _b64BuildRow(g, isEnc, hidden) {
  const tr = document.createElement('tr');
  if (hidden) tr.classList.add('hidden-row');

  const bytesTd = `<td class="b64v-bytes">${
    g.byteVals.join(', ')
  }${g.count < 3 ? `<span class="b64v-pad"> +${3 - g.count}×pad</span>` : ''}</td>`;

  const bitsTd = `<td><span class="b64v-bits">${_b64FmtBits(g.bits)}</span></td>`;

  const chunksArr = g.chunks.map((val, idx) => {
    const muted = isEnc
      ? (g.count === 1 && idx >= 2) || (g.count === 2 && idx >= 3)
      : g.chars[idx] === '=';
    const bin = val.toString(2).padStart(6, '0');
    return `<span class="b64v-chunk${muted ? ' b64v-muted' : ''}">${bin}<sub>${val}</sub></span>`;
  }).join('<span class="b64v-sep">|</span>');
  const chunksTd = `<td class="b64v-chunks">${chunksArr}</td>`;

  const charsArr = g.chars.map(ch =>
    `<span class="b64v-b64char${ch === '=' ? ' b64v-muted' : ''}">${ch}</span>`
  ).join(' ');
  const charsTd = `<td class="b64v-chars">${charsArr}</td>`;

  tr.innerHTML = isEnc
    ? bytesTd + bitsTd + chunksTd + charsTd
    : charsTd + chunksTd + bitsTd + bytesTd;

  return tr;
}

// --- Public API ---

function buildBase64VizTable(mode, cipherBytes, inputStr) {
  const isEnc = mode === 'encrypt';
  const groups = isEnc ? _b64EncodeGroups(cipherBytes) : _b64DecodeGroups(inputStr);
  const section = document.getElementById('base64VizSection');

  if (groups.length === 0) { section.classList.remove('visible'); return; }

  const total = groups.length;
  document.getElementById('base64VizCount').textContent = `${total} grup`;

  document.getElementById('base64VizHead').innerHTML = isEnc
    ? '<th>Bytes (dec)</th><th>24-bit</th><th>6-bit &times; 4</th><th>Base64</th>'
    : '<th>Base64</th><th>6-bit &times; 4</th><th>24-bit</th><th>Bytes (dec)</th>';

  const tbody = document.getElementById('base64VizBody');
  const table = document.getElementById('base64VizTable');
  tbody.innerHTML = '';
  table.classList.remove('expanded');

  const frag = document.createDocumentFragment();
  groups.forEach((g, i) => frag.appendChild(_b64BuildRow(g, isEnc, i >= _B64_VIZ_MAX)));

  if (total > _B64_VIZ_MAX) {
    const expandTr = document.createElement('tr');
    expandTr.className = 'expand-row';
    expandTr.innerHTML = `<td colspan="4">
      <button class="btn-expand" id="b64BtnExpand">Tampilkan semua ${total} grup</button>
    </td>`;
    frag.appendChild(expandTr);
  }

  tbody.appendChild(frag);

  if (total > _B64_VIZ_MAX) {
    document.getElementById('b64BtnExpand').addEventListener('click', function() {
      table.classList.add('expanded');
      this.closest('.expand-row').style.display = 'none';
    });
  }

  section.classList.add('visible');
}
