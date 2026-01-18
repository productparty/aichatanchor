/**
 * AI Chat Anchor - Gemini Content Script
 * Site-specific selectors and logic for gemini.google.com
 */

(function () {
  'use strict';

  // Wait for shared module to load
  if (!window.PinNavigator) {
    console.error('[AI Chat Anchor] Shared module not loaded');
    return;
  }

  // ============================================
  // GEMINI SELECTORS
  // ============================================

  // These selectors target Gemini's assistant response elements
  // Gemini was redesigned in late 2025, selectors may need updates
  const SELECTORS = {
    // Primary: Look for model/assistant response containers
    responseContainer: [
      '[data-model-response]',
      '[class*="model-response"]',
      '[class*="ModelResponse"]',
      'model-response',
      // Response containers with role indicators
      '[role="article"]:has([class*="response"])',
      // Message bubbles
      '[class*="response-container"]',
      '[class*="message"][class*="model"]',
      // Gemini-specific patterns
      'message-content[class*="model"]',
      '.response-content'
    ].join(', '),

    // Container that holds all messages
    conversationContainer: [
      '[class*="conversation-container"]',
      '[class*="chat-container"]',
      '[role="main"]',
      'main',
      '.chat-window'
    ].join(', '),

    // Where to insert the pin button
    buttonInsertionPoint: [
      '[class*="response-actions"]',
      '[class*="message-actions"]',
      '[class*="toolbar"]'
    ].join(', ')
  };

  // ============================================
  // SITE CONFIGURATION
  // ============================================

  const geminiConfig = {
    product: 'gemini',

    /**
     * Extract chat ID from Gemini URL
     * Formats may include:
     *   - https://gemini.google.com/app/{id}
     *   - https://gemini.google.com/share/{id}
     *   - https://gemini.google.com/chat/{id}
     */
    extractChatId(url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        // Look for known path patterns
        const idPrefixes = ['app', 'share', 'chat', 'c'];

        for (let i = 0; i < pathParts.length; i++) {
          if (idPrefixes.includes(pathParts[i]) && pathParts[i + 1]) {
            return pathParts[i + 1];
          }
        }

        // Check URL parameters
        const chatParam = urlObj.searchParams.get('chat') ||
          urlObj.searchParams.get('id') ||
          urlObj.searchParams.get('c');
        if (chatParam) {
          return chatParam;
        }

        // Fallback: hash the pathname for a stable ID
        return this.hashString(urlObj.pathname) || 'gemini_session';
      } catch (e) {
        console.error('[AI Chat Anchor] Error extracting chat ID:', e);
        return 'unknown';
      }
    },

    /**
     * Get the chat title from the page
     */
    getChatTitle() {
      let title = document.title;

      // Clean up title
      if (title.endsWith('Gemini')) {
        title = title.replace(/ - Gemini$/, '');
      }

      // Remove notification count if present: "(1) Title"
      title = title.replace(/^\(\d+\)\s+/, '');

      title = title.trim();

      if (!title || title === 'Gemini') return 'Untitled Chat';
      return title;
    },

    /**
     * Simple string hash for generating stable IDs
     */
    hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return 'g_' + Math.abs(hash).toString(36);
    },

    /**
     * Get all assistant/model response elements on the page
     */
    getResponseElements() {
      const elements = [];

      // Only look within the main conversation area, not sidebar
      const mainContent = document.querySelector('main, [role="main"], .conversation-container');
      const searchRoot = mainContent || document.body;

      // Try custom element first (Gemini uses web components)
      // Only match model-response elements (not user queries)
      const customResponses = searchRoot.querySelectorAll('model-response');
      if (customResponses.length > 0) {
        customResponses.forEach(el => {
          if (!this.isUserMessage(el)) {
            elements.push(el);
          }
        });
        if (elements.length > 0) return elements;
      }

      // Try selector patterns
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
        elements.push(...this.getResponsesByStructure());
      }

      return elements;
    },

    /**
     * Check if an element is a user message (not model response)
     */
    isUserMessage(element) {
      // Check tag name for custom elements
      const tagName = element.tagName?.toLowerCase() || '';
      if (tagName.includes('user') || tagName === 'user-message') {
        return true;
      }

      // Check attributes and classes
      const text = element.className + ' ' +
        (element.getAttribute('data-role') || '') +
        (element.getAttribute('role') || '');

      const userPatterns = ['user', 'human', 'query', 'prompt'];
      return userPatterns.some(pattern => text.toLowerCase().includes(pattern));
    },

    /**
     * Fallback: Find responses by DOM structure
     */
    getResponsesByStructure() {
      const responses = [];

      const container = document.querySelector(SELECTORS.conversationContainer);
      if (!container) return responses;

      // Look for message-like elements
      const allMessages = container.querySelectorAll(
        '[class*="message"], [class*="turn"], [class*="content"], [role="article"]'
      );

      // Filter for likely model responses
      allMessages.forEach((el, index) => {
        // Skip if too small to be a real response
        if (el.textContent?.length < 20) return;

        // Check for response indicators
        const hasFormatting = el.querySelector('p, ul, ol, pre, code, table');
        const isEvenIndex = index % 2 === 1; // Alternating pattern

        if ((hasFormatting || isEvenIndex) && !this.isUserMessage(el)) {
          // Avoid duplicates from nested elements
          const isNested = responses.some(r => r.contains(el) || el.contains(r));
          if (!isNested) {
            responses.push(el);
          }
        }
      });

      return responses;
    },

    /**
     * Find where to insert the pin button within a response element
     * For Gemini, we always create our own wrapper at the top-right
     */
    getInsertionPoint(responseElement) {
      // Always create our own wrapper for consistent positioning
      // Don't try to use Gemini's action areas as they're in wrong positions
      let wrapper = responseElement.querySelector(':scope > .llm-pin-button-wrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'llm-pin-button-wrapper';
        responseElement.style.position = 'relative';
        // Insert at the beginning so it's at the top
        responseElement.insertBefore(wrapper, responseElement.firstChild);
      }

      return wrapper;
    }
  };

  // ============================================
  // INITIALIZATION
  // ============================================

  function isGeminiChatPage() {
    return window.location.hostname === 'gemini.google.com';
  }

  function initialize() {
    if (isGeminiChatPage()) {
      // Delay to let Gemini's framework render
      setTimeout(() => {
        window.PinNavigator.init(geminiConfig);
      }, 800);
    }

    // Watch for SPA navigation
    let lastUrl = window.location.href;

    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        if (isGeminiChatPage()) {
          setTimeout(() => {
            window.PinNavigator.init(geminiConfig);
          }, 800);
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
