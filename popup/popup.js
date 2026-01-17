/**
 * AI Chat Anchor - Popup Script
 * Manages the extension popup UI and pin navigation
 */

(function() {
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

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadAllPins() {
    const result = await chrome.storage.local.get('pins');
    return result.pins || { claude: {}, chatgpt: {}, gemini: {} };
  }

  function flattenPins(allPins) {
    const flattened = [];

    for (const product of ['claude', 'chatgpt', 'gemini']) {
      const productPins = allPins[product] || {};

      for (const chatId in productPins) {
        const chatPins = productPins[chatId] || [];
        chatPins.forEach(pin => {
          flattened.push({
            ...pin,
            product,
            chatId
          });
        });
      }
    }

    // Sort by creation time, newest first
    flattened.sort((a, b) => b.createdAt - a.createdAt);

    return flattened;
  }

  function groupPinsByProduct(pins) {
    const grouped = {
      claude: [],
      chatgpt: [],
      gemini: []
    };

    pins.forEach(pin => {
      if (grouped[pin.product]) {
        grouped[pin.product].push(pin);
      }
    });

    return grouped;
  }

  // ============================================
  // UI RENDERING
  // ============================================

  function renderPins(pins) {
    const listEl = document.getElementById('pins-list');
    const emptyEl = document.getElementById('empty-state');
    const clearBtn = document.getElementById('clear-all');

    if (pins.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      clearBtn.classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    clearBtn.classList.remove('hidden');

    const grouped = groupPinsByProduct(pins);
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

    // Attach event listeners
    listEl.querySelectorAll('.pin-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (!e.target.closest('.pin-delete')) {
          handlePinClick(el.dataset.pinId);
        }
      });
    });

    listEl.querySelectorAll('.pin-delete').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePinDelete(el.dataset.pinId, el.dataset.product, el.dataset.chatId);
      });
    });
  }

  function renderPinItem(pin) {
    const label = pin.label || `Response #${pin.responseIndex + 1}`;
    const timeAgo = formatTimeAgo(pin.createdAt);

    return `
      <div class="pin-item" data-pin-id="${pin.id}">
        <span class="pin-number">#${pin.pinNumber}</span>
        <div class="pin-info">
          <div class="pin-label">${escapeHtml(label)}</div>
          <div class="pin-meta">${timeAgo}</div>
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
    const allPins = await loadAllPins();
    const pins = flattenPins(allPins);
    const pin = pins.find(p => p.id === pinId);

    if (pin) {
      // Navigate to the pin
      chrome.runtime.sendMessage({
        type: 'NAVIGATE_TO_PIN',
        pin: pin
      });

      // Close popup
      window.close();
    }
  }

  async function handlePinDelete(pinId, product, chatId) {
    const allPins = await loadAllPins();

    if (allPins[product]?.[chatId]) {
      allPins[product][chatId] = allPins[product][chatId].filter(p => p.id !== pinId);

      // Clean up empty entries
      if (allPins[product][chatId].length === 0) {
        delete allPins[product][chatId];
      }

      await chrome.storage.local.set({ pins: allPins });

      // Re-render
      const pins = flattenPins(allPins);
      renderPins(pins);
    }
  }

  async function handleClearAll() {
    if (confirm('Delete all pins? This cannot be undone.')) {
      await chrome.storage.local.set({
        pins: { claude: {}, chatgpt: {}, gemini: {} }
      });
      renderPins([]);
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async function init() {
    const allPins = await loadAllPins();
    const pins = flattenPins(allPins);
    renderPins(pins);

    // Set up clear button
    document.getElementById('clear-all').addEventListener('click', handleClearAll);

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.pins) {
        const pins = flattenPins(changes.pins.newValue || { claude: {}, chatgpt: {}, gemini: {} });
        renderPins(pins);
      }
    });
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);

})();
