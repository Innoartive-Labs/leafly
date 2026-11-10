/**
 * Leafly - Weather & Nature Effect Definitions
 * Physical configurations, particle behaviors, variations, and drawing pipelines.
 */

import { EFFECT_TYPES } from '../shared/constants.js';
import { randomRange, randomInt, degToRad } from '../shared/utilities.js';

export const ASSET_PATHS = Object.freeze({
  leaves: [
    'assets/svg/leaves/maple-red.svg',
    'assets/svg/leaves/maple-orange.svg',
    'assets/svg/leaves/oak-golden.svg',
    'assets/svg/leaves/dry-brown.svg',
  ],
  snow: [
    'assets/svg/snow/snowflake-crystal.svg',
    'assets/svg/snow/snowflake-star.svg',
    'assets/svg/snow/snow-dot.svg',
  ],
  rain: [
    'assets/svg/rain/rain-drop.svg',
    'assets/svg/rain/rain-streak.svg',
  ],
  petals: [
    'assets/svg/petals/sakura-petal-1.svg',
    'assets/svg/petals/sakura-petal-2.svg',
    'assets/svg/petals/flower-blossom.svg',
  ],
  particles: {
    firefly: 'assets/svg/particles/firefly.svg',
    star: 'assets/svg/particles/star.svg',
    bubble: 'assets/svg/particles/bubble.svg',
    confetti: 'assets/svg/particles/confetti.svg',
  },
});

export const EFFECT_CONFIGS = Object.freeze({
  [EFFECT_TYPES.AUTUMN_LEAVES]: {
    effectType: EFFECT_TYPES.AUTUMN_LEAVES,
    name: 'Autumn Leaves',
    assetCategory: 'leaves',
    baseCount: 28,
    speedMultiplier: 1.0,
    canAccumulate: true,
    accumulationType: 'leaf_pile',
    initParticle(p, width, height, settings) {
      p.x = randomRange(-50, width + 50);
      p.y = randomRange(-height * 0.2, -20);
      const sizeFactor = (settings.size || 50) / 50;
      p.baseSize = randomRange(22, 38) * sizeFactor;
      p.size = p.baseSize;

      const speedFactor = (settings.speed || 40) / 40;
      p.vy = randomRange(1.2, 2.4) * speedFactor;
      p.vx = 0;
      p.swayPhase = randomRange(0, Math.PI * 2);
      p.swaySpeed = randomRange(0.015, 0.035);
      p.swayAmp = randomRange(1.5, 3.2);

      p.rotation = randomRange(0, Math.PI * 2);
      p.vRot = randomRange(-0.02, 0.02);
      p.flipAngle = randomRange(0, Math.PI * 2);
      p.flipSpeed = randomRange(0.02, 0.05);

      p.opacity = (randomRange(0.75, 1.0) * (settings.opacity || 85)) / 100;
      p.assetIndex = randomInt(0, 3);
      p.settled = false;
    },
    updateParticle(p, dt, width, height, windX) {
      p.swayPhase += p.swaySpeed * (dt / 16.6);
      p.flipAngle += p.flipSpeed * (dt / 16.6);
      p.rotation += p.vRot * (dt / 16.6);

      p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX;
      p.x += p.vx * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      // Loop over edges
      if (p.x > width + 60) p.x = -50;
      if (p.x < -60) p.x = width + 50;
    },
  },

  [EFFECT_TYPES.SNOW]: {
    effectType: EFFECT_TYPES.SNOW,
    name: 'Snowfall',
    assetCategory: 'snow',
    baseCount: 65,
    speedMultiplier: 0.8,
    canAccumulate: true,
    accumulationType: 'snow_mound',
    initParticle(p, width, height, settings) {
      p.x = randomRange(-20, width + 20);
      p.y = randomRange(-height * 0.2, -10);
      const sizeFactor = (settings.size || 50) / 50;

      // Varied snowflake categories (tiny crystal, star, soft flake)
      const r = Math.random();
      if (r < 0.55) {
        p.assetIndex = 2; // soft puff / tiny dot
        p.baseSize = randomRange(6, 12) * sizeFactor;
        p.vy = randomRange(0.8, 1.6);
      } else if (r < 0.85) {
        p.assetIndex = 1; // snowflake star
        p.baseSize = randomRange(12, 18) * sizeFactor;
        p.vy = randomRange(1.2, 2.0);
      } else {
        p.assetIndex = 0; // detailed snowflake crystal
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
      p.swayPhase += p.swaySpeed * (dt / 16.6);
      p.rotation += p.vRot * (dt / 16.6);

      p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 1.2;
      p.x += p.vx * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      if (p.x > width + 40) p.x = -30;
      if (p.x < -40) p.x = width + 30;
    },
  },

  [EFFECT_TYPES.RAIN]: {
    effectType: EFFECT_TYPES.RAIN,
    name: 'Rain',
    assetCategory: 'rain',
    baseCount: 85,
    speedMultiplier: 2.2,
    canAccumulate: false,
    accumulationType: 'none',
    initParticle(p, width, height, settings) {
      p.x = randomRange(-50, width + 100);
      p.y = randomRange(-height * 0.3, -20);
      const sizeFactor = (settings.size || 50) / 50;
      // Slender, fine delicate raindrops
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
      p.assetIndex = Math.random() < 0.75 ? 1 : 0; // 75% streaks, 25% drops
      p.settled = false;
    },
    updateParticle(p, dt, width, height, windX) {
      p.vx = windX * 2.5;
      p.x += p.vx * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      // Angle slant based on horizontal velocity
      p.rotation = Math.atan2(p.vx, p.vy);

      if (p.x > width + 100) p.x = -50;
      if (p.x < -100) p.x = width + 50;
    },
  },

  [EFFECT_TYPES.SPRING_PETALS]: {
    effectType: EFFECT_TYPES.SPRING_PETALS,
    name: 'Cherry Blossom Petals',
    assetCategory: 'petals',
    baseCount: 32,
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
      p.vx = 0;

      p.swayPhase = randomRange(0, Math.PI * 2);
      p.swaySpeed = randomRange(0.02, 0.04);
      p.swayAmp = randomRange(1.8, 3.5);

      p.rotation = randomRange(0, Math.PI * 2);
      p.vRot = randomRange(-0.025, 0.025);
      p.flipAngle = randomRange(0, Math.PI * 2);
      p.flipSpeed = randomRange(0.03, 0.06);

      p.opacity = (randomRange(0.7, 0.95) * (settings.opacity || 85)) / 100;
      p.assetIndex = Math.random() < 0.85 ? randomInt(0, 1) : 2; // 85% petals, 15% full blossoms
      p.settled = false;
    },
    updateParticle(p, dt, width, height, windX) {
      p.swayPhase += p.swaySpeed * (dt / 16.6);
      p.flipAngle += p.flipSpeed * (dt / 16.6);
      p.rotation += p.vRot * (dt / 16.6);

      p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 1.3;
      p.x += p.vx * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      if (p.x > width + 50) p.x = -40;
      if (p.x < -50) p.x = width + 40;
    },
  },

  [EFFECT_TYPES.FIREFLIES]: {
    effectType: EFFECT_TYPES.FIREFLIES,
    name: 'Evening Fireflies',
    assetCategory: 'particles',
    baseCount: 22,
    speedMultiplier: 0.6,
    canAccumulate: false,
    accumulationType: 'none',
    initParticle(p, width, height, settings) {
      p.x = randomRange(40, width - 40);
      p.y = randomRange(height * 0.2, height * 0.95);
      const sizeFactor = (settings.size || 50) / 50;
      p.baseSize = randomRange(18, 28) * sizeFactor;
      p.size = p.baseSize;

      p.vx = randomRange(-0.8, 0.8);
      p.vy = randomRange(-0.8, 0.8);

      p.pulsePhase = randomRange(0, Math.PI * 2);
      p.pulseSpeed = randomRange(0.03, 0.07);

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
      p.pulsePhase += p.pulseSpeed * (dt / 16.6);
      // Breathing glow pulse
      p.opacity = p.baseOpacity * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.pulsePhase)));

      // Smooth Brownian drift
      p.vx += (Math.random() - 0.5) * 0.15;
      p.vy += (Math.random() - 0.5) * 0.15;
      p.vx = Math.max(-1.5, Math.min(1.5, p.vx));
      p.vy = Math.max(-1.2, Math.min(1.2, p.vy));

      p.x += (p.vx + windX * 0.4) * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      // Bounce within viewport boundaries
      if (p.x < 30) { p.x = 30; p.vx *= -1; }
      if (p.x > width - 30) { p.x = width - 30; p.vx *= -1; }
      if (p.y < height * 0.15) { p.y = height * 0.15; p.vy *= -1; }
      if (p.y > height * 0.95) { p.y = height * 0.95; p.vy *= -1; }
    },
  },

  [EFFECT_TYPES.SUNBEAMS]: {
    effectType: EFFECT_TYPES.SUNBEAMS,
    name: 'Atmospheric Sunbeams',
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
      p.pulsePhase += p.pulseSpeed * (dt / 16.6);
      p.opacity = p.baseOpacity * (0.6 + 0.4 * Math.sin(p.pulsePhase));
    },
  },

  [EFFECT_TYPES.BUBBLES]: {
    effectType: EFFECT_TYPES.BUBBLES,
    name: 'Drifting Bubbles',
    assetCategory: 'particles',
    baseCount: 25,
    speedMultiplier: 0.8,
    canAccumulate: false,
    accumulationType: 'none',
    initParticle(p, width, height, settings) {
      p.x = randomRange(20, width - 20);
      p.y = randomRange(height + 20, height + 80);
      const sizeFactor = (settings.size || 50) / 50;
      p.baseSize = randomRange(16, 32) * sizeFactor;
      p.size = p.baseSize;

      const speedFactor = (settings.speed || 40) / 40;
      // Bubbles rise upward
      p.vy = -randomRange(1.2, 2.5) * speedFactor;
      p.swayPhase = randomRange(0, Math.PI * 2);
      p.swaySpeed = randomRange(0.02, 0.05);
      p.swayAmp = randomRange(1.0, 2.2);

      p.rotation = 0;
      p.vRot = 0;
      p.flipAngle = 0;
      p.flipSpeed = 0;

      p.opacity = (randomRange(0.6, 0.9) * (settings.opacity || 85)) / 100;
      p.assetIndex = 'bubble';
      p.settled = false;
    },
    updateParticle(p, dt, width, height, windX) {
      p.swayPhase += p.swaySpeed * (dt / 16.6);
      p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 0.8;

      p.x += p.vx * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      // Reset when reaching top
      if (p.y < -50) {
        p.y = height + randomRange(10, 40);
        p.x = randomRange(20, width - 20);
      }
    },
  },

  [EFFECT_TYPES.STARS]: {
    effectType: EFFECT_TYPES.STARS,
    name: 'Starlight Drift',
    assetCategory: 'particles',
    baseCount: 40,
    speedMultiplier: 0.6,
    canAccumulate: false,
    accumulationType: 'none',
    initParticle(p, width, height, settings) {
      p.x = randomRange(0, width);
      p.y = randomRange(-height * 0.2, -10);
      const sizeFactor = (settings.size || 50) / 50;
      p.baseSize = randomRange(12, 22) * sizeFactor;
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
      p.pulsePhase += p.pulseSpeed * (dt / 16.6);
      p.opacity = p.baseOpacity * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.pulsePhase)));
      p.rotation += p.vRot * (dt / 16.6);

      p.x += windX * 0.5 * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      if (p.x > width + 30) p.x = -30;
      if (p.x < -30) p.x = width + 30;
    },
  },

  [EFFECT_TYPES.CONFETTI]: {
    effectType: EFFECT_TYPES.CONFETTI,
    name: 'Subtle Confetti',
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
      p.vy = randomRange(1.8, 3.2) * speedFactor;

      p.swayPhase = randomRange(0, Math.PI * 2);
      p.swaySpeed = randomRange(0.03, 0.06);
      p.swayAmp = randomRange(1.5, 3.0);

      p.rotation = randomRange(0, Math.PI * 2);
      p.vRot = randomRange(-0.04, 0.04);
      p.flipAngle = randomRange(0, Math.PI * 2);
      p.flipSpeed = randomRange(0.05, 0.12);

      p.opacity = (randomRange(0.8, 1.0) * (settings.opacity || 85)) / 100;
      p.assetIndex = 'confetti';
      p.settled = false;
    },
    updateParticle(p, dt, width, height, windX) {
      p.swayPhase += p.swaySpeed * (dt / 16.6);
      p.flipAngle += p.flipSpeed * (dt / 16.6);
      p.rotation += p.vRot * (dt / 16.6);

      p.vx = Math.sin(p.swayPhase) * p.swayAmp + windX * 1.1;
      p.x += p.vx * (dt / 16.6);
      p.y += p.vy * (dt / 16.6);

      if (p.x > width + 40) p.x = -30;
      if (p.x < -40) p.x = width + 30;
    },
  },
});

