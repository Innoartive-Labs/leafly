/**
 * Leafly - Tab Manager
 * Coordinates per-tab status and exclusion validation.
 */

import { storage } from '../shared/storage.js';
import { isHostExcluded, sanitizeHostname } from '../shared/validators.js';

export class TabManager {
  async isTabExcluded(tabUrl) {
    if (!tabUrl) return false;
    try {
      const url = new URL(tabUrl);
      const settings = await storage.getSettings();
      return isHostExcluded(url.hostname, settings.websiteExclusions);
    } catch {
      return false;
    }
  }

  async toggleExclusionForHostname(hostname) {
    const clean = sanitizeHostname(hostname);
    if (!clean) return false;

    const settings = await storage.getSettings();
    const exclusions = new Set(settings.websiteExclusions || []);

    let isNowExcluded = false;
    if (exclusions.has(clean)) {
      exclusions.delete(clean);
      isNowExcluded = false;
    } else {
      exclusions.add(clean);
      isNowExcluded = true;
    }

    await storage.saveSettings({ websiteExclusions: Array.from(exclusions) });
    return isNowExcluded;
  }
}

export const tabManager = new TabManager();

