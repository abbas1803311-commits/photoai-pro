(() => {
  'use strict';

  /* ---------- Mobile nav ---------- */
  const navToggle = document.getElementById('navToggle');
  navToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.mobile-nav a').forEach(a => {
    a.addEventListener('click', () => document.body.classList.remove('nav-open'));
  });

  /* ---------- Reusable before/after comparison slider ---------- */
  function initCompare(frameEl, clipEl, handleEl) {
    let dragging = false;

    function setPct(pct) {
      pct = Math.max(0, Math.min(100, pct));
      clipEl.style.width = pct + '%';
      handleEl.style.left = pct + '%';
      handleEl.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    function pctFromClientX(clientX) {
      const rect = frameEl.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    function onMove(e) {
      if (!dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPct(pctFromClientX(clientX));
    }

    function startDrag(e) {
      dragging = true;
      onMove(e);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: true });
    }
    function endDrag() {
      dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    }

    handleEl.addEventListener('mousedown', startDrag);
    handleEl.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    frameEl.addEventListener('click', (e) => {
      if (e.target.closest('.compare-handle')) return;
      setPct(pctFromClientX(e.clientX));
    });

    handleEl.addEventListener('keydown', (e) => {
      const current = parseFloat(handleEl.style.left) || 50;
      if (e.key === 'ArrowLeft') setPct(current - 5);
      if (e.key === 'ArrowRight') setPct(current + 5);
    });

    setPct(50);
    return { setPct };
  }

  // Hero demo slider
  initCompare(
    document.getElementById('heroCompare').querySelector('.compare-frame'),
    document.getElementById('heroClip'),
    document.getElementById('heroHandle')
  );

  // Studio workspace slider
  const workFrame = document.getElementById('workFrame');
  const workClip = document.getElementById('workClip');
  const workHandle = document.getElementById('workHandle');
  const workCompareCtrl = initCompare(workFrame, workClip, workHandle);

  /* ---------- Studio logic ---------- */
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const workspace = document.getElementById('workspace');
  const beforeImg = document.getElementById('beforeImg');
  const afterImg = document.getElementById('afterImg');
  const afterTag = document.getElementById('afterTag');
  const fileMeta = document.getElementById('fileMeta');
  const m
