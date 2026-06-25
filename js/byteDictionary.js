/* ================================================================
   BYTE DICTIONARY — Kamus Byte 0–255
   Depends on: index.html elements #bytedictBackdrop, #bytedictGrid, etc.
   ================================================================ */

// --- Data ---

const _BD_CTRL_LABELS = [
  'NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL',
  'BS', 'TAB','LF', 'VT', 'FF', 'CR', 'SO', 'SI',
  'DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB',
  'CAN','EM', 'SUB','ESC','FS', 'GS', 'RS', 'US'
];
const _BD_CTRL_DESCS = [
  'Null character','Start of Heading','Start of Text','End of Text',
  'End of Transmission','Enquiry','Acknowledge','Bell (alert)',
  'Backspace','Horizontal Tab','Line Feed (newline)','Vertical Tab',
  'Form Feed','Carriage Return','Shift Out','Shift In',
  'Data Link Escape','Device Control 1 (XON)','Device Control 2',
  'Device Control 3 (XOFF)','Device Control 4','Negative Acknowledge',
  'Synchronous Idle','End of Transmission Block','Cancel',
  'End of Medium','Substitute','Escape',
  'File Separator','Group Separator','Record Separator','Unit Separator'
];
const _BD_SYM_DESCS = {
  33:'Exclamation Mark', 34:'Quotation Mark', 35:'Number Sign',
  36:'Dollar Sign', 37:'Percent Sign', 38:'Ampersand', 39:'Apostrophe',
  40:'Left Parenthesis', 41:'Right Parenthesis', 42:'Asterisk',
  43:'Plus Sign', 44:'Comma', 45:'Hyphen-Minus', 46:'Full Stop',
  47:'Solidus (slash)', 58:'Colon', 59:'Semicolon',
  60:'Less-Than Sign', 61:'Equals Sign', 62:'Greater-Than Sign',
  63:'Question Mark', 64:'Commercial At',
  91:'Left Square Bracket', 92:'Reverse Solidus (backslash)',
  93:'Right Square Bracket', 94:'Circumflex Accent',
  95:'Low Line (underscore)', 96:'Grave Accent',
  123:'Left Curly Bracket', 124:'Vertical Line (pipe)',
  125:'Right Curly Bracket', 126:'Tilde'
};
const _BD_L1_DESCS = {
  160:'No-Break Space', 161:'Inverted Exclamation Mark', 162:'Cent Sign',
  163:'Pound Sign', 164:'Currency Sign', 165:'Yen Sign', 166:'Broken Bar',
  167:'Section Sign', 168:'Diaeresis', 169:'Copyright Sign',
  170:'Feminine Ordinal Indicator', 171:'Left Double Angle Quote',
  172:'Not Sign', 173:'Soft Hyphen', 174:'Registered Sign', 175:'Macron',
  176:'Degree Sign', 177:'Plus-Minus Sign', 178:'Superscript Two',
  179:'Superscript Three', 180:'Acute Accent', 181:'Micro Sign',
  182:'Pilcrow Sign', 183:'Middle Dot', 184:'Cedilla',
  185:'Superscript One', 186:'Masculine Ordinal Indicator',
  187:'Right Double Angle Quote', 188:'Fraction One Quarter',
  189:'Fraction One Half', 190:'Fraction Three Quarters',
  191:'Inverted Question Mark', 215:'Multiplication Sign',
  247:'Division Sign'
};

function _bdGenerate() {
  const out = [];
  for (let b = 0; b <= 255; b++) {
    let char, category, description, isLabel = false;
    const hex = b.toString(16).toUpperCase().padStart(2, '0');
    if (b <= 31) {
      char = _BD_CTRL_LABELS[b]; category = 'control';
      description = _BD_CTRL_DESCS[b]; isLabel = true;
    } else if (b === 32) {
      char = 'SP'; category = 'whitespace';
      description = 'Space (blank character)'; isLabel = true;
    } else if ((b >= 33 && b <= 47) || (b >= 58 && b <= 64) ||
               (b >= 91 && b <= 96)  || (b >= 123 && b <= 126)) {
      char = String.fromCharCode(b); category = 'symbol';
      description = (_BD_SYM_DESCS[b] || `Symbol`) + ` — '${char}'`;
    } else if (b >= 48 && b <= 57) {
      char = String.fromCharCode(b); category = 'digit';
      description = `Digit ${char} (ASCII ${b})`;
    } else if (b >= 65 && b <= 90) {
      char = String.fromCharCode(b); category = 'uppercase';
      description = `Latin Capital Letter ${char}`;
    } else if (b >= 97 && b <= 122) {
      char = String.fromCharCode(b); category = 'lowercase';
      description = `Latin Small Letter ${char}`;
    } else if (b === 127) {
      char = 'DEL'; category = 'control';
      description = 'Delete'; isLabel = true;
    } else if (b <= 159) {
      char = '·'; category = 'extended-control';
      description = `C1 Control / UTF-8 continuation byte (0x${hex})`; isLabel = true;
    } else {
      char = b === 160 ? 'NBSP' : String.fromCharCode(b);
      isLabel = b === 160;
      category = 'extended';
      const name = _BD_L1_DESCS[b] || `Latin-1 Supplement`;
      description = `${name} — 0x${hex}`;
    }
    out.push({ byte: b, char, category, description, isLabel });
  }
  return out;
}

const byteDictionary = _bdGenerate();

// --- State ---
let _bdRendered = false;
let _bdHighlighted = -1;
let _bdActiveFilters = new Set([
  'control','whitespace','symbol','digit',
  'uppercase','lowercase','extended-control','extended'
]);

// --- Public API ---

function openByteDictionary() {
  document.getElementById('bytedictBackdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (!_bdRendered) { _bdRenderGrid(); _bdRendered = true; }
  document.getElementById('bytedictSearch').value = '';
  _bdClearHighlight();
  _bdApplyFilters();
}

function closeByteDictionary() {
  closeByteDetail();
  document.getElementById('bytedictBackdrop').style.display = 'none';
  document.body.style.overflow = '';
  _bdHideTooltip();
}

// --- Byte Detail Card ---

function openByteDetail(entry) {
  _bdHideTooltip();

  const hex = entry.byte.toString(16).toUpperCase().padStart(2, '0');
  const bin = entry.byte.toString(2).padStart(8, '0');
  const oct = entry.byte.toString(8).padStart(3, '0');

  const charEl = document.getElementById('bytedictDetailChar');
  charEl.className = `bytedetail-char-box cat-${entry.category}${entry.isLabel ? ' is-label' : ''}`;
  charEl.textContent = entry.char;

  document.getElementById('bytedictDetailByte').textContent = `Byte ${entry.byte}`;

  const catEl = document.getElementById('bytedictDetailCat');
  catEl.innerHTML =
    `<span class="bytedetail-cat-dot cat-${entry.category}"></span>${entry.category}`;

  document.getElementById('bytedictDetailDesc').textContent = entry.description;

  document.getElementById('bytedictDetailTable').innerHTML =
    `<div class="bytedetail-row"><span>Dec</span><strong>${entry.byte}</strong></div>` +
    `<div class="bytedetail-row"><span>Hex</span><strong>0x${hex}</strong></div>` +
    `<div class="bytedetail-row"><span>Bin</span><strong>${bin.slice(0,4)}&thinsp;${bin.slice(4)}</strong></div>` +
    `<div class="bytedetail-row"><span>Oct</span><strong>${oct}</strong></div>`;

  document.getElementById('bytedictDetailBackdrop').style.display = 'flex';
}

function closeByteDetail() {
  document.getElementById('bytedictDetailBackdrop').style.display = 'none';
}

function initByteDictionary() {
  // Main kamus byte modal
  document.getElementById('bytedictClose').addEventListener('click', closeByteDictionary);
  document.getElementById('bytedictBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeByteDictionary();
  });

  // Detail card
  document.getElementById('bytedictDetailClose').addEventListener('click', closeByteDetail);
  document.getElementById('bytedictDetailBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeByteDetail();
  });

  // ESC: close detail first if open, then main modal
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('bytedictDetailBackdrop').style.display === 'flex') {
      closeByteDetail();
    } else if (document.getElementById('bytedictBackdrop').style.display === 'flex') {
      closeByteDictionary();
    }
  });

  document.getElementById('openByteDictBtn').addEventListener('click', openByteDictionary);
  document.getElementById('bytedictSearch').addEventListener('input', _bdOnSearch);
  document.querySelectorAll('.bytedict-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => _bdToggleFilter(btn.dataset.cat));
  });
}

// --- Grid ---

function _bdRenderGrid() {
  const grid = document.getElementById('bytedictGrid');
  const tooltip = document.getElementById('bytedictTooltip');
  const frag = document.createDocumentFragment();

  byteDictionary.forEach(entry => {
    const cell = document.createElement('div');
    cell.className = `byte-cell cat-${entry.category}`;
    cell.dataset.byte = entry.byte;
    cell.dataset.cat = entry.category;

    const valEl = document.createElement('div');
    valEl.className = 'byte-cell-val';
    valEl.textContent = entry.byte;

    const charEl = document.createElement('div');
    charEl.className = 'byte-cell-char' + (entry.isLabel ? ' is-label' : '');
    charEl.textContent = entry.char;

    const dotEl = document.createElement('div');
    dotEl.className = 'byte-cell-dot';

    cell.appendChild(valEl);
    cell.appendChild(charEl);
    cell.appendChild(dotEl);

    cell.addEventListener('click', () => openByteDetail(entry));

    cell.addEventListener('mouseenter', (e) => {
      const hex = entry.byte.toString(16).toUpperCase().padStart(2, '0');
      const bin = entry.byte.toString(2).padStart(8, '0');
      tooltip.innerHTML =
        `<div class="bd-tip-row"><span class="bd-tip-lbl">Dec</span><strong>${entry.byte}</strong></div>` +
        `<div class="bd-tip-row"><span class="bd-tip-lbl">Hex</span><strong>0x${hex}</strong></div>` +
        `<div class="bd-tip-row"><span class="bd-tip-lbl">Bin</span><strong>${bin}</strong></div>` +
        `<div class="bd-tip-row"><span class="bd-tip-lbl">Cat</span><strong>${entry.category}</strong></div>` +
        `<div class="bd-tip-desc">${entry.description}</div>`;
      tooltip.classList.add('visible');
      _bdMoveTooltip(e);
    });
    cell.addEventListener('mousemove', _bdMoveTooltip);
    cell.addEventListener('mouseleave', _bdHideTooltip);

    frag.appendChild(cell);
  });

  grid.appendChild(frag);
}

function _bdMoveTooltip(e) {
  const tip = document.getElementById('bytedictTooltip');
  const gap = 14;
  let x = e.clientX + gap;
  let y = e.clientY + gap;
  const tw = tip.offsetWidth  || 210;
  const th = tip.offsetHeight || 110;
  if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - gap;
  if (y + th > window.innerHeight - 8) y = e.clientY - th - gap;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function _bdHideTooltip() {
  const tip = document.getElementById('bytedictTooltip');
  if (tip) tip.classList.remove('visible');
}

// --- Filtering ---

function _bdToggleFilter(cat) {
  if (_bdActiveFilters.has(cat)) {
    if (_bdActiveFilters.size === 1) return;
    _bdActiveFilters.delete(cat);
  } else {
    _bdActiveFilters.add(cat);
  }
  document.querySelectorAll('.bytedict-filter-btn').forEach(btn => {
    btn.classList.toggle('active', _bdActiveFilters.has(btn.dataset.cat));
  });
  _bdApplyFilters();
}

function _bdApplyFilters() {
  if (!_bdRendered) return;
  document.querySelectorAll('.byte-cell').forEach(cell => {
    cell.classList.toggle('dimmed', !_bdActiveFilters.has(cell.dataset.cat));
  });
}

// --- Search ---

function _bdOnSearch() {
  const raw = document.getElementById('bytedictSearch').value.trim();
  _bdClearHighlight();
  const n = parseInt(raw, 10);
  if (!isNaN(n) && n >= 0 && n <= 255) {
    const cell = document.querySelector(`.byte-cell[data-byte="${n}"]`);
    if (cell) {
      cell.classList.add('highlighted');
      _bdHighlighted = n;
      cell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function _bdClearHighlight() {
  if (_bdHighlighted >= 0) {
    const prev = document.querySelector(`.byte-cell[data-byte="${_bdHighlighted}"]`);
    if (prev) prev.classList.remove('highlighted');
    _bdHighlighted = -1;
  }
}
