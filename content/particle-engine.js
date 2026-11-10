/**
 * Leafly - Particle Engine
 * High-performance Canvas rendering, object pooling, SVG asset caching, and physics.
 */

import { EFFECT_CONFIGS, ASSET_PATHS } from './weather-effects.js';
import { EFFECT_TYPES, WIND_DIRECTIONS } from '../shared/constants.js';

export class ParticleEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.settings = null;
    this.activeEffectType = EFFECT_TYPES.AUTUMN_LEAVES;
    this.effectConfig = EFFECT_CONFIGS[this.activeEffectType];

    // Particle pool
    this.maxPoolSize = 250;
    this.pool = [];
    this.activeParticles = [];

    // Asset caching
    this.assetCache = new Map();
    this.assetsLoaded = false;

    // Animation loop state
    this.isRunning = false;
    this.rafId = null;
    this.lastFrameTime = 0;
    this.isDocumentHidden = false;

    // Wind dynamics
    this.baseWindX = 0;
    this.gustTime = 0;
    this.currentWindX = 0;

    // Transition state (for smooth crossfade between effects)
    this.transitioning = false;
    this.transitionProgress = 1.0;
    this.oldEffectConfig = null;
    this.oldParticles = [];

    // Accumulation hook
    this.onParticleSettle = null;
    this.onParticleSplash = null;
    this.isAccumulating = false;

    // Bind event handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.renderLoop = this.renderLoop.bind(this);

    this.initPool();
    this.preloadAssets();
  }

  initPool() {
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 20,
        baseSize: 20,
        rotation: 0,
        vRot: 0,
        flipAngle: 0,
        flipSpeed: 0,
        swayPhase: 0,
        swaySpeed: 0,
        swayAmp: 0,
        pulsePhase: 0,
        pulseSpeed: 0,
        opacity: 1,
        baseOpacity: 1,
        assetIndex: 0,
        settled: false,
      });
    }
  }

  getAssetUrl(relativePath) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      try {
        return chrome.runtime.getURL(relativePath);
      } catch {
        // Fallback
      }
    }
    return relativePath;
  }

  preloadAssets() {
    const toLoad = [];

    Object.entries(ASSET_PATHS).forEach(([category, paths]) => {
      if (Array.isArray(paths)) {
        paths.forEach((path, index) => {
          toLoad.push({ key: `${category}_${index}`, path });
        });
      } else if (typeof paths === 'object') {
        Object.entries(paths).forEach(([name, path]) => {
          toLoad.push({ key: `particles_${name}`, path });
        });
      }
    });

    let loadedCount = 0;
    toLoad.forEach(({ key, path }) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= toLoad.length) {
          this.assetsLoaded = true;
        }
      };
      img.onerror = () => {
        console.warn(`[Leafly Engine] Asset failed to load: ${path}`);
      };
      img.src = this.getAssetUrl(path);
      this.assetCache.set(key, img);
    });
  }

  getAsset(category, indexOrName) {
    const key = `${category}_${indexOrName}`;
    const img = this.assetCache.get(key);
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }

  attachCanvas(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
  }

  handleVisibilityChange() {
    this.isDocumentHidden = document.hidden;
    if (!this.isDocumentHidden && this.isRunning) {
      this.lastFrameTime = performance.now();
    }
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
  }

  setSettings(settings) {
    this.settings = settings;
    this.calculateWind();
    this.syncParticleCount();
  }

  setWeatherWind(windSpeed, windDirectionDeg) {
    if (!this.settings || this.settings.windDirection === WIND_DIRECTIONS.AUTO) {
      // Convert weather degree direction (where it blows from) to screen vector
      // 0 = from North (down), 90 = from East (left), 180 = from South (up), 270 = from West (right)
      const rad = (windDirectionDeg * Math.PI) / 180;
      const xFactor = -Math.sin(rad); // Blowing towards
      const speedFactor = Math.min((windSpeed || 10) / 20, 2.5);
      this.baseWindX = xFactor * speedFactor * 1.5;
    }
  }

  calculateWind() {
    if (!this.settings) return;

    if (this.settings.windDirection === WIND_DIRECTIONS.LEFT) {
      this.baseWindX = -((this.settings.windStrength || 25) / 30);
    } else if (this.settings.windDirection === WIND_DIRECTIONS.RIGHT) {
      this.baseWindX = (this.settings.windStrength || 25) / 30;
    } else if (this.settings.windDirection === WIND_DIRECTIONS.NONE) {
      this.baseWindX = 0;
    }
  }

  setEffect(effectType, isTransition = true) {
    if (!EFFECT_CONFIGS[effectType]) return;
    if (this.activeEffectType === effectType && this.activeParticles.length > 0) return;

    if (isTransition && this.activeParticles.length > 0) {
      this.transitioning = true;
      this.transitionProgress = 0.0;
      this.oldEffectConfig = this.effectConfig;
      this.oldParticles = this.activeParticles.map((p) => ({ ...p }));
    } else {
      this.transitioning = false;
      this.oldParticles = [];
    }

    this.activeEffectType = effectType;
    this.effectConfig = EFFECT_CONFIGS[effectType];
    this.resetActiveParticles();
  }

  syncParticleCount() {
    if (!this.effectConfig || !this.settings) return;

    const intensity = this.settings.intensity || 45;
    const targetCount = Math.max(
      4,
      Math.min(
        this.maxPoolSize,
        Math.round(this.effectConfig.baseCount * (intensity / 45))
      )
    );

    while (this.activeParticles.length < targetCount) {
      const idx = this.activeParticles.length;
      const p = this.pool[idx];
      this.effectConfig.initParticle(p, this.width, this.height, this.settings);
      // Stagger initial Y positions so particles start distributed across the screen
      if (this.activeEffectType !== EFFECT_TYPES.SUNBEAMS) p.y = Math.random() * this.height;
      this.activeParticles.push(p);
    }

    while (this.activeParticles.length > targetCount) {
      this.activeParticles.pop();
    }
  }

  resetActiveParticles() {
    this.activeParticles = [];
    this.syncParticleCount();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  setAccumulating(isAccumulating) {
    this.isAccumulating = isAccumulating;
  }

  renderLoop(timestamp) {
    if (!this.isRunning) return;

    if (this.isDocumentHidden) {
      this.rafId = requestAnimationFrame(this.renderLoop);
      return;
    }

    const elapsed = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    // Cap delta-time to avoid leaps if browser stuttered
    const dt = Math.min(elapsed, 45);

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  update(dt) {
    // Dynamic wind gust oscillation
    this.gustTime += 0.008 * (dt / 16.6);
    const gust = Math.sin(this.gustTime) * 0.4 + Math.sin(this.gustTime * 2.3) * 0.2;
    this.currentWindX = this.baseWindX + gust;

    // Handle smooth transition crossfade
    if (this.transitioning) {
      this.transitionProgress += 0.015 * (dt / 16.6);
      if (this.transitionProgress >= 1.0) {
        this.transitioning = false;
        this.oldParticles = [];
      } else {
        // Update old fading-out particles
        for (let i = 0; i < this.oldParticles.length; i++) {
          const p = this.oldParticles[i];
          this.oldEffectConfig.updateParticle(p, dt, this.width, this.height, this.currentWindX);
        }
      }
    }

    // Update active particles
    const bottomThreshold = this.height - 65;
    const accumulationEnabled = this.settings.accumulationEnabled !== false;
    const canAccumulate = accumulationEnabled && this.effectConfig.canAccumulate;
    // Accelerated settling during idle, steady natural settling during active browsing
    const settleProbability = this.isAccumulating ? 0.85 : 0.50;

    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];
      this.effectConfig.updateParticle(p, dt, this.width, this.height, this.currentWindX);

      // Check for rain splash near bottom
      if (this.activeEffectType === EFFECT_TYPES.RAIN && p.y >= this.height - 25 && this.onParticleSplash) {
        if (Math.random() < 0.35) {
          this.onParticleSplash(p.x, this.height - 4);
        }
      }

      // Check for bottom accumulation settling
      if (canAccumulate && p.y >= bottomThreshold && !p.settled && Math.random() < settleProbability) {
        if (this.onParticleSettle) {
          const settled = this.onParticleSettle(p, this.effectConfig);
          if (settled) {
            // Re-spawn particle from top
            this.effectConfig.initParticle(p, this.width, this.height, this.settings);
            p.y = -20;
            continue;
          }
        }
      }

      // Check if particle reached bottom under normal falling
      if (p.y > this.height + 40 && this.activeEffectType !== EFFECT_TYPES.BUBBLES) {
        this.effectConfig.initParticle(p, this.width, this.height, this.settings);
      }
    }
  }

  render() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Render underlying accumulation mounds & splashes
    if (this.onRenderUnder) {
      this.onRenderUnder(this.ctx);
    }

    // Render old fading particles if transitioning
    if (this.transitioning && this.oldParticles.length > 0) {
      const oldAlpha = 1.0 - this.transitionProgress;
      this.ctx.save();
      this.ctx.globalAlpha = oldAlpha;
      for (let i = 0; i < this.oldParticles.length; i++) {
        this.drawParticle(this.oldParticles[i], this.oldEffectConfig);
      }
      this.ctx.restore();
    }

    // Render current active particles
    const currentAlpha = this.transitioning ? this.transitionProgress : 1.0;
    this.ctx.save();
    if (this.transitioning) {
      this.ctx.globalAlpha = currentAlpha;
    }

    for (let i = 0; i < this.activeParticles.length; i++) {
      this.drawParticle(this.activeParticles[i], this.effectConfig);
    }
    this.ctx.restore();
  }

  drawParticle(p, config) {
    const category = config.assetCategory;
    const img = this.getAsset(category, p.assetIndex);

    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.rotation);

    if (p.flipAngle !== 0) {
      this.ctx.scale(Math.cos(p.flipAngle), 1);
    }

    this.ctx.globalAlpha = p.opacity;

    if (img) {
      if (category === 'rain') {
        // Rain streaks and drops are slender, realistic, and vertical
        const isStreak = p.assetIndex === 1;
        const w = isStreak ? p.size * 0.35 : p.size * 0.55;
        const h = isStreak ? p.size * 1.6 : p.size * 1.1;
        this.ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        const halfSize = p.size / 2;
        this.ctx.drawImage(img, -halfSize, -halfSize, p.size, p.size);
      }
    } else {
      // Procedural fallback drawing
      this.drawProceduralFallback(p, config);
    }

    this.ctx.restore();
  }

  drawProceduralFallback(p, config) {
    const r = p.size / 2;
    const eff = (config && config.effectType) || this.activeEffectType;

    switch (eff) {
      case EFFECT_TYPES.SUNBEAMS: {
        const gradient = this.ctx.createLinearGradient(0, 0, p.beamLength * 0.8, p.beamLength * 0.57);
        gradient.addColorStop(0, 'rgba(255, 235, 150, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 235, 150, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(-p.size / 2, 0);
        this.ctx.lineTo(p.size / 2, 0);
        this.ctx.lineTo(p.size * 1.5, p.beamLength);
        this.ctx.lineTo(-p.size * 0.5, p.beamLength);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      }
      case EFFECT_TYPES.SNOW:
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case EFFECT_TYPES.AUTUMN_LEAVES:
        this.ctx.fillStyle = p.assetIndex === 0 ? '#C23B22' : p.assetIndex === 1 ? '#E65C00' : '#D4A373';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case EFFECT_TYPES.RAIN:
        this.ctx.strokeStyle = '#90CAF9';
        this.ctx.lineWidth = 1.0;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -r * 1.2);
        this.ctx.lineTo(0, r * 1.2);
        this.ctx.stroke();
        break;

      case EFFECT_TYPES.SPRING_PETALS:
        this.ctx.fillStyle = '#FFB3C6';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, r * 0.8, r * 0.45, 0, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case EFFECT_TYPES.FIREFLIES:
        this.ctx.fillStyle = '#FF9100';
        this.ctx.shadowColor = '#FFA726';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        break;

      case EFFECT_TYPES.BUBBLES:
        this.ctx.strokeStyle = '#00E5FF';
        this.ctx.fillStyle = 'rgba(224, 247, 250, 0.2)';
        this.ctx.lineWidth = 1.4;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fill();
        break;

      case EFFECT_TYPES.STARS:
        this.ctx.fillStyle = '#FFF176';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case EFFECT_TYPES.CONFETTI:
        this.ctx.fillStyle = '#FF7043';
        this.ctx.fillRect(-r * 0.6, -r * 0.4, r * 1.2, r * 0.8);
        break;

      default:
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.pool = [];
    this.activeParticles = [];
    this.oldParticles = [];
    this.assetCache.clear();
  }
}

