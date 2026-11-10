/**
 * Leafly - Background Service Worker
 * Central extension lifecycle, message routing, and alarm management.
 */

import { ALARM_NAMES, MESSAGE_TYPES, WEATHER_MODES } from '../shared/constants.js';
import { storage } from '../shared/storage.js';
import { messaging } from '../shared/messaging.js';
import { weatherService } from './weather-service.js';
import { weatherScheduler } from './weather-scheduler.js';
import { locationService } from './location-service.js';
import { tabManager } from './tab-manager.js';

// Setup alarms on installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  await storage.getSettings();
  await weatherScheduler.setupAlarm();

  // If newly installed and auto mode enabled, do initial check
  if (details.reason === 'install') {
    const settings = await storage.getSettings();
    if (settings.mode === WEATHER_MODES.AUTO) {
      await weatherScheduler.executeCheck(true);
    }
  }
});

// Re-verify alarms on startup
chrome.runtime.onStartup.addListener(async () => {
  await weatherScheduler.setupAlarm();
});

// Alarm trigger handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAMES.WEATHER_CHECK) {
    await weatherScheduler.executeCheck(false);
  }
});

// Storage changes handler: update alarms or broadcast if needed
storage.onChanged(async (changes) => {
  if (changes.leafly_settings) {
    const newSettings = changes.leafly_settings.newValue;
    const oldSettings = changes.leafly_settings.oldValue;

    if (
      newSettings &&
      oldSettings &&
      newSettings.weatherUpdateIntervalMinutes !== oldSettings.weatherUpdateIntervalMinutes
    ) {
      await weatherScheduler.setupAlarm();
    }

    if (
      newSettings &&
      oldSettings &&
      newSettings.mode === WEATHER_MODES.AUTO &&
      oldSettings.mode !== WEATHER_MODES.AUTO
    ) {
      await weatherScheduler.executeCheck(true);
    }

    // Broadcast updated settings to all content tabs
    await messaging.broadcastToTabs(MESSAGE_TYPES.SETTINGS_UPDATED, newSettings);
  }
});

// Runtime message routing
messaging.addListener(async (message) => {
  const { type, payload } = message || {};

  switch (type) {
    case MESSAGE_TYPES.GET_SETTINGS: {
      const settings = await storage.getSettings();
      return { success: true, settings };
    }

    case MESSAGE_TYPES.SAVE_SETTINGS: {
      const updated = await storage.saveSettings(payload);
      return { success: true, settings: updated };
    }

    case MESSAGE_TYPES.GET_WEATHER: {
      const weather = await storage.getWeatherCache();
      const location = await locationService.getCurrentLocation();
      return { success: true, weather, location };
    }

    case MESSAGE_TYPES.REFRESH_WEATHER: {
      return await weatherScheduler.executeCheck(true);
    }

    case MESSAGE_TYPES.SEARCH_LOCATION: {
      const result = await weatherService.searchLocation(payload?.query);
      return result;
    }

    case MESSAGE_TYPES.SET_LOCATION: {
      const loc = await locationService.setManualLocation(payload);
      // Immediately refresh weather for new location
      await weatherScheduler.executeCheck(true);
      const weather = await storage.getWeatherCache();
      return { success: true, location: loc, weather };
    }

    case MESSAGE_TYPES.TOGGLE_EXCLUSION: {
      const isExcluded = await tabManager.toggleExclusionForHostname(payload?.hostname);
      const settings = await storage.getSettings();
      await messaging.broadcastToTabs(MESSAGE_TYPES.SETTINGS_UPDATED, settings);
      return { success: true, isExcluded, exclusions: settings.websiteExclusions };
    }

    case MESSAGE_TYPES.CHECK_STATUS: {
      const settings = await storage.getSettings();
      const weather = await storage.getWeatherCache();
      const isExcluded = await tabManager.isTabExcluded(payload?.url);
      return {
        success: true,
        enabled: settings.enabled,
        isExcluded,
        mode: settings.mode,
        currentEffect: settings.mode === WEATHER_MODES.AUTO ? weather.effect : settings.manualEffect,
      };
    }

    default:
      return { success: false, error: `Unhandled message type: ${type}` };
  }
});

