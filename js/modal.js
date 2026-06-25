/* ================================================================
   MODAL — Lightbox for image zoom
   Depends on: index.html elements #lightboxBackdrop, #lightboxClose, #lightboxImg
   ================================================================ */

function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxBackdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightboxBackdrop').style.display = 'none';
  document.getElementById('lightboxImg').src = '';
  document.body.style.overflow = '';
}

function initModal() {
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);

  // Click on backdrop (not the image) closes modal
  document.getElementById('lightboxBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLightbox();
  });

  // ESC key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}
