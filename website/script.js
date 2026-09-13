/**
 * QOTA — Client Interaction Script
 * Minimalist, ultra-fast, zero-dependency.
 * Handles theme toggling, clipboard copy, and native clock formatting.
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeManager();
  initClipboard();
  initMacClock();
});

/* --------------------------------------------------------------------------
   Theme Manager (Light & Dark with persistence)
   -------------------------------------------------------------------------- */
function initThemeManager() {
  const toggleBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;

  // Retrieve stored theme or default to light (matching Keeby's signature palette)
  const savedTheme = localStorage.getItem('qota-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  setTheme(initialTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = root.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('qota-theme', theme);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }
}

/* --------------------------------------------------------------------------
   Clipboard Copy Handler
   -------------------------------------------------------------------------- */
function initClipboard() {
  const copyBtn = document.getElementById('hero-copy-btn');
  const cmdText = 'git clone https://github.com/jlsonon/qota.git && cd qota && npm install && npm start';

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(cmdText);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'COPIED!';
        copyBtn.style.backgroundColor = 'var(--color-green)';
        copyBtn.style.color = '#ffffff';

        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.backgroundColor = '';
          copyBtn.style.color = '';
        }, 2000);
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = cmdText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        copyBtn.textContent = 'COPIED!';
        setTimeout(() => {
          copyBtn.textContent = 'COPY';
        }, 2000);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   macOS Desktop Menu Bar Clock Ticker
   -------------------------------------------------------------------------- */
function initMacClock() {
  const clockEl = document.getElementById('mac-clock-time');
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[now.getDay()];
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    clockEl.textContent = `${day} ${hours}:${minutes} ${ampm}`;
  }

  updateClock();
  setInterval(updateClock, 10000);
}
