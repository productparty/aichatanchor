/**
 * AI Chat Anchor - ChatGPT Content Script
 * Site-specific selectors and logic for chat.openai.com and chatgpt.com
 */

(function () {
  'use strict';

  // Wait for shared module to load
  if (!window.PinNavigator) {
    console.error('[AI Chat Anchor] Shared module not loaded');
    return;
  }

  // ============================================
  // CHATGPT SELECTORS
  // ============================================

  // These selectors target ChatGPT's assistant response elements
  // ChatGPT uses obfuscated class names that change frequently
  const SELECTORS = {
    // Primary: Look for assistant message containers
    responseContainer: [
      '[data-message-author-role="assistant"]',
      '[class*="agent-turn"]',
      '[class*="assistant"]',
      // Message containers with specific attributes
      '[data-testid*="conversation-turn"]:has([data-message-author-role="assistant"])',
      // Fallback patterns
      '.markdown.prose',
      '[class*="message"]:has(.markdown)'
    ].join(', '),

    // Container that holds all messages
    conversationContainer: [
      '[class*="react-scroll-to-bottom"]',
      '[class*="conversation"]',
      '[role="presentation"]',
      'main'
    ].join(', '),

    // Where to insert the pin button within a response
    buttonInsertionPoint: [
      '[class*="message-actions"]',
      '[class*="flex"][class*="justify-end"]',
      '.flex.items-center.gap-1'
    ].join(', ')
  };

  // ============================================
  // SITE CONFIGURATION
  // ============================================

  const chatgptConfig = {
    product: 'chatgpt',

    /**
     * Extract chat ID from ChatGPT URL
     * Formats: 
     *   - https://chat.openai.com/c/{id}
     *   - https://chatgpt.com/c/{id}
     *   - https://chat.openai.com/chat/{id}
     */
    extractChatId(url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        // Look for conversation ID patterns
        // /c/{id} or /chat/{id}
        for (let i = 0; i < pathParts.length; i++) {
          if (pathParts[i] === 'c' || pathParts[i] === 'chat') {
            if (pathParts[i + 1]) {
              return pathParts[i + 1];
            }
          }
        }

        // Check for share links: /share/{id}
        const shareIndex = pathParts.indexOf('share');
        if (shareIndex !== -1 && pathParts[shareIndex + 1]) {
          return 'share_' + pathParts[shareIndex + 1];
        }

        // Fallback: use full path
        return urlObj.pathname.replace(/\//g, '_') || 'unknown';
      } catch (e) {
        console.error('[AI Chat Anchor] Error extracting chat ID:', e);
        return 'unknown';
      }
    },

    /**
     * Get the chat title from the page
     */
    getChatTitle() {
      // Try specific title element in sidebar or header
      const titleEl = document.querySelector('nav a[class*="bg-token-sidebar-surface-tertiary"] .overflow-hidden');
      if (titleEl && titleEl.textContent) {
        return titleEl.textContent.trim();
      }

      // Fallback to document title
      let title = document.title;
      title = title.replace(/ - ChatGPT$/, '').trim();

      if (title === 'ChatGPT') return 'Untitled Chat';
      return title;
    },

    /**
     * Get all assistant response elements on the page
     */
    getResponseElements() {
      const elements = [];

      // DEBUG: Log what we're looking for
      console.log('[AI Chat Anchor] Looking for ChatGPT responses...');

      // Primary selector: data-message-author-role
      const primaryElements = document.querySelectorAll('[data-message-author-role="assistant"]');
      console.log('[AI Chat Anchor] Found primary elements:', primaryElements.length);

      if (primaryElements.length > 0) {
        // Find the parent message container for each
        primaryElements.forEach((el, idx) => {
          const container = el.closest('[class*="group"]') ||
            el.closest('[data-testid*="conversation-turn"]') ||
            el;
          console.log(`[AI Chat Anchor] Element ${idx}: closest group =`, el.closest('[class*="group"]'), 'closest testid =', el.closest('[data-testid*="conversation-turn"]'));
          if (!elements.includes(container)) {
            elements.push(container);
          }
        });
        console.log('[AI Chat Anchor] Returning containers:', elements);
        return elements;
      }

      // Try other selector patterns
      const selectorParts = SELECTORS.responseContainer.split(', ');

      for (const selector of selectorParts) {
        try {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            found.forEach(el => {
              if (!this.isUserMessage(el) && !elements.includes(el)) {
                elements.push(el);
              }
            });
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }

      // Fallback to structural approach
      if (elements.length === 0) {
        console.log('[AI Chat Anchor] No elements found, trying structural approach...');
        elements.push(...this.getResponsesByStructure());
      }

      console.log('[AI Chat Anchor] Total response elements found:', elements.length);
      if (elements.length > 0) {
        console.log('[AI Chat Anchor] First element:', elements[0]);
      }

      return elements;
    },

    /**
     * Check if an element is a user message (not assistant)
     */
    isUserMessage(element) {
      // Check data attribute first
      if (element.getAttribute('data-message-author-role') === 'user') {
        return true;
      }

      // Check for user indicators in class/attributes
      const text = element.className + ' ' +
        (element.getAttribute('data-testid') || '') +
        (element.getAttribute('data-message-author-role') || '');

      return text.toLowerCase().includes('user');
    },

    /**
     * Fallback: Find responses by DOM structure
     */
    getResponsesByStructure() {
      const responses = [];

      const container = document.querySelector(SELECTORS.conversationContainer);
      if (!container) return responses;

      // Find all conversation turns
      const turns = container.querySelectorAll('[class*="group"], [class*="turn"]');

      turns.forEach((turn, index) => {
        // Check if this turn contains assistant content
        const hasAssistantRole = turn.querySelector('[data-message-author-role="assistant"]');
        const hasMarkdown = turn.querySelector('.markdown, .prose');

        if (hasAssistantRole || (index % 2 === 1 && hasMarkdown)) {
          if (!this.isUserMessage(turn)) {
            responses.push(turn);
          }
        }
      });

      return responses;
    },

    /**
     * Find where to insert the pin button within a response element
     */
    getInsertionPoint(responseElement) {
      // Look for existing action buttons area
      const actionsArea = responseElement.querySelector(SELECTORS.buttonInsertionPoint);
      if (actionsArea) return actionsArea;

      // Look for the message content area to position relative to
      const contentArea = responseElement.querySelector('.markdown') ||
        responseElement.querySelector('[class*="message-content"]');

      if (contentArea) {
        let wrapper = contentArea.parentElement.querySelector('.llm-pin-button-wrapper');
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'llm-pin-button-wrapper';
          contentArea.parentElement.style.position = 'relative';
          contentArea.parentElement.appendChild(wrapper);
        }
        return wrapper;
      }

      // Default: create wrapper on response element
      let wrapper = responseElement.querySelector('.llm-pin-button-wrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'llm-pin-button-wrapper';
        responseElement.style.position = 'relative';
        responseElement.appendChild(wrapper);
      }

      return wrapper;
    }
  };

  // ============================================
  // INITIALIZATION
  // ============================================

  function isChatGPTChatPage() {
    const hostname = window.location.hostname;
    const isChatGPTDomain = hostname === 'chat.openai.com' || hostname === 'chatgpt.com';
    const hasConversation = window.location.pathname.includes('/c/') ||
      window.location.pathname.includes('/chat/');

    return isChatGPTDomain && (hasConversation || window.location.pathname === '/');
  }

  function initialize() {
    if (isChatGPTChatPage()) {
      // Delay slightly to let ChatGPT's JS render content
      setTimeout(() => {
        window.PinNavigator.init(chatgptConfig);
      }, 500);
    }

    // Watch for SPA navigation
    let lastUrl = window.location.href;

    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        if (isChatGPTChatPage()) {
          setTimeout(() => {
            window.PinNavigator.init(chatgptConfig);
          }, 500);
        }
      }
    });

    urlObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
