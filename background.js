/**
 * AI Chat Anchor - Background Service Worker
 * Handles extension lifecycle, message passing, and cross-tab communication
 */

// ============================================
// MESSAGE HANDLING
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PIN_CREATED':
      handlePinCreated(message.pin, sender.tab);
      sendResponse({ success: true });
      break;

    case 'PIN_DELETED':
      handlePinDeleted(message.pinId, message.product, message.chatId);
      sendResponse({ success: true });
      break;

    case 'GET_PINS_FOR_TAB':
      getPinsForTab(sender.tab).then(pins => {
        sendResponse({ pins });
      });
      return true; // Keep channel open for async response

    case 'NAVIGATE_TO_PIN':
      navigateToPin(message.pin);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

// ============================================
// PIN MANAGEMENT
// ============================================

async function handlePinCreated(pin, tab) {
  console.log('[AI Chat Anchor] Pin created:', pin);

  // Could show a notification badge on the extension icon
  updateBadgeForTab(tab?.id);
}

async function handlePinDeleted(pinId, product, chatId) {
  console.log('[AI Chat Anchor] Pin deleted:', pinId);
}

async function getPinsForTab(tab) {
  if (!tab?.url) return [];

  try {
    const url = new URL(tab.url);
    const result = await chrome.storage.local.get('pins');
    const allPins = result.pins || { claude: {}, chatgpt: {}, gemini: {} };

    // Determine which product based on hostname
    let product = null;
    if (url.hostname === 'claude.ai') {
      product = 'claude';
    } else if (url.hostname === 'chat.openai.com' || url.hostname === 'chatgpt.com') {
      product = 'chatgpt';
    } else if (url.hostname === 'gemini.google.com') {
      product = 'gemini';
    }

    if (!product) return [];

    // Get all pins for this product
    const productPins = allPins[product] || {};
    const pinsArray = [];

    for (const chatId in productPins) {
      pinsArray.push(...productPins[chatId]);
    }

    return pinsArray;
  } catch (e) {
    console.error('[AI Chat Anchor] Error getting pins for tab:', e);
    return [];
  }
}

// ============================================
// NAVIGATION
// ============================================

async function navigateToPin(pin) {
  // Find or create tab with the chat URL
  const tabs = await chrome.tabs.query({ url: pin.chatUrl });

  if (tabs.length > 0) {
    // Tab exists, switch to it and scroll
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });

    // Send message to scroll to the pin
    chrome.tabs.sendMessage(tab.id, {
      type: 'SCROLL_TO_PIN',
      pin: pin
    });
  } else {
    // Open new tab with the URL
    const tab = await chrome.tabs.create({ url: pin.chatUrl });

    // Wait for tab to load, then scroll
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // Give content script time to initialize
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SCROLL_TO_PIN',
            pin: pin
          });
        }, 1000);
      }
    });
  }
}

// ============================================
// BADGE MANAGEMENT
// ============================================

async function updateBadgeForTab(tabId) {
  if (!tabId) return;

  try {
    const tab = await chrome.tabs.get(tabId);
    const pins = await getPinsForTab(tab);

    if (pins.length > 0) {
      chrome.action.setBadgeText({
        text: pins.length.toString(),
        tabId: tabId
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#d4a574',
        tabId: tabId
      });
    } else {
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }
  } catch (e) {
    // Tab may have been closed
  }
}

// Update badge when tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateBadgeForTab(activeInfo.tabId);
});

// Update badge when tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateBadgeForTab(tabId);
  }
});

// ============================================
// INSTALLATION
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AI Chat Anchor] Extension installed');

    // Initialize storage structure
    chrome.storage.local.get('pins', (result) => {
      if (!result.pins) {
        chrome.storage.local.set({
          pins: { claude: {}, chatgpt: {}, gemini: {} }
        });
      }
    });
  } else if (details.reason === 'update') {
    console.log('[AI Chat Anchor] Extension updated to version', chrome.runtime.getManifest().version);
  }
});
