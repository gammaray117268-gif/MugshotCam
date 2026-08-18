/* ============================================
   MPMPS MugshotCam System - Application Logic
   ============================================ */

(function() {
  'use strict';

  // ==========================================
  // Application State
  // ==========================================
  const App = {
    state: {
      currentScreen: 'registration',
      officer: null,
      detainee: null,
      session: {
        photos: {
          frontHalf: null,
          leftSide: null,
          rightSide: null,
          fullBody: null
        },
        originalPhotos: {
          frontHalf: null,
          leftSide: null,
          rightSide: null,
          fullBody: null
        },
        timestamp: null
      },
      currentAngleIndex: 0,
      stream: null,
      capturedThisAngle: false,
      facingMode: 'user',
      cameraCallId: 0
    },

    angles: [
      {
        key: 'frontHalf',
        label: 'Front View (Half-Body)',
        guide: 'Face the camera directly. Keep head and shoulders within the guide box.',
        cssClass: ''
      },
      {
        key: 'leftSide',
        label: 'Left Side View (Half-Body)',
        guide: 'Turn 90 degrees to your left. Show left profile within the guide box.',
        cssClass: ''
      },
      {
        key: 'rightSide',
        label: 'Right Side View (Half-Body)',
        guide: 'Turn 90 degrees to your right. Show right profile within the guide box.',
        cssClass: ''
      },
      {
        key: 'fullBody',
        label: 'Front View (Full-Body)',
        guide: 'Stand straight facing the camera. Ensure full body fits within the guide box.',
        cssClass: 'full-body'
      }
    ],

    // ==========================================
    // Initialization
    // ==========================================
    init: function() {
      this.bindEvents();
      this.checkSession();
      this.setDefaultDate();
      window.addEventListener('error', (e) => {
        console.error('[Global Error]', e.error);
        const statusEl = document.getElementById('cameraStatus');
        if (statusEl && this.state.currentScreen === 'camera') {
          statusEl.textContent = 'System error: ' + (e.error ? e.error.message : 'Unknown error');
          statusEl.style.color = 'var(--color-danger)';
        }
      });
      window.addEventListener('unhandledrejection', (e) => {
        console.error('[Unhandled Rejection]', e.reason);
        const statusEl = document.getElementById('cameraStatus');
        if (statusEl && this.state.currentScreen === 'camera') {
          statusEl.textContent = 'System error: ' + (e.reason ? (e.reason.message || e.reason) : 'Unknown error');
          statusEl.style.color = 'var(--color-danger)';
        }
      });
    },

    bindEvents: function() {
      // Registration
      document.getElementById('btnStartCapture').addEventListener('click', () => this.handleStartCapture());
      document.getElementById('btnBackToLogin').addEventListener('click', () => {
        localStorage.removeItem('mpmps_current_officer');
        window.location.href = 'login.html';
      });

      // Camera
      document.getElementById('btnCapture').addEventListener('click', () => {
        console.log('[Event] btnCapture clicked');
        this.capturePhoto();
      });
      document.getElementById('btnRetake').addEventListener('click', () => this.retakePhoto());
      document.getElementById('btnNextAngle').addEventListener('click', () => this.nextAngle());
      document.getElementById('btnSwitchCamera').addEventListener('click', () => this.switchCameraMode());
      document.getElementById('btnRetryCamera').addEventListener('click', () => this.startCamera());

      // Review
      document.getElementById('btnExportWord').addEventListener('click', () => this.exportToWord());
      document.getElementById('btnPrint').addEventListener('click', () => this.printBookingSheet());
      document.getElementById('btnNewSession').addEventListener('click', () => this.newSession());

      // Header nav
      const btnLogout = document.getElementById('btnHeaderLogout');
      if (btnLogout) {
        btnLogout.addEventListener('click', () => {
          localStorage.removeItem('mpmps_current_officer');
          window.location.href = 'login.html';
        });
      }

      // Photo downloads
      document.getElementById('reviewPhotoFront').parentElement.querySelector('.photo-download').addEventListener('click', () => this.downloadPhoto('frontHalf', 'Front_HalfBody'));
      document.getElementById('reviewPhotoLeft').parentElement.querySelector('.photo-download').addEventListener('click', () => this.downloadPhoto('leftSide', 'Left_Side'));
      document.getElementById('reviewPhotoRight').parentElement.querySelector('.photo-download').addEventListener('click', () => this.downloadPhoto('rightSide', 'Right_Side'));
      document.getElementById('reviewPhotoFull').parentElement.querySelector('.photo-download').addEventListener('click', () => this.downloadPhoto('fullBody', 'FullBody'));

      // Keyboard shortcut for capture
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && this.state.currentScreen === 'camera' && !this.state.capturedThisAngle) {
          e.preventDefault();
          this.capturePhoto();
        }
      });
    },

    setDefaultDate: function() {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('detaineeArrestDate').value = today;
    },

    checkSession: function() {
      const saved = localStorage.getItem('mpmps_current_officer');
      if (!saved) {
        window.location.href = 'login.html';
        return;
      }
      try {
        this.state.officer = JSON.parse(saved);
        this.navigateTo('registration');
      } catch (e) {
        console.error('Failed to parse saved officer', e);
        window.location.href = 'login.html';
      }
    },

    // ==========================================
    // Navigation
    // ==========================================
    navigateTo: function(screenName) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const target = document.getElementById('screen-' + screenName);
      if (target) {
        target.classList.add('active');
        this.state.currentScreen = screenName;
      }

      if (screenName === 'camera') {
        this.startCamera();
      } else {
        this.stopCamera();
      }

      if (screenName === 'review') {
        this.populateReview();
      }
    },

    // ==========================================
    // Login / Register
    // ==========================================
    handleLogin: function() {
      const name = document.getElementById('officerName').value.trim();
      const rank = document.getElementById('officerRank').value;
      const badge = document.getElementById('officerBadge').value.trim();

      if (!name || !rank || !badge) {
        this.showMessage('loginMessage', 'All fields are required.', 'error');
        return;
      }

      const officers = JSON.parse(localStorage.getItem('mpmps_officers') || '[]');
      const found = officers.find(o => o.badgeId === badge && o.officerName === name && o.rank === rank);

      if (!found) {
        this.showMessage('loginMessage', 'Officer not found. Please register first.', 'error');
        return;
      }

      this.state.officer = found;
      localStorage.setItem('mpmps_current_officer', JSON.stringify(found));
      this.showMessage('loginMessage', 'Login successful. Proceed to registration.', 'success');
      setTimeout(() => {
        this.navigateTo('registration');
        this.showMessage('loginMessage', '', '');
      }, 800);
    },

    handleRegister: function() {
      const name = document.getElementById('officerName').value.trim();
      const rank = document.getElementById('officerRank').value;
      const badge = document.getElementById('officerBadge').value.trim();

      if (!name || !rank || !badge) {
        this.showMessage('loginMessage', 'All fields are required.', 'error');
        return;
      }

      const officers = JSON.parse(localStorage.getItem('mpmps_officers') || '[]');

      if (officers.find(o => o.badgeId === badge)) {
        this.showMessage('loginMessage', 'Badge ID already registered.', 'error');
        return;
      }

      const newOfficer = { officerName: name, rank, badgeId: badge };
      officers.push(newOfficer);
      localStorage.setItem('mpmps_officers', JSON.stringify(officers));

      this.state.officer = newOfficer;
      localStorage.setItem('mpmps_current_officer', JSON.stringify(newOfficer));
      this.showMessage('loginMessage', 'Registration successful. Proceed to registration.', 'success');
      setTimeout(() => {
        this.navigateTo('registration');
        this.showMessage('loginMessage', '', '');
      }, 800);
    },

    // ==========================================
    // Registration
    // ==========================================
    handleStartCapture: function() {
      const fullName = document.getElementById('detaineeName').value.trim();
      const offense = document.getElementById('detaineeOffense').value.trim();
      const arrestDate = document.getElementById('detaineeArrestDate').value;

      if (!fullName || !offense || !arrestDate) {
        this.showMessage('registrationMessage', 'All fields are required.', 'error');
        return;
      }

      const bookingId = 'BK-' + Date.now().toString(36).toUpperCase();

      this.state.detainee = {
        fullName,
        offense,
        dateOfArrest: arrestDate,
        bookingId
      };

      this.state.session = {
        photos: {
          frontHalf: null,
          leftSide: null,
          rightSide: null,
          fullBody: null
        },
        originalPhotos: {
          frontHalf: null,
          leftSide: null,
          rightSide: null,
          fullBody: null
        },
        timestamp: new Date().toISOString()
      };

      this.state.currentAngleIndex = 0;
      this.state.capturedThisAngle = false;

      document.getElementById('bookingId').value = bookingId;
      this.showMessage('registrationMessage', '', '');
      this.navigateTo('camera');
    },

    // ==========================================
    // Camera Management
    // ==========================================
    startCamera: async function() {
      const callId = ++this.state.cameraCallId;
      const video = document.getElementById('webcamVideo');
      const placeholder = document.getElementById('capturePlaceholder');
      const btnCapture = document.getElementById('btnCapture');
      const statusEl = document.getElementById('cameraStatus');

      const setStatus = (msg) => {
        if (statusEl) {
          statusEl.textContent = msg;
          statusEl.style.color = '';
        }
        console.log('[Camera]', msg);
      };

      const enableCamera = () => {
        if (this.state.cameraCallId !== callId) {
          console.log('[Camera] enableCamera skipped: stale call');
          return;
        }
        console.log('[Camera] enableCamera called');
        placeholder.style.display = 'none';
        document.getElementById('cropOverlay').classList.add('active');
        btnCapture.disabled = false;
        btnCapture.style.display = 'inline-flex';
        const retryBtn = document.getElementById('btnRetryCamera');
        if (retryBtn) retryBtn.style.display = 'none';
        if (statusEl) {
          statusEl.textContent = 'Camera ready';
          statusEl.style.color = '';
        }
        this.updateCaptureUI();
        console.log('[Camera] Camera enabled. btnCapture disabled=', btnCapture.disabled, 'display=', btnCapture.style.display);
      };

      placeholder.style.display = 'flex';
      document.getElementById('cropOverlay').classList.remove('active');
      btnCapture.disabled = true;
      btnCapture.style.display = 'inline-flex';
      const retryBtn = document.getElementById('btnRetryCamera');
      if (retryBtn) retryBtn.style.display = 'none';
      document.getElementById('cameraPlaceholderText').textContent = 'Initializing camera...';
      setStatus('Requesting camera access...');

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Camera request timed out')), 10000)
        );
        this.state.stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: this.state.facingMode },
            audio: false
          }),
          timeoutPromise
        ]);
        setStatus('Camera stream acquired. Starting video...');

        video.srcObject = this.state.stream;
        video.setAttribute('playsinline', '');
        video.muted = true;

        try {
          await video.play();
          setStatus('Video playing. Waiting for frames...');
        } catch (playErr) {
          console.warn('Video play failed:', playErr);
          setStatus('Video play issue. Waiting for frames anyway...');
        }

        const waitForVideo = () => new Promise((resolve) => {
          const maxWait = 5000;
          const start = Date.now();

          const check = () => {
            if (this.state.cameraCallId !== callId) {
              resolve(false);
              return;
            }
            const ready = video.readyState >= video.HAVE_ENOUGH_DATA &&
                          video.videoWidth > 0 &&
                          video.videoHeight > 0;
            if (ready) {
              setStatus(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
              resolve(true);
            } else if (Date.now() - start > maxWait) {
              setStatus('Video timeout. Enabling capture anyway.');
              resolve(false);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });

        const videoReady = await waitForVideo();
        enableCamera();
      } catch (err) {
        console.error('Camera access error:', err);
        let msg = 'Camera access denied or unavailable.';
        if (err.name === 'NotAllowedError') {
          msg = 'Camera permission denied. Please allow camera access and refresh.';
        } else if (err.name === 'NotFoundError') {
          msg = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          msg = 'Camera is in use by another app. Close other apps and retry.';
        } else if (err.name === 'OverconstrainedError') {
          msg = 'Camera does not meet requirements. Try switching camera mode.';
        } else if (err.message === 'Camera request timed out') {
          msg = 'Camera request timed out. Please check permissions and retry.';
        }
        placeholder.querySelector('p').textContent = msg;
        const retryBtn = document.getElementById('btnRetryCamera');
        if (retryBtn) retryBtn.style.display = 'inline-flex';
        btnCapture.disabled = true;
        setStatus('Error: ' + msg);
      }
    },

    stopCamera: function() {
      if (this.state.stream) {
        this.state.stream.getTracks().forEach(track => track.stop());
        this.state.stream = null;
      }
      const video = document.getElementById('webcamVideo');
      if (video) video.srcObject = null;
    },

    switchCameraMode: function() {
      this.state.facingMode = this.state.facingMode === 'user' ? 'environment' : 'user';
      const label = document.getElementById('cameraModeLabel');
      const video = document.getElementById('webcamVideo');
      if (label) {
        label.textContent = this.state.facingMode === 'user' ? 'Front' : 'Back';
      }
      if (video) {
        if (this.state.facingMode === 'environment') {
          video.classList.add('back-camera');
        } else {
          video.classList.remove('back-camera');
        }
      }
      this.stopCamera();
      this.startCamera();
    },

    // ==========================================
    // Capture Workflow
    // ==========================================
    updateCaptureUI: function() {
      const angle = this.angles[this.state.currentAngleIndex];
      const progress = ((this.state.currentAngleIndex) / this.angles.length) * 100;

      document.getElementById('captureStepLabel').textContent =
        `Step ${this.state.currentAngleIndex + 1} of 4: ${angle.label}`;
      document.getElementById('progressFill').style.width = progress + '%';
      document.getElementById('progressText').textContent = `${this.state.currentAngleIndex} of 4 captured`;
      document.getElementById('captureGuideText').innerHTML = `<strong>Guide:</strong> ${angle.guide}`;

      const cropBox = document.querySelector('.crop-box');
      if (angle.cssClass === 'full-body') {
        cropBox.classList.add('full-body');
      } else {
        cropBox.classList.remove('full-body');
      }

      const btnCapture = document.getElementById('btnCapture');
      const btnRetake = document.getElementById('btnRetake');
      const btnNextAngle = document.getElementById('btnNextAngle');

      if (this.state.capturedThisAngle) {
        btnCapture.style.display = 'none';
        btnRetake.style.display = 'inline-flex';
        btnNextAngle.style.display = 'inline-flex';
      } else {
        btnCapture.style.display = 'inline-flex';
        btnRetake.style.display = 'none';
        btnNextAngle.style.display = 'none';
      }

      console.log('[UI] updateCaptureUI: captured=', this.state.capturedThisAngle, 'btnCapture display=', btnCapture.style.display, 'disabled=', btnCapture.disabled);
    },

    capturePhoto: function() {
      const video = document.getElementById('webcamVideo');
      const canvas = document.getElementById('captureCanvas');
      const ctx = canvas.getContext('2d');
      const statusEl = document.getElementById('cameraStatus');

      try {
        const angle = this.angles[this.state.currentAngleIndex];
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;

        if (!vw || !vh) {
          if (statusEl) {
            statusEl.textContent = 'Video not ready yet. Please wait a moment and try again.';
            statusEl.style.color = 'var(--color-danger)';
          }
          console.warn('Video dimensions not available.');
          return;
        }

        canvas.width = 600;
        canvas.height = 600;

        let cropSize, cropX, cropY;

        if (angle.key === 'fullBody') {
          cropSize = Math.min(vw, vh * 0.9);
          cropSize = Math.min(cropSize, vw);
          cropX = (vw - cropSize) / 2;
          cropY = (vh - cropSize) / 2 - (cropSize * 0.2);
        } else {
          cropSize = Math.min(vw, vh) * 0.85;
          cropX = (vw - cropSize) / 2;
          cropY = (vh - cropSize) / 2 - (cropSize * 0.12);
        }

        cropX = Math.max(0, Math.min(cropX, vw - cropSize));
        cropY = Math.max(0, Math.min(cropY, vh - cropSize));

        ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, 600, 600);

        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = vw;
        originalCanvas.height = vh;
        const origCtx = originalCanvas.getContext('2d');
        origCtx.drawImage(video, 0, 0, vw, vh);
        const originalDataUrl = originalCanvas.toDataURL('image/jpeg', 0.92);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        this.state.session.photos[angle.key] = dataUrl;
        this.state.session.originalPhotos[angle.key] = originalDataUrl;
        this.state.capturedThisAngle = true;

        this.showThumbnail(angle.key, dataUrl);
        this.updateCaptureUI();

        // Flash animation
        const flash = document.createElement('div');
        flash.className = 'capture-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);

        console.log('[Capture] Success:', angle.key, 'cropped:', !!dataUrl, 'original:', !!originalDataUrl);
      } catch (err) {
        console.error('[Capture] Error:', err);
        if (statusEl) {
          statusEl.textContent = 'Capture failed: ' + err.message;
          statusEl.style.color = 'var(--color-danger)';
        }
      }
    },

    retakePhoto: function() {
      const angle = this.angles[this.state.currentAngleIndex];
      this.state.session.photos[angle.key] = null;
      this.state.session.originalPhotos[angle.key] = null;
      this.state.capturedThisAngle = false;

      const thumb = document.getElementById('thumb-' + angle.key);
      if (thumb) thumb.remove();

      this.updateCaptureUI();
    },

    nextAngle: function() {
      if (this.state.currentAngleIndex < this.angles.length - 1) {
        this.state.currentAngleIndex++;
        this.state.capturedThisAngle = false;
        this.updateCaptureUI();
      } else {
        this.finishCapture();
      }
    },

    finishCapture: function() {
      const progress = 100;
      document.getElementById('progressFill').style.width = progress + '%';
      document.getElementById('progressText').textContent = '4 of 4 captured';

      this.state.session.timestamp = new Date().toISOString();
      this.saveSession();
      this.stopCamera();
      this.navigateTo('review');
    },

    // ==========================================
    // Thumbnails
    // ==========================================
    showThumbnail: function(key, dataUrl) {
      const container = document.getElementById('captureThumbnails');
      const existing = document.getElementById('thumb-' + key);
      if (existing) existing.remove();

      const img = document.createElement('img');
      img.id = 'thumb-' + key;
      img.src = dataUrl;
      img.className = 'thumbnail';
      img.alt = this.angles.find(a => a.key === key).label;
      container.appendChild(img);
    },

    // ==========================================
    // Review Screen
    // ==========================================
    populateReview: function() {
      if (!this.state.detainee || !this.state.officer) return;

      document.getElementById('reviewBookingId').textContent = this.state.detainee.bookingId;
      document.getElementById('reviewDetaineeName').textContent = this.state.detainee.fullName;
      document.getElementById('reviewOffense').textContent = this.state.detainee.offense;
      document.getElementById('reviewArrestDate').textContent = this.state.detainee.dateOfArrest;
      document.getElementById('reviewOfficerName').textContent = this.state.officer.officerName;
      document.getElementById('reviewOfficerBadge').textContent = `${this.state.officer.rank} | ${this.state.officer.badgeId}`;

      const setReviewPhoto = (key, imgId) => {
        const img = document.getElementById(imgId);
        if (img && this.state.session.photos[key]) {
          img.src = this.state.session.photos[key];
        }
      };

      setReviewPhoto('frontHalf', 'reviewPhotoFront');
      setReviewPhoto('leftSide', 'reviewPhotoLeft');
      setReviewPhoto('rightSide', 'reviewPhotoRight');
      setReviewPhoto('fullBody', 'reviewPhotoFull');
    },

    // ==========================================
    // Storage
    // ==========================================
    saveSession: function() {
      const history = JSON.parse(localStorage.getItem('mpmps_history') || '[]');
      history.push({
        detainee: this.state.detainee,
        officer: {
          officerName: this.state.officer.officerName,
          rank: this.state.officer.rank,
          badgeId: this.state.officer.badgeId
        },
        session: this.state.session,
        savedAt: new Date().toISOString()
      });
      localStorage.setItem('mpmps_history', JSON.stringify(history));
    },

    // ==========================================
    // MS Word Export
    // ==========================================
    exportToWord: function() {
      if (typeof htmlDocx === 'undefined') {
        this.showMessage('exportMessage', 'Word export library not loaded. Please check your internet connection or use Print instead.', 'error');
        return;
      }

      const template = document.getElementById('wordExportTemplate');

      // Populate text fields
      const populate = (id, value) => {
        const el = template.querySelector('#' + id);
        if (el) el.textContent = value || '';
      };

      populate('wordBookingId', this.state.detainee.bookingId);
      populate('wordDate', new Date().toLocaleDateString());
      populate('wordDetaineeName', this.state.detainee.fullName);
      populate('wordArrestDate', this.state.detainee.dateOfArrest);
      populate('wordOffense', this.state.detainee.offense);
      populate('wordOfficerName', this.state.officer.officerName);
      populate('wordOfficerRank', this.state.officer.rank);
      populate('wordOfficerBadge', this.state.officer.badgeId);
      populate('wordSlateText',
        `Station: MOISES PADILLA MPS | Detainee: ${this.state.detainee.fullName} | ` +
        `Offense: ${this.state.detainee.offense} | Date: ${this.state.detainee.dateOfArrest} | ` +
        `Officer: ${this.state.officer.officerName} (${this.state.officer.rank}) | Badge: ${this.state.officer.badgeId}`
      );

      // Set images
      const setImg = (id, src) => {
        const el = template.querySelector('#' + id);
        if (el) el.src = src;
      };

      setImg('wordPhotoFront', this.state.session.photos.frontHalf);
      setImg('wordPhotoLeft', this.state.session.photos.leftSide);
      setImg('wordPhotoRight', this.state.session.photos.rightSide);
      setImg('wordPhotoFull', this.state.session.photos.fullBody);

      setImg('wordOriginalPhotoFront', this.state.session.originalPhotos.frontHalf);
      setImg('wordOriginalPhotoLeft', this.state.session.originalPhotos.leftSide);
      setImg('wordOriginalPhotoRight', this.state.session.originalPhotos.rightSide);
      setImg('wordOriginalPhotoFull', this.state.session.originalPhotos.fullBody);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Mugshot Record - ${this.state.detainee.bookingId}</title>
          <style>
            body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
            table { border-collapse: collapse; width: 100%; }
            td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
            .word-label { font-weight: bold; background: #f2f2f2; }
            .word-title { text-align: center; font-size: 16pt; font-weight: bold; text-decoration: underline; margin: 14px 0; text-transform: uppercase; }
            .word-header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 14px; }
            .word-slate { border: 1px solid #000; padding: 10px; margin: 14px 0; background: #f9f9f9; font-size: 10pt; }
            .word-signatures { margin-top: 40px; }
            .sig-block { text-align: center; width: 33.33%; }
            .sig-line { border-bottom: 1px solid #000; height: 50px; margin-bottom: 6px; }
            .page-break { page-break-after: always; }
            .word-photo-grid-original { margin: 18px 0; }
            .word-photo-cell-original { text-align: center; border: 1px solid #000; padding: 8px; width: 33.33%; vertical-align: top; }
            .word-photo-cell-original img { max-width: 100%; height: auto; display: block; margin: 0 auto 6px; border: 1px solid #ccc; }
            .word-photo-grid-cropped { margin: 18px 0; }
            .word-photo-cell-cropped { text-align: center; border: 1px solid #000; padding: 8px; width: 33.33%; vertical-align: top; }
            .word-photo-cell-cropped img { width: 5.08cm; height: 5.08cm; object-fit: cover; display: block; margin: 0 auto 6px; border: 1px solid #ccc; }
            .word-photo-caption { font-size: 9pt; font-weight: bold; text-transform: uppercase; }
            .word-photo-cell-wide { width: 100%; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          ${template.innerHTML}
        </body>
        </html>
      `;

      try {
        const converted = htmlDocx.asBlob(htmlContent);
        const url = URL.createObjectURL(converted);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MPMPS_Mugshot_${this.state.detainee.bookingId}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.showMessage('exportMessage', 'Word document exported successfully.', 'success');
      } catch (e) {
        console.error('Word export failed:', e);
        this.showMessage('exportMessage', 'Failed to generate Word document. Please use the Print option instead.', 'error');
      }
    },

    // ==========================================
    // Print
    // ==========================================
    printBookingSheet: function() {
      this.populateReview();
      setTimeout(() => {
        window.print();
      }, 300);
    },

    // ==========================================
    // New Session
    // ==========================================
    newSession: function() {
      this.stopCamera();
      this.state.detainee = null;
      this.state.session = {
        photos: {
          frontHalf: null,
          leftSide: null,
          rightSide: null,
          fullBody: null
        },
        originalPhotos: {
          frontHalf: null,
          leftSide: null,
          rightSide: null,
          fullBody: null
        },
        timestamp: null
      };
      this.state.currentAngleIndex = 0;
      this.state.capturedThisAngle = false;

      document.getElementById('captureThumbnails').innerHTML = '';
      document.getElementById('btnNextAngle').style.display = 'none';
      document.getElementById('btnRetake').style.display = 'none';
      document.getElementById('btnCapture').style.display = 'inline-flex';

      localStorage.removeItem('mpmps_current_officer');
      window.location.href = 'login.html';
    },

    // ==========================================
    // Photo Downloads
    // ==========================================
    downloadPhoto: function(key, filenameSuffix) {
      const dataUrl = this.state.session.photos[key];
      if (!dataUrl) return;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `MPMPS_${this.state.detainee.bookingId}_${filenameSuffix}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    // ==========================================
    // Utilities
    // ==========================================
    showMessage: function(elementId, text, type) {
      const el = document.getElementById(elementId);
      if (!el) return;
      el.textContent = text;
      el.className = 'message ' + type;
      if (!text) el.className = 'message';
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

})();
