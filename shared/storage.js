/**
 * Leafly - Storage Service
 * Wrapper around chrome.storage.local with defaults and fallback support.
 */

import { STORAGE_KEYS } from './constants.js';
import { DEFAULT_SETTINGS, DEFAULT_LOCATION, DEFAULT_WEATHER_CACHE } from './defaults.js';
import { validateSettings } from './validators.js';

class StorageService {
  constructor() {
    this.isChromeStorageAvailable =
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.local;
  }

  async get(key, fallback = null) {
    if (this.isChromeStorageAvailable) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.warn(`[Leafly Storage] Error getting ${key}:`, chrome.runtime.lastError);
            resolve(fallback);
          } else {
            resolve(result && result[key] !== undefined ? result[key] : fallback);
          }
        });
      });
    }

    // In-memory / localStorage fallback for unit testing outside extension context
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      }
    } catch {
      // fallback
    }
    return fallback;
  }

  async set(key, value) {
    if (this.isChromeStorageAvailable) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.error(`[Leafly Storage] Error setting ${key}:`, chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
    } catch {
      // fallback
    }
    return false;
  }

  async getSettings() {
    const raw = await this.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return validateSettings(raw);
  }

  async saveSettings(partialSettings) {
    const current = await this.getSettings();
    const updated = validateSettings({ ...current, ...partialSettings });
    if (!await this.set(STORAGE_KEYS.SETTINGS, updated)) throw new Error('Could not save settings');
    return updated;
  }

  async resetSettings() {
    if (!await this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)) throw new Error('Could not reset settings');
    return { ...DEFAULT_SETTINGS };
  }

  async getWeatherCache() {
    return await this.get(STORAGE_KEYS.WEATHER, DEFAULT_WEATHER_CACHE);
  }

  async saveWeatherCache(weatherData) {
    const dataWithTimestamp = {
      ...weatherData,
      lastUpdated: Date.now(),
    };
    await this.set(STORAGE_KEYS.WEATHER, dataWithTimestamp);
    return dataWithTimestamp;
  }

  async getLocation() {
    return await this.get(STORAGE_KEYS.LOCATION, DEFAULT_LOCATION);
  }

  async saveLocation(location) {
    const merged = { ...DEFAULT_LOCATION, ...location };
    await this.set(STORAGE_KEYS.LOCATION, merged);
    return merged;
  }

  onChanged(callback) {
    if (this.isChromeStorageAvailable && chrome.storage.onChanged) {
      const listener = (changes, areaName) => {
        if (areaName === 'local') {
          callback(changes);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    return () => {};
  }
}

export const storage = new StorageService();

