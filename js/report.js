(function() {
  'use strict';

  const ReportApp = {
    records: [],
    deleteTargetIndex: null,
    currentViewIndex: null,

    init: function() {
      if (!localStorage.getItem('mpmps_current_officer')) {
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
          localStorage.removeItem('mpmps_current_officer');
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

      // Close modal on overlay click
      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) this.closeModal(overlay.id);
        });
      });

      // Close modal on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-overlay.active').forEach(m => this.closeModal(m.id));
        }
      });
    },

    loadRecords: function() {
      try {
        this.records = JSON.parse(localStorage.getItem('mpmps_history') || '[]');
      } catch (e) {
        this.records = [];
      }
      this.renderTable();
    },

    renderTable: function() {
      const tbody = document.getElementById('recordsTableBody');
      if (!tbody) return;

      if (this.records.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <p>No records found.</p>
              </div>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = this.records.map((rec, index) => {
        const session = rec.session || {};
        const photos = session.photos || {};
        const frontPhoto = photos.frontHalf || '';
        const date = rec.detainee ? rec.detainee.dateOfArrest : '';
        const formattedDate = date ? new Date(date).toLocaleDateString() : '';

        return `
          <tr>
            <td><strong>${this.escapeHtml(rec.detainee ? rec.detainee.bookingId : '')}</strong></td>
            <td>${this.escapeHtml(rec.detainee ? rec.detainee.fullName : '')}</td>
            <td>${this.escapeHtml(rec.detainee ? rec.detainee.offense : '')}</td>
            <td>${formattedDate}</td>
            <td>${this.escapeHtml(rec.officer ? rec.officer.officerName : '')}<br><small style="color:#6c757d">${this.escapeHtml(rec.officer ? rec.officer.rank : '')}</small></td>
            <td>
              ${frontPhoto ? `<img src="${frontPhoto}" class="thumb-mini" onclick="ReportApp.viewRecord(${index})" title="View mugshot">` : '<span style="color:#6c757d">No photo</span>'}
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
      if (!rec || !rec.detainee) return;

      const photos = rec.session ? rec.session.photos : {};
      const photoKeys = [
        { key: 'frontHalf', label: 'Front Half-Body' },
        { key: 'leftSide', label: 'Left Side Half-Body' },
        { key: 'rightSide', label: 'Right Side Half-Body' },
        { key: 'fullBody', label: 'Front Full-Body' }
      ];

      const photosHtml = photoKeys.map(p => {
        const src = photos[p.key] || '';
        return `
          <div class="detail-photo">
            ${src ? `<img src="${src}" alt="${p.label}">` : '<div style="width:100%;max-width:260px;aspect-ratio:1/1;background:#f5f5f5;border:1px dashed #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#999;">No Image</div>'}
            <span>${p.label}</span>
          </div>
        `;
      }).join('');

      const html = `
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Booking ID</span>
            <span class="detail-value">${this.escapeHtml(rec.detainee.bookingId || '')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Date of Arrest</span>
            <span class="detail-value">${rec.detainee.dateOfArrest ? new Date(rec.detainee.dateOfArrest).toLocaleDateString() : ''}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Detainee Name</span>
            <span class="detail-value">${this.escapeHtml(rec.detainee.fullName || '')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Offense / Violation</span>
            <span class="detail-value">${this.escapeHtml(rec.detainee.offense || '')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Officer on Duty</span>
            <span class="detail-value">${this.escapeHtml(rec.officer ? rec.officer.officerName : '')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Rank / Badge</span>
            <span class="detail-value">${this.escapeHtml(rec.officer ? rec.officer.rank : '')} | ${this.escapeHtml(rec.officer ? rec.officer.badgeId : '')}</span>
          </div>
        </div>
        <h4 style="margin-top:18px;color:var(--color-primary);border-bottom:2px solid var(--color-border);padding-bottom:6px;">Mugshots</h4>
        <div class="detail-photos">
          ${photosHtml}
        </div>
      `;

      document.getElementById('viewModalBody').innerHTML = html;
      this.openModal('viewModal');
    },

    editRecord: function(index) {
      const rec = this.records[index];
      if (!rec || !rec.detainee) return;

      document.getElementById('editBookingId').value = index;
      document.getElementById('editDetaineeName').value = rec.detainee.fullName || '';
      document.getElementById('editOffense').value = rec.detainee.offense || '';
      document.getElementById('editArrestDate').value = rec.detainee.dateOfArrest || '';
      this.openModal('editModal');
    },

    saveEdit: function() {
      const index = parseInt(document.getElementById('editBookingId').value, 10);
      if (isNaN(index) || index < 0 || index >= this.records.length) return;

      const name = document.getElementById('editDetaineeName').value.trim();
      const offense = document.getElementById('editOffense').value.trim();
      const arrestDate = document.getElementById('editArrestDate').value;

      if (!name || !offense || !arrestDate) {
        alert('All fields are required.');
        return;
      }

      this.records[index].detainee.fullName = name;
      this.records[index].detainee.offense = offense;
      this.records[index].detainee.dateOfArrest = arrestDate;

      this.persist();
      this.renderTable();
      this.closeModal('editModal');
    },

    deleteRecord: function(index) {
      this.deleteTargetIndex = index;
      this.openModal('deleteModal');
    },

    confirmDelete: function() {
      if (this.deleteTargetIndex === null) return;

      this.records.splice(this.deleteTargetIndex, 1);
      this.persist();
      this.renderTable();
      this.closeModal('deleteModal');
      this.deleteTargetIndex = null;
    },

    persist: function() {
      localStorage.setItem('mpmps_history', JSON.stringify(this.records));
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

    base64ToBlob: function(base64, contentType) {
      contentType = contentType || 'image/jpeg';
      const sliceSize = 1024;
      const byteCharacters = atob(base64);
      const bytesLength = byteCharacters.length;
      const slicesCount = Math.ceil(bytesLength / sliceSize);
      const byteArrays = new Array(slicesCount);

      for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        const begin = sliceIndex * sliceSize;
        const end = Math.min(begin + sliceSize, bytesLength);
        const bytes = new Array(end - begin);
        for (let i = begin; i < end; ++i) {
          bytes[i - begin] = byteCharacters.charCodeAt(i);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
      }

      return new Blob(byteArrays, { type: contentType });
    },

    printRecord: function(index) {
      const rec = this.records[index];
      if (!rec || !rec.detainee) return;

      const photos = rec.session ? rec.session.photos : {};
      const officer = rec.officer || {};
      const detainee = rec.detainee;

      const photoKeys = [
        { key: 'frontHalf', label: 'Front Half-Body' },
        { key: 'leftSide', label: 'Left Side Half-Body' },
        { key: 'rightSide', label: 'Right Side Half-Body' },
        { key: 'fullBody', label: 'Front Full-Body' }
      ];

      const photosHtml = photoKeys.map(p => {
        const src = photos[p.key] || '';
        return `
          <div class="print-photo">
            ${src ? `<img src="${src}" alt="${p.label}">` : '<div class="print-photo-placeholder">No Image</div>'}
            <div class="print-photo-caption">${p.label}</div>
          </div>
        `;
      }).join('');

      const printContent = `
        <div class="print-record">
          <div class="print-header">
            <h1>MUGSHOT RECORD</h1>
            <p>Republic of the Philippines</p>
            <p>MOISES PADILLA MUNICIPAL POLICE STATION</p>
            <p>Moises Padilla, Negros Occidental</p>
          </div>
          <table class="print-table">
            <tr>
              <td class="print-label">Booking ID:</td>
              <td class="print-value">${this.escapeHtml(detainee.bookingId || '')}</td>
              <td class="print-label">Date:</td>
              <td class="print-value">${new Date().toLocaleDateString()}</td>
            </tr>
            <tr>
              <td class="print-label">Detainee Name:</td>
              <td class="print-value">${this.escapeHtml(detainee.fullName || '')}</td>
              <td class="print-label">Date of Arrest:</td>
              <td class="print-value">${detainee.dateOfArrest ? new Date(detainee.dateOfArrest).toLocaleDateString() : ''}</td>
            </tr>
            <tr>
              <td class="print-label">Offense / Violation:</td>
              <td class="print-value" colspan="3">${this.escapeHtml(detainee.offense || '')}</td>
            </tr>
            <tr>
              <td class="print-label">Officer on Duty:</td>
              <td class="print-value">${this.escapeHtml(officer.officerName || '')}</td>
              <td class="print-label">Rank:</td>
              <td class="print-value">${this.escapeHtml(officer.rank || '')}</td>
            </tr>
            <tr>
              <td class="print-label">Badge/PNP ID:</td>
              <td class="print-value" colspan="3">${this.escapeHtml(officer.badgeId || '')}</td>
            </tr>
          </table>
          <h2 class="print-section-title">MUGSHOTS</h2>
          <div class="print-photos-grid">
            ${photosHtml}
          </div>
          <div class="print-signatures">
            <div class="print-sig-block">
              <div class="print-sig-line"></div>
              <p>Detainee Signature</p>
              <p class="print-sig-date">Date: _______________</p>
            </div>
            <div class="print-sig-block">
              <div class="print-sig-line"></div>
              <p>Investigating Officer</p>
              <p class="print-sig-date">Date: _______________</p>
            </div>
            <div class="print-sig-block">
              <div class="print-sig-line"></div>
              <p>Station Commander</p>
              <p class="print-sig-date">Date: _______________</p>
            </div>
          </div>
        </div>
      `;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Please allow popups to print this record.');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mugshot Record - ${this.escapeHtml(detainee.bookingId || '')}</title>
          <style>
            body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 20px; }
            .print-header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
            .print-header h1 { font-size: 18pt; margin: 0 0 5px; text-transform: uppercase; }
            .print-header p { margin: 2px 0; }
            .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .print-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
            .print-label { font-weight: bold; background: #f2f2f2; width: 25%; }
            .print-value { width: 25%; }
            .print-section-title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin: 20px 0; text-transform: uppercase; }
            .print-photos-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 30px; }
            .print-photo { text-align: center; border: 1px solid #000; padding: 8px; width: 45%; min-width: 200px; }
            .print-photo img { width: 100%; max-width: 250px; height: auto; aspect-ratio: 1/1; object-fit: cover; display: block; margin: 0 auto 6px; border: 1px solid #ccc; }
            .print-photo-placeholder { width: 100%; max-width: 250px; aspect-ratio: 1/1; background: #f5f5f5; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; color: #999; }
            .print-photo-caption { font-size: 9pt; font-weight: bold; text-transform: uppercase; }
            .print-signatures { margin-top: 40px; display: flex; justify-content: space-between; }
            .print-sig-block { text-align: center; width: 30%; }
            .print-sig-line { border-bottom: 1px solid #000; height: 50px; margin-bottom: 6px; }
            .print-sig-block p { margin: 2px 0; font-size: 10pt; }
            .print-sig-date { font-size: 9pt; color: #333; }
            @media print {
              body { padding: 0; }
              .print-photo { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    },

    exportRecordToWord: function(index) {
      const rec = this.records[index];
      if (!rec || !rec.detainee) return;

      if (typeof htmlDocx === 'undefined') {
        alert('Word export library not loaded. Please check your internet connection.');
        return;
      }

      const photos = rec.session ? rec.session.photos : {};
      const officer = rec.officer || {};
      const detainee = rec.detainee;

      const setImg = (id, src) => {
        const el = document.getElementById(id);
        if (el) el.src = src;
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Mugshot Record - ${this.escapeHtml(detainee.bookingId || '')}</title>
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
          <div class="word-header">
            <p>Republic of the Philippines</p>
            <p>MOISES PADILLA MUNICIPAL POLICE STATION</p>
            <p>Moises Padilla, Negros Occidental</p>
          </div>
          <div class="word-title">MUGSHOT RECORD</div>
          <table>
            <tr>
              <td class="word-label">Booking ID:</td>
              <td>${this.escapeHtml(detainee.bookingId || '')}</td>
              <td class="word-label">Date:</td>
              <td>${new Date().toLocaleDateString()}</td>
            </tr>
            <tr>
              <td class="word-label">Detainee Name:</td>
              <td>${this.escapeHtml(detainee.fullName || '')}</td>
              <td class="word-label">Date of Arrest:</td>
              <td>${detainee.dateOfArrest ? new Date(detainee.dateOfArrest).toLocaleDateString() : ''}</td>
            </tr>
            <tr>
              <td class="word-label">Offense / Violation:</td>
              <td colspan="3">${this.escapeHtml(detainee.offense || '')}</td>
            </tr>
          </table>
          <table>
            <tr>
              <td class="word-label">Officer on Duty:</td>
              <td>${this.escapeHtml(officer.officerName || '')}</td>
              <td class="word-label">Rank:</td>
              <td>${this.escapeHtml(officer.rank || '')}</td>
              <td class="word-label">Badge/PNP ID:</td>
              <td>${this.escapeHtml(officer.badgeId || '')}</td>
            </tr>
          </table>
          <div class="word-slate">
            <p><strong>Digital Slate Data:</strong></p>
            <p>Station: MOISES PADILLA MPS | Detainee: ${this.escapeHtml(detainee.fullName || '')} | Offense: ${this.escapeHtml(detainee.offense || '')} | Date: ${detainee.dateOfArrest ? new Date(detainee.dateOfArrest).toLocaleDateString() : ''} | Officer: ${this.escapeHtml(officer.officerName || '')} (${this.escapeHtml(officer.rank || '')}) | Badge: ${this.escapeHtml(officer.badgeId || '')}</p>
          </div>
          <table class="word-signatures">
            <tr>
              <td class="sig-block">
                <div class="sig-line"></div>
                <p>Detainee Signature</p>
                <p class="sig-date">Date: _______________</p>
              </td>
              <td class="sig-block">
                <div class="sig-line"></div>
                <p>Investigating Officer</p>
                <p class="sig-date">Date: _______________</p>
              </td>
              <td class="sig-block">
                <div class="sig-line"></div>
                <p>Station Commander</p>
                <p class="sig-date">Date: _______________</p>
              </td>
            </tr>
          </table>
          <div class="page-break"></div>
          <div class="word-title">ORIGINAL CAPTURED IMAGES</div>
          <table class="word-photo-grid-original">
            <tr>
              <td class="word-photo-cell-original">
                <img id="wordOriginalPhotoFront" alt="Front Half-Body">
                <div class="word-photo-caption">FRONT VIEW (Half-Body)</div>
              </td>
              <td class="word-photo-cell-original">
                <img id="wordOriginalPhotoLeft" alt="Left Side Half-Body">
                <div class="word-photo-caption">LEFT SIDE VIEW (Half-Body)</div>
              </td>
              <td class="word-photo-cell-original">
                <img id="wordOriginalPhotoRight" alt="Right Side Half-Body">
                <div class="word-photo-caption">RIGHT SIDE VIEW (Half-Body)</div>
              </td>
            </tr>
            <tr>
              <td class="word-photo-cell-original word-photo-cell-wide" colspan="3">
                <img id="wordOriginalPhotoFull" alt="Front Full-Body">
                <div class="word-photo-caption">FRONT VIEW (Full-Body)</div>
              </td>
            </tr>
          </table>
          <div class="page-break"></div>
          <div class="word-title">CROPPED MUGSHOTS (2×2 inches / 5.08 cm)</div>
          <table class="word-photo-grid-cropped">
            <tr>
              <td class="word-photo-cell-cropped">
                <img id="wordPhotoFront" alt="Front Half-Body">
                <div class="word-photo-caption">FRONT VIEW (Half-Body)</div>
              </td>
              <td class="word-photo-cell-cropped">
                <img id="wordPhotoLeft" alt="Left Side Half-Body">
                <div class="word-photo-caption">LEFT SIDE VIEW (Half-Body)</div>
              </td>
              <td class="word-photo-cell-cropped">
                <img id="wordPhotoRight" alt="Right Side Half-Body">
                <div class="word-photo-caption">RIGHT SIDE VIEW (Half-Body)</div>
              </td>
            </tr>
            <tr>
              <td class="word-photo-cell-cropped word-photo-cell-wide" colspan="3">
                <img id="wordPhotoFull" alt="Front Full-Body">
                <div class="word-photo-caption">FRONT VIEW (Full-Body)</div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      setImg('wordPhotoFront', photos.frontHalf);
      setImg('wordPhotoLeft', photos.leftSide);
      setImg('wordPhotoRight', photos.rightSide);
      setImg('wordPhotoFull', photos.fullBody);

      const originalPhotos = rec.session ? rec.session.originalPhotos : {};
      setImg('wordOriginalPhotoFront', originalPhotos.frontHalf);
      setImg('wordOriginalPhotoLeft', originalPhotos.leftSide);
      setImg('wordOriginalPhotoRight', originalPhotos.rightSide);
      setImg('wordOriginalPhotoFull', originalPhotos.fullBody);

      try {
        const converted = htmlDocx.asBlob(htmlContent);
        const url = URL.createObjectURL(converted);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MPMPS_Mugshot_${detainee.bookingId || 'record'}.docx`;
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
      const detainee = rec.detainee || {};
      const officer = rec.officer || {};
      return `MUGSHOT RECORD\nBooking ID: ${detainee.bookingId || 'N/A'}\nDetainee: ${detainee.fullName || 'Unknown'}\nOffense: ${detainee.offense || 'N/A'}\nDate of Arrest: ${detainee.dateOfArrest || 'N/A'}\nOfficer: ${officer.officerName || 'Unknown'} (${officer.rank || 'N/A'})\nBadge: ${officer.badgeId || 'N/A'}`;
    },

    getRecordFiles: function(rec) {
      const photos = rec.session ? rec.session.photos : {};
      const photoKeys = ['frontHalf', 'leftSide', 'rightSide', 'fullBody'];
      const labels = {
        frontHalf: 'Front_HalfBody',
        leftSide: 'Left_Side',
        rightSide: 'Right_Side',
        fullBody: 'FullBody'
      };

      const files = [];
      for (const key of photoKeys) {
        const src = photos[key];
        if (src) {
          try {
            const blob = this.base64ToBlob(src.replace(/^data:image\/\w+;base64,/, ''), 'image/jpeg');
            blob.name = `MPMPS_${rec.detainee.bookingId || 'record'}_${labels[key]}.jpg`;
            blob.lastModified = Date.now();
            files.push(blob);
          } catch (e) {
            console.error('Failed to convert image:', key, e);
          }
        }
      }
      return files;
    },

    shareViaOs: async function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec || !rec.detainee) return;

      const files = this.getRecordFiles(rec);
      if (files.length === 0) {
        alert('No images available to share for this record.');
        return;
      }

      const shareData = {
        title: `Mugshot Record - ${rec.detainee.bookingId || 'Record'}`,
        text: this.getShareText(rec),
        files: files
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          this.closeModal('shareModal');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('OS share failed:', err);
        }
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareData.title,
            text: shareData.text
          });
          this.closeModal('shareModal');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('OS share fallback failed:', err);
        }
      }

      alert('OS Share is not supported on this browser. Please use Download Images or Copy Text instead.');
    },

    shareViaEmail: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec || !rec.detainee) return;

      const detainee = rec.detainee;
      const officer = rec.officer || {};
      const subject = encodeURIComponent(`Mugshot Record - ${detainee.bookingId || 'Record'}`);
      const body = encodeURIComponent(this.getShareText(rec));
      const mailto = `mailto:?subject=${subject}&body=${body}`;

      window.open(mailto, '_blank');
      this.closeModal('shareModal');
    },

    shareViaMessenger: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec || !rec.detainee) return;

      const text = encodeURIComponent(this.getShareText(rec));
      const url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(window.location.href)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(window.location.href)}`;
      
      window.open(`https://www.messenger.com/t/?link=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
      this.closeModal('shareModal');
    },

    shareDownloadImages: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec || !rec.detainee) return;

      const files = this.getRecordFiles(rec);
      if (files.length === 0) {
        alert('No images available to share for this record.');
        return;
      }

      for (const file of files) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      this.closeModal('shareModal');
    },

    shareCopyText: function() {
      const rec = this.records[this.currentViewIndex];
      if (!rec || !rec.detainee) return;

      const text = this.getShareText(rec);
      navigator.clipboard.writeText(text).then(() => {
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
