/**
 * Leafly - Popup Controller
 * Manages user interactions, settings persistence, and live preview rendering.
 */

import { storage } from '../shared/storage.js';
import { messaging } from '../shared/messaging.js';
import { MESSAGE_TYPES, WEATHER_MODES, EFFECT_TYPES, EFFECT_NAMES } from '../shared/constants.js';
import { ParticleEngine } from '../content/particle-engine.js';
import { sanitizeHostname, isHostExcluded } from '../shared/validators.js';
import { formatTemperature } from '../shared/utilities.js';
import { initTheme } from '../shared/theme.js';

class PopupController {
  constructor() {
    this.settings = null;
    this.weather = null;
    this.currentTabHostname = '';
    this.previewEngine = null;

    // DOM Elements
    this.masterToggle = document.getElementById('master-toggle');
    this.previewCanvas = document.getElementById('preview-canvas');
    this.effectTitleEl = document.getElementById('current-effect-title');

    this.weatherCard = document.getElementById('weather-card');
    this.weatherTempEl = document.getElementById('weather-temp');
    this.weatherConditionEl = document.getElementById('weather-condition');
    this.weatherLocationEl = document.getElementById('weather-location');
    this.refreshWeatherBtn = document.getElementById('refresh-weather-btn');

    this.modeManualBtn = document.getElementById('mode-manual-btn');
    this.modeAutoBtn = document.getElementById('mode-auto-btn');
    this.effectSelectGroup = document.getElementById('effect-select-group');
    this.effectSelect = document.getElementById('effect-select');

    this.sliderIntensity = document.getElementById('slider-intensity');
    this.valIntensity = document.getElementById('val-intensity');
    this.sliderSpeed = document.getElementById('slider-speed');
    this.valSpeed = document.getElementById('val-speed');

    this.toggleAccumulation = document.getElementById('toggle-accumulation');
    this.btnSweepNow = document.getElementById('btn-sweep-now');
    this.btnToggleSite = document.getElementById('btn-toggle-site');
    this.siteExcludeLabel = document.getElementById('site-exclude-label');

    this.openSettingsBtn = document.getElementById('open-settings-btn');
  }

  async init() {
    await initTheme();
    this.settings = await storage.getSettings();
    this.weather = await storage.getWeatherCache();

    await this.resolveCurrentTab();
    this.initPreviewEngine();
    this.bindEvents();
    this.updateUI();
  }

  async resolveCurrentTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && !tab.url.startsWith('chrome://')) {
          const url = new URL(tab.url);
          this.currentTabHostname = sanitizeHostname(url.hostname);
        }
      } catch {
        // Fallback for special or restricted pages
      }
    }
  }

  initPreviewEngine() {
    if (!this.previewCanvas) return;

    const ctx = this.previewCanvas.getContext('2d');
    this.previewEngine = new ParticleEngine();
    this.previewEngine.attachCanvas(
      this.previewCanvas,
      ctx,
      this.previewCanvas.width,
      this.previewCanvas.height
    );

    const activeEffect = this.settings.mode === WEATHER_MODES.AUTO && this.weather?.effect
      ? this.weather.effect
      : this.settings.manualEffect;

    this.previewEngine.setSettings(this.settings);
    this.previewEngine.setEffect(activeEffect, false);

    if (this.settings.enabled) {
      this.previewEngine.start();
    }
  }

  updateSliderTrack(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    slider.style.background = `linear-gradient(to right, #4E5C4B 0%, #4E5C4B ${pct}%, #D1C3A6 ${pct}%, #D1C3A6 100%)`;
  }

  bindEvents() {
    // Master Toggle
    this.masterToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await this.save({ enabled });
      if (enabled) {
        this.previewEngine.start();
      } else {
        this.previewEngine.stop();
      }
      this.updateUI();
    });

    // Mode Buttons
    this.modeManualBtn.addEventListener('click', async () => {
      await this.save({ mode: WEATHER_MODES.MANUAL });
      this.syncActiveEffect();
      this.updateUI();
    });

    this.modeAutoBtn.addEventListener('click', async () => {
      await this.save({ mode: WEATHER_MODES.AUTO });
      // Trigger background check if needed
      await messaging.sendToBackground(MESSAGE_TYPES.REFRESH_WEATHER);
      this.weather = await storage.getWeatherCache();
      this.syncActiveEffect();
      this.updateUI();
    });

    // Effect Select Dropdown
    this.effectSelect.addEventListener('change', async (e) => {
      const effect = e.target.value;
      await this.save({ manualEffect: effect });
      this.syncActiveEffect();
      this.updateUI();
    });

    // Intensity Slider
    this.sliderIntensity.addEventListener('input', (e) => {
      this.valIntensity.textContent = e.target.value;
      this.updateSliderTrack(this.sliderIntensity);
    });
    this.sliderIntensity.addEventListener('change', async (e) => {
      const intensity = parseInt(e.target.value, 10);
      await this.save({ intensity });
      this.previewEngine.setSettings(this.settings);
    });

    // Speed Slider
    this.sliderSpeed.addEventListener('input', (e) => {
      this.valSpeed.textContent = e.target.value;
      this.updateSliderTrack(this.sliderSpeed);
    });
    this.sliderSpeed.addEventListener('change', async (e) => {
      const speed = parseInt(e.target.value, 10);
      await this.save({ speed });
      this.previewEngine.setSettings(this.settings);
    });

    // Accumulation Toggle
    this.toggleAccumulation.addEventListener('change', async (e) => {
      await this.save({ accumulationEnabled: e.target.checked });
    });

    // Test Sweep Button
    this.btnSweepNow.addEventListener('click', async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.TRIGGER_BROOM }, () => {
            if (chrome.runtime.lastError) {
              // Silence
            }
          });
        }
      }
    });

    // Site Exclude Toggle
    this.btnToggleSite.addEventListener('click', async () => {
      if (!this.currentTabHostname) return;
      const res = await messaging.sendToBackground(MESSAGE_TYPES.TOGGLE_EXCLUSION, {
        hostname: this.currentTabHostname,
      });
      if (res && res.success) {
        this.settings.websiteExclusions = res.exclusions;
        this.updateSiteButton();
      }
    });

    // Refresh Weather Button
    this.refreshWeatherBtn.addEventListener('click', async () => {
      this.refreshWeatherBtn.classList.add('spinning');
      const res = await messaging.sendToBackground(MESSAGE_TYPES.REFRESH_WEATHER);
      if (res && res.weather) {
        this.weather = res.weather;
      } else {
        this.weather = await storage.getWeatherCache();
      }
      this.refreshWeatherBtn.classList.remove('spinning');
      this.syncActiveEffect();
      this.updateUI();
    });

    // Open Settings Page
    this.openSettingsBtn.addEventListener('click', () => {
      if (chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('../settings/settings.html', '_blank');
      }
    });
  }

  async save(partial) {
    this.settings = await storage.saveSettings(partial);
    await messaging.broadcastToTabs(MESSAGE_TYPES.SETTINGS_UPDATED, this.settings);
  }

  syncActiveEffect() {
    const activeEffect = this.settings.mode === WEATHER_MODES.AUTO && this.weather?.effect
      ? this.weather.effect
      : this.settings.manualEffect;

    this.previewEngine.setEffect(activeEffect, true);
  }

  updateUI() {
    // Master switch
    this.masterToggle.checked = this.settings.enabled;

    // Active effect label
    const activeEffect = this.settings.mode === WEATHER_MODES.AUTO && this.weather?.effect
      ? this.weather.effect
      : this.settings.manualEffect;

    this.effectTitleEl.textContent = EFFECT_NAMES[activeEffect] || 'Nature Effect';
    const sweepEffects = [EFFECT_TYPES.AUTUMN_LEAVES, EFFECT_TYPES.SNOW, EFFECT_TYPES.RAIN, EFFECT_TYPES.SPRING_PETALS];
    this.btnSweepNow.disabled = !this.settings.enabled || !sweepEffects.includes(activeEffect);
    this.btnSweepNow.title = this.btnSweepNow.disabled
      ? 'Sweep is available for leaves, snow, rain, and cherry blossoms'
      : 'Sweep this page';

    // Mode tab buttons
    if (this.settings.mode === WEATHER_MODES.AUTO) {
      this.modeAutoBtn.classList.add('active');
      this.modeManualBtn.classList.remove('active');
      this.effectSelectGroup.style.display = 'none';
    } else {
      this.modeManualBtn.classList.add('active');
      this.modeAutoBtn.classList.remove('active');
      this.effectSelectGroup.style.display = 'flex';
      this.effectSelect.value = this.settings.manualEffect;
    }

    // Weather Card
    if (this.weather?.lastUpdated) {
      this.weatherTempEl.textContent = formatTemperature(this.weather.temperature);
      this.weatherConditionEl.textContent = this.weather.conditionLabel || 'Clear';
      this.weatherLocationEl.textContent = this.weather.locationName || 'Local Area';
    } else {
      this.weatherTempEl.textContent = '--?C';
      this.weatherConditionEl.textContent = 'Weather not updated';
      this.weatherLocationEl.textContent = 'Refresh to check';
    }

    // Sliders
    this.sliderIntensity.value = this.settings.intensity;
    this.valIntensity.textContent = this.settings.intensity;
    this.updateSliderTrack(this.sliderIntensity);
    this.sliderSpeed.value = this.settings.speed;
    this.valSpeed.textContent = this.settings.speed;
    this.updateSliderTrack(this.sliderSpeed);

    // Accumulation toggle
    this.toggleAccumulation.checked = this.settings.accumulationEnabled;

    // Site Exclusion status
    this.updateSiteButton();
  }

  updateSiteButton() {
    if (!this.currentTabHostname) {
      this.btnToggleSite.style.display = 'none';
      return;
    }

    this.btnToggleSite.style.display = 'flex';
    const isExcluded = isHostExcluded(this.currentTabHostname, this.settings.websiteExclusions);
    if (isExcluded) {
      this.siteExcludeLabel.textContent = 'Excluded';
      this.btnToggleSite.classList.add('active-warning');
    } else {
      this.siteExcludeLabel.textContent = 'Exclude Site';
      this.btnToggleSite.classList.remove('active-warning');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupController();
  app.init();
});

