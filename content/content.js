/**
 * Leafly - Content Script Runtime
 * Self-contained isolated-world runtime for Chrome Extension MV3.
 * Fully immune to host webpage CSP; provides ambient particle effects,
 * bottom accumulation, inactivity detection, and animated broom sweeping.
 */

(() => {
  // Prevent duplicate execution within the same execution frame
  if (window.__leafly_loaded__) return;
  window.__leafly_loaded__ = true;

  /* -------------------------------------------------------------
   * 1. Constants & Defaults
   * ----------------------------------------------------------- */
  const EFFECT_TYPES = Object.freeze({
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

  const BROOM_EFFECTS = new Set([
    EFFECT_TYPES.AUTUMN_LEAVES, EFFECT_TYPES.SNOW,
    EFFECT_TYPES.RAIN, EFFECT_TYPES.SPRING_PETALS,
  ]);

  const WEATHER_MODES = Object.freeze({
    AUTO: 'auto',
    MANUAL: 'manual',
  });

  const MESSAGE_TYPES = Object.freeze({
    SETTINGS_UPDATED: 'SETTINGS_UPDATED',
    WEATHER_UPDATED: 'WEATHER_UPDATED',
    TRIGGER_BROOM: 'TRIGGER_BROOM',
  });

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    mode: WEATHER_MODES.MANUAL,
    manualEffect: EFFECT_TYPES.AUTUMN_LEAVES,
    intensity: 45,
    speed: 40,
    size: 50,
    windStrength: 25,
    windDirection: 'auto',
    opacity: 85,
    accumulationEnabled: true,
    inactivityDuration: 60,
    broomEnabled: true,
    websiteExclusions: ['docs.google.com', 'sheets.google.com', 'slides.google.com'],
    respectReducedMotion: true,
  });

  /* -------------------------------------------------------------
   * 2. Utilities & Validation
   * ----------------------------------------------------------- */
  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function throttle(func, wait) {
    let timeout = null;
    let previous = 0;
    return function (...args) {
      const now = Date.now();
      const remaining = wait - (now - previous);
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          previous = Date.now();
          timeout = null;
          func.apply(this, args);
        }, remaining);
      }
    };
  }

  function isSystemReducedMotion() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  function isHostExcluded(hostname, exclusions) {
    if (!hostname || !Array.isArray(exclusions) || exclusions.length === 0) return false;
    const lowerHost = hostname.toLowerCase();
    return exclusions.some((pattern) => {
      const cleanPattern = pattern.trim().toLowerCase();
      if (!cleanPattern) return false;
      return lowerHost === cleanPattern || lowerHost.endsWith('.' + cleanPattern);
    });
  }

  /* -------------------------------------------------------------
   * 3. Effect Configurations & Particle Physics
   * ----------------------------------------------------------- */
  const EFFECT_CONFIGS = {
    [EFFECT_TYPES.AUTUMN_LEAVES]: {
      effectType: EFFECT_TYPES.AUTUMN_LEAVES,
      assetCategory: 'leaves',
      baseCount: 36,
      speedMultiplier: 1.0,
      canAccumulate: true,
      accumulationType: 'leaf_pile',
      initParticle(p, width, height, settings) {
        p.x = randomRange(-40, width + 40);
        p.y = randomRange(-height * 0.25, -20);
        const sizeFactor = (settings.size || 50) / 50;
        p.baseSize = randomRange(18, 32) * sizeFactor;
        p.size = p.baseSize;

        const speedFactor = (settings.speed || 40) / 40;
        p.vy = randomRange(1.0, 2.2) * speedFactor;
        p.vx = randomRange(-0.4, 0.4);

        p.swayPhase = randomRange(0, Math.PI * 2);
        p.swaySpeed = randomRange(0.015, 0.035);
        p.swayAmp = randomRange(1.2, 2.8);

        p.rotation = randomRange(0, Math.PI * 2);
        p.vRot = randomRange(-0.02, 0.02);

        p.flipAngle = randomRange(0, Math.PI);
        p.flipSpeed = randomRange(0.015, 0.035);

        p.opacity = (randomRange(0.75, 0.98) * (settings.opacity || 85)) / 100;
        p.assetIndex = randomInt(0, 2);
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.swayPhase += p.swaySpeed * timeScale;
        p.rotation += p.vRot * timeScale;
        p.flipAngle += p.flipSpeed * timeScale;

        p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 1.5;
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;

        if (p.x > width + 60) p.x = -50;
        if (p.x < -60) p.x = width + 50;
      },
    },

    [EFFECT_TYPES.SNOW]: {
      effectType: EFFECT_TYPES.SNOW,
      assetCategory: 'snow',
      baseCount: 65,
      speedMultiplier: 0.8,
      canAccumulate: true,
      accumulationType: 'snow_mound',
      initParticle(p, width, height, settings) {
        p.x = randomRange(-20, width + 20);
        p.y = randomRange(-height * 0.2, -10);
        const sizeFactor = (settings.size || 50) / 50;

        const r = Math.random();
        if (r < 0.55) {
          p.assetIndex = 2;
          p.baseSize = randomRange(6, 12) * sizeFactor;
          p.vy = randomRange(0.8, 1.6);
        } else if (r < 0.85) {
          p.assetIndex = 1;
          p.baseSize = randomRange(12, 18) * sizeFactor;
          p.vy = randomRange(1.2, 2.0);
        } else {
          p.assetIndex = 0;
          p.baseSize = randomRange(18, 26) * sizeFactor;
          p.vy = randomRange(1.5, 2.5);
        }

        const speedFactor = (settings.speed || 40) / 40;
        p.vy *= speedFactor;
        p.size = p.baseSize;

        p.swayPhase = randomRange(0, Math.PI * 2);
        p.swaySpeed = randomRange(0.01, 0.025);
        p.swayAmp = randomRange(0.8, 2.0);

        p.rotation = randomRange(0, Math.PI * 2);
        p.vRot = randomRange(-0.015, 0.015);
        p.flipAngle = 0;
        p.flipSpeed = 0;

        p.opacity = (randomRange(0.65, 0.95) * (settings.opacity || 85)) / 100;
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.swayPhase += p.swaySpeed * timeScale;
        p.rotation += p.vRot * timeScale;

        p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 1.2;
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;

        if (p.x > width + 40) p.x = -30;
        if (p.x < -40) p.x = width + 30;
      },
    },

    [EFFECT_TYPES.RAIN]: {
      effectType: EFFECT_TYPES.RAIN,
      assetCategory: 'rain',
      baseCount: 90,
      speedMultiplier: 2.2,
      canAccumulate: false,
      accumulationType: 'none',
      initParticle(p, width, height, settings) {
        p.x = randomRange(-50, width + 100);
        p.y = randomRange(-height * 0.3, -20);
        const sizeFactor = (settings.size || 50) / 50;
        // Fine, delicate raindrops
        p.baseSize = randomRange(7, 13) * sizeFactor;
        p.size = p.baseSize;

        const speedFactor = (settings.speed || 40) / 40;
        p.vy = randomRange(9.0, 16.0) * speedFactor;
        p.vx = 0;

        p.rotation = 0;
        p.vRot = 0;
        p.flipAngle = 0;
        p.flipSpeed = 0;

        p.opacity = (randomRange(0.4, 0.8) * (settings.opacity || 85)) / 100;
        p.assetIndex = Math.random() < 0.75 ? 1 : 0;
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.vx = windX * 2.5;
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;

        p.rotation = Math.atan2(p.vx, p.vy);

        if (p.x > width + 100) p.x = -50;
        if (p.x < -100) p.x = width + 50;
      },
    },

    [EFFECT_TYPES.SPRING_PETALS]: {
      effectType: EFFECT_TYPES.SPRING_PETALS,
      assetCategory: 'petals',
      baseCount: 34,
      speedMultiplier: 0.9,
      canAccumulate: true,
      accumulationType: 'petal_cluster',
      initParticle(p, width, height, settings) {
        p.x = randomRange(-40, width + 40);
        p.y = randomRange(-height * 0.2, -15);
        const sizeFactor = (settings.size || 50) / 50;
        p.baseSize = randomRange(14, 24) * sizeFactor;
        p.size = p.baseSize;

        const speedFactor = (settings.speed || 40) / 40;
        p.vy = randomRange(1.0, 2.0) * speedFactor;
        p.swayPhase = randomRange(0, Math.PI * 2);
        p.swaySpeed = randomRange(0.02, 0.04);
        p.swayAmp = randomRange(1.4, 3.2);

        p.rotation = randomRange(0, Math.PI * 2);
        p.vRot = randomRange(-0.015, 0.015);
        p.flipAngle = randomRange(0, Math.PI);
        p.flipSpeed = randomRange(0.01, 0.03);

        p.opacity = (randomRange(0.7, 0.95) * (settings.opacity || 85)) / 100;
        p.assetIndex = randomInt(0, 2);
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.swayPhase += p.swaySpeed * timeScale;
        p.rotation += p.vRot * timeScale;
        p.flipAngle += p.flipSpeed * timeScale;

        p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 1.6;
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;

        if (p.x > width + 50) p.x = -40;
        if (p.x < -50) p.x = width + 40;
      },
    },

    [EFFECT_TYPES.FIREFLIES]: {
      effectType: EFFECT_TYPES.FIREFLIES,
      assetCategory: 'particles',
      baseCount: 26,
      speedMultiplier: 0.5,
      canAccumulate: false,
      accumulationType: 'none',
      initParticle(p, width, height, settings) {
        p.x = randomRange(20, width - 20);
        p.y = randomRange(height * 0.35, height - 20);
        const sizeFactor = (settings.size || 50) / 50;
        p.baseSize = randomRange(16, 26) * sizeFactor;
        p.size = p.baseSize;

        p.wanderAngle = randomRange(0, Math.PI * 2);
        p.wanderSpeed = randomRange(0.3, 0.8) * ((settings.speed || 40) / 40);

        p.glowPhase = randomRange(0, Math.PI * 2);
        p.glowSpeed = randomRange(0.02, 0.05);

        p.rotation = 0;
        p.vRot = 0;
        p.flipAngle = 0;
        p.flipSpeed = 0;

        p.baseOpacity = (randomRange(0.6, 0.95) * (settings.opacity || 85)) / 100;
        p.opacity = p.baseOpacity;
        p.assetIndex = 'firefly';
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.wanderAngle += randomRange(-0.15, 0.15) * timeScale;
        p.glowPhase += p.glowSpeed * timeScale;

        p.opacity = p.baseOpacity * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.glowPhase)));

        p.x += (Math.cos(p.wanderAngle) * p.wanderSpeed + windX * 0.4) * timeScale;
        p.y += (Math.sin(p.wanderAngle) * p.wanderSpeed - 0.15) * timeScale;

        if (p.x < 10) p.x = width - 20;
        if (p.x > width - 10) p.x = 20;
        if (p.y < height * 0.25) p.y = height - 30;
        if (p.y > height - 10) p.y = height * 0.3;
      },
    },

    [EFFECT_TYPES.SUNBEAMS]: {
      effectType: EFFECT_TYPES.SUNBEAMS,
      assetCategory: 'particles',
      baseCount: 5,
      speedMultiplier: 0.3,
      canAccumulate: false,
      accumulationType: 'none',
      initParticle(p, width, height, settings) {
        p.x = randomRange(-width * 0.2, width * 0.8);
        p.y = 0;
        p.size = randomRange(width * 0.15, width * 0.35);
        p.beamLength = height * 1.4;
        p.angle = (35 * Math.PI) / 180;
        p.rotation = 0;
        p.flipAngle = 0;

        p.pulsePhase = randomRange(0, Math.PI * 2);
        p.pulseSpeed = randomRange(0.005, 0.015);

        p.baseOpacity = (randomRange(0.06, 0.15) * (settings.opacity || 85)) / 100;
        p.opacity = p.baseOpacity;
        p.assetIndex = 'sunbeam';
        p.settled = false;
      },
      updateParticle(p, dt) {
        const timeScale = dt / 16.6;
        p.pulsePhase += p.pulseSpeed * timeScale;
        p.opacity = p.baseOpacity * (0.6 + 0.4 * Math.sin(p.pulsePhase));
      },
    },

    [EFFECT_TYPES.BUBBLES]: {
      effectType: EFFECT_TYPES.BUBBLES,
      assetCategory: 'particles',
      baseCount: 22,
      speedMultiplier: 0.7,
      canAccumulate: false,
      accumulationType: 'none',
      initParticle(p, width, height, settings) {
        p.x = randomRange(20, width - 20);
        p.y = height + randomRange(10, 50);
        const sizeFactor = (settings.size || 50) / 50;
        p.baseSize = randomRange(14, 28) * sizeFactor;
        p.size = p.baseSize;

        const speedFactor = (settings.speed || 40) / 40;
        p.vy = -randomRange(0.8, 1.8) * speedFactor;

        p.swayPhase = randomRange(0, Math.PI * 2);
        p.swaySpeed = randomRange(0.02, 0.05);
        p.swayAmp = randomRange(0.6, 1.8);

        p.rotation = 0;
        p.vRot = 0;
        p.flipAngle = 0;
        p.flipSpeed = 0;

        p.opacity = (randomRange(0.4, 0.8) * (settings.opacity || 85)) / 100;
        p.assetIndex = 'bubble';
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.swayPhase += p.swaySpeed * timeScale;
        p.x += (Math.sin(p.swayPhase) * p.swayAmp + windX * 0.6) * timeScale;
        p.y += p.vy * timeScale;

        if (p.y < -40) {
          p.y = height + 20;
          p.x = randomRange(20, width - 20);
        }
      },
    },

    [EFFECT_TYPES.STARS]: {
      effectType: EFFECT_TYPES.STARS,
      assetCategory: 'particles',
      baseCount: 30,
      speedMultiplier: 0.6,
      canAccumulate: false,
      accumulationType: 'none',
      initParticle(p, width, height, settings) {
        p.x = randomRange(0, width);
        p.y = randomRange(-height * 0.2, -10);
        const sizeFactor = (settings.size || 50) / 50;
        p.baseSize = randomRange(10, 18) * sizeFactor;
        p.size = p.baseSize;

        const speedFactor = (settings.speed || 40) / 40;
        p.vy = randomRange(0.6, 1.4) * speedFactor;

        p.pulsePhase = randomRange(0, Math.PI * 2);
        p.pulseSpeed = randomRange(0.03, 0.08);

        p.rotation = randomRange(0, Math.PI * 2);
        p.vRot = randomRange(-0.015, 0.015);
        p.flipAngle = 0;
        p.flipSpeed = 0;

        p.baseOpacity = (randomRange(0.5, 0.9) * (settings.opacity || 85)) / 100;
        p.opacity = p.baseOpacity;
        p.assetIndex = 'star';
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.pulsePhase += p.pulseSpeed * timeScale;
        p.opacity = p.baseOpacity * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.pulsePhase)));
        p.rotation += p.vRot * timeScale;

        p.x += windX * 0.5 * timeScale;
        p.y += p.vy * timeScale;

        if (p.x > width + 30) p.x = -30;
        if (p.x < -30) p.x = width + 30;
      },
    },

    [EFFECT_TYPES.CONFETTI]: {
      effectType: EFFECT_TYPES.CONFETTI,
      assetCategory: 'particles',
      baseCount: 38,
      speedMultiplier: 1.1,
      canAccumulate: true,
      accumulationType: 'confetti_cluster',
      initParticle(p, width, height, settings) {
        p.x = randomRange(-20, width + 20);
        p.y = randomRange(-height * 0.2, -10);
        const sizeFactor = (settings.size || 50) / 50;
        p.baseSize = randomRange(10, 18) * sizeFactor;
        p.size = p.baseSize;

        const speedFactor = (settings.speed || 40) / 40;
        p.vy = randomRange(1.4, 2.8) * speedFactor;

        p.swayPhase = randomRange(0, Math.PI * 2);
        p.swaySpeed = randomRange(0.025, 0.06);
        p.swayAmp = randomRange(1.2, 2.6);

        p.rotation = randomRange(0, Math.PI * 2);
        p.vRot = randomRange(-0.04, 0.04);
        p.flipAngle = randomRange(0, Math.PI);
        p.flipSpeed = randomRange(0.03, 0.08);

        p.opacity = (randomRange(0.8, 0.98) * (settings.opacity || 85)) / 100;
        p.assetIndex = randomInt(0, 2);
        p.settled = false;
      },
      updateParticle(p, dt, width, height, windX) {
        const timeScale = dt / 16.6;
        p.swayPhase += p.swaySpeed * timeScale;
        p.rotation += p.vRot * timeScale;
        p.flipAngle += p.flipSpeed * timeScale;

        p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 1.4;
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;

        if (p.x > width + 40) p.x = -30;
        if (p.x < -40) p.x = width + 30;
      },
    },
  };

  /* -------------------------------------------------------------
   * 4. Particle Pool & Particle Engine
   * ----------------------------------------------------------- */
  class Particle {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.size = 20;
      this.baseSize = 20;
      this.rotation = 0;
      this.vRot = 0;
      this.flipAngle = 0;
      this.flipSpeed = 0;
      this.swayPhase = 0;
      this.swaySpeed = 0;
      this.swayAmp = 0;
      this.opacity = 1;
      this.baseOpacity = 1;
      this.assetIndex = 0;
      this.settled = false;
    }

    clone() {
      const c = new Particle();
      Object.assign(c, this);
      return c;
    }
  }

  class ParticleEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.isRunning = false;
      this.rafId = null;
      this.lastTimestamp = 0;

      this.poolSize = 180;
      this.particlePool = [];
      for (let i = 0; i < this.poolSize; i++) {
        this.particlePool.push(new Particle());
      }
      this.activeParticles = [];
      this.oldParticles = [];

      this.activeEffectType = EFFECT_TYPES.AUTUMN_LEAVES;
      this.effectConfig = EFFECT_CONFIGS[this.activeEffectType];
      this.oldEffectConfig = null;

      this.transitioning = false;
      this.transitionProgress = 1.0;
      this.transitionDuration = 700; // ms

      this.settings = { ...DEFAULT_SETTINGS };
      this.currentWindX = 0;
      this.isAccumulating = false;

      this.assets = new Map();
      this.loadAssetImages();
    }

    loadAssetImages() {
      const getUrl = (p) => chrome.runtime.getURL(p);
      const manifest = [
        ['snow', 0, getUrl('assets/svg/snow/snowflake-crystal.svg')],
        ['snow', 1, getUrl('assets/svg/snow/snowflake-star.svg')],
        ['rain', 0, getUrl('assets/svg/rain/rain-drop.svg')],
        ['rain', 1, getUrl('assets/svg/rain/rain-streak.svg')],
        ['particles', 'firefly', getUrl('assets/svg/particles/firefly.svg')],
        ['particles', 'bubble', getUrl('assets/svg/particles/bubble.svg')],
        ['particles', 'star', getUrl('assets/svg/particles/star.svg')],
      ];

      for (const [cat, id, url] of manifest) {
        const img = new Image();
        img.src = url;
        const key = `${cat}_${id}`;
        img.onload = () => this.assets.set(key, img);
      }
    }

    getAsset(cat, id) {
      return this.assets.get(`${cat}_${id}`) || null;
    }

    attachCanvas(canvas, ctx, width, height) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.setDimensions(width, height);
    }

    setDimensions(width, height) {
      this.width = width;
      this.height = height;
    }

    setSettings(settings) {
      this.settings = { ...this.settings, ...settings };
      this.updateWind();
      this.resizeActivePool();
    }

    setWeatherWind(speedKmh, directionDeg) {
      const normalizedSpeed = Math.min(speedKmh / 60, 2.0);
      const rad = (directionDeg * Math.PI) / 180;
      this.currentWindX = Math.sin(rad) * normalizedSpeed * 1.5;
    }

    updateWind() {
      if (this.settings.mode === WEATHER_MODES.AUTO) return;
      const strength = (this.settings.windStrength || 25) / 100;
      switch (this.settings.windDirection) {
        case 'left':
          this.currentWindX = -strength * 2.0;
          break;
        case 'right':
          this.currentWindX = strength * 2.0;
          break;
        default:
          this.currentWindX = 0;
          break;
      }
    }

    setAccumulating(accumulating) {
      this.isAccumulating = accumulating;
    }

    setEffect(effectType, transition = true) {
      if (!EFFECT_CONFIGS[effectType]) return;
      if (effectType === this.activeEffectType && !transition) return;

      if (transition && this.activeParticles.length > 0) {
        this.oldEffectConfig = this.effectConfig;
        this.oldParticles = this.activeParticles.map((p) => p.clone());
        this.transitioning = true;
        this.transitionProgress = 0.0;
        this.transitionStartTime = performance.now();
      } else {
        this.transitioning = false;
        this.oldParticles = [];
      }

      this.activeEffectType = effectType;
      this.effectConfig = EFFECT_CONFIGS[effectType];
      this.rebuildActivePool();
    }

    calculateTargetCount() {
      const base = this.effectConfig.baseCount || 35;
      const intensity = (this.settings.intensity || 45) / 50;
      return Math.max(2, Math.min(this.poolSize, Math.round(base * intensity)));
    }

    rebuildActivePool() {
      const count = this.calculateTargetCount();
      this.activeParticles = [];
      for (let i = 0; i < count; i++) {
        const p = this.particlePool[i];
        this.effectConfig.initParticle(p, this.width, this.height, this.settings);
        // Stagger vertical placement across initial screen
        if (this.activeEffectType !== EFFECT_TYPES.SUNBEAMS) {
          p.y = randomRange(-40, this.height * 0.95);
        }
        this.activeParticles.push(p);
      }
    }

    resizeActivePool() {
      const count = this.calculateTargetCount();
      while (this.activeParticles.length < count) {
        const idx = this.activeParticles.length;
        if (idx < this.particlePool.length) {
          const p = this.particlePool[idx];
          this.effectConfig.initParticle(p, this.width, this.height, this.settings);
          this.activeParticles.push(p);
        } else {
          break;
        }
      }
      if (this.activeParticles.length > count) {
        this.activeParticles.length = count;
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTimestamp = performance.now();
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }

    stop() {
      this.isRunning = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.ctx && this.width > 0 && this.height > 0) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
    }

    animate(timestamp) {
      if (!this.isRunning) return;

      const dt = Math.min(timestamp - this.lastTimestamp, 64);
      this.lastTimestamp = timestamp;

      this.update(dt);
      this.render();

      this.rafId = requestAnimationFrame(this.animate);
    }

    update(dt) {
      if (this.transitioning) {
        const elapsed = performance.now() - this.transitionStartTime;
        this.transitionProgress = Math.min(1.0, elapsed / this.transitionDuration);

        // Update fading old particles
        if (this.oldEffectConfig) {
          for (let i = 0; i < this.oldParticles.length; i++) {
            this.oldEffectConfig.updateParticle(this.oldParticles[i], dt, this.width, this.height, this.currentWindX);
          }
        }

        if (this.transitionProgress >= 1.0) {
          this.transitioning = false;
          this.oldParticles = [];
        }
      }

      const bottomThreshold = this.height - 65;
      const accumulationEnabled = this.settings.accumulationEnabled !== false;
      const canAccumulate = accumulationEnabled && this.isAccumulating && this.effectConfig.canAccumulate;
      const settleProbability = 0.85;

      for (let i = 0; i < this.activeParticles.length; i++) {
        const p = this.activeParticles[i];
        this.effectConfig.updateParticle(p, dt, this.width, this.height, this.currentWindX);

        if (this.activeEffectType === EFFECT_TYPES.RAIN && p.y >= this.height - 25 && this.onParticleSplash) {
          if (Math.random() < 0.35) {
            this.onParticleSplash(p.x, this.height - 4);
          }
        }

        if (canAccumulate && p.y >= bottomThreshold && !p.settled && Math.random() < settleProbability) {
          if (this.onParticleSettle) {
            const settled = this.onParticleSettle(p, this.effectConfig);
            if (settled) {
              this.effectConfig.initParticle(p, this.width, this.height, this.settings);
              p.y = -20;
              continue;
            }
          }
        }

        if (p.y > this.height + 40 && this.activeEffectType !== EFFECT_TYPES.BUBBLES) {
          this.effectConfig.initParticle(p, this.width, this.height, this.settings);
        }
      }
    }

    render() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Render underlying accumulation mounds & splashes underneath falling particles
      if (this.onRenderUnder) {
        this.onRenderUnder(this.ctx);
      }

      if (this.transitioning && this.oldParticles.length > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = 1.0 - this.transitionProgress;
        for (let i = 0; i < this.oldParticles.length; i++) {
          this.drawParticle(this.oldParticles[i], this.oldEffectConfig);
        }
        this.ctx.restore();
      }

      this.ctx.save();
      if (this.transitioning) {
        this.ctx.globalAlpha = this.transitionProgress;
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
          const isStreak = p.assetIndex === 1;
          const w = isStreak ? p.size * 0.35 : p.size * 0.55;
          const h = isStreak ? p.size * 1.6 : p.size * 1.1;
          this.ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          const halfSize = p.size / 2;
          this.ctx.drawImage(img, -halfSize, -halfSize, p.size, p.size);
        }
      } else {
        this.drawProceduralFallback(p, config);
      }

      this.ctx.restore();
    }

    drawProceduralFallback(p, config) {
      const r = p.size / 2;
      const eff = (config && config.effectType) || this.activeEffectType;

      switch (eff) {
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
          this.ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
          break;

        case EFFECT_TYPES.SUNBEAMS:
          if (p.beamLength) {
            const grad = this.ctx.createLinearGradient(0, 0, Math.cos(p.angle) * p.beamLength, Math.sin(p.angle) * p.beamLength);
            grad.addColorStop(0, 'rgba(255, 235, 150, 0.8)');
            grad.addColorStop(1, 'rgba(255, 235, 150, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.moveTo(-p.size / 2, 0);
            this.ctx.lineTo(p.size / 2, 0);
            this.ctx.lineTo(p.size * 1.5, p.beamLength);
            this.ctx.lineTo(-p.size * 0.5, p.beamLength);
            this.ctx.closePath();
            this.ctx.fill();
          }
          break;

        default:
          break;
      }
    }
  }

  /* -------------------------------------------------------------
   * 5. Accumulation Engine
   * ----------------------------------------------------------- */
  class AccumulationEngine {
    constructor() {
      this.width = 0;
      this.height = 0;
      this.settledItems = [];
      this.maxSettledItems = 160;
      this.clusters = [];
      this.numClusters = 6;
      this.ripples = [];
      this.maxRipples = 25;
    }

    addSplashRipple(x, y) {
      if (this.ripples.length >= this.maxRipples) {
        this.ripples.shift();
      }
      this.ripples.push({
        x: x + randomRange(-4, 4),
        y: (y || this.height) - randomRange(2, 6),
        radius: 1,
        maxRadius: randomRange(6, 14),
        opacity: 0.65,
      });
    }

    setDimensions(width, height) {
      this.width = width;
      this.height = height;
      this.recalculateClusters();
    }

    recalculateClusters() {
      this.clusters = [];
      if (this.width <= 0) return;
      const segmentWidth = this.width / this.numClusters;
      for (let i = 0; i < this.numClusters; i++) {
        this.clusters.push({
          x: segmentWidth * i + randomRange(segmentWidth * 0.25, segmentWidth * 0.75),
          peakHeight: randomRange(36, 68),
          spread: randomRange(segmentWidth * 0.45, segmentWidth * 0.95),
          count: 0,
        });
      }
    }

    settleParticle(particle, effectConfig) {
      if (this.settledItems.length >= this.maxSettledItems) return false;
      if (!effectConfig || !effectConfig.canAccumulate) return false;

      let bestCluster = null;
      let minDist = Infinity;
      for (const c of this.clusters) {
        const d = Math.abs(c.x - particle.x);
        if (d < minDist) {
          minDist = d;
          bestCluster = c;
        }
      }

      let moundHeight = 6;
      if (bestCluster && minDist < bestCluster.spread) {
        const normalizedDist = minDist / bestCluster.spread;
        const moundFactor = Math.cos((normalizedDist * Math.PI) / 2);
        moundHeight = Math.min(bestCluster.peakHeight, (6 + bestCluster.count * 2.2)) * moundFactor;
        bestCluster.count++;
      }

      // Rest visibly along bottom floor with prominent piling
      const baseFloor = this.height - 20;
      const settleY = Math.max(this.height - 85, baseFloor - Math.max(4, moundHeight + randomRange(-4, 6)));

      this.settledItems.push({
        x: Math.max(16, Math.min(this.width - 16, particle.x + randomRange(-8, 8))),
        y: settleY,
        size: particle.size * randomRange(0.85, 1.05),
        rotation: particle.rotation + randomRange(-0.3, 0.3),
        flipAngle: particle.flipAngle || 0,
        opacity: particle.opacity * 0.95,
        assetIndex: particle.assetIndex,
        category: effectConfig.assetCategory,
        type: effectConfig.accumulationType,
        sweepVelocityX: 0,
        sweepVelocityY: 0,
        isSwept: false,
      });

      return true;
    }

    sweepAt(sweepX, sweepRadius = 80) {
      for (let i = 0; i < this.settledItems.length; i++) {
        const item = this.settledItems[i];
        if (item.isSwept) continue;

        const dist = Math.abs(item.x - sweepX);
        if (dist < sweepRadius) {
          item.isSwept = true;
          item.sweepVelocityX = randomRange(4, 9);
          item.sweepVelocityY = -randomRange(3, 7);
        }
      }
    }

    update(dt) {
      const timeScale = dt / 16.6;
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const rip = this.ripples[i];
        rip.radius += 0.8 * timeScale;
        rip.opacity -= 0.04 * timeScale;
        if (rip.opacity <= 0 || rip.radius >= rip.maxRadius) {
          this.ripples.splice(i, 1);
        }
      }

      for (let i = this.settledItems.length - 1; i >= 0; i--) {
        const item = this.settledItems[i];
        if (item.isSwept) {
          item.x += item.sweepVelocityX * timeScale;
          item.y += item.sweepVelocityY * timeScale;
          item.sweepVelocityY += 0.35 * timeScale;
          item.opacity -= 0.035 * timeScale;

          if (item.opacity <= 0 || item.y > this.height + 40) {
            this.settledItems.splice(i, 1);
          }
        }
      }
    }

    render(ctx, engine) {
      if (!ctx) return;

      if (this.ripples.length > 0) {
        ctx.save();
        for (let i = 0; i < this.ripples.length; i++) {
          const rip = this.ripples[i];
          ctx.strokeStyle = `rgba(144, 202, 249, ${Math.max(0, rip.opacity)})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.ellipse(rip.x, rip.y, rip.radius, rip.radius * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (this.settledItems.length === 0) return;

      for (let i = 0; i < this.settledItems.length; i++) {
        const item = this.settledItems[i];
        const img = engine.getAsset(item.category, item.assetIndex);

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);

        if (item.flipAngle !== 0) {
          ctx.scale(Math.cos(item.flipAngle), 1);
        }

        ctx.globalAlpha = Math.max(0, item.opacity);

        if (img) {
          const half = item.size / 2;
          ctx.drawImage(img, -half, -half, item.size, item.size);
        } else {
          ctx.fillStyle = item.category === 'leaves' ? '#C23B22' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    clear() {
      this.settledItems = [];
      this.ripples = [];
      this.recalculateClusters();
    }
  }

  /* -------------------------------------------------------------
   * 6. Broom Sweeping Animation
   * ----------------------------------------------------------- */
  class BroomAnimation {
    constructor(overlayManager, accumulationEngine) {
      this.overlay = overlayManager;
      this.accumulation = accumulationEngine;
      this.isSweeping = false;
      this.rafId = null;
      this.startX = -180;
      this.currentX = this.startX;
      this.targetX = 0;
      this.startTime = 0;
      this.duration = 4200;
      this.onCompleteCallback = null;
    }

    start(onComplete) {
      if (this.isSweeping || !this.overlay.broomContainer) return;

      this.isSweeping = true;
      this.onCompleteCallback = onComplete;
      this.startX = -180;
      this.currentX = this.startX;
      this.targetX = (this.overlay.width || window.innerWidth) + 180;
      this.startTime = performance.now();

      const broom = this.overlay.broomContainer;
      broom.style.setProperty('display', 'block', 'important');
      broom.style.setProperty('left', `${this.startX}px`, 'important');

      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }

    animate(timestamp) {
      if (!this.isSweeping) return;

      const elapsed = timestamp - this.startTime;
      const progress = Math.min(1.0, elapsed / this.duration);

      this.currentX = this.startX + (this.targetX - this.startX) * progress;

      const cadenceFrequency = 0.012;
      const strokeAngle = Math.sin(elapsed * cadenceFrequency) * 16 - 8;
      const bobY = Math.abs(Math.sin(elapsed * cadenceFrequency)) * 8;

      const broom = this.overlay.broomContainer;
      if (broom) {
        broom.style.setProperty('left', `${Math.round(this.currentX)}px`, 'important');
        broom.style.setProperty('transform', `translateY(${-bobY}px) rotate(${strokeAngle}deg)`, 'important');
      }

      const bristleTipX = this.currentX + 70;
      if (this.accumulation) {
        this.accumulation.sweepAt(bristleTipX, 85);
      }

      if (progress < 1.0) {
        this.rafId = requestAnimationFrame(this.animate);
      } else {
        this.complete();
      }
    }

    complete() {
      this.isSweeping = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      const broom = this.overlay.broomContainer;
      if (broom) {
        broom.style.setProperty('display', 'none', 'important');
        broom.style.setProperty('transform', 'none', 'important');
        broom.style.setProperty('left', `${this.startX}px`, 'important');
      }

      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = null;
      }
    }

    stop() {
      this.complete();
    }
  }

  /* -------------------------------------------------------------
   * 7. Inactivity Manager
   * ----------------------------------------------------------- */
  class InactivityManager {
    constructor() {
      this.thresholdMs = 60000;
      this.lastActivityTime = Date.now();
      this.isInactive = false;
      this.checkTimer = null;
      this.isEnabled = true;
      this.onInactiveCallback = null;
      this.onReturnCallback = null;

      this.handleUserActivity = throttle(this.recordActivity.bind(this), 300);
    }

    init({ thresholdSeconds = 60, onInactive, onReturn }) {
      this.thresholdMs = Math.max(10, thresholdSeconds) * 1000;
      this.onInactiveCallback = onInactive;
      this.onReturnCallback = onReturn;

      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
      events.forEach((evt) => {
        window.addEventListener(evt, this.handleUserActivity, { passive: true });
      });

      this.startTimer();
    }

    setThresholdSeconds(seconds) {
      this.thresholdMs = Math.max(10, seconds) * 1000;
    }

    setEnabled(enabled) {
      if (enabled && !this.isEnabled) this.lastActivityTime = Date.now();
      this.isEnabled = enabled;
      if (!enabled) this.isInactive = false;
    }

    recordActivity() {
      this.lastActivityTime = Date.now();

      if (this.isInactive) {
        this.isInactive = false;
        if (this.isEnabled && this.onReturnCallback) {
          this.onReturnCallback();
        }
      }
    }

    startTimer() {
      this.stopTimer();
      this.checkTimer = setInterval(() => {
        if (!this.isEnabled) return;
        const idleDuration = Date.now() - this.lastActivityTime;
        if (idleDuration >= this.thresholdMs && !this.isInactive) {
          this.isInactive = true;
          if (this.onInactiveCallback) {
            this.onInactiveCallback();
          }
        }
      }, 1000);
    }

    stopTimer() {
      if (this.checkTimer) {
        clearInterval(this.checkTimer);
        this.checkTimer = null;
      }
    }

    destroy() {
      this.stopTimer();
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
      events.forEach((evt) => {
        window.removeEventListener(evt, this.handleUserActivity);
      });
      this.onInactiveCallback = null;
      this.onReturnCallback = null;
    }
  }

  /* -------------------------------------------------------------
   * 8. Shadow DOM Overlay Manager
   * ----------------------------------------------------------- */
  class OverlayManager {
    constructor() {
      this.hostElement = null;
      this.shadowRoot = null;
      this.canvas = null;
      this.ctx = null;
      this.broomContainer = null;
      this.broomImage = null;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.resizeCallback = null;
      this.onResizeBound = this.handleResize.bind(this);
    }

    mount(resizeCallback) {
      if (this.hostElement) return;

      this.resizeCallback = resizeCallback;

      this.hostElement = document.createElement('div');
      this.hostElement.id = 'leafly-root';

      this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
        :host {
          all: initial !important;
          display: block !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          pointer-events: none !important;
          z-index: 2147483647 !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
        }
        .leafly-canvas {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          pointer-events: none !important;
          display: block !important;
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        .leafly-broom-container {
          position: absolute !important;
          bottom: -10px !important;
          left: -200px;
          width: 120px !important;
          height: 240px !important;
          pointer-events: none !important;
          display: none;
          transform-origin: 50% 90% !important;
          will-change: transform, left !important;
          z-index: 2147483648 !important;
        }
        .leafly-broom-image {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          pointer-events: none !important;
        }
      `;
      this.shadowRoot.appendChild(style);

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'leafly-canvas';
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.shadowRoot.appendChild(this.canvas);

      this.broomContainer = document.createElement('div');
      this.broomContainer.className = 'leafly-broom-container';
      this.broomImage = document.createElement('img');
      this.broomImage.className = 'leafly-broom-image';
      this.broomImage.alt = 'Leafly Broom';
      this.broomImage.src = chrome.runtime.getURL('assets/svg/broom/broom.svg');

      this.broomContainer.appendChild(this.broomImage);
      this.shadowRoot.appendChild(this.broomContainer);

      const target = document.body || document.documentElement;
      target.appendChild(this.hostElement);

      this.updateDimensions();
      window.addEventListener('resize', this.onResizeBound, { passive: true });
    }

    updateDimensions() {
      if (!this.canvas) return;

      this.width = window.innerWidth || document.documentElement.clientWidth || 800;
      this.height = window.innerHeight || document.documentElement.clientHeight || 600;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      if (this.ctx) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    }

    handleResize() {
      this.updateDimensions();
      if (this.resizeCallback) {
        this.resizeCallback(this.width, this.height);
      }
    }

    unmount() {
      window.removeEventListener('resize', this.onResizeBound);
      if (this.hostElement && this.hostElement.parentNode) {
        this.hostElement.parentNode.removeChild(this.hostElement);
      }
      this.hostElement = null;
      this.shadowRoot = null;
      this.canvas = null;
      this.ctx = null;
      this.broomContainer = null;
      this.broomImage = null;
      this.resizeCallback = null;
    }
  }

  /* -------------------------------------------------------------
   * 9. Content Renderer
   * ----------------------------------------------------------- */
  class ContentRenderer {
    constructor() {
      this.overlay = new OverlayManager();
      this.engine = new ParticleEngine();
      this.accumulation = new AccumulationEngine();
      this.broom = new BroomAnimation(this.overlay, this.accumulation);
      this.isMounted = false;
    }

    mount(settings) {
      if (this.isMounted) return;

      this.overlay.mount((w, h) => {
        this.engine.setDimensions(w, h);
        this.accumulation.setDimensions(w, h);
      });

      this.engine.attachCanvas(
        this.overlay.canvas,
        this.overlay.ctx,
        this.overlay.width,
        this.overlay.height
      );

      this.accumulation.setDimensions(this.overlay.width, this.overlay.height);

      this.engine.onParticleSettle = (p, cfg) => this.accumulation.settleParticle(p, cfg);
      this.engine.onParticleSplash = (x, y) => this.accumulation.addSplashRipple(x, y);

      // Render underlying accumulation mounds on every frame
      this.engine.onRenderUnder = (ctx) => {
        this.accumulation.render(ctx, this.engine);
      };

      if (!this.updateWrapped) {
        const originalUpdate = this.engine.update.bind(this.engine);
        this.engine.update = (dt) => {
          this.accumulation.update(dt);
          originalUpdate(dt);
        };
        this.updateWrapped = true;
      }

      this.engine.setSettings(settings);
      this.isMounted = true;
    }

    setSettings(settings) {
      this.engine.setSettings(settings);
    }

    setEffect(effectType, transition = true) {
      this.broom.stop();
      this.engine.setEffect(effectType, transition);
      this.accumulation.clear();
    }

    setWeatherWind(speed, direction) {
      this.engine.setWeatherWind(speed, direction);
    }

    setAccumulating(accumulating) {
      this.engine.setAccumulating(accumulating);
    }

    start() {
      this.engine.start();
    }

    stop() {
      this.engine.stop();
    }

    triggerBroom(onComplete) {
      this.broom.start(onComplete);
    }

    unmount() {
      if (!this.isMounted) return;
      this.broom.stop();
      this.engine.stop();
      this.engine.setAccumulating(false);
      this.overlay.unmount();
      this.accumulation.clear();
      this.isMounted = false;
    }
  }

  /* -------------------------------------------------------------
   * 10. Effect Manager
   * ----------------------------------------------------------- */
  class EffectManager {
    constructor() {
      this.renderer = new ContentRenderer();
      this.inactivity = new InactivityManager();
      this.settings = null;
      this.weather = null;
      this.isExcluded = false;
      this.activeEffect = null;
    }

    init(settings, weather) {
      this.settings = settings || { ...DEFAULT_SETTINGS };
      this.weather = weather || null;

      this.inactivity.init({
        thresholdSeconds: this.settings.inactivityDuration || 60,
        onInactive: () => this.handleInactive(),
        onReturn: () => this.handleReturn(),
      });
      this.inactivity.setEnabled(false);

      this.checkExclusion();
      if (this.isExcluded || !this.settings.enabled) {
        return;
      }

      this.activeEffect = this.resolveCurrentEffect();

      const prefersReduced = this.settings.respectReducedMotion && isSystemReducedMotion();
      if (prefersReduced) {
        this.settings = {
          ...this.settings,
          intensity: Math.min(this.settings.intensity, 15),
          speed: Math.min(this.settings.speed, 20),
        };
      }

      this.renderer.mount(this.settings);
      this.renderer.setEffect(this.activeEffect, false);

      if (this.weather && this.settings.mode === WEATHER_MODES.AUTO) {
        this.renderer.setWeatherWind(this.weather.windSpeed, this.weather.windDirection);
      }

      this.renderer.start();

      this.inactivity.setEnabled(this.settings.accumulationEnabled);
    }

    checkExclusion() {
      const host = window.location.hostname;
      this.isExcluded = isHostExcluded(host, this.settings?.websiteExclusions || []);
    }

    resolveCurrentEffect() {
      if (!this.settings) return EFFECT_TYPES.AUTUMN_LEAVES;
      if (this.settings.mode === WEATHER_MODES.AUTO && this.weather?.effect) {
        return this.weather.effect;
      }
      return this.settings.manualEffect || EFFECT_TYPES.AUTUMN_LEAVES;
    }

    handleInactive() {
      if (!this.settings?.accumulationEnabled) return;
      this.renderer.setAccumulating(true);
    }

    handleReturn() {
      this.renderer.setAccumulating(false);
      if (this.settings?.broomEnabled && BROOM_EFFECTS.has(this.activeEffect)) {
        this.renderer.triggerBroom();
      } else {
        this.renderer.accumulation.clear();
      }
    }

    updateSettings(newSettings) {
      this.settings = newSettings;
      this.checkExclusion();

      if (this.isExcluded || !this.settings.enabled) {
        this.renderer.unmount();
        this.inactivity.setEnabled(false);
        return;
      }

      if (!this.renderer.isMounted) {
        this.renderer.mount(this.settings);
        this.renderer.start();
      }

      this.renderer.setSettings(this.settings);

      if (!this.settings.accumulationEnabled) {
        this.renderer.accumulation.clear();
        this.renderer.setAccumulating(false);
      }

      const targetEffect = this.resolveCurrentEffect();
      if (targetEffect !== this.activeEffect) {
        this.activeEffect = targetEffect;
        this.renderer.setEffect(targetEffect, true);
      }

      this.inactivity.setThresholdSeconds(this.settings.inactivityDuration || 60);
      this.inactivity.setEnabled(this.settings.accumulationEnabled);
    }

    updateWeather(newWeather) {
      this.weather = newWeather;

      if (this.settings?.mode === WEATHER_MODES.AUTO) {
        const targetEffect = this.resolveCurrentEffect();
        if (targetEffect !== this.activeEffect) {
          this.activeEffect = targetEffect;
          this.renderer.setEffect(targetEffect, true);
        }
        this.renderer.setWeatherWind(newWeather.windSpeed, newWeather.windDirection);
      }
    }

    triggerBroom() {
      if (!this.renderer.isMounted || !BROOM_EFFECTS.has(this.activeEffect)) return false;
      this.renderer.triggerBroom();
      return true;
    }

    destroy() {
      this.inactivity.destroy();
      this.renderer.unmount();
    }
  }

  /* -------------------------------------------------------------
   * 11. Bootstrapper & Extension Communication
   * ----------------------------------------------------------- */
  let managerInstance = null;

  async function loadStateAndInit() {
    if (managerInstance) return;

    try {
      // 1. Read persistent settings & weather cache directly from chrome.storage
      const localData = await new Promise((res) => {
        chrome.storage.local.get(['leafly_settings', 'leafly_weather_cache'], (data) => res(data || {}));
      });

      const settings = Object.assign({}, DEFAULT_SETTINGS, localData.leafly_settings || {});
      const weather = localData.leafly_weather_cache || null;

      managerInstance = new EffectManager();
      managerInstance.init(settings, weather);

      // 2. Storage change listener for instant cross-tab sync
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.leafly_settings && managerInstance) {
          const updated = Object.assign({}, DEFAULT_SETTINGS, changes.leafly_settings.newValue || {});
          managerInstance.updateSettings(updated);
        }
        if (changes.leafly_weather_cache && managerInstance) {
          managerInstance.updateWeather(changes.leafly_weather_cache.newValue);
        }
      });

      // 3. Runtime messaging listener (Sweep now, explicit updates)
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const { type, payload } = message || {};
        switch (type) {
          case MESSAGE_TYPES.SETTINGS_UPDATED:
            if (managerInstance) managerInstance.updateSettings(payload);
            sendResponse({ success: true });
            break;
          case MESSAGE_TYPES.WEATHER_UPDATED:
            if (managerInstance) managerInstance.updateWeather(payload);
            sendResponse({ success: true });
            break;
          case MESSAGE_TYPES.TRIGGER_BROOM:
            sendResponse({ success: Boolean(managerInstance?.triggerBroom()) });
            break;
          default:
            break;
        }
        return false;
      });
    } catch (err) {
      console.warn('[Leafly] Content runtime init notice:', err);
    }
  }

  // Ensure DOM is ready before mounting overlay
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStateAndInit, { once: true });
  } else {
    loadStateAndInit();
  }
})();
