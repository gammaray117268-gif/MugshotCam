(function() {
  'use strict';

  const ReportApp = {
    records: [],
    deleteTargetIndex: null,

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
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ReportApp.init());
  } else {
    ReportApp.init();
  }

  window.ReportApp = ReportApp;
})();
