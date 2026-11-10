/**
 * Leafly - Messaging Service
 * Standardized communication across service worker, tabs, popup, and settings.
 */

class MessagingService {
  /**
   * Send message to background service worker
   */
  async sendToBackground(type, payload = {}) {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      return { success: false, error: 'Extension runtime not available' };
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, payload }, (response) => {
          if (chrome.runtime.lastError) {
            // Service worker may be asleep or message not handled
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: true });
          }
        });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  /**
   * Broadcast message to all active browser tabs
   */
  async broadcastToTabs(type, payload = {}) {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      return;
    }

    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (!tab || typeof tab.id !== 'number') {
          continue;
        }
        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
          continue;
        }
        chrome.tabs.sendMessage(tab.id, { type, payload }, () => {
          // Ignore lastError for tabs where content script isn't loaded or supported
          if (chrome.runtime.lastError) {
            // Silence expected error
          }
        });
      }
    } catch (err) {
      console.warn('[Leafly Messaging] Broadcast error:', err);
    }
  }

  /**
   * Send message to a specific tab
   */
  async sendToTab(tabId, type, payload = {}) {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.sendMessage) {
      return { success: false };
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type, payload }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: true });
        }
      });
    });
  }

  /**
   * Register a message listener
   */
  addListener(handler) {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
      return () => {};
    }

    const listener = (message, sender, sendResponse) => {
      const result = handler(message, sender);
      if (result instanceof Promise) {
        result.then(sendResponse).catch((err) => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
      } else if (result !== undefined) {
        sendResponse(result);
      }
      return false;
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }
}

export const messaging = new MessagingService();

