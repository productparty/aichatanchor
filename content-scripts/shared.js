/**
 * AI Chat Anchor - Shared Content Script Module
 * Common functionality for pin creation, storage, and UI across all LLM sites
 */

const PinNavigator = (function () {
  'use strict';

  // ============================================
  // UTILITIES
  // ============================================

  function generateId() {
    return 'pin_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ============================================
  // STORAGE LAYER
  // ============================================

  // ============================================
  // STORAGE LAYER
  // ============================================

  // Use the shared PinStorage module if available, otherwise fallback (should not happen if manifest is correct)
  const Storage = window.PinStorage || {
    async getAll() { return { claude: {}, chatgpt: {}, gemini: {} }; },
    async getPinsForChat() { return []; },
    async savePin() { },
    async deletePin() { },
    async getNextPinNumber() { return 1; },
    async isPinned() { return null; }
  };

  // ============================================
  // PIN BUTTON UI
  // ============================================

  function createPinButton(responseElement, responseIndex, siteConfig) {
    console.log(`[AI Chat Anchor] createPinButton called for index ${responseIndex}`, responseElement);
    const existingButton = responseElement.querySelector('.llm-pin-button');
    if (existingButton) {
      console.log('[AI Chat Anchor] Button already exists, skipping');
      return;
    }

    const button = document.createElement('button');
    button.className = 'llm-pin-button';
    button.setAttribute('data-response-index', responseIndex);
    button.innerHTML = `
      <svg class="llm-pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L12 12M12 12L8 8M12 12L16 8M12 12V22M8 18H16" transform="rotate(45 12 12)"/>
        <circle cx="12" cy="5" r="3"/>
        <line x1="12" y1="8" x2="12" y2="20"/>
      </svg>
      <span class="llm-pin-number"></span>
    `;
    button.title = 'Pin this response';

    // Check if already pinned
    updatePinButtonState(button, siteConfig);

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlePinClick(button, responseElement, responseIndex, siteConfig);
    });

    // Find insertion point based on site config
    const insertionPoint = siteConfig.getInsertionPoint(responseElement);
    console.log('[AI Chat Anchor] Insertion point:', insertionPoint);
    if (insertionPoint) {
      insertionPoint.appendChild(button);
      console.log('[AI Chat Anchor] Button appended to insertion point');
    } else {
      // Fallback: create wrapper and prepend
      console.log('[AI Chat Anchor] No insertion point, using fallback');
      const wrapper = document.createElement('div');
      wrapper.className = 'llm-pin-button-wrapper';
      wrapper.appendChild(button);
      responseElement.style.position = 'relative';
      responseElement.insertBefore(wrapper, responseElement.firstChild);
    }
  }

  async function updatePinButtonState(button, siteConfig) {
    const responseIndex = parseInt(button.getAttribute('data-response-index'), 10);
    const chatId = siteConfig.extractChatId(window.location.href);
    const existingPin = await Storage.isPinned(siteConfig.product, chatId, responseIndex);

    if (existingPin) {
      button.classList.add('llm-pin-button--pinned');
      button.querySelector('.llm-pin-number').textContent = `#${existingPin.pinNumber}`;
      button.title = existingPin.label || `Pin #${existingPin.pinNumber}`;
    } else {
      button.classList.remove('llm-pin-button--pinned');
      button.querySelector('.llm-pin-number').textContent = '';
      button.title = 'Pin this response';
    }
  }

  // ============================================
  // LABEL INPUT UI
  // ============================================

  function createLabelInput(button, onSave, onCancel) {
    // Remove any existing input
    const existingInput = document.querySelector('.llm-pin-label-input');
    if (existingInput) existingInput.remove();

    const container = document.createElement('div');
    container.className = 'llm-pin-label-input';
    container.innerHTML = `
      <input type="text" 
             class="llm-pin-label-field" 
             placeholder="Add label (optional)" 
             maxlength="50"
             autocomplete="off">
      <div class="llm-pin-label-actions">
        <button class="llm-pin-save" title="Save pin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        <button class="llm-pin-cancel" title="Cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;

    const input = container.querySelector('.llm-pin-label-field');
    const saveBtn = container.querySelector('.llm-pin-save');
    const cancelBtn = container.querySelector('.llm-pin-cancel');

    const handleSave = () => {
      const label = input.value.trim() || null;
      container.remove();
      onSave(label);
    };

    const handleCancel = () => {
      container.remove();
      onCancel();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    });

    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    });

    // Position near button
    button.parentElement.appendChild(container);

    // Focus input
    requestAnimationFrame(() => input.focus());

    return container;
  }

  // ============================================
  // PIN CREATION FLOW
  // ============================================

  async function handlePinClick(button, responseElement, responseIndex, siteConfig) {
    const chatId = siteConfig.extractChatId(window.location.href);
    const existingPin = await Storage.isPinned(siteConfig.product, chatId, responseIndex);

    if (existingPin) {
      // Already pinned - show info or allow unpin
      showPinInfo(button, existingPin);
      return;
    }

    // Show label input
    button.classList.add('llm-pin-button--active');

    createLabelInput(
      button,
      async (label) => {
        await createPin(responseElement, responseIndex, label, siteConfig);
        button.classList.remove('llm-pin-button--active');
        await updatePinButtonState(button, siteConfig);
        showPinConfirmation(button);
      },
      () => {
        button.classList.remove('llm-pin-button--active');
      }
    );
  }

  async function createPin(responseElement, responseIndex, label, siteConfig) {
    const chatId = siteConfig.extractChatId(window.location.href);
    const chatUrl = window.location.href;
    const pinId = generateId();
    const pinNumber = await Storage.getNextPinNumber(siteConfig.product, chatId);

    const chatTitle = siteConfig.getChatTitle ? siteConfig.getChatTitle() : document.title;

    // Inject anchor attribute for reliable scroll-back
    const anchorId = `llm-pin-anchor-${pinId}`;
    responseElement.setAttribute('data-pin-id', anchorId);

    const pin = {
      id: pinId,
      chatId: chatId,
      chatUrl: chatUrl,
      chatTitle: chatTitle,
      product: siteConfig.product,
      pinNumber: pinNumber,
      label: label,
      tags: [], // New field for tags
      description: null, // New field for description
      anchorSelector: `[data-pin-id="${anchorId}"]`,
      responseIndex: responseIndex,
      createdAt: Date.now()
    };

    await Storage.savePin(pin);

    // Notify background script
    chrome.runtime.sendMessage({ type: 'PIN_CREATED', pin });

    return pin;
  }

  function showPinConfirmation(button) {
    button.classList.add('llm-pin-button--confirmed');
    setTimeout(() => {
      button.classList.remove('llm-pin-button--confirmed');
    }, 1500);
  }

  function showPinInfo(button, pin) {
    // Simple tooltip-style info display
    const info = document.createElement('div');
    info.className = 'llm-pin-info';
    info.innerHTML = `
      <div class="llm-pin-info-content">
        <span class="llm-pin-info-number">#${pin.pinNumber}</span>
        <span class="llm-pin-info-label">${pin.label || 'Unlabeled'}</span>
      </div>
    `;

    button.parentElement.appendChild(info);

    setTimeout(() => info.remove(), 2000);
  }

  // ============================================
  // MUTATION OBSERVER FOR DYNAMIC CONTENT
  // ============================================

  function observeResponses(siteConfig) {
    const processResponses = debounce(() => {
      const responses = siteConfig.getResponseElements();
      responses.forEach((el, index) => {
        createPinButton(el, index, siteConfig);
      });
    }, 100);

    // Initial processing
    processResponses();

    // Watch for new content
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }

      if (shouldProcess) {
        processResponses();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  // ============================================
  // MESSAGE HANDLING (for scroll-to-pin)
  // ============================================

  function initMessageListener(siteConfig) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SCROLL_TO_PIN') {
        scrollToPin(message.pin, siteConfig);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  async function scrollToPin(pin, siteConfig) {
    // Try anchor selector first
    let element = document.querySelector(pin.anchorSelector);

    // Fallback to response index
    if (!element) {
      const responses = siteConfig.getResponseElements();
      element = responses[pin.responseIndex];
    }

    if (element) {
      // Highlight briefly
      element.classList.add('llm-pin-highlight');

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      setTimeout(() => {
        element.classList.remove('llm-pin-highlight');
      }, 2000);
    } else {
      console.warn('[AI Chat Anchor] Could not find pinned element');
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init(siteConfig) {
    if (!siteConfig || !siteConfig.product) {
      console.error('[AI Chat Anchor] Invalid site configuration');
      return;
    }

    console.log(`[AI Chat Anchor] Initializing for ${siteConfig.product}`);

    // Start observing for responses
    observeResponses(siteConfig);

    // Listen for scroll-to-pin messages
    initMessageListener(siteConfig);

    // Re-check pin states when storage changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.pins) {
        const buttons = document.querySelectorAll('.llm-pin-button');
        buttons.forEach(btn => updatePinButtonState(btn, siteConfig));
      }
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    init,
    Storage,
    createPinButton,
    updatePinButtonState,
    scrollToPin
  };

})();

// Make available globally for site-specific scripts
window.PinNavigator = PinNavigator;
