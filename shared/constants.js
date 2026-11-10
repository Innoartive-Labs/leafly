/**
 * Leafly - Shared Constants
 * Core enumerations, identifiers, and mapping tables.
 */

export const EFFECT_TYPES = Object.freeze({
  AUTUMN_LEAVES: 'autumn_leaves',
  SNOW: 'snow',
  RAIN: 'rain',
  SPRING_PETALS: 'spring_petals',
  FIREFLIES: 'fireflies',
  SUNBEAMS: 'sunbeams',
  BUBBLES: 'bubbles',
  STARS: 'stars',
  CONFETTI: 'confetti',
});

export const EFFECT_NAMES = Object.freeze({
  [EFFECT_TYPES.AUTUMN_LEAVES]: 'Autumn Leaves',
  [EFFECT_TYPES.SNOW]: 'Gentle Snowfall',
  [EFFECT_TYPES.RAIN]: 'Gentle Rain',
  [EFFECT_TYPES.SPRING_PETALS]: 'Cherry Blossom Petals',
  [EFFECT_TYPES.FIREFLIES]: 'Evening Fireflies',
  [EFFECT_TYPES.SUNBEAMS]: 'Atmospheric Sunbeams',
  [EFFECT_TYPES.BUBBLES]: 'Drifting Bubbles',
  [EFFECT_TYPES.STARS]: 'Starlight Drift',
  [EFFECT_TYPES.CONFETTI]: 'Subtle Confetti',
});

export const WEATHER_MODES = Object.freeze({
  AUTO: 'auto',
  MANUAL: 'manual',
});

export const WIND_DIRECTIONS = Object.freeze({
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  NONE: 'none',
});

export const THEMES = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
});

export const MESSAGE_TYPES = Object.freeze({
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  GET_WEATHER: 'GET_WEATHER',
  WEATHER_UPDATED: 'WEATHER_UPDATED',
  REFRESH_WEATHER: 'REFRESH_WEATHER',
  SEARCH_LOCATION: 'SEARCH_LOCATION',
  SET_LOCATION: 'SET_LOCATION',
  TRIGGER_BROOM: 'TRIGGER_BROOM',
  TOGGLE_EXCLUSION: 'TOGGLE_EXCLUSION',
  CHECK_STATUS: 'CHECK_STATUS',
  TAB_STATUS: 'TAB_STATUS',
});

export const ALARM_NAMES = Object.freeze({
  WEATHER_CHECK: 'leafly_weather_check_alarm',
});

export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'leafly_settings',
  WEATHER: 'leafly_weather_cache',
  LOCATION: 'leafly_location',
});

/**
 * Open-Meteo WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
export const WMO_CODE_MAP = Object.freeze({
  0: { label: 'Clear Sky', effect: EFFECT_TYPES.SUNBEAMS, icon: 'sun' },
  1: { label: 'Mainly Clear', effect: EFFECT_TYPES.SUNBEAMS, icon: 'sun' },
  2: { label: 'Partly Cloudy', effect: EFFECT_TYPES.SUNBEAMS, icon: 'cloud-sun' },
  3: { label: 'Overcast', effect: EFFECT_TYPES.AUTUMN_LEAVES, icon: 'cloud' },
  45: { label: 'Fog', effect: EFFECT_TYPES.SUNBEAMS, icon: 'fog' },
  48: { label: 'Depositing Rime Fog', effect: EFFECT_TYPES.SUNBEAMS, icon: 'fog' },
  51: { label: 'Light Drizzle', effect: EFFECT_TYPES.RAIN, icon: 'drizzle' },
  53: { label: 'Moderate Drizzle', effect: EFFECT_TYPES.RAIN, icon: 'drizzle' },
  55: { label: 'Dense Drizzle', effect: EFFECT_TYPES.RAIN, icon: 'drizzle' },
  56: { label: 'Light Freezing Drizzle', effect: EFFECT_TYPES.RAIN, icon: 'drizzle' },
  57: { label: 'Dense Freezing Drizzle', effect: EFFECT_TYPES.RAIN, icon: 'drizzle' },
  61: { label: 'Slight Rain', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  63: { label: 'Moderate Rain', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  65: { label: 'Heavy Rain', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  66: { label: 'Light Freezing Rain', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  67: { label: 'Heavy Freezing Rain', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  71: { label: 'Slight Snow Fall', effect: EFFECT_TYPES.SNOW, icon: 'snow' },
  73: { label: 'Moderate Snow Fall', effect: EFFECT_TYPES.SNOW, icon: 'snow' },
  75: { label: 'Heavy Snow Fall', effect: EFFECT_TYPES.SNOW, icon: 'snow' },
  77: { label: 'Snow Grains', effect: EFFECT_TYPES.SNOW, icon: 'snow' },
  80: { label: 'Slight Rain Showers', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  81: { label: 'Moderate Rain Showers', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  82: { label: 'Violent Rain Showers', effect: EFFECT_TYPES.RAIN, icon: 'rain' },
  85: { label: 'Slight Snow Showers', effect: EFFECT_TYPES.SNOW, icon: 'snow' },
  86: { label: 'Heavy Snow Showers', effect: EFFECT_TYPES.SNOW, icon: 'snow' },
  95: { label: 'Thunderstorm', effect: EFFECT_TYPES.RAIN, icon: 'thunder' },
  96: { label: 'Thunderstorm with Slight Hail', effect: EFFECT_TYPES.RAIN, icon: 'thunder' },
  99: { label: 'Thunderstorm with Heavy Hail', effect: EFFECT_TYPES.RAIN, icon: 'thunder' },
});

export const API_ENDPOINTS = Object.freeze({
  WEATHER_FORECAST: 'https://api.open-meteo.com/v1/forecast',
  GEOCODING_SEARCH: 'https://geocoding-api.open-meteo.com/v1/search',
});

