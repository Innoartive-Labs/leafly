/**
 * Leafly - Settings Page Controller
 * Handles configuration sections, theme selection, geocoding search,
 * polished slider physics, and persistent header status reporting.
 */

import { storage } from '../shared/storage.js';
import { messaging } from '../shared/messaging.js';
import { MESSAGE_TYPES } from '../shared/constants.js';
import { sanitizeHostname } from '../shared/validators.js';
import { formatTimeAgo, formatTemperature } from '../shared/utilities.js';
import { initTheme } from '../shared/theme.js';

class SettingsController {
  constructor() {
    this.settings = null;
    this.weather = null;
    this.location = null;
    this.statusTimer = null;

    // DOM Navigation
    this.navButtons = document.querySelectorAll('.nav-button');
    this.sections = document.querySelectorAll('.pref-section');
    this.toast = document.getElementById('settings-toast');

    // General
    this.genEnabled = document.getElementById('gen-enabled');
    this.genMode = document.getElementById('gen-mode');
    this.genReducedMotion = document.getElementById('gen-reduced-motion');

    // Weather & Location
    this.locQueryInput = document.getElementById('location-query-input');
    this.btnSearchLocation = document.getElementById('btn-search-location');
    this.locResultsContainer = document.getElementById('location-results-container');
    this.currentLocationText = document.getElementById('current-location-text');
    this.currentCoordsText = document.getElementById('current-coords-text');
    this.weatherIntervalSelect = document.getElementById('weather-interval-select');
    this.weatherCacheStatus = document.getElementById('weather-cache-status');
    this.btnForceWeatherRefresh = document.getElementById('btn-force-weather-refresh');

    // Effects
    this.effManualType = document.getElementById('eff-manual-type');
    this.effIntensity = document.getElementById('eff-intensity');
    this.valEffIntensity = document.getElementById('val-eff-intensity');
    this.effSpeed = document.getElementById('eff-speed');
    this.valEffSpeed = document.getElementById('val-eff-speed');
    this.effSize = document.getElementById('eff-size');
    this.valEffSize = document.getElementById('val-eff-size');
    this.effWind = document.getElementById('eff-wind');
    this.valEffWind = document.getElementById('val-eff-wind');
    this.effWindDirection = document.getElementById('eff-wind-direction');
    this.effOpacity = document.getElementById('eff-opacity');
    this.valEffOpacity = document.getElementById('val-eff-opacity');

    // Inactivity & Broom
    this.accEnabled = document.getElementById('acc-enabled');
    this.accThreshold = document.getElementById('acc-threshold');
    this.valAccThreshold = document.getElementById('val-acc-threshold');
    this.accBroomEnabled = document.getElementById('acc-broom-enabled');
    this.btnTestSweep = document.getElementById('btn-test-sweep');

    // Exclusions
    this.exclusionInput = document.getElementById('exclusion-input');
    this.btnAddExclusion = document.getElementById('btn-add-exclusion');
    this.exclusionsTableBody = document.getElementById('exclusions-table-body');

    // Reset Defaults
    this.btnResetDefaults = document.getElementById('btn-reset-defaults');
  }

  async init() {
    await initTheme();
    this.settings = await storage.getSettings();
    this.weather = await storage.getWeatherCache();
    this.location = await storage.getLocation();

    this.bindNavigation();
    this.bindInputs();
    this.renderState();
  }

  bindNavigation() {
    this.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.navButtons.forEach((b) => b.classList.remove('active'));
        this.sections.forEach((s) => s.classList.remove('active'));

        btn.classList.add('active');
        const targetSection = document.getElementById(`section-${targetTab}`);
        if (targetSection) {
          targetSection.classList.add('active');
        }
      });
    });
  }

  updateSliderTrack(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    slider.style.background = `linear-gradient(to right, #4E5C4B 0%, #4E5C4B ${pct}%, #D1C3A6 ${pct}%, #D1C3A6 100%)`;
  }

  bindInputs() {
    // General
    this.genEnabled.addEventListener('change', (e) => this.save({ enabled: e.target.checked }));
    this.genMode.addEventListener('change', (e) => this.save({ mode: e.target.value }));
    this.genReducedMotion.addEventListener('change', (e) => this.save({ respectReducedMotion: e.target.checked }));

    // Weather
    this.weatherIntervalSelect.addEventListener('change', (e) => {
      this.save({ weatherUpdateIntervalMinutes: parseInt(e.target.value, 10) });
    });

    this.btnSearchLocation.addEventListener('click', () => this.handleLocationSearch());
    this.locQueryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLocationSearch();
    });

    this.btnForceWeatherRefresh.addEventListener('click', async () => {
      this.btnForceWeatherRefresh.textContent = 'Updating...';
      this.updateSaveStatus('Refreshing weather...', 'saving');
      const res = await messaging.sendToBackground(MESSAGE_TYPES.REFRESH_WEATHER);
      this.btnForceWeatherRefresh.textContent = 'Refresh Now';
      if (res && res.weather) {
        this.weather = res.weather;
        this.updateWeatherCacheDisplay();
        this.updateSaveStatus('Weather cache refreshed', 'success');
      } else {
        this.updateSaveStatus('Weather update failed', 'error');
      }
    });

    // Effects Tuning
    this.effManualType.addEventListener('change', (e) => this.save({ manualEffect: e.target.value }));

    // Sliders with active track styling and value presentation
    const sliders = [
      { input: this.effIntensity, readout: this.valEffIntensity, key: 'intensity', unit: '' },
      { input: this.effSpeed, readout: this.valEffSpeed, key: 'speed', unit: '' },
      { input: this.effSize, readout: this.valEffSize, key: 'size', unit: '' },
      { input: this.effWind, readout: this.valEffWind, key: 'windStrength', unit: '' },
      { input: this.effOpacity, readout: this.valEffOpacity, key: 'opacity', unit: '%' },
      { input: this.accThreshold, readout: this.valAccThreshold, key: 'inactivityDuration', unit: ' seconds' },
    ];

    sliders.forEach(({ input, readout, key, unit }) => {
      if (!input) return;
      input.addEventListener('input', (e) => {
        if (readout) readout.textContent = `${e.target.value}${unit}`;
        this.updateSliderTrack(input);
      });
      input.addEventListener('change', (e) => {
        this.save({ [key]: parseInt(e.target.value, 10) });
      });
    });

    this.effWindDirection.addEventListener('change', (e) => {
      this.save({ windDirection: e.target.value });
    });

    // Inactivity & Broom
    this.accEnabled.addEventListener('change', (e) => this.save({ accumulationEnabled: e.target.checked }));
    this.accBroomEnabled.addEventListener('change', (e) => this.save({ broomEnabled: e.target.checked }));

    if (this.btnTestSweep) {
      this.btnTestSweep.addEventListener('click', async () => {
        await messaging.broadcastToTabs(MESSAGE_TYPES.TRIGGER_BROOM);
        this.updateSaveStatus('Sweep requested on eligible open tabs', 'success');
      });
    }

    // Exclusions
    this.btnAddExclusion.addEventListener('click', () => this.handleAddExclusion());
    this.exclusionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAddExclusion();
    });

    // Reset Defaults
    this.btnResetDefaults.addEventListener('click', async () => {
      if (confirm('Restore Leafly preferences back to original defaults?')) {
        this.settings = await storage.resetSettings();
        await messaging.broadcastToTabs(MESSAGE_TYPES.SETTINGS_UPDATED, this.settings);
        this.renderState();
        this.updateSaveStatus('Preferences reset to defaults', 'success');
      }
    });
  }

  async save(partial) {
    this.updateSaveStatus('Saving changes...', 'saving');
    try {
      this.settings = await storage.saveSettings(partial);
      await messaging.broadcastToTabs(MESSAGE_TYPES.SETTINGS_UPDATED, this.settings);
      this.updateSaveStatus('Preferences saved', 'success');
      return true;
    } catch {
      this.updateSaveStatus('Could not save preferences', 'error');
      return false;
    }
  }

  updateSaveStatus(text, status = 'success') {
    clearTimeout(this.statusTimer);
    this.toast.textContent = text;
    this.toast.className = `settings-toast status-${status}`;
    this.toast.hidden = false;
    if (status !== 'saving') {
      this.statusTimer = setTimeout(() => { this.toast.hidden = true; }, 3000);
    }
  }

  renderState() {
    // General
    this.genEnabled.checked = this.settings.enabled;
    this.genMode.value = this.settings.mode;
    this.genReducedMotion.checked = this.settings.respectReducedMotion;

    // Weather
    this.weatherIntervalSelect.value = String(this.settings.weatherUpdateIntervalMinutes || 30);
    this.renderLocationInfo();
    this.updateWeatherCacheDisplay();

    // Effects Tuning
    this.effManualType.value = this.settings.manualEffect;

    this.effIntensity.value = this.settings.intensity;
    this.valEffIntensity.textContent = this.settings.intensity;
    this.updateSliderTrack(this.effIntensity);

    this.effSpeed.value = this.settings.speed;
    this.valEffSpeed.textContent = this.settings.speed;
    this.updateSliderTrack(this.effSpeed);

    this.effSize.value = this.settings.size;
    this.valEffSize.textContent = this.settings.size;
    this.updateSliderTrack(this.effSize);

    this.effWind.value = this.settings.windStrength;
    this.valEffWind.textContent = this.settings.windStrength;
    this.updateSliderTrack(this.effWind);

    this.effWindDirection.value = this.settings.windDirection;

    this.effOpacity.value = this.settings.opacity;
    this.valEffOpacity.textContent = `${this.settings.opacity}%`;
    this.updateSliderTrack(this.effOpacity);

    // Inactivity & Broom
    this.accEnabled.checked = this.settings.accumulationEnabled;
    this.accThreshold.value = this.settings.inactivityDuration;
    this.valAccThreshold.textContent = `${this.settings.inactivityDuration} seconds`;
    this.updateSliderTrack(this.accThreshold);

    this.accBroomEnabled.checked = this.settings.broomEnabled;

    // Exclusions
    this.renderExclusionsList();
  }

  renderLocationInfo() {
    if (this.location) {
      this.currentLocationText.textContent = [this.location.name, this.location.country].filter(Boolean).join(', ');
      this.currentCoordsText.textContent = `${this.location.latitude.toFixed(4)}, ${this.location.longitude.toFixed(4)}`;
    }
  }

  updateWeatherCacheDisplay() {
    if (this.weather && this.weather.lastUpdated) {
      const timeStr = formatTimeAgo(this.weather.lastUpdated);
      const tempStr = formatTemperature(this.weather.temperature);
      this.weatherCacheStatus.textContent = `${this.weather.conditionLabel} (${tempStr}) · Updated ${timeStr}`;
    } else {
      this.weatherCacheStatus.textContent = 'No weather data cached';
    }
  }

  async handleLocationSearch() {
    const query = this.locQueryInput.value.trim();
    if (query.length < 2) return;

    this.btnSearchLocation.textContent = 'Searching...';
    this.updateSaveStatus('Searching geonames...', 'saving');
    const res = await messaging.sendToBackground(MESSAGE_TYPES.SEARCH_LOCATION, { query });
    this.btnSearchLocation.textContent = 'Search';

    this.locResultsContainer.innerHTML = '';
    if (res && res.success && Array.isArray(res.results) && res.results.length > 0) {
      this.locResultsContainer.style.display = 'block';

      res.results.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'location-item';
        const name = document.createElement('span');
        name.textContent = item.displayName;
        const coordinates = document.createElement('span');
        coordinates.className = 'location-coordinates';
        coordinates.textContent = `${item.latitude.toFixed(2)}, ${item.longitude.toFixed(2)}`;
        div.append(name, coordinates);
        div.addEventListener('click', async () => {
          this.locResultsContainer.style.display = 'none';
          this.locQueryInput.value = '';

          const setRes = await messaging.sendToBackground(MESSAGE_TYPES.SET_LOCATION, {
            name: item.name,
            country: item.country,
            latitude: item.latitude,
            longitude: item.longitude,
          });

          if (setRes && setRes.location) {
            this.location = setRes.location;
            this.weather = setRes.weather;
            this.renderLocationInfo();
            this.updateWeatherCacheDisplay();
            this.updateSaveStatus(`Location set to ${item.name}`, 'success');
          }
        });
        this.locResultsContainer.appendChild(div);
      });
      this.updateSaveStatus('Select location from results', 'idle');
    } else {
      this.locResultsContainer.style.display = 'block';
      const message = document.createElement('div');
      message.className = 'location-empty';
      message.textContent = res?.success ? `No locations found matching "${query}"` : 'Location search failed. Please try again.';
      this.locResultsContainer.appendChild(message);
      this.updateSaveStatus(`No matches for "${query}"`, 'warning');
    }
  }

  async handleAddExclusion() {
    const raw = this.exclusionInput.value.trim();
    if (!raw) {
      this.updateSaveStatus('Please enter a website domain', 'warning');
      return;
    }
    const clean = sanitizeHostname(raw);
    if (!clean) {
      this.updateSaveStatus('Invalid website hostname format', 'error');
      return;
    }

    const list = new Set(this.settings.websiteExclusions || []);
    list.add(clean);
    this.exclusionInput.value = '';

    if (!await this.save({ websiteExclusions: Array.from(list) })) return;
    this.renderExclusionsList();
    this.updateSaveStatus(`Excluded ${clean}`, 'success');
  }

  async handleRemoveExclusion(domain) {
    const list = (this.settings.websiteExclusions || []).filter((d) => d !== domain);
    if (!await this.save({ websiteExclusions: list })) return;
    this.renderExclusionsList();
    this.updateSaveStatus(`Removed ${domain}`, 'success');
  }

  renderExclusionsList() {
    this.exclusionsTableBody.innerHTML = '';
    const exclusions = this.settings.websiteExclusions || [];

    if (exclusions.length === 0) {
      this.exclusionsTableBody.innerHTML = `
        <tr>
          <td colspan="2" style="text-align: center; color: var(--leafly-text-secondary); padding: 18px;">
            No websites excluded. Leafly operates on all accessible pages.
          </td>
        </tr>
      `;
      return;
    }

    exclusions.forEach((domain) => {
      const tr = document.createElement('tr');
      const domainCell = document.createElement('td');
      const code = document.createElement('code');
      code.textContent = domain;
      domainCell.appendChild(code);
      const actionCell = document.createElement('td');
      actionCell.style.textAlign = 'right';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-remove-site';
      btn.textContent = 'Remove';
      btn.title = 'Remove exclusion';
      actionCell.appendChild(btn);
      tr.append(domainCell, actionCell);
      btn.addEventListener('click', () => this.handleRemoveExclusion(domain));
      this.exclusionsTableBody.appendChild(tr);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new SettingsController();
  controller.init();
});
