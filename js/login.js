(function() {
  'use strict';

  function init() {
    if (localStorage.getItem('mpmps_current_officer')) {
      window.location.href = 'index.html';
      return;
    }

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('btnLogin').addEventListener('click', handleLogin);
    document.getElementById('btnRegister').addEventListener('click', handleRegister);
  }

  function handleLogin() {
    const name = document.getElementById('officerName').value.trim();
    const rank = document.getElementById('officerRank').value;
    const badge = document.getElementById('officerBadge').value.trim();

    if (!name || !rank || !badge) {
      showMessage('All fields are required.', 'error');
      return;
    }

    const officers = JSON.parse(localStorage.getItem('mpmps_officers') || '[]');
    const found = officers.find(o => o.badgeId === badge && o.officerName === name && o.rank === rank);

    if (!found) {
      showMessage('Officer not found. Please register first.', 'error');
      return;
    }

    localStorage.setItem('mpmps_current_officer', JSON.stringify(found));
    window.location.href = 'index.html';
  }

  function handleRegister() {
    const name = document.getElementById('officerName').value.trim();
    const rank = document.getElementById('officerRank').value;
    const badge = document.getElementById('officerBadge').value.trim();

    if (!name || !rank || !badge) {
      showMessage('All fields are required.', 'error');
      return;
    }

    const officers = JSON.parse(localStorage.getItem('mpmps_officers') || '[]');

    if (officers.find(o => o.badgeId === badge)) {
      showMessage('Badge ID already registered.', 'error');
      return;
    }

    const newOfficer = { officerName: name, rank, badgeId: badge };
    officers.push(newOfficer);
    localStorage.setItem('mpmps_officers', JSON.stringify(officers));
    localStorage.setItem('mpmps_current_officer', JSON.stringify(newOfficer));

    window.location.href = 'index.html';
  }

  function showMessage(text, type) {
    const el = document.getElementById('loginMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'message ' + type;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
