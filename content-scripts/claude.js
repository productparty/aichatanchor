/**
 * AI Chat Anchor - Claude Content Script
 * Site-specific selectors and logic for claude.ai
 */

(function () {
  'use strict';

  // Wait for shared module to load
  if (!window.PinNavigator) {
    console.error('[AI Chat Anchor] Shared module not loaded');
    return;
  }

  // ============================================
  // CLAUDE SELECTORS
  // ============================================

  // These selectors target Claude's assistant response elements
  const SELECTORS = {
    // Primary: Look for assistant message containers
    responseContainer: [
      '[data-is-streaming]',
      '[class*="claude-message"]',
      '[class*="assistant-message"]',
      '[class*="response-content"]',
      // Message containers with specific attributes
      '[data-testid*="assistant"]',
      '[data-testid*="response"]',
      // Fallback patterns
      '.prose',
      '[class*="markdown"]'
    ].join(', '),

    // Container that holds all messages
    conversationContainer: [
      '[class*="conversation"]',
      '[class*="chat-messages"]',
      '[role="main"]',
      'main'
    ].join(', '),

    // Where to insert the pin button within a response
    buttonInsertionPoint: [
      '[class*="message-actions"]',
      '[class*="response-actions"]',
      '[class*="toolbar"]'
    ].join(', ')
  };

  // ============================================
  // SITE CONFIGURATION
  // ============================================

  const claudeConfig = {
    product: 'claude',

    /**
     * Extract chat ID from Claude URL
     * Formats:
     *   - https://claude.ai/chat/{id}
     *   - https://claude.ai/project/{project-id}/chat/{id}
     */
    extractChatId(url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        // Look for conversation ID patterns
        // /chat/{id}
        for (let i = 0; i < pathParts.length; i++) {
          if (pathParts[i] === 'chat' && pathParts[i + 1]) {
            return pathParts[i + 1];
          }
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
      // Try DOM first for most accurate current title
      const titleEl = document.querySelector('h2.font-tiiempos, [data-testid="chat-title"]');
      if (titleEl && titleEl.textContent) {
        return titleEl.textContent.trim();
      }

      // Fallback to document title
      let title = document.title;
      title = title.replace(/ - Claude$/, '').trim();

      if (title === 'Claude') return 'Untitled Chat';
      return title;
    },

    /**
     * Get all assistant response elements on the page
     */
    getResponseElements() {
      const elements = [];

      // Claude uses a specific structure for messages
      // Look for message containers that are from the assistant

      // Try to find the conversation container first
      const container = document.querySelector(SELECTORS.conversationContainer) || document.body;

      // Look for all message-like elements
      const allMessages = container.querySelectorAll('[class*="message"], [class*="Message"], [data-testid]');

      allMessages.forEach(el => {
        // Check if this is an assistant message
        if (this.isAssistantMessage(el) && !elements.includes(el)) {
          elements.push(el);
        }
      });

      // If no messages found, try a structural approach
      if (elements.length === 0) {
        elements.push(...this.getResponsesByStructure());
      }

      return elements;
    },

    /**
     * Check if an element is an assistant message
     */
    isAssistantMessage(element) {
      // Check data attributes
      const testId = element.getAttribute('data-testid') || '';
      const role = element.getAttribute('data-role') || '';

      if (testId.includes('assistant') || testId.includes('response')) {
        return true;
      }
      if (role === 'assistant') {
        return true;
      }

      // Check class names
      const className = element.className || '';
      if (typeof className === 'string') {
        if (className.includes('assistant') || className.includes('claude')) {
          return true;
        }
      }

      // Check for streaming indicator (only assistant messages stream)
      if (element.hasAttribute('data-is-streaming')) {
        return true;
      }

      return false;
    },

    /**
     * Check if an element is a user message (not assistant)
     */
    isUserMessage(element) {
      const testId = element.getAttribute('data-testid') || '';
      const role = element.getAttribute('data-role') || '';
      const className = element.className || '';

      if (testId.includes('user') || testId.includes('human')) {
        return true;
      }
      if (role === 'user' || role === 'human') {
        return true;
      }
      if (typeof className === 'string' && (className.includes('user') || className.includes('human'))) {
        return true;
      }

      return false;
    },

    /**
     * Fallback: Find responses by DOM structure
     */
    getResponsesByStructure() {
      const responses = [];

      const container = document.querySelector(SELECTORS.conversationContainer) || document.body;

      // Find all potential message containers
      const turns = container.querySelectorAll('[class*="group"], [class*="turn"], [class*="message"]');

      turns.forEach((turn, index) => {
        // Skip if it's a user message
        if (this.isUserMessage(turn)) return;

        // Check if this turn contains formatted content (likely assistant)
        const hasFormatting = turn.querySelector('.prose, .markdown, pre, code, ul, ol');
        const hasSubstantialText = turn.textContent && turn.textContent.length > 50;

        // Alternate pattern: even indices are often user, odd are assistant
        const isOddIndex = index % 2 === 1;

        if ((hasFormatting || (hasSubstantialText && isOddIndex)) && !this.isUserMessage(turn)) {
          // Avoid nested duplicates
          const isNested = responses.some(r => r.contains(turn) || turn.contains(r));
          if (!isNested) {
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

      // Create our own wrapper for consistent positioning
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

  function isClaudeChatPage() {
    const hostname = window.location.hostname;
    return hostname === 'claude.ai';
  }

  function initialize() {
    if (isClaudeChatPage()) {
      // Delay slightly to let Claude's JS render content
      setTimeout(() => {
        window.PinNavigator.init(claudeConfig);
      }, 500);
    }

    // Watch for SPA navigation
    let lastUrl = window.location.href;

    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        if (isClaudeChatPage()) {
          setTimeout(() => {
            window.PinNavigator.init(claudeConfig);
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
