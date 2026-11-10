/**
 * Leafly - Weather Service
 * Integration with Open-Meteo API and WMO weather condition resolution.
 */

import { API_ENDPOINTS, WMO_CODE_MAP, EFFECT_TYPES } from '../shared/constants.js';

export class WeatherService {
  /**
   * Fetch weather forecast for given latitude and longitude.
   * Never throws uncaught errors; always returns structured result.
   */
  async fetchWeather(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { success: false, error: 'Invalid coordinates provided' };
    }

    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: 'temperature_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
      timezone: 'auto',
    });

    const url = `${API_ENDPOINTS.WEATHER_FORECAST}?${params.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Weather service responded with status ${response.status}`,
        };
      }

      const data = await response.json();
      if (!data || !data.current) {
        return { success: false, error: 'Malformed weather response payload' };
      }

      const current = data.current;
      const code = current.weather_code ?? 0;
      const mapping = WMO_CODE_MAP[code] || {
        label: 'Ambient',
        effect: EFFECT_TYPES.SUNBEAMS,
        icon: 'sun',
      };

      return {
        success: true,
        data: {
          conditionCode: code,
          conditionLabel: mapping.label,
          effect: mapping.effect,
          icon: mapping.icon,
          temperature: Math.round(current.temperature_2m ?? 20),
          apparentTemperature: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 20),
          windSpeed: Math.round(current.wind_speed_10m ?? 0),
          windDirection: Math.round(current.wind_direction_10m ?? 0),
          precipitation: Number(current.precipitation ?? 0),
          isDay: current.is_day ?? 1,
          lastUpdated: Date.now(),
        },
      };
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      return {
        success: false,
        error: isAbort ? 'Weather request timed out' : (err.message || 'Network error fetching weather'),
      };
    }
  }

  /**
   * Search for cities using Open-Meteo Geocoding API
   */
  async searchLocation(query) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return { success: false, results: [] };
    }

    const params = new URLSearchParams({
      name: query.trim(),
      count: '6',
      language: 'en',
      format: 'json',
    });

    const url = `${API_ENDPOINTS.GEOCODING_SEARCH}?${params.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, results: [] };
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.results)) {
        return { success: true, results: [] };
      }

      const results = data.results.map((item) => ({
        id: item.id,
        name: item.name,
        country: item.country || '',
        admin1: item.admin1 || '',
        latitude: item.latitude,
        longitude: item.longitude,
        displayName: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
      }));

      return { success: true, results };
    } catch (err) {
      return { success: false, results: [], error: err.message };
    }
  }
}

export const weatherService = new WeatherService();

