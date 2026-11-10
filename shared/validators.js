/**
 * Leafly - Settings & Input Validators
 * Robust sanitization and schema verification.
 */

import { EFFECT_TYPES, WEATHER_MODES, WIND_DIRECTIONS } from './constants.js';
import { DEFAULT_SETTINGS, SETTING_LIMITS } from './defaults.js';

export function clamp(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

export function validateSettings(raw = {}) {
  const settings = { ...DEFAULT_SETTINGS };

  if (typeof raw.enabled === 'boolean') {
    settings.enabled = raw.enabled;
  }

  if (['system', 'light', 'dark'].includes(raw.theme)) {
    settings.theme = raw.theme;
  }

  if (Object.values(WEATHER_MODES).includes(raw.mode)) {
    settings.mode = raw.mode;
  }

  if (Object.values(EFFECT_TYPES).includes(raw.manualEffect)) {
    settings.manualEffect = raw.manualEffect;
  }

  settings.intensity = clamp(
    raw.intensity ?? settings.intensity,
    SETTING_LIMITS.intensity.min,
    SETTING_LIMITS.intensity.max
  );

  settings.speed = clamp(
    raw.speed ?? settings.speed,
    SETTING_LIMITS.speed.min,
    SETTING_LIMITS.speed.max
  );

  settings.size = clamp(
    raw.size ?? settings.size,
    SETTING_LIMITS.size.min,
    SETTING_LIMITS.size.max
  );

  settings.windStrength = clamp(
    raw.windStrength ?? settings.windStrength,
    SETTING_LIMITS.windStrength.min,
    SETTING_LIMITS.windStrength.max
  );

  if (Object.values(WIND_DIRECTIONS).includes(raw.windDirection)) {
    settings.windDirection = raw.windDirection;
  }

  settings.opacity = clamp(
    raw.opacity ?? settings.opacity,
    SETTING_LIMITS.opacity.min,
    SETTING_LIMITS.opacity.max
  );

  if (typeof raw.accumulationEnabled === 'boolean') {
    settings.accumulationEnabled = raw.accumulationEnabled;
  }

  settings.inactivityDuration = clamp(
    raw.inactivityDuration ?? settings.inactivityDuration,
    SETTING_LIMITS.inactivityDuration.min,
    SETTING_LIMITS.inactivityDuration.max
  );

  if (typeof raw.broomEnabled === 'boolean') {
    settings.broomEnabled = raw.broomEnabled;
  }

  if (Array.isArray(raw.websiteExclusions)) {
    settings.websiteExclusions = raw.websiteExclusions
      .filter((site) => typeof site === 'string' && site.trim().length > 0)
      .map((site) => site.trim().toLowerCase());
  }

  if (typeof raw.respectReducedMotion === 'boolean') {
    settings.respectReducedMotion = raw.respectReducedMotion;
  }

  settings.weatherUpdateIntervalMinutes = clamp(
    raw.weatherUpdateIntervalMinutes ?? settings.weatherUpdateIntervalMinutes,
    SETTING_LIMITS.weatherUpdateIntervalMinutes.min,
    SETTING_LIMITS.weatherUpdateIntervalMinutes.max
  );

  return settings;
}

export function sanitizeHostname(urlOrHost) {
  if (!urlOrHost || typeof urlOrHost !== 'string') return '';
  let str = urlOrHost.trim().toLowerCase();
  try {
    if (str.includes('://')) {
      const parsed = new URL(str);
      str = parsed.hostname;
    }
  } catch {
    // If not a full URL, strip paths/ports manually
  }
  return str.replace(/^www\./, '').split('/')[0].split(':')[0];
}

export function isHostExcluded(hostname, exclusions = []) {
  if (!hostname || !Array.isArray(exclusions) || exclusions.length === 0) return false;
  const cleanHost = sanitizeHostname(hostname);
  return exclusions.some((pattern) => {
    const cleanPattern = sanitizeHostname(pattern);
    if (!cleanPattern) return false;
    return cleanHost === cleanPattern || cleanHost.endsWith('.' + cleanPattern);
  });
}

