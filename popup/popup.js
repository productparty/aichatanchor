/**
 * AI Chat Anchor - Popup Script
 * Manages the extension popup UI and pin navigation
 */

(function () {
  'use strict';

  const PRODUCT_LABELS = {
    claude: 'Claude',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini'
  };

  const PRODUCT_ICONS = {
    claude: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
    chatgpt: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.2 8.8c.5-1.4.2-3-.8-4.2-1.5-1.8-4.2-2.3-6.3-1.1-.7-1.1-1.9-1.8-3.1-1.9-2.4-.2-4.6 1.5-5 3.9-1.3.2-2.5.9-3.2 2C2.2 9.7 2.5 12.5 4.2 14c-.5 1.4-.2 3 .8 4.2 1.5 1.8 4.2 2.3 6.3 1.1.7 1.1 1.9 1.8 3.1 1.9 2.4.2 4.6-1.5 5-3.9 1.3-.2 2.5-.9 3.2-2 1.6-2.2 1.3-5-0.4-6.5z"/></svg>`,
    gemini: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
  };

  // State
  let allPins = [];
  let searchQuery = '';

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadData() {
    // Use shared storage module
    const rawData = await window.PinStorage.getAll();
    allPins = flattenPins(rawData);
    renderPins();
  }

  function flattenPins(rawData) {
    const flat = [];
    ['claude', 'chatgpt', 'gemini'].forEach(product => {
      const chatMap = rawData[product] || {};
      Object.keys(chatMap).forEach(chatId => {
        chatMap[chatId].forEach(pin => {
          flat.push({ ...pin, product, chatId });
        });
      });
    });
    // Sort Newest -> Oldest
    return flat.sort((a, b) => b.createdAt - a.createdAt);
  }

  function groupPinsByProduct(pins) {
    const grouped = { claude: [], chatgpt: [], gemini: [] };
    pins.forEach(pin => {
      if (grouped[pin.product]) grouped[pin.product].push(pin);
    });
    return grouped;
  }

  // ============================================
  // UI RENDERING
  // ============================================

  function renderPins() {
    const listEl = document.getElementById('pins-list');
    const emptyEl = document.getElementById('empty-state');
    const footerActions = document.getElementById('footer-actions');

    // Filter by search query
    let displayPins = allPins;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      displayPins = allPins.filter(pin => {
        const text = [
          pin.label,
          pin.chatTitle,
          (pin.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return text.includes(q);
      });
    }

    // Limit to recent 20 if no search
    if (!searchQuery) {
      displayPins = displayPins.slice(0, 20);
    }

    if (displayPins.length === 0) {
      listEl.innerHTML = '';
      if (allPins.length === 0) {
        // No pins at all
        emptyEl.querySelector('.empty-title').textContent = 'No pins yet';
        emptyEl.querySelector('.empty-description').textContent = 'Pin important responses in Claude, ChatGPT, or Gemini.';
      } else {
        // No matches found
        emptyEl.querySelector('.empty-title').textContent = 'No matches found';
        emptyEl.querySelector('.empty-description').textContent = 'Try a different search term.';
      }
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    // We can keep footer actions hidden or modify them. 
    // For now, let's just keep them but maybe simplify?
    // Actually, "Export/Import/Clear" is better in Dashboard. 
    // Let's hide footer actions in Popup v2 to keep it clean, 
    // or just leave them for power users who don't want to open dashboard.
    // I will leave them as is for now.

    const grouped = groupPinsByProduct(displayPins);
    let html = '';

    for (const product of ['claude', 'chatgpt', 'gemini']) {
      const productPins = grouped[product];
      if (productPins.length === 0) continue;

      html += `
        <div class="pin-group">
          <div class="pin-group-header">
            <span class="pin-group-icon">${PRODUCT_ICONS[product]}</span>
            <span>${PRODUCT_LABELS[product]}</span>
          </div>
          ${productPins.map(pin => renderPinItem(pin)).join('')}
        </div>
      `;
    }

    listEl.innerHTML = html;

    // Attach listeners
    listEl.querySelectorAll('.pin-item').forEach(el => {
      el.onclick = (e) => {
        if (!e.target.closest('.pin-delete')) {
          handlePinClick(el.dataset.pinId);
        }
      };
    });

    listEl.querySelectorAll('.pin-delete').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        handlePinDelete(el.dataset.pinId, el.dataset.product, el.dataset.chatId);
      };
    });
  }

  function renderPinItem(pin) {
    const label = pin.label || pin.chatTitle || `Response #${pin.responseIndex + 1}`;
    const timeAgo = formatTimeAgo(pin.createdAt);

    // Show chat title as secondary text if label exists
    let metaText = timeAgo;
    if (pin.label && pin.chatTitle) {
      metaText = `${pin.chatTitle} • ${timeAgo}`;
    }

    return `
      <div class="pin-item" data-pin-id="${pin.id}" data-product="${pin.product}" data-chat-id="${pin.chatId}">
        <span class="pin-number">#${pin.pinNumber}</span>
        <div class="pin-info">
          <div class="pin-label">${escapeHtml(label)}</div>
          <div class="pin-meta">${escapeHtml(metaText)}</div>
        </div>
        <button class="pin-delete"
                data-pin-id="${pin.id}"
                data-product="${pin.product}"
                data-chat-id="${pin.chatId}"
                title="Delete pin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  async function handlePinClick(pinId) {
    const pin = allPins.find(p => p.id === pinId);
    if (pin) {
      chrome.runtime.sendMessage({
        type: 'NAVIGATE_TO_PIN',
        pin: pin
      });
      window.close();
    }
  }

  async function handlePinDelete(pinId, product, chatId) {
    await window.PinStorage.deletePin(product, chatId, pinId);
    await loadData();
  }

  // ============================================
  // UTILITIES
  // ============================================

  function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    loadData();

    // Search input
    document.getElementById('quick-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderPins();
    });

    // Dashboard button
    document.getElementById('open-dashboard').addEventListener('click', () => {
      chrome.tabs.create({ url: 'pages/dashboard.html' });
    });

    // Existing Footer buttons (Keep them working via PinStorage/logic)
    document.getElementById('clear-all').addEventListener('click', async () => {
      if (confirm('Delete all pins? This cannot be undone.')) {
        await chrome.storage.local.set({ pins: {} });
        loadData();
      }
    });

    // Storage listener
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.pins) {
        loadData();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
