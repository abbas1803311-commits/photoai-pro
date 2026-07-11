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
  const modeRestore = document.getElementById('modeRestore');
  const modeEnhance = document.getElementById('modeEnhance');
  const runBtn = document.getElementById('runBtn');
  const resetBtn = document.getElementById('resetBtn');
  const resultActions = document.getElementById('resultActions');
  const downloadBtn = document.getElementById('downloadBtn');
  const errorMsg = document.getElementById('errorMsg');
  const processingOverlay = document.getElementById('processingOverlay');
  const processingLabel = document.getElementById('processingLabel');

  const MAX_BYTES = 12 * 1024 * 1024;
  let currentFile = null;
  let currentMode = null;
  let currentDataUrl = null;

  const MODE_LABELS = {
    restore: 'Restoring detail…',
    enhance: 'Upscaling to 4K…'
  };
  const ENDPOINTS = {
    restore: '/api/restore',
    enhance: '/api/enhance'
  };

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.hidden = false;
  }
  function clearError() {
    errorMsg.hidden = true;
    errorMsg.textContent = '';
  }

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function handleFile(file) {
    clearError();
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('Please upload a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      showError('That file is larger than 12MB. Try a smaller image.');
      return;
    }

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentDataUrl = e.target.result;
      beforeImg.src = currentDataUrl;
      afterImg.src = currentDataUrl;
      dropzone.hidden = true;
      workspace.hidden = false;
      resultActions.hidden = true;
      afterTag.textContent = 'After';
      workCompareCtrl.setPct(50);

      const img = new Image();
      img.onload = () => {
        fileMeta.textContent =
          `${file.name} · ${img.naturalWidth}\u00D7${img.naturalHeight}px · ${humanSize(file.size)}`;
      };
      img.src = currentDataUrl;

      resetModeSelection();
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('click', (e) => {
    if (e.target === browseBtn) return;
    fileInput.click();
  });
  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  ['dragenter', 'dragover'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  function resetModeSelection() {
    currentMode = null;
    modeRestore.classList.remove('selected');
    modeEnhance.classList.remove('selected');
    runBtn.disabled = true;
    runBtn.textContent = 'Select a mode';
  }

  function selectMode(mode) {
    currentMode = mode;
    modeRestore.classList.toggle('selected', mode === 'restore');
    modeEnhance.classList.toggle('selected', mode === 'enhance');
    runBtn.disabled = false;
    runBtn.textContent = mode === 'restore' ? 'Restore this photo' : 'Enhance & upscale to 4K';
  }

  modeRestore.addEventListener('click', () => selectMode('restore'));
  modeEnhance.addEventListener('click', () => selectMode('enhance'));

  resetBtn.addEventListener('click', () => {
    currentFile = null;
    currentDataUrl = null;
    fileInput.value = '';
    workspace.hidden = true;
    dropzone.hidden = false;
    resultActions.hidden = true;
    clearError();
    resetModeSelection();
  });

  async function runProcessing() {
    if (!currentFile || !currentMode) return;
    clearError();
    resultActions.hidden = true;
    processingLabel.textContent = MODE_LABELS[currentMode];
    processingOverlay.hidden = false;
    runBtn.disabled = true;

    try {
      const base64 = currentDataUrl.split(',')[1];

      const res = await fetch(ENDPOINTS[currentMode], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType: currentFile.type,
          filename: currentFile.name
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.image) {
        throw new Error(data.error || 'Something went wrong while processing this photo. Please try again.');
      }

      const resultUrl = data.image.startsWith('data:')
        ? data.image
        : `data:image/jpeg;base64,${data.image}`;

      afterImg.src = resultUrl;
      afterTag.textContent = currentMode === 'restore' ? 'Restored' : '4K';
      workCompareCtrl.setPct(50);

      downloadBtn.href = resultUrl;
      downloadBtn.download = `photoai-pro-${currentMode}-${(currentFile.name || 'photo').replace(/\.[^.]+$/, '')}.jpg`;
      resultActions.hidden = false;
    } catch (err) {
      showError(err.message || 'Processing failed. Please try again in a moment.');
    } finally {
      processingOverlay.hidden = true;
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener('click', runProcessing);
})();
