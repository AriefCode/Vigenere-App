/* ================================================================
   MAIN — Entry point, event wiring
   Depends on: ui.js (and transitively vigenere.js, base64.js, fileHandler.js)
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDropZone();
  initModal();
  initByteDictionary();
  initTextReactive();
  updateKeyspaceDisplay('');

  // Dark mode toggle
  document.getElementById('darkToggle').addEventListener('click', toggleTheme);

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Keyspace updates for both key fields
  bindKeyspaceUpdate('textKey');
  bindKeyspaceUpdate('fileKey');

  // ---- TEXT MODE events ----
  document.getElementById('textProcess').addEventListener('click', processTextMode);
  document.getElementById('textLoadExample').addEventListener('click', loadTextExample);
  document.getElementById('textCopy').addEventListener('click', copyOutput);

  // Visualization toggles
  document.getElementById('stepVizToggle').addEventListener('click', () => {
    _stepVizVisible = !_stepVizVisible;
    _applyStepViz();
  });
  document.getElementById('base64VizToggle').addEventListener('click', () => {
    _base64VizVisible = !_base64VizVisible;
    _applyBase64Viz();
  });

  // Allow pressing Enter in key field to trigger process
  document.getElementById('textKey').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') processTextMode();
  });

  // ---- FILE MODE events ----
  document.getElementById('fileProcess').addEventListener('click', processFileMode);
  document.getElementById('fileLoadExample').addEventListener('click', loadFileExample);
  document.getElementById('fileDownload').addEventListener('click', downloadResult);
  document.getElementById('clearFile').addEventListener('click', clearCurrentFile);
});
