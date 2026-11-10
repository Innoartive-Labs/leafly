/**
 * Leafly - Weather Scheduler
 * Background periodic alarm coordination and tab notifications.
 */

import { ALARM_NAMES, MESSAGE_TYPES, WEATHER_MODES } from '../shared/constants.js';
import { storage } from '../shared/storage.js';
import { messaging } from '../shared/messaging.js';
import { weatherService } from './weather-service.js';
import { locationService } from './location-service.js';

export class WeatherScheduler {
  constructor() {
    this.isChecking = false;
  }

  /**
   * Initialize or update alarm based on settings
   */
  async setupAlarm() {
    if (typeof chrome === 'undefined' || !chrome.alarms) return;

    const settings = await storage.getSettings();
    const interval = Math.max(15, settings.weatherUpdateIntervalMinutes || 30);

    chrome.alarms.get(ALARM_NAMES.WEATHER_CHECK, (alarm) => {
      if (!alarm || alarm.periodInMinutes !== interval) {
        chrome.alarms.create(ALARM_NAMES.WEATHER_CHECK, {
          periodInMinutes: interval,
        });
      }
    });
  }

  /**
   * Execute scheduled weather check
   */
  async executeCheck(force = false) {
    if (this.isChecking) return { success: false, error: 'Weather update already in progress' };
    this.isChecking = true;

    try {
      const settings = await storage.getSettings();

      // Non-negotiable principle: Do not make network requests if manual mode is active,
      // unless forced (e.g. user clicked "Refresh Weather" button)
      if (settings.mode !== WEATHER_MODES.AUTO && !force) {
        return;
      }

      const location = await locationService.getCurrentLocation();
      if (!location || typeof location.latitude !== 'number') {
        return;
      }

      const result = await weatherService.fetchWeather(location.latitude, location.longitude);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Weather update failed' };
      }

      const cached = await storage.getWeatherCache();
      const updatedData = {
        ...result.data,
        locationName: location.name || cached.locationName || 'Unknown Location',
      };

      await storage.saveWeatherCache(updatedData);

      // Notify open tabs about the updated weather
      await messaging.broadcastToTabs(MESSAGE_TYPES.WEATHER_UPDATED, updatedData);
      return { success: true, weather: updatedData };
    } catch (err) {
      console.warn('[Leafly WeatherScheduler] Check error:', err);
      return { success: false, error: err.message || 'Weather update failed' };
    } finally {
      this.isChecking = false;
    }
  }
}

export const weatherScheduler = new WeatherScheduler();

