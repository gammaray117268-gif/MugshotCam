(function() {
  'use strict';

  const API_BASE = './api';

  const ReportApp = {
    records: [],
    deleteTargetIndex: null,
    currentViewIndex: null,

    init: function() {
      if (!sessionStorage.getItem('mpmps_current_officer')) {
        window.location.href = 'login.html';
        return;
      }
      this.bindEvents();
      this.loadRecords();
    },

    bindEvents: function() {
      document.getElementById('btnRefresh').addEventListener('click', () => this.loadRecords());
      document.getElementById('btnSaveEdit').addEventListener('click', () => this.saveEdit());
      document.getElementById('btnConfirmDelete').addEventListener('click', () => this.confirmDelete());

      const btnLogout = document.getElementById('btnReportLogout');
      if (btnLogout) {
        btnLogout.addEventListener('click', () => {
          sessionStorage.removeItem('mpmps_current_officer');
          window.location.href = 'login.html';
        });
      }

      document.getElementById('btnPrintRecord').addEventListener('click', () => this.printRecord(this.currentViewIndex));
      document.getElementById('btnExportWordRecord').addEventListener('click', () => this.exportRecordToWord(this.currentViewIndex));
      document.getElementById('btnShareRecord').addEventListener('click', () => this.openShareModal());

      document.getElementById('shareOs').addEventListener('click', () => this.shareViaOs());
      document.getElementById('shareEmail').addEventListener('click', () => this.shareViaEmail());
      document.getElementById('shareMessenger').addEventListener('click', () => this.shareViaMessenger());
      document.getElementById('shareDownload').addEventListener('click', () => this.shareDownloadImages());
      document.getElementById('shareCopyText').addEventListener('click', () => this.shareCopyText());

      document.getElementById('btnConfirmUpload').addEventListener('click', () => this.confirmUpload());
      document.getElementById('uploadPhotoInput').addEventListener('change', (e) => this.handleFileSelect(e));

      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            if (overlay.id === 'uploadPhotoModal') {
              this.closeUploadModal();
            } else {
              this.closeModal(overlay.id);
            }
          }
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-overlay.active').forEach(m => {
            if (m.id === 'uploadPhotoModal') {
              this.closeUploadModal();
            } else {
              this.closeModal(m.id);
            }
          });
        }
      });
    },

    async loadRecords() {
      try {
        const res = await fetch(API_BASE + '/records.php', { method: 'GET', credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) {
          this.records = data.records || [];
        } else {
          this.records = [];
        }
      } catch (e) {
        console.error('Failed to load records:', e);
        this.records = [];
      }
      this.renderTable();
    },

    renderTable: function() {
      const tbody = document.getElementById('recordsTableBody');
      if (!tbody) return;

      if (this.records.length === 0) {
        tbody.innerHTML = `
          <tr><td colspan="7">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              <p>No records found.</p>
            </div>
          </td></tr>`;
        return;
      }

      tbody.innerHTML = this.records.map((rec, index) => {
        const photos = rec.photos || [];
        const frontPhoto = photos.find(p => p.photo_type === 'frontHalf' && !p.is_original);
        const frontSrc = frontPhoto ? frontPhoto.file_path : '';
        const date = rec.date_of_arrest ? new Date(rec.date_of_arrest).toLocaleDateString() : '';

        return `
          <tr>
            <td><strong>${this.escapeHtml(rec.booking_id || '')}</strong></td>
            <td>${this.escapeHtml(rec.detainee_name || '')}</td>
            <td>${this.escapeHtml(rec.offense || '')}</td>
            <td>${date}</td>
            <td>${this.escapeHtml(rec.officer_name || '')}<br><small style="color:#6c757d">${this.escapeHtml(rec.rank || '')}</small></td>
            <td>
              ${frontSrc ? `<img src="${frontSrc}" class="thumb-mini" onclick="ReportApp.viewRecord(${index})" title="View mugshot">` : '<span style="color:#6c757d">No photo</span>'}
            </td>
            <td>
              <div class="actions-cell">
                <button class="btn-xs btn-view" onclick="ReportApp.viewRecord(${index})">View</button>
                <button class="btn-xs btn-edit" onclick="ReportApp.editRecord(${index})">Edit</button>
                <button class="btn-xs btn-delete" onclick="ReportApp.deleteRecord(${index})">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    viewRecord: function(index) {
      this.currentViewIndex = index;
      const rec = this.records[index];
      if (!rec) return;

      const photos = rec.photos || [];
      const mainTypes = ['frontHalf', 'leftSide', 'rightSide', 'fullBody'];
      const labels = { frontHalf: 'Front Half-Body', leftSide: 'Left Side Half-Body', rightSide: 'Right Side Half-Body', fullBody: 'Front Full-Body' };

      const photosHtml = mainTypes.map(key => {
        const photo = photos.find(p => p.photo_type === key && !p.is_original);
        const src = photo ? photo.file_path : '';
        return `
          <div class="detail-photo">
            ${src ? `<img src="${src}" alt="${labels[key]}">` : '<div style="width:100%;max-width:260px;aspect-ratio:1/1;background:#f5f5f5;border:1px dashed #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#999;">No Image</div>'}
            <span>${labels[key]}</span>
          </div>
        `;
      }).join('');

      const html = `
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Booking ID</span><span class="detail-value">${this.escapeHtml(rec.booking_id || '')}</span></div>
          <div class="detail-item"><span class="detail-label">Date of Arrest</span><span class="detail-value">${rec.date_of_arrest ? new Date(rec.date_of_arrest).toLocaleDateString() : ''}</span></div>
          <div class="detail-item"><span class="detail-label">Detainee Name</span><span class="detail-value">${this.escapeHtml(rec.detainee_name || '')}</span></div>
          <div class="detail-item"><span class="detail-label">Offense / Violation</span><span class="detail-value">${this.escapeHtml(rec.offense || '')}</span></div>
          <div class="detail-item"><span class="detail-label">Officer on Duty</span><span class="detail-value">${this.escapeHtml(rec.officer_name || '')}</span></div>
          <div class="detail-item"><span class="detail-label">Rank / Badge</span><span class="detail-value">${this.escapeHtml(rec.rank || '')} | ${this.escapeHtml(rec.badge_id || '')}</span></div>
        </div>
        <h4 style="margin-top:18px;color:var(--color-primary);border-bottom:2px solid var(--color-border);padding-bottom:6px;">Mugshots</h4>
        <div class="detail-photos">${photosHtml}</div>
        <div class="additional-photos-section" id="additionalPhotosSection">
          <h4>Supplementary Photos</h4>
          <div class="additional-photos-grid" id="additionalPhotosGrid"></div>
          <button class="add-photo-btn" onclick="ReportApp.openUploadModal(${index})">+ Add Photo</button>
        </div>
      `;

      document.getElementById('viewModalBody').innerHTML = html;
      this.openModal('viewModal');

      const additionalPhotos = photos.filter(p => p.photo_type === 'additional');
      const grid = document.getElementById('additionalPhotosGrid');
      if (grid) {
        if (additionalPhotos.length === 0) {
          grid.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.85rem;">No supplementary photos added.</p>';
        } else {
          grid.innerHTML = additionalPhotos.map((photo, pIndex) => {
            const realIndex = photos.indexOf(photo);
            return `
              <div class="additional-photo-item">
                <img src="${photo.file_path}" alt="${this.escapeHtml(photo.label || 'Photo')}">
                <div class="additional-photo-label">${this.escapeHtml(photo.label || 'Supplementary Photo')}</div>
                <button class="btn-delete-photo" onclick="ReportApp.deleteAdditionalPhoto(${realIndex})" title="Delete photo">&times;</button>
              </div>
            `;
          }).join('');
        }
      }
    },

    editRecord: function(index) {
      const rec = this.records[index];
      if (!rec) return;
      document.getElementById('editBookingId').value = index;
      document.getElementById('editDetaineeName').value = rec.detainee_name || '';
      document.getElementById('editOffense').value = rec.offense || '';
      document.getElementById('editArrestDate').value = rec.date_of_arrest || '';
      this.openModal('editModal');
    },

    async saveEdit() {
      const index = parseInt(document.getElementById('editBookingId').value, 10);
      if (isNaN(index) || index < 0 || index >= this.records.length) return;

      const name = document.getElementById('editDetaineeName').value.trim();
      const offense = document.getElementById('editOffense').value.trim();
      const arrestDate = document.getElementById('editArrestDate').value;

      if (!name || !offense || !arrestDate) {
        alert('All fields are required.');
        return;
      }

      const recordId = this.records[index].id;
      try {
        const res = await fetch(API_BASE + '/records.php?id=' + recordId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ detaineeName: name, offense: offense, dateOfArrest: arrestDate }),
          credentials: 'same-origin'
        });
        const data = await res.json();
        if (data.success) {
          this.records[index].detainee_name = name;
          this.records[index].offense = offense;
          this.records[index].date_of_arrest = arrestDate;
          this.renderTable();
          this.closeModal('editModal');
        } else {
          alert('Failed to update record: ' + data.message);
        }
      } catch (e) {
        alert('Failed to update record. Please try again.');
      }
    },

    deleteRecord: function(index) {
      this.deleteTargetIndex = index;
      this.openModal('deleteModal');
    },

    async confirmDelete() {
      if (this.deleteTargetIndex === null) return;
      const recordId = this.records[this.deleteTargetIndex].id;

      try {
        const res = await fetch(API_BASE + '/records.php?id=' + recordId, {
          method: 'DELETE',
          credentials: 'same-origin'
        });
        const data = await res.json();
        if (data.success) {
          this.records.splice(this.deleteTargetIndex, 1);
          this.renderTable();
          this.closeModal('deleteModal');
        } else {
          alert('Failed to delete record: ' + data.message);
        }
      } catch (e) {
        alert('Failed to delete record. Please try again.');
      }
      this.deleteTargetIndex = null;
    },

    openModal: function(id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
    },

    closeModal: function(id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    openUploadModal: function(index) {
      this.currentViewIndex = index;
      document.getElementById('uploadRecordIndex').value = index;
      document.getElementById('uploadPhotoInput').value = '';
      document.getElementById('uploadPhotoLabel').value = '';
      document.getElementById('uploadPreview').innerHTML = '<div class="upload-placeholder">Image preview will appear here</div>';
      this.openModal('uploadPhotoModal');
    },

    closeUploadModal: function() {
      document.getElementById('uploadPhotoInput').value = '';
      document.getElementById('uploadPhotoLabel').value = '';
      document.getElementById('uploadPreview').innerHTML = '<div class="upload-placeholder">Image preview will appear here</div>';
      this.closeModal('uploadPhotoModal');
    },

    handleFileSelect: function(event) {
      const file = event.target.files[0];
      const preview = document.getElementById('uploadPreview');
      if (!file) {
        preview.innerHTML = '<div class="upload-placeholder">Image preview will appear here</div>';
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    },

    async confirmUpload() {
      const index = parseInt(document.getElementById('uploadRecordIndex').value, 10);
      if (isNaN(index) || index < 0 || index >= this.records.length) return;

      const fileInput = document.getElementById('uploadPhotoInput');
      const labelInput = document.getElementById('uploadPhotoLabel');
      const file = fileInput.files[0];

      if (!file) {
        alert('Please select an image to upload.');
        return;
      }

      const recordId = this.records[index].id;
      const label = labelInput.value.trim() || 'Supplementary Photo';

      const formData = new FormData();
      formData.append('record_id', recordId);
      formData.append('label', label);
      formData.append('photo', file);

      try {
        const res = await fetch(API_BASE + '/upload.php', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        });
        const data = await res.json();
        if (data.success && data.photo) {
          this.records[index].photos = this.records[index].photos || [];
          this.records[index].photos.push(data.photo);
          this.closeUploadModal();
          this.viewRecord(index);
        } else {
          alert('Failed to upload photo: ' + data.message);
        }
      } catch (e) {
        alert('Failed to upload photo. Please try again.');
      }
    },

    async deleteAdditionalPhoto(photoIndex) {
      const rec = this.records[this.currentViewIndex];
      if (!rec || !rec.photos || !rec.photos[photoIndex]) return;

      const photoId = rec.photos[photoIndex].id;
      try {
        const res = await fetch(API_BASE + '/delete_photo.php?id=' + photoId, {
          method: 'DELETE',
          credentials: 'same-origin'
        });
        const data = await res.json();
        if (data.success) {
          rec.photos.splice(photoIndex, 1);
          this.viewRecord(this.currentViewIndex);
        } else {
          alert('Failed to delete photo: ' + data.message);
        }
      } catch (e) {
        alert('Failed to delete photo. Please try again.');
      }
    },

    getRecordFiles: function(rec) {
      const photos = rec.photos || [];
      const files = [];
      for (const photo of photos) {
        if (photo.file_path) {
          files.push({
            url: photo.file_path,
            name: `MPMPS_${rec.booking_id || 'record'}_${photo.photo_type || 'photo'}.jpg`
          });
        }
      }
      return files;
    },

    printRecord: function(index) {
      const rec = this.records[index];
      if (!rec) return;

      const photos = rec.photos || [];
      const mainTypes = ['frontHalf', 'leftSide', 'rightSide', 'fullBody'];
      const labels = { frontHalf: 'Front Half-Body', leftSide: 'Left Side Half-Body', rightSide: 'Right Side Half-Body', fullBody: 'Front Full-Body' };

      const photosHtml = mainTypes.map(key => {
        const photo = photos.find(p => p.photo_type === key && !p.is_original);
        const src = photo ? photo.file_path : '';
        return `<div class="print-photo">${src ? `<img src="${src}" alt="${labels[key]}">` : '<div class="print-photo-placeholder">No Image</div>'}<div class="print-photo-caption">${labels[key]}</div></div>`;
      }).join('');

      const additionalPhotos = photos.filter(p => p.photo_type === 'additional');
      const additionalPhotosHtml = additionalPhotos.map(photo => `
        <div class="print-photo"><img src="${photo.file_path}" alt="${this.escapeHtml(photo.label || 'Photo')}"><div class="print-photo-caption">${this.escapeHtml(photo.label || 'Supplementary Photo')}</div></div>
      `).join('');

      const printContent = `
        <div class="print-record">
          <div class="print-header"><h1>MUGSHOT RECORD</h1><p>Republic of the Philippines</p><p>MOISES PADILLA MUNICIPAL POLICE STATION</p><p>Moises Padilla, Negros Occidental</p></div>
          <table class="print-table">
            <tr><td class="print-label">Booking ID:</td><td class="print-value">${this.escapeHtml(rec.booking_id || '')}</td><td class="print-label">Date:</td><td class="print-value">${new Date().toLocaleDateString()}</td></tr>
            <tr><td class="print-label">Detainee Name:</td><td class="print-value">${this.escapeHtml(rec.detainee_name || '')}</td><td class="print-label">Date of Arrest:</td><td class="print-value">${rec.date_of_arrest ? new Date(rec.date_of_arrest).toLocaleDateString() : ''}</td></tr>
            <tr><td class="print-label">Offense / Violation:</td><td class="print-value" colspan="3">${this.escapeHtml(rec.offense || '')}</td></tr>
            <tr><td class="print-label">Officer on Duty:</td><td class="print-value">${this.escapeHtml(rec.officer_name || '')}</td><td class="print-label">Rank:</td><td class="print-value">${this.escapeHtml(rec.rank || '')}</td></tr>
            <tr><td class="print-label">Badge/PNP ID:</td><td class="print-value" colspan="3">${this.escapeHtml(rec.badge_id || '')}</td></tr>
          </table>
          <h2 class="print-section-title">MUGSHOTS</h2>
          <div class="print-photos-grid">${photosHtml}</div>
          ${additionalPhotos.length > 0 ? `<h2 class="print-section-title">SUPPLEMENTARY PHOTOS</h2><div class="print-photos-grid">${additionalPhotosHtml}</div>` : ''}
          <div class="print-signatures">
            <div class="print-sig-block"><div class="print-sig-line"></div><p>Detainee Signature</p><p class="print-sig-date">Date: _______________</p></div>
            <div class="print-sig-block"><div class="print-sig-line"></div><p>Investigating Officer</p><p class="print-sig-date">Date: _______________</p></div>
            <div class="print-sig-block"><div class="print-sig-line"></div><p>Station Commander</p><p class="print-sig-date">Date: _______________</p></div>
          </div>
        </div>
      `;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) { alert('Please allow popups to print this record.'); return; }
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Mugshot Record - ${this.escapeHtml(rec.booking_id || '')}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000;margin:0;padding:20px}.print-header{text-align:center;border-bottom:3px double #000;padding-bottom:10px;margin-bottom:20px}.print-header h1{font-size:18pt;margin:0 0 5px;text-transform:uppercase}.print-header p{margin:2px 0}.print-table{width:100%;border-collapse:collapse;margin-bottom:20px}.print-table td{border:1px solid #000;padding:6px 8px;vertical-align:top}.print-label{font-weight:bold;background:#f2f2f2;width:25%}.print-value{width:25%}.print-section-title{text-align:center;font-size:14pt;font-weight:bold;text-decoration:underline;margin:20px 0;text-transform:uppercase}.print-photos-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:30px}.print-photo{text-align:center;border:1px solid #000;padding:8px;width:45%;min-width:200px}.print-photo img{width:100%;max-width:250px;height:auto;aspect-ratio:1/1;object-fit:cover;display:block;margin:0 auto 6px;border:1px solid #ccc}.print-photo-placeholder{width:100%;max-width:250px;aspect-ratio:1/1;background:#f5f5f5;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;color:#999}.print-photo-caption{font-size:9pt;font-weight:bold;text-transform:uppercase}.print-signatures{margin-top:40px;display:flex;justify-content:space-between}.print-sig-block{text-align:center;width:30%}.print-sig-line{border-bottom:1px solid #000;height:50px;margin-bottom:6px}.print-sig-block p{margin:2px 0;font-size:10pt}.print-sig-date{font-size:9pt;color:#333}@media print{body{padding:0}.print-photo{break-inside:avoid}}</style></head><body>${printContent}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    },

    exportRecordToWord: function(index) {
      const rec = this.records[index];
      if (!rec) return;
      if (typeof htmlDocx === 'undefined') { alert('Word export library not loaded. Please check your internet connection.'); return; }

      const photos = rec.photos || [];
      const mainTypes = ['frontHalf', 'leftSide', 'rightSide', 'fullBody'];
      const labels = { frontHalf: 'Front Half-Body', leftSide: 'Left Side Half-Body', rightSide: 'Right Side Half-Body', fullBody: 'Front Full-Body' };

      const setImg = (id, src) => {
        const el = document.getElementById(id);
        if (el) el.src = src || '';
      };

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mugshot Record - ${this.escapeHtml(rec.booking_id || '')}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000;margin:0;padding:0}table{border-collapse:collapse;width:100%}td{border:1px solid #000;padding:6px 8px;vertical-align:top}.word-label{font-weight:bold;background:#f2f2f2}.word-title{text-align:center;font-size:16pt;font-weight:bold;text-decoration:underline;margin:14px 0;text-transform:uppercase}.word-header{text-align:center;border-bottom:3px double #000;padding-bottom:10px;margin-bottom:14px}.word-slate{border:1px solid #000;padding:10px;margin:14px 0;background:#f9f9f9;font-size:10pt}.word-signatures{margin-top:40px}.sig-block{text-align:center;width:33.33%}.sig-line{border-bottom:1px solid #000;height:50px;margin-bottom:6px}.page-break{page-break-after:always}.word-photo-grid-original{margin:18px 0}.word-photo-cell-original{text-align:center;border:1px solid #000;padding:8px;width:33.33%;vertical-align:top}.word-photo-cell-original img{max-width:100%;height:auto;display:block;margin:0 auto 6px;border:1px solid #ccc}.word-photo-grid-cropped{margin:18px 0}.word-photo-cell-cropped{text-align:center;border:1px solid #000;padding:8px;width:33.33%;vertical-align:top}.word-photo-cell-cropped img{width:5.08cm;height:5.08cm;object-fit:cover;display:block;margin:0 auto 6px;border:1px solid #ccc}.word-photo-caption{font-size:9pt;font-weight:bold;text-transform:uppercase}.word-photo-cell-wide{width:100%}img{max-width:100%}</style></head><body>
        <div class="word-header"><p>Republic of the Philippines</p><p>MOISES PADILLA MUNICIPAL POLICE STATION</p><p>Moises Padilla, Negros Occidental</p></div>
        <div class="word-title">MUGSHOT RECORD</div>
        <table><tr><td class="word-label">Booking ID:</td><td>${this.escapeHtml(rec.booking_id || '')}</td><td class="word-label">Date:</td><td>${new Date().toLocaleDateString()}</td></tr>
        <tr><td class="word-label">Detainee Name:</td><td>${this.escapeHtml(rec.detainee_name || '')}</td><td class="word-label">Date of Arrest:</td><td>${rec.date_of_arrest ? new Date(rec.date_of_arrest).toLocaleDateString() : ''}</td></tr>
        <tr><td class="word-label">Offense / Violation:</td><td colspan="3">${this.escapeHtml(rec.offense || '')}</td></tr></table>
        <table><tr><td class="word-label">Officer on Duty:</td><td>${this.escapeHtml(rec.officer_name || '')}</td><td class="word-label">Rank:</td><td>${this.escapeHtml(rec.rank || '')}</td><td class="word-label">Badge/PNP ID:</td><td>${this.escapeHtml(rec.badge_id || '')}</td></tr></table>
        <div class="word-slate"><p><strong>Digital Slate Data:</strong></p><p>Station: MOISES PADILLA MPS | Detainee: ${this.escapeHtml(rec.detainee_name || '')} | Offense: ${this.escapeHtml(rec.offense || '')} | Date: ${rec.date_of_arrest ? new Date(rec.date_of_arrest).toLocaleDateString() : ''} | Officer: ${this.escapeHtml(rec.officer_name || '')} (${this.escapeHtml(rec.rank || '')}) | Badge: ${this.escapeHtml(rec.badge_id || '')}</p></div>
        <table class="word-signatures"><tr><td class="sig-block"><div class="sig-line"></div><p>Detainee Signature</p><p class="sig-date">Date: _______________</p></td><td class="sig-block"><div class="sig-line"></div><p>Investigating Officer</p><p class="sig-date">Date: _______________</p></td><td class="sig-block"><div class="sig-line"></div><p>Station Commander</p><p class="sig-date">Date: _______________</p></td></tr></table>
        <div class="page-break"></div>
        <div class="word-title">ORIGINAL CAPTURED IMAGES</div>
        <table class="word-photo-grid-original"><tr>
          <td class="word-photo-cell-original"><img id="wordOriginalPhotoFront" alt="Front Half-Body"><div class="word-photo-caption">FRONT VIEW (Half-Body)</div></td>
          <td class="word-photo-cell-original"><img id="wordOriginalPhotoLeft" alt="Left Side Half-Body"><div class="word-photo-caption">LEFT SIDE VIEW (Half-Body)</div></td>
          <td class="word-photo-cell-original"><img id="wordOriginalPhotoRight" alt="Right Side Half-Body"><div class="word-photo-caption">RIGHT SIDE VIEW (Half-Body)</div></td>
        </tr><tr>
          <td class="word-photo-cell-original word-photo-cell-wide" colspan="3"><img id="wordOriginalPhotoFull" alt="Front Full-Body"><div class="word-photo-caption">FRONT VIEW (Full-Body)</div></td>
        </tr></table>
        <div class="page-break"></div>
        <div class="word-title">CROPPED MUGSHOTS (2x2 inches / 5.08 cm)</div>
        <table class="word-photo-grid-cropped"><tr>
          <td class="word-photo-cell-cropped"><img id="wordPhotoFront" alt="Front Half-Body"><div class="word-photo-caption">FRONT VIEW (Half-Body)</div></td>
          <td class="word-photo-cell-cropped"><img id="wordPhotoLeft" alt="Left Side Half-Body"><div class="word-photo-caption">LEFT SIDE VIEW (Half-Body)</div></td>
          <td class="word-photo-cell-cropped"><img id="wordPhotoRight" alt="Right Side Half-Body"><div class="word-photo-caption">RIGHT SIDE VIEW (Half-Body)</div></td>
        </tr><tr>
          <td class="word-photo-cell-cropped word-photo-cell-wide" colspan="3"><img id="wordPhotoFull" alt="Front Full-Body"><div class="word-photo-caption">FRONT VIEW (Full-Body)</div></td>
        </tr></table>
        </body></html>`;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      mainTypes.forEach(key => {
        const photo = photos.find(p => p.photo_type === key && !p.is_original);
        setImg('wordPhoto' + key.charAt(0).toUpperCase() + key.slice(1), photo ? photo.file_path : '');
        const origPhoto = photos.find(p => p.photo_type === key && p.is_original);
        setImg('wordOriginalPhoto' + key.charAt(0).toUpperCase() + key.slice(1), origPhoto ? origPhoto.file_path : '');
      });

      const additionalPhotos = photos.filter(p => p.photo_type === 'additional');
      if (additionalPhotos.length > 0) {
        const additionalPhotosHtml = additionalPhotos.map(photo => `
          <div class="word-photo-cell-original">
            <img src="${photo.file_path}" alt="${this.escapeHtml(photo.label || 'Photo')}">
            <div class="word-photo-caption">${this.escapeHtml(photo.label || 'Supplementary Photo')}</div>
          </div>
        `).join('');
        htmlContent = htmlContent.replace('</body>', `
          <div class="page-break"></div>
          <div class="word-title">SUPPLEMENTARY PHOTOS</div>
          <table class="word-photo-grid-original"><tr>${additionalPhotosHtml}</tr></table>
        </body>`);
      }

      try {
        const converted = htmlDocx.asBloc(htmlContent);
        const url = URL.createObjectURL(converted);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MPMPS_Mugshot_${rec.booking_id || 'record'}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        console.error('Word export failed:', e);
        alert('Failed to generate Word document. Please use Print instead.');
      } finally {
        document.body.removeChild(tempDiv);
      }
    },

    openShareModal: function() {
      this.openModal('shareModal');
    },

    getShareText: function(rec) {
      return `MUGSHOT RECORD\nBooking ID: ${rec.booking_id || 'N/A'}\nDetainee: ${rec.detainee_name || 'Unknown'}\nOffense: ${rec.offense || 'N/A'}\nDate of Arrest: ${rec.date_of_arrest || 'N/A'}\nOfficer: ${rec.officer_name || 'Unknown'} (${rec.rank || 'N/A'})\nBadge: ${rec.badge_id || 'N/A'}`;
    },

    shareViaOs: async function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec) return;
      const files = this.getRecordFiles(rec);
      if (files.length === 0) { alert('No images available to share for this record.'); return; }

      const shareData = { title: `Mugshot Record - ${rec.booking_id || 'Record'}`, text: this.getShareText(rec) };

      if (navigator.canShare && navigator.canShare(shareData)) {
        try { await navigator.share(shareData); this.closeModal('shareModal'); return; } catch (err) { if (err.name === 'AbortError') return; }
      }
      if (navigator.share) {
        try { await navigator.share(shareData); this.closeModal('shareModal'); return; } catch (err) { if (err.name === 'AbortError') return; }
      }
      alert('OS Share is not supported on this browser. Please use Download Images or Copy Text instead.');
    },

    shareViaEmail: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec) return;
      const subject = encodeURIComponent(`Mugshot Record - ${rec.booking_id || 'Record'}`);
      const body = encodeURIComponent(this.getShareText(rec));
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      this.closeModal('shareModal');
    },

    shareViaMessenger: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec) return;
      const text = encodeURIComponent(this.getShareText(rec));
      window.open(`https://www.messenger.com/t/?link=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
      this.closeModal('shareModal');
    },

    shareDownloadImages: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec) return;
      const files = this.getRecordFiles(rec);
      if (files.length === 0) { alert('No images available to share for this record.'); return; }
      for (const file of files) {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      this.closeModal('shareModal');
    },

    shareCopyText: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec) return;
      navigator.clipboard.writeText(this.getShareText(rec)).then(() => {
        alert('Record details copied to clipboard.');
      }).catch(() => {
        alert('Failed to copy text. Please try again.');
      });
      this.closeModal('shareModal');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ReportApp.init());
  } else {
    ReportApp.init();
  }

  window.ReportApp = ReportApp;
})();
