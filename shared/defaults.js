/**
 * Leafly - Default Configuration
 * Standard initial state and configurable limits.
 */

import { EFFECT_TYPES, WEATHER_MODES, WIND_DIRECTIONS, THEMES } from './constants.js';

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  theme: THEMES.SYSTEM,
  mode: WEATHER_MODES.MANUAL,
  manualEffect: EFFECT_TYPES.AUTUMN_LEAVES,
  intensity: 45,
  speed: 40,
  size: 50,
  windStrength: 25,
  windDirection: WIND_DIRECTIONS.AUTO,
  opacity: 85,
  accumulationEnabled: true,
  inactivityDuration: 60, // seconds
  broomEnabled: true,
  websiteExclusions: [
    'docs.google.com',
    'sheets.google.com',
    'slides.google.com',
  ],
  respectReducedMotion: true,
  weatherUpdateIntervalMinutes: 30,
});

export const DEFAULT_LOCATION = Object.freeze({
  name: 'London',
  country: 'United Kingdom',
  latitude: 51.5074,
  longitude: -0.1278,
  isAuto: false,
});

export const DEFAULT_WEATHER_CACHE = Object.freeze({
  conditionCode: 0,
  conditionLabel: 'Clear Sky',
  effect: EFFECT_TYPES.SUNBEAMS,
  temperature: 18,
  apparentTemperature: 18,
  windSpeed: 10,
  windDirection: 180,
  precipitation: 0,
  isDay: 1,
  lastUpdated: 0,
  locationName: 'London',
});

export const SETTING_LIMITS = Object.freeze({
  intensity: { min: 1, max: 100 },
  speed: { min: 1, max: 100 },
  size: { min: 10, max: 100 },
  windStrength: { min: 0, max: 100 },
  opacity: { min: 10, max: 100 },
  inactivityDuration: { min: 10, max: 600 },
  weatherUpdateIntervalMinutes: { min: 15, max: 180 },
});

