(function() {
  'use strict';

  const API_BASE = './api';

  function init() {
    // Check if already logged in via session
    checkSession();
  }

  async function checkSession() {
    try {
      const res = await fetch(API_BASE + '/officer.php', { method: 'GET', credentials: 'same-origin' });
      const data = await res.json();
      if (data.success && data.officer) {
        sessionStorage.setItem('mpmps_current_officer', JSON.stringify(data.officer));
        window.location.href = 'index.html';
        return;
      }
    } catch (e) {
      console.error('Session check failed:', e);
    }
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('btnLogin').addEventListener('click', handleLogin);
    document.getElementById('btnRegister').addEventListener('click', handleRegister);
  }

  async function handleLogin() {
    const name = document.getElementById('officerName').value.trim();
    const rank = document.getElementById('officerRank').value;
    const badge = document.getElementById('officerBadge').value.trim();

    if (!name || !rank || !badge) {
      showMessage('All fields are required.', 'error');
      return;
    }

    try {
      const res = await fetch(API_BASE + '/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerName: name, rank, badgeId: badge }),
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('mpmps_current_officer', JSON.stringify(data.officer));
        showMessage('Login successful. Proceed to registration.', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (e) {
      showMessage('Login failed. Please try again.', 'error');
    }
  }

  async function handleRegister() {
    const name = document.getElementById('officerName').value.trim();
    const rank = document.getElementById('officerRank').value;
    const badge = document.getElementById('officerBadge').value.trim();

    if (!name || !rank || !badge) {
      showMessage('All fields are required.', 'error');
      return;
    }

    try {
      const res = await fetch(API_BASE + '/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerName: name, rank, badgeId: badge }),
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('mpmps_current_officer', JSON.stringify(data.officer));
        showMessage('Registration successful. Proceed to registration.', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (e) {
      showMessage('Registration failed. Please try again.', 'error');
    }
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
